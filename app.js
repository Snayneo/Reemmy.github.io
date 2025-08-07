import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from './firebase.js';

// DOM элементы
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const profileScreen = document.getElementById('profile-screen');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const profileEmail = document.getElementById('profile-email');
const logoutBtns = document.querySelectorAll('#logout-nav-btn, #logout-nav-btn-2');
const navBtns = document.querySelectorAll('.nav-btn');

// Переключение между экранами
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.add('hidden');
  });
  document.getElementById(screenId).classList.remove('hidden');
  
  // Обновление активных кнопок навигации
  navBtns.forEach(btn => {
    if (btn.dataset.screen === screenId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Обработчики навигации
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.screen) {
      showScreen(btn.dataset.screen);
    }
  });
});

// Проверка состояния аутентификации
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Пользователь вошел в систему
    authScreen.classList.add('hidden');
    showScreen('main-screen');
    profileEmail.textContent = user.email;
  } else {
    // Пользователь вышел из системы
    showScreen('auth-screen');
  }
});

// Вход
loginBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert(error.message);
  }
});

// Регистрация
signupBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;
  
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert('Регистрация прошла успешно!');
  } catch (error) {
    alert(error.message);
  }
});

// Выход
logoutBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      alert(error.message);
    }
  });
});

// Переход в профиль при клике на карточку
document.getElementById('profile-card').addEventListener('click', () => {
  showScreen('profile-screen');
});
