/**
 * login.js  —  ES module
 * Uses Firebase Auth via auth.js
 */

import { loginUser, sendReset, getFriendlyError } from './auth.js';
import { eeToast, eeConfetti }                      from './easter-eggs.js';

// ── Constants ──────────────────────────────────────────────────
// ── Canvas / sphere config ─────────────────────────────────────
const BG_CFG = {
  count: 32, minR: 0.6, maxR: 1.8, speed: 0.28, mouseR: 120,
};
const SPHERE_CFG = {
  nLat: 9, nLon: 9, segs: 52, speed: 0.0038, tilt: 0.32,
};

// ── DOM refs ───────────────────────────────────────────────────
const loginScreen    = document.getElementById('auth-screen');
const form           = document.getElementById('login-form');
const emailInput     = document.getElementById('login-email');
const passwordInput  = document.getElementById('login-password');
const rememberCheck  = document.getElementById('remember-me');
const togglePassBtn  = document.getElementById('toggle-password');
const eyeShow        = togglePassBtn.querySelector('.eye-icon--show');
const eyeHide        = togglePassBtn.querySelector('.eye-icon--hide');
const btnLogin       = document.getElementById('btn-login');
const btnLabel       = document.getElementById('btn-label');
const btnSpinner     = document.getElementById('btn-spinner');
const btnRipple      = document.getElementById('btn-ripple');
const globalError    = document.getElementById('form-error-global');
const fieldEmail     = document.getElementById('field-email');
const fieldPassword  = document.getElementById('field-password');
const errorEmail     = document.getElementById('error-email');
const errorPassword  = document.getElementById('error-password');
const forgotLink     = document.getElementById('forgot-link');
const goRegister     = document.getElementById('go-register');
const loginCard      = document.getElementById('login-card');
const bgCanvas       = document.getElementById('login-particle-canvas');
const bgCtx          = bgCanvas.getContext('2d');
const heroCanvas     = document.getElementById('hero-canvas');
const heroCtx        = heroCanvas.getContext('2d');
const infoBtn        = document.getElementById('info-btn');
const infoOverlay    = document.getElementById('info-overlay');
const infoClose      = document.getElementById('info-close');

let bgParticles = [], bgStars = [], heroDust = [], heroT = 0;
let mouse = { x: -9999, y: -9999 };
let _pulseRings = [], _pulseNext = 3500, _prevHeroNow = 0;
let _glitchCvs = null, _glitchC = null, _glitchRAF = null;

// Sphere direction, speed & color blend — manipulated during panel transitions
let sphereDir    = 1;      // +1 forward, -1 reverse
let sphereSpeed  = SPHERE_CFG.speed;
let sphereColorT = 0;      // 0 = cyan (login), 1 = purple (register)

// ════════════════════════════════════════════════════════════
// BACKGROUND PARTICLE CANVAS
// ════════════════════════════════════════════════════════════

function resizeBg() {
  bgCanvas.width  = bgCanvas.offsetWidth  || window.innerWidth;
  bgCanvas.height = bgCanvas.offsetHeight || window.innerHeight;
}

function makeBgParticle() {
  const spd = (Math.random() - 0.5) * BG_CFG.speed;
  return {
    x: Math.random() * bgCanvas.width,  y: Math.random() * bgCanvas.height,
    r: BG_CFG.minR + Math.random() * (BG_CFG.maxR - BG_CFG.minR),
    vx: spd + (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * BG_CFG.speed,
    baseAlpha: 0.15 + Math.random() * 0.28, alpha: 0,
    color: Math.random() > 0.55 ? '0,212,255' : '123,45,248',
  };
}

function initBgParticles() {
  bgParticles = Array.from({ length: BG_CFG.count }, makeBgParticle);
}

function initBgStars() {
  bgStars = Array.from({ length: 90 }, () => ({
    x         : Math.random() * bgCanvas.width,
    y         : Math.random() * bgCanvas.height,
    r         : 0.18 + Math.random() * 0.78,
    phase     : Math.random() * Math.PI * 2,
    freq      : 0.003 + Math.random() * 0.010,
    baseAlpha : 0.07 + Math.random() * 0.26,
    color     : Math.random() > 0.82 ? '0,212,255'
              : Math.random() > 0.65 ? '160,130,255'
              : '218,228,248',
    sparkle   : Math.random() > 0.82,  // ~18% of stars occasionally flash
    sparkPhase: Math.random() * Math.PI * 2,
  }));
}

function drawBg() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

  // ── Twinkling star field ──────────────────────────────────
  for (const s of bgStars) {
    s.phase += s.freq;
    let a = s.baseAlpha * (0.35 + 0.65 * Math.sin(s.phase));
    if (s.sparkle) {
      s.sparkPhase += 0.007;
      const amp = Math.max(0, Math.sin(s.sparkPhase * 1.9) - 0.88) * 7;
      a = Math.min(0.92, a + amp);
      if (amp > 0.08) {        // draw 4-point cross for flashing stars
        const len = s.r * 4.5 * amp;
        bgCtx.beginPath();
        bgCtx.moveTo(s.x - len, s.y); bgCtx.lineTo(s.x + len, s.y);
        bgCtx.moveTo(s.x, s.y - len); bgCtx.lineTo(s.x, s.y + len);
        bgCtx.strokeStyle = `rgba(${s.color},${(a * 0.55).toFixed(3)})`;
        bgCtx.lineWidth = 0.45;
        bgCtx.stroke();
      }
    }
    bgCtx.beginPath();
    bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(${s.color},${a.toFixed(3)})`;
    bgCtx.fill();
  }

  for (const p of bgParticles) {
    const dx = p.x - mouse.x, dy = p.y - mouse.y;
    const d  = Math.hypot(dx, dy);
    if (d < BG_CFG.mouseR && d > 0) {
      const f = (BG_CFG.mouseR - d) / BG_CFG.mouseR;
      p.vx += (dx / d) * f * 0.3; p.vy += (dy / d) * f * 0.3;
      p.alpha = Math.min(0.85, p.baseAlpha + f * 0.5);
    } else {
      p.alpha += (p.baseAlpha - p.alpha) * 0.04;
    }
    p.vx *= 0.985; p.vy *= 0.985;
    p.x  += p.vx;  p.y  += p.vy;
    if (p.x < -5) p.x = bgCanvas.width  + 5; if (p.x > bgCanvas.width  + 5) p.x = -5;
    if (p.y < -5) p.y = bgCanvas.height + 5; if (p.y > bgCanvas.height + 5) p.y = -5;
    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(${p.color},${p.alpha.toFixed(2)})`;
    bgCtx.fill();
  }
  requestAnimationFrame(drawBg);
}

