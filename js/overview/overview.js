/**
 * js/overview/overview.js
 *
 * Overview section — live Firebase stats, online friends, session timer.
 */

import { auth, db } from '../auth.js';
import {
  ref, get, onValue,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';

const COLOR_MAP = {
  cyan  : '#00d4ff', purple: '#a855f7', green : '#44dd88',
  gold  : '#f5a623', red   : '#ff4d6a', white : '#e8ecf8',
};

const ROLE_DISPLAY = {
  owner: 'Owner', admin: 'Admin', mod: 'Mod', tester: 'Tester',
};

let _sessionStart = null;
let _sessionTimer  = null;
let _unsubFriends  = null;
let _unsubConvos   = null;

// ── Lifecycle ──────────────────────────────────────────────────
window.addEventListener('dashboard:user-ready', ({ detail: { user, profile } }) => {
  const uid = user.uid;
  _sessionStart = Date.now();

  _populateHero(uid, profile);
  _tickSession();
  _sessionTimer = setInterval(_tickSession, 30_000);

  _startFriendsListener(uid);
  _startConvosListener(uid);
  _loadActivity(uid);
  _loadRecentlyPlayed(uid);

  document.querySelectorAll('.ov-action-btn[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector(`.dash-nav-item[data-section="${btn.dataset.goto}"]`)?.click();
    });
  });
});

window.addEventListener('dashboard:logout', () => {
  clearInterval(_sessionTimer);
  _unsubFriends?.();
  _unsubConvos?.();
  _sessionStart = _sessionTimer = null;
  _unsubFriends = _unsubConvos = null;
});

// ── Hero ───────────────────────────────────────────────────────
function _populateHero(uid, profile) {
  const avatarEl = document.getElementById('ov-hero-avatar');
  const badgeEl  = document.getElementById('ov-role-badge');

  const username = profile?.username ?? 'Operator';
  const color    = profile?.avatarColor ?? 'cyan';
  const col      = COLOR_MAP[color] ?? COLOR_MAP.cyan;

  if (avatarEl) {
    avatarEl.style.setProperty('--av-col', col);
    avatarEl.textContent = username[0].toUpperCase();
  }

  const photo = profile?.avatarPhoto ?? null;
  if (photo && avatarEl) {
    const img   = document.createElement('img');
    img.src       = photo;
    img.className = 'ov-hero-av-img';
    img.alt       = '';
    avatarEl.textContent = '';
    avatarEl.appendChild(img);
  }

  const role = profile?.role ?? null;
  if (role && role !== 'user' && badgeEl) {
    badgeEl.textContent  = ROLE_DISPLAY[role] ?? role;
    badgeEl.dataset.role = role;
    badgeEl.hidden       = false;
  }
}

// ── Session timer ──────────────────────────────────────────────
function _tickSession() {
  const el = document.getElementById('ov-session-pill');
  if (!el || !_sessionStart) return;
  const ms = Date.now() - _sessionStart;
  const m  = Math.floor(ms / 60e3);
  const h  = Math.floor(m / 60);
  el.textContent = h > 0 ? `Session: ${h}h ${m % 60}m` : m > 0 ? `Session: ${m}m` : 'Session: <1m';
}

