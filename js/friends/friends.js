/**
 * js/friends/friends.js
 * Friends system — fully rewritten.
 *
 * Data model (unchanged paths):
 *   /friends/{uid}/{friendUid}           = { since, username, avatarColor }
 *   /friend_requests/{uid}/{fromUid}     = { from, username, avatarColor, ts }
 *   /sent_requests/{uid}/{toUid}         = { to, username, ts }
 *
 * All multi-node writes use root-level update() for atomicity so that both
 * sides of a friendship always update together, even if one client is offline.
 */

import { auth, db } from '../auth.js';
import {
  ref, get, set, update, onValue,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';
import { notify } from '../notifications.js';

// ── State ──────────────────────────────────────────────────────
let _uid          = null;
let _unsubReqs    = null;
let _unsubFriends = null;
let _cachedOut    = {};   // sent requests snapshot
let _activeTab    = 'all';

// ── Helpers ────────────────────────────────────────────────────
const COLOR_MAP = {
  cyan:'#00d4ff', purple:'#a855f7', green:'#44dd88',
  gold:'#f5a623', red:'#ff4d6a',   white:'#e8ecf8',
};
const _col = id => COLOR_MAP[id] ?? '#00d4ff';
const _esc = s  => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── Init ───────────────────────────────────────────────────────
window.addEventListener('dashboard:user-ready', ({ detail: { user } }) => {
  _uid = user.uid;
  _bindUI();
  _startListeners();
  _renderTab('all');
});

window.addEventListener('dashboard:logout', () => {
  _uid = null;
  _unsubReqs?.();    _unsubReqs    = null;
  _unsubFriends?.(); _unsubFriends = null;
});

// ── UI bindings ────────────────────────────────────────────────
function _bindUI() {
  document.querySelectorAll('.fr-tab[data-tab]').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.fr-tab[data-tab]').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      _activeTab = t.dataset.tab;
      _renderTab(_activeTab);
    });
  });

  const btn   = document.getElementById('fr-add-btn');
  const input = document.getElementById('fr-search');
  btn?.addEventListener('click',  () => _sendRequest(input?.value?.trim()));
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') _sendRequest(input.value.trim());
  });
}

// ── Live listeners ─────────────────────────────────────────────
function _startListeners() {
  _unsubReqs?.();
  _unsubReqs = onValue(ref(db, `friend_requests/${_uid}`), snap => {
    const count = snap.exists() ? Object.keys(snap.val()).length : 0;
    _badge('badge-pending', count);
    _badge('fr-pending-count', count);
    if (_activeTab === 'pending') _renderPending(snap.val() ?? {}, _cachedOut);
  });

  _unsubFriends?.();
  _unsubFriends = onValue(ref(db, `friends/${_uid}`), snap => {
    const data  = snap.val() ?? {};
    const count = Object.keys(data).length;
    _badge('badge-all', count);
    ['stat-friends-count', 'stat-friends-count-p', 'fr-total-count'].forEach(id => _badge(id, count));
    if (_activeTab === 'all' || _activeTab === 'online') {
      _renderFriends(data, _activeTab === 'online');
    }
  });
}

function _badge(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n;
}

// ── Render dispatch ────────────────────────────────────────────
async function _renderTab(tab) {
  if (tab === 'all' || tab === 'online') {
    const s = await get(ref(db, `friends/${_uid}`));
    _renderFriends(s.val() ?? {}, tab === 'online');
  } else {
    const [inSnap, outSnap] = await Promise.all([
      get(ref(db, `friend_requests/${_uid}`)),
      get(ref(db, `sent_requests/${_uid}`)),
    ]);
    _cachedOut = outSnap.val() ?? {};
    _renderPending(inSnap.val() ?? {}, _cachedOut);
  }
}

// ── User-info fetching ─────────────────────────────────────────
async function _fetchUser(uid) {
  const [name, color, photo, roleSnap] = await Promise.all([
    get(ref(db, `users/${uid}/username`)),
    get(ref(db, `users/${uid}/avatarColor`)),
    get(ref(db, `users/${uid}/avatarPhoto`)),
    get(ref(db, `roles/${uid}`)),           // authoritative — not writable by users
  ]);
  const rv   = roleSnap.val();
  const role = rv
    ? (typeof rv === 'string' ? rv.toLowerCase() : (rv?.role?.toLowerCase() ?? null))
    : null;
  return {
    username   : name.val()  ?? 'Unknown',
    avatarColor: color.val() ?? 'cyan',
    avatarPhoto: photo.val() ?? null,
    role,
  };
}

