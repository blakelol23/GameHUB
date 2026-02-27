/**
 * js/profile/profile.js
 * Handles all profile-editing functionality:
 *   - Bio editing + save to RTDB
 *   - Avatar colour picker (6 accent presets)
 *   - Online status selector (Online / Away / Invisible)
 *   - Role badge display (read from RTDB, never editable client-side)
 */

import { auth, db }         from '../auth.js';
import { ref, get, update } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';
import { setNotifyPresence } from '../notifications.js';

// ── Colour presets ─────────────────────────────────────────────
const AVATAR_COLORS = [
  { id:'cyan',   val:'#00d4ff', label:'Cyan'   },
  { id:'purple', val:'#7b2df8', label:'Purple' },
  { id:'green',  val:'#44dd88', label:'Green'  },
  { id:'gold',   val:'#f5a623', label:'Gold'   },
  { id:'red',    val:'#ff4d6a', label:'Red'    },
  { id:'white',  val:'#e8ecf8', label:'White'  },
];

const STATUS_OPTS = [
  { id:'online',    label:'Online',         color:'#44dd88' },
  { id:'away',      label:'Away',           color:'#f5a623' },
  { id:'dnd',       label:'Do Not Disturb', color:'#ff4d6a' },
  { id:'invisible', label:'Invisible',      color:'#7a8090' },
];

const ROLE_LABELS = {
  owner:  { label:'Owner',     bg:'rgba(255,77,106,.12)',   border:'rgba(255,77,106,.3)',  color:'#ff4d6a' },
  admin:  { label:'Admin',     bg:'rgba(245,166,35,.12)',   border:'rgba(245,166,35,.35)', color:'#f5a623' },
  tester: { label:'Tester',    bg:'rgba(68,221,136,.10)',   border:'rgba(68,221,136,.3)',  color:'#44dd88' },
  mod:    { label:'Moderator', bg:'rgba(123,45,248,.12)',   border:'rgba(123,45,248,.35)', color:'#a855f7' },
  user:   { label:'Player',    bg:'rgba(0,212,255,.08)',    border:'rgba(0,212,255,.2)',   color:'#00d4ff' },
};

// ── DOM helpers ────────────────────────────────────────────────
const el = id => document.getElementById(id);

// ── Module state ───────────────────────────────────────────────
let _uid         = null;
let _profile     = null;
let _saveTimeout = null;

// ── Init: called when dashboard:user-ready fires ───────────────
window.addEventListener('dashboard:user-ready', async ({ detail: { user, profile } }) => {
  _uid     = user.uid;
  _profile = profile ?? {};
  _renderColorPicker();
  _renderStatusPicker();
  _applyProfile();
  _bindEditing();
  _bindAvatarUpload();
  // Load role from /roles/{uid} (Firebase Console-controlled, client read-only)
  try {
    const roleSnap = await get(ref(db, `roles/${user.uid}`));
    const role = roleSnap.exists() ? (roleSnap.val()?.role ?? roleSnap.val()) : (_profile.role ?? 'user');
    _applyRole(role);
    window.__userRole = role;
  } catch (_) {
    _applyRole(_profile.role ?? 'user');
  }
});

// ── Apply loaded profile data to UI ───────────────────────────
function _applyProfile() {
  const avatar     = el('profile-avatar-letter');
  const bioDisplay = el('profile-bio-display');
  const bioInput   = el('profile-bio-input');
  const statusDot  = el('profile-status-dot');

  const displayName = _profile.username ?? 'Operator';
  if (avatar) {
    avatar.textContent = displayName[0].toUpperCase();
    // Photo overrides letter
    if (_profile.avatarPhoto) {
      _applyAvatarPhoto(_profile.avatarPhoto, avatar);
    } else {
      _setColorPickerDisabled(false);
    }
  }

  // Avatar colour
  const col = (_profile.avatarColor) ? AVATAR_COLORS.find(c => c.id === _profile.avatarColor) : AVATAR_COLORS[0];
  _applyAvatarColor(col?.val ?? '#00d4ff');

  // Bio
  const bio = _profile.bio ?? '';
  if (bioDisplay) bioDisplay.textContent = bio || 'No bio set yet.';
  if (bioInput)   bioInput.value = bio;

  // Status
  const st   = _profile.status ?? 'online';
  const stOpt = STATUS_OPTS.find(s => s.id === st) ?? STATUS_OPTS[0];
  if (statusDot) {
    statusDot.style.background = stOpt.color;
    statusDot.style.boxShadow  = `0 0 6px ${stOpt.color}88`;
    statusDot.title            = stOpt.label;
  }
  const statusSelectEl = el('profile-status-select');
  if (statusSelectEl) statusSelectEl.value = st;

  // Highlight active colour swatch
  document.querySelectorAll('.profile-color-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.colorId === (_profile.avatarColor ?? 'cyan'));
  });
}

