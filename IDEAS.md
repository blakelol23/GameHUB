# GAME HUB — Ideas & Roadmap

---

## Sidebar Ideas

### Mini Profile Strip (bottom of sidebar, above sign-out)
- Small avatar (matches profile photo / letter fallback) + username + role badge
- Live presence dot (green = online)
- Clicking it navigates to the Profile section
- Collapses to just avatar + dot when sidebar is icon-only

### Notification Bell (topbar or sidebar)
- Badge counter on the bell icon (unread DMs + pending friend requests)
- Clicking opens a small dropdown panel: friend requests, new messages, system alerts
- Firebase onValue listener keeps the count live
- "Mark all read" button

### "Now Playing" indicator (sidebar, below nav items)
- Small card showing the last/current game the user launched inside Game Hub
- Game icon + name + elapsed time  
- Collapses to just the game icon in icon-only mode

### Quick-stat pills (sidebar, right under the brand logo)
- `[N] Online Friends` — live presence count
- Only shows when sidebar is expanded
- Tapping it jumps to Friends tab filtered to Online

### Sidebar Clock / Session Timer
- Small monospace clock at the very bottom of the nav list
- Optionally: "Session: 42m" counter since login

### User Status Selector (sidebar footer, next to sign-out)
- Dropdown: Online / Away / Do Not Disturb / Invisible
- Writes to `presence/{uid}/status` (already used by messages + friends)
- Changes presence dot color: green / yellow / red / grey

---

## Feature Ideas

### Notifications System
- Dedicated `/notifications/{uid}/` RTDB node
- Types: `friend_request`, `message`, `game_invite`, `system`
- Unread count badge on bell icon
- Notification history panel (last 50, with timestamps)
- Per-type toggle in Settings to enable/disable

### Activity Feed (Overview section)
- `What did your friends play recently?` feed
- Writes an activity entry when a user opens/closes a game: `{ uid, game, ts }`
- Shows friend activity in a scrollable timeline on the Overview page
- "X started playing Connect 4" — 3m ago

### Custom Status Message
- Free-text field (max 60 chars) set in Profile or sidebar
- Stored at `users/{uid}/statusMsg`
- Shown in the friend list and chat header tooltip

### Achievements / Trophies
- Static JSON definition file: `data/achievements.json`
- Awarded server-side-ish (write from client, lock with rules)
- Displayed in a grid on the Profile page
- Example achievements: "Send 10 messages", "Win 5 games", "Add 3 friends"

### Game Invites
- "Invite to game" button on a friend's entry / in a DM chat header
- Creates a `/game_invites/{uid}/{inviteId}` record
- Recipient gets a notification + toast
- Accepting opens the game in a shared lobby

### Leaderboards
- Per-game `/leaderboards/{game}/{uid}` storing high score / win count
- Leaderboard panel inside each game section (top 10 global, highlight self)
- "Your rank: #7" pill

### Search (topbar)
- Magnifier icon in topbar expands into an inline search bar
- Searches: friends by username, games by name, settings keywords
- Keyboard shortcut: `Ctrl + K` / `Cmd + K`

### Keyboard Shortcuts
- `G O` — go to Overview
- `G G` — go to Games
- `G M` — go to Messages
- `G F` — go to Friends
- `Escape` — close any open panel/modal
- Shortcut reference sheet accessible from Settings

### Profile Badges Showcase
- Users can pin up to 5 earned achievement badges to display on their profile card
- Visible to friends when they view your profile

### Friends — Online Filter
- Toggle at the top of the friends list: All / Online / Pending
- Persists to localStorage

### Dark/Light Mode Toggle
- Currently dark-only; add a light variant as an opt-in in Settings → Appearance
- Uses a `data-theme="light"` attribute on `<body>` / `#dashboard-screen`

---

## Games — Roadmap

### Tier 1: Solo / Simple (build these first)

| Game | Description | Storage |
|---|---|---|
| **2048** | Slide tiles, merge numbers | localStorage (score only) |
| **Snake** | Classic snake, arrow keys | localStorage (high score) |
| **Memory Match** | Flip card pairs, track moves | localStorage (best moves) |
| **Minesweeper** | Classic grid, left/right click | localStorage (best time) |

### Tier 2: Turn-Based Multiplayer (Firebase RTDB sessions)

| Game | Description | Session node |
|---|---|---|
| **Tic Tac Toe** | 3×3, two players | `game_sessions/tictactoe/{sid}` |
| **Connect 4** | 7×6 drop grid | `game_sessions/connect4/{sid}` |
| **Rock Paper Scissors** | Best of 3 | `game_sessions/rps/{sid}` |
| **Word Duel** | Both players type a secret word; guess each other's | `game_sessions/wordduel/{sid}` |

### Tier 3: Async / Lobby-based

| Game | Description |
|---|---|
| **Trivia Quiz** | 10 questions, scored, sharable result card |
| **Chess** | Full board, RTDB move list, draw/resign |
| **Battleship** | Classic grid, async turns |

---

## First Game Recommendation: **Tic Tac Toe** (Multiplayer)

**Why start here:**
- Minimal state (9 cells, whose turn, winner)
- Clean Firebase session model — good template for all future multiplayer games
- Easy to design a nice UI that fits the existing dark theme
- Can be launched from a friend's DM (game invite flow test-bed)

**Proposed session schema (`game_sessions/tictactoe/{sid}`):**
```json
{
  "playerX": "<uid>",
  "playerO": "<uid>",
  "board"  : ["","","","","","","","",""],
  "turn"   : "X",
  "status" : "playing",   // "waiting" | "playing" | "finished"
  "winner" : null,        // "X" | "O" | "draw"
  "createdAt": 1234567890
}
```

**Files to create:**
- `js/games/tictactoe.js` — game logic + Firebase session management
- `css/dashboard/tictactoe.css` — board, cell, win-highlight styles
- HTML section inside `#section-games` or a dedicated `#section-tictactoe`

**UI plan:**
- 3×3 grid with glowing cell hover in accent color
- Player indicators (X = accent, O = red/orange)
- Win animation: winning row glows + pulses
- Rematch button writes a new session
- "Invite friend" button sends a game invite DM

---

## Tech Debt / Polish

- [ ] Unread message count badge on the Messages nav item  
- [ ] Toast notification component (reusable, used by game invites, friend accepts, etc.)
- [ ] `js/toast.js` — `showToast(msg, type, duration)` utility  
- [ ] Lazy-load game JS modules (only import when section is opened)  
- [ ] Service Worker / offline fallback page  
- [ ] `firebase-rules.json` — add `game_sessions` + `leaderboards` + `notifications` nodes  
