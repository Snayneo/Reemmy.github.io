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
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');

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

  // Обработчики для кнопок принятия заданий
  document.querySelectorAll('.take-btn').forEach(button => {
    button.addEventListener('click', async function() {
      const materialId = this.getAttribute('data-id');
      const uid = auth.currentUser?.uid;
      
      if (!uid) {
        showNotification("Ошибка: пользователь не авторизован", "error");
        return;
      }

      const btnText = this.querySelector('.btn-text');
      const btnLoader = this.querySelector('.btn-loader');
      
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');
      this.disabled = true;

      try {
        // Обновляем данные пользователя
        const userRef = ref(db, `users/${uid}/materials/${materialId}`);
        await set(userRef, {
          status: "in_progress",
          timestamp: Date.now()
        });

        showNotification("Задание успешно принято!");
        displayMaterials(filterPlatform);
      } catch (error) {
        console.error("Ошибка принятия задания:", error);
        showNotification("Ошибка принятия задания", "error");
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        this.disabled = false;
      }
    });
  });

  // Обработчики для кнопок отправки на проверку
  document.querySelectorAll('.review-btn').forEach(button => {
    button.addEventListener('click', function() {
      const materialId = this.getAttribute('data-id');
      openCommentModal(materialId);
    });
  });

  // Обработчики для фильтров
  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(btn => 
        btn.classList.remove('active')
      );
      this.classList.add('active');
      const platform = this.getAttribute('data-platform');
      displayMaterials(platform);
    });
  });
}

// Открытие модального окна для комментария
function openCommentModal(materialId) {
  const modal = document.getElementById('comment-modal');
  const closeBtn = document.querySelector('.close-modal');
  const submitBtn = document.getElementById('submit-review');
  const screenshotUpload = document.getElementById('screenshot-upload');
  const screenshotPreview = document.getElementById('screenshot-preview');
  
  // Сбросить предыдущие данные
  document.getElementById('comment-text').value = '';
  screenshotPreview.innerHTML = '';
  screenshotPreview.classList.add('hidden');
  
  // Сохранить materialId в кнопке отправки
  submitBtn.setAttribute('data-id', materialId);
  
  // Показать модальное окно
  modal.classList.remove('hidden');
  
  // Обработчик закрытия
  closeBtn.onclick = function() {
    modal.classList.add('hidden');
  }
  
  // Обработчик загрузки скриншота
  screenshotUpload.onchange = function(e) {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = function(event) {
        screenshotPreview.innerHTML = `<img src="${event.target.result}" alt="Скриншот">`;
        screenshotPreview.classList.remove('hidden');
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  }
  
  // Обработчик отправки
  submitBtn.onclick = async function() {
    const commentText = document.getElementById('comment-text').value;
    const materialId = this.getAttribute('data-id');
    const uid = auth.currentUser?.uid;
    const file = screenshotUpload.files[0];
    
    if (!commentText) {
      showNotification("Пожалуйста, оставьте комментарий", "error");
      return;
    }
    
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
    
    try {
      let screenshotUrl = '';
      
      // Если есть файл, загружаем его на ImgBB
      if (file) {
        screenshotUrl = await uploadImageToImgBB(file);
      }
      
      // Обновляем статус задания
      const userRef = ref(db, `users/${uid}/materials/${materialId}`);
      await update(userRef, {
        status: "review",
        comment: commentText,
        screenshot: screenshotUrl || null,
        reviewTimestamp: Date.now()
      });
      
      showNotification("Задание отправлено на проверку!");
      modal.classList.add('hidden');
      displayMaterials();
    } catch (error) {
      console.error("Ошибка отправки задания:", error);
      showNotification("Ошибка отправки задания", "error");
    } finally {
      this.disabled = false;
      this.textContent = "Отправить на проверку";
    }
  };
}

// Загрузка профиля пользователя
async function loadProfile() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  
  const userData = await loadUserData(uid);
  if (!userData) return;
  
  // Обновляем данные в интерфейсе
  document.getElementById('profile-name').textContent = userData.name || "Без имени";
  document.getElementById('profile-balance').textContent = `${userData.balance || 0} ₽`;
  document.getElementById('profile-tiktok').textContent = userData.tiktok || "Не указан";
  document.getElementById('profile-youtube').textContent = userData.youtube || "Не указан";
  document.getElementById('tiktok-input').value = userData.tiktok || "";
  document.getElementById('youtube-input').value = userData.youtube || "";
  
  // Устанавливаем аватар
  const avatar = document.getElementById('profile-avatar');
  if (userData.avatar) {
    avatar.src = userData.avatar;
  } else {
    avatar.src = "https://www.gravatar.com/avatar/?d=mp";
  }
  
  // Обработчик загрузки аватара
  document.getElementById('avatar-upload').addEventListener('change', async function(e) {
    if (e.target.files && e.target.files[0]) {
      try {
        const file = e.target.files[0];
        const avatarUrl = await uploadImageToImgBB(file);
        
        // Обновляем аватар в Firebase
        await update(ref(db, `users/${uid}`), {
          avatar: avatarUrl
        });
        
        // Обновляем аватар в интерфейсе
        avatar.src = avatarUrl;
        showNotification("Аватар успешно обновлен!");
      } catch (error) {
        console.error("Ошибка загрузки аватара:", error);
        showNotification("Ошибка загрузки аватара", "error");
      }
    }
  });
  
  // Обработчик сохранения TikTok
  document.getElementById('save-tiktok').addEventListener('click', async function() {
    const tiktok = document.getElementById('tiktok-input').value.trim();
    const btnText = this.querySelector('.btn-text');
    const btnLoader = this.querySelector('.btn-loader');
    
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    this.disabled = true;
    
    try {
      await update(ref(db, `users/${uid}`), {
        tiktok: tiktok
      });
      
      document.getElementById('profile-tiktok').textContent = tiktok || "Не указан";
      showNotification("TikTok успешно сохранен!");
    } catch (error) {
      console.error("Ошибка сохранения TikTok:", error);
      showNotification("Ошибка сохранения TikTok", "error");
    } finally {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
      this.disabled = false;
    }
  });
  
  // Обработчик сохранения YouTube
  document.getElementById('save-youtube').addEventListener('click', async function() {
    const youtube = document.getElementById('youtube-input').value.trim();
    const btnText = this.querySelector('.btn-text');
    const btnLoader = this.querySelector('.btn-loader');
    
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    this.disabled = true;
    
    try {
      await update(ref(db, `users/${uid}`), {
        youtube: youtube
      });
      
      document.getElementById('profile-youtube').textContent = youtube || "Не указан";
      showNotification("YouTube успешно сохранен!");
    } catch (error) {
      console.error("Ошибка сохранения YouTube:", error);
      showNotification("Ошибка сохранения YouTube", "error");
    } finally {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
      this.disabled = false;
    }
  });
  
  // Обработчик выхода
  document.getElementById('logout-btn-top').addEventListener('click', async function() {
    try {
      await signOut(auth);
      showNotification("Вы успешно вышли из системы");
      authScreen.classList.remove('hidden');
      appScreen.classList.add('hidden');
    } catch (error) {
      console.error("Ошибка выхода:", error);
      showNotification("Ошибка выхода из системы", "error");
    }
  });
}

