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
  avatar: "",
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
        <div class="avatar-container">
          <img id="profile-avatar" class="avatar" src="" alt="Аватар">
          <label class="avatar-upload">
            <i class="fas fa-camera"></i>
            <input type="file" id="avatar-upload" accept="image/*">
          </label>
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

// Загрузка комментариев к заданию
async function loadComments(materialId, userId) {
  try {
    const snapshot = await get(ref(db, `materials/${materialId}/comments/${userId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Ошибка загрузки комментариев:", error);
    return null;
  }
}

// Загрузка изображения на ImgBB
async function uploadImageToImgBB(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=1e56db850ecdc3cd2c8ac1e73dac0eb8`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    if (data.success) {
      return data.data.url;
    } else {
      throw new Error(data.error?.message || 'Ошибка загрузки изображения');
    }
  } catch (error) {
    console.error('Ошибка загрузки изображения:', error);
    throw error;
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
    const isAccepted = userData?.materials?.[id];
    const isCompleted = isAccepted?.status === 'completed';
    const isInReview = isAccepted?.status === 'review';
    
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
        ` : isInReview ? `
          <button class="ios-button small in-progress-btn" disabled>
            <i class="fas fa-hourglass-half"></i> На проверке
          </button>
        ` : isAccepted ? `
          <button class="ios-button small review-btn" data-id="${id}">
            <i class="fas fa-paper-plane"></i> Отправить на проверку
          </button>
          <button class="ios-button small in-progress-btn" disabled>
            <i class="fas fa-hourglass-half"></i> В процессе
          </button>
        ` : `
          <button class="ios-button small take-btn" data-id="${id}">
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
      
      const materialId = this.dataset.id;
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

  // Обработчики для кнопок "Отправить на проверку"
  document.querySelectorAll('.review-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const materialId = this.dataset.id;
      openCommentModal(materialId);
    });
  });

  // Обработчики фильтров
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      displayMaterials(this.dataset.platform);
    });
  });
}

// Модальное окно для комментариев
let currentMaterialId = null;
let screenshotUrl = null;

function openCommentModal(materialId) {
  currentMaterialId = materialId;
  screenshotUrl = null;
  
  document.getElementById('comment-text').value = '';
  document.getElementById('screenshot-preview').innerHTML = '';
  document.getElementById('screenshot-preview').classList.add('hidden');
  
  const modal = document.getElementById('comment-modal');
  modal.classList.remove('hidden');
}

function closeCommentModal() {
  const modal = document.getElementById('comment-modal');
  modal.classList.add('hidden');
}

// Инициализация модального окна
function initCommentModal() {
  const modal = document.getElementById('comment-modal');
  const closeBtn = document.querySelector('.close-modal');
  const submitBtn = document.getElementById('submit-review');
  const screenshotInput = document.getElementById('screenshot-upload');
  const screenshotPreview = document.getElementById('screenshot-preview');
  
  closeBtn.addEventListener('click', closeCommentModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeCommentModal();
    }
  });
  
  screenshotInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка изображения...';
        
        const url = await uploadImageToImgBB(file);
        screenshotUrl = url;
        
        screenshotPreview.innerHTML = `<img src="${url}" alt="Скриншот">`;
        screenshotPreview.classList.remove('hidden');
        
        showNotification('Изображение успешно загружено');
      } catch (error) {
        showNotification('Ошибка загрузки изображения', 'error');
        console.error(error);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить на проверку';
      }
    }
  });
  
  submitBtn.addEventListener('click', async () => {
    const comment = document.getElementById('comment-text').value;
    const uid = auth.currentUser?.uid;
    
    if (!comment) {
      showNotification('Пожалуйста, оставьте комментарий', 'error');
      return;
    }
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
      
      const reviewData = {
        comment,
        screenshot: screenshotUrl || '',
        date: new Date().toISOString(),
        status: 'pending'
      };
      
      await update(ref(db, `users/${uid}/materials/${currentMaterialId}`), {
        status: 'review'
      });
      
      await set(ref(db, `materials/${currentMaterialId}/comments/${uid}`), reviewData);
      
      showNotification('Задание отправлено на проверку!');
      closeCommentModal();
      displayMaterials();
    } catch (error) {
      showNotification(`Ошибка: ${error.message}`, 'error');
      console.error(error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить на проверку';
    }
  });
}

