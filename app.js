import { 
  auth, 
  db,
  ref,
  set,
  get,
  update,
  push,
  child,
  remove,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from './firebase.js';

// DOM элементы
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const dynamicContent = document.getElementById('dynamic-content');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const notification = document.getElementById('notification');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');

// Инициализация приложения
function initApp() {
  // Переключение между формами входа/регистрации
  showSignup.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    showSignup.parentElement.classList.add('hidden');
    showLogin.parentElement.classList.remove('hidden');
  });

  showLogin.addEventListener('click', () => {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    showLogin.parentElement.classList.add('hidden');
    showSignup.parentElement.classList.remove('hidden');
  });

  // Обработчики форм
  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);

  // Проверка состояния аутентификации
  onAuthStateChanged(auth, (user) => {
    if (user) {
      authScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');
      loadSection('main');
    } else {
      authScreen.classList.remove('hidden');
      appScreen.classList.add('hidden');
    }
  });
}

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

// Загрузка материалов
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

// Проверить привязку соцсетей
function checkSocialLinks(userData, platform) {
  if (platform === 'tiktok') return !!userData.tiktok;
  if (platform === 'youtube') return !!userData.youtube;
  return true;
}

// Отображение материалов
async function displayMaterials(filterPlatform = 'all') {
  const materialsList = document.getElementById('materials-list');
  materialsList.innerHTML = `<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i><p>Загрузка заданий...</p></div>`;

  const materials = await loadMaterials();
  const uid = auth.currentUser?.uid;
  const userData = uid ? await loadUserData(uid) : null;
  
  if (!materials) {
    materialsList.innerHTML = `<div class="ios-card"><p>Ошибка загрузки заданий</p></div>`;
    return;
  }

  let filteredMaterials = Object.entries(materials);
  if (filterPlatform !== 'all') {
    filteredMaterials = filteredMaterials.filter(([_, material]) => 
      material.platform === filterPlatform
    );
  }

  materialsList.innerHTML = filteredMaterials.map(([id, material]) => {
    const userMaterial = userData?.materials?.[id];
    const isCompleted = userMaterial?.status === 'completed';
    const isRejected = userMaterial?.status === 'rejected';
    const isInProgress = userMaterial?.status === 'in_progress';
    const hasSocialLink = checkSocialLinks(userData, material.platform);

    return `
    <div class="ios-card material-item" data-id="${id}">
      <h3>${material.title}</h3>
      <p>${material.description}</p>
      <p><strong>Платформа:</strong> ${material.platform === 'tiktok' ? 'TikTok' : 'YouTube'}</p>
      <p><strong>Вознаграждение:</strong> ${material.reward}₽ за 1к просмотров</p>
      
      ${isRejected ? `
        <div class="moderator-comment">
          <p class="rejected-status">Отклонено</p>
          <p>${userMaterial.moderatorComment || 'Причина не указана'}</p>
          <button class="resubmit-btn" data-id="${id}">
            Отправить повторно
          </button>
        </div>
      ` : ''}
      
      <div class="material-actions">
        ${isCompleted ? `
          <button class="completed-btn" disabled>
            <i class="fas fa-check-circle"></i> Выполнено
          </button>
        ` : isInProgress ? `
          <button class="in-progress-btn" disabled>
            <i class="fas fa-hourglass-half"></i> В процессе
          </button>
        ` : `
          <button class="take-btn" data-id="${id}" ${!hasSocialLink ? 'disabled' : ''}>
            Принять задание
          </button>
          ${!hasSocialLink ? `
            <p class="platform-warning">
              Для принятия задания привяжите ${material.platform === 'tiktok' ? 'TikTok' : 'YouTube'} в профиле
            </p>
          ` : ''}
        `}
      </div>
    </div>
    `;
  }).join('');

  // Обработчики кнопок
  document.querySelectorAll('.take-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const materialId = btn.dataset.id;
      await takeMaterial(materialId);
      displayMaterials(filterPlatform);
    });
  });

  document.querySelectorAll('.resubmit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const materialId = btn.dataset.id;
      await resubmitMaterial(materialId);
      displayMaterials(filterPlatform);
    });
  });

  // Показываем предупреждения
  document.querySelectorAll('.take-btn[disabled]').forEach(btn => {
    btn.parentElement.querySelector('.platform-warning').style.display = 'block';
  });
}

