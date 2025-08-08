import { 
  auth, 
  db,
  ref,
  set,
  get,
  update,
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

// Шаблон пользователя
const userDataTemplate = {
  name: "",
  email: "",
  balance: 0,
  rewards: {},
  materials: {}
};

// Шаблоны секций
const sections = {
  main: `
    <div class="ios-section">
      <h2 class="ios-title">Главная</h2>
      <div class="ios-card news-card">
        <img src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1074&q=80" alt="Reemmy" class="card-image">
        <h3>Reemmy - зарабатывать легко!</h3>
        <p>Начните зарабатывать уже сегодня, размещая рекламу в своих соцсетях</p>
      </div>
      <div class="ios-card">
        <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1170&q=80" alt="Заработок" class="card-image">
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
          <div id="support-message" class="support-message">Загрузка сообщения поддержки...</div>
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

// Уведомления
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.remove('hidden');
  setTimeout(() => notification.classList.add('hidden'), 3000);
}

// Загрузка секций
function loadSection(sectionName, userId = null) {
  dynamicContent.innerHTML = sections[sectionName];
  if (sectionName === 'profile' && userId) loadProfileData(userId);
  if (sectionName === 'materials') loadSupportMessage();

  tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionName));

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      signOut(auth).then(() => showNotification("Вы вышли из системы")).catch(() => showNotification("Ошибка при выходе", "error"));
    });
  }
}

// Загрузка данных профиля
async function loadProfileData(userId) {
  try {
    const snapshot = await get(ref(db, `users/${userId}`));
    if (snapshot.exists()) {
      const userData = snapshot.val();
      document.getElementById('profile-name').textContent = userData.name || "Пользователь";
      document.getElementById('profile-email').textContent = `Email: ${userData.email}`;
      document.getElementById('profile-balance').textContent = `Баланс: ${userData.balance || 0}₽`;
    }
  } catch {
    showNotification("Ошибка загрузки профиля", "error");
  }
}

// Загрузка сообщения поддержки для заданий
async function loadSupportMessage() {
  try {
    const snapshot = await get(ref(db, `supportMessages/taskMessage`));
    document.getElementById('support-message').textContent = snapshot.exists() ? snapshot.val() : "Нет сообщений поддержки";
  } catch {
    document.getElementById('support-message').textContent = "Ошибка загрузки сообщения";
  }
}

// Переключение видимости пароля
function setupPasswordToggle(button, inputId) {
  button.addEventListener('click', () => {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    button.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
  });
}

// Общий обработчик формы
function handleFormSubmit(form, btn, action) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    await action().finally(() => {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
    });
  });
}

// Инициализация
function initApp() {
  setupPasswordToggle(showLoginPassword, 'login-password');
  setupPasswordToggle(showSignupPassword, 'signup-password');

  // Переключатели вкладок авторизации
  document.getElementById('login-tab').addEventListener('click', () => {
    loginForm.reset();
    document.getElementById('login-tab').classList.add('active');
    document.getElementById('signup-tab').classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  });
  document.getElementById('signup-tab').addEventListener('click', () => {
    signupForm.reset();
    document.getElementById('signup-tab').classList.add('active');
    document.getElementById('login-tab').classList.remove('active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });

  // Логин
  handleFormSubmit(loginForm, loginBtn, async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showNotification("Вход выполнен");
    } catch (error) {
      const errors = {
        "auth/invalid-email": "Неверный email",
        "auth/user-not-found": "Пользователь не найден",
        "auth/wrong-password": "Неверный пароль",
        "auth/too-many-requests": "Слишком много попыток. Попробуйте позже"
      };
      showNotification(errors[error.code] || error.message, "error");
    }
  });

  // Регистрация
  handleFormSubmit(signupForm, signupBtn, async () => {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await set(ref(db, `users/${userCredential.user.uid}`), { ...userDataTemplate, name, email });
      showNotification("Регистрация успешна");
      document.getElementById('login-tab').click();
    } catch (error) {
      const errors = {
        "auth/email-already-in-use": "Email уже используется",
        "auth/invalid-email": "Неверный email",
        "auth/weak-password": "Пароль минимум 6 символов"
      };
      showNotification(errors[error.code] || error.message, "error");
    }
  });

  // Восстановление пароля
  forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    if (!email) return showNotification("Введите email для восстановления", "error");
    try {
      await sendPasswordResetEmail(auth, email);
      showNotification("Письмо для сброса отправлено");
    } catch (err) {
      showNotification("Ошибка: " + err.message, "error");
    }
  });

  // Таббар
  tabButtons.forEach(btn => btn.addEventListener('click', () => loadSection(btn.dataset.section, auth.currentUser?.uid)));

  // Аутентификация
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

document.addEventListener('DOMContentLoaded', initApp);
