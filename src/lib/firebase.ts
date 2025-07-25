
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { type Auth, getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUES39H8RLcGXKw0FTOpczvjUpptrDaRI",
  authDomain: "feedback-flow-d3nju.firebaseapp.com",
  projectId: "feedback-flow-d3nju",
  storageBucket: "feedback-flow-d3nju.firebasestorage.app",
  messagingSenderId: "1086736095911",
  appId: "1:1086736095911:web:0f7478ee93af05eecd5982"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
// Initialize Firestore. Using initializeFirestore for more explicit control with App Check, etc. if needed later.
// For basic usage, getFirestore(app) is also fine.
const db = initializeFirestore(app, {
  // Optional: ignoreUndefinedProperties: true, // if you plan to use App Check
});


export { app, auth, db };