// ── Role badge ─────────────────────────────────────────────────
function _applyRole(role) {
  const badge = el('profile-role-badge');
  if (!badge) return;
  const r = ROLE_LABELS[role] ?? ROLE_LABELS.user;
  badge.textContent           = r.label;
  badge.style.background      = r.bg;
  badge.style.borderColor     = r.border;
  badge.style.color           = r.color;
  // Expose role to window so other modules can check it
  window.__userRole = role;
}

// ── Colour picker ──────────────────────────────────────────────
function _renderColorPicker() {
  const wrap = el('profile-color-picker');
  if (!wrap) return;
  wrap.innerHTML = AVATAR_COLORS.map(c => `
    <button class="profile-color-swatch${c.id === (_profile?.avatarColor ?? 'cyan') ? ' active' : ''}"
            data-color-id="${c.id}" data-color-val="${c.val}"
            aria-label="${c.label}" title="${c.label}"
            style="--swatch-col:${c.val}"></button>
  `).join('');
  wrap.querySelectorAll('.profile-color-swatch').forEach(sw => {
    sw.addEventListener('click', () => _pickColor(sw.dataset.colorId, sw.dataset.colorVal));
  });
}

function _applyAvatarColor(hex) {
  const avatar = el('profile-avatar-letter');
  if (!avatar) return;
  avatar.style.color      = hex;
  avatar.style.borderColor= hex + '55';
  avatar.style.textShadow = `0 0 16px ${hex}88`;
  avatar.style.boxShadow  = `0 0 24px ${hex}22, inset 0 0 20px ${hex}0d`;
}

function _applyAvatarPhoto(base64, avatarEl) {
  const avatar = avatarEl ?? el('profile-avatar-letter');
  if (!avatar) return;
  avatar.style.backgroundImage    = `url(${base64})`;
  avatar.style.backgroundSize     = 'cover';
  avatar.style.backgroundPosition = 'center';
  avatar.style.color              = 'transparent';
  avatar.style.textShadow         = 'none';
  _setColorPickerDisabled(true);
}

function _setColorPickerDisabled(disabled) {
  const wrap = el('profile-color-picker');
  if (!wrap) return;
  wrap.style.opacity       = disabled ? '0.3' : '1';
  wrap.style.pointerEvents = disabled ? 'none' : '';
  wrap.title = disabled ? 'Remove your profile photo to change avatar colour' : '';
  // Also update the label if it exists
  const label = el('profile-color-picker-label');
  if (label) label.style.opacity = disabled ? '0.4' : '1';
}

// ── Avatar photo upload with crop modal ───────────────────────
function _bindAvatarUpload() {
  const avatarEl  = el('profile-avatar-letter');
  const fileInput = el('avatar-file-input');
  if (!avatarEl || !fileInput) return;

  avatarEl.style.cursor = 'pointer';
  avatarEl.title        = 'Click to change avatar photo';
  avatarEl.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => _openCropModal(e.target.result);
    reader.readAsDataURL(file);
    fileInput.value = '';
  });
}

let _cropImg = null, _cropOffX = 0, _cropOffY = 0, _cropScale = 1,
    _cropDrag = false, _cropDragOX = 0, _cropDragOY = 0;

function _openCropModal(src) {
  const modal   = el('avatar-crop-modal');
  const canvas  = el('avatar-crop-canvas');
  if (!modal || !canvas) return;

  _cropScale = 1; _cropOffX = 0; _cropOffY = 0;
  modal.hidden = false;

  const img = new Image();
  img.onload = () => {
    _cropImg = img;
    // Center image
    const minDim = Math.min(img.width, img.height);
    _cropScale = canvas.width / minDim;
    _cropOffX  = (canvas.width  - img.width  * _cropScale) / 2;
    _cropOffY  = (canvas.height - img.height * _cropScale) / 2;
    _cropDraw();
  };
  img.src = src;

  // ── Drag
  canvas.onmousedown = e => { _cropDrag = true; _cropDragOX = e.clientX - _cropOffX; _cropDragOY = e.clientY - _cropOffY; };
  window.onmousemove = e => { if (!_cropDrag) return; _cropOffX = e.clientX - _cropDragOX; _cropOffY = e.clientY - _cropDragOY; _cropDraw(); };
  window.onmouseup   = () => { _cropDrag = false; };

  // ── Pinch / wheel zoom (passive:false required to preventDefault)
  canvas.removeEventListener('wheel', canvas._wheelHandler);
  canvas._wheelHandler = e => {
    e.preventDefault();
    _cropScale = Math.min(8, Math.max(0.2, _cropScale * (e.deltaY < 0 ? 1.08 : 0.93)));
    _cropDraw();
  };
  canvas.addEventListener('wheel', canvas._wheelHandler, { passive: false });

  // ── Zoom slider
  const slider = el('crop-zoom-slider');
  if (slider) {
    slider.value = 50;
    slider.oninput = () => {
      _cropScale = 0.2 + (parseFloat(slider.value) / 100) * 7.8;
      _cropDraw();
    };
  }
}

