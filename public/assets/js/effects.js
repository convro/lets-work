/**
 * ConvroLabs - Particle Effects & Background Animations
 * Constellation-style floating particles with connections
 */

(function() {
    const canvas = document.getElementById('particles-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;
    let mouseX = -1000;
    let mouseY = -1000;

    // Config
    const config = {
        particleCount: 60,
        maxDistance: 150,
        speed: 0.4,
        particleSize: 1.5,
        colors: [
            'rgba(0, 240, 255, ',   // cyan
            'rgba(176, 0, 255, ',   // purple
            'rgba(255, 0, 229, ',   // pink
            'rgba(77, 77, 255, ',   // blue
        ],
        mouseRadius: 200,
    };

    // Reduce particles on mobile
    if (window.innerWidth < 768) {
        config.particleCount = 25;
        config.maxDistance = 100;
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createParticle() {
        const color = config.colors[Math.floor(Math.random() * config.colors.length)];
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * config.speed,
            vy: (Math.random() - 0.5) * config.speed,
            size: Math.random() * config.particleSize + 0.5,
            color: color,
            alpha: Math.random() * 0.5 + 0.2,
            pulse: Math.random() * Math.PI * 2,
        };
    }

    function init() {
        resize();
        particles = [];
        for (let i = 0; i < config.particleCount; i++) {
            particles.push(createParticle());
        }
    }

    function drawParticle(p) {
        const a = p.alpha + Math.sin(p.pulse) * 0.15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + a + ')';
        ctx.fill();

        // Subtle glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (a * 0.15) + ')';
        ctx.fill();
    }

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < config.maxDistance) {
                    const alpha = (1 - dist / config.maxDistance) * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }

            // Mouse connection
            const mdx = particles[i].x - mouseX;
            const mdy = particles[i].y - mouseY;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mDist < config.mouseRadius) {
                const alpha = (1 - mDist / config.mouseRadius) * 0.3;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouseX, mouseY);
                ctx.strokeStyle = `rgba(176, 0, 255, ${alpha})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }

    function update() {
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.pulse += 0.02;

            // Bounce off edges
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

            // Slight mouse repulsion
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < config.mouseRadius && dist > 0) {
                const force = (config.mouseRadius - dist) / config.mouseRadius * 0.02;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            // Speed limit
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > config.speed * 2) {
                p.vx *= 0.99;
                p.vy *= 0.99;
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        update();
        drawConnections();
        for (const p of particles) {
            drawParticle(p);
        }
        animationId = requestAnimationFrame(animate);
    }

    // Events
    window.addEventListener('resize', () => {
        resize();
    });

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    document.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    // Start
    init();
    animate();
})();
