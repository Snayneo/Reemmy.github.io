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
      <div class="ios-card">
        <h3><i class="fas fa-info-circle"></i> О сервисе</h3>
        <p>Зарабатывайте на размещении рекламы в TikTok и YouTube</p>
      </div>
    </div>
  `,
  
  materials: `
    <div class="ios-section">
      <h2 class="ios-title">Рекламные материалы</h2>
      <div class="materials-list" id="materials-list">
        <!-- Материалы будут загружаться из базы -->
      </div>
    </div>
  `,
  
  stats: `
    <div class="ios-section">
      <h2 class="ios-title">Статистика</h2>
      <div class="rewards-list" id="rewards-list">
        <!-- Награды будут загружаться из базы -->
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
      </div>
      
      <div class="ios-card">
        <h3><i class="fab fa-youtube"></i> YouTube</h3>
        <p id="profile-youtube">Не указан</p>
      </div>
    </div>
  `
};

// Загрузка данных пользователя
async function loadUserData(uid) {
  const snapshot = await get(ref(db, `users/${uid}`));
  return snapshot.exists() ? snapshot.val() : null;
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
    }
  }
  
  if (sectionId === 'stats' && uid) {
    const userData = await loadUserData(uid);
    const rewardsList = document.getElementById('rewards-list');
    if (userData?.rewards) {
      rewardsList.innerHTML = Object.entries(userData.rewards)
        .map(([id, reward]) => `
          <div class="ios-card reward-item">
            <h4>${reward.video_id}</h4>
            <p>+${reward.amount} ₽ (${new Date(reward.timestamp).toLocaleDateString()})</p>
          </div>
        `)
        .join('');
    }
  }
  
  if (sectionId === 'materials') {
    const materialsList = document.getElementById('materials-list');
    // Здесь можно загружать материалы из /materials в базе
    materialsList.innerHTML = `
      <div class="ios-card material-item">
        <h4>Реклама приложения (TikTok)</h4>
        <p>Ссылка: <code>https://reemmy.ru/promo/tiktok</code></p>
        <button class="ios-button small copy-btn">Копировать</button>
      </div>
    `;
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
document.getElementById('signup-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  
  const userData = {
    ...userDataTemplate,
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    tiktok: document.getElementById('tiktok').value,
    youtube: document.getElementById('youtube').value
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
    alert(`Ошибка: ${error.message}`);
  }
});
