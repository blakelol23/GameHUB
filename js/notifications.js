/**
 * js/notifications.js
 * Global notification system.
 *
 * Responsibilities:
 *   - Toast pop-ups (bottom-right, auto-dismiss)
 *   - Bell badge (unread count) synced from /notifications/{uid}
 *   - Notification panel (click bell → slide in)
 *   - DND check: message toasts silenced when user is DND/Invisible
 *   - Persists unread notifications to Firebase
 *
 * RTDB model:
 *   /notifications/{uid}/{notifId} = {
 *     type: 'friend_request'|'friend_accept'|'message'|'info'|'alert',
 *     fromUid, fromName, fromAvatar, body, ts, read: false
 *   }
 *
 * Usage:
 *   import { notify } from './notifications.js';
 *   notify.show({ type:'friend_request', title:'New friend request', body:'blake wants to be your friend', fromUid, fromName });
 *   notify.showLocal({ type:'success', title:'Saved!', body:'Your profile was updated.' }); // no DB write
 */

import { auth, db } from './auth.js';
import {
  ref, push, get, update, onValue, query,
  orderByChild, limitToLast,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';

// ── Constants ────────────────────────────────────────────────────
const TOAST_DURATION   = 5000;
const MAX_TOASTS       = 4;
const PANEL_PAGE_SIZE  = 30;

// ── State ────────────────────────────────────────────────────────
let _uid       = null;
let _unsubNots = null;
let _presence  = 'online';   // updated by presence system
let _panelOpen = false;

// ── Expose the presence setting so dashboard.js can update it ───
export function setNotifyPresence(status) {
  _presence = status ?? 'online';
}

// ── Init from dashboard:user-ready ───────────────────────────────
window.addEventListener('dashboard:user-ready', ({ detail: { user } }) => {
  _uid = user.uid;
  _startBellListener();
  _bindBell();
});

window.addEventListener('dashboard:logout', () => {
  _uid = null;
  _unsubNots?.(); _unsubNots = null;
  _presence = 'online';
  _closePanel();
  _clearBadge();
});

// ── Bell badge listener ──────────────────────────────────────────
function _startBellListener() {
  _unsubNots?.();
  _unsubNots = onValue(
    query(ref(db, `notifications/${_uid}`), orderByChild('ts'), limitToLast(PANEL_PAGE_SIZE)),
    snap => {
      if (!snap.exists()) { _clearBadge(); return; }
      let unread = 0;
      snap.forEach(c => { if (!c.val().read) unread++; });
      _setBadge(unread);
      if (_panelOpen) _renderPanel(snap);
    }
  );
}

// ── Bell DOM ─────────────────────────────────────────────────────
function _bindBell() {
  const bellBtn = document.getElementById('notif-bell-btn');
  if (!bellBtn) return;
  bellBtn.addEventListener('click', e => {
    e.stopPropagation();
    _panelOpen ? _closePanel() : _openPanel();
  });
  document.addEventListener('click', e => {
    if (_panelOpen && !e.target.closest('#notif-panel') && !e.target.closest('#notif-bell-btn')) {
      _closePanel();
    }
  });
}

function _setBadge(n) {
  const badge = document.getElementById('notif-bell-badge');
  if (!badge) return;
  badge.textContent = n > 99 ? '99+' : String(n);
  badge.hidden = n === 0;
}

function _clearBadge() { _setBadge(0); }

// ── Notification panel ───────────────────────────────────────────
async function _openPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  _panelOpen = true;
  panel.hidden = false;
  panel.classList.add('notif-panel--in');

  // Fetch and render
  try {
    const snap = await get(
      query(ref(db, `notifications/${_uid}`), orderByChild('ts'), limitToLast(PANEL_PAGE_SIZE))
    );
    _renderPanel(snap);
  } catch (_e) {}
}

function _closePanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  _panelOpen = false;
  panel.classList.remove('notif-panel--in');
  panel.hidden = true;
}