// ════════════════════════════════════════════════════════════
// HERO WIREFRAME SPHERE
// ════════════════════════════════════════════════════════════

function resizeHero() {
  heroCanvas.width  = heroCanvas.offsetWidth  || 600;
  heroCanvas.height = heroCanvas.offsetHeight || 900;
}

function initHeroDust() {
  heroDust = Array.from({ length: 45 }, () => ({
    x: Math.random() * heroCanvas.width,  y: Math.random() * heroCanvas.height,
    vx: (Math.random() - 0.5) * 0.22,    vy: (Math.random() - 0.5) * 0.18,
    r: 0.4 + Math.random() * 0.9,
    alpha: 0.04 + Math.random() * 0.14,
    color: Math.random() > 0.5 ? '0,212,255' : '100,55,220',
  }));
}

// ── Globe atmosphere + decorations ──────────────────────────────────
function _drawGlobeAtmosphere(cx, cy, R) {
  const _cr = Math.round(sphereColorT * 95);
  const _cg = Math.round(212 - sphereColorT * 162);
  const _cb = Math.round(255 - sphereColorT * 45);
  // Outer atmosphere halo (behind wireframe)
  const ag = heroCtx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.76);
  ag.addColorStop(0,    `rgba(${_cr},${_cg},${_cb},0.13)`);
  ag.addColorStop(0.42, `rgba(${_cr},${_cg},${_cb},0.05)`);
  ag.addColorStop(1,    `rgba(${_cr},${_cg},${_cb},0)`);
  heroCtx.beginPath();
  heroCtx.arc(cx, cy, R * 1.76, 0, Math.PI * 2);
  heroCtx.fillStyle = ag;
  heroCtx.fill();
  // Inner core brightspot (front-face highlight)
  const cg = heroCtx.createRadialGradient(cx - R * 0.16, cy - R * 0.12, 0, cx, cy, R * 0.72);
  cg.addColorStop(0, `rgba(${_cr},${_cg},${_cb},0.09)`);
  cg.addColorStop(1, `rgba(${_cr},${_cg},${_cb},0)`);
  heroCtx.beginPath();
  heroCtx.arc(cx, cy, R * 0.72, 0, Math.PI * 2);
  heroCtx.fillStyle = cg;
  heroCtx.fill();
}

function _drawGlobePoles(cx, cy, R, cosY, sinY, cosX, sinX) {
  const _cr = Math.round(sphereColorT * 95);
  const _cg = Math.round(212 - sphereColorT * 162);
  const _cb = Math.round(255 - sphereColorT * 45);
  for (const [px, py, pz] of [[0, 1, 0], [0, -1, 0]]) {
    const rx = px * cosY - pz * sinY, rz = px * sinY + pz * cosY;
    const ry = py * cosX - rz * sinX, rzz = py * sinX + rz * cosX;
    if (rzz < -0.1) continue;
    const a  = Math.max(0, rzz * 0.90);
    const sx = cx + rx * R, sy = cy + ry * R;
    // Soft halo
    heroCtx.beginPath();
    heroCtx.arc(sx, sy, 10 * a, 0, Math.PI * 2);
    heroCtx.fillStyle = `rgba(${_cr},${_cg},${_cb},${(a * 0.14).toFixed(3)})`;
    heroCtx.fill();
    // Core dot
    heroCtx.beginPath();
    heroCtx.arc(sx, sy, 2.8 * a, 0, Math.PI * 2);
    heroCtx.fillStyle = `rgba(${_cr},${_cg},${_cb},${(a * 0.88).toFixed(3)})`;
    heroCtx.fill();
    // Cross marker
    const cl = 12 * a;
    heroCtx.beginPath();
    heroCtx.moveTo(sx - cl, sy); heroCtx.lineTo(sx + cl, sy);
    heroCtx.moveTo(sx, sy - cl); heroCtx.lineTo(sx, sy + cl);
    heroCtx.strokeStyle = `rgba(${_cr},${_cg},${_cb},${(a * 0.38).toFixed(3)})`;
    heroCtx.lineWidth = 0.75;
    heroCtx.stroke();
  }
}

