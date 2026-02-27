/**
 * js/user-profile-modal.js
 * View another user's public profile in a modal overlay.
 *
 * Public API:
 *   window.openUserProfile(uid)  — open the modal for the given uid
 *
 * Shows: avatar, username, role badge, bio, joined date,
 *        online status, mutual friends count, add-friend / message buttons.
 */

import { auth, db } from './auth.js';
import {
  ref, get,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';

const COLOR_MAP = {
  cyan:'#00d4ff', purple:'#a855f7', green:'#44dd88',
  gold:'#f5a623', red:'#ff4d6a',   white:'#e8ecf8',
};
const _col = id => COLOR_MAP[id] ?? '#00d4ff';
const _esc = s  => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

let _myUid = null;

window.addEventListener('dashboard:user-ready', ({ detail: { user } }) => {
  _myUid = user.uid;
  _bindClose();
});

// ── Open ──────────────────────────────────────────────────────────
window.openUserProfile = async function(uid) {
  if (!uid) return;
  const modal  = document.getElementById('upm-modal');
  const loader = document.getElementById('upm-loading');
  const body   = document.getElementById('upm-body');
  if (!modal) return;

  // Show modal in loading state
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('upm-modal--in'));
  if (loader) loader.hidden = false;
  if (body)   body.hidden   = true;

  try {
    // Fetch all public data in parallel
    const [nameSnap, colSnap, photoSnap, roleSnap, bioSnap, joinedSnap,
           presSnap, myFrSnap] = await Promise.all([
      get(ref(db, `users/${uid}/username`)),
      get(ref(db, `users/${uid}/avatarColor`)),
      get(ref(db, `users/${uid}/avatarPhoto`)),
      get(ref(db, `users/${uid}/role`)),
      get(ref(db, `users/${uid}/bio`)),
      get(ref(db, `users/${uid}/createdAt`)),
      get(ref(db, `presence/${uid}`)),
      _myUid ? get(ref(db, `friends/${_myUid}`)) : Promise.resolve(null),
    ]);

    const username   = nameSnap.val()   ?? 'Unknown';
    const color      = colSnap.val()    ?? 'cyan';
    const photo      = photoSnap.val()  ?? null;
    const role       = roleSnap.val()   ?? 'USER';
    const bio        = bioSnap.val()    ?? '';
    const createdAt  = joinedSnap.val() ?? null;
    const presence   = presSnap.val()   ?? null;
    const myFriends  = myFrSnap?.val()  ?? {};

    const isOnline    = presence?.status === 'online';
    const isAway      = presence?.status === 'away';
    const isDND       = presence?.status === 'dnd';
    const isInvisible = presence?.status === 'invisible';
    const statusLabel = isInvisible ? 'Offline'
                      : isDND      ? '⛔ Do Not Disturb'
                      : isAway     ? '🌙 Away'
                      : isOnline   ? '🟢 Online'
                      : '⚫ Offline';
    const statusColor = isDND      ? '#ff4d6a'
                      : isAway     ? '#f5a623'
                      : isOnline   ? '#44dd88'
                      : '#4a5060';

    const hex         = _col(color);
    const isFriend    = !!myFriends[uid];
    const isSelf      = uid === _myUid;

    // Joined date
    const joinedStr = createdAt
      ? new Date(createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
      : 'Unknown';

    // Role badge
    const roleColors = {
      OWNER: { bg:'rgba(245,166,35,0.15)',color:'#f5a623',border:'rgba(245,166,35,0.35)' },
      ADMIN: { bg:'rgba(168,85,247,0.15)',color:'#a855f7',border:'rgba(168,85,247,0.35)' },
      MOD  : { bg:'rgba(68,221,136,0.12)',color:'#44dd88',border:'rgba(68,221,136,0.28)' },
      USER : { bg:'rgba(0,212,255,0.08)', color:'#00d4ff',border:'rgba(0,212,255,0.18)' },
    };
    const rc = roleColors[role.toUpperCase()] ?? roleColors.USER;
    const roleHTML = `<span class="upm-role" style="background:${rc.bg};color:${rc.color};border-color:${rc.border}">${_esc(role)}</span>`;

    // Avatar
    const avatarHTML = photo
      ? `<div class="upm-avatar" style="--upm-col:${hex}"><img src="${_esc(photo)}" alt="" class="upm-avatar-img"></div>`
      : `<div class="upm-avatar" style="--upm-col:${hex}">${_esc(username[0]?.toUpperCase() ?? '?')}</div>`;

    // Action buttons
    let actionsHTML = '';
    if (!isSelf) {
      actionsHTML = `
        <button class="upm-btn upm-btn--msg" onclick="window._upmMessage('${uid}','${_esc(username)}')">
          💬 Message
        </button>
        ${isFriend
          ? `<button class="upm-btn upm-btn--friend upm-btn--friend-remove" onclick="window._ghFrRemove('${uid}')">Remove Friend</button>`
          : `<button class="upm-btn upm-btn--friend" onclick="window._upmAddFriend('${uid}','${_esc(username)}')">Add Friend</button>`
        }`;
    }

    if (loader) loader.hidden = true;
    if (body) {
      body.hidden = false;
      body.innerHTML = `
        <div class="upm-header">
          <div class="upm-av-wrap">
            ${avatarHTML}
            <span class="upm-status-dot" style="background:${statusColor}"></span>
          </div>
          <div class="upm-name-row">
            <h2 class="upm-username">${_esc(username)}</h2>
            ${roleHTML}
          </div>
          <div class="upm-status-str" style="color:${statusColor}">${statusLabel}</div>
        </div>

        ${bio ? `<p class="upm-bio">${_esc(bio)}</p>` : ''}

        <div class="upm-stats">
          <div class="upm-stat">
            <span class="upm-stat-val">${joinedStr}</span>
            <span class="upm-stat-lbl">Member since</span>
          </div>
        </div>

        ${actionsHTML ? `<div class="upm-actions">${actionsHTML}</div>` : ''}
      `;
    }
  } catch (e) {
    console.error('[upm]', e);
    if (body) { body.hidden = false; body.innerHTML = `<p class="upm-error">Could not load profile.</p>`; }
    if (loader) loader.hidden = true;
  }
};

// ── Close ─────────────────────────────────────────────────────────
function _bindClose() {
  document.getElementById('upm-close')?.addEventListener('click', _close);
  // Close when clicking the overlay bg (not the card itself)
  document.getElementById('upm-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('upm-modal') ||
        e.target === document.getElementById('upm-backdrop')) {
      _close();
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') _close(); });
}

function _close() {
  const modal = document.getElementById('upm-modal');
  if (!modal) return;
  modal.classList.remove('upm-modal--in');
  setTimeout(() => { modal.hidden = true; }, 250);
}

// ── Action helpers ────────────────────────────────────────────────
window._upmMessage = (uid, name) => {
  _close();
  document.querySelector('[data-section="messages"]')?.click();
  window.dispatchEvent(new CustomEvent('messages:open', { detail: { peerUid: uid, peerName: name } }));
};

window._upmAddFriend = async (uid, username) => {
  // Dispatch a synthetic friend search
  const inp = document.getElementById('fr-search');
  if (inp) {
    inp.value = username;
    document.querySelector('[data-section="friends"]')?.click();
    document.getElementById('fr-add-btn')?.click();
  }
  _close();
};