function _cropDraw() {
  const canvas = el('avatar-crop-canvas');
  if (!canvas || !_cropImg) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(_cropImg, _cropOffX, _cropOffY, _cropImg.width * _cropScale, _cropImg.height * _cropScale);

  // Darken outside circle
  const cx = canvas.width / 2, cy = canvas.height / 2, r = (canvas.width / 2) - 4;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.restore();

  // Circle border
  ctx.strokeStyle = 'rgba(0,212,255,0.35)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function _getCroppedBase64() {
  const canvas = el('avatar-crop-canvas');
  if (!canvas || !_cropImg) return null;
  const SIZE = 160;
  const out  = document.createElement('canvas');
  out.width  = SIZE; out.height = SIZE;
  const ctx  = out.getContext('2d');
  const r    = (canvas.width / 2) - 4;
  const cx   = canvas.width  / 2;
  const cy   = canvas.height / 2;

  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  ctx.clip();

  // Scale source canvas crop-circle to output
  const sx = cx - r, sy = cy - r, sw = r * 2, sh = r * 2;
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, SIZE, SIZE);
  return out.toDataURL('image/jpeg', 0.78);
}

window._gh_cropSave = async function () {
  const base64 = _getCroppedBase64();
  if (!base64 || !_uid) return;
  el('avatar-crop-modal').hidden = true;
  try {
    await update(ref(db, `users/${_uid}`), { avatarPhoto: base64 });
    _applyAvatarPhoto(base64);
  } catch (e) { console.error('Avatar save failed', e); }
};

window._gh_cropCancel = function () {
  const m = el('avatar-crop-modal');
  if (m) m.hidden = true;
  window.onmousemove = null; window.onmouseup = null;
};

window._gh_cropRemove = async function () {
  if (!_uid) return;
  el('avatar-crop-modal').hidden = true;
  try {
    await update(ref(db, `users/${_uid}`), { avatarPhoto: null });
    const avatar = el('profile-avatar-letter');
    if (avatar) {
      avatar.style.backgroundImage = '';
      avatar.style.color = '';
      avatar.style.textShadow = '';
    }
    _setColorPickerDisabled(false);
  } catch (e) { console.error('Avatar remove failed', e); }
};

async function _pickColor(colorId, hex) {
  _applyAvatarColor(hex);
  document.querySelectorAll('.profile-color-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.colorId === colorId);
  });
  if (!_uid) return;
  await update(ref(db, `users/${_uid}`), { avatarColor: colorId }).catch(() => {});
}

// ── Status picker ──────────────────────────────────────────────
function _renderStatusPicker() {
  const sel = el('profile-status-select');
  if (!sel) return;
  sel.innerHTML = STATUS_OPTS.map(s =>
    `<option value="${s.id}">${s.label}</option>`
  ).join('');
  sel.addEventListener('change', async () => {
    const chosen = STATUS_OPTS.find(s => s.id === sel.value) ?? STATUS_OPTS[0];
    const dot    = el('profile-status-dot');
    if (dot) {
      dot.style.background = chosen.color;
      dot.style.boxShadow  = `0 0 6px ${chosen.color}88`;
      dot.title            = chosen.label;
    }
    if (!_uid) return;
    await update(ref(db, `users/${_uid}`), { status: sel.value }).catch(() => {});
    // Also write to /presence so friends can see it
    await update(ref(db, `presence/${_uid}`), { status: sel.value, ts: Date.now() }).catch(() => {});
    // Update notification gating immediately
    setNotifyPresence(sel.value);
  });
}

// ── Bio editing ───────────────────────────────────────────────
function _bindEditing() {
  const bioInput   = el('profile-bio-input');
  const bioDisplay = el('profile-bio-display');
  const saveBio    = el('profile-bio-save');
  const saveStatus = el('profile-bio-save-status');
  const charCount  = el('profile-bio-chars');

  if (!bioInput) return;

  bioInput.addEventListener('input', () => {
    const len = bioInput.value.length;
    if (charCount) charCount.textContent = `${len}/160`;
    if (len > 160) bioInput.value = bioInput.value.slice(0, 160);
    // Auto-save with debounce
    clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(_saveBio, 1400);
  });

  if (saveBio) saveBio.addEventListener('click', _saveBio);

  async function _saveBio() {
    clearTimeout(_saveTimeout);
    const text = (bioInput?.value ?? '').trim().slice(0, 160);
    if (!_uid) return;
    if (saveBio) saveBio.disabled = true;
    try {
      await update(ref(db, `users/${_uid}`), { bio: text });
      if (bioDisplay) bioDisplay.textContent = text || 'No bio set yet.';
      _showSaveStatus(saveStatus, true);
    } catch (_e) {
      _showSaveStatus(saveStatus, false);
    } finally {
      if (saveBio) saveBio.disabled = false;
    }
  }
}

function _showSaveStatus(el, ok) {
  if (!el) return;
  el.textContent = ok ? '✓ Saved' : '✗ Failed';
  el.className   = `profile-save-status profile-save-status--${ok ? 'ok' : 'err'}`;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 2200);
}