function _tickPulseRings(cx, cy, R, dt) {
  _pulseNext -= dt;
  if (_pulseNext <= 0) {
    _pulseRings.push({ prog: 0 });
    _pulseNext = 2800 + Math.random() * 2200;
  }
  const _cr = Math.round(sphereColorT * 95);
  const _cg = Math.round(212 - sphereColorT * 162);
  const _cb = Math.round(255 - sphereColorT * 45);
  for (let i = _pulseRings.length - 1; i >= 0; i--) {
    const ring = _pulseRings[i];
    ring.prog = Math.min(1, ring.prog + dt / 1150);
    const rr  = R * (1.06 + ring.prog * 0.74);
    const a   = (1 - ring.prog) * (1 - ring.prog) * 0.40;
    if (a < 0.005) { _pulseRings.splice(i, 1); continue; }
    heroCtx.beginPath();
    heroCtx.arc(cx, cy, rr, 0, Math.PI * 2);
    heroCtx.strokeStyle = `rgba(${_cr},${_cg},${_cb},${a.toFixed(3)})`;
    heroCtx.lineWidth = 2.2 * (1 - ring.prog);
    heroCtx.stroke();
  }
}

function drawRing(getPt, cosY, sinY, cosX, sinX, cx, cy, R) {
  // Interpolate front-face color: cyan (0,212,255) → purple (95,50,210)
  const _cr = Math.round(sphereColorT * 95);
  const _cg = Math.round(212 - sphereColorT * 162);
  const _cb = Math.round(255 - sphereColorT * 45);
  const pts = [];
  for (let j = 0; j <= SPHERE_CFG.segs; j++) {
    const [bx, by, bz] = getPt(j / SPHERE_CFG.segs);
    const x1 = bx * cosY - bz * sinY, z1 = bx * sinY + bz * cosY;
    const y2 = by * cosX - z1 * sinX, z2 = by * sinX + z1 * cosX;  // eslint-disable-line no-unused-vars
    pts.push([cx + x1 * R, cy + y2 * R, z2]);
  }
  for (let j = 0; j < SPHERE_CFG.segs; j++) {
    const [x1, y1, d1] = pts[j], [x2, y2, d2] = pts[j + 1];
    const d     = (d1 + d2) * 0.5;
    const alpha = d > 0 ? (0.08 + d * 0.52).toFixed(2) : (Math.max(0, d + 1) * 0.04).toFixed(2);
    heroCtx.beginPath(); heroCtx.moveTo(x1, y1); heroCtx.lineTo(x2, y2);
    heroCtx.strokeStyle = d > 0 ? `rgba(${_cr},${_cg},${_cb},${alpha})` : `rgba(95,50,210,${alpha})`;
    heroCtx.lineWidth   = d > 0 ? 0.75 : 0.38;
    heroCtx.stroke();
  }
}

function heroFrame(now = 0) {
  const dt     = _prevHeroNow ? Math.min(now - _prevHeroNow, 50) : 16.7;
  _prevHeroNow = now;
  heroT += sphereSpeed * sphereDir;
  const W = heroCanvas.width, H = heroCanvas.height;
  heroCtx.clearRect(0, 0, W, H);
  const _mob = window.innerWidth <= 768;
  const cx = W * (_mob ? 0.50 : 0.52), cy = H * (_mob ? 0.50 : 0.44), R = Math.min(W, H) * (_mob ? 0.38 : 0.31);
  const cosY = Math.cos(heroT * 1.4), sinY = Math.sin(heroT * 1.4);
  const cosX = Math.cos(SPHERE_CFG.tilt), sinX = Math.sin(SPHERE_CFG.tilt);

  // ── Atmosphere glow (drawn before wireframe) ────────────
  _drawGlobeAtmosphere(cx, cy, R);

  // ── Wireframe sphere ─────────────────────────────────────
  for (let i = 1; i < SPHERE_CFG.nLat; i++) {
    const phi = (i / SPHERE_CFG.nLat) * Math.PI, ry = Math.cos(phi), rxz = Math.sin(phi);
    drawRing(f => { const th = f * Math.PI * 2; return [rxz * Math.cos(th), ry, rxz * Math.sin(th)]; },
             cosY, sinY, cosX, sinX, cx, cy, R);
  }
  for (let i = 0; i < SPHERE_CFG.nLon; i++) {
    const th0 = (i / SPHERE_CFG.nLon) * Math.PI * 2, ct = Math.cos(th0), st = Math.sin(th0);
    drawRing(f => { const phi = f * Math.PI, rxz = Math.sin(phi); return [rxz * ct, Math.cos(phi), rxz * st]; },
             cosY, sinY, cosX, sinX, cx, cy, R);
  }
  drawRing(f => { const th = f * Math.PI * 2; return [Math.cos(th), 0, Math.sin(th)]; },
           cosY, sinY, cosX, sinX, cx, cy, R);

  // ── Decorations (after wireframe, before dust) ───────────
  _tickPulseRings(cx, cy, R, dt);
  _drawGlobePoles(cx, cy, R, cosY, sinY, cosX, sinX);

  // ── Floating dust ────────────────────────────────────────
  for (const p of heroDust) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    heroCtx.beginPath(); heroCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    heroCtx.fillStyle = `rgba(${p.color},${p.alpha})`; heroCtx.fill();
    // Sparkle cross for larger dust particles
    if (p.r > 0.82) {
      const len = p.r * 3.5;
      heroCtx.beginPath();
      heroCtx.moveTo(p.x - len, p.y); heroCtx.lineTo(p.x + len, p.y);
      heroCtx.moveTo(p.x, p.y - len); heroCtx.lineTo(p.x, p.y + len);
      heroCtx.strokeStyle = `rgba(${p.color},${(p.alpha * 0.45).toFixed(3)})`;
      heroCtx.lineWidth = 0.42;
      heroCtx.stroke();
    }
  }
  requestAnimationFrame(heroFrame);
}

