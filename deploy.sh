#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  ConvroLabs Link Manager - Deployment Script
#  Run as root on your VPS: bash deploy.sh
# ============================================================

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

echo ""

# ---- Get domain ----
echo -e "${CYAN}${BOLD}[1/3] Domain Configuration${NC}"
echo -e "${YELLOW}  Make sure you've pointed your domain's A record to this server's IP.${NC}"
echo ""
read -rp "  Enter the domain for this installation (e.g., cdn4.convro.eu): " DOMAIN

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

# ---- Update nginx config with actual domain ----
sed -i "s/\${APP_DOMAIN}/${DOMAIN}/g" nginx/default.conf

# ---- Build and deploy ----
echo ""
echo -e "${PURPLE}${BOLD}  Building and deploying containers...${NC}"
echo ""

$COMPOSE down 2>/dev/null || true
$COMPOSE build --no-cache
$COMPOSE up -d

echo ""
echo -e "${GREEN}[+] Containers are running!${NC}"

# ---- SSL Certificate ----
echo ""
echo -e "${CYAN}${BOLD}  Setting up SSL certificate with Let's Encrypt...${NC}"
echo ""

# Wait for nginx to be ready
sleep 3

# Get SSL cert
docker exec convrolabs-web sh -c "apk add --no-cache certbot certbot-nginx 2>/dev/null" || true
$COMPOSE exec -T web certbot --nginx -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "admin@${DOMAIN}" \
    --redirect 2>/dev/null || {
    echo -e "${YELLOW}[!] SSL setup via certbot-nginx failed. Trying standalone...${NC}"
    $COMPOSE stop web
    docker run --rm -p 80:80 -p 443:443 \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot certonly --standalone \
        -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "admin@${DOMAIN}" 2>/dev/null || echo -e "${YELLOW}[!] SSL setup failed - you may need to set up DNS first. App will work on HTTP.${NC}"
    $COMPOSE start web
}

# ---- Setup SSL auto-renewal cron ----
(crontab -l 2>/dev/null | grep -v "convrolabs-certbot"; echo "0 3 * * * cd $(pwd) && $COMPOSE exec -T certbot certbot renew --quiet") | crontab -

echo ""
echo -e "${GREEN}${BOLD}  ╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}  ║          Deployment Complete!                     ║${NC}"
echo -e "${GREEN}${BOLD}  ╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}URL:${NC}      https://${DOMAIN}"
echo -e "  ${CYAN}Password:${NC} (the one you just set)"
echo ""
echo -e "  ${YELLOW}Important:${NC}"
echo -e "  - Make sure your domain's ${BOLD}A record${NC} points to this server's IP"
echo -e "  - If SSL failed, re-run: ${BOLD}$COMPOSE exec certbot certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN}${NC}"
echo -e "  - Logs: ${BOLD}$COMPOSE logs -f${NC}"
echo -e "  - Stop: ${BOLD}$COMPOSE down${NC}"
echo ""
