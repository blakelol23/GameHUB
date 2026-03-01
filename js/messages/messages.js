/**
 * js/messages/messages.js  v2
 * Direct-message system — Firebase Realtime Database.
 *
 * Data model:
 *   /conversations/{convId}/messages/{msgId} — { from, text, ts }
 *   /user_conversations/{uid}/{convId}        — { peerUid, peerName, avatarColor, lastMsg, lastTs }
 *   /presence/{uid}                           — { status:'online'|'offline'|'dnd'|'away', ts, uid }
 *   Conversation IDs: [uidA, uidB].sort().join('_')
 */

import { auth, db } from '../auth.js';
import {
  ref, get, push, set, onChildAdded, onValue, update,
  query, limitToLast, orderByChild,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';

// ── DOM refs ──────────────────────────────────────────────────────
const convList   = document.getElementById('msg-conv-list');
const chatHeader = document.getElementById('msg-chat-header');
const chatFeed   = document.getElementById('msg-chat-feed');
const msgInput   = document.getElementById('msg-input');
const msgSendBtn = document.getElementById('msg-send-btn');
const msgSearch  = document.getElementById('msg-search');
const newMsgBtn  = document.getElementById('msg-new-btn');

// ── State ─────────────────────────────────────────────────────────
let _uid            = null;
let _activeConvId   = null;
let _activeConvMeta = null;
let _unsubFeed      = null;
let _unsubConvList  = null;
let _unsubPresence  = null;
let _unsubTyping    = null;
let _typingTimer    = null;
let _lastSender     = null;   // bubble grouping
let _lastMsgDate    = null;   // date separator tracking (YYYY-MM-DD string)
let _msgCount       = 0;      // messages sent this session (for achievements)
let _emojiPickerEl  = null;   // floating emoji picker element

// ── Helpers ───────────────────────────────────────────────────────
const COLOR_MAP = {
  cyan  : '#00d4ff', purple: '#a855f7', green: '#44dd88',
  gold  : '#f5a623', red   : '#ff4d6a', white: '#e8ecf8',
};

const EMOJI_LIST = [
  '😀','😂','😎','😭','🤔','😍','👍','🙏',
  '❤️','🔥','✨','🎉','💯','🚀','🎮','💀',
];

function convId(a, b) { return [a, b].sort().join('_'); }

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60e3)    return 'just now';
  if (d < 3600e3)  return `${Math.floor(d / 60e3)}m ago`;
  if (d < 86400e3) return `${Math.floor(d / 3600e3)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function _dateLabel(ts) {
  const d   = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString())       return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function _dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function _esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Fetch username, avatarColor, avatarPhoto and role. */
async function _lookupUserInfo(uid) {
  try {
    const [nSnap, cSnap, pSnap, rSnap] = await Promise.all([
      get(ref(db, `users/${uid}/username`)),
      get(ref(db, `users/${uid}/avatarColor`)),
      get(ref(db, `users/${uid}/avatarPhoto`)),
      get(ref(db, `roles/${uid}`)),
    ]);
    const rv   = rSnap.val();
    const role = rv
      ? (typeof rv === 'string' ? rv.toLowerCase() : (rv?.role?.toLowerCase() ?? null))
      : null;
    return {
      username   : nSnap.val() ?? 'Unknown',
      avatarColor: cSnap.val() ?? 'cyan',
      avatarPhoto: pSnap.val() ?? null,
      role,
    };
  } catch (_e) {
    return { username: 'Unknown', avatarColor: 'cyan', avatarPhoto: null, role: null };
  }
}

function _avatarInner(letter, photo) {
  if (photo) return `<img class="msg-av-photo" src="${_esc(photo)}" alt="" />`;
  return letter;
}

const ROLE_DISPLAY = { owner:'Owner', admin:'Admin', mod:'Mod', tester:'Tester' };

function _roleBadge(role) {
  if (!role || role === 'user') return '';
  return `<span class="msg-role-badge" data-role="${role}">${ROLE_DISPLAY[role] ?? role}</span>`;
}

// ── Unread badge helpers (localStorage-backed) ────────────────────
function _markSeen(cid) {
  try { localStorage.setItem(`msg_seen_${cid}`, String(Date.now())); } catch(_) {}
}
function _seenTs(cid) {
  try { return parseInt(localStorage.getItem(`msg_seen_${cid}`) ?? '0', 10); } catch(_) { return 0; }
}
function _isUnread(entry) {
  if (!entry.lastTs) return false;
  return entry.lastTs > _seenTs(entry.convId);
}

// ── Lifecycle ──────────────────────────────────────────────────────
window.addEventListener('dashboard:user-ready', ({ detail: { user } }) => {
  _uid = user.uid;
  _startConvListListener();
  _bindSend();
  _bindSearch();
  _bindNewMessage();
  _bindBackBtn();
  _bindEmojiPicker();
});

window.addEventListener('dashboard:section', ({ detail: { name } }) => {
  if (name === 'messages' && _uid) _refreshConvList();
});

window.addEventListener('dashboard:logout', () => {
  _unsubConvList?.(); _unsubConvList = null;
  _unsubFeed?.();     _unsubFeed     = null;
  _unsubPresence?.(); _unsubPresence = null;
  _unsubTyping?.();   _unsubTyping   = null;
  clearTimeout(_typingTimer);
  _uid = _activeConvId = _activeConvMeta = null;
  _lastSender = _lastMsgDate = null;
  _msgCount   = 0;
  _emojiPickerEl?.remove(); _emojiPickerEl = null;
  if (convList)   convList.innerHTML   = '';
  if (chatFeed)   chatFeed.innerHTML   = '';
  if (chatHeader) chatHeader.innerHTML = '<span class="msg-chat-header-name">Select a conversation</span>';
  if (msgInput)   { msgInput.disabled = true; msgInput.value = ''; }
  if (msgSendBtn) msgSendBtn.disabled = true;
});

window.addEventListener('messages:open', async ({ detail: { peerUid, peerName } }) => {
  if (!_uid) return;
  const cid       = convId(_uid, peerUid);
  const myInfo    = await _lookupUserInfo(_uid);
  const theirInfo = await _lookupUserInfo(peerUid);
  const resolvedName = theirInfo.username !== 'Unknown' ? theirInfo.username : peerName;
  await Promise.all([
    update(ref(db, `user_conversations/${_uid}/${cid}`),
      { peerUid, peerName: resolvedName, avatarColor: theirInfo.avatarColor,
        avatarPhoto: theirInfo.avatarPhoto ?? null, role: theirInfo.role ?? null,
        lastTs: Date.now() }),
    update(ref(db, `user_conversations/${peerUid}/${cid}`),
      { peerUid: _uid, peerName: myInfo.username, avatarColor: myInfo.avatarColor,
        avatarPhoto: myInfo.avatarPhoto ?? null, role: myInfo.role ?? null,
        lastTs: Date.now() }),
  ]);
  _openConversation(cid, peerUid, resolvedName);
});

// ── Live conversation list ─────────────────────────────────────────
function _startConvListListener() {
  _unsubConvList?.();
  _unsubConvList = onValue(ref(db, `user_conversations/${_uid}`), snap => {
    _renderConvList(snap);
  });
}

async function _refreshConvList() {
  if (!_uid) return;
  try {
    const snap = await get(ref(db, `user_conversations/${_uid}`));
    await _renderConvList(snap);
  } catch (_e) {}
}

async function _renderConvList(snap) {
  if (!snap.exists()) { _showEmptyConvList(); return; }

  const entries = [];
  snap.forEach(child => { entries.push({ convId: child.key, ...child.val() }); });
  entries.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
  if (!entries.length) { _showEmptyConvList(); return; }

  const presMap     = {};
  const peerInfoMap = {};
  await Promise.all(entries.map(async e => {
    if (!e.peerUid) return;
    try {
      const [ps, info] = await Promise.all([
        get(ref(db, `presence/${e.peerUid}`)),
        _lookupUserInfo(e.peerUid),
      ]);
      presMap[e.peerUid]     = { online: ps.val()?.status === 'online', game: ps.val()?.game ?? null };
      peerInfoMap[e.peerUid] = info;
    } catch (_) { presMap[e.peerUid] = { online: false, game: null }; peerInfoMap[e.peerUid] = {}; }
  }));

  if (!convList) return;
  convList.innerHTML = entries.map(e => {
    const pi          = peerInfoMap[e.peerUid] ?? {};
    const displayName = (pi.username && pi.username !== 'Unknown') ? pi.username : (e.peerName || 'Unknown');
    const col         = COLOR_MAP[pi.avatarColor ?? e.avatarColor] ?? COLOR_MAP.cyan;
    const pres        = presMap[e.peerUid] ?? {};
    const online      = pres.online ?? false;
    const game        = pres.game   ?? null;
    const letter      = (displayName || '?')[0].toUpperCase();
    const unread      = e.convId !== _activeConvId && _isUnread(e);
    const preview     = game
      ? `<span class="msg-conv-preview msg-conv-preview--game">🎮 ${_esc(game.title)}</span>`
      : `<span class="msg-conv-preview">${_esc(e.lastMsg ?? '')}</span>`;
    const unreadBadge = unread ? `<span class="msg-unread-badge">●</span>` : '';
    return `
      <button class="msg-conv-item${e.convId === _activeConvId ? ' active' : ''}${unread ? ' unread' : ''}"
              data-conv-id="${e.convId}"
              data-peer-uid="${e.peerUid ?? ''}"
              data-peer-name="${_esc(displayName)}"
              data-ctx="conv-item">
        <div class="msg-conv-avatar-wrap">
          <div class="msg-conv-avatar" style="--av-col:${col}">${_avatarInner(letter, pi.avatarPhoto)}</div>
          <span class="msg-presence-dot${online ? ' msg-presence-dot--on' : ''}"></span>
        </div>
        <div class="msg-conv-info">
          <span class="msg-conv-name">${_esc(displayName)}${_roleBadge(pi.role)}</span>
          ${preview}
        </div>
        <div class="msg-conv-meta">
          <span class="msg-conv-time">${e.lastTs ? timeAgo(e.lastTs) : ''}</span>
          ${unreadBadge}
        </div>
      </button>`;
  }).join('');

  convList.querySelectorAll('.msg-conv-item').forEach(btn => {
    btn.addEventListener('click', () =>
      _openConversation(btn.dataset.convId, btn.dataset.peerUid, btn.dataset.peerName));
  });
}

function _showEmptyConvList() {
  if (!convList) return;
  convList.innerHTML = `
    <div class="msg-conv-empty">
      <svg width="28" height="28" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <p style="margin:0;font-weight:700;color:var(--dash-text-dim)">No conversations</p>
      <p style="margin:0">Find a friend and start messaging.</p>
    </div>`;
}

// ── Open a conversation ────────────────────────────────────────────
async function _openConversation(cid, peerUid, peerNameHint) {
  _activeConvId   = cid;
  _activeConvMeta = { peerUid };
  _unsubFeed?.();     _unsubFeed     = null;
  _unsubPresence?.(); _unsubPresence = null;
  _lastSender  = null;
  _lastMsgDate = null;

  // Mark this conversation as seen → clear unread badge
  _markSeen(cid);

  // Highlight active item and remove unread classes
  document.querySelectorAll('.msg-conv-item').forEach(b => {
    const isActive = b.dataset.convId === cid;
    b.classList.toggle('active', isActive);
    if (isActive) {
      b.classList.remove('unread');
      b.querySelector('.msg-unread-badge')?.remove();
    }
  });

  // Mobile: show chat pane
  document.querySelector('.messages-layout')?.classList.add('conv-open');
  document.dispatchEvent(new CustomEvent('messages:conv-opened'));

  let peerName  = peerNameHint || 'User';
  let peerColor = 'cyan';
  let peerPhoto = null;
  let peerRole  = null;
  try {
    const info = await _lookupUserInfo(peerUid);
    if (info.username !== 'Unknown') peerName = info.username;
    peerColor = info.avatarColor;
    peerPhoto = info.avatarPhoto;
    peerRole  = info.role;
  } catch (_e) {}

  const col = COLOR_MAP[peerColor] ?? COLOR_MAP.cyan;

  if (chatHeader) {
    const backBtnOld = chatHeader.querySelector('.msg-back-btn');
    chatHeader.innerHTML = `
      ${backBtnOld ? backBtnOld.outerHTML : '<button class="msg-back-btn" id="msg-back-btn" title="Back"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>'}
      <div class="msg-chat-avatar-wrap" style="cursor:pointer" onclick="window.openUserProfile?.('${peerUid}')">
        <div class="msg-chat-avatar" style="--av-col:${col}">${_avatarInner(peerName[0].toUpperCase(), peerPhoto)}</div>
        <span class="msg-presence-dot" id="msg-header-presence-dot"></span>
      </div>
      <div style="cursor:pointer" onclick="window.openUserProfile?.('${peerUid}')">
        <div class="msg-chat-name">${_esc(peerName)}${_roleBadge(peerRole)}</div>
        <div class="msg-chat-status" id="msg-chat-status">…</div>
      </div>`;
    // Re-bind back button (just replaced in HTML)
    chatHeader.querySelector('.msg-back-btn')?.addEventListener('click', () =>
      document.querySelector('.messages-layout')?.classList.remove('conv-open'));
  }

  if (chatFeed) chatFeed.innerHTML = '';
  if (msgInput)   { msgInput.disabled = false; msgInput.placeholder = `Message ${peerName}…`; }
  if (msgSendBtn) msgSendBtn.disabled = false;

  // Live presence
  _unsubPresence = onValue(ref(db, `presence/${peerUid}`), snap => {
    const presStatus = snap.val()?.status;
    const game  = snap.val()?.game ?? null;
    const online = presStatus === 'online';
    const isDND  = presStatus === 'dnd';
    const isAway = presStatus === 'away';
    const dot    = document.getElementById('msg-header-presence-dot');
    const stEl   = document.getElementById('msg-chat-status');
    const label  = game
      ? `🎮 Playing ${game.title}`
      : isDND ? '⛔ Do Not Disturb'
      : isAway ? '🌙 Away'
      : online ? 'Online' : 'Offline';
    if (dot)  dot.className = `msg-presence-dot${online ? ' msg-presence-dot--on' : isDND ? ' msg-presence-dot--dnd' : isAway ? ' msg-presence-dot--away' : ''}`;
    if (stEl) { stEl.textContent = label; stEl.dataset.lastStatus = label; }
    const listDot = convList?.querySelector(`[data-conv-id="${cid}"] .msg-presence-dot`);
    if (listDot) listDot.className = `msg-presence-dot${online ? ' msg-presence-dot--on' : ''}`;
  });

  _unsubTyping?.(); _unsubTyping = null;
  _startTypingSubscriber(cid, peerUid);

  const msgsRef = query(
    ref(db, `conversations/${cid}/messages`),
    orderByChild('ts'),
    limitToLast(80),
  );
  const seen = new Set();
  _unsubFeed = onChildAdded(msgsRef, snap => {
    if (seen.has(snap.key)) return;
    seen.add(snap.key);
    _appendMessage(snap.val(), snap.key);
  });
}

// ── Append a message with date separator + grouping ───────────────
function _appendMessage(msg, msgId) {
  if (!chatFeed) return;

  const isSelf    = msg.from === _uid;
  const ts        = msg.ts ?? Date.now();
  const dk        = _dateKey(ts);

  // Date separator
  if (dk !== _lastMsgDate) {
    _lastMsgDate = dk;
    const sep = document.createElement('div');
    sep.className = 'msg-date-sep';
    sep.setAttribute('aria-label', _dateLabel(ts));
    sep.textContent = _dateLabel(ts);
    chatFeed.appendChild(sep);
    _lastSender = null; // reset grouping after separator
  }

  const continued = _lastSender === msg.from;
  _lastSender     = msg.from;

  const row = document.createElement('div');
  row.className = `msg-row${isSelf ? ' msg-row--self' : ''}${continued ? ' msg-row--continued' : ''}`;
  row.dataset.msgId   = msgId ?? '';
  row.dataset.msgFrom = msg.from ?? '';
  row.dataset.convId  = _activeConvId ?? '';

  if (isSelf) {
    row.innerHTML = `
      <div class="msg-row-content">
        ${!continued ? `<span class="msg-row-name msg-row-name--self">You</span>` : ''}
        <div class="msg-bubble msg-bubble--self"
             data-ctx="message"
             data-msg-id="${_esc(msgId ?? '')}"
             data-msg-from="${_esc(msg.from ?? '')}"
             data-msg-text="${_esc(msg.text ?? '')}"
             data-conv-id="${_esc(_activeConvId ?? '')}">
          <span class="msg-bubble-text">${_esc(msg.text)}</span>
          <span class="msg-bubble-ts">${timeAgo(ts)}</span>
        </div>
      </div>`;
  } else {
    const senderId = msg.from;
    row.innerHTML = `
      <div class="msg-row-av-wrap">
        <div class="msg-row-av" data-sender-av="${_esc(senderId)}" style="cursor:pointer">?</div>
      </div>
      <div class="msg-row-content">
        ${!continued ? `<span class="msg-row-name" data-sender-name="${_esc(senderId)}">…</span>` : ''}
        <div class="msg-bubble"
             data-ctx="message"
             data-msg-id="${_esc(msgId ?? '')}"
             data-msg-from="${_esc(senderId)}"
             data-msg-text="${_esc(msg.text ?? '')}"
             data-conv-id="${_esc(_activeConvId ?? '')}">
          <span class="msg-bubble-text">${_esc(msg.text)}</span>
          <span class="msg-bubble-ts">${timeAgo(ts)}</span>
        </div>
      </div>`;
    _lookupUserInfo(senderId).then(info => {
      const avEl   = row.querySelector(`[data-sender-av="${senderId}"]`);
      const nameEl = row.querySelector(`[data-sender-name="${senderId}"]`);
      const col    = COLOR_MAP[info.avatarColor] ?? COLOR_MAP.cyan;
      if (avEl) {
        avEl.style.setProperty('--av-col', col);
        avEl.innerHTML = _avatarInner(info.username[0]?.toUpperCase() ?? '?', info.avatarPhoto);
        avEl.addEventListener('click', () => window.openUserProfile?.(senderId));
      }
      if (nameEl) nameEl.innerHTML = _esc(info.username) + _roleBadge(info.role);
    }).catch(() => {});
  }

  chatFeed.appendChild(row);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

// ── Typing indicator ───────────────────────────────────────────────
function _startTypingSubscriber(cid, peerUid) {
  if (!cid) return;
  _unsubTyping = onValue(ref(db, `typing/${cid}`), snap => {
    const data     = snap.val() ?? {};
    const isTyping = Object.entries(data).some(([uid, v]) =>
      uid !== _uid && v?.ts && (Date.now() - v.ts < 6000));
    const stEl = document.getElementById('msg-chat-status');
    if (!stEl) return;
    if (isTyping) {
      stEl.textContent = 'typing…';
      stEl.classList.add('msg-status--typing');
    } else {
      stEl.classList.remove('msg-status--typing');
      stEl.textContent = stEl.dataset.lastStatus ?? '';
    }
  });
}

function _writeTyping() {
  if (!_activeConvId || !_uid) return;
  const typRef = ref(db, `typing/${_activeConvId}/${_uid}`);
  set(typRef, { ts: Date.now() }).catch(() => {});
  clearTimeout(_typingTimer);
  _typingTimer = setTimeout(() => set(typRef, null).catch(() => {}), 3500);
}

function _clearTyping() {
  if (!_activeConvId || !_uid) return;
  clearTimeout(_typingTimer);
  set(ref(db, `typing/${_activeConvId}/${_uid}`), null).catch(() => {});
}

// ── Context menu handlers ──────────────────────────────────────────
window._ctxDeleteMsg = async (cId, msgId) => {
  if (!cId || !msgId) return;
  try {
    await set(ref(db, `conversations/${cId}/messages/${msgId}`), null);
    document.querySelector(`[data-msg-id="${msgId}"]`)?.closest('.msg-row')?.remove();
  } catch (e) { console.error('[messages] delete failed', e); }
};

window._ctxReportMsg = (cId, msgId, fromUid) => {
  console.warn('[messages] report:', { cId, msgId, fromUid });
};

window._ctxOpenConv = (el) => {
  const uid  = el.dataset.peerUid;
  const name = el.dataset.peerName;
  if (uid) _openConversation(convId(_uid, uid), uid, name);
};

// ── Send message ───────────────────────────────────────────────────
function _bindSend() {
  async function send() {
    if (!_activeConvId || !_uid) return;
    const text = (msgInput?.value ?? '').trim();
    if (!text) return;
    if (msgInput) { msgInput.value = ''; msgInput.focus(); }

    const now = Date.now();
    const msg = { from: _uid, text, ts: now };
    try {
      _clearTyping();
      await push(ref(db, `conversations/${_activeConvId}/messages`), msg);
      const meta = { lastMsg: text.slice(0,80), lastTs: now };
      const peer = _activeConvMeta?.peerUid;
      if (peer) {
        await Promise.all([
          update(ref(db, `user_conversations/${_uid}/${_activeConvId}`), meta),
          update(ref(db, `user_conversations/${peer}/${_activeConvId}`), meta),
        ]);
      }
      // Achievements
      _msgCount++;
      window.checkAchievement?.('first_message');
      if (_msgCount >= 50) window.checkAchievement?.('fifty_messages');
    } catch (_e) { _appendError('Failed to send.'); }
  }

  if (msgSendBtn) msgSendBtn.addEventListener('click', send);
  if (msgInput) {
    msgInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    msgInput.addEventListener('input', () => {
      if (msgInput.value.trim()) _writeTyping();
    });
  }
}

// ── Emoji picker ───────────────────────────────────────────────────
function _bindEmojiPicker() {
  const emojiBtn = document.getElementById('msg-emoji-btn');
  if (!emojiBtn || !msgInput) return;

  function _createPicker() {
    const el = document.createElement('div');
    el.className = 'msg-emoji-picker';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Emoji picker');
    el.innerHTML = EMOJI_LIST.map(em =>
      `<button type="button" class="msg-emoji-opt" data-em="${em}" title="${em}">${em}</button>`
    ).join('');
    el.querySelectorAll('.msg-emoji-opt').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const pos = msgInput.selectionStart ?? msgInput.value.length;
        const val = msgInput.value;
        msgInput.value = val.slice(0, pos) + btn.dataset.em + val.slice(pos);
        msgInput.focus();
        const newPos = pos + btn.dataset.em.length;
        msgInput.setSelectionRange(newPos, newPos);
        _closePicker();
      });
    });
    return el;
  }

  function _closePicker() {
    _emojiPickerEl?.remove();
    _emojiPickerEl = null;
    document.removeEventListener('click', _closePicker, true);
  }

  emojiBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (_emojiPickerEl) { _closePicker(); return; }
    _emojiPickerEl = _createPicker();
    const bar = emojiBtn.closest('.msg-input-bar') ?? document.body;
    bar.style.position = bar.style.position || 'relative';
    bar.appendChild(_emojiPickerEl);
    setTimeout(() => document.addEventListener('click', _closePicker, true), 0);
  });
}

// ── Search conversations ───────────────────────────────────────────
function _bindSearch() {
  if (!msgSearch) return;
  msgSearch.addEventListener('input', () => {
    const q = msgSearch.value.toLowerCase();
    document.querySelectorAll('.msg-conv-item').forEach(btn => {
      const name = btn.querySelector('.msg-conv-name')?.textContent.toLowerCase() ?? '';
      btn.style.display = name.includes(q) ? '' : 'none';
    });
  });
}

// ── New message (inline search) ────────────────────────────────────
function _bindNewMessage() {
  const newRow    = document.getElementById('msg-new-row');
  const newInput  = document.getElementById('msg-new-input');
  const cancelBtn = document.getElementById('msg-new-cancel');
  if (!newMsgBtn) return;

  newMsgBtn.addEventListener('click', () => {
    if (!newRow) return;
    newRow.hidden = false;
    newInput?.focus();
  });
  cancelBtn?.addEventListener('click', () => {
    if (newRow) newRow.hidden = true;
    if (newInput) newInput.value = '';
  });

  newInput?.addEventListener('keydown', async e => {
    if (e.key !== 'Enter') return;
    const target = (newInput.value ?? '').trim().toLowerCase();
    if (!target) return;
    newInput.disabled = true;
    try {
      const snap = await get(ref(db, `usernames/${target}`));
      if (!snap.exists()) {
        newInput.style.borderColor = 'rgba(255,77,106,0.5)';
        newInput.disabled = false; newInput.select(); return;
      }
      const peerUid = snap.val();
      if (peerUid === _uid) {
        newInput.style.borderColor = 'rgba(255,77,106,0.5)';
        newInput.disabled = false; return;
      }
      const myInfo    = await _lookupUserInfo(_uid);
      const theirInfo = await _lookupUserInfo(peerUid);
      const peerName  = theirInfo.username !== 'Unknown' ? theirInfo.username : target;
      const cid       = convId(_uid, peerUid);
      await Promise.all([
        update(ref(db, `user_conversations/${_uid}/${cid}`),
          { peerUid, peerName, avatarColor: theirInfo.avatarColor, lastTs: Date.now() }),
        update(ref(db, `user_conversations/${peerUid}/${cid}`),
          { peerUid: _uid, peerName: myInfo.username, avatarColor: myInfo.avatarColor, lastTs: Date.now() }),
      ]);
      newInput.value = ''; newInput.style.borderColor = '';
      if (newRow) newRow.hidden = true;
      _openConversation(cid, peerUid, peerName);
    } catch (_e) {
      newInput.style.borderColor = 'rgba(255,77,106,0.5)';
    } finally { newInput.disabled = false; }
  });

  newInput?.addEventListener('input', () => {
    if (newInput.style.borderColor) newInput.style.borderColor = '';
  });
}

function _appendError(txt) {
  if (!chatFeed) return;
  const d = document.createElement('div');
  d.className = 'msg-feed-error'; d.textContent = txt;
  chatFeed.appendChild(d);
}

// ── Mobile back button ─────────────────────────────────────────────
function _bindBackBtn() {
  const backBtn = document.getElementById('msg-back-btn');
  if (!backBtn) return;
  backBtn.addEventListener('click', () =>
    document.querySelector('.messages-layout')?.classList.remove('conv-open'));
}