// ════════════════════════════════════════════════════════════
// CARD TILT
// ════════════════════════════════════════════════════════════

function handleCardTilt(e) {
  const rect = loginCard.getBoundingClientRect();
  const rx   = ((e.clientY - rect.top  - rect.height / 2) / rect.height) * -3.5;
  const ry   = ((e.clientX - rect.left - rect.width  / 2) / rect.width)  *  3.5;
  loginCard.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(4px)`;
}

// ════════════════════════════════════════════════════════════
// VALIDATION
// ════════════════════════════════════════════════════════════

function setErr(fieldEl, errorEl, msg) {
  fieldEl.classList.add('has-error');
  errorEl.textContent = msg;
}

function clrErr(fieldEl, errorEl) {
  fieldEl.classList.remove('has-error');
  errorEl.textContent = '';
}

function validate() {
  let ok  = true;
  const e = emailInput.value.trim();
  const p = passwordInput.value;

  if (!e) {
    setErr(fieldEmail, errorEmail, 'Email is required.'); ok = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    setErr(fieldEmail, errorEmail, 'Enter a valid email address.'); ok = false;
  } else {
    clrErr(fieldEmail, errorEmail);
  }

  if (!p) {
    setErr(fieldPassword, errorPassword, 'Password is required.'); ok = false;
  } else {
    clrErr(fieldPassword, errorPassword);
  }

  return ok;
}

function showGlobalError(msg) {
  if (!globalError) return;
  globalError.textContent = msg;
  globalError.removeAttribute('hidden');
}

function clrGlobalError() {
  if (!globalError) return;
  globalError.textContent = '';
  globalError.setAttribute('hidden', '');
}

// ════════════════════════════════════════════════════════════
// BUTTON STATE
// ════════════════════════════════════════════════════════════

function setBtnLoading(yes) {
  btnLogin.disabled = yes;
  if (yes) { btnLabel.textContent = 'VERIFYING…'; btnSpinner.removeAttribute('hidden'); }
  else      { btnLabel.textContent = 'SIGN IN';    btnSpinner.setAttribute('hidden', ''); }
}

function triggerRipple(e) {
  btnRipple.classList.remove('animating');
  const rect = btnLogin.getBoundingClientRect(), size = Math.max(rect.width, rect.height);
  btnRipple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;`;
  void btnRipple.offsetWidth;
  btnRipple.classList.add('animating');
}

// ════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ════════════════════════════════════════════════════════════

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = emailInput.value.trim();
  const statusEl = document.getElementById('forgot-status');

  if (!email) {
    setErr(fieldEmail, errorEmail, 'Enter your email above first.');
    emailInput.focus();
    return;
  }
  try {
    await sendReset(email);
    if (statusEl) {
      statusEl.textContent = `✓ Reset link sent to ${email}`;
      statusEl.className   = 'forgot-status forgot-status--ok';
      statusEl.removeAttribute('hidden');
      setTimeout(() => { statusEl.setAttribute('hidden',''); }, 7000);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = getFriendlyError(err.code);
      statusEl.className   = 'forgot-status forgot-status--err';
      statusEl.removeAttribute('hidden');
      setTimeout(() => { statusEl.setAttribute('hidden',''); }, 5000);
    }
  }
}

// ════════════════════════════════════════════════════════════
// LOGIN SUBMIT
// ════════════════════════════════════════════════════════════

