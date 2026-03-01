/**
 * dashboard.js — Main dashboard controller
 *
 * Responsibilities:
 *   - Auth guard via onAuthStateChanged
 *   - Show dashboard on login, redirect to auth on logout
 *   - Sidebar navigation between sections
 *   - Populate user data (greeting, profile)
 *   - Logout
 *   - Delegate section init to overview.js, games.js, etc.
 */

import { auth, db }                                 from './auth.js';
import { onAuthStateChanged, signOut,
         updatePassword, deleteUser,
         EmailAuthProvider,
         reauthenticateWithCredential }              from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { ref, get, set, update, push, onDisconnect,
         serverTimestamp }                           from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';
import { setNotifyPresence }                        from './notifications.js';

// ── DOM refs ───────────────────────────────────────────────────
const dashScreen    = document.getElementById('dashboard-screen');
const authScreen    = document.getElementById('auth-screen');
const loadingScreen = document.getElementById('loading-screen');
const dashContent   = document.querySelector('.dash-content');
const greetingName  = document.getElementById('dash-greeting-name');

// Guard: only act on auth-state changes once the loading screen has resolved.
let _appLoaded = false;
window.addEventListener('login-screen-ready', () => { _appLoaded = true; }, { once: true });
const sectionTitle = document.getElementById('dash-section-title');

// ── Navigation ─────────────────────────────────────────────────
const navItems = document.querySelectorAll('.dash-nav-item[data-section]');
const sections = document.querySelectorAll('.dash-section');

const SECTION_LABELS = {
  overview: 'Overview',
  games   : 'Game Library',
  profile : 'Profile',
  friends : 'Friends',
  messages: 'Messages',
  settings: 'Settings',
  aichat  : 'AI Chat',
};

function switchSection(name) {
  navItems.forEach(el => el.classList.toggle('active', el.dataset.section === name));
  sections.forEach(el => el.classList.toggle('active', el.id === `section-${name}`));
  if (sectionTitle) sectionTitle.textContent = SECTION_LABELS[name] ?? name;
  // Messages section gets full-height borderless layout
  dashContent?.classList.toggle('section-messages-active', name === 'messages');
  // AI Chat section — same treatment so the feed scrolls internally
  dashContent?.classList.toggle('section-aichat-active', name === 'aichat');
  // Let modules react to section changes
  window.dispatchEvent(new CustomEvent('dashboard:section', { detail: { name } }));
}

navItems.forEach(item => {
  item.addEventListener('click',   () => switchSection(item.dataset.section));
  item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchSection(item.dataset.section); } });
});

// ── Sidebar collapse toggle ───────────────────────────────────────────────
(function initCollapse() {
  const COLLAPSE_KEY = 'gh_sidebar_collapsed';
  const logoBtn      = document.getElementById('sidebar-brand-logo');
  if (localStorage.getItem(COLLAPSE_KEY) === '1') {
    dashScreen.classList.add('sidebar-collapsed');
  }
  logoBtn?.addEventListener('click', () => {
    const next = !dashScreen.classList.contains('sidebar-collapsed');
    dashScreen.classList.toggle('sidebar-collapsed', next);
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
    // Keep settings sidebar-style buttons in sync
    document.querySelectorAll('.sidebar-style-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.sidebar === (next ? 'collapsed' : 'expanded'))
    );
  });
})();

// ── Logout ─────────────────────────────────────────────────────────────
let _presenceRef = null;   // stored in populateUser; used for explicit offline on logout
async function _doLogout() {
  try {
    if (_presenceRef) {
      await onDisconnect(_presenceRef).cancel().catch(() => {});
      await set(_presenceRef, { status: 'offline', ts: Date.now() }).catch(() => {});
      _presenceRef = null;
    }
    window.dispatchEvent(new CustomEvent('dashboard:logout'));
    await signOut(auth);
  } catch (_err) {
    try { await signOut(auth); } catch (_) {}
  }
}
document.getElementById('btn-logout')?.addEventListener('click', _doLogout);
document.getElementById('mobile-btn-logout')?.addEventListener('click', _doLogout);

