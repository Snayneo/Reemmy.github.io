// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔐 Firebase конфиг — из консоли Firebase
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

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Экспортируем функции
export { auth };

export async function registerUser(email, password) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function loginUser(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}