// ── Sentinel lockout listener ───────────────────────────────────────────────────
window.addEventListener('snl:lockout', (e) => {
  const mins = Math.ceil((e.detail?.remain ?? 360000) / 60000);
  showGlobalError(`Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`);
  if (btnLogin) btnLogin.disabled = true;
  const interval = setInterval(() => {
    const rem = window.snl?.remain() ?? 0;
    if (rem <= 0) {
      clearInterval(interval);
      clrGlobalError();
      if (btnLogin) btnLogin.disabled = false;
    } else {
      const m = Math.ceil(rem / 60000);
      showGlobalError(`Too many failed attempts. Try again in ${m} minute${m > 1 ? 's' : ''}.`);
    }
  }, 15000);
});

async function handleLogin(e) {
  e.preventDefault();
  clrGlobalError();

  // — Sentinel lockout check ————————————————————————————————————————
  if (window.snl?.locked()) {
    const mins = Math.ceil((window.snl.remain()) / 60000);
    showGlobalError(`Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`);
    return;
  }

  // — Sentinel honeypot check ———————————————————————————————————————
  if (window.snl?.honeypot()) {
    window.dispatchEvent(new CustomEvent('snl:fail', { detail: { code: 'honeypot' } }));
    setBtnLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    showGlobalError('Invalid email or password.');
    setBtnLoading(false);
    return;
  }

  // — Sentinel timing probe —————————————————————————————————————————
  window.snl?.timing();

  if (!validate()) return;
  setBtnLoading(true);
  try {
    await loginUser({
      email:    emailInput.value.trim(),
      password: passwordInput.value,
      remember: rememberCheck.checked,
    });
    // Save/clear remembered email
    if (rememberCheck.checked) {
      localStorage.setItem('gamehub_remembered_email', emailInput.value.trim());
    } else {
      localStorage.removeItem('gamehub_remembered_email');
    }
    // Signal Sentinel: success — resets attempt counter
    window.dispatchEvent(new CustomEvent('snl:ok'));
    // dashboard.js’s onAuthStateChanged handles the transition
  } catch (err) {
    setBtnLoading(false);
    showGlobalError(getFriendlyError(err.code));
    passwordInput.value = '';
    passwordInput.focus();
    // Signal Sentinel: failed attempt
    window.dispatchEvent(new CustomEvent('snl:fail', { detail: { code: err.code } }));
  }
}

// ════════════════════════════════════════════════════════════
// SPHERE ANIMATION HELPERS
// ════════════════════════════════════════════════════════════

const authLeft   = document.getElementById('auth-left');
const brandTag   = document.getElementById('brand-tagline');
const panelLogin = document.getElementById('panel-login');
const panelReg   = document.getElementById('panel-register');
let   panelBusy  = false;

function _lerpSpeed(fromSpeed, toDir, toSpeed, duration, onDone) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    // Ease in-out
    const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    sphereSpeed = fromSpeed + (toSpeed - fromSpeed) * e;
    if (t < 1) { requestAnimationFrame(tick); }
    else       { sphereSpeed = toSpeed; sphereDir = toDir; onDone && onDone(); }
  }
  requestAnimationFrame(tick);
}

function _lerpColorT(from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    sphereColorT = from + (to - from) * e;
    if (t < 1) requestAnimationFrame(tick);
    else sphereColorT = to;
  }
  requestAnimationFrame(tick);
}

// ════════════════════════════════════════════════════════════
// SCREEN NAVIGATION
// ════════════════════════════════════════════════════════════

function switchPanel(toRegister) {
  if (panelBusy) return;
  panelBusy = true;

  const outPanel = toRegister ? panelLogin : panelReg;
  const inPanel  = toRegister ? panelReg   : panelLogin;

  // 1. Crossfade panels
  // Move focus away BEFORE setting aria-hidden to avoid AT accessibility warning.
  const focused = outPanel.querySelector(':focus');
  if (focused) focused.blur();
  outPanel.classList.add('auth-panel--hidden');
  outPanel.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    inPanel.classList.remove('auth-panel--hidden');
    inPanel.removeAttribute('aria-hidden');
    const focusTarget = toRegister
      ? inPanel.querySelector('#reg-username')
      : emailInput;
    if (focusTarget) focusTarget.focus();
  }, 80);
  setTimeout(() => { panelBusy = false; }, 1000);

  // 2. Slowly decelerate sphere → flip direction → re-accelerate + blend color
  const origSpeed = SPHERE_CFG.speed;
  _lerpSpeed(sphereSpeed, sphereDir, 0, 300, () => {
    sphereDir = toRegister ? -1 : 1;
    _lerpSpeed(0, sphereDir, origSpeed * (toRegister ? 0.55 : 1), 520, null);
  });
  _lerpColorT(sphereColorT, toRegister ? 1 : 0, 820);

  // 3. Brand accent color + tagline text crossfade
  if (toRegister) {
    authLeft.classList.add('state-register');
    brandTag.classList.add('is-fading');
    setTimeout(() => {
      brandTag.textContent = 'Join the network. Start playing.';
      brandTag.classList.remove('is-fading');
    }, 350);
  } else {
    authLeft.classList.remove('state-register');
    brandTag.classList.add('is-fading');
    setTimeout(() => {
      brandTag.textContent = 'One hub. Every game. Every player.';
      brandTag.classList.remove('is-fading');
    }, 350);
  }
}