// ── Populate user data ─────────────────────────────────────────
async function populateUser(user) {
  // Load profile from RTDB
  let profile = null;
  try {
    const snap = await get(ref(db, `users/${user.uid}`));
    profile = snap.exists() ? snap.val() : null;
  } catch (_) {}

  // Load role from authoritative /roles path (server-controlled, never user-writable)
  try {
    const roleSnap = await get(ref(db, `roles/${user.uid}`));
    const rv  = roleSnap.exists() ? roleSnap.val() : null;
    const role = rv
      ? (typeof rv === 'string' ? rv.toLowerCase() : (rv?.role?.toLowerCase() ?? 'user'))
      : 'user';
    if (profile) profile.role = role;
    else profile = { role };
  } catch (_) {
    if (profile && !profile.role) profile.role = 'user';
    else if (!profile) profile = { role: 'user' };
  }

  const displayName = profile?.username ?? user.displayName ?? 'Operator';

  // Topbar greeting
  if (greetingName) greetingName.textContent = displayName;

  // Mobile topbar avatar + name
  const mobileAvatar = document.getElementById('mobile-topbar-avatar');
  const mobileName   = document.getElementById('mobile-topbar-name');
  if (mobileAvatar) mobileAvatar.textContent = displayName[0].toUpperCase();
  if (mobileName)   mobileName.textContent   = displayName;

  // ── Profile section ──────────────────────────────────────
  const el = id => document.getElementById(id);

  const avatarLetter = el('profile-avatar-letter');
  const usernameEl   = el('profile-display-username');
  const emailEl      = el('profile-display-email');
  const joinedEl     = el('profile-display-joined');
  const uidEl        = el('profile-display-uid');

  if (avatarLetter) avatarLetter.textContent  = displayName[0].toUpperCase();
  if (usernameEl)   usernameEl.textContent    = profile?.username ?? displayName;
  const usernameElR = el('profile-display-username-r');
  if (usernameElR)  usernameElR.textContent   = profile?.username ?? displayName;
  if (emailEl)      emailEl.textContent       = profile?.email    ?? user.email;
  if (uidEl)        uidEl.textContent         = user.uid;
  if (joinedEl && profile?.createdAt) {
    joinedEl.textContent = new Date(profile.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } else if (joinedEl) {
    joinedEl.textContent = '—';
  }

  // ── Overview welcome ──────────────────────────────────────
  const welcomeName = el('overview-welcome-name');
  if (welcomeName) welcomeName.textContent = displayName;

  // ── Settings account info ────────────────────────────────
  const sInfoUser   = el('settings-info-username');
  const sInfoEmail  = el('settings-info-email');
  const sInfoJoined = el('settings-info-joined');
  if (sInfoUser)   sInfoUser.textContent   = profile?.username ?? displayName;
  if (sInfoEmail)  sInfoEmail.textContent  = user.email;
  if (sInfoJoined && profile?.createdAt) {
    sInfoJoined.textContent = new Date(profile.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  } else if (sInfoJoined) { sInfoJoined.textContent = '—'; }

  // Dispatch sub-module inits
  window.dispatchEvent(new CustomEvent('dashboard:user-ready', { detail: { user, profile } }));

  // Flush any pending Sentinel events to RTDB
  window.snl?.sync(user.uid, db, ref, push);
  // Better presence: respect saved status so DND / invisible persist across refreshes
  const presenceStatus = (['online','away','dnd','invisible'].includes(profile?.status))
    ? profile.status
    : 'online';
  _presenceRef = ref(db, `presence/${user.uid}`);
  await set(_presenceRef, { status: presenceStatus, ts: Date.now(), uid: user.uid }).catch(() => {});
  // Invisible and DND users go offline normally on disconnect
  await onDisconnect(_presenceRef).set({ status: 'offline', ts: serverTimestamp(), uid: user.uid }).catch(() => {});
  // Notify module needs to know current status for toast gating
  setNotifyPresence(presenceStatus);
}

// ── Settings: appearance ──────────────────────────────────────
const ACCENT_KEY = 'gh_accent';
(function initAppearance() {
  // Accent swatches
  const swatches = document.querySelectorAll('.appearance-swatch');
  const saved    = localStorage.getItem(ACCENT_KEY) ?? 'cyan';
  function applyAccent(name) {
    document.documentElement.dataset.accent = name;
    swatches.forEach(s => s.classList.toggle('active', s.dataset.accent === name));
    localStorage.setItem(ACCENT_KEY, name);
  }
  applyAccent(saved);
  swatches.forEach(s => s.addEventListener('click', () => applyAccent(s.dataset.accent)));

  // Sidebar style buttons mirror the collapse state
  const styleBtns = document.querySelectorAll('.sidebar-style-btn');
  const CKEY = 'gh_sidebar_collapsed';
  function syncStyleBtns() {
    const collapsed = dashScreen.classList.contains('sidebar-collapsed');
    styleBtns.forEach(b => b.classList.toggle('active', b.dataset.sidebar === (collapsed ? 'collapsed' : 'expanded')));
  }
  syncStyleBtns();
  styleBtns.forEach(b => b.addEventListener('click', () => {
    const wantCollapsed = b.dataset.sidebar === 'collapsed';
    dashScreen.classList.toggle('sidebar-collapsed', wantCollapsed);
    localStorage.setItem(CKEY, wantCollapsed ? '1' : '0');
    syncStyleBtns();
  }));
})();

// ── Settings: change password ──────────────────────────────────
(function initSettings() {
  const form    = document.getElementById('settings-pw-form');
  const msgEl   = document.getElementById('settings-pw-msg');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const current = document.getElementById('settings-pw-current')?.value;
    const next    = document.getElementById('settings-pw-new')?.value;
    const confirm = document.getElementById('settings-pw-confirm')?.value;

    if (!current || !next || !confirm) return showMsg('All fields are required.', false);
    if (next.length < 8)               return showMsg('New password must be at least 8 characters.', false);
    if (next !== confirm)              return showMsg('Passwords do not match.', false);

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    try {
      const user       = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, next);
      form.reset();
      showMsg('Password updated successfully.', true);
    } catch (err) {
      const msgs = {
        'auth/wrong-password'        : 'Current password is incorrect.',
        'auth/too-many-requests'     : 'Too many attempts. Please wait.',
        'auth/requires-recent-login' : 'Please sign out and sign in again before changing your password.',
      };
      showMsg(msgs[err.code] ?? 'Something went wrong. Please try again.', false);
    } finally {
      submitBtn.disabled = false;
    }
  });

  function showMsg(text, success) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className   = `settings-msg visible settings-msg--${success ? 'success' : 'error'}`;
    setTimeout(() => msgEl.classList.remove('visible'), 5000);
  }
})();

