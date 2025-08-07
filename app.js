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
  signOut
} from './firebase.js';

// DOM элементы
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const dynamicContent = document.getElementById('dynamic-content');
const tabButtons = document.querySelectorAll('.tab-btn');
const authForm = document.getElementById('auth-form');
const signupBtn = document.getElementById('signup-btn');
const switchToLogin = document.getElementById('switch-to-login');
const logoutModal = document.getElementById('logout-modal');
const confirmLogout = document.getElementById('confirm-logout');
const cancelLogout = document.getElementById('cancel-logout');

// Структура данных для Realtime Database
const userDataTemplate = {
  name: "",
  email: "",
  tiktok: "",
  youtube: "",
  balance: 0,
  rewards: {},
  materials: {}
};

// Шаблоны контента
const sections = {
  main: `
    <div class="ios-section">
      <h2 class="ios-title">Главная</h2>
      <div class="ios-card news">
        <img src="https://via.placeholder.com/300x150?text=Reemmy+News" alt="News" class="news-image">
        <h3>Reemmy: заработать легко!</h3>
        <p>Размещайте рекламу в TikTok и YouTube и получайте доход!</p>
      </div>
      <div class="ios-card">
        <h3>Почему мы?</h3>
        <p>Прозрачная система наград, быстрые выплаты и поддержка 24/7.</p>
      </div>
      <div class="ios-card">
        <h3>Поддержка и база знаний</h3>
        <p>Получите ответы на все вопросы в нашей базе знаний или свяжитесь с поддержкой.</p>
      </div>
    </div>
  `,
  materials: `
    <div class="ios-section">
      <h2 class="ios-title">Рекламные материалы</h2>
      <div class="materials-list" id="materials-list">
        <div class="ios-card material-item">
          <h4>Реклама от Reemmy</h4>
          <p>Вставьте логотип в видео, платим 0.1 ₽ за тысячу просмотров</p>
          < Grown
          <p>Ссылка: <code>https://reemmy.ru/promo/logo</code></p>
          <div class="button-container">
            <button class="ios-button small copy-btn" data-url="https://reemmy.ru/promo/logo">Копировать</button>
          </div>
        </div>
      </div>
    </div>
  `,
  stats: `
    <div class="ios-section">
      <h2 class="ios-title">Статистика</h2>
      <div class="ios-card center-text">
        <p>Скоро тут что-то появится!</p>
      </div>
    </div>
  `,
  profile: `
    <div class="ios-section">
      <div class="profile-header">
        <button id="logout-btn" class="ios-button red small top-right">Выйти</button>
        <h2 id="profile-name">Загрузка...</h2>
        <div class="balance">
          <span>Баланс:</span>
          <strong id="profile-balance">0 ₽</strong>
        </div>
      </div>
      <div class="ios-card">
        <h3><i class="fab fa-tiktok"></i> TikTok</h3>
        <div class="input-group">
          <input type="text" id="profile-tiktok" placeholder="Введите TikTok username">
          <button class="ios-button small save-social">Сохранить</button>
        </div>
      </div>
      <div class="ios-card">
        <h3><i class="fab fa-youtube"></i> YouTube</h3>
        <div class="input-group">
          <input type="text" id="profile-youtube" placeholder="Введите YouTube channel ID">
          <button class="ios-button small save-social">Сохранить</button>
        </div>
      </div>
    </div>
  `
};

// Загрузка данных пользователя
async function loadUserData(uid) {
  const snapshot = await get(ref(db, `users/${uid}`));
  return snapshot.exists() ? snapshot.val() : null;
}

// Загрузка материалов
async function loadMaterials() {
  const materialsList = document.getElementById('materials-list');
  const snapshot = await get(ref(db, 'Materials'));
  materialsList.innerHTML = `
    <div class="ios-card material-item">
      <h4>Реклама от Reemmy</h4>
      <p>Вставьте логотип в видео, платим 0.1 ₽ за тысячу просмотров</p>
      <p>Ссылка: <code>https://reemmy.ru/promo/logo</code></p>
      <div class="button-container">
        <button class="ios-button small copy-btn" data-url="https://reemmy.ru/promo/logo">Копировать</button>
      </div>
    </div>
  `;
  if (snapshot.exists()) {
    materialsList.innerHTML += Object.entries(snapshot.val())
      .map(([id, material]) => `
        <div class="ios-card material-item">
          <h4>${material.title}</h4>
          <p>${material.description}</p>
          <p>Ссылка: <code>${material.url}</code></p>
          <div class="button-container">
            <button class="ios-button small copy-btn" data-url="${material.url}">Копировать</button>
          </div>
        </div>
      `)
      .join('');
  }
}

