// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCAsvKNtfZqN7wlvDMV_sI8Hn-6cYoGr4",
  authDomain: "reemmy-fdnbf276454rfgh-1.firebaseapp.com",
  databaseURL: "https://reemmy-fdnbf276454rfgh-1-default-rtdb.firebaseio.com",
  projectId: "reemmy-fdnbf276454rfgh-1",
  storageBucket: "reemmy-fdnbf276454rfgh-1.appspot.com",
  messagingSenderId: "1013780844206",
  appId: "1:1013780844206:web:7fc8af82eecf80ee04673f",
  measurementId: "G-7EMR3G2TN9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Регистрация с записью в базу
async function registerUser(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await set(ref(db, 'users/' + cred.user.uid), {
    email,
    money: 0,
    social: ''
  });
  return cred;
}

// Вход
async function loginUser(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// Получить данные
async function getUserData(uid) {
  const snapshot = await get(ref(db, 'users/' + uid));
  if (snapshot.exists()) return snapshot.val();
  else return {};
}

// Обновить соцсеть
async function updateUserSocial(uid, social) {
  await update(ref(db, 'users/' + uid), { social });
}

export { auth, db, registerUser, loginUser, getUserData, updateUserSocial };