function openRegister(e) {
  e.preventDefault();
  switchPanel(true);
}

// Register.js signals back via this event
window.addEventListener('auth:to-login', () => switchPanel(false));

// ════════════════════════════════════════════════════════════
// EVENT BINDINGS
// ════════════════════════════════════════════════════════════

emailInput.addEventListener('input', () => { if (fieldEmail.classList.contains('has-error')) clrErr(fieldEmail, errorEmail); clrGlobalError(); });
passwordInput.addEventListener('input', () => { if (fieldPassword.classList.contains('has-error')) clrErr(fieldPassword, errorPassword); clrGlobalError(); });

form.addEventListener('submit', handleLogin);
btnLogin.addEventListener('pointerdown', triggerRipple);
forgotLink.addEventListener('click', handleForgotPassword);
goRegister.addEventListener('click', openRegister);
togglePassBtn.addEventListener('click', () => {
  const h = passwordInput.type === 'password';
  passwordInput.type = h ? 'text' : 'password';
  eyeShow.hidden = h; eyeHide.hidden = !h;
  togglePassBtn.setAttribute('aria-label', h ? 'Hide password' : 'Show password');
});
loginCard.addEventListener('mousemove', handleCardTilt);
loginCard.addEventListener('mouseleave', () => { loginCard.style.transform = ''; });
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

// ════════════════════════════════════════════════════════════
// INIT — fired by loading.js after CRT-off transition
// ════════════════════════════════════════════════════════════

function init() {
  resizeBg(); resizeHero();
  window.addEventListener('resize', () => { resizeBg(); initBgParticles(); initBgStars(); resizeHero(); });
  initBgParticles(); initBgStars(); drawBg();
  initHeroDust(); heroFrame();
  // Restore remembered email
  const saved = localStorage.getItem('gamehub_remembered_email');
  if (saved) { emailInput.value = saved; rememberCheck.checked = true; }
  (emailInput.value ? passwordInput : emailInput).focus();
}

// ════════════════════════════════════════════════════════════
// RE-INIT — fired by dashboard.js after sign-out, restores
// auth screen to a clean login state without restarting the
// RAF loops (drawBg / heroFrame keep running in the background)
// ════════════════════════════════════════════════════════════

function reinitForLogout() {
  // 1. Unstick any panel-transition lock
  panelBusy = false;

  // 2. Return to login panel if the register panel was active
  if (panelLogin.classList.contains('auth-panel--hidden')) {
    panelLogin.classList.remove('auth-panel--hidden');
    panelLogin.removeAttribute('aria-hidden');
    panelReg.classList.add('auth-panel--hidden');
    panelReg.setAttribute('aria-hidden', 'true');
    authLeft.classList.remove('state-register');
    brandTag.textContent = 'One hub. Every game. Every player.';
  }

  // 3. Reset sphere vars to login-panel defaults
  sphereDir    = 1;
  sphereColorT = 0;
  sphereSpeed  = SPHERE_CFG.speed;

  // 4. Re-measure + reinit canvases now that auth-screen is visible
  resizeBg();
  resizeHero();
  initBgParticles();
  initBgStars();
  initHeroDust();

  // 5. Reset login form to a pristine state
  setBtnLoading(false);
  clrGlobalError();
  if (globalError) globalError.removeAttribute('style'); // clear colour overrides left by forgot-password
  clrErr(fieldEmail, errorEmail);
  clrErr(fieldPassword, errorPassword);
  passwordInput.value = '';
  // Clear forgot-password status
  const forgotSt = document.getElementById('forgot-status');
  if (forgotSt) { forgotSt.setAttribute('hidden',''); forgotSt.textContent=''; }
  // Close info overlay if it was open
  _closeInfoOverlay();

  // 6. Focus the right field
  const saved = localStorage.getItem('gamehub_remembered_email');
  if (saved) { emailInput.value = saved; rememberCheck.checked = true; }
  (emailInput.value ? passwordInput : emailInput).focus();
}

window.addEventListener('auth:returning', reinitForLogout);

// ════════════════════════════════════════════════════════════
// INFO OVERLAY  —  globe glitch → wipe reveal → glitch-out
// ════════════════════════════════════════════════════════════

// ── JS-driven canvas glitch ─────────────────────────────────────────
function _ensureGlitchCanvas() {
  if (_glitchCvs) return;
  const fx = document.getElementById('globe-glitch-fx');
  _glitchCvs = document.createElement('canvas');
  _glitchCvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  fx.appendChild(_glitchCvs);
  _glitchC = _glitchCvs.getContext('2d');
}

