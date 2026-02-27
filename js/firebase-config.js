/**
 * firebase-config.js  ← REAL CREDENTIALS — never commit this file to a public repo.
 *
 * ─── WHY THE API KEY IS NOT ACTUALLY A SECRET ───────────────────────────────
 * Firebase web API keys are public identifiers, NOT passwords.
 * They are safe in client-side code because security is enforced by:
 *   1. API key HTTP-referrer restrictions  (see step 3 below)
 *   2. Firebase Security Rules             (firebase-rules.json)
 *
 * ─── HOW TO PROPERLY LOCK DOWN THIS KEY ─────────────────────────────────────
 * Step 1 — Add this file to .gitignore (already done):
 *          js/firebase-config.js
 *          Anyone cloning the repo uses js/firebase-config.example.js as the template.
 *
 * Step 2 — In Firebase Console → Authentication → Settings → Authorized Domains,
 *          add ONLY the domains that should run your app.
 *
 * Step 3 — In Google Cloud Console (console.cloud.google.com):
 *          APIs & Services → Credentials → click your Browser key → Application restrictions
 *            • Select "HTTP referrers (websites)"
 *            • Add:  yourdomain.com/*
 *                    *.yourdomain.com/*
 *                    localhost  (dev only — remove before going live)
 *          This blocks the key from being used on ANY other site.
 *
 * Step 4 — Keep Firebase Security Rules tight (firebase-rules.json).
 *          Never use  allow read, write: if true;  in production.
 */

export const firebaseConfig = {
  apiKey:            'AIzaSyDC1VUNaRjoYeTzTQGMsFH-bo1JiLEHEBA',
  authDomain:        'sentinel-53b06.firebaseapp.com',
  databaseURL:       'https://sentinel-53b06-default-rtdb.firebaseio.com',
  projectId:         'sentinel-53b06',
  storageBucket:     'sentinel-53b06.firebasestorage.app',
  messagingSenderId: '11730646650',
  appId:             '1:11730646650:web:1ceb3e884c843654326dc3',
  measurementId:     'G-Q06XQ5D3LX',
};