// ── Admin / Developer console ──────────────────────────────────────────────────
// Visible ONLY to the authorised account.  All other sessions get a Sentinel log
// and the panel is never revealed.  Grant actions are double-checked server-side
// by Firebase rules (OWNER-only write on /roles).
const _ADMIN_USER = 'blake';   // canonical lowercase username of the authorised operator

let _adminInit = false;
window.addEventListener('dashboard:user-ready', async ({ detail: { user, profile } }) => {
  const panelEl  = document.getElementById('settings-group-devconsole');
  const navDevBtn = document.getElementById('settings-nav-developer');
  const tabDevPanel = document.getElementById('settings-panel-developer');

  // Hard gate — identity check against the stored DB username
  const dbUsername = (profile?.username ?? '').toLowerCase();
  if (dbUsername !== _ADMIN_USER) {
    // Ensure the panel stays hidden for every non-authorised user
    if (panelEl)     panelEl.hidden = true;
    if (navDevBtn)   navDevBtn.hidden = true;
    if (tabDevPanel) tabDevPanel.hidden = true;
    return;
  }

  // Authorised — reveal the nav item and panel
  if (navDevBtn)   navDevBtn.hidden   = false;
  if (tabDevPanel) tabDevPanel.hidden = false;
  if (panelEl)     panelEl.hidden     = false;

  // Read current role and update badge
  const rs   = await get(ref(db, `roles/${user.uid}`)).catch(() => null);
  const role = rs?.val() ?? 'USER';
  const myRoleEl  = document.getElementById('admin-my-role');
  const roleBadge = document.getElementById('admin-role-badge');
  if (myRoleEl)  myRoleEl.textContent  = role;
  if (roleBadge) { roleBadge.textContent = role; roleBadge.dataset.role = role.toLowerCase(); }

  if (_adminInit) return;
  _adminInit = true;

  const grantBtn = document.getElementById('admin-grant-btn');
  if (!grantBtn) return;
  grantBtn.addEventListener('click', async () => {
    const cur = auth.currentUser;
    if (!cur) return;

    // Runtime re-verify: even with the panel open, re-confirm identity before every write
    const recheck = await get(ref(db, `users/${cur.uid}/username`)).catch(() => null);
    if ((recheck?.val() ?? '').toLowerCase() !== _ADMIN_USER) {
      // Log the unauthorised attempt via Sentinel
      window.snl?.record('unauth_admin', { uid: cur.uid, ts: Date.now() });
      _showAdminMsg('Access denied.', false);
      return;
    }

    const usernameInput = document.getElementById('admin-grant-user');
    const roleSelect    = document.getElementById('admin-grant-role');
    const username      = (usernameInput?.value ?? '').trim().toLowerCase();
    const newRole       = roleSelect?.value ?? 'USER';
    if (!username) { _showAdminMsg('Enter a username.', false); return; }
    grantBtn.disabled = true;
    try {
      const lookupSnap = await get(ref(db, `usernames/${username}`));
      if (!lookupSnap.exists()) { _showAdminMsg('User not found.', false); return; }
      const targetUid = lookupSnap.val();
      await Promise.all([
        set(ref(db, `roles/${targetUid}`), newRole),
        update(ref(db, `users/${targetUid}`), { role: newRole }),
      ]);
      _showAdminMsg(`✓ ${newRole} granted to ${username}`, true);
      if (usernameInput) usernameInput.value = '';
      if (targetUid === cur.uid) {
        if (myRoleEl)  myRoleEl.textContent  = newRole;
        if (roleBadge) { roleBadge.textContent = newRole; roleBadge.dataset.role = newRole.toLowerCase(); }
      }
    } catch (err) {
      // Log permission-denied writes as a Sentinel security event
      if (err?.code === 'PERMISSION_DENIED' || /permission/i.test(err?.message ?? '')) {
        window.snl?.record('unauth_admin', { uid: cur.uid, err: err.code, ts: Date.now() });
      }
      _showAdminMsg(
        (err?.code === 'PERMISSION_DENIED' || /permission/i.test(err?.message ?? ''))
          ? 'Permission denied — make sure your account has OWNER in Firebase Console.'
          : `Error: ${err?.message ?? 'Unknown error'}`,
        false,
      );
    } finally { grantBtn.disabled = false; }
  });
});

