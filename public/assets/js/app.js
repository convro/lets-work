/**
 * ConvroLabs - Main SPA Application
 * Auth, routing, and core utilities
 */

const App = {
    csrfToken: null,
    currentView: null,
    views: {},

    async init() {
        // Check auth status
        const status = await this.api('GET', '/api/auth/status');
        if (status && status.authenticated) {
            this.csrfToken = status.csrf_token;
            this.showApp();
        } else {
            this.showLogin();
        }

        // Bind events
        this.bindLoginForm();
        this.bindLogout();
        this.bindNavigation();

        // Handle initial hash
        if (status && status.authenticated) {
            const hash = window.location.hash.slice(1) || 'dashboard';
            this.navigate(hash);
        }

        // Hash change
        window.addEventListener('hashchange', () => {
            if (document.getElementById('app-screen').classList.contains('active')) {
                const hash = window.location.hash.slice(1) || 'dashboard';
                this.navigate(hash);
            }
        });
    },

    // API helper
    async api(method, url, data = null, isFormData = false) {
        const options = {
            method,
            headers: {},
            credentials: 'same-origin',
        };

        if (this.csrfToken) {
            options.headers['X-CSRF-Token'] = this.csrfToken;
        }

        if (data) {
            if (isFormData) {
                options.body = data;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        }

        try {
            const res = await fetch(url, options);
            const json = await res.json();

            if (res.status === 401 && url !== '/api/auth/login') {
                this.showLogin();
                return null;
            }

            return json;
        } catch (e) {
            console.error('API Error:', e);
            Toast.error('Connection error. Please try again.');
            return null;
        }
    },

    showLogin() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');
        document.getElementById('password-input').focus();
    },

    showApp() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
    },

    bindLoginForm() {
        const form = document.getElementById('login-form');
        const errorEl = document.getElementById('login-error');
        const btn = form.querySelector('.btn-primary');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password-input').value;

            if (!password) {
                errorEl.textContent = 'Password is required';
                return;
            }

            btn.classList.add('loading');
            errorEl.textContent = '';

            const result = await this.api('POST', '/api/auth/login', { password });

            btn.classList.remove('loading');

            if (result && result.success) {
                this.csrfToken = result.csrf_token;
                document.getElementById('password-input').value = '';
                this.showApp();
                this.navigate('dashboard');
                Toast.success('Welcome back!');
            } else {
                errorEl.textContent = result?.error || 'Authentication failed';
                document.getElementById('password-input').select();
            }
        });
    },

    bindLogout() {
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await this.api('POST', '/api/auth/logout');
            this.csrfToken = null;
            this.showLogin();
            Toast.info('Logged out');
        });
    },

    bindNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const view = link.dataset.view;
                if (view) {
                    this.navigate(view);
                }
            });
        });
    },

    navigate(view) {
        // Update active nav
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-view="${view}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Update hash
        if (window.location.hash.slice(1) !== view) {
            window.location.hash = view;
        }

        // Render view
        this.currentView = view;
        const container = document.getElementById('view-container');
        container.style.opacity = '0';

        setTimeout(() => {
            if (this.views[view]) {
                this.views[view].render(container);
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">?</div>
                        <div class="empty-state-text">View not found</div>
                    </div>
                `;
            }
            container.style.opacity = '1';
        }, 150);
    },

    registerView(name, viewObj) {
        this.views[name] = viewObj;
    },
};

// ====== TOAST SYSTEM ======
const Toast = {
    show(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error', 6000); },
    info(msg) { this.show(msg, 'info'); },
};

// ====== CLIPBOARD HELPER ======
async function copyToClipboard(text, btn = null) {
    try {
        await navigator.clipboard.writeText(text);
        Toast.success('Copied to clipboard!');
        if (btn) {
            btn.classList.add('copied');
            const orig = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.textContent = orig;
            }, 2000);
        }
    } catch {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        Toast.success('Copied!');
    }
}

// ====== TIME FORMATTING ======
function timeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd ago';
    return date.toLocaleDateString();
}

// ====== ESCAPE HTML ======
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ====== INITIALIZE ======
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
