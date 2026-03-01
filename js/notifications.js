/**
 * js/notifications.js  v2
 *
 * Responsibilities:
 *   - Toast pop-ups (bottom-right, auto-dismiss, max 4)
 *   - Bell badge synced from /notifications/{uid}
 *   - Notification panel with tabs (All | Unread | Social | System)
 *   - Friend-request Accept/Decline directly from panel
 *   - Per-item dismiss (×)
 *   - Mark all read / Clear all
 *   - DND presence gate for message toasts
 *
 * RTDB model:
 *   /notifications/{uid}/{id} = {
 *     type, title, body, fromUid?, fromName?, ts, read, actioned?
 *   }
 *
 * Exports: notify(opts), notifyLocal(opts), setNotifyPresence(status)
 */

import { auth, db } from './auth.js';
import {
  ref, push, get, set, update, remove, onValue,
  query, orderByChild, limitToLast,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';

// ── Constants ─────────────────────────────────────────────────────
const TOAST_DURATION  = 5500;
const MAX_TOASTS      = 4;
const PANEL_PAGE_SIZE = 50;
const SOCIAL_TYPES    = new Set(['friend_request', 'friend_accept']);
const SYSTEM_TYPES    = new Set(['info', 'alert', 'success', 'error', 'achievement']);

// ── State ─────────────────────────────────────────────────────────
let _uid        = null;
let _unsubNots  = null;
let _presence   = 'online';
let _panelOpen  = false;
let _activeTab  = 'all';
let _tabsBound  = false;
let _actionBound = false;

// ── Public presence setter ────────────────────────────────────────
export function setNotifyPresence(status) {
  _presence = status ?? 'online';
}

// ── Lifecycle ─────────────────────────────────────────────────────
window.addEventListener('dashboard:user-ready', ({ detail: { user } }) => {
  _uid = user.uid;
  _startBellListener();
  _bindBell();
});

window.addEventListener('dashboard:logout', () => {
  _uid = null;
  _unsubNots?.(); _unsubNots = null;
  _presence  = 'online';
  _panelOpen = false;
  _tabsBound = false;
  _actionBound = false;
  _closePanel(true);
  _setBadge(0);
});

// ── Bell badge listener ───────────────────────────────────────────
function _startBellListener() {
  _unsubNots?.();
  _unsubNots = onValue(
    query(ref(db, `notifications/${_uid}`), orderByChild('ts'), limitToLast(PANEL_PAGE_SIZE)),
    snap => {
      if (!snap.exists()) { _setBadge(0); return; }
      let unread = 0;
      snap.forEach(c => { if (!c.val().read) unread++; });
      _setBadge(unread);
      if (_panelOpen) _renderPanel(snap);
    },
  );
}

// ── Bell DOM ──────────────────────────────────────────────────────
function _bindBell() {
  const bellBtn = document.getElementById('notif-bell-btn');
  if (!bellBtn || bellBtn._notifBound) return;
  bellBtn._notifBound = true;
  bellBtn.addEventListener('click', e => {
    e.stopPropagation();
    _panelOpen ? _closePanel() : _openPanel();
  });
  document.addEventListener('click', e => {
    if (_panelOpen
      && !e.target.closest('#notif-panel')
      && !e.target.closest('#notif-bell-btn')) {
      _closePanel();
    }
  });
}

function _setBadge(n) {
  const badge = document.getElementById('notif-bell-badge');
  if (!badge) return;
  badge.textContent = n > 99 ? '99+' : String(n);
  badge.hidden = n === 0;
  document.getElementById('notif-bell-btn')
    ?.classList.toggle('notif-bell--active', n > 0);
}

// ── Panel open / close ────────────────────────────────────────────
async function _openPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  _panelOpen = true;
  panel.hidden = false;
  requestAnimationFrame(() => panel.classList.add('notif-panel--in'));

  _bindPanelTabs();
  _bindPanelActions();

  try {
    const snap = await get(
      query(ref(db, `notifications/${_uid}`), orderByChild('ts'), limitToLast(PANEL_PAGE_SIZE)),
    );
    _renderPanel(snap);
  } catch (_e) {}
}

function _closePanel(immediate = false) {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  _panelOpen = false;
  panel.classList.remove('notif-panel--in');
  if (immediate) { panel.hidden = true; return; }
  panel.addEventListener('transitionend', () => { if (!_panelOpen) panel.hidden = true; }, { once: true });
}

// ── Tab bindings ──────────────────────────────────────────────────
function _bindPanelTabs() {
  if (_tabsBound) return;
  _tabsBound = true;
  document.querySelectorAll('.notif-tab[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeTab = btn.dataset.filter;
      document.querySelectorAll('.notif-tab').forEach(b => b.classList.toggle('active', b === btn));
      get(query(ref(db, `notifications/${_uid}`), orderByChild('ts'), limitToLast(PANEL_PAGE_SIZE)))
        .then(_renderPanel).catch(() => {});
    });
  });
}