function _showAdminMsg(text, success) {
  const msgEl = document.getElementById('admin-msg');
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.className   = `settings-msg visible settings-msg--${success ? 'success' : 'error'}`;
  setTimeout(() => msgEl.classList.remove('visible'), 5000);
}

// ── Inactivity auto-logout ─────────────────────────────────────
const INACTIVITY_MS = 20 * 60 * 1000;   // 20 min
const WARN_BEFORE   =  2 * 60 * 1000;   //  2 min warning

let _inactivityTimer  = null;
let _warnTimer        = null;
let _warnInterval     = null;
let _overlayEl        = null;

function _removeOverlay() {
  if (_overlayEl) { _overlayEl.remove(); _overlayEl = null; }
  clearInterval(_warnInterval);
  _warnInterval = null;
}

function _showInactivityWarning() {
  _removeOverlay();
  let secsLeft = Math.round(WARN_BEFORE / 1000);

  _overlayEl = document.createElement('div');
  _overlayEl.className = 'inactivity-overlay';
  _overlayEl.innerHTML = `
    <div class="inactivity-box">
      <p class="inactivity-overlay-title">Still there?</p>
      <p style="font-size:11px;margin:0">You'll be signed out in <span class="inactivity-overlay-countdown" id="inactivity-countdown">${secsLeft}</span>s due to inactivity.</p>
      <button class="dash-btn dash-btn--primary" id="inactivity-stay">Stay Signed In</button>
    </div>`;
  document.body.appendChild(_overlayEl);

  _overlayEl.querySelector('#inactivity-stay').addEventListener('click', _resetInactivity);

  _warnInterval = setInterval(() => {
    secsLeft--;
    const el = document.getElementById('inactivity-countdown');
    if (el) el.textContent = secsLeft;
    if (secsLeft <= 0) { clearInterval(_warnInterval); signOut(auth).catch(() => {}); }
  }, 1000);
}

