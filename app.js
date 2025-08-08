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
  sendEmailVerification,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential
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

// Структура данных пользователя
const userDataTemplate = {
  name: "",
  email: "",
  tiktok: "",
  youtube: "",
  balance: 0,
  rewards: {},
  materials: {},
  avatarUrl: ""
};

// Шаблоны контента
const sections = {
  main: `
    <div class="ios-section">
      <h2 class="ios-title">Главная</h2>
      <div class="ios-card news-card">
        <img src="https://i.ibb.co/0jQ7J3T/reemmy-banner.jpg" alt="Reemmy" class="card-image">
        <h3>Reemmy - ваш заработок в соцсетях!</h3>
        <p>Монетизируйте ваш контент легко и просто с нашей платформой</p>
      </div>
      <div class="ios-card">
        <img src="https://i.ibb.co/7Yk1Z4Q/earn-money.jpg" alt="Заработок" class="card-image">
        <h3><i class="fas fa-star"></i> Преимущества</h3>
        <p>Только проверенные рекламодатели и стабильные выплаты</p>
        <ul class="benefits-list">
          <li><i class="fas fa-check-circle"></i> До 500₽ за 1000 просмотров</li>
          <li><i class="fas fa-check-circle"></i> Вывод от 100₽</li>
          <li><i class="fas fa-check-circle"></i> Поддержка 24/7</li>
        </ul>
      </div>
      <div class="notice-card">
        <p><strong>Важная информация:</strong> Reemmy — это независимая партнерская платформа. Мы предоставляем рекламные материалы, которые вы интегрируете в свой контент. Вознаграждение начисляется за подтвержденные просмотры. Участие полностью бесплатное.</p>
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
        <div class="avatar-upload">
          <img id="avatar-preview" class="avatar-preview">
          <label class="avatar-upload-btn">
            Изменить аватар
            <input type="file" id="avatar-input" accept="image/*" style="display: none;">
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
        <h3><i class="fas fa-user-edit"></i> Личные данные</h3>
        <input type="text" id="name-input" placeholder="Ваше имя" class="profile-input">
        <button class="ios-button small" id="save-name">
          <span class="btn-text">Сохранить имя</span>
        </button>
      </div>
      
      <div class="ios-card">
        <h3><i class="fab fa-tiktok"></i> Подключить TikTok</h3>
        <input type="text" id="tiktok-input" placeholder="@username" class="profile-input">
        <button class="ios-button small" id="save-tiktok">
          <span class="btn-text">Сохранить</span>
        </button>
      </div>
      
      <div class="ios-card">
        <h3><i class="fab fa-youtube"></i> Подключить YouTube</h3>
        <input type="text" id="youtube-input" placeholder="ID канала" class="profile-input">
        <button class="ios-button small" id="save-youtube">
          <span class="btn-text">Сохранить</span>
        </button>
      </div>
      
      <div class="ios-card">
        <h3><i class="fas fa-lock"></i> Безопасность</h3>
        <button class="ios-button small" id="change-password-btn">
          Сменить пароль
        </button>
      </div>
      
      <div id="email-verify-container"></div>
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

// Показать загрузку
function showLoading(message = 'Загрузка...') {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-content">
      <i class="fas fa-spinner loading-spinner"></i>
      <p>${message}</p>
    </div>
  `;
  overlay.id = 'loading-overlay';
  document.body.appendChild(overlay);
}

// Скрыть загрузку
function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
}