// ── Panel action buttons ──────────────────────────────────────────
function _bindPanelActions() {
  if (_actionBound) return;
  _actionBound = true;

  document.getElementById('notif-read-all-btn')?.addEventListener('click', async () => {
    if (!_uid) return;
    try {
      const snap = await get(ref(db, `notifications/${_uid}`));
      if (!snap.exists()) return;
      const updates = {};
      snap.forEach(c => { if (!c.val().read) updates[`notifications/${_uid}/${c.key}/read`] = true; });
      if (Object.keys(updates).length) await update(ref(db), updates);
    } catch (_e) {}
  });

  document.getElementById('notif-clear-btn')?.addEventListener('click', async () => {
    if (!_uid) return;
    try {
      await remove(ref(db, `notifications/${_uid}`));
      const list = document.getElementById('notif-panel-list');
      if (list) list.innerHTML = _emptyHtml();
      _setBadge(0);
    } catch (_e) {}
  });
}

// ── Render notification list ──────────────────────────────────────
function _renderPanel(snap) {
  const list = document.getElementById('notif-panel-list');
  if (!list) return;

  if (!snap?.exists()) { list.innerHTML = _emptyHtml(); return; }

  let items = [];
  snap.forEach(c => items.push({ id: c.key, ...c.val() }));
  items.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  if (_activeTab === 'unread')  items = items.filter(n => !n.read);
  if (_activeTab === 'social')  items = items.filter(n => SOCIAL_TYPES.has(n.type));
  if (_activeTab === 'system')  items = items.filter(n => SYSTEM_TYPES.has(n.type));

  if (!items.length) { list.innerHTML = _emptyHtml(); return; }

  list.innerHTML = items.map(n => {
    const actionable = n.type === 'friend_request' && !n.actioned;
    return `<div class="notif-item${n.read ? '' : ' notif-item--unread'} notif-item--t-${n.type ?? 'info'}"
                 data-id="${n.id}">
      <div class="notif-item-icon-wrap" aria-hidden="true">${_svgIcon(n.type)}</div>
      <div class="notif-item-body">
        <div class="notif-item-title">${_esc(n.title ?? _defTitle(n.type))}</div>
        ${n.body ? `<div class="notif-item-text">${_esc(n.body)}</div>` : ''}
        ${actionable ? `<div class="notif-item-actions">
          <button class="notif-action-btn notif-action-btn--accept"
                  data-accept-uid="${n.fromUid ?? ''}" data-notif-id="${n.id}">Accept</button>
          <button class="notif-action-btn notif-action-btn--decline"
                  data-decline-uid="${n.fromUid ?? ''}" data-notif-id="${n.id}">Decline</button>
        </div>` : ''}
      </div>
      <div class="notif-item-meta">
        <span class="notif-item-time">${_timeAgo(n.ts)}</span>
        <button class="notif-item-dismiss" aria-label="Dismiss" data-dismiss-id="${n.id}">
          <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor"
               stroke-width="2.8" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>`;
  }).join('');

  // Bind per-item events
  list.querySelectorAll('.notif-item-dismiss').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); _dismissNotif(btn.dataset.dismissId); })
  );
  list.querySelectorAll('.notif-action-btn--accept').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); _acceptFriend(btn.dataset.acceptUid, btn.dataset.notifId); })
  );
  list.querySelectorAll('.notif-action-btn--decline').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); _declineFriend(btn.dataset.declineUid, btn.dataset.notifId); })
  );

  // Mark visible as read
  const unreadIds = items.filter(n => !n.read).map(n => n.id);
  if (unreadIds.length && _uid) {
    const updates = {};
    unreadIds.forEach(id => { updates[`notifications/${_uid}/${id}/read`] = true; });
    update(ref(db), updates).catch(() => {});
  }
}

function _emptyHtml() {
  return `<div class="notif-panel-empty">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
         stroke-width="1.5" stroke-linecap="round" opacity=".25">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    <p>No notifications</p>
  </div>`;
}

// ── Per-item dismiss ──────────────────────────────────────────────
async function _dismissNotif(id) {
  if (!id || !_uid) return;
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) { el.style.opacity = '0'; el.style.height = el.offsetHeight + 'px'; }
  try {
    await remove(ref(db, `notifications/${_uid}/${id}`));
    el?.remove();
    const list = document.getElementById('notif-panel-list');
    if (list && !list.querySelector('.notif-item')) list.innerHTML = _emptyHtml();
  } catch (_e) {
    if (el) { el.style.opacity = ''; el.style.height = ''; }
  }
}