// ── Live friends + online list ─────────────────────────────────
function _startFriendsListener(uid) {
  _unsubFriends = onValue(ref(db, `friends/${uid}`), async snap => {
    if (!snap.exists()) {
      _setStat('stat-friends-count', 0);
      _setStat('stat-online-count',  0);
      _setStat('ov-online-badge',    0);
      _renderOnlineList([]);
      _renderNowPlayingPanel([]);
      return;
    }

    const friendUids = Object.keys(snap.val());
    _setStat('stat-friends-count', friendUids.length);

    const friends = await Promise.all(friendUids.map(async fuid => {
      try {
        const [presSnap, unSnap, colSnap, photoSnap, roleSnap] = await Promise.all([
          get(ref(db, `presence/${fuid}`)),
          get(ref(db, `users/${fuid}/username`)),
          get(ref(db, `users/${fuid}/avatarColor`)),
          get(ref(db, `users/${fuid}/avatarPhoto`)),
          get(ref(db, `roles/${fuid}`)),        // authoritative roles path
        ]);
        const pres = presSnap.val();
        const rawGame = pres?.game ?? null;
        // Discard stale game entries (> 4 hours old) in case close wasn't fired
        const game = rawGame && (Date.now() - (rawGame.since ?? 0)) < 4 * 3600_000
          ? rawGame : null;
        const rv   = roleSnap.val();
        const role = rv
          ? (typeof rv === 'string' ? rv.toLowerCase() : (rv?.role?.toLowerCase() ?? null))
          : null;
        return {
          uid        : fuid,
          online     : pres?.status === 'online',
          game,
          username   : unSnap.val()    ?? 'Unknown',
          avatarColor: colSnap.val()   ?? 'cyan',
          avatarPhoto: photoSnap.val() ?? null,
          role,
        };
      } catch {
        return { uid: fuid, online: false, game: null, username: '?', avatarColor: 'cyan', avatarPhoto: null, role: null };
      }
    }));

    const online = friends.filter(f => f.online);
    _setStat('stat-online-count', online.length);
    _setStat('ov-online-badge',   online.length);
    _renderOnlineList(online);
    _renderNowPlayingPanel(friends.filter(f => f.game));
  });
}

function _renderOnlineList(list) {
  const el = document.getElementById('ov-online-list');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `<div class="empty-state" style="padding:28px 12px"><p class="empty-state-sub">No friends online right now.</p></div>`;
    return;
  }

  el.innerHTML = list.map(f => {
    const col    = COLOR_MAP[f.avatarColor] ?? COLOR_MAP.cyan;
    const letter = (f.username || '?')[0].toUpperCase();
    const photo  = f.avatarPhoto ? `<img class="ov-fav-img" src="${_esc(f.avatarPhoto)}" alt="" />` : '';
    const badge  = f.role && f.role !== 'user'
      ? `<span class="msg-role-badge" data-role="${f.role}">${ROLE_DISPLAY[f.role] ?? f.role}</span>` : '';
    const sub = f.game
      ? `<span class="ov-friend-sub ov-friend-sub--game">🎮 ${_esc(f.game.title)}</span>`
      : `<span class="ov-friend-sub"><span class="ov-dot ov-dot--on"></span> Online</span>`;
    return `
      <div class="ov-friend-row">
        <div class="ov-fav" style="--av-col:${col}">${letter}${photo}</div>
        <div class="ov-friend-info">
          <span class="ov-friend-name">${_esc(f.username)}${badge}</span>
          ${sub}
        </div>
        <button class="ov-msg-btn" data-uid="${f.uid}" data-name="${_esc(f.username)}" title="Message">
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>`;
  }).join('');

  el.querySelectorAll('.ov-msg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('messages:open', {
        detail: { peerUid: btn.dataset.uid, peerName: btn.dataset.name },
      }));
      document.querySelector('.dash-nav-item[data-section="messages"]')?.click();
    });
  });
}

// ── Now Playing panel (friends in a game) ─────────────────────
function _renderNowPlayingPanel(playingList) {
  const panel  = document.getElementById('ov-now-playing-panel');
  const list   = document.getElementById('ov-playing-list');
  const badge  = document.getElementById('ov-playing-badge');
  if (!panel || !list) return;

  if (badge) badge.textContent = playingList.length;

  if (!playingList.length) {
    panel.hidden = true;
    list.innerHTML = '';
    return;
  }

  panel.hidden = false;
  list.innerHTML = playingList.map(f => {
    const col    = COLOR_MAP[f.avatarColor] ?? COLOR_MAP.cyan;
    const letter = (f.username || '?')[0].toUpperCase();
    const photo  = f.avatarPhoto ? `<img class="ov-fav-img" src="${_esc(f.avatarPhoto)}" alt="" />` : '';
    const badge  = f.role && f.role !== 'user'
      ? `<span class="msg-role-badge" data-role="${f.role}">${ROLE_DISPLAY[f.role] ?? f.role}</span>` : '';
    const elapsed = f.game?.since
      ? _timeAgo(f.game.since)
      : '';
    return `
      <div class="ov-friend-row ov-playing-row">
        <div class="ov-playing-indicator" aria-hidden="true"></div>
        <div class="ov-fav" style="--av-col:${col}">${letter}${photo}</div>
        <div class="ov-friend-info">
          <span class="ov-friend-name">${_esc(f.username)}${badge}</span>
          <span class="ov-friend-sub ov-friend-sub--game">🎮 ${_esc(f.game?.title ?? 'a game')}</span>
        </div>
        <span class="ov-playing-time">${elapsed}</span>
        <button class="ov-msg-btn" data-uid="${f.uid}" data-name="${_esc(f.username)}" title="Message">
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>`;
  }).join('');

  list.querySelectorAll('.ov-msg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('messages:open', {
        detail: { peerUid: btn.dataset.uid, peerName: btn.dataset.name },
      }));
      document.querySelector('.dash-nav-item[data-section="messages"]')?.click();
    });
  });
}

