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
const notification = document.getElementById('notification');

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
        <img src="https://source.unsplash.com/random/600x300/?social,media" alt="Reemmy" class="card-image">
        <h3>Reemmy - зарабатывать легко!</h3>
        <p>Начните зарабатывать уже сегодня, размещая рекламу в своих соцсетях</p>
      </div>
      <div class="ios-card">
        <img src="https://source.unsplash.com/random/600x300/?money,earn" alt="Заработок" class="card-image">
        <h3><i class="fas fa-question-circle"></i> Почему мы?</h3>
        <p>Мы платим за каждые 1000 просмотров вашего видео с нашей рекламой</p>
        <ul class="benefits-list">
          <li><i class="fas fa-check-circle"></i> Высокие ставки</li>
          <li><i class="fas fa-check-circle"></i> Быстрые выплаты</li>
          <li><i class="fas fa-check-circle"></i> Поддержка 24/7</li>
        </ul>
      </div>
      <div class="ios-card">
        <img src="https://source.unsplash.com/random/600x300/?support,help" alt="Поддержка" class="card-image">
        <h3><i class="fas fa-headset"></i> Поддержка</h3>
        <p>Email: support@reemmy.ru</p>
        <p>Телефон: +7 (123) 456-78-90</p>
        <p>Telegram: @reemmy_support</p>
      </div>
    </div>
  `,
  
  materials: `
    <div class="ios-section">
      <h2 class="ios-title">Доступные задания</h2>
      <div class="materials-filters">
        <button class="filter-btn active" data-platform="all">Все</button>
        <button class="filter-btn" data-platform="tiktok">TikTok</button>
        <button class="filter-btn" data-platform="youtube">YouTube</button>
      </div>
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
        <button class="logout-btn-top" id="logout-btn-top">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
      <div class="ios-card">
        <h3><i class="fab fa-tiktok"></i> TikTok</h3>
        <p id="profile-tiktok">Не указан</p>
        <input type="text" id="tiktok-input" placeholder="@username" class="profile-input">
        <button class="ios-button small" id="save-tiktok">
          <span class="btn-text">Сохранить</span>
          <span class="btn-loader hidden"><i class="fas fa-spinner fa-spin"></i></span>
        </button>
      </div>
      <div class="ios-card">
        <h3><i class="fab fa-youtube"></i> YouTube</h3>
        <p id="profile-youtube">Не указан</p>
        <input type="text" id="youtube-input" placeholder="ID канала" class="profile-input">
        <button class="ios-button small" id="save-youtube">
          <span class="btn-text">Сохранить</span>
          <span class="btn-loader hidden"><i class="fas fa-spinner fa-spin"></i></span>
        </button>
      </div>
      <button class="ios-button danger" id="logout-btn">
        <i class="fas fa-sign-out-alt"></i> Выйти из аккаунта
      </button>
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
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Ошибка загрузки материалов:", error);
    showNotification("Ошибка загрузки заданий", "error");
    return null;
  }
}

