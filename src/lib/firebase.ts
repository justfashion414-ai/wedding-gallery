import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';

const env = (import.meta as any).env || {};

// Built-in defaults so the app always boots; Netlify env vars (VITE_FIREBASE_*) override these when set.
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyBcY0RK6oQuP6n_sG3PEWvpFaSM2uxyfIE',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'wedding-gallery-9187b.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'wedding-gallery-9187b',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'wedding-gallery-9187b.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '911650912020',
  appId: env.VITE_FIREBASE_APP_ID || '1:911650912020:web:4aaa35c9006eaa4f7b7401',
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent IndexedDB local cache for offline PWA support
let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    'ire-akari-database'
  );
} catch {
  firestoreDb = getFirestore(app, 'ire-akari-database');
}

export const db = firestoreDb;
export const auth = getAuth(app);

export default app;