// ── Recently Played panel ──────────────────────────────────────
async function _loadRecentlyPlayed(uid) {
  const el = document.getElementById('ov-recently-list');
  if (!el) return;
  try {
    const snap = await get(ref(db, `game_stats/${uid}`));
    if (!snap.exists()) {
      el.innerHTML = `<div class="ov-recently-empty">No games played yet. <button class="ov-recently-cta" data-goto="games">Browse Games →</button></div>`;
      el.querySelector('[data-goto]')?.addEventListener('click', () =>
        document.querySelector('.dash-nav-item[data-section="games"]')?.click());
      return;
    }

    const rows = [];
    snap.forEach(child => {
      rows.push({ id: child.key, ...child.val() });
    });
    rows.sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));

    el.innerHTML = rows.map(g => {
      const mins  = g.minutesPlayed ?? 0;
      const time  = mins < 60
        ? `${mins}m played`
        : `${Math.floor(mins / 60)}h ${mins % 60}m played`;
      return `
        <div class="ov-recently-row" role="button" tabindex="0"
             onclick="document.querySelector('.dash-nav-item[data-section=\\'games\\']')?.click()">
          <div class="ov-recently-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                 stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="3"/>
              <circle cx="8" cy="12" r="1.5"/>
              <path d="M16 10v4M14 12h4"/>
            </svg>
          </div>
          <div class="ov-recently-info">
            <span class="ov-recently-title">${_esc(g.title ?? g.id)}</span>
            <span class="ov-recently-meta">${time}</span>
          </div>
          <span class="ov-recently-time">${g.lastPlayed ? _timeAgo(g.lastPlayed) : ''}</span>
        </div>`;
    }).join('');
  } catch { /* silently fail */ }
}

// ── Conversations count (live) ─────────────────────────────────
function _startConvosListener(uid) {
  _unsubConvos = onValue(ref(db, `user_conversations/${uid}`), snap => {
    _setStat('stat-convos-count', snap.exists() ? Object.keys(snap.val()).length : 0);
  });
}

// ── Activity feed (recent DMs) ─────────────────────────────────
async function _loadActivity(uid) {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  try {
    const snap = await get(ref(db, `user_conversations/${uid}`));
    if (!snap.exists()) { _emptyFeed(feed); return; }

    const entries = [];
    snap.forEach(c => entries.push(c.val()));
    entries.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
    if (!entries.length) { _emptyFeed(feed); return; }

    feed.innerHTML = entries.slice(0, 8).map(e => `
      <div class="activity-item">
        <span class="activity-dot"></span>
        <span class="activity-text">Conversation with <strong>${_esc(e.peerName || 'someone')}</strong>${e.lastMsg ? ` — "${_esc(e.lastMsg.slice(0, 55))}"` : ''}</span>
        <span class="activity-time">${e.lastTs ? _timeAgo(e.lastTs) : ''}</span>
      </div>`).join('');
  } catch { _emptyFeed(feed); }
}

function _emptyFeed(el) {
  el.innerHTML = `<div class="empty-state" style="padding:28px 12px"><p class="empty-state-sub">No recent activity yet.</p></div>`;
}

// ── Utils ──────────────────────────────────────────────────────
function _setStat(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n;
}

function _esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60e3)    return 'just now';
  if (d < 3600e3)  return `${Math.floor(d / 60e3)}m ago`;
  if (d < 86400e3) return `${Math.floor(d / 3600e3)}h ago`;
  return new Date(ts).toLocaleDateString();
}