function _renderPanel(snap) {
  const list = document.getElementById('notif-panel-list');
  if (!list) return;
  if (!snap.exists()) {
    list.innerHTML = `<div class="notif-panel-empty">No notifications yet.</div>`;
    return;
  }
  const items = [];
  snap.forEach(c => items.push({ id: c.key, ...c.val() }));
  items.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  list.innerHTML = items.map(n => {
    const icon = _typeIcon(n.type);
    const time = _timeAgo(n.ts);
    return `<div class="notif-item${n.read ? '' : ' notif-item--unread'}" data-id="${n.id}">
      <span class="notif-item-icon notif-item-icon--${n.type ?? 'info'}">${icon}</span>
      <div class="notif-item-body">
        <div class="notif-item-title">${_esc(n.title ?? n.type ?? 'Notification')}</div>
        <div class="notif-item-text">${_esc(n.body ?? '')}</div>
        <div class="notif-item-time">${time}</div>
      </div>
    </div>`;
  }).join('');

  // Mark all as read
  const unreadIds = items.filter(n => !n.read).map(n => n.id);
  if (unreadIds.length && _uid) {
    const updates = {};
    unreadIds.forEach(id => { updates[`notifications/${_uid}/${id}/read`] = true; });
    update(ref(db), updates).catch(() => {});
  }
}

function _typeIcon(type) {
  const icons = {
    friend_request: '👤',
    friend_accept : '✓',
    message       : '💬',
    alert         : '⚠',
    info          : 'ℹ',
    success       : '✓',
    error         : '✕',
  };
  return icons[type] ?? 'ℹ';
}

// ── Public: write to DB + show toast ────────────────────────────
/**
 * Show a notification that persists to the DB and shows a toast.
 * @param {{ type, title, body, fromUid?, fromName?, targetUid? }} opts
 *   targetUid: whose notifications node to write to (defaults to _uid)
 */
export async function notify(opts) {
  const { type, title, body, fromUid, fromName, targetUid } = opts;
  const tid = targetUid ?? _uid;
  if (!tid) return;

  const payload = {
    type     : type   ?? 'info',
    title    : title  ?? '',
    body     : body   ?? '',
    fromUid  : fromUid  ?? null,
    fromName : fromName ?? null,
    ts       : Date.now(),
    read     : false,
  };

  try {
    await push(ref(db, `notifications/${tid}`), payload);
  } catch (_e) {}

  // Only show toast for MY notifications
  if (tid === _uid) {
    _showToast({ type, title, body, fromUid, fromName });
  }
}

/**
 * Show a local-only toast (no DB write — for immediate feed back like "Saved!").
 */
export function notifyLocal(opts) {
  _showToast(opts);
}

// ── Toast ────────────────────────────────────────────────────────
function _showToast({ type = 'info', title = '', body = '' } = {}) {
  // DND / Invisible: suppress message toasts
  if ((type === 'message') && (_presence === 'dnd' || _presence === 'invisible')) return;

  const container = document.getElementById('toast-container');
  if (!container) return;

  // Limit visible toasts
  const existing = container.querySelectorAll('.toast');
  if (existing.length >= MAX_TOASTS) existing[0].remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${_typeIcon(type)}</span>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${_esc(title)}</div>` : ''}
      ${body  ? `<div class="toast-body">${_esc(body)}</div>`   : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss">✕</button>`;

  toast.querySelector('.toast-close').addEventListener('click', () => _dismissToast(toast));

  container.appendChild(toast);
  // Animate in
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast--visible')));

  // Auto-dismiss
  const timer = setTimeout(() => _dismissToast(toast), TOAST_DURATION);
  toast._timer = timer;
}

function _dismissToast(toast) {
  clearTimeout(toast._timer);
  toast.classList.remove('toast--visible');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}

// ── Panel clear button ────────────────────────────────────────────
document.addEventListener('click', e => {
  if (e.target?.closest('#notif-clear-btn') && _uid) {
    update(ref(db, `notifications/${_uid}`), { _cleared: Date.now() })
      .then(() => {
        const list = document.getElementById('notif-panel-list');
        if (list) list.innerHTML = `<div class="notif-panel-empty">No notifications yet.</div>`;
        _clearBadge();
      }).catch(() => {});
  }
});

// ── Helpers ───────────────────────────────────────────────────────
function _esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _timeAgo(ts) {
  if (!ts) return '';
  const d = Date.now() - ts;
  if (d < 60e3)    return 'just now';
  if (d < 3600e3)  return `${Math.floor(d / 60e3)}m ago`;
  if (d < 86400e3) return `${Math.floor(d / 3600e3)}h ago`;
  return new Date(ts).toLocaleDateString();
}
