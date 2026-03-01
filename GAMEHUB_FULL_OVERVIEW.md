# GameHUB: Complete Technical & Feature Overview

## Project Summary
GameHUB is a private, social gaming platform built by TFG CO (The Floor Guys Co.), a joke coding company created by Blake and Sam. GameHUB is designed for friends to play games, chat, manage profiles, and interact with an AI assistant. The platform is web-based, mobile-friendly, and leverages Firebase for authentication, real-time database, and user management. It also integrates Groq's Llama 3 AI for the TFG-AI assistant.

---

## Table of Contents
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Games](#games)
- [AI Chatbot (TFG-AI)](#ai-chatbot-tfg-ai)
- [Authentication & User Management](#authentication--user-management)
- [Friends System](#friends-system)
- [Messages & Notifications](#messages--notifications)
- [Profile & Settings](#profile--settings)
- [Admin/Developer Console](#admindeveloper-console)
- [UI/UX & Responsive Design](#uiux--responsive-design)
- [Firebase Integration](#firebase-integration)
- [Groq AI Integration](#groq-ai-integration)
- [Branding & TFG CO Lore](#branding--tfg-co-lore)
- [Deployment & Hosting](#deployment--hosting)
- [File/Module Reference](#filemodule-reference)
- [Notable Code Patterns](#notable-code-patterns)
- [Known Issues & TODOs](#known-issues--todos)

---

## Project Structure
```
/ (root)
├── index.html
├── css/
│   ├── shared.css
│   ├── loading.css
│   ├── responsive.css
│   └── dashboard/
│       ├── dashboard.css
│       ├── ... (per-section CSS)
│       └── chatbot.css
├── js/
│   ├── dashboard.js
│   ├── auth.js
│   ├── ... (per-section JS)
│   └── chatbot.js
├── games/
│   ├── multifilegame/
│   └── singlefilegame/
├── img/
│   └── TFGCO.png, ...
├── firebase-config.js
├── firebase-rules.json
├── IDEAS.md
└── ...
```

---

## Core Features
- **Game Library:** Play built-in games (AI Sudoku, Blockie Tower Defense, AI Quiz Generator)
- **Friends:** Add/search users, see online status, manage friend requests
- **Messages:** Real-time private chat with friends
- **Profile:** Avatar, bio, stats, account info
- **Settings:** Appearance, account, password, theme
- **AI Chat:** TFG-AI assistant (Groq Llama 3)
- **Notifications:** Real-time, in-app
- **Admin Console:** For owner (Blake) only
- **Mobile Responsive:** Full mobile and desktop support

---

## Games
- **AI Sudoku:** Classic sudoku with AI solver
- **Blockie Tower Defense:** Wave-based tower defense game
- **AI Quiz Generator:** Custom trivia quizzes using AI
- **Game Registration:** Games are registered in the dashboard and can be single-file or multi-file

---

## AI Chatbot (TFG-AI)
- **Powered by Groq Llama 3 (8B Instant)** with optional vision support
- **Vision images:** Users can upload images; chatbot sends them to a Groq vision model. If the vision model is deprecated or inaccessible the system automatically falls back to the text-only model and flattens any image history to text.
- **System prompt includes:**
  - TFG CO lore (not a real flooring company)
  - Project history (School Messenger, AIOE, GameHUB)
  - Rules: never claim to be a founder/human, always refer to Blake and Sam as co-founders
  - Mental health disclaimer
- **Features:**
  - Image attachment & preview
  - Preset prompt chips
  - Consent dialogs for actions
  - Panel switching and friend add via AI
  - Mobile-friendly, input bar always pinned
  - Typing indicator, avatars, error handling

---

## Authentication & User Management
- **Firebase Auth:** Email/password login, registration, password reset
- **User profiles:** Stored in Firebase RTDB
- **Presence:** Online/away/dnd/invisible, managed via RTDB
- **Logout:** Manual and inactivity auto-logout (20 min)

---

## Friends System
- **Add/search users by username**
- **Friend requests:** Managed in RTDB
- **Online status:** Real-time
- **Friend list:** Displayed in dashboard

---

## Messages & Notifications
- **Real-time private chat:** Firebase RTDB
- **Mobile back button for chat**
- **Notifications:** In-app, real-time

---

## Profile & Settings
- **Profile:** Avatar, username, email, join date, stats
- **Settings:**
  - Appearance (theme/accent)
  - Password change (with re-auth)
  - Account info

---

## Admin/Developer Console
- **Visible only to Blake (OWNER)**
- **Role management:** Grant/revoke roles
- **Security:** Double-checked by Firebase rules

---

## UI/UX & Responsive Design
- **Modern, terminal-inspired UI**
- **Section-based dashboard:** Each feature in its own panel
- **Responsive:**
  - Sidebar collapses on mobile
  - Bottom nav for <600px
  - Touch targets, mobile topbar, mobile sign-out
  - AI chat input bar always pinned
- **CSS:** Modular, per-section, with global shared/responsive

---

## Firebase Integration
- **Modular SDK v10.14.0**
- **Auth, RTDB, presence, user data, friends, messages**
- **Rules:** See `firebase-rules.json`

---

## Groq AI Integration
- **Groq API endpoint:** Llama 3.1 8B Instant
- **API key:** Encoded in code (see `chatbot.js`)
- **System prompt:** Dynamic, includes user/friends/games context

---

## Branding & TFG CO Lore
- **TFG CO:** Joke coding company, not a real flooring business
- **Co-founders:** Blake and Sam
- **Project history:** School Messenger, AIOE, GameHUB
- **Logo:** `img/TFGCO.png` used for AI avatar and branding

---

## Deployment & Hosting
- **Static site:** GitHub Pages compatible
- **No server-side code**
- **All logic in JS, all data in Firebase**

---

## File/Module Reference
- **index.html:** Main entry, dashboard sections, script/style includes
- **css/**: All styles (shared, loading, responsive, dashboard, per-section)
- **js/**: All logic (dashboard, auth, per-section, chatbot, responsive)
- **games/**: Game source files (multi-file and single-file)
- **img/**: Branding, avatars, icons
- **firebase-config.js:** Firebase project config
- **firebase-rules.json:** Security rules
- **IDEAS.md:** Project ideas and notes

---

## Notable Code Patterns
- **Section switching:** Generic, via `switchSection()` in `dashboard.js`
- **Event-driven:** Custom events for user-ready, section switch, etc.
- **Consent dialogs:** For AI actions
- **Mobile layout:** CSS media queries, JS class toggles
- **Admin gating:** Owner-only panels
- **AI system prompt:** Dynamic, context-aware, with strict rules

---

## Known Issues & TODOs
- AI chat panel: Now resets/cleans up on section switch
- AI identity: Now never claims to be a founder/human
- Mobile: Fully responsive, but further tweaks possible
- TODO: Add more games, improve admin tools, expand notifications

---

*This document was generated by scanning the entire GameHUB codebase as of February 28, 2026.*
