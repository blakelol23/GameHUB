/**
 * js/context-menu.js
 * Custom right-click context menu.
 *
 * Usage: Add data-ctx="TYPE" to any element.
 * Supported types:
 *   - "message"       data-msg-id, data-msg-from, data-msg-text
 *   - "conv-item"     data-peer-uid, data-peer-name
 *   - "friend-item"   data-uid, data-name
 *   - "user"          data-uid, data-name (generic user reference)
 *
 * The menu auto-hides on click-outside and scroll.
 */

// ── State ─────────────────────────────────────────────────────────
let _myUid   = null;
let _menuEl  = null;
let _target  = null;

window.addEventListener('dashboard:user-ready', ({ detail: { user } }) => {
  _myUid = user.uid;
});

// ── Bootstrap ─────────────────────────────────────────────────────
export function initContextMenu() {
  _menuEl = document.getElementById('ctx-menu');
  if (!_menuEl) return;

  // Intercept right-clicks on the dashboard
  document.addEventListener('contextmenu', _onContextMenu);

  // Hide on any click outside or scroll
  document.addEventListener('click',  _hide);
  document.addEventListener('scroll', _hide, true);
  window.addEventListener('blur',     _hide);
}

// ── Context menu handler ──────────────────────────────────────────
function _onContextMenu(e) {
  const ctx = e.target.closest('[data-ctx]');
  if (!ctx) return;    // nothing special — let default menu show
  e.preventDefault();
  _target = ctx;

  const items = _buildItems(ctx);
  if (!items.length) return;

  _render(items);
  _position(e.clientX, e.clientY);
}

function _buildItems(el) {
  const type = el.dataset.ctx;
  const items = [];

  if (type === 'message') {
    const isOwn   = el.dataset.msgFrom === _myUid;
    const text    = el.dataset.msgText ?? '';
    const msgId   = el.dataset.msgId   ?? '';
    const convId  = el.dataset.convId  ?? '';

    items.push({ label: '📋  Copy text', action: () => navigator.clipboard?.writeText(text) });
    if (isOwn) {
      items.push({ label: '🗑  Delete message', cls: 'ctx-item--danger',
        action: () => window._ctxDeleteMsg?.(convId, msgId) });
    } else {
      items.push({ label: '🚩  Report message', cls: 'ctx-item--danger',
        action: () => window._ctxReportMsg?.(convId, msgId, text) });
    }
  }

  if (type === 'conv-item') {
    const peerUid  = el.dataset.peerUid  ?? '';
    const peerName = el.dataset.peerName ?? '';
    items.push({ label: '👤  View profile',   action: () => window.openUserProfile?.(peerUid) });
    items.push({ label: '💬  Open chat',      action: () => window._ctxOpenConv?.(el) });
    items.push({ label: '🔇  Mute (coming soon)', disabled: true });
  }

  if (type === 'friend-item') {
    const uid  = el.dataset.uid  ?? '';
    const name = el.dataset.name ?? '';
    items.push({ label: '👤  View profile',   action: () => window.openUserProfile?.(uid) });
    items.push({ label: '💬  Send message',   action: () => {
      document.querySelector('[data-section="messages"]')?.click();
      window.dispatchEvent(new CustomEvent('messages:open', { detail: { peerUid: uid, peerName: name } }));
    }});
    items.push({ separator: true });
    items.push({ label: '✕  Remove friend',  cls: 'ctx-item--danger',
      action: () => window._ghFrRemove?.(uid) });
  }

  if (type === 'user') {
    const uid  = el.dataset.uid  ?? '';
    const name = el.dataset.name ?? '';
    items.push({ label: '👤  View profile', action: () => window.openUserProfile?.(uid) });
    items.push({ label: '💬  Message',      action: () => {
      document.querySelector('[data-section="messages"]')?.click();
      window.dispatchEvent(new CustomEvent('messages:open', { detail: { peerUid: uid, peerName: name } }));
    }});
  }

  return items;
}

// ── Render ────────────────────────────────────────────────────────
function _render(items) {
  _menuEl.innerHTML = items.map(item => {
    if (item.separator) return `<div class="ctx-sep"></div>`;
    const disabledAttr = item.disabled ? 'disabled' : '';
    return `<button class="ctx-item ${item.cls ?? ''}" ${disabledAttr}>${item.label}</button>`;
  }).join('');

  items.forEach((item, i) => {
    if (item.separator || item.disabled) return;
    _menuEl.children[i]?.addEventListener('click', () => {
      item.action?.();
      _hide();
    });
  });

  _menuEl.hidden = false;
  _menuEl.classList.add('ctx-menu--in');
}

// ── Position ──────────────────────────────────────────────────────
function _position(x, y) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w  = _menuEl.offsetWidth  || 180;
  const h  = _menuEl.offsetHeight || 120;

  let left = x + 4;
  let top  = y + 4;
  if (left + w > vw - 8) left = x - w - 4;
  if (top  + h > vh - 8) top  = y - h - 4;

  _menuEl.style.left = `${Math.max(4, left)}px`;
  _menuEl.style.top  = `${Math.max(4, top)}px`;
}

// ── Hide ──────────────────────────────────────────────────────────
function _hide() {
  if (!_menuEl) return;
  _menuEl.classList.remove('ctx-menu--in');
  _menuEl.hidden = true;
  _target = null;
}

// ── Auto-init ─────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContextMenu, { once: true });
} else {
  initContextMenu();
}
