import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get,
  update,
  push,
  child
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCUR7N7nEkRJyQ8ZLtsRfdanZAgaKIXRmo",
  authDomain: "reemmy-gfbgbf6rt36t1.firebaseapp.com",
  databaseURL: "https://reemmy-gfbgbf6rt36t1-default-rtdb.firebaseio.com",
  projectId: "reemmy-gfbgbf6rt36t1",
  storageBucket: "reemmy-gfbgbf6rt36t1.firebasestorage.app",
  messagingSenderId: "242756333689",
  appId: "1:242756333689:web:21ec982f873f09492de4a8",
  measurementId: "G-62KWPB066X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export {
  auth,
  db,
  ref,
  set,
  get,
  update,
  push,
  child,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
};
