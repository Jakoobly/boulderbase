import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const fallback = {
  apiKey: 'AIzaSyA4avZG3Xr2bPU0oZ-iF2KDAL-AfxSKVoo',
  authDomain: 'boulderbase-c1613.firebaseapp.com',
  projectId: 'boulderbase-c1613',
  storageBucket: 'boulderbase-c1613.firebasestorage.app',
  messagingSenderId: '1050778706307',
  appId: '1:1050778706307:web:d119c202233ac488f2d6b6',
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallback.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallback.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallback.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallback.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallback.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallback.appId,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
