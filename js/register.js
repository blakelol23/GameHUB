/**
 * register.js  —  ES module
 * Handles register form logic only.
 * Navigation (panel switching, sphere reversal, brand colour)
 * is handled by login.js which owns the shared left panel.
 * This module signals login.js via window events.
 */

import { registerUser, isValidUsername, isUsernameAvailable, getFriendlyError } from './auth.js';

// ── DOM refs ───────────────────────────────────────────────────
const form           = document.getElementById('register-form');
const usernameInput  = document.getElementById('reg-username');
const emailInput     = document.getElementById('reg-email');
const passwordInput  = document.getElementById('reg-password');
const confirmInput   = document.getElementById('reg-confirm');
const usernameStatus = document.getElementById('username-status');
const strengthBar    = document.getElementById('strength-bar');
const strengthWrap   = document.getElementById('password-strength');
const btn            = document.getElementById('btn-register');
const btnLabel       = document.getElementById('reg-btn-label');
const btnSpinner     = document.getElementById('reg-btn-spinner');
const btnRipple      = document.getElementById('reg-btn-ripple');
const globalError    = document.getElementById('reg-form-error');
const regCard        = document.getElementById('register-card');
const goLogin        = document.getElementById('go-login');
const regTogglePass  = document.getElementById('reg-toggle-password');
const regEyeShow     = regTogglePass.querySelector('.eye-icon--show');
const regEyeHide     = regTogglePass.querySelector('.eye-icon--hide');

const fieldUsername = document.getElementById('reg-field-username');
const fieldEmail    = document.getElementById('reg-field-email');
const fieldPassword = document.getElementById('reg-field-password');
const fieldConfirm  = document.getElementById('reg-field-confirm');
const errUsername   = document.getElementById('reg-error-username');
const errEmail      = document.getElementById('reg-error-email');
const errPassword   = document.getElementById('reg-error-password');
const errConfirm    = document.getElementById('reg-error-confirm');

// ════════════════════════════════════════════════════════════
// PASSWORD STRENGTH METER
// ════════════════════════════════════════════════════════════