// ── Friend request Accept / Decline ──────────────────────────────
async function _acceptFriend(fromUid, notifId) {
  if (!fromUid || !_uid) return;
  const myUid = _uid;
  try {
    await Promise.all([
      set(ref(db, `friends/${myUid}/${fromUid}`), true),
      set(ref(db, `friends/${fromUid}/${myUid}`), true),
      remove(ref(db, `friend_requests/${myUid}/${fromUid}`)),
    ]);
    window.dispatchEvent(new CustomEvent('friends:accepted', { detail: { fromUid } }));
    // Notify the other person
    push(ref(db, `notifications/${fromUid}`), {
      type    : 'friend_accept',
      title   : 'Friend request accepted',
      body    : 'Your friend request was accepted.',
      fromUid : myUid,
      ts      : Date.now(),
      read    : false,
    }).catch(() => {});
    await update(ref(db, `notifications/${myUid}/${notifId}`), { actioned: true, read: true });
    document.querySelector(`[data-id="${notifId}"] .notif-item-actions`)?.remove();
    document.querySelector(`[data-id="${notifId}"]`)?.classList.remove('notif-item--unread');
    notifyLocal({ type: 'success', title: 'Friend added!' });
    window.checkAchievement?.('first_friend');
  } catch (e) {
    notifyLocal({ type: 'error', title: 'Could not accept request', body: e?.message ?? '' });
  }
}

async function _declineFriend(fromUid, notifId) {
  if (!fromUid || !_uid) return;
  try {
    await Promise.all([
      remove(ref(db, `friend_requests/${_uid}/${fromUid}`)),
      update(ref(db, `notifications/${_uid}/${notifId}`), { actioned: true, read: true }),
    ]);
    document.querySelector(`[data-id="${notifId}"] .notif-item-actions`)?.remove();
    document.querySelector(`[data-id="${notifId}"]`)?.classList.remove('notif-item--unread');
  } catch (_e) {}
}

// ── Public API: write notification to DB + show toast ────────────
export async function notify(opts) {
  const { type, title, body, fromUid, fromName, targetUid } = opts;
  const tid = targetUid ?? _uid;
  if (!tid) return;

  const payload = { type: type ?? 'info', title: title ?? '', body: body ?? '',
    fromUid: fromUid ?? null, fromName: fromName ?? null, ts: Date.now(), read: false };
  try { await push(ref(db, `notifications/${tid}`), payload); } catch (_e) {}

  if (tid === _uid) _showToast({ type, title, body });
}

export function notifyLocal(opts) { _showToast(opts); }

// ── Toast ─────────────────────────────────────────────────────────
function _showToast({ type = 'info', title = '', body = '' } = {}) {
  if (type === 'message' && (_presence === 'dnd' || _presence === 'invisible')) return;
  const container = document.getElementById('toast-container');
  if (!container) return;
  const existing = container.querySelectorAll('.toast');
  if (existing.length >= MAX_TOASTS) existing[0].remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${_svgIcon(type, 15)}</span>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${_esc(title)}</div>` : ''}
      ${body  ? `<div class="toast-body">${_esc(body)}</div>`   : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss">
      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;
  toast.querySelector('.toast-close').addEventListener('click', () => _dismissToast(toast));
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast--visible')));
  toast._timer = setTimeout(() => _dismissToast(toast), TOAST_DURATION);
}

function _dismissToast(toast) {
  clearTimeout(toast._timer);
  toast.classList.remove('toast--visible');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}

// ── SVG icons ─────────────────────────────────────────────────────
function _svgIcon(type, size = 13) {
  const a = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    friend_request: `<svg ${a}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,
    friend_accept : `<svg ${a}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`,
    message       : `<svg ${a}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    alert         : `<svg ${a}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    success       : `<svg ${a}><polyline points="20 6 9 17 4 12"/></svg>`,
    error         : `<svg ${a}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    achievement   : `<svg ${a}><circle cx="12" cy="8" r="6"/><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/></svg>`,
    info          : `<svg ${a}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  return icons[type] ?? icons.info;
}

function _defTitle(type) {
  return { friend_request:'Friend Request', friend_accept:'Friend Accepted', message:'New Message',
    alert:'Alert', success:'Done', error:'Error', achievement:'Achievement Unlocked' }[type] ?? 'Notification';
}

function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _timeAgo(ts) {
  if (!ts) return '';
  const d = Date.now() - ts;
  if (d < 60e3)    return 'just now';
  if (d < 3600e3)  return `${Math.floor(d / 60e3)}m ago`;
  if (d < 86400e3) return `${Math.floor(d / 3600e3)}h ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
