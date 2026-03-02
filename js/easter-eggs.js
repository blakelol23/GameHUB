/**
 * easter-eggs.js — 🥚 Hidden surprises throughout GameHub
 *
 * Global eggs (active on every screen):
 *   • Konami code  ↑↑↓↓←→←→BA
 *   • Type "gamehub" anywhere (not in an input)
 *
 * Dashboard-specific eggs (activated via initDashboardEasterEggs()):
 *   • Sidebar logo ×7 rapid clicks  → party mode
 *   • Overview hero avatar ×5 clicks → confetti
 *   • Triple-click breadcrumb title  → CLASSIFIED
 *   • Click the "GH" watermark       → confetti + toast
 *   • Triple-click the topbar user   → identity reveal
 */

// ════════════════════════════════════════════════════════════
// SHARED UTILITIES (also exported for use in login.js)
// ════════════════════════════════════════════════════════════

/**
 * Display a terminal-style floating toast notification.
 * Stacks multiple toasts upward so they don't overlap.
 */
export function eeToast(msg, color = '#00d4ff', ms = 3200) {
  // Find current bottom of the highest existing toast
  let baseBottom = 36;
  document.querySelectorAll('.ee-toast').forEach(el => {
    const rect = el.getBoundingClientRect();
    const top  = window.innerHeight - rect.top + 10;
    if (top > baseBottom) baseBottom = top;
  });

  const el = document.createElement('div');
  el.className = 'ee-toast';
  el.textContent = msg;
  el.style.cssText = [
    'position:fixed',
    `bottom:${baseBottom}px`,
    'left:50%',
    'transform:translateX(-50%) translateY(14px)',
    'background:rgba(8,8,18,.97)',
    `border:1px solid ${color}`,
    `color:${color}`,
    "font:12px/1 'Courier New',monospace",
    'letter-spacing:.1em',
    'padding:10px 22px',
    'border-radius:5px',
    'z-index:99999',
    'opacity:0',
    'pointer-events:none',
    'white-space:nowrap',
    `text-shadow:0 0 10px ${color}`,
    `box-shadow:0 0 20px ${color}33`,
    'transition:opacity .28s ease,transform .28s ease',
    'user-select:none',
  ].join(';');

  document.body.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => el.remove(), 360);
  }, ms);
}

/**
 * Burst of coloured confetti particles from a point.
 */
export function eeConfetti(ox = window.innerWidth / 2, oy = window.innerHeight / 2, n = 80) {
  const COLS = ['#00d4ff', '#7b2df8', '#f5a623', '#44dd88', '#ff4080', '#ffffff', '#a855f7'];
  const cv = document.createElement('canvas');
  cv.width  = window.innerWidth;
  cv.height = window.innerHeight;
  cv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99998;';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');

  const ps = Array.from({ length: n }, () => ({
    x:   ox, y: oy,
    vx:  (Math.random() - .5) * 14,
    vy:  -5 - Math.random() * 11,
    w:   3 + Math.random() * 5,
    h:   6 + Math.random() * 9,
    col: COLS[Math.random() * COLS.length | 0],
    rot: Math.random() * Math.PI * 2,
    rv:  (Math.random() - .5) * .28,
    life: 1,
  }));

  (function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    let alive = false;
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.vy += .38;
      p.vx *= .985; p.rot += p.rv; p.life -= .011;
      if (p.life <= 0) continue;
      alive = true;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(tick);
    else cv.remove();
  })();
}

// ════════════════════════════════════════════════════════════
// KONAMI CODE  ↑↑↓↓←→←→BA  (works on every screen)
// ════════════════════════════════════════════════════════════

const KONAMI = [
  'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
  'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
  'b','a',
];
let _ki = 0;

document.addEventListener('keydown', e => {
  _ki = e.key === KONAMI[_ki] ? _ki + 1 : (e.key === KONAMI[0] ? 1 : 0);
  if (_ki < KONAMI.length) return;
  _ki = 0;

  eeToast('⬆⬆⬇⬇⬅➡⬅➡ B A  ——  CHEAT ACTIVATED 🕹️', '#f5a623', 4500);
  eeConfetti(window.innerWidth / 2, window.innerHeight / 2, 150);

  // Brief hue-rotate flash
  const b = document.body;
  b.style.transition = 'filter .3s';
  b.style.filter = 'hue-rotate(180deg) saturate(2)';
  setTimeout(() => {
    b.style.filter = 'hue-rotate(0deg) saturate(1)';
    setTimeout(() => { b.style.filter = ''; b.style.transition = ''; }, 700);
  }, 1300);
});

// ════════════════════════════════════════════════════════════
// SECRET TYPED COMMAND — type "gamehub" anywhere (not inputs)
// ════════════════════════════════════════════════════════════

let _tbuf = '';
const SECRET = 'gamehub';

