// app/utils/firebase.client.ts

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvs4fnXt2vVc7iYWFV3q69z_Z51h9ra-E",
  authDomain: "proctor-101.firebaseapp.com",
  projectId: "proctor-101",
  storageBucket: "proctor-101.firebasestorage.app",
  messagingSenderId: "337476911197",
  appId: "1:337476911197:web:a98933cd31427eed770db4",
  measurementId: "G-P19MP0SMFQ"
};

// 👇 Initialize ONCE — avoid remix dev HMR crashes
let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const firebaseApp = app;
export const firebaseDb = getFirestore(app);