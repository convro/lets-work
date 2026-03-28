#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  ConvroLabs Link Manager - Deployment Script
#  Run as root on your VPS: bash deploy.sh
#
#  Uses Docker internally on port 7463 (never 8080/80/443)
#  Creates an nginx vhost on the HOST for reverse proxy + SSL
# ============================================================

INTERNAL_PORT=7463

BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

clear
echo -e "${PURPLE}${BOLD}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║       ConvroLabs Secure Link Manager             ║"
echo "  ║       Deployment & Setup Script                  ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# ---- Check root ----
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}[!] This script must be run as root.${NC}"
    echo "    Usage: sudo bash deploy.sh"
    exit 1
fi

# ---- Check Docker ----
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[!] Docker is not installed.${NC}"
    echo -e "${YELLOW}    Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}[+] Docker installed successfully.${NC}"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}    Installing Docker Compose plugin...${NC}"
    apt-get update -qq && apt-get install -y -qq docker-compose-plugin 2>/dev/null || true
fi

# Determine compose command
if docker compose version &> /dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    echo -e "${RED}[!] Docker Compose not found. Please install it.${NC}"
    exit 1
fi

# ---- Check host nginx ----
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}[!] Nginx is not installed on the host.${NC}"
    echo -e "${YELLOW}    We need the HOST nginx for reverse proxy + SSL.${NC}"
    echo -e "${YELLOW}    Install it with: apt install nginx${NC}"
    exit 1
fi

echo ""

# ---- Get domain ----
echo -e "${CYAN}${BOLD}[1/3] Domain Configuration${NC}"
echo -e "${YELLOW}  Make sure you've pointed your domain's A record to this server's IP.${NC}"
echo ""
read -rp "  Enter the domain for this installation (e.g., convrolabs.link): " DOMAIN

if [[ -z "$DOMAIN" ]]; then
    echo -e "${RED}[!] Domain cannot be empty.${NC}"
    exit 1
fi

echo -e "${GREEN}  Domain set: ${BOLD}${DOMAIN}${NC}"
echo ""

# ---- Get password (visible!) ----
echo -e "${CYAN}${BOLD}[2/3] Admin Password${NC}"
echo -e "${YELLOW}  This password will be used to log into the web panel.${NC}"
echo -e "${YELLOW}  It is shown in plain text so you can verify it - make sure no one is watching!${NC}"
echo ""
read -rp "  Enter your admin password: " ADMIN_PASS

if [[ -z "$ADMIN_PASS" ]]; then
    echo -e "${RED}[!] Password cannot be empty.${NC}"
    exit 1
fi

if [[ ${#ADMIN_PASS} -lt 8 ]]; then
    echo -e "${RED}[!] Password must be at least 8 characters.${NC}"
    exit 1
fi

echo -e "${GREEN}  Password set successfully.${NC}"
echo ""

# ---- Generate secrets ----
echo -e "${CYAN}${BOLD}[3/3] Generating Configuration${NC}"

APP_SECRET=$(openssl rand -hex 32)

# Hash password using PHP in a temporary Docker container
PASS_HASH=$(docker run --rm php:8.3-cli-alpine php -r "echo password_hash('${ADMIN_PASS//\'/\\\'}', PASSWORD_BCRYPT);")

echo -e "  ${GREEN}[+] App secret generated${NC}"
echo -e "  ${GREEN}[+] Password hashed with bcrypt${NC}"

# ---- Write .env ----
cat > .env <<EOF
APP_DOMAIN=${DOMAIN}
ADMIN_PASS_HASH=${PASS_HASH}
APP_SECRET=${APP_SECRET}
UPLOAD_MAX_SIZE=104857600
EOF

echo -e "  ${GREEN}[+] .env file created${NC}"

# ---- Update docker nginx config with actual domain ----
sed -i "s/\${APP_DOMAIN}/${DOMAIN}/g" nginx/default.conf 2>/dev/null || true

# ---- Build and deploy containers ----
echo ""
echo -e "${PURPLE}${BOLD}  Building and deploying containers on port ${INTERNAL_PORT}...${NC}"
echo ""

$COMPOSE down 2>/dev/null || true
$COMPOSE build --no-cache
$COMPOSE up -d

echo ""
echo -e "${GREEN}[+] Containers are running on localhost:${INTERNAL_PORT}${NC}"

# ---- Create HOST nginx vhost (reverse proxy) ----
echo ""
echo -e "${CYAN}${BOLD}  Creating nginx vhost for ${DOMAIN}...${NC}"

NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

cat > "$NGINX_CONF" <<NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:${INTERNAL_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
NGINXEOF

# Enable site
if [ ! -d "/etc/nginx/sites-enabled" ]; then
    mkdir -p /etc/nginx/sites-enabled
fi
ln -sf "$NGINX_CONF" "$NGINX_ENABLED"

# Test and reload nginx
nginx -t && systemctl reload nginx
echo -e "  ${GREEN}[+] Nginx vhost created and active${NC}"

# ---- SSL Certificate with certbot ----
echo ""
echo -e "${CYAN}${BOLD}  Setting up SSL certificate with Let's Encrypt...${NC}"
echo ""

# Install certbot if needed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}  Installing certbot...${NC}"
    apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx 2>/dev/null || {
        snap install --classic certbot 2>/dev/null || true
        ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true
    }
fi

# Get SSL cert using HOST nginx (not docker)
certbot --nginx -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "admin@${DOMAIN}" \
    --redirect 2>/dev/null || {
    echo -e "${YELLOW}[!] Certbot auto-config failed. Trying certonly...${NC}"
    certbot certonly --webroot -w /var/www/html -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "admin@${DOMAIN}" 2>/dev/null || {
        echo -e "${YELLOW}[!] SSL setup failed - DNS may not have propagated yet.${NC}"
        echo -e "${YELLOW}    Run this later: certbot --nginx -d ${DOMAIN}${NC}"
    }
}

# ---- Setup SSL auto-renewal cron ----
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

echo ""
echo -e "${GREEN}${BOLD}  ╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}  ║          Deployment Complete!                     ║${NC}"
echo -e "${GREEN}${BOLD}  ╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}URL:${NC}      https://${DOMAIN}"
echo -e "  ${CYAN}Password:${NC} (the one you just set)"
echo -e "  ${CYAN}Internal:${NC} localhost:${INTERNAL_PORT}"
echo ""
echo -e "  ${YELLOW}Commands:${NC}"
echo -e "  - Logs: ${BOLD}cd $(pwd) && $COMPOSE logs -f${NC}"
echo -e "  - Stop: ${BOLD}cd $(pwd) && $COMPOSE down${NC}"
echo -e "  - SSL:  ${BOLD}certbot --nginx -d ${DOMAIN}${NC}"
echo ""
