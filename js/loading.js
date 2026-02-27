(() => {
  'use strict';

  const CONFIG = {
    tickInterval: 40,
    statusMessages: [
      { threshold: 0,  text: 'Initialising systems…'  },
      { threshold: 20, text: 'Loading assets…'         },
      { threshold: 45, text: 'Connecting to servers…'  },
      { threshold: 65, text: 'Preparing game library…' },
      { threshold: 85, text: 'Almost ready…'           },
      { threshold: 99, text: 'Welcome, Player!'        },
    ],
    particles: {
      count: 42,
      minRadius: 1,
      maxRadius: 2.5,
      minSpeed: 0.12,
      maxSpeed: 0.45,
    },
  };

  const fillEl    = document.getElementById('progress-bar-fill');
  const trackEl   = document.getElementById('progress-bar-track');
  const percentEl = document.getElementById('progress-percent');
  const statusEl  = document.getElementById('status-text');
  const loadingEl = document.getElementById('loading-screen');
  const loginEl   = document.getElementById('auth-screen');
  const canvasEl  = document.getElementById('particle-canvas');
  const ctx       = canvasEl.getContext('2d');
  const hudPctEl  = document.getElementById('hud-pct-mirror');
  const hudStEl   = document.getElementById('hud-status-val');

  let particles = [];
  let animating = true;

  function resize() {
    canvasEl.width  = window.innerWidth;
    canvasEl.height = window.innerHeight;
  }

  function createParticle() {
    const { minRadius, maxRadius, minSpeed, maxSpeed } = CONFIG.particles;
    return {
      x:      Math.random() * canvasEl.width,
      y:      Math.random() * canvasEl.height,
      radius: minRadius + Math.random() * (maxRadius - minRadius),
      vx:     (Math.random() - 0.5) * maxSpeed * 2,
      vy:     -(minSpeed + Math.random() * (maxSpeed - minSpeed)),
      alpha:  0.15 + Math.random() * 0.45,
      color:  Math.random() > 0.55 ? '0,212,255' : '123,45,248',
    };
  }

  function initParticles() {
    particles = Array.from({ length: CONFIG.particles.count }, createParticle);
  }

  function drawParticles() {
    if (!animating) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10)                 p.y = canvasEl.height + 10;
      if (p.x < -10)                 p.x = canvasEl.width  + 10;
      if (p.x > canvasEl.width + 10) p.x = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(drawParticles);
  }

  let currentProgress = 0;
  let lastMessageIdx  = -1;
  let tickTimer       = null;

  function setProgress(pct) {
    const v = Math.min(100, Math.max(0, pct));
    fillEl.style.width = v + '%';
    percentEl.textContent = Math.round(v) + '%';
    trackEl.setAttribute('aria-valuenow', Math.round(v));
    if (hudPctEl) hudPctEl.textContent = Math.round(v) + '%';
  }

  function updateStatus(pct) {
    let idx = -1;
    for (let i = 0; i < CONFIG.statusMessages.length; i++) {
      if (pct >= CONFIG.statusMessages[i].threshold) idx = i;
    }
    if (idx !== lastMessageIdx && idx >= 0) {
      lastMessageIdx = idx;
      statusEl.style.opacity   = '0';
      statusEl.style.transform = 'translateY(-5px)';
      setTimeout(() => {
        statusEl.textContent     = CONFIG.statusMessages[idx].text;
        statusEl.style.opacity   = '1';
        statusEl.style.transform = 'translateY(0)';
        if (hudStEl) hudStEl.textContent = CONFIG.statusMessages[idx].text.replace('…','').toUpperCase().slice(0, 10);
      }, 200);
    }
  }

  function getIncrement() {
    const remaining = 100 - currentProgress;
    return Math.max(0.3, (remaining / 100) * 3.2 + Math.random() * 0.8);
  }

  function revealLogin() {
    animating = false;
    loadingEl.hidden = true;
    loginEl.hidden   = false;
    window.dispatchEvent(new CustomEvent('login-screen-ready'));
  }

  function onLoadComplete() {
    loadingEl.classList.add('is-complete');
    setTimeout(() => {
      loadingEl.classList.add('is-leaving');
      // Use setTimeout instead of animationend — animationend bubbles from child
      // elements and can fire prematurely before crtOff even starts.
      // crtOff duration is 0.62s; 700ms gives a small buffer.
      setTimeout(revealLogin, 700);
    }, 850);
  }

  function tick() {
    currentProgress = Math.min(100, currentProgress + getIncrement());
    setProgress(currentProgress);
    updateStatus(currentProgress);
    if (currentProgress >= 100) {
      clearInterval(tickTimer);
      onLoadComplete();
    }
  }

  function init() {
    resize();
    window.addEventListener('resize', () => { resize(); initParticles(); });
    initParticles();
    drawParticles();
    tickTimer = setInterval(tick, CONFIG.tickInterval);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
