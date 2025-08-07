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
  balance: 0,
  rewards: {},
  materials: {}
};

// Шаблоны контента
const sections = {
  main: `
    <div class="ios-section">
      <h2 class="ios-title">Главная</h2>
      <div class="ios-card news-card">
        <img src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80" alt="Reemmy" class="card-image">
        <h3>Reemmy - зарабатывать легко!</h3>
        <p>Начните зарабатывать уже сегодня, размещая рекламу в своих соцсетях</p>
      </div>
      <div class="ios-card">
        <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" alt="Заработок" class="card-image">
        <h3><i class="fas fa-question-circle"></i> Почему мы?</h3>
        <p>Мы платим за каждые 1000 просмотров вашего видео с нашей рекламой</p>
        <ul class="benefits-list">
          <li><i class="fas fa-check-circle"></i> Высокие ставки</li>
          <li><i class="fas fa-check-circle"></i> Быстрые выплаты</li>
          <li><i class="fas fa-check-circle"></i> Поддержка 24/7</li>
        </ul>
      </div>
    </div>
  `,
  materials: `
    <div class="ios-section">
      <h2 class="ios-title">Доступные задания</h2>
      <div class="task-list">
        <div class="task-card">
          <div class="task-header">
            <h3><i class="fas fa-ad"></i> Реклама приложения</h3>
            <span class="task-reward">+500₽</span>
          </div>
          <p>Разместите рекламу нашего приложения в своем TikTok</p>
          <button class="ios-button small">Взять задание</button>
        </div>
      </div>
    </div>
  `,
  stats: `
    <div class="ios-section">
      <h2 class="ios-title">Ваша статистика</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">0</div>
          <div class="stat-label">Выполнено заданий</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">0₽</div>
          <div class="stat-label">Текущий баланс</div>
        </div>
      </div>
    </div>
  `,
  profile: `
    <div class="ios-section">
      <h2 class="ios-title">Ваш профиль</h2>
      <div class="profile-header">
        <div class="avatar">
          <i class="fas fa-user-circle"></i>
        </div>
        <div class="profile-info">
          <h3 id="profile-name">Гость</h3>
          <p id="profile-email">Email: loading...</p>
          <p id="profile-balance">Баланс: 0₽</p>
        </div>
      </div>
      <div class="profile-actions">
        <button class="ios-button" id="logout-btn"><i class="fas fa-sign-out-alt"></i> Выйти</button>
      </div>
    </div>
  `
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
      document.getElementById('profile-email').textContent = `Email: ${userData.email}`;
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
      
      // Очищаем форму регистрации
      signupForm.reset();
      
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