// Обновление аватара пользователя
function initAvatarUpload() {
  const avatarUpload = document.getElementById('avatar-upload');
  const profileAvatar = document.getElementById('profile-avatar');
  
  avatarUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        showNotification('Загрузка аватара...');
        const url = await uploadImageToImgBB(file);
        
        const uid = auth.currentUser?.uid;
        await update(ref(db, `users/${uid}`), { avatar: url });
        
        profileAvatar.src = url;
        showNotification('Аватар успешно обновлен!');
      } catch (error) {
        showNotification('Ошибка загрузки аватара', 'error');
        console.error(error);
      }
    }
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

  statsContainer.innerHTML = `
    <div class="stats-summary">
      <div class="stat-card">
        <h3>Всего заданий</h3>
        <p>${Object.keys(userData.materials).length}</p>
      </div>
      <div class="stat-card">
        <h3>Выполнено</h3>
        <p>${Object.values(userData.materials).filter(m => m.status === 'completed').length}</p>
      </div>
      <div class="stat-card">
        <h3>В процессе</h3>
        <p>${Object.values(userData.materials).filter(m => m.status === 'in_progress').length}</p>
      </div>
      <div class="stat-card">
        <h3>На проверке</h3>
        <p>${Object.values(userData.materials).filter(m => m.status === 'review').length}</p>
      </div>
    </div>
    <div class="tasks-list">
      <h3>Ваши задания</h3>
      ${Object.entries(userData.materials).map(([id, task]) => `
        <div class="task-item ${task.status}">
          <div class="task-info">
            <h4>${task.title}</h4>
            <p>Принято: ${new Date(task.accepted).toLocaleDateString()}</p>
            <p>Просмотров: ${task.views || 0}</p>
            <p>Заработано: ${task.earnings || 0}₽</p>
          </div>
          <div class="task-status">
            ${task.status === 'completed' ? `
              <span class="status-badge completed"><i class="fas fa-check-circle"></i> Выполнено</span>
            ` : task.status === 'review' ? `
              <span class="status-badge"><i class="fas fa-hourglass-half"></i> На проверке</span>
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
        // Здесь можно добавить логику проверки выполнения задания
        // Пока просто отмечаем как выполненное и начисляем вознаграждение
        const reward = userData.materials[taskId].reward || 0.1;
        const views = 1000; // Примерное количество просмотров
        
        await update(ref(db, `users/${uid}`), {
          [`materials/${taskId}/status`]: 'completed',
          [`materials/${taskId}/views`]: views,
          [`materials/${taskId}/earnings`]: reward,
          balance: (userData.balance || 0) + reward
        });
        
        showNotification(`Задание выполнено! Начислено ${reward}₽`);
        displayStats(uid);
      } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'error');
      } finally {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
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
      
      const avatar = document.getElementById('profile-avatar');
      avatar.src = userData.avatar || 'https://i.ibb.co/7QZKSnC/default-avatar.png';
      avatar.onerror = () => {
        avatar.src = 'https://i.ibb.co/7QZKSnC/default-avatar.png';
      };
      
      // Инициализация загрузки аватара
      initAvatarUpload();
      
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
            showNotification('TikTok успешно сохранен');
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
            showNotification('YouTube успешно сохранен');
          } catch (error) {
            showNotification(`Ошибка: ${error.message}`, 'error');
          } finally {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
          }
        }
      });
      
      // Обработчик выхода
      document.getElementById('logout-btn-top').addEventListener('click', async () => {
        try {
          await signOut(auth);
          showNotification('Вы успешно вышли');
          authScreen.classList.remove('hidden');
          appScreen.classList.add('hidden');
        } catch (error) {
          showNotification(`Ошибка выхода: ${error.message}`, 'error');
        }
      });
    }
  } else if (sectionId === 'materials') {
    displayMaterials();
  } else if (sectionId === 'stats' && uid) {
    displayStats(uid);
  }
}

// Инициализация приложения
function initApp() {
  // Инициализация модального окна для комментариев
  initCommentModal();
  
  // Обработчики вкладок
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.section;
      const uid = auth.currentUser?.uid;
      loadSection(sectionId, uid);
    });
  });
  
  // Обработчик формы входа
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showNotification('Вход выполнен успешно');
    } catch (error) {
      showNotification(`Ошибка входа: ${error.message}`, 'error');
    }
  });
  
  // Обработчик формы регистрации
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Сохраняем дополнительные данные пользователя
      const userData = {
        ...userDataTemplate,
        name,
        email,
        uid: user.uid
      };
      
      await set(ref(db, `users/${user.uid}`), userData);
      
      // Обновляем профиль в Firebase Auth
      await updateProfile(user, {
        displayName: name
      });
      
      showNotification('Регистрация прошла успешно!');
      
      // Переключаемся на вкладку входа
      document.getElementById('login-tab').click();
    } catch (error) {
      showNotification(`Ошибка регистрации: ${error.message}`, 'error');
    }
  });
  
  // Переключение между вкладками входа/регистрации
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
  
  // Отслеживание состояния аутентификации
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Пользователь вошел в систему
      authScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');
      loadSection('main', user.uid);
    } else {
      // Пользователь вышел
      authScreen.classList.remove('hidden');
      appScreen.classList.add('hidden');
    }
  });
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);