// Отображение материалов с фильтрацией
async function displayMaterials(filterPlatform = 'all') {
  const materialsList = document.getElementById('materials-list');
  materialsList.innerHTML = `
    <div class="loading-placeholder">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Загрузка заданий...</p>
    </div>
  `;

  const materials = await loadMaterials();
  
  if (!materials) {
    materialsList.innerHTML = `
      <div class="ios-card">
        <p>Ошибка загрузки заданий. Попробуйте позже.</p>
      </div>
    `;
    return;
  }

  if (Object.keys(materials).length === 0) {
    materialsList.innerHTML = `
      <div class="ios-card">
        <p>Нет доступных заданий</p>
      </div>
    `;
    return;
  }

  let filteredMaterials = Object.entries(materials);
  
  if (filterPlatform !== 'all') {
    filteredMaterials = filteredMaterials.filter(([_, material]) => 
      material.platform === filterPlatform
    );
  }

  if (filteredMaterials.length === 0) {
    materialsList.innerHTML = `
      <div class="ios-card">
        <p>Нет заданий для выбранной платформы</p>
      </div>
    `;
    return;
  }

  materialsList.innerHTML = filteredMaterials.map(([id, material]) => `
    <div class="ios-card material-item" data-id="${id}" data-platform="${material.platform || 'other'}">
      <div class="material-badge ${material.platform || 'other'}">
        ${material.platform === 'tiktok' ? '<i class="fab fa-tiktok"></i>' : 
          material.platform === 'youtube' ? '<i class="fab fa-youtube"></i>' : ''}
      </div>
      <h3>${material.title || 'Рекламное задание'}</h3>
      <p>${material.description || 'Разместите рекламу в своем контенте'}</p>
      <p><strong>Платформа:</strong> ${material.platform ? material.platform.charAt(0).toUpperCase() + material.platform.slice(1) : 'Любая'}</p>
      <p><strong>Вознаграждение:</strong> ${material.reward || 0.1}₽ за 1к просмотров</p>
      ${material.url ? `<p><a href="${material.url}" target="_blank" class="material-link">Ссылка на рекламные материалы</a></p>` : ''}
      <div class="material-actions">
        <button class="ios-button small take-btn">
          <span class="btn-text">Принять задание</span>
          <span class="btn-loader hidden"><i class="fas fa-spinner fa-spin"></i></span>
        </button>
      </div>
    </div>
  `).join('');

  // Обработчики для кнопок "Принять задание"
  document.querySelectorAll('.take-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const btnText = this.querySelector('.btn-text');
      const btnLoader = this.querySelector('.btn-loader');
      
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');
      
      const materialId = this.closest('.material-item').dataset.id;
      const uid = auth.currentUser?.uid;
      
      if (uid) {
        try {
          await update(ref(db, `users/${uid}/materials`), {
            [materialId]: {
              accepted: new Date().toISOString(),
              status: 'in_progress',
              platform: materials[materialId].platform,
              reward: materials[materialId].reward,
              title: materials[materialId].title
            }
          });
          showNotification('Задание успешно принято!');
        } catch (error) {
          showNotification(`Ошибка: ${error.message}`, 'error');
        } finally {
          btnText.classList.remove('hidden');
          btnLoader.classList.add('hidden');
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
        const btn = document.getElementById('save-tiktok');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        
        const tiktok = document.getElementById('tiktok-input').value;
        if (tiktok) {
          try {
            await saveUserData(uid, { tiktok });
            document.getElementById('profile-tiktok').textContent = tiktok;
            showNotification('TikTok сохранен!');
          } catch (error) {
            showNotification(`Ошибка: ${error.message}`, 'error');
          } finally {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
          }
        }
      });
      
      document.getElementById('save-youtube').addEventListener('click', async () => {
        const btn = document.getElementById('save-youtube');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        
        const youtube = document.getElementById('youtube-input').value;
        if (youtube) {
          try {
            await saveUserData(uid, { youtube });
            document.getElementById('profile-youtube').textContent = youtube;
            showNotification('YouTube сохранен!');
          } catch (error) {
            showNotification(`Ошибка: ${error.message}`, 'error');
          } finally {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
          }
        }
      });
      
      // Выход из аккаунта
      document.getElementById('logout-btn').addEventListener('click', () => {
        if (confirm('Точно хотите выйти?')) {
          signOut(auth);
        }
      });
      
      document.getElementById('logout-btn-top').addEventListener('click', () => {
        if (confirm('Точно хотите выйти?')) {
          signOut(auth);
        }
      });
    }
  }
  
  if (sectionId === 'materials') {
    await displayMaterials();
    
    // Обработчики для фильтров
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        displayMaterials(this.dataset.platform);
      });
    });
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
  
  const submitBtn = signupForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    const userData = {
      ...userDataTemplate,
      name,
      email
    };
    
    await set(ref(db, `users/${userCredential.user.uid}`), userData);
    showNotification('Регистрация успешна! Теперь вы можете войти.');
    signupForm.reset();
  } catch (error) {
    showNotification(`Ошибка регистрации: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Зарегистрироваться';
  }
});

// Вход
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showNotification(`Ошибка входа: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Войти';
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