function _runGlitch(onDone) {
  if (_glitchRAF) { cancelAnimationFrame(_glitchRAF); _glitchRAF = null; }
  _ensureGlitchCanvas();
  const fxEl = document.getElementById('globe-glitch-fx');
  const W = heroCanvas.width, H = heroCanvas.height;
  _glitchCvs.width = W;
  _glitchCvs.height = H;
  fxEl.style.opacity = '1';
  const startT = performance.now();
  const DUR    = 720;
  const SLICE  = 11;
  const N      = Math.ceil(H / SLICE);

  function tick(now) {
    const t     = Math.min(1, (now - startT) / DUR);
    const inten = t < 0.38 ? 1 : 1 - (t - 0.38) / 0.62;   // full → fade after 38%
    _glitchC.clearRect(0, 0, W, H);

    // 1. Horizontal slice displacement — mirrors live canvas pixel data
    for (let i = 0; i < N; i++) {
      const sy   = i * SLICE;
      const sh   = Math.min(SLICE, H - sy);
      const torn = Math.random() < inten * 0.68;
      const xOff = torn ? (Math.random() - 0.5) * 58 * inten : 0;
      // Main slice (true canvas mirror)
      _glitchC.drawImage(heroCanvas, 0, sy, W, sh, xOff, sy, W, sh);
      // Chromatic aberration on torn slices
      if (torn && Math.random() < 0.52) {
        const split = (5 + Math.random() * 11) * inten;
        _glitchC.save();
        _glitchC.globalCompositeOperation = 'screen';
        _glitchC.globalAlpha = 0.30 * inten;
        _glitchC.drawImage(heroCanvas, 0, sy, W, sh, xOff + split, sy, W, sh);        // red ghost
        _glitchC.globalAlpha = 0.24 * inten;
        _glitchC.drawImage(heroCanvas, 0, sy, W, sh, xOff - split * 0.65, sy, W, sh); // cyan ghost
        _glitchC.restore();
      }
    }

    // 2. Colour tear bars
    const nBars = Math.round((1 + Math.random() * 4) * inten);
    for (let b = 0; b < nBars; b++) {
      const bh = 1 + Math.random() * 20;
      const by = Math.random() * H;
      const ba = (0.20 + Math.random() * 0.45) * inten;
      const bc = Math.random() > 0.5 ? '0,212,255' : '255,0,80';
      _glitchC.fillStyle = `rgba(${bc},${ba.toFixed(2)})`;
      _glitchC.fillRect(0, by, W, bh);
    }

    // 3. Sporadic bright flash line
    if (Math.random() < 0.10 * inten) {
      _glitchC.fillStyle = `rgba(255,255,255,${(0.18 * inten).toFixed(2)})`;
      _glitchC.fillRect(0, Math.random() * H, W, 1 + Math.random() * 3);
    }

    // 4. Scanline texture over everything
    _glitchC.fillStyle = 'rgba(0,0,0,0.17)';
    for (let sl = 0; sl < H; sl += 4) _glitchC.fillRect(0, sl + 3, W, 1);

    heroCanvas.style.opacity = (0.05 + inten * 0.95).toFixed(3);

    if (t < 1) {
      _glitchRAF = requestAnimationFrame(tick);
    } else {
      _glitchC.clearRect(0, 0, W, H);
      fxEl.style.opacity = '';
      heroCanvas.style.opacity = '0.05';
      _glitchRAF = null;
      if (onDone) onDone();
    }
  }
  _glitchRAF = requestAnimationFrame(tick);
}

function _openInfoOverlay() {
  infoBtn.setAttribute('hidden', '');
  _runGlitch(() => {
    infoOverlay.removeAttribute('hidden');
    infoOverlay.removeAttribute('aria-hidden');
  });
}

function _closeInfoOverlay() {
  // Glitch the overlay out first, then hide it and revive the sphere
  infoOverlay.classList.add('is-closing');
  setTimeout(() => {
    infoOverlay.setAttribute('hidden', '');
    infoOverlay.setAttribute('aria-hidden', 'true');
    infoOverlay.classList.remove('is-closing');

    // Clear inline opacity so the revive animation starts from 0.05
    authLeft.classList.add('globe-reviving');
    heroCanvas.style.opacity = '';

    setTimeout(() => {
      authLeft.classList.remove('globe-reviving');
      infoBtn.removeAttribute('hidden');
    }, 580);
  }, 220);
}

infoBtn.addEventListener('click', _openInfoOverlay);
infoClose.addEventListener('click', _closeInfoOverlay);

// ════════════════════════════════════════════════════════════
// 🥚 LOGIN EASTER EGGS
// ════════════════════════════════════════════════════════════