// ── Avatar / badge builders ────────────────────────────────────
const FR_ROLE_DISPLAY = { owner:'Owner', admin:'Admin', mod:'Mod', tester:'Tester' };

function _roleHTML(role) {
  if (!role || role === 'user') return '';
  return `<span class="fr-role" data-role="${role}">${FR_ROLE_DISPLAY[role] ?? role}</span>`;
}

function _avHTML(letter, color, photo) {
  const hex = _col(color);
  const img = photo
    ? `<img class="fr-av-photo" src="${_esc(photo)}" alt="" loading="lazy">`
    : '';
  return `<div class="fr-av" style="--avc:${hex}">${_esc(String(letter).toUpperCase())}${img}</div>`;
}

// ── Render friends (All / Online) ──────────────────────────────
async function _renderFriends(data, onlineOnly) {
  const list = document.getElementById('fr-list');
  if (!list) return;

  const entries = Object.entries(data);
  if (!entries.length) {
    list.innerHTML = _emptyHTML(
      onlineOnly ? 'Nobody online right now.' : 'No friends yet.',
      onlineOnly ? '' : 'Use the search bar above to add someone by username.'
    );
    _badge('badge-online',   0);
    _badge('fr-online-count', 0);
    return;
  }

  // Fetch presence + fresh user info in parallel
  const [presenceResults, userResults] = await Promise.all([
    Promise.all(entries.map(([uid]) =>
      get(ref(db, `presence/${uid}`)).then(s => [uid, s.val()])
    )),
    Promise.all(entries.map(([uid]) =>
      _fetchUser(uid).then(info => [uid, info])
    )),
  ]);

  const presMap = Object.fromEntries(presenceResults);
  const infoMap = Object.fromEntries(userResults);

  const onlineCount = entries.filter(([uid]) => presMap[uid]?.status === 'online').length;
  _badge('badge-online',    onlineCount);
  _badge('fr-online-count', onlineCount);

  const filtered = onlineOnly
    ? entries.filter(([uid]) => presMap[uid]?.status === 'online')
    : entries;

  if (!filtered.length) {
    list.innerHTML = _emptyHTML('Nobody online right now.', '');
    return;
  }

  // Sort: online → away → offline, then alphabetical
  const ORDER = { online: 0, away: 1, offline: 2 };
  filtered.sort(([a], [b]) => {
    const sa = presMap[a]?.status ?? 'offline';
    const sb = presMap[b]?.status ?? 'offline';
    if (ORDER[sa] !== ORDER[sb]) return ORDER[sa] - ORDER[sb];
    return (infoMap[a]?.username ?? '').localeCompare(infoMap[b]?.username ?? '');
  });

  list.innerHTML = filtered.map(([uid]) => {
    const pr     = presMap[uid];
    const info   = infoMap[uid];
    const status = pr?.status ?? 'offline';
    const dot    = status === 'online' ? '#44dd88' : status === 'away' ? '#f5a623' : '#4a5060';
    const label  = status === 'online' ? 'Online'  : status === 'away' ? 'Away'    : 'Offline';
    return `<div class="fr-item" data-uid="${uid}" data-ctx="friend-item" data-name="${_esc(info.username ?? '')}">
      <div class="fr-av-wrap">
        ${_avHTML((info.username || '?')[0], info.avatarColor, info.avatarPhoto)}
        <span class="fr-dot" style="background:${dot};box-shadow:0 0 5px ${dot}99"></span>
      </div>
      <div class="fr-info">
        <div class="fr-name">${_esc(info.username)}${_roleHTML(info.role)}</div>
        <div class="fr-sub" style="color:${dot}">${label}</div>
      </div>
      <div class="fr-actions">
        <button class="fr-btn fr-btn--msg"
                onclick="window._ghFrMsg('${uid}','${_esc(info.username)}')">Message</button>
        <button class="fr-btn fr-btn--del"
                onclick="window._ghFrRemove('${uid}')">Remove</button>
      </div>
    </div>`;
  }).join('');
}

