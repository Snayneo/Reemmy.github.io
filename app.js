import { 
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
} from './firebase.js';

// DOM элементы
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const dynamicContent = document.getElementById('dynamic-content');
const tabButtons = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const notification = document.getElementById('notification');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const forgotPasswordLink = document.getElementById('forgot-password');
const showLoginPassword = document.getElementById('show-login-password');
const showSignupPassword = document.getElementById('show-signup-password');

// Структура данных пользователя
const userDataTemplate = {
  name: "",
  email: "",
  tiktok: "",
  youtube: "",
  balance: 0,
  rewards: {},
  materials: {}
};

// Шаблоны контента (остаются без изменений)
const sections = {
  // ... (такие же как в предыдущем коде)
};

// Показать уведомление
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.remove('hidden');
  
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

// Загрузить секцию
function loadSection(sectionName, userId = null) {
  dynamicContent.innerHTML = sections[sectionName];
  
  if (sectionName === 'profile' && userId) {
    loadProfileData(userId);
  }
  
  // Обновляем активную кнопку в таббаре
  tabButtons.forEach(btn => {
    if (btn.dataset.section === sectionName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Обработчик кнопки выхода
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      signOut(auth).then(() => {
        showNotification("Вы успешно вышли из системы");
      }).catch((error) => {
        showNotification("Ошибка при выходе", "error");
      });
    });
  }
}

// Загрузить данные профиля
async function loadProfileData(userId) {
  try {
    const snapshot = await get(ref(db, `users/${userId}`));
    if (snapshot.exists()) {
      const userData = snapshot.val();
      document.getElementById('profile-name').textContent = userData.name || "Пользователь";
      document.getElementById('profile-balance').textContent = `Баланс: ${userData.balance || 0}₽`;
    }
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
  }
}

// Переключение видимости пароля
function setupPasswordToggle(button, inputId) {
  button.addEventListener('click', () => {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
      input.type = 'text';
      button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
      input.type = 'password';
      button.innerHTML = '<i class="fas fa-eye"></i>';
    }
  });
}

// Инициализация приложения
function initApp() {
  // Настройка переключателей пароля
  setupPasswordToggle(showLoginPassword, 'login-password');
  setupPasswordToggle(showSignupPassword, 'signup-password');

  // Обработчики для переключения между вкладками авторизации
  document.getElementById('login-tab').addEventListener('click', () => {
    document.getElementById('login-tab').classList.add('active');
    document.getElementById('signup-tab').classList.remove('active');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('signup-form').classList.add('hidden');
  });
  
  document.getElementById('signup-tab').addEventListener('click', () => {
    document.getElementById('signup-tab').classList.add('active');
    document.getElementById('login-tab').classList.remove('active');
    document.getElementById('signup-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
  });
  
  // Обработчик формы входа
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoader = loginBtn.querySelector('.btn-loader');
    
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showNotification("Вход выполнен успешно");
    } catch (error) {
      let errorMessage = "Ошибка входа";
      switch(error.code) {
        case "auth/invalid-email":
          errorMessage = "Неверный формат email";
          break;
        case "auth/user-not-found":
          errorMessage = "Пользователь не найден";
          break;
        case "auth/wrong-password":
          errorMessage = "Неверный пароль";
          break;
        case "auth/too-many-requests":
          errorMessage = "Слишком много попыток. Попробуйте позже";
          break;
        default:
          errorMessage = error.message;
      }
      showNotification(errorMessage, 'error');
    } finally {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
    }
  });
  
  // Обработчик формы регистрации
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    const btnText = signupBtn.querySelector('.btn-text');
    const btnLoader = signupBtn.querySelector('.btn-loader');
    
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Сохраняем дополнительные данные пользователя
      const userData = {
        ...userDataTemplate,
        name,
        email,
        balance: 0
      };
      
      await set(ref(db, `users/${user.uid}`), userData);
      showNotification("Регистрация прошла успешно");
      
      // Переключаем на вкладку входа после успешной регистрации
      document.getElementById('login-tab').click();
    } catch (error) {
      let errorMessage = "Ошибка регистрации";
      switch(error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Email уже используется";
          break;
        case "auth/invalid-email":
          errorMessage = "Неверный формат email";
          break;
        case "auth/weak-password":
          errorMessage = "Пароль должен содержать минимум 6 символов";
          break;
        default:
          errorMessage = error.message;
      }
      showNotification(errorMessage, 'error');
    } finally {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
    }
  });

  // Восстановление пароля
  forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    
    if (!email) {
      showNotification("Введите email для восстановления пароля", "error");
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      showNotification("Письмо для сброса пароля отправлено на ваш email");
    } catch (error) {
      showNotification("Ошибка при отправке письма: " + error.message, "error");
    }
  });

  // Обработчики кнопок таббара
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      loadSection(section, auth.currentUser?.uid);
    });
  });

  // Отслеживание состояния аутентификации
  onAuthStateChanged(auth, (user) => {
    if (user) {
      authScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');
      loadSection('main', user.uid);
    } else {
      authScreen.classList.remove('hidden');
      appScreen.classList.add('hidden');
    }
  });
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);