function measureStrength(pw) {
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_COLORS = ['#ff4d6a','#ff4d6a','#ffa040','#f5d020','#44dd88','#00d4ff'];

function updateStrengthMeter(pw) {
  if (!pw) { strengthWrap.style.opacity = '0'; return; }
  strengthWrap.style.opacity = '1';
  const s = measureStrength(pw);
  strengthBar.style.width      = (s / 5 * 100) + '%';
  strengthBar.style.background = STRENGTH_COLORS[s];
}

// ════════════════════════════════════════════════════════════
// USERNAME AVAILABILITY CHECK (debounced)
// ════════════════════════════════════════════════════════════

let usernameTimer = null;

async function checkUsername(username) {
  if (!isValidUsername(username)) { setIcon(''); return; }
  setIcon('checking');
  try {
    const avail = await isUsernameAvailable(username);
    setIcon(avail ? 'ok' : 'taken');
    if (!avail) setErr(fieldUsername, errUsername, 'Username is already taken.');
    else        clrErr(fieldUsername, errUsername);
  } catch { setIcon(''); }
}

function setIcon(state) {
  usernameStatus.textContent  = { ok: '✓', taken: '✗', checking: '…', '': '' }[state] ?? '';
  usernameStatus.dataset.state = state;
}

// ════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ════════════════════════════════════════════════════════════

function setErr(f, el, msg) { f.classList.add('has-error'); el.textContent = msg; }
function clrErr(f, el)      { f.classList.remove('has-error'); el.textContent = ''; }

function showGlobalError(msg) {
  globalError.textContent = msg;
  globalError.style.color = globalError.style.borderColor = globalError.style.background = '';
  globalError.removeAttribute('hidden');
}

function clrGlobalError() {
  globalError.setAttribute('hidden', '');
  globalError.textContent = '';
}

function validate() {
  let ok = true;
  const u = usernameInput.value.trim(), e = emailInput.value.trim();
  const p = passwordInput.value,        c = confirmInput.value;

  if (!u)                      { setErr(fieldUsername, errUsername, 'Username is required.'); ok = false; }
  else if (!isValidUsername(u)) { setErr(fieldUsername, errUsername, 'Only letters, numbers, _ and - allowed (3–32 chars).'); ok = false; }

  if (!e)                               { setErr(fieldEmail, errEmail, 'Email is required.'); ok = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setErr(fieldEmail, errEmail, 'Enter a valid email address.'); ok = false; }
  else                                  { clrErr(fieldEmail, errEmail); }

  if (!p)            { setErr(fieldPassword, errPassword, 'Password is required.'); ok = false; }
  else if (p.length < 8) { setErr(fieldPassword, errPassword, 'Password must be at least 8 characters.'); ok = false; }
  else               { clrErr(fieldPassword, errPassword); }

  if (!c)      { setErr(fieldConfirm, errConfirm, 'Please confirm your password.'); ok = false; }
  else if (c !== p) { setErr(fieldConfirm, errConfirm, 'Passwords do not match.'); ok = false; }
  else         { clrErr(fieldConfirm, errConfirm); }

  return ok;
}

// ════════════════════════════════════════════════════════════
// REGISTER SUBMIT
// ════════════════════════════════════════════════════════════

async function handleRegister(e) {
  e.preventDefault();
  clrGlobalError();
  if (!validate()) return;
  setBtnLoading(true);
  try {
    await registerUser({
      username: usernameInput.value.trim(),
      email:    emailInput.value.trim(),
      password: passwordInput.value,
    });
    // dashboard.js's onAuthStateChanged handles the transition
  } catch (err) {
    setBtnLoading(false);
    if (err.message === 'username-taken') setErr(fieldUsername, errUsername, 'Username is already taken.');
    else showGlobalError(getFriendlyError(err.code));
  }
}

// ════════════════════════════════════════════════════════════
// BUTTON HELPERS
// ════════════════════════════════════════════════════════════

function setBtnLoading(yes) {
  btn.disabled = yes;
  if (yes) { btnLabel.textContent = 'CREATING…'; btnSpinner.removeAttribute('hidden'); }
  else     { btnLabel.textContent = 'CREATE ACCOUNT'; btnSpinner.setAttribute('hidden', ''); }
}

function triggerRipple(e) {
  btnRipple.classList.remove('animating');
  const rect = btn.getBoundingClientRect(), size = Math.max(rect.width, rect.height);
  btnRipple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;`;
  void btnRipple.offsetWidth;
  btnRipple.classList.add('animating');
}

// ════════════════════════════════════════════════════════════
// NAVIGATION  —  tell login.js to switch the panel
// ════════════════════════════════════════════════════════════

function goBackToLogin(e) {
  e.preventDefault();
  // Reset form state
  form.reset();
  clrGlobalError();
  [fieldUsername, fieldEmail, fieldPassword, fieldConfirm].forEach(f => f.classList.remove('has-error'));
  [errUsername, errEmail, errPassword, errConfirm].forEach(el => el.textContent = '');
  strengthWrap.style.opacity = '0';
  setIcon('');
  // Signal login.js to reverse the transition
  window.dispatchEvent(new CustomEvent('auth:to-login'));
}

// ════════════════════════════════════════════════════════════
// EVENT BINDINGS
// ════════════════════════════════════════════════════════════

usernameInput.addEventListener('input', () => {
  clrErr(fieldUsername, errUsername); clrGlobalError();
  clearTimeout(usernameTimer);
  const v = usernameInput.value.trim();
  if (v.length >= 3) usernameTimer = setTimeout(() => checkUsername(v), 550);
  else setIcon('');
});

emailInput.addEventListener('input',    () => { clrErr(fieldEmail, errEmail); clrGlobalError(); });
passwordInput.addEventListener('input', () => {
  clrErr(fieldPassword, errPassword); clrGlobalError();
  updateStrengthMeter(passwordInput.value);
  if (confirmInput.value) {
    if (confirmInput.value !== passwordInput.value) setErr(fieldConfirm, errConfirm, 'Passwords do not match.');
    else clrErr(fieldConfirm, errConfirm);
  }
});
confirmInput.addEventListener('input', () => {
  if (confirmInput.value !== passwordInput.value) setErr(fieldConfirm, errConfirm, 'Passwords do not match.');
  else clrErr(fieldConfirm, errConfirm);
});

form.addEventListener('submit',     handleRegister);
btn.addEventListener('pointerdown', triggerRipple);
goLogin.addEventListener('click',   goBackToLogin);

regTogglePass.addEventListener('click', () => {
  const h = passwordInput.type === 'password';
  passwordInput.type = h ? 'text' : 'password';
  regEyeShow.hidden = h;
  regEyeHide.hidden = !h;
  regTogglePass.setAttribute('aria-label', h ? 'Hide password' : 'Show password');
});

regCard.addEventListener('mousemove', e => {
  const rect = regCard.getBoundingClientRect();
  const rx = ((e.clientY - rect.top  - rect.height / 2) / rect.height) * -3.5;
  const ry = ((e.clientX - rect.left - rect.width  / 2) / rect.width)  *  3.5;
  regCard.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(4px)`;
});
regCard.addEventListener('mouseleave', () => { regCard.style.transform = ''; });