// ── Render pending ─────────────────────────────────────────────
function _renderPending(incoming, sent) {
  const list = document.getElementById('fr-list');
  if (!list) return;

  const inEnt  = Object.entries(incoming);
  const outEnt = Object.entries(sent);

  if (!inEnt.length && !outEnt.length) {
    list.innerHTML = _emptyHTML('No pending requests.', '');
    return;
  }

  let html = '';

  if (inEnt.length) {
    html += `<p class="fr-section-lbl">Incoming</p>`;
    html += inEnt.map(([fromUid, req]) => `
    <div class="fr-item fr-item--incoming">
      <div class="fr-av-wrap">
        ${_avHTML((req.username || '?')[0], req.avatarColor ?? 'cyan', req.avatarPhoto ?? null)}
      </div>
      <div class="fr-info">
        <div class="fr-name">${_esc(req.username || 'Unknown')}</div>
        <div class="fr-sub fr-sub--in">Incoming friend request</div>
      </div>
      <div class="fr-actions">
        <button class="fr-btn fr-btn--accept"
                onclick="window._ghFrAccept('${fromUid}','${_esc(req.username || 'Unknown')}')">Accept</button>
        <button class="fr-btn fr-btn--del"
                onclick="window._ghFrDecline('${fromUid}')">Decline</button>
      </div>
    </div>`).join('');
  }

  if (outEnt.length) {
    html += `<p class="fr-section-lbl${inEnt.length ? ' fr-section-lbl--gap' : ''}">Sent</p>`;
    html += outEnt.map(([toUid, req]) => `
    <div class="fr-item fr-item--sent">
      <div class="fr-av-wrap">
        ${_avHTML((req.username || '?')[0], 'white', null)}
      </div>
      <div class="fr-info">
        <div class="fr-name fr-name--dim">${_esc(req.username || 'Unknown')}</div>
        <div class="fr-sub fr-sub--out">Awaiting response…</div>
      </div>
      <div class="fr-actions">
        <button class="fr-btn fr-btn--del"
                onclick="window._ghFrCancel('${toUid}')">Cancel</button>
      </div>
    </div>`).join('');
  }

  list.innerHTML = html;
}

function _emptyHTML(title, sub) {
  return `<div class="fr-empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <circle cx="9" cy="8" r="3"/><path d="M2 20c0-3 3-5.5 7-5.5s7 2.5 7 5.5"/>
      <circle cx="18" cy="8" r="2.5"/><path d="M18 13.5c2.5 0 4.5 1.8 4.5 4"/>
    </svg>
    <p class="fr-empty-title">${title}</p>
    ${sub ? `<p class="fr-empty-sub">${sub}</p>` : ''}
  </div>`;
}

