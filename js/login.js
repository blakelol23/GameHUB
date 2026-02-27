/**
 * login.js  —  ES module
 * Uses Firebase Auth via auth.js
 */

import { loginUser, sendReset, getFriendlyError } from './auth.js';

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

let bgParticles = [], heroDust = [], heroT = 0;
let mouse = { x: -9999, y: -9999 };

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

function drawBg() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
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

function heroFrame() {
  heroT += sphereSpeed * sphereDir;
  const W = heroCanvas.width, H = heroCanvas.height;
  heroCtx.clearRect(0, 0, W, H);
  const cx = W * 0.52, cy = H * 0.44, R = Math.min(W, H) * 0.31;
  const cosY = Math.cos(heroT * 1.4), sinY = Math.sin(heroT * 1.4);
  const cosX = Math.cos(SPHERE_CFG.tilt), sinX = Math.sin(SPHERE_CFG.tilt);

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

  for (const p of heroDust) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    heroCtx.beginPath(); heroCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    heroCtx.fillStyle = `rgba(${p.color},${p.alpha})`; heroCtx.fill();
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
  window.addEventListener('resize', () => { resizeBg(); initBgParticles(); resizeHero(); });
  initBgParticles(); drawBg();
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

function _openInfoOverlay() {
  // Phase 1: kick off the glitch on the globe side
  authLeft.classList.add('globe-glitching');
  infoBtn.setAttribute('hidden', '');

  // Phase 2: glitch winds down (720ms) → freeze canvas as ghost, reveal overlay
  setTimeout(() => {
    authLeft.classList.remove('globe-glitching');
    heroCanvas.style.opacity = '0.05';   // hold ghost state
    infoOverlay.removeAttribute('hidden');
    infoOverlay.removeAttribute('aria-hidden');
  }, 720);
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

window.addEventListener('login-screen-ready', init, { once: true });