function _resetInactivity() {
  _removeOverlay();
  clearTimeout(_inactivityTimer);
  clearTimeout(_warnTimer);

  _warnTimer = setTimeout(_showInactivityWarning, INACTIVITY_MS - WARN_BEFORE);
  _inactivityTimer = setTimeout(() => signOut(auth).catch(() => {}), INACTIVITY_MS);
}

// Bind activity events once
['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(ev =>
  document.addEventListener(ev, () => { if (_inactivityTimer) _resetInactivity(); }, { passive: true })
);

// ── Settings tab switching ─────────────────────────────────────────────────────
(function _initSettingsTabs() {
  const navItems = document.querySelectorAll('.settings-nav-item[data-stab]');
  if (!navItems.length) return;

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.stab;
      // Update nav active state
      navItems.forEach(b => b.classList.toggle('active', b === btn));
      // Update panel active state
      document.querySelectorAll('.settings-panel[id^="settings-panel-"]').forEach(panel => {
        panel.classList.toggle('active', panel.id === `settings-panel-${tab}`);
      });
    });
  });
})();

// ── Delete account ─────────────────────────────────────────────────────────────
document.getElementById('btn-delete-account')?.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;

  const confirmed = window.confirm(
    'Are you sure you want to permanently delete your account?\n\nThis will remove all your data and cannot be undone.'
  );
  if (!confirmed) return;

  const pw = window.prompt('Please enter your password to confirm:');
  if (!pw) return;

  try {
    // Re-authenticate before deletion
    const cred = EmailAuthProvider.credential(user.email, pw);
    await reauthenticateWithCredential(user, cred);

    const uid = user.uid;

    // Wipe RTDB data
    await Promise.all([
      set(ref(db, `users/${uid}`),                null),
      set(ref(db, `roles/${uid}`),                null),
      set(ref(db, `presence/${uid}`),             null),
      set(ref(db, `user_conversations/${uid}`),   null),
      set(ref(db, `friend_requests/${uid}`),       null),
      set(ref(db, `friends/${uid}`),               null),
      set(ref(db, `achievements/${uid}`),          null),
      set(ref(db, `notifications/${uid}`),         null),
    ]);

    // Remove Firebase Auth account
    await deleteUser(user);
  } catch (err) {
    if (err?.code === 'auth/wrong-password') {
      alert('Incorrect password. Account not deleted.');
    } else {
      alert(`Could not delete account: ${err?.message ?? 'Unknown error'}`);
    }
  }
});

// ── Auth guard ─────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // If the loading screen is still running, it will reveal auth-screen itself
    // via the login-screen-ready event. Do nothing here — avoid a collision.
    if (!_appLoaded) return;

    // Post-logout: loading is already done, dashboard is visible → fade it out
    // then fade auth screen back in.
    dashScreen.classList.remove('dash-visible');
    setTimeout(() => {
      dashScreen.setAttribute('hidden', '');

      // Auth screen has page-fade-out (opacity:0 forwards-fill) from when the
      // user logged in. Remove hidden so it's in the layout at opacity:0, then
      // strip page-fade-out and fade it in with auth-screen--reenter.
      authScreen.classList.remove('auth-screen--reenter'); // clear stale class
      authScreen.removeAttribute('hidden');

      // Double rAF so the browser paints the element before starting the anim.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          authScreen.classList.remove('page-fade-out');
          authScreen.classList.add('auth-screen--reenter');
          // Signal login.js to reinitialise canvases and reset form state.
          window.dispatchEvent(new CustomEvent('auth:returning'));
        });
      });
    }, 450);
    return;
  }

  // Signed in — show dashboard
  authScreen.classList.remove('auth-screen--reenter'); // clear any stale fade-in state
  authScreen.classList.add('page-fade-out');
  authScreen.setAttribute('hidden', '');

  dashScreen.removeAttribute('hidden');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => dashScreen.classList.add('dash-visible'));
  });

  switchSection('overview');
  await populateUser(user);
  // Start inactivity timer once user is confirmed signed in
  _resetInactivity();
});
