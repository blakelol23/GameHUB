/**
 * auth.js — Firebase Auth + Realtime Database operations
 *
 * Data model (Realtime Database):
 *   /users/{uid}          — user profile (owner-only read/write)
 *   /usernames/{username} — username → uid index (authenticated read, prevents duplicates)
 *
 * Passwords are NEVER stored here — Firebase Auth handles hashing internally.
 * Firestore is NOT used — this app runs entirely on the free Spark plan.
 */

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword,
         signInWithEmailAndPassword, updateProfile,
         sendPasswordResetEmail, setPersistence,
         browserLocalPersistence, browserSessionPersistence }
  from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { getDatabase, ref, get, set, runTransaction }
  from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

// ── Initialise ────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);

// ── Friendly error messages ────────────────────────────────────
const AUTH_ERRORS = {
  'auth/invalid-credential':     'Invalid email or password.',
  'auth/user-not-found':         'No account found with that email.',
  'auth/wrong-password':         'Incorrect password.',
  'auth/email-already-in-use':   'An account with this email already exists.',
  'auth/weak-password':          'Password must be at least 8 characters.',
  'auth/invalid-email':          'Please enter a valid email address.',
  'auth/too-many-requests':      'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/user-disabled':          'This account has been disabled.',
  'auth/operation-not-allowed':  'Email/password sign-in is not enabled. Contact support.',
};

export function getFriendlyError(code) {
  return AUTH_ERRORS[code] ?? 'Something went wrong. Please try again.';
}

// ── Username validation ────────────────────────────────────────
export function isValidUsername(username) {
  // 3-32 chars, letters/numbers/underscores/hyphens, no leading/trailing special
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,30}[a-zA-Z0-9]$|^[a-zA-Z0-9]{3}$/.test(username);
}

// ── Check username availability ────────────────────────────────
export async function isUsernameAvailable(username) {
  const snap = await get(ref(db, `usernames/${username.toLowerCase()}`));
  return !snap.exists();
}

// ── Register ───────────────────────────────────────────────────
/**
 * Creates a Firebase Auth user, then:
 *   1. Atomically claims /usernames/{username} via RTDB transaction
 *      (aborts if already taken — prevents race conditions)
 *   2. Writes the user profile to /users/{uid}
 */
export async function registerUser({ username, email, password }) {
  const lowerUsername = username.toLowerCase();

  // Step 1 — Create the Auth account (Firebase hashes the password internally)
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user       = credential.user;

  // Step 2 — Set display name
  await updateProfile(user, { displayName: username });

  // Step 3 — Atomically claim the username. RTDB runTransaction aborts (returns
  //           undefined) if the node already has a value, preventing duplicates.
  const usernameRef = ref(db, `usernames/${lowerUsername}`);
  const result = await runTransaction(usernameRef, (current) => {
    if (current !== null) return; // abort — username already taken
    return user.uid;
  });

  if (!result.committed) {
    // Username was snagged between availability check and registration — roll back.
    await user.delete();
    throw new Error('username-taken');
  }

  // Step 4 — Write user profile
  await set(ref(db, `users/${user.uid}`), {
    uid:       user.uid,
    username,
    email:     email.toLowerCase(),
    createdAt: Date.now(),
  });

  return user;
}

// ── Login ──────────────────────────────────────────────────────
export async function loginUser({ email, password, remember }) {
  // Set persistence: LOCAL keeps the session after browser restart, SESSION clears it
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ── Password reset ─────────────────────────────────────────────
export async function sendReset(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Get user profile from Realtime Database ──────────────────
export async function getUserProfile(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}
