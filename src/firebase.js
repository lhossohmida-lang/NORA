/**
 * Firebase bootstrap — Afnan store
 *
 * Exports `auth` and `db` singletons used everywhere in the app.
 * Project ID: nora-144b1
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDRoWbA33FReJvPhnLtpcf9SnWVcQvV56c',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'nora-144b1.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'nora-144b1',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'nora-144b1.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '188647187523',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:188647187523:web:62a809403e5bfd959560f6',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-NDM9TRTH0L',
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
