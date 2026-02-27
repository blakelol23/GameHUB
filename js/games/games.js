/**
 * js/games/games.js
 *
 * Games library section.
 * Each game is registered in the GAMES array below.
 * To add a new game: append an entry to GAMES and drop its assets in ./games/
 *
 * Entry shape:
 * {
 *   id      : 'my-game',         // unique slug
 *   title   : 'My Game',
 *   desc    : 'Short description.',
 *   tag     : 'Arcade',          // genre label
 *   badge   : 'new' | 'hot' | null,
 *   thumb   : 'img/games/my-game.png',  // optional thumbnail
 *   href    : 'games/my-game/',  // path to game folder or page
 * }
 */

import { auth, db } from '../auth.js';
import {
  ref, set, update, get, increment
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';

// ── Game registry ──────────────────────────────────────────────
const GAMES = [
  {
    id   : 'ai-sudoku',
    title: 'AI Sudoku',
    desc : 'Classic Sudoku with an AI solver — snap a photo or type in any puzzle and let the AI crack it.',
    tag  : 'Puzzle',
    badge: 'new',
    thumb: null,
    href : 'games/singlefilegame/AISudoku.html',
  },
  {
    id   : 'blockie-tower-defense',
    title: 'Blockie Tower Defense',
    desc : 'Strategic tower defense with multiple maps, wave mechanics, secret hidden waves, and an admin sandbox. Place towers, survive the horde.',
    tag  : 'Strategy',
    badge: 'new',
    thumb: null,
    href : 'games/multifilegame/Blockie%20Tower%20Defense/v2/index.html',
  },
];

// ── DOM refs ───────────────────────────────────────────────────
const grid      = document.getElementById('games-grid');
const countEl   = document.getElementById('games-count-num');
const searchEl  = document.getElementById('games-search');

// ── Render ─────────────────────────────────────────────────────
function renderGames(list) {
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="3"/>
          <circle cx="8" cy="12" r="1.5"/>
          <path d="M16 10v4M14 12h4"/>
        </svg>
        <p class="empty-state-title">No games yet</p>
        <p class="empty-state-sub">Games you add to the library will appear here. Drop your project into the games/ folder and register it in js/games/games.js.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map(game => `
    <div class="game-card" data-id="${game.id}" role="button" tabindex="0"
         aria-label="Play ${game.title}" onclick="openGame('${game.href}', '${game.title}')">
      <div class="game-card-thumb">
        ${game.thumb
          ? `<img src="${game.thumb}" alt="${game.title}" loading="lazy" />`
          : `<svg class="game-card-thumb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="3"/><circle cx="8" cy="12" r="1.5"/><path d="M16 10v4M14 12h4"/></svg>`
        }
        ${game.badge ? `<span class="game-card-badge game-card-badge--${game.badge}">${game.badge}</span>` : ''}
        <div class="game-card-overlay">
          <div class="game-card-play">
            <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>
          </div>
        </div>
      </div>
      <div class="game-card-body">
        <p class="game-card-title">${game.title}</p>
        <p class="game-card-desc">${game.desc}</p>
        <div class="game-card-meta">
          <span class="game-card-tag">${game.tag}</span>
        </div>
      </div>
    </div>`).join('');
}

// ── Session state ──────────────────────────────────────────────
let _uid            = null;
let _gameStart      = null;    // Date.now() when game opened
let _currentGameId  = null;
let _currentTitle   = null;

// ── Open game ──────────────────────────────────────────────────
function openGame(href, title) {
  const viewer  = document.getElementById('game-viewer');
  const frame   = document.getElementById('game-viewer-frame');
  const titleEl = document.getElementById('game-viewer-title');
  if (!viewer || !frame) {
    if (href) window.open(href, '_blank', 'noopener');
    return;
  }
  frame.src = href || '';
  if (titleEl) titleEl.textContent = title || 'Game';
  viewer.removeAttribute('hidden');
  document.getElementById('game-viewer-back')?.focus();

  // Session tracking
  _gameStart     = Date.now();
  _currentTitle  = title || 'Unknown';
  const game = GAMES.find(g => g.href === href);
  _currentGameId = game?.id ?? href;

  // Write game card as "in progress" (minutes = 0 placeholder)
  _updateGameCard(_currentGameId, { lastPlayed: _gameStart });

  // Presence — write currently-playing game for friends to see
  if (_uid) {
    set(ref(db, `presence/${_uid}/game`), {
      id   : _currentGameId,
      title: _currentTitle,
      since: _gameStart,
    }).catch(() => {});
  }
}
window.openGame = openGame;

// ── Close game ─────────────────────────────────────────────────
function closeGameViewer() {
  const viewer = document.getElementById('game-viewer');
  const frame  = document.getElementById('game-viewer-frame');
  if (!viewer) return;
  viewer.setAttribute('hidden', '');
  if (frame) frame.src = '';

  // Flush session time to Firebase
  if (_uid && _gameStart && _currentGameId) {
    const elapsed = Math.max(1, Math.round((Date.now() - _gameStart) / 60000));
    _updateGameCard(_currentGameId, { lastPlayed: _gameStart });
    update(ref(db, `game_stats/${_uid}/${_currentGameId}`), {
      minutesPlayed: increment(elapsed),
      lastPlayed   : _gameStart,
      title        : _currentTitle,
    }).catch(() => {});
    // Clear presence game field
    set(ref(db, `presence/${_uid}/game`), null).catch(() => {});
  }

  _gameStart      = null;
  _currentGameId  = null;
  _currentTitle   = null;
}
window.closeGameViewer = closeGameViewer;

// ── Update game-card playtime label in the DOM ─────────────────
function _updateGameCard(gameId, { lastPlayed } = {}) {
  // No-op placeholder — card badges are static; live updates happen on next render
}

// ── Game viewer keyboard + fullscreen wiring ───────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const viewer = document.getElementById('game-viewer');
    if (viewer && !viewer.hidden) closeGameViewer();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('game-viewer-fs')?.addEventListener('click', () => {
    const frame = document.getElementById('game-viewer-frame');
    if (!frame) return;
    (frame.requestFullscreen?.() ?? frame.webkitRequestFullscreen?.() ?? Promise.resolve())
      .catch(() => {});
  });
});

// ── Clear game presence on page unload ────────────────────────
window.addEventListener('beforeunload', () => {
  if (_uid && _currentGameId) {
    // Best-effort clear — Firebase SDK usually fires before the page is destroyed
    try { set(ref(db, `presence/${_uid}/game`), null); } catch (_) {}
  }
});
function applyFilter() {
  const query = searchEl?.value.trim().toLowerCase() ?? '';
  const filtered = query
    ? GAMES.filter(g =>
        g.title.toLowerCase().includes(query) ||
        g.tag.toLowerCase().includes(query)   ||
        g.desc.toLowerCase().includes(query))
    : GAMES;
  if (countEl) countEl.textContent = filtered.length;
  renderGames(filtered);
}

searchEl?.addEventListener('input', applyFilter);

// ── Init ───────────────────────────────────────────────────────
window.addEventListener('dashboard:user-ready', e => {
  _uid = e.detail?.user?.uid ?? auth.currentUser?.uid ?? null;

  // Populate Games stat on Overview panel
  const ovStat = document.getElementById('stat-games-count');
  if (ovStat) ovStat.textContent = GAMES.length;

  if (countEl) countEl.textContent = GAMES.length;
  renderGames(GAMES);

  // Overlay game_stats onto cards for playtime display
  if (_uid) _decorateCardsWithStats(_uid);
});

// ── Decorate game cards with playtime from Firebase ───────────
async function _decorateCardsWithStats(uid) {
  try {
    const snap = await get(ref(db, `game_stats/${uid}`));
    if (!snap.exists()) return;
    snap.forEach(child => {
      const gameId = child.key;
      const data   = child.val();
      const mins   = data.minutesPlayed ?? 0;
      const card   = grid?.querySelector(`[data-id="${gameId}"] .game-card-meta`);
      if (!card || mins < 1) return;
      const existing = card.querySelector('.game-card-playtime');
      if (!existing) {
        const badge = document.createElement('span');
        badge.className = 'game-card-playtime';
        badge.textContent = `${mins < 60 ? `${mins}m` : `${Math.round(mins/60)}h ${mins%60}m`} played`;
        card.appendChild(badge);
      }
    });
  } catch (_) {}
}
