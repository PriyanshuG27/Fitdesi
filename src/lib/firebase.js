/**
 * firebase.js
 * Initialises Firebase services and exports them as named singletons.
 *
 * SECURITY CONTRACT:
 * - Config values come ONLY from import.meta.env.VITE_FIREBASE_*
 * - firebaseConfig.js validates all keys at module load time
 * - GEMINI_API_KEY lives ONLY in Cloud Functions (process.env), never here
 * - This file is safe to ship in the client bundle (all keys are public by Firebase design)
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

const resolvedConfig = { ...firebaseConfig };
// Connect to local emulators ONLY if explicitly requested via environment variable or under browser automation (E2E tests)
const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === 'true' || (typeof navigator !== 'undefined' && navigator.webdriver);

if (useEmulator) {
  // Only force 'fitdesi-test' for automated Playwright E2E tests.
  // For local development, keep the project ID from env (e.g. fitdesi-74283) so it matches the local emulator project ID.
  if (typeof navigator !== 'undefined' && navigator.webdriver) {
    resolvedConfig.projectId = 'fitdesi-test';
  }
}

const app = getApps().length ? getApps()[0] : initializeApp(resolvedConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

if (useEmulator) {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    
    // Force localStorage persistence so Playwright E2E storageState works
    setPersistence(auth, browserLocalPersistence)
      .catch((err) => console.error('Failed to set localStorage persistence:', err));
  } catch (e) {
    console.error('Firebase emulators already connected or failed:', e);
  }
}

// Enable offline persistence (AFTER emulator connection)
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed-precondition (multiple tabs open)');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence unimplemented in this browser');
      }
    });
}

export { app };
