/**
 * Firebase bootstrap — Afnan store
 *
 * Exports `auth` and `db` singletons used everywhere in the app.
 * Project ID: nora-3b35e
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDfn1R9GXROoyiL06mWYQtKKOTh6TkkXag',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'nora-3b35e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'nora-3b35e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'nora-3b35e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '30682239429',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:30682239429:web:740e6ab5d84308137bfbac',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-H3DXDMG7Z8',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Optional admin allowlist — comma-separated VITE_ADMIN_EMAILS.
 * If empty, ProtectedRoute treats any signed-in user as admin.
 */
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAdminUser = (user) => {
  if (!user) return false;
  if (ADMIN_EMAILS.length === 0) return true;
  return ADMIN_EMAILS.includes((user.email || '').toLowerCase());
};