// Загрузка раздела
async function loadSection(sectionId, uid) {
  dynamicContent.style.opacity = '0';
  setTimeout(async () => {
    dynamicContent.innerHTML = sections[sectionId];
    dynamicContent.style.opacity = '1';
    
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionId);
    });
    
    if (sectionId === 'profile' && uid) {
      const userData = await loadUserData(uid);
      if (userData) {
        document.getElementById('profile-name').textContent = userData.name;
        document.getElementById('profile-balance').textContent = `${userData.balance || 0} ₽`;
        document.getElementById('profile-tiktok').value = userData.tiktok || "";
        document.getElementById('profile-youtube').value = userData.youtube || "";
      }
      document.getElementById('logout-btn').addEventListener('click', () => {
        logoutModal.classList.remove('hidden');
      });
      document.querySelectorAll('.save-social').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const tiktok = document.getElementById('profile-tiktok').value;
          const youtube = document.getElementById('profile-youtube').value;
          await update(ref(db, `users/${uid}`), { tiktok, youtube });
          alert('Данные сохранены!');
        });
      });
    }
    
    if (sectionId === 'materials') {
      await loadMaterials();
    }
  }, 200);
}

// Переключение на форму входа
switchToLogin.addEventListener('click', () => {
  authForm.innerHTML = `
    <div class="input-group">
      <i class="fas fa-envelope"></i>
      <input type="email" id="email" placeholder="Email" required>
    </div>
    <div class="input-group">
      <i class="fas fa-lock"></i>
      <input type="password" id="password" placeholder="Пароль" required>
    </div>
    <button id="signin-btn" class="ios-button">Войти</button>
    <button id="switch-to-signup" class="ios-button secondary">Нет аккаунта? Зарегистрироваться</button>
  `;
  document.getElementById('switch-to-signup').addEventListener('click', () => {
    authForm.innerHTML = `
      <div class="input-group">
        <i class="fas fa-user"></i>
        <input type="text" id="name" placeholder="Имя" required>
      </div>
      <div class="input-group">
        <i class="fas fa-envelope"></i>
        <input type="email" id="email" placeholder="Email" required>
      </div>
      <div class="input-group">
        <i class="fas fa-lock"></i>
        <input type="password" id="password" placeholder="Пароль" required>
      </div>
      <button id="signup-btn" class="ios-button">Зарегистрироваться</button>
      <button id="switch-to-login" class="ios-button secondary">Уже есть аккаунт? Войти</button>
    `;
    document.getElementById('switch-to-login').addEventListener('click', () => switchToLogin.click());
    signupBtn.addEventListener('click', signupHandler);
  });
  document.getElementById('signin-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      await signInWithEmailAndPassword(auth, email, password);
      alert('Вход успешен!');
    } catch (error) {
      const errorMessages = {
        'auth/wrong-password': 'Неверный пароль',
        'auth/user-not-found': 'Пользователь не найден',
        'auth/invalid-email': 'Некорректный email'
      };
      alert(errorMessages[error.code] || `Ошибка: ${error.message}`);
    }
  });
});

// Обработчик регистрации
async function signupHandler(e) {
  e.preventDefault();
  const userData = {
    ...userDataTemplate,
    name: document.getElementById('name').value,
    email: document.getElementById('email').value
  };
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      document.getElementById('password').value
    );
    await set(ref(db, `users/${userCredential.user.uid}`), userData);
    alert('Регистрация успешна!');
  } catch (error) {
    const errorMessages = {
      'auth/email-already-in-use': 'Email уже используется',
      'auth/invalid-email': 'Некорректный email',
      'auth/weak-password': 'Пароль слишком слабый'
    };
    alert(errorMessages[error.code] || `Ошибка: ${error.message}`);
  }
}

signupBtn.addEventListener('click', signupHandler);

// Инициализация
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const uid = auth.currentUser?.uid;
    if (uid) loadSection(btn.dataset.section, uid);
  });
});

// Авторизация
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

// Обработка выхода
confirmLogout.addEventListener('click', async () => {
  await signOut(auth);
  logoutModal.classList.add('hidden');
});
cancelLogout.addEventListener('click', () => {
  logoutModal.classList.add('hidden');
});

// Обработка копирования ссылок
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('copy-btn')) {
    const url = e.target.dataset.url;
    navigator.clipboard.writeText(url).then(() => {
      alert('Ссылка скопирована!');
    });
  }
});