// Принять задание
async function takeMaterial(materialId) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    await set(ref(db, `users/${uid}/materials/${materialId}`), {
      status: "in_progress",
      timestamp: Date.now()
    });
    showNotification("Задание принято!");
  } catch (error) {
    showNotification("Ошибка принятия задания", "error");
  }
}

// Отправить повторно
async function resubmitMaterial(materialId) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    await update(ref(db, `users/${uid}/materials/${materialId}`), {
      status: "in_progress",
      moderatorComment: null
    });
    showNotification("Задание отправлено на повторную проверку!");
  } catch (error) {
    showNotification("Ошибка отправки задания", "error");
  }
}

// Загрузка профиля
async function loadProfile() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const userData = await loadUserData(uid);
  if (!userData) return;

  dynamicContent.innerHTML = `
    <div class="ios-section">
      <div class="profile-header">
        <img id="profile-avatar" class="avatar" src="https://www.gravatar.com/avatar/?d=mp" alt="Аватар">
        <h2 id="profile-name">${userData.name || "Пользователь"}</h2>
        <div class="balance">
          <span>Баланс:</span>
          <strong id="profile-balance">${userData.balance || 0} ₽</strong>
        </div>
      </div>
      <div class="ios-card">
        <h3><i class="fab fa-tiktok"></i> Привязать TikTok</h3>
        <p id="profile-tiktok">${userData.tiktok || "Не привязан"}</p>
        <input type="text" id="tiktok-input" placeholder="@username" class="profile-input" value="${userData.tiktok || ''}">
        <button class="ios-button small" id="save-tiktok">
          Сохранить
        </button>
      </div>
      <div class="ios-card">
        <h3><i class="fab fa-youtube"></i> Привязать YouTube</h3>
        <p id="profile-youtube">${userData.youtube || "Не привязан"}</p>
        <input type="text" id="youtube-input" placeholder="ID канала" class="profile-input" value="${userData.youtube || ''}">
        <button class="ios-button small" id="save-youtube">
          Сохранить
        </button>
      </div>
      <button class="ios-button danger" id="logout-btn">
        <i class="fas fa-sign-out-alt"></i> Выйти
      </button>
    </div>
  `;

  // Обработчики сохранения
  document.getElementById('save-tiktok').addEventListener('click', async () => {
    const tiktok = document.getElementById('tiktok-input').value.trim();
    if (!tiktok) return;

    try {
      await update(ref(db, `users/${uid}`), { tiktok });
      document.getElementById('profile-tiktok').textContent = tiktok;
      showNotification("TikTok привязан!");
    } catch (error) {
      showNotification("Ошибка сохранения", "error");
    }
  });

  document.getElementById('save-youtube').addEventListener('click', async () => {
    const youtube = document.getElementById('youtube-input').value.trim();
    if (!youtube) return;

    try {
      await update(ref(db, `users/${uid}`), { youtube });
      document.getElementById('profile-youtube').textContent = youtube;
      showNotification("YouTube привязан!");
    } catch (error) {
      showNotification("Ошибка сохранения", "error");
    }
  });

  // Выход
  document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      showNotification("Ошибка выхода", "error");
    }
  });
}

// Загрузка раздела
function loadSection(section) {
  const sections = {
    main: `
      <div class="ios-section">
        <h2 class="ios-title">Главная</h2>
        <div class="ios-card">
          <h3>Добро пожаловать в Reemmy!</h3>
          <p>Зарабатывайте на размещении рекламы в своих соцсетях</p>
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
    profile: `
      <div class="ios-section">
        <div class="loading-placeholder">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Загрузка профиля...</p>
        </div>
      </div>
    `
  };

  dynamicContent.innerHTML = sections[section];
  
  if (section === 'materials') {
    displayMaterials();
  } else if (section === 'profile') {
    loadProfile();
  }
}

// Обработчики вкладок
function setupTabButtons() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSection(btn.dataset.section);
    });
  });
}

// Обработчик входа
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showNotification("Неверный email или пароль", "error");
  }
}

// Обработчик регистрации
async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    await set(ref(db, `users/${userCredential.user.uid}`), {
      name,
      email,
      balance: 0,
      tiktok: "",
      youtube: ""
    });
    showNotification("Регистрация успешна!");
  } catch (error) {
    showNotification("Ошибка регистрации", "error");
  }
}

// Инициализация приложения
window.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupTabButtons();
});
