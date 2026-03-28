/**
 * Fun Club Claude AI - Advanced Interactive JS
 * Features: particle system, wave visualizer, typing effect,
 * counter animation, 3D card tilt, matrix rain, chat simulator,
 * scroll animations, dynamic theming
 */

(function() {
    'use strict';

    // ========== PARTICLE BACKGROUND ==========
    const ParticleSystem = {
        canvas: null,
        ctx: null,
        particles: [],
        mouse: { x: -500, y: -500 },
        config: {
            count: 80,
            maxDist: 130,
            speed: 0.3,
            colors: ['0, 240, 255', '176, 0, 255', '255, 0, 229', '0, 255, 136']
        },

        init() {
            this.canvas = document.getElementById('bg-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            this.spawn();
            this.listen();
            this.loop();
        },

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        },

        spawn() {
            this.particles = [];
            for (let i = 0; i < this.config.count; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    vx: (Math.random() - 0.5) * this.config.speed,
                    vy: (Math.random() - 0.5) * this.config.speed,
                    r: Math.random() * 2 + 0.5,
                    color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
                    pulse: Math.random() * Math.PI * 2
                });
            }
        },

        listen() {
            window.addEventListener('resize', () => this.resize());
            document.addEventListener('mousemove', e => {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            });
        },

        update() {
            for (const p of this.particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.pulse += 0.015;
                if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

                const dx = p.x - this.mouse.x;
                const dy = p.y - this.mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180 && dist > 0) {
                    p.vx += (dx / dist) * 0.015;
                    p.vy += (dy / dist) * 0.015;
                }

                const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (spd > this.config.speed * 2.5) {
                    p.vx *= 0.98;
                    p.vy *= 0.98;
                }
            }
        },

        draw() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                const a = 0.3 + Math.sin(p.pulse) * 0.15;

                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${p.color}, ${a})`;
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${p.color}, ${a * 0.1})`;
                this.ctx.fill();

                for (let j = i + 1; j < this.particles.length; j++) {
                    const q = this.particles[j];
                    const ddx = p.x - q.x;
                    const ddy = p.y - q.y;
                    const d = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (d < this.config.maxDist) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(p.x, p.y);
                        this.ctx.lineTo(q.x, q.y);
                        this.ctx.strokeStyle = `rgba(${p.color}, ${(1 - d / this.config.maxDist) * 0.12})`;
                        this.ctx.lineWidth = 0.5;
                        this.ctx.stroke();
                    }
                }
            }
        },

        loop() {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.loop());
        }
    };

    // ========== TYPEWRITER EFFECT ==========
    const Typewriter = {
        texts: [
            'Where AI meets creativity.',
            'Build. Create. Innovate.',
            'Powered by Claude Opus 4.',
            'Join 48,000+ developers.',
            'The future is conversational.'
        ],
        el: null,
        textIdx: 0,
        charIdx: 0,
        isDeleting: false,
        speed: 70,

        init() {
            this.el = document.getElementById('subtitle');
            this.tick();
        },

        tick() {
            const current = this.texts[this.textIdx];

            if (this.isDeleting) {
                this.charIdx--;
            } else {
                this.charIdx++;
            }

            this.el.textContent = current.substring(0, this.charIdx);

            let delay = this.isDeleting ? 35 : this.speed;

            if (!this.isDeleting && this.charIdx === current.length) {
                delay = 2500;
                this.isDeleting = true;
            } else if (this.isDeleting && this.charIdx === 0) {
                this.isDeleting = false;
                this.textIdx = (this.textIdx + 1) % this.texts.length;
                delay = 400;
            }

            setTimeout(() => this.tick(), delay);
        }
    };

    // ========== WAVE VISUALIZER ==========
    const WaveVisualizer = {
        canvas: null,
        ctx: null,
        mode: 'sine',
        frequency: 10,
        phase: 0,
        hue: 180,

        init() {
            this.canvas = document.getElementById('wave-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = this.canvas.parentElement.offsetWidth;
            this.canvas.height = 200;

            document.querySelectorAll('.btn-neon').forEach(btn => {
                if (btn.dataset.mode) {
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.btn-neon').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        this.mode = btn.dataset.mode;
                    });
                }
            });

            const slider = document.getElementById('frequency');
            const label = document.getElementById('freq-label');
            slider.addEventListener('input', () => {
                this.frequency = parseInt(slider.value);
                label.textContent = this.frequency + ' Hz';
            });

            document.querySelector('[data-mode="sine"]').classList.add('active');
            this.loop();
        },

        getValue(x, w) {
            const t = (x / w) * Math.PI * 2 * (this.frequency / 5);
            switch (this.mode) {
                case 'sine':
                    return Math.sin(t + this.phase) * 0.8;
                case 'square':
                    return Math.sin(t + this.phase) >= 0 ? 0.7 : -0.7;
                case 'noise':
                    return (Math.sin(t * 3.7 + this.phase) +
                            Math.sin(t * 7.3 + this.phase * 1.3) +
                            Math.sin(t * 13.1 + this.phase * 0.7)) / 3 * 0.8;
                case 'spiral':
                    const s = Math.sin(t + this.phase) * Math.cos(t * 0.5 + this.phase * 0.3);
                    return s * 0.9;
                default:
                    return 0;
            }
        },

        loop() {
            const w = this.canvas.width;
            const h = this.canvas.height;
            const mid = h / 2;

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            this.ctx.fillRect(0, 0, w, h);

            // Draw multiple layers
            for (let layer = 0; layer < 3; layer++) {
                this.ctx.beginPath();
                const alpha = 0.8 - layer * 0.25;
                const offset = layer * 0.3;

                for (let x = 0; x < w; x++) {
                    const val = this.getValue(x + layer * 20, w);
                    const y = mid + val * (mid - 20);
                    if (x === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }

                const hueShift = this.hue + layer * 40;
                this.ctx.strokeStyle = `hsla(${hueShift}, 100%, 60%, ${alpha})`;
                this.ctx.lineWidth = 2 - layer * 0.5;
                this.ctx.stroke();

                // Glow
                this.ctx.strokeStyle = `hsla(${hueShift}, 100%, 60%, ${alpha * 0.3})`;
                this.ctx.lineWidth = 6;
                this.ctx.stroke();
            }

            this.phase += 0.04;
            this.hue = (this.hue + 0.2) % 360;

            requestAnimationFrame(() => this.loop());
        }
    };

    // ========== SCROLL COUNTER ANIMATION ==========
    const CounterAnimator = {
        animated: false,

        init() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.animated) {
                        this.animated = true;
                        this.animateAll();
                    }
                });
            }, { threshold: 0.3 });

            const section = document.querySelector('.counter-section');
            if (section) observer.observe(section);
        },

        animateAll() {
            document.querySelectorAll('.stat-number').forEach(el => {
                const target = parseInt(el.dataset.target);
                this.count(el, 0, target, 2000);
            });
        },

        count(el, start, end, duration) {
            const range = end - start;
            const startTime = performance.now();

            const step = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(start + range * eased);

                el.textContent = current.toLocaleString();

                if (progress < 1) {
                    requestAnimationFrame(step);
                }
            };

            requestAnimationFrame(step);
        }
    };

    // ========== 3D CARD TILT ==========
    const CardTilt = {
        init() {
            document.querySelectorAll('[data-tilt]').forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateX = (y - centerY) / centerY * -8;
                    const rotateY = (x - centerX) / centerX * 8;

                    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
                });

                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0) scale(1)';
                });
            });
        }
    };

    // ========== CHAT SIMULATOR ==========
    const ChatSim = {
        responses: {
            'joke': [
                "Why do programmers prefer dark mode? Because light attracts bugs!",
                "What's a programmer's favorite hangout? Foo Bar!",
                "Why was the JavaScript developer sad? Because he didn't Node how to Express himself!",
                "How many programmers does it take to change a light bulb? None - that's a hardware problem!"
            ],
            'haiku': [
                "Silicon dreams glow,\nAlgorithms dance in light,\nCode becomes alive.",
                "Neon pulses bright,\nData flows through midnight streams,\nClaude whispers in bits.",
                "Electric thoughts bloom,\nThrough circuits of creation,\nFuture writes itself."
            ],
            'fact': [
                "The first computer bug was an actual moth found in a Harvard Mark II computer in 1947!",
                "There are approximately 700 programming languages in existence today.",
                "The first programmer was Ada Lovelace, who wrote algorithms for Charles Babbage's Analytical Engine in 1843.",
                "A group of 12 engineers built the first version of UNIX in just 3 weeks!"
            ],
            'default': [
                "That's a fascinating thought! In a world where AI and humans collaborate, the possibilities are truly endless.",
                "Great question! I love exploring new ideas. What aspect would you like to dive deeper into?",
                "Interesting! Let me think about that... The intersection of technology and creativity is where the magic happens.",
                "I appreciate your curiosity! Every great innovation started with a simple question like yours."
            ]
        },

        init() {
            const input = document.getElementById('chat-input');
            const btn = document.getElementById('btn-send');
            const send = () => {
                const text = input.value.trim();
                if (!text) return;
                this.addMessage(text, 'user');
                input.value = '';
                setTimeout(() => this.respond(text), 600 + Math.random() * 800);
            };

            btn.addEventListener('click', send);
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') send();
            });
        },

        addMessage(text, type) {
            const container = document.getElementById('chat-messages');
            const msg = document.createElement('div');
            msg.className = `msg msg-${type}`;
            const avatar = type === 'ai' ? 'C' : 'U';
            msg.innerHTML = `<span class="msg-avatar">${avatar}</span><div class="msg-bubble">${this.escapeHtml(text)}</div>`;
            container.appendChild(msg);
            container.scrollTop = container.scrollHeight;
        },

        respond(input) {
            const lower = input.toLowerCase();
            let pool = this.responses.default;

            if (lower.includes('joke') || lower.includes('funny')) pool = this.responses.joke;
            else if (lower.includes('haiku') || lower.includes('poem')) pool = this.responses.haiku;
            else if (lower.includes('fact') || lower.includes('trivia')) pool = this.responses.fact;

            const response = pool[Math.floor(Math.random() * pool.length)];
            this.addMessage(response, 'ai');
        },

        escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    };

    // ========== MATRIX RAIN ==========
    const MatrixRain = {
        chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*(){}[]|<>~',

        init() {
            const container = document.getElementById('matrix-rain');
            if (!container) return;

            const width = container.offsetWidth;
            const cols = Math.floor(width / 20);

            for (let i = 0; i < cols; i++) {
                const col = document.createElement('div');
                col.className = 'matrix-col';
                col.style.left = (i * 20) + 'px';
                col.style.animationDuration = (2 + Math.random() * 4) + 's';
                col.style.animationDelay = (Math.random() * 3) + 's';
                col.style.opacity = 0.1 + Math.random() * 0.6;

                const hue = Math.random() > 0.7 ? '300' : '180';
                col.style.color = `hsl(${hue}, 100%, 60%)`;

                let text = '';
                const len = 5 + Math.floor(Math.random() * 10);
                for (let j = 0; j < len; j++) {
                    text += this.chars[Math.floor(Math.random() * this.chars.length)] + '\n';
                }
                col.textContent = text;
                container.appendChild(col);
            }
        }
    };

    // ========== SCROLL REVEAL ==========
    const ScrollReveal = {
        init() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

            document.querySelectorAll('section').forEach(section => {
                section.style.opacity = '0';
                section.style.transform = 'translateY(40px)';
                section.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                observer.observe(section);
            });
        }
    };

    // ========== LOGO ORB CLICK EFFECT ==========
    const OrbEffect = {
        init() {
            const orb = document.getElementById('logo-orb');
            if (!orb) return;

            orb.addEventListener('click', () => {
                for (let i = 0; i < 20; i++) {
                    const spark = document.createElement('div');
                    spark.style.cssText = `
                        position: fixed;
                        width: 4px; height: 4px;
                        border-radius: 50%;
                        pointer-events: none;
                        z-index: 9999;
                        background: hsl(${Math.random() * 60 + 160}, 100%, 60%);
                        box-shadow: 0 0 6px currentColor;
                    `;

                    const rect = orb.getBoundingClientRect();
                    const cx = rect.left + rect.width / 2;
                    const cy = rect.top + rect.height / 2;
                    spark.style.left = cx + 'px';
                    spark.style.top = cy + 'px';

                    document.body.appendChild(spark);

                    const angle = (Math.PI * 2 / 20) * i;
                    const dist = 60 + Math.random() * 80;
                    const tx = Math.cos(angle) * dist;
                    const ty = Math.sin(angle) * dist;

                    spark.animate([
                        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                        { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
                    ], {
                        duration: 600 + Math.random() * 400,
                        easing: 'cubic-bezier(0, 0.9, 0.3, 1)',
                    }).onfinish = () => spark.remove();
                }
            });
        }
    };

    // ========== INIT EVERYTHING ==========
    document.addEventListener('DOMContentLoaded', () => {
        ParticleSystem.init();
        Typewriter.init();
        WaveVisualizer.init();
        CounterAnimator.init();
        CardTilt.init();
        ChatSim.init();
        MatrixRain.init();
        ScrollReveal.init();
        OrbEffect.init();
    });

})();
