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
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

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

// Шаблоны контента
const sections = {
  main: `
    <div class="ios-section">
      <h2 class="ios-title">Главная</h2>
      <div class="ios-card news-card">
        <h3>Reemmy - зарабатывать легко!</h3>
        <p>Начните зарабатывать уже сегодня, размещая рекламу в своих соцсетях</p>
      </div>
      <div class="ios-card">
        <h3><i class="fas fa-question-circle"></i> Почему мы?</h3>
        <p>Мы платим за каждые 1000 просмотров вашего видео с нашей рекламой</p>
      </div>
      <div class="ios-card">
        <h3><i class="fas fa-headset"></i> Поддержка</h3>
        <p>Email: support@reemmy.ru</p>
      </div>
    </div>
  `,
  
  materials: `
    <div class="ios-section">
      <h2 class="ios-title">Задания</h2>
      <div class="materials-list" id="materials-list">
        <div class="loading-placeholder">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Загрузка заданий...</p>
        </div>
      </div>
    </div>
  `,
  
  stats: `
    <div class="ios-section">
      <h2 class="ios-title">Статистика</h2>
      <div class="stats-placeholder">
        <i class="fas fa-chart-line"></i>
        <p>Скоро здесь появится ваша статистика</p>
      </div>
    </div>
  `,
  
  profile: `
    <div class="ios-section">
      <div class="profile-header">
        <div class="avatar">
          <i class="fas fa-user-circle"></i>
        </div>
        <h2 id="profile-name">Загрузка...</h2>
        <div class="balance">
          <span>Баланс:</span>
          <strong id="profile-balance">0 ₽</strong>
        </div>
      </div>
      <div class="ios-card">
        <h3><i class="fab fa-tiktok"></i> TikTok</h3>
        <p id="profile-tiktok">Не указан</p>
        <input type="text" id="tiktok-input" placeholder="@username" class="profile-input">
        <button class="ios-button small" id="save-tiktok">Сохранить</button>
      </div>
      <div class="ios-card">
        <h3><i class="fab fa-youtube"></i> YouTube</h3>
        <p id="profile-youtube">Не указан</p>
        <input type="text" id="youtube-input" placeholder="ID канала" class="profile-input">
        <button class="ios-button small" id="save-youtube">Сохранить</button>
      </div>
      <button class="ios-button danger" id="logout-btn">
        <i class="fas fa-sign-out-alt"></i> Выйти из аккаунта
      </button>
    </div>
  `
};

// Загрузка данных пользователя
async function loadUserData(uid) {
  const snapshot = await get(ref(db, `users/${uid}`));
  return snapshot.exists() ? snapshot.val() : null;
}

// Сохранение данных пользователя
async function saveUserData(uid, data) {
  await update(ref(db, `users/${uid}`), data);
}

// Загрузка материалов из Firebase
async function loadMaterials() {
  try {
    const snapshot = await get(ref(db, 'Materials'));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {};
  } catch (error) {
    console.error("Ошибка загрузки материалов:", error);
    return {};
  }
}

// Отображение материалов
async function displayMaterials() {
  const materials = await loadMaterials();
  const materialsList = document.getElementById('materials-list');
  
  if (!materials || Object.keys(materials).length === 0) {
    materialsList.innerHTML = `
      <div class="ios-card">
        <p>Нет доступных заданий</p>
      </div>
    `;
    return;
  }
  
  materialsList.innerHTML = Object.entries(materials).map(([id, material]) => `
    <div class="ios-card material-item" data-id="${id}">
      <h3>${material.title || 'Рекламное задание'}</h3>
      <p>${material.description || 'Разместите рекламу в своем контенте'}</p>
      <p>Платим за 1к просмотров: <strong>${material.reward || 0.1}₽</strong></p>
      ${material.requirements ? `<p>Требования: ${material.requirements}</p>` : ''}
      <div class="material-actions">
        <button class="ios-button small take-btn">Принять задание</button>
      </div>
    </div>
  `).join('');
  
  // Обработчики для кнопок "Принять задание"
  document.querySelectorAll('.take-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const materialId = this.closest('.material-item').dataset.id;
      const uid = auth.currentUser?.uid;
      
      if (uid && confirm("Вы уверены, что хотите принять это задание?")) {
        try {
          await update(ref(db, `users/${uid}/materials`), {
            [materialId]: {
              accepted: Date.now(),
              status: 'in_progress'
            }
          });
          alert('Задание успешно принято!');
        } catch (error) {
          alert(`Ошибка: ${error.message}`);
        }
      }
    });
  });
}

// Загрузка раздела
async function loadSection(sectionId, uid) {
  dynamicContent.innerHTML = sections[sectionId];
  
  // Обновляем активную кнопку
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });
  
  // Загружаем специфичные данные
  if (sectionId === 'profile' && uid) {
    const userData = await loadUserData(uid);
    if (userData) {
      document.getElementById('profile-name').textContent = userData.name;
      document.getElementById('profile-balance').textContent = `${userData.balance || 0} ₽`;
      document.getElementById('profile-tiktok').textContent = userData.tiktok || "Не указан";
      document.getElementById('profile-youtube').textContent = userData.youtube || "Не указан";
      
      // Обработчики для сохранения соцсетей
      document.getElementById('save-tiktok').addEventListener('click', async () => {
        const tiktok = document.getElementById('tiktok-input').value;
        if (tiktok) {
          await saveUserData(uid, { tiktok });
          document.getElementById('profile-tiktok').textContent = tiktok;
          alert('TikTok сохранен!');
        }
      });
      
      document.getElementById('save-youtube').addEventListener('click', async () => {
        const youtube = document.getElementById('youtube-input').value;
        if (youtube) {
          await saveUserData(uid, { youtube });
          document.getElementById('profile-youtube').textContent = youtube;
          alert('YouTube сохранен!');
        }
      });
      
      // Выход из аккаунта
      document.getElementById('logout-btn').addEventListener('click', () => {
        if (confirm('Точно хотите выйти?')) {
          signOut(auth);
        }
      });
    }
  }
  
  if (sectionId === 'materials') {
    await displayMaterials();
  }
}

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

// Регистрация
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    const userData = {
      ...userDataTemplate,
      name,
      email
    };
    
    await set(ref(db, `users/${userCredential.user.uid}`), userData);
    alert('Регистрация успешна! Теперь вы можете войти.');
    signupForm.reset();
  } catch (error) {
    alert(`Ошибка регистрации: ${error.message}`);
  }
});

// Вход
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert(`Ошибка входа: ${error.message}`);
  }
});

// Переключение между вкладками входа и регистрации
document.getElementById('login-tab').addEventListener('click', () => {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('signup-form').classList.add('hidden');
  document.getElementById('login-tab').classList.add('active');
  document.getElementById('signup-tab').classList.remove('active');
});

document.getElementById('signup-tab').addEventListener('click', () => {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('signup-form').classList.remove('hidden');
  document.getElementById('login-tab').classList.remove('active');
  document.getElementById('signup-tab').classList.add('active');
});