document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.key.length !== 1) return;
  _tbuf = (_tbuf + e.key.toLowerCase()).slice(-SECRET.length);
  if (_tbuf !== SECRET) return;
  _tbuf = '';

  const lines = [
    '// WELCOME BACK, OPERATOR.',
    '> ACCESS LEVEL: MAXIMUM',
    '> ALL SYSTEMS: NOMINAL',
    '> GOOD LUCK OUT THERE. 🎮',
  ];
  lines.forEach((m, i) => setTimeout(() => eeToast(m, '#44dd88', 3000), i * 680));
});

// ════════════════════════════════════════════════════════════
// DASHBOARD EASTER EGGS
// ════════════════════════════════════════════════════════════

export function initDashboardEasterEggs() {

  // ── 1. Sidebar logo ×7 rapid clicks → party mode ─────────
  const logo = document.getElementById('sidebar-brand-logo');
  if (logo) {
    let n = 0, tid = null;
    logo.addEventListener('click', () => {
      n++;
      clearTimeout(tid);
      tid = setTimeout(() => { n = 0; }, 1200);
      if (n < 7) return;
      n = 0;

      eeToast('🎉  PARTY MODE ACTIVATED  🎉', '#f5a623', 4000);
      eeConfetti(window.innerWidth / 2, window.innerHeight * 0.25, 160);

      const dash = document.getElementById('dashboard-screen');
      if (dash) {
        dash.style.transition = 'filter .4s ease';
        const hues = [0, 60, 120, 180, 240, 300, 360];
        hues.forEach((deg, i) =>
          setTimeout(() => { dash.style.filter = `hue-rotate(${deg}deg) saturate(1.8)`; }, i * 350)
        );
        setTimeout(() => { dash.style.filter = ''; dash.style.transition = ''; }, hues.length * 350 + 600);
      }
    });
  }

  // ── 2. Overview hero avatar ×5  → snarky messages + confetti ─
  const av = document.getElementById('ov-hero-avatar');
  if (av) {
    const lines = ['👀', 'Excuse me?', 'Stop. That.', 'LAST WARNING.', 'Fine. 🎉'];
    let n = 0, tid = null;
    av.addEventListener('click', e => {
      n++;
      clearTimeout(tid);
      tid = setTimeout(() => { n = 0; }, 2500);
      if (n <= lines.length) eeToast(lines[n - 1], '#a855f7', 2200);
      if (n >= 5) { n = 0; eeConfetti(e.clientX, e.clientY, 75); }
    });
  }

  // ── 3. Triple-click breadcrumb title → CLASSIFIED ─────────
  const bc = document.getElementById('dash-section-title');
  if (bc) {
    let n = 0, tid = null;
    bc.style.cursor = 'default';
    bc.addEventListener('click', () => {
      n++;
      clearTimeout(tid);
      tid = setTimeout(() => { n = 0; }, 600);
      if (n < 3) return;
      n = 0;

      const orig = bc.textContent;
      bc.textContent = '// CLASSIFIED';
      bc.style.color = '#ff4080';
      bc.style.textShadow = '0 0 8px #ff4080';
      setTimeout(() => {
        bc.textContent = orig;
        bc.style.color = '';
        bc.style.textShadow = '';
      }, 2200);
      eeToast('// THIS SECTION IS CLASSIFIED', '#ff4080', 2800);
    });
  }

  // ── 4. Click the "GH" hero watermark ──────────────────────
  const wm = document.querySelector('.ov-hero-wm');
  if (wm) {
    wm.style.cursor = 'pointer';
    wm.title = '...';
    wm.addEventListener('click', e => {
      eeToast('🎮  GAME HUB  //  PLATFORM v2  //  TFG CO', '#7b2df8', 3200);
      eeConfetti(e.clientX, e.clientY, 55);
    });
  }

  // ── 5. Triple-click the operator name in topbar → identity ─
  const opName = document.getElementById('dash-greeting-name');
  if (opName) {
    const cryptoNames = [
      'UNIT_7', 'GHOST_PROTOCOL', 'NPC_#0042', 'THE_FLOOR_GUY', 'PLAYER_ONE',
    ];
    let n = 0, tid = null;
    opName.style.cursor = 'default';
    opName.addEventListener('click', () => {
      n++;
      clearTimeout(tid);
      tid = setTimeout(() => { n = 0; }, 700);
      if (n < 3) return;
      n = 0;

      const alias = cryptoNames[Math.floor(Math.random() * cryptoNames.length)];
      const orig  = opName.textContent;
      opName.textContent = alias;
      opName.style.color = '#f5a623';
      opName.style.textShadow = '0 0 8px #f5a623';
      setTimeout(() => {
        opName.textContent = orig;
        opName.style.color = '';
        opName.style.textShadow = '';
      }, 2500);
      eeToast(`> ALIAS ASSIGNED: ${alias}`, '#f5a623', 2800);
    });
  }
}