// ── Status feedback ────────────────────────────────────────────
function _setStatus(text, ok) {
  const el = document.getElementById('fr-status');
  if (!el) return;
  el.textContent = text;
  el.className   = `fr-status fr-status--${ok ? 'ok' : 'err'}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.textContent = ''; el.className = 'fr-status'; }, 5000);
}

// ── Send request ───────────────────────────────────────────────
async function _sendRequest(username) {
  if (!username) return;
  try {
    const look = await get(ref(db, `usernames/${username.toLowerCase()}`));
    if (!look.exists()) return _setStatus('User not found.', false);
    const targetUid = look.val();
    if (targetUid === _uid) return _setStatus("That's you!", false);

    const [already, theyReqd, alreadySent] = await Promise.all([
      get(ref(db, `friends/${_uid}/${targetUid}`)),
      get(ref(db, `friend_requests/${_uid}/${targetUid}`)),
      get(ref(db, `sent_requests/${_uid}/${targetUid}`)),
    ]);

    if (already.exists())     return _setStatus('Already friends!', false);
    if (alreadySent.exists()) return _setStatus('Request already sent.', false);

    // They already requested us → auto-accept
    if (theyReqd.exists()) {
      const req = theyReqd.val();
      await window._ghFrAccept(targetUid, req.username ?? username);
      _setStatus(`You and ${username} are now friends!`, true);
      const inp = document.getElementById('fr-search');
      if (inp) inp.value = '';
      return;
    }

    const [nameSnap, colSnap] = await Promise.all([
      get(ref(db, `users/${_uid}/username`)),
      get(ref(db, `users/${_uid}/avatarColor`)),
    ]);
    const myName = nameSnap.val() ?? 'Unknown';
    const myCol  = colSnap.val()  ?? 'cyan';

    await Promise.all([
      set(ref(db, `friend_requests/${targetUid}/${_uid}`), {
        from: _uid, username: myName, avatarColor: myCol, ts: Date.now(),
      }),
      set(ref(db, `sent_requests/${_uid}/${targetUid}`), {
        to: targetUid, username, ts: Date.now(),
      }),
    ]);

    // Notify the target user about the incoming request
    notify({
      targetUid: targetUid,
      type     : 'friend_request',
      title    : 'Friend Request',
      body     : `${myName} sent you a friend request`,
      fromUid  : _uid,
      fromName : myName,
    }).catch(() => {});

    _setStatus(`Request sent to ${username}!`, true);
    const inp = document.getElementById('fr-search');
    if (inp) inp.value = '';
  } catch (e) {
    console.error('[friends] sendRequest:', e);
    _setStatus('Something went wrong.', false);
  }
}

// ── Window-exposed actions ─────────────────────────────────────

// Accept — single atomic multi-path write so BOTH friend lists update together
window._ghFrAccept = async (fromUid, fromName) => {
  try {
    const [myNameSnap, myColSnap, theirColSnap] = await Promise.all([
      get(ref(db, `users/${_uid}/username`)),
      get(ref(db, `users/${_uid}/avatarColor`)),
      get(ref(db, `users/${fromUid}/avatarColor`)),
    ]);
    const myName   = myNameSnap.val()   ?? 'Unknown';
    const myCol    = myColSnap.val()    ?? 'cyan';
    const theirCol = theirColSnap.val() ?? 'cyan';
    const now      = Date.now();

    await update(ref(db), {
      [`friends/${_uid}/${fromUid}`]          : { since: now, username: fromName, avatarColor: theirCol },
      [`friends/${fromUid}/${_uid}`]          : { since: now, username: myName,   avatarColor: myCol   },
      [`friend_requests/${_uid}/${fromUid}`]  : null,
      [`sent_requests/${fromUid}/${_uid}`]    : null,
    });

    // Notify both users about the accepted request
    notify({
      targetUid: fromUid,
      type     : 'friend_accept',
      title    : 'Friend Request Accepted',
      body     : `${myName} accepted your friend request`,
      fromUid  : _uid,
      fromName : myName,
    }).catch(() => {});
  } catch (e) {
    console.error('[friends] accept:', e);
  }
};

// Decline
window._ghFrDecline = async (fromUid) => {
  try {
    await update(ref(db), {
      [`friend_requests/${_uid}/${fromUid}`] : null,
      [`sent_requests/${fromUid}/${_uid}`]   : null,
    });
  } catch (e) { console.error('[friends] decline:', e); }
};

// Cancel my outgoing request
window._ghFrCancel = async (targetUid) => {
  try {
    await update(ref(db), {
      [`sent_requests/${_uid}/${targetUid}`]     : null,
      [`friend_requests/${targetUid}/${_uid}`]   : null,
    });
  } catch (e) { console.error('[friends] cancel:', e); }
};

// Remove friend (mutual)
window._ghFrRemove = async (friendUid) => {
  if (!confirm('Remove this friend?')) return;
  try {
    await update(ref(db), {
      [`friends/${_uid}/${friendUid}`]  : null,
      [`friends/${friendUid}/${_uid}`]  : null,
    });
  } catch (e) { console.error('[friends] remove:', e); }
};

// Open DM
window._ghFrMsg = (peerUid, peerName) => {
  document.querySelector('[data-section="messages"]')?.click();
  window.dispatchEvent(new CustomEvent('messages:open', { detail: { peerUid, peerName } }));
};

// Legacy aliases kept for overview.js compatibility
window._gh_friendMsg    = window._ghFrMsg;
window._gh_acceptFriend = window._ghFrAccept;
