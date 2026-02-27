/**
 * firebase-config.example.js  ← TEMPLATE — safe to commit.
 *
 * To set up:
 *   1. Copy this file to js/firebase-config.js
 *   2. Replace each placeholder with your real values from Firebase Console →
 *      Project Settings → Your apps → SDK setup and configuration.
 *   3. Restrict the API key to your domain in Google Cloud Console →
 *      APIs & Services → Credentials → your Browser key → HTTP referrers.
 */

export const firebaseConfig = {
  apiKey:            'PASTE_YOUR_API_KEY_HERE',
  authDomain:        'your-app.firebaseapp.com',
  databaseURL:       'https://your-app-default-rtdb.firebaseio.com',
  projectId:         'your-app',
  storageBucket:     'your-app.firebasestorage.app',
  messagingSenderId: '000000000000',
  appId:             '1:000000000000:web:xxxxxxxxxxxxxxxx',
  measurementId:     'G-XXXXXXXXXX',      // optional — Analytics only
};
