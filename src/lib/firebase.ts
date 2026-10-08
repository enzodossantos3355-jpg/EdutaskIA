import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, setLogLevel } from 'firebase/firestore';

// Suprime logs de depuração internos do gRPC/Listen do Firestore
try {
  setLogLevel('error');
} catch {
  // Ignora se não for suportado
}

const defaultConfig = {
  apiKey: "AIzaSyDsAo1hTSOe6Q21QcNeHmGNt650rkzBBmc",
  authDomain: "edutask-7ano-60994.firebaseapp.com",
  projectId: "edutask-7ano-60994",
  storageBucket: "edutask-7ano-60994.firebasestorage.app",
  messagingSenderId: "851306521007",
  appId: "1:851306521007:web:1eab9e88863b662fb78f5a",
  firestoreDatabaseId: "ai-studio-edutaskgestodeta-3284915b-c459-465f-8391-17d32111c03c",
};

const config = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || defaultConfig.apiKey,
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || defaultConfig.authDomain,
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || defaultConfig.projectId,
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || defaultConfig.storageBucket,
  messagingSenderId: defaultConfig.messagingSenderId,
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || defaultConfig.appId,
  firestoreDatabaseId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_DATABASE_ID) || defaultConfig.firestoreDatabaseId,
};

const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];

// Use initializeFirestore with experimentalForceLongPolling to eliminate WebChannel RPC 'Listen' transport stream errors in web/proxy environments
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, config.firestoreDatabaseId || '(default)');
} catch (e) {
  firestoreInstance = getFirestore(app, config.firestoreDatabaseId || '(default)');
}

export const db = firestoreInstance;
export const auth = getAuth(app);