// ── 1. Globe (heroCanvas) clicks ─────────────────────────────
// Each click shows a funny message; milestones trigger warp
// speed, confetti, and a goofy colour filter.
{
  const GLOBE_MSGS = [
    ['bro why are you clicking me',          '#00d4ff'],
    ['ok that’s twice. interesting choice.',  '#7b2df8'],
    ["i'm literally just a spinning ball 💀",  '#f5a623'],
    ['please. i have a family.',              '#ff4080'],
    ['ok fine here’s some confetti 🎊',       '#44dd88'],
    ['you “completed” the globe. congrats. 🌍', '#f5a623'],
  ];
  let _gc = 0;
  let _gcLast = 0; // per-click time gate — min 350 ms between registering clicks

  heroCanvas.addEventListener('click', e => {
    const now = Date.now();
    if (now - _gcLast < 350) return; // ignore rapid spam clicks
    _gcLast = now;

    _gc++;
    const [msg, col] = GLOBE_MSGS[Math.min(_gc - 1, GLOBE_MSGS.length - 1)];
    eeToast(msg, col);

    // Milestone: 3rd click → warp speed for 3 s
    if (_gc === 3) {
      const orig = sphereSpeed;
      sphereSpeed = SPHERE_CFG.speed * 14;
      setTimeout(() => { sphereSpeed = orig; }, 3000);
    }

    // Milestone: 5th click → confetti burst from globe centre
    if (_gc === 5) {
      const r     = heroCanvas.getBoundingClientRect();
      const isMob = window.innerWidth <= 768;
      eeConfetti(
        r.left + r.width  * (isMob ? 0.50 : 0.52),
        r.top  + r.height * (isMob ? 0.50 : 0.44),
        90
      );
    }

    // Milestone: 7th click → funky colour flash + message, then counter resets
    if (_gc >= 7) {
      _gc = 0;
      heroCanvas.style.transition = 'filter .35s ease';
      heroCanvas.style.filter     = 'hue-rotate(260deg) saturate(2.2) brightness(1.2)';
      eeToast('ok you need to go outside lol', '#a855f7', 3200);
      setTimeout(() => {
        heroCanvas.style.filter = '';
        setTimeout(() => { heroCanvas.style.transition = ''; }, 400);
      }, 3200);
    }
  });
}

// ── 2. Draggable login card (grab by the terminal bar) ────────
// Lets you freely drag the login form around the screen.
// Drops with a subtle cyan pulse.
{
  const bar = loginCard.querySelector('.terminal-bar');
  let _drag = false, _ox = 0, _oy = 0, _sx = 0, _sy = 0;

  bar.style.cursor = 'grab';

  bar.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const r = loginCard.getBoundingClientRect();

    // First drag: promote card to fixed positioning
    if (loginCard.style.position !== 'fixed') {
      loginCard.style.position   = 'fixed';
      loginCard.style.margin     = '0';
      loginCard.style.left       = r.left + 'px';
      loginCard.style.top        = r.top  + 'px';
      loginCard.style.transition = 'none';
    }

    _sx = e.clientX; _sy = e.clientY;
    _ox = parseFloat(loginCard.style.left) || r.left;
    _oy = parseFloat(loginCard.style.top)  || r.top;
    _drag = true;
    bar.style.cursor           = 'grabbing';
    loginCard.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('pointermove', e => {
    if (!_drag) return;
    loginCard.style.left = (_ox + e.clientX - _sx) + 'px';
    loginCard.style.top  = (_oy + e.clientY - _sy) + 'px';
  });

  document.addEventListener('pointerup', () => {
    if (!_drag) return;
    _drag = false;
    bar.style.cursor           = 'grab';
    loginCard.style.userSelect = '';
    // Snap-drop pulse
    loginCard.style.boxShadow = '0 0 0 2px rgba(0,212,255,.55)';
    setTimeout(() => { loginCard.style.boxShadow = ''; }, 420);
  });
}

// ── 3. Terminal dot easter eggs ───────────────────────────────
//  • Red dot   → fake-shutdown screen flash
//  • Yellow dot → earthquake card shake
//  • Green dot  → dramatic zoom-out then snap back
{
  const dotR = loginCard.querySelector('.t-dot--r');
  const dotY = loginCard.querySelector('.t-dot--y');
  const dotG = loginCard.querySelector('.t-dot--g');

  if (dotR) dotR.addEventListener('click', () => {
    eeToast('OW. rude. 🤔', '#ff4080');
    const flash = document.createElement('div');
    flash.style.cssText = [
      'position:fixed', 'inset:0', 'background:#ff0040', 'z-index:199999',
      'opacity:0', 'pointer-events:none', 'transition:opacity .1s',
    ].join(';');
    document.body.appendChild(flash);
    requestAnimationFrame(() => { flash.style.opacity = '.16'; });
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 200);
    }, 130);
  });

  if (dotY) dotY.addEventListener('click', () => {
    eeToast('put down the coffee bro ☕', '#f5a623', 2000);
    const steps = [-5, 5, -4, 4, -3, 3, 0];
    steps.forEach((x, i) => setTimeout(() => {
      loginCard.style.transform = `perspective(900px) translateX(${x}px)`;
    }, i * 75));
    setTimeout(() => { loginCard.style.transform = ''; }, steps.length * 75 + 80);
  });

  if (dotG) dotG.addEventListener('click', () => {
    eeToast('I GOT SHRUNK 😱', '#44dd88', 1800);
    loginCard.style.transition = 'transform .35s ease';
    loginCard.style.transform  = 'perspective(1400px) scale(.68) translateZ(-90px)';
    setTimeout(() => {
      loginCard.style.transform = '';
      setTimeout(() => { loginCard.style.transition = ''; }, 380);
    }, 1400);
  });
}

window.addEventListener('login-screen-ready', init, { once: true });
