import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCAsvKNtfZqN7wlvDMV_sI8Hn-6cYoGr4",
  authDomain: "reemmy-fdnbf276454rfgh-1.firebaseapp.com",
  databaseURL: "https://reemmy-fdnbf276454rfgh-1-default-rtdb.firebaseio.com",
  projectId: "reemmy-fdnbf276454rfgh-1",
  storageBucket: "reemmy-fdnbf276454rfgh-1.firebasestorage.app",
  messagingSenderId: "1013780844206",
  appId: "1:1013780844206:web:7fc8af82eecf80ee04673f",
  measurementId: "G-7EMR3G2TN9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Export functions
export { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut };
