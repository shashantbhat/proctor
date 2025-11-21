// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAvs4fnXt2vVc7iYWFV3q69z_Z51h9ra-E",
  authDomain: "proctor-101.firebaseapp.com",
  projectId: "proctor-101",
  storageBucket: "proctor-101.firebasestorage.app",
  messagingSenderId: "337476911197",
  appId: "1:337476911197:web:a98933cd31427eed770db4",
  measurementId: "G-P19MP0SMFQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);