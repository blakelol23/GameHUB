/**
 * js/achievements.js — GameHUB Achievement System
 *
 * RTDB model:
 *   /achievements/{uid}/{achId} = { unlockedAt: <ms>, seen: false }
 *
 * How to trigger checks from other modules:
 *   window.dispatchEvent(new CustomEvent('achievements:check', { detail: { id: 'first_friend' } }));
 *   // or:
 *   window.checkAchievement?.('profile_bio');
 *
 * Checked automatically:
 *   first_login  — on dashboard:user-ready
 *   veteran      — on dashboard:user-ready if createdAt >= 30 days ago
 */

import { db }   from './auth.js';
import { ref, get, set, onValue }
  from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';

// ── Achievement definitions ───────────────────────────────────────
export const ACH_DEFS = [
  {
    id: 'first_login',   name: 'Boot Sequence',
    icon: '🚀', rare: false,
    desc: 'Log into GameHUB for the first time.',
  },
  {
    id: 'profile_bio',   name: 'Bio Set',
    icon: '✏️',  rare: false,
    desc: 'Write a profile bio.',
  },
  {
    id: 'avatar_upload', name: 'Face the Camera',
    icon: '📸', rare: false,
    desc: 'Upload a custom avatar photo.',
  },
  {
    id: 'first_friend',  name: 'First Connection',
    icon: '🤝', rare: false,
    desc: 'Add your first friend.',
  },
  {
    id: 'five_friends',  name: 'Social Butterfly',
    icon: '🦋', rare: false,
    desc: 'Have 5 or more friends.',
  },
  {
    id: 'first_message', name: 'First Transmission',
    icon: '📡', rare: false,
    desc: 'Send your first message.',
  },
  {
    id: 'fifty_messages', name: 'Chatterbox',
    icon: '💬', rare: false,
    desc: 'Send 50 messages.',
  },
  {
    id: 'game_sudoku',   name: 'Sudoku Savant',
    icon: '🧩', rare: false,
    desc: 'Play AI Sudoku.',
  },
  {
    id: 'game_blockie',  name: 'Tower Commander',
    icon: '🗼', rare: false,
    desc: 'Play Blockie Tower Defense.',
  },
  {
    id: 'game_quiz',     name: 'Quiz Kid',
    icon: '🎓', rare: false,
    desc: 'Play AI Quiz Generator.',
  },
  {
    id: 'all_games',     name: 'Full Roster',
    icon: '🏆', rare: true,
    desc: 'Play all 3 current games.',
  },
  {
    id: 'veteran',       name: 'Veteran',
    icon: '⭐', rare: true,
    desc: 'Be a member for 30 days.',
  },
];

// ── State ─────────────────────────────────────────────────────────
let _uid       = null;
let _unlocked  = {};    // { achId: { unlockedAt, seen } }
let _unsub     = null;
let _createdAt = 0;

// ── Lifecycle ─────────────────────────────────────────────────────
window.addEventListener('dashboard:user-ready', ({ detail: { user, profile } }) => {
  _uid       = user.uid;
  _createdAt = profile?.createdAt ?? Date.now();
  _startListener();

  // Auto-checks
  _award('first_login');
  if ((Date.now() - _createdAt) / 86_400_000 >= 30) _award('veteran');
});

window.addEventListener('dashboard:logout', () => {
  _uid      = null;
  _unlocked = {};
  _unsub?.(); _unsub = null;
  _renderGrid();
});

// ── Live achievements listener (drives the profile grid) ──────────
function _startListener() {
  _unsub?.();
  _unsub = onValue(ref(db, `achievements/${_uid}`), snap => {
    _unlocked = snap.exists() ? snap.val() : {};
    _renderGrid();
  });
}

// ── Public trigger API ────────────────────────────────────────────
window.addEventListener('achievements:check', ({ detail: { id } }) => {
  if (_uid) _award(id);
});

/** Expose globally so any module can call window.checkAchievement('id') */
window.checkAchievement = (id) => { if (_uid) _award(id); };

// ── Internal award logic ──────────────────────────────────────────
async function _award(id) {
  if (!_uid || _unlocked[id]) return;   // already earned
  try {
    await set(ref(db, `achievements/${_uid}/${id}`), {
      unlockedAt : Date.now(),
      seen       : false,
    });
    _showUnlockToast(id);
  } catch (_e) {
    // Silently fail — doesn't block the user
  }
}

// ── Unlock toast ──────────────────────────────────────────────────
function _showUnlockToast(id) {
  const def = ACH_DEFS.find(a => a.id === id);
  if (!def) return;
  const c = document.getElementById('toast-container');
  if (!c) return;

  const el = document.createElement('div');
  el.className = 'toast toast--achievement';
  el.innerHTML = `
    <span class="toast-icon">${def.icon}</span>
    <div class="toast-content">
      <div class="toast-title">Achievement Unlocked!</div>
      <div class="toast-body">${_esc(def.name)}</div>
    </div>
    <button class="toast-close" aria-label="Dismiss">✕</button>`;

  el.querySelector('.toast-close').addEventListener('click', () => _dismissToast(el));
  c.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('toast--visible')));
  setTimeout(() => _dismissToast(el), 6000);
}

function _dismissToast(el) {
  el.classList.remove('toast--visible');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
}

// ── Profile grid renderer ─────────────────────────────────────────
function _renderGrid() {
  const grid = document.getElementById('ach-grid');
  if (!grid) return;

  if (!_uid) { grid.innerHTML = ''; return; }

  const unlockedCount = Object.keys(_unlocked).length;
  const total         = ACH_DEFS.length;

  // Update counter
  const ctr = document.getElementById('ach-count');
  if (ctr) ctr.textContent = `${unlockedCount} / ${total}`;

  grid.innerHTML = ACH_DEFS.map(def => {
    const u      = _unlocked[def.id];
    const locked = !u;
    const dateStr = u
      ? new Date(u.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Locked';
    return `
      <div class="ach-badge${locked ? ' ach-badge--locked' : ' ach-badge--earned'}${def.rare ? ' ach-badge--rare' : ''}"
           role="figure"
           aria-label="${_esc(def.name)}${locked ? ' (locked)' : ' — earned ' + dateStr}"
           title="${_esc(def.desc)}">
        <span class="ach-badge-icon" aria-hidden="true">${def.icon}</span>
        <span class="ach-badge-name">${_esc(def.name)}</span>
        <span class="ach-badge-date">${locked ? 'Locked' : _esc(dateStr)}</span>
        ${def.rare && !locked ? '<span class="ach-badge-rare-pip" aria-hidden="true">RARE</span>' : ''}
      </div>`;
  }).join('');
}

function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