// Загрузка статистики
async function loadStats() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  
  const userData = await loadUserData(uid);
  if (!userData) return;
  
  const statsContainer = document.getElementById('stats-container');
  
  // Подсчитываем статистику
  const materials = userData.materials || {};
  const completedCount = Object.values(materials).filter(m => m.status === 'completed').length;
  const inProgressCount = Object.values(materials).filter(m => m.status === 'in_progress').length;
  const inReviewCount = Object.values(materials).filter(m => m.status === 'review').length;
  const totalEarned = userData.balance || 0;
  
  statsContainer.innerHTML = `
    <div class="stats-summary">
      <div class="stat-card">
        <h3>Выполнено</h3>
        <p>${completedCount}</p>
      </div>
      <div class="stat-card">
        <h3>В процессе</h3>
        <p>${inProgressCount}</p>
      </div>
      <div class="stat-card">
        <h3>На проверке</h3>
        <p>${inReviewCount}</p>
      </div>
      <div class="stat-card">
        <h3>Заработано</h3>
        <p>${totalEarned} ₽</p>
      </div>
    </div>
    
    <div class="tasks-list">
      <h3>Последние задания</h3>
      ${Object.entries(materials)
        .sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0))
        .slice(0, 5)
        .map(([id, material]) => `
          <div class="task-item">
            <div class="task-info">
              <h4>${id}</h4>
              <p>${new Date(material.timestamp).toLocaleDateString()}</p>
            </div>
            <div class="task-status">
              <span class="status-badge ${material.status === 'completed' ? 'completed' : ''}">
                ${material.status === 'completed' ? 'Выполнено' : 
                 material.status === 'review' ? 'На проверке' : 'В процессе'}
              </span>
            </div>
          </div>
        `).join('')}
    </div>
  `;
}

// Переключение между вкладками авторизации
loginTab.addEventListener('click', function() {
  loginTab.classList.add('active');
  signupTab.classList.remove('active');
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
});

signupTab.addEventListener('click', function() {
  signupTab.classList.add('active');
  loginTab.classList.remove('active');
  signupForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
});

// Обработчик формы входа
loginForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showNotification("Вход выполнен успешно!");
  } catch (error) {
    console.error("Ошибка входа:", error);
    showNotification("Неверный email или пароль", "error");
  }
});

// Обработчик формы регистрации
signupForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Обновляем профиль пользователя
    await updateProfile(user, {
      displayName: name
    });
    
    // Создаем запись в базе данных
    await set(ref(db, `users/${user.uid}`), {
      ...userDataTemplate,
      name: name,
      email: email
    });
    
    showNotification("Регистрация прошла успешно!");
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    showNotification("Ошибка регистрации: " + error.message, "error");
  }
});

// Переключение между разделами приложения
tabButtons.forEach(button => {
  button.addEventListener('click', function() {
    const section = this.getAttribute('data-section');
    
    // Обновляем активную кнопку
    tabButtons.forEach(btn => btn.classList.remove('active'));
    this.classList.add('active');
    
    // Загружаем соответствующий раздел
    dynamicContent.innerHTML = sections[section];
    
    // Загружаем дополнительные данные для раздела
    switch(section) {
      case 'materials':
        displayMaterials();
        break;
      case 'profile':
        loadProfile();
        break;
      case 'stats':
        loadStats();
        break;
    }
  });
});

// Инициализация приложения
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Пользователь авторизован
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    
    // Загружаем главный раздел по умолчанию
    dynamicContent.innerHTML = sections.main;
    
    // Активируем первую кнопку
    tabButtons[0].classList.add('active');
  } else {
    // Пользователь не авторизован
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }
});

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
  // Загружаем главный раздел по умолчанию
  if (auth.currentUser) {
    dynamicContent.innerHTML = sections.main;
  }
});
