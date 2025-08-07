import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Конфигурация Firebase (ваши данные уже вставлены)
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

// Регистрация нового пользователя
export async function registerUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    let errorMessage = "Ошибка регистрации";
    switch(error.code) {
      case 'auth/email-already-in-use':
        errorMessage = "Email уже используется";
        break;
      case 'auth/invalid-email':
        errorMessage = "Некорректный email";
        break;
      case 'auth/weak-password':
        errorMessage = "Пароль слишком простой (минимум 6 символов)";
        break;
    }
    return { success: false, error: errorMessage };
  }
}

// Вход пользователя
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    let errorMessage = "Ошибка входа";
    switch(error.code) {
      case 'auth/user-not-found':
        errorMessage = "Пользователь не найден";
        break;
      case 'auth/wrong-password':
        errorMessage = "Неверный пароль";
        break;
      case 'auth/invalid-email':
        errorMessage = "Некорректный email";
        break;
    }
    return { success: false, error: errorMessage };
  }
}

// Выход пользователя
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Ошибка выхода" };
  }
}

// Проверка состояния аутентификации
export function checkAuthState(callback) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}
// Экспорт auth для других нужд
export { auth };
