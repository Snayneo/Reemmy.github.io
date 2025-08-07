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
      <div class="ios-card">
        <img src="https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" alt="Поддержка" class="card-image">
        <h3><i class="fas fa-headset"></i> Поддержка</h3>
        <p>Email: support@reemmy.ru</p>
        <p>Телефон: +7 (123) 456-78-90</p>
        <p>Telegram: @reemmy_support</p>
      </div>
      <div class="notice-card">
        <p><strong>Важное уведомление:</strong> Reemmy — это неофициальная партнерская программа, не связанная с TikTok. Мы предоставляем рекламные материалы, вы встраиваете их в свои ролики, мы платим за просмотры. Платформа полностью бесплатна для использования.</p>
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
      <div class="stats-container" id="stats-container">
        <div class="stats-placeholder">
          <i class="fas fa-chart-line"></i>
          <p>Здесь будет отображаться статистика выполненных заданий</p>
        </div>
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
  const uid = auth.currentUser?.uid;
  const userData = uid ? await loadUserData(uid) : null;
  
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

  materialsList.innerHTML = filteredMaterials.map(([id, material]) => {
    const userMaterial = userData?.materials?.[id];
    const isAccepted = !!userMaterial;
    const isCompleted = userMaterial?.status === 'completed';
    const isPending = userMaterial?.status === 'pending';
    
    return `
    <div class="ios-card material-item" data-id="${id}" data-platform="${material.platform || 'other'}">
      <div class="material-badge ${material.platform || 'other'}">
        ${material.platform === 'tiktok' ? '<i class="fab fa-tiktok"></i>' : 
          material.platform === 'youtube' ? '<i class="fab fa-youtube"></i>' : ''}
      </div>
      <h3>${material.title || 'Рекламное задание'}</h3>
      <p class="material-description">${material.description || 'Разместите рекламу в своем контенте'}</p>
      <div class="material-details">
        <p><strong>Платформа:</strong> ${material.platform ? material.platform.charAt(0).toUpperCase() + material.platform.slice(1) : 'Любая'}</p>
        <p><strong>Вознаграждение:</strong> ${material.reward || 0.1}₽ за 1к просмотров</p>
        ${material.url ? `<p><a href="${material.url}" target="_blank" class="material-link"><i class="fas fa-external-link-alt"></i> Ссылка на материалы</a></p>` : ''}
      </div>
      <div class="material-actions">
        ${isCompleted ? `
          <button class="ios-button small completed-btn" disabled>
            <i class="fas fa-check-circle"></i> Выполнено
          </button>
        ` : isPending ? `
          <button class="ios-button small in-progress-btn" disabled>
            <i class="fas fa-hourglass-half"></i> На рассмотрении
          </button>
        ` : isAccepted ? `
          <button class="ios-button small in-progress-btn" disabled>
            <i class="fas fa-hourglass-half"></i> В процессе
          </button>
        ` : `
          <button class="ios-button small take-btn">
            <span class="btn-text">Принять задание</span>
            <span class="btn-loader hidden"><i class="fas fa-spinner fa-spin"></i></span>
          </button>
        `}
      </div>
    </div>
    `;
  }).join('');

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
              title: materials[materialId].title,
              views: 0,
              earnings: 0
            }
          });
          showNotification('Задание успешно принято!');
          displayMaterials(filterPlatform);
        } catch (error) {
          showNotification(`Ошибка: ${error.message}`, 'error');
        } finally {
          btnText.classList.remove('hidden');
          btnLoader.classList.add('hidden');
        }
      }
    });
  });

  // Обработчики для фильтров
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      displayMaterials(this.dataset.platform);
    });
  });
}

// Отображение статистики
async function displayStats(uid) {
  const statsContainer = document.getElementById('stats-container');
  statsContainer.innerHTML = `
    <div class="loading-placeholder">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Загрузка статистики...</p>
    </div>
  `;

  const userData = await loadUserData(uid);
  
  if (!userData?.materials || Object.keys(userData.materials).length === 0) {
    statsContainer.innerHTML = `
      <div class="ios-card">
        <p>У вас нет активных заданий</p>
      </div>
    `;
    return;
  }

  // Рассчитываем общую статистику
  const totalTasks = Object.keys(userData.materials).length;
  const completedTasks = Object.values(userData.materials).filter(m => m.status === 'completed').length;
  const pendingTasks = Object.values(userData.materials).filter(m => m.status === 'pending').length;
  const inProgressTasks = Object.values(userData.materials).filter(m => m.status === 'in_progress').length;
  const totalEarnings = Object.values(userData.materials).reduce((sum, m) => sum + (m.earnings || 0), 0);

  statsContainer.innerHTML = `
    <div class="stats-summary">
      <div class="stat-card">
        <h3>Всего заданий</h3>
        <p>${totalTasks}</p>
      </div>
      <div class="stat-card">
        <h3>Выполнено</h3>
        <p>${completedTasks}</p>
      </div>
      <div class="stat-card">
        <h3>В процессе</h3>
        <p>${inProgressTasks}</p>
      </div>
      <div class="stat-card">
        <h3>На рассмотрении</h3>
        <p>${pendingTasks}</p>
      </div>
      <div class="stat-card">
        <h3>Заработано</h3>
        <p>${totalEarnings.toFixed(2)}₽</p>
      </div>
    </div>
    <div class="tasks-list">
      <h3>Ваши задания</h3>
      ${Object.entries(userData.materials).map(([id, task]) => `
        <div class="task-item">
          <div class="task-info">
            <h4>${task.title}</h4>
            <p>Принято: ${new Date(task.accepted).toLocaleDateString()}</p>
            <p>Просмотров: ${task.views || 0}</p>
            <p>Заработано: ${task.earnings || 0}₽</p>
          </div>
          <div class="task-status">
            ${task.status === 'completed' ? `
              <span class="status-badge completed"><i class="fas fa-check-circle"></i> Выполнено</span>
            ` : task.status === 'pending' ? `
              <span class="status-badge pending"><i class="fas fa-clock"></i> На рассмотрении</span>
            ` : `
              <button class="ios-button small complete-btn" data-id="${id}">
                <span class="btn-text">Подтвердить выполнение</span>
                <span class="btn-loader hidden"><i class="fas fa-spinner fa-spin"></i></span>
              </button>
            `}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Обработчики для кнопок подтверждения выполнения
  document.querySelectorAll('.complete-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const btnText = this.querySelector('.btn-text');
      const btnLoader = this.querySelector('.btn-loader');
      const taskId = this.dataset.id;
      
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');
      
      try {
        // Обновляем статус задания на "на рассмотрении"
        await update(ref(db, `users/${uid}/materials/${taskId}`), {
          status: 'pending',
          submitted: new Date().toISOString()
        });
        showNotification('Задание отправлено на проверку!');
        displayStats(uid); // Обновляем статистику
      } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'error');
      } finally {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
      }
    });
  });
}