// Показать модальное окно подтверждения выхода
function showLogoutModal() {
  const modal = document.getElementById('logout-modal');
  modal.classList.remove('hidden');
  
  document.getElementById('logout-cancel').addEventListener('click', () => {
    modal.classList.add('hidden');
  }, { once: true });
  
  document.getElementById('logout-confirm').addEventListener('click', async () => {
    modal.classList.add('hidden');
    showLoading('Выход из системы...');
    try {
      await signOut(auth);
      showNotification('Вы успешно вышли из аккаунта');
    } catch (error) {
      showNotification('Ошибка при выходе', 'error');
    } finally {
      hideLoading();
    }
  }, { once: true });
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

// Отображение материалов
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

  let filteredMaterials = Object.entries(materials);
  
  if (filterPlatform !== 'all') {
    filteredMaterials = filteredMaterials.filter(([_, material]) => 
      material.platform === filterPlatform
    );
  }

  materialsList.innerHTML = filteredMaterials.map(([id, material]) => {
    const userMaterial = userData?.materials?.[id];
    const isAccepted = !!userMaterial;
    const isCompleted = userMaterial?.status === 'completed';
    const isPending = userMaterial?.status === 'pending';
    const isRejected = userMaterial?.status === 'rejected';
    
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
            <i class="fas fa-hourglass-half"></i> На проверке
          </button>
        ` : isRejected ? `
          <div>
            <button class="ios-button small rejected-btn" disabled>
              <i class="fas fa-times-circle"></i> Отклонено
            </button>
            ${userMaterial?.rejectionReason ? `
              <div class="task-comment">
                <strong>Причина:</strong> ${userMaterial.rejectionReason}
              </div>
            ` : ''}
            <button class="ios-button small retry-btn" data-id="${id}">
              <i class="fas fa-redo"></i> Подать повторно
            </button>
          </div>
        ` : isAccepted ? `
          <button class="ios-button small take-btn" data-id="${id}">
            <span class="btn-text">Отправить на проверку</span>
            <span class="btn-loader hidden"><i class="fas fa-spinner fa-spin"></i></span>
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

  // Обработчики для кнопок заданий
  document.querySelectorAll('.take-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const materialId = this.dataset.id;
      const btnText = this.querySelector('.btn-text');
      const btnLoader = this.querySelector('.btn-loader');
      
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');
      
      const uid = auth.currentUser?.uid;
      const userData = await loadUserData(uid);
      const currentStatus = userData?.materials?.[materialId]?.status;
      
      try {
        if (currentStatus === 'in_progress') {
          // Отправка на проверку
          await update(ref(db, `users/${uid}/materials/${materialId}`), {
            status: 'pending',
            submittedAt: new Date().toISOString()
          });
          showNotification('Задание отправлено на проверку!');
        } else {
          // Принятие задания
          const materials = await loadMaterials();
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
        }
        displayMaterials(filterPlatform);
      } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'error');
      } finally {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
      }
    });
  });

  // Обработчики для повторной подачи
  document.querySelectorAll('.retry-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const materialId = this.dataset.id;
      showLoading('Отправка задания на проверку...');
      try {
        await update(ref(db, `users/${auth.currentUser.uid}/materials/${materialId}`), {
          status: 'pending',
          resubmittedAt: new Date().toISOString()
        });
        showNotification('Задание отправлено на повторную проверку');
        displayMaterials(filterPlatform);
      } catch (error) {
        showNotification('Ошибка при отправке задания', 'error');
      } finally {
        hideLoading();
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

  const totalTasks = Object.keys(userData.materials).length;
  const completedTasks = Object.values(userData.materials).filter(m => m.status === 'completed').length;
  const pendingTasks = Object.values(userData.materials).filter(m => m.status === 'pending').length;
  const rejectedTasks = Object.values(userData.materials).filter(m => m.status === 'rejected').length;
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
        <h3>На проверке</h3>
        <p>${pendingTasks}</p>
      </div>
      <div class="stat-card">
        <h3>Отклонено</h3>
        <p>${rejectedTasks}</p>
      </div>
      <div class="stat-card">
        <h3>Заработано</h3>
        <p>${totalEarnings.toFixed(2)}₽</p>
      </div>
    </div>
    <div class="tasks-list">
      <h3>История заданий</h3>
      ${Object.entries(userData.materials).map(([id, task]) => `
        <div class="task-item">
          <div class="task-info">
            <h4>${task.title}</h4>
            <p>Статус: 
              ${task.status === 'completed' ? 
                '<span class="status-badge completed"><i class="fas fa-check-circle"></i> Выполнено</span>' : 
               task.status === 'pending' ? 
                '<span class="status-badge pending"><i class="fas fa-clock"></i> На проверке</span>' :
               task.status === 'rejected' ? 
                '<span class="status-badge rejected"><i class="fas fa-times-circle"></i> Отклонено</span>' :
                '<span class="status-badge"><i class="fas fa-hourglass-half"></i> В процессе</span>'
              }
            </p>
            <p>Принято: ${new Date(task.accepted).toLocaleDateString()}</p>
            ${task.status === 'rejected' && task.rejectionReason ? `
              <div class="task-comment">
                <strong>Причина:</strong> ${task.rejectionReason}
              </div>
            ` : ''}
            ${task.views ? `<p>Просмотров: ${task.views}</p>` : ''}
            ${task.earnings ? `<p>Заработано: ${task.earnings}₽</p>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Загрузка раздела
async function loadSection(sectionId, uid) {
  dynamicContent.innerHTML = sections[sectionId];
  
  // Обновляем активную кнопку
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });
  
  // Загружаем специфичные данные
  if (sectionId === 'materials') {
    displayMaterials();
  } else if (sectionId === 'stats' && uid) {
    displayStats(uid);
  } else if (sectionId === 'profile' && uid) {
    const userData = await loadUserData(uid);
    if (userData) {
      document.getElementById('profile-name').textContent = userData.name;
      document.getElementById('profile-balance').textContent = `${userData.balance || 0} ₽`;
      document.getElementById('name-input').value = userData.name || '';
      document.getElementById('tiktok-input').value = userData.tiktok || '';
      document.getElementById('youtube-input').value = userData.youtube || '';
      
      // Аватар
      const avatarPreview = document.getElementById('avatar-preview');
      if (userData.avatarUrl) {
        avatarPreview.src = userData.avatarUrl;
      } else {
        const initials = userData.name ? userData.name.charAt(0).toUpperCase() : 'U';
        avatarPreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=007AFF&color=fff`;
      }
      
      // Подтверждение email
      const emailVerifyContainer = document.getElementById('email-verify-container');
      if (!auth.currentUser.emailVerified) {
        emailVerifyContainer.innerHTML = `
          <div class="email-verify">
            <p><i class="fas fa-envelope"></i> Ваш email не подтвержден</p>
            <button class="ios-button small" id="verify-email-btn">
              Отправить подтверждение
            </button>
          </div>
        `;
        
        document.getElementById('verify-email-btn').addEventListener('click', async () => {
          showLoading('Отправка письма...');
          try {
            await sendEmailVerification(auth.currentUser);
            showNotification('Письмо с подтверждением отправлено на ваш email');
          } catch (error) {
            showNotification('Ошибка при отправке письма', 'error');
          } finally {
            hideLoading();
          }
        });
      } else {
        emailVerifyContainer.innerHTML = '';
      }
      
      // Сохранение имени
      document.getElementById('save-name').addEventListener('click', async () => {
        const newName = document.getElementById('name-input').value.trim();
        if (!newName) {
          showNotification('Введите имя', 'error');
          return;
        }
        
        showLoading('Сохранение...');
        try {
          await updateProfile(auth.currentUser, { displayName: newName });
          await update(ref(db, `users/${uid}`), { name: newName });
          document.getElementById('profile-name').textContent = newName;
          showNotification('Имя успешно обновлено');
        } catch (error) {
          showNotification('Ошибка при сохранении имени', 'error');
        } finally {
          hideLoading();
        }
      });
      
      // Сохранение TikTok
      document.getElementById('save-tiktok').addEventListener('click', async () => {
        const tiktok = document.getElementById('tiktok-input').value.trim();
        if (!tiktok) {
          showNotification('Введите TikTok username', 'error');
          return;
        }

        showLoading('Сохранение...');
        try {
          await update(ref(db, `users/${uid}`), { tiktok });
          showNotification('TikTok успешно сохранен');
        } catch (error) {
          showNotification('Ошибка при сохранении', 'error');
        } finally {
          hideLoading();
        }
      });
      
      // Сохранение YouTube
      document.getElementById('save-youtube').addEventListener('click', async () => {
        const youtube = document.getElementById('youtube-input').value.trim();
        if (!youtube) {
          showNotification('Введите YouTube ID канала', 'error');
          return;
        }

        showLoading('Сохранение...');
        try {
          await update(ref(db, `users/${uid}`), { youtube });
          showNotification('YouTube успешно сохранен');
        } catch (error) {
          showNotification('Ошибка при сохранении', 'error');
        } finally {
          hideLoading();
        }
      });
      
      // Смена пароля
      document.getElementById('change-password-btn').addEventListener('click', () => {
        document.getElementById('change-password-modal').classList.remove('hidden');
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
      });
      
      document.getElementById('password-cancel').addEventListener('click', () => {
        document.getElementById('change-password-modal').classList.add('hidden');
      });
      
      document.getElementById('password-confirm').addEventListener('click', async () => {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        
        if (newPassword.length < 6) {
          showNotification('Пароль должен быть не менее 6 символов', 'error');
          return;
        }
        
        showLoading('Смена пароля...');
        try {
          const credential = EmailAuthProvider.credential(
            auth.currentUser.email, 
            currentPassword
          );
          
          await reauthenticateWithCredential(auth.currentUser, credential);
          await updatePassword(auth.currentUser, newPassword);
          
          showNotification('Пароль успешно изменен');
          document.getElementById('change-password-modal').classList.add('hidden');
        } catch (error) {
          let message = 'Ошибка при смене пароля';
          if (error.code === 'auth/wrong-password') {
            message = 'Неверный текущий пароль';
          } else if (error.code === 'auth/weak-password') {
            message = 'Пароль слишком простой';
          }
          showNotification(message, 'error');
        } finally {
          hideLoading();
        }
      });
      
      // Загрузка аватарки (используем imgbb.com как бесплатный хост)
      document.getElementById('avatar-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
          showNotification('Выберите изображение', 'error');
          return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
          showNotification('Размер файла не должен превышать 2MB', 'error');
          return;
        }
        
        showLoading('Загрузка аватарки...');
        try {
          const formData = new FormData();
          formData.append('image', file);
          
          // Бесплатный API imgbb.com (замените API_KEY на свой)
          const response = await fetch('https://api.imgbb.com/1/upload?key=1e56db850ecdc3cd2c8ac1e73dac0eb8', {
            method: 'POST',
            body: formData
          });
          
          const data = await response.json();
          if (data.success) {
            const avatarUrl = data.data.url;
            await update(ref(db, `users/${uid}`), { avatarUrl });
            document.getElementById('avatar-preview').src = avatarUrl;
            showNotification('Аватар успешно обновлен');
          } else {
            throw new Error('Ошибка загрузки изображения');
          }
        } catch (error) {
          console.error('Ошибка загрузки аватарки:', error);
          showNotification('Ошибка при загрузке аватарки', 'error');
        } finally {
          hideLoading();
        }
      });
      
      // Выход из аккаунта
      document.getElementById('logout-btn-top').addEventListener('click', showLogoutModal);
    }
  }
}

// Инициализация приложения
function initApp() {
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
    showLoading('Вход в систему...');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showNotification("Добро пожаловать!");
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
        case "auth/user-disabled":
          errorMessage = "Аккаунт заблокирован";
          break;
      }
      showNotification(errorMessage, 'error');
    } finally {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
      hideLoading();
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
    showLoading('Регистрация...');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Отправка письма с подтверждением
      await sendEmailVerification(user);
      
      // Сохраняем дополнительные данные пользователя
      const userData = {
        ...userDataTemplate,
        name,
        email,
        balance: 0
      };
      
      await set(ref(db, `users/${user.uid}`), userData);
      showNotification("Регистрация прошла успешно! Проверьте email для подтверждения.");
      
      // Переключаем на вкладку входа после успешной регистрации
      document.getElementById('login-tab').click();
      document.getElementById('login-email').value = email;
      document.getElementById('login-password').value = '';
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
          errorMessage = "Пароль слишком простой (минимум 6 символов)";
          break;
      }
      showNotification(errorMessage, 'error');
    } finally {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
      hideLoading();
    }
  });
  
  // Обработчики для навигации
  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      if (!auth.currentUser) return;
      loadSection(this.dataset.section, auth.currentUser.uid);
    });
  });
  
  // Проверка состояния авторизации
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Пользователь вошел в систему
      authScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');
      
      // Проверяем, есть ли данные пользователя в базе
      const userData = await loadUserData(user.uid);
      if (!userData) {
        // Создаем запись пользователя если ее нет
        await set(ref(db, `users/${user.uid}`), {
          ...userDataTemplate,
          name: user.displayName || '',
          email: user.email,
          balance: 0
        });
      }
      
      // Загружаем главный раздел
      loadSection('main', user.uid);
    } else {
      // Пользователь вышел
      appScreen.classList.add('hidden');
      authScreen.classList.remove('hidden');
      document.getElementById('login-form').classList.remove('hidden');
      document.getElementById('signup-form').classList.add('hidden');
      document.getElementById('login-tab').classList.add('active');
      document.getElementById('signup-tab').classList.remove('active');
    }
  });
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);
