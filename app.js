// app.js — логика приложения
import {
  auth,
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
  sendEmailVerification,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential
  updateProfile
} from './firebase.js';

const IMGBB_API_KEY = '1e56db850ecdc3cd2c8ac1e73dac0eb8';

// DOM
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

let currentUID = null;

// Утилиты UI
function showNotification(msg, type = 'success') {
  notification.textContent = msg;
  notification.className = `notification ${type}`;
  notification.classList.remove('hidden');
  clearTimeout(showNotification._t);
  showNotification._t = setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

function showLoading(message = 'Загрузка...') {
  if (document.getElementById('loading-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-content">
      <i class="fas fa-spinner fa-spin"></i>
      <p>${message}</p>
    </div>
  `;
  document.body.appendChild(overlay);
}

function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) el.remove();
}

// Данные шаблон
// Структура данных пользователя
const userDataTemplate = {
  name: "",
  email: "",
  tiktok: "",
  youtube: "",
  avatar: "",
  balance: 0,
  rewards: {},
  materials: {},
  avatarUrl: ""
  materials: {}
};

// Секции HTML (динамически вставляются)
// Шаблоны контента
const sections = {
  main: `
    <div class="ios-section">
      <h2 class="ios-title">Главная</h2>
      <div class="ios-card news-card">
        <img src="https://i.ibb.co/0jQ7J3T/reemmy-banner.jpg" alt="Reemmy" class="card-image">
        <h3>Reemmy — заработок в соцсетях</h3>
        <p>Принимай задания, интегрируй материалы и получай вознаграждение.</p>
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
@@ -92,540 +76,645 @@ const sections = {
        <button class="filter-btn" data-platform="tiktok">TikTok</button>
        <button class="filter-btn" data-platform="youtube">YouTube</button>
      </div>
      <div class="materials-list" id="materials-list"></div>
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
      <div id="stats-container"></div>
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
            <input type="file" id="avatar-input" accept="image/*" style="display:none;">
        <div class="avatar-container">
          <img id="profile-avatar" class="avatar" src="" alt="Аватар">
          <label class="avatar-upload">
            <i class="fas fa-camera"></i>
            <input type="file" id="avatar-upload" accept="image/*">
          </label>
        </div>
        <h2 id="profile-name">Загрузка...</h2>
        <div class="balance"><span>Баланс:</span><strong id="profile-balance">0 ₽</strong></div>
        <button class="logout-btn-top" id="logout-btn-top"><i class="fas fa-sign-out-alt"></i></button>
      </div>

      <div class="ios-card">
        <h3><i class="fas fa-user-edit"></i> Личные данные</h3>
        <input type="text" id="name-input" placeholder="Ваше имя" class="profile-input">
        <button class="ios-button small" id="save-name">Сохранить имя</button>
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
        <button class="ios-button small" id="save-tiktok">Сохранить</button>
        <button class="ios-button small" id="save-tiktok">
          <span class="btn-text">Сохранить</span>
          <span class="btn-loader hidden"><i class="fas fa-spinner fa-spin"></i></span>
        </button>
      </div>

      <div class="ios-card">
        <h3><i class="fab fa-youtube"></i> YouTube</h3>
        <input type="text" id="youtube-input" placeholder="ID канала или ссылка" class="profile-input">
        <button class="ios-button small" id="save-youtube">Сохранить</button>
      </div>

      <div class="ios-card">
        <h3><i class="fas fa-lock"></i> Безопасность</h3>
        <button class="ios-button small" id="change-password-btn">Сменить пароль</button>
        <p id="profile-youtube">Не указан</p>
        <input type="text" id="youtube-input" placeholder="ID канала" class="profile-input">
        <button class="ios-button small" id="save-youtube">
          <span class="btn-text">Сохранить</span>
          <span class="btn-loader hidden"><i class="fas fa-spinner fa-spin"></i></span>
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

// Загрузка данных пользователя
async function loadUserData(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
  const snapshot = await get(ref(db, `users/${uid}`));
  return snapshot.exists() ? snapshot.val() : null;
}

// Сохранение данных пользователя
async function saveUserData(uid, data) {
  await update(ref(db, `users/${uid}`), data);
}

// Загрузка материалов (узел Materials)
// Загрузка материалов из Firebase
async function loadMaterials() {
  try {
    const snap = await get(ref(db, 'Materials'));
    return snap.exists() ? snap.val() : null;
  } catch (err) {
    console.error(err);
    const snapshot = await get(ref(db, 'Materials'));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Ошибка загрузки материалов:", error);
    showNotification("Ошибка загрузки заданий", "error");
    return null;
  }
}

// Отрисовка материалов
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
  materialsList.innerHTML = `<div class="ios-card"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>`;
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
    materialsList.innerHTML = `<div class="ios-card">Нет заданий</div>`;
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

  let arr = Object.entries(materials);
  if (filterPlatform !== 'all') arr = arr.filter(([_, m]) => m.platform === filterPlatform);
  let filteredMaterials = Object.entries(materials);
  
  if (filterPlatform !== 'all') {
    filteredMaterials = filteredMaterials.filter(([_, material]) => 
      material.platform === filterPlatform
    );
  }

  materialsList.innerHTML = arr.map(([id, material]) => {
    const um = userData?.materials?.[id];
    const status = um?.status || null;
    const platformIcon = material.platform === 'tiktok' ? '<i class="fab fa-tiktok"></i>' : material.platform === 'youtube' ? '<i class="fab fa-youtube"></i>' : '';
    const rewardText = material.reward ? `${material.reward}₽` : '0.1₽';
    const actions = status === 'completed' ? `<button class="ios-button small" disabled><i class="fas fa-check-circle"></i> Выполнено</button>` :
                    status === 'pending' ? `<button class="ios-button small" disabled><i class="fas fa-hourglass-half"></i> На проверке</button>` :
                    status === 'not_completed' ? `<div><button class="ios-button small" disabled>Не выполнено</button><button class="ios-button small retry-btn" data-id="${id}">Подать повторно</button></div>` :
                    um ? `<button class="ios-button small in-progress-btn" disabled><i class="fas fa-hourglass-half"></i> В процессе</button>` :
                    `<button class="ios-button small take-btn" data-id="${id}"><span class="btn-text">Принять задание</span><span class="btn-loader hidden"><i class="fas fa-spinner fa-spin"></i></span></button>`;
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
      <div class="ios-card material-item" data-id="${id}">
        <div class="material-head">${platformIcon} <strong>${material.title || 'Рекламное задание'}</strong></div>
        <div class="material-description">${material.description || ''}</div>
        <div class="material-row"><div>Платформа: ${material.platform || 'Любая'}</div><div>Вознаграждение: ${rewardText}</div></div>
        <div class="material-actions">${actions}</div>
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

  // события
  document.querySelectorAll('.take-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.dataset.id;
  // Обработчики для кнопок принятия заданий
  document.querySelectorAll('.take-btn').forEach(button => {
    button.addEventListener('click', async function() {
      const materialId = this.getAttribute('data-id');
      const uid = auth.currentUser?.uid;
      if (!uid) { showNotification('Войдите в аккаунт', 'error'); return; }
      
      if (!uid) {
        showNotification("Ошибка: пользователь не авторизован", "error");
        return;
      }

      const btnText = this.querySelector('.btn-text');
      const btnLoader = this.querySelector('.btn-loader');
      btnText?.classList.add('hidden');
      btnLoader?.classList.remove('hidden');
      
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');
      this.disabled = true;

      try {
        const materials = await loadMaterials();
        await update(ref(db, `users/${uid}/materials`), {
          [id]: {
            accepted: new Date().toISOString(),
            status: 'in_progress',
            platform: materials[id].platform,
            reward: materials[id].reward || 0,
            title: materials[id].title || '',
            views: 0,
            earnings: 0
          }
        // Обновляем данные пользователя
        const userRef = ref(db, `users/${uid}/materials/${materialId}`);
        await set(userRef, {
          status: "in_progress",
          timestamp: Date.now()
        });
        showNotification('Задание принято');
      } catch (err) {
        console.error(err);
        showNotification('Ошибка при принятии', 'error');
      } finally {
        btnText?.classList.remove('hidden');
        btnLoader?.classList.add('hidden');

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

  document.querySelectorAll('.retry-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.dataset.id;
      try {
        await update(ref(db, `users/${auth.currentUser.uid}/materials/${id}`), {
          status: 'pending',
          resubmittedAt: new Date().toISOString()
        });
        showNotification('Отправлено на повторную проверку');
        displayMaterials(filterPlatform);
      } catch (err) {
        console.error(err);
        showNotification('Ошибка', 'error');
      }
  // Обработчики для кнопок отправки на проверку
  document.querySelectorAll('.review-btn').forEach(button => {
    button.addEventListener('click', function() {
      const materialId = this.getAttribute('data-id');
      openCommentModal(materialId);
    });
  });

  document.querySelectorAll('.filter-btn').forEach(b => {
    b.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
  // Обработчики для фильтров
  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(btn => 
        btn.classList.remove('active')
      );
      this.classList.add('active');
      displayMaterials(this.dataset.platform);
      const platform = this.getAttribute('data-platform');
      displayMaterials(platform);
    });
  });
}

// Отрисовка статистики / админ
async function displayStats(uid) {
  const statsContainer = document.getElementById('stats-container');
  statsContainer.innerHTML = `<div class="ios-card"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>`;
  const userData = await loadUserData(uid);
  const isAdmin = uid === 'BNf2Iwb7KoMrFoPLI2hjTwZ5NRg2';

  if (isAdmin) {
    // админ: все задания pending
    const allUsersSnap = await get(ref(db, 'users'));
    const allUsers = allUsersSnap.exists() ? allUsersSnap.val() : {};
    let pending = [];
    for (const u in allUsers) {
      const mats = allUsers[u].materials || {};
      for (const mid in mats) {
        if (mats[mid].status === 'pending') {
          pending.push({ userId: u, materialId: mid, ...mats[mid], userName: allUsers[u].name || 'Аноним' });
        }
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

    if (pending.length === 0) {
      statsContainer.innerHTML = `<div class="ios-card">Нет заданий на подтверждение</div>`;
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

    statsContainer.innerHTML = pending.map(p => `
      <div class="ios-card">
        <h4>${p.title}</h4>
        <p><strong>Пользователь:</strong> ${p.userName}</p>
        <p><strong>Просмотров:</strong> ${p.views || 0}</p>
        <p><strong>Вознаграждение:</strong> ${p.reward || 0}₽</p>
        <div class="task-actions">
          <button class="ios-button small approve-btn" data-user="${p.userId}" data-mid="${p.materialId}">Подтвердить</button>
          <button class="ios-button small reject-btn" data-user="${p.userId}" data-mid="${p.materialId}">Отклонить</button>
        </div>
      </div>
    `).join('');

    // обработчики approve/reject
    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const userId = this.dataset.user;
        const mid = this.dataset.mid;
        showLoading('Подтверждение...');
        try {
          const userSnap = await get(ref(db, `users/${userId}`));
          const ud = userSnap.exists() ? userSnap.val() : null;
          const task = ud?.materials?.[mid];
          const reward = task?.reward || 0;
          await update(ref(db, `users/${userId}`), {
            [`materials/${mid}/status`]: 'completed',
            balance: (ud.balance || 0) + reward
          });
          showNotification('Подтверждено');
          displayStats(currentUID);
        } catch (err) {
          console.error(err);
          showNotification('Ошибка', 'error');
        } finally { hideLoading(); }
      });
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.getElementById('rejection-modal').classList.remove('hidden');
        const cancel = document.getElementById('rejection-cancel');
        const confirm = document.getElementById('rejection-confirm');
        cancel.onclick = () => document.getElementById('rejection-modal').classList.add('hidden');
        confirm.onclick = async () => {
          const reason = document.getElementById('rejection-reason').value.trim();
          if (!reason) { showNotification('Укажите причину', 'error'); return; }
          // find data attributes stored earlier? We'll get them from last clicked button via closure:
          const userId = btn.dataset.user;
          const mid = btn.dataset.mid;
          document.getElementById('rejection-modal').classList.add('hidden');
          showLoading('Отклонение...');
          try {
            await update(ref(db, `users/${userId}/materials/${mid}`), { status: 'not_completed', rejectionReason: reason });
            showNotification('Отклонено', 'error');
            displayStats(currentUID);
          } catch (err) { console.error(err); showNotification('Ошибка', 'error'); }
          finally { hideLoading(); }
        };
    
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
    // простой пользователь — статистика своих заданий
    if (!userData?.materials || Object.keys(userData.materials).length === 0) {
      statsContainer.innerHTML = `<div class="ios-card">У вас нет активных заданий</div>`;
      return;
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
    const mats = userData.materials;
    const total = Object.keys(mats).length;
    const completed = Object.values(mats).filter(m => m.status === 'completed').length;
    const pending = Object.values(mats).filter(m => m.status === 'pending').length;
    const rejected = Object.values(mats).filter(m => m.status === 'not_completed').length;
    const earnings = Object.values(mats).reduce((s, m) => s + (m.earnings || 0), 0);
  });
}

    statsContainer.innerHTML = `
      <div class="stats-summary">
        <div class="stat-card"><h3>Всего</h3><p>${total}</p></div>
        <div class="stat-card"><h3>Выполнено</h3><p>${completed}</p></div>
        <div class="stat-card"><h3>На проверке</h3><p>${pending}</p></div>
        <div class="stat-card"><h3>Отклонено</h3><p>${rejected}</p></div>
        <div class="stat-card"><h3>Заработано</h3><p>${earnings.toFixed(2)}₽</p></div>
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
      <div class="tasks-list">
        <h3>История</h3>
        ${Object.entries(mats).map(([id, t]) => `
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
            <h4>${t.title}</h4>
            <p>Статус: ${t.status}</p>
            <p>Принято: ${t.accepted ? new Date(t.accepted).toLocaleDateString() : '-'}</p>
            ${t.status === 'not_completed' && t.rejectionReason ? `<p><strong>Причина:</strong> ${t.rejectionReason}</p>` : ''}
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
    </div>
  `;
}

// Загрузка секции и навигация
async function loadSection(sectionId, uid) {
  dynamicContent.innerHTML = sections[sectionId];
  tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionId));

  if (sectionId === 'materials') {
    await displayMaterials();
  } else if (sectionId === 'stats' && uid) {
    await displayStats(uid);
  } else if (sectionId === 'profile' && uid) {
    const userData = await loadUserData(uid);
    if (!userData) return;
    document.getElementById('profile-name').textContent = userData.name || 'Пользователь';
    document.getElementById('profile-balance').textContent = `${(userData.balance || 0)} ₽`;
    document.getElementById('name-input').value = userData.name || '';
    document.getElementById('tiktok-input').value = userData.tiktok || '';
    document.getElementById('youtube-input').value = userData.youtube || '';

    const avatarPreview = document.getElementById('avatar-preview');
    if (userData.avatarUrl) avatarPreview.src = userData.avatarUrl;
    else avatarPreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'U')}&background=007AFF&color=fff`;

    // email verify container
    const emailVerifyContainer = document.getElementById('email-verify-container');
    if (!auth.currentUser.emailVerified) {
      emailVerifyContainer.innerHTML = `
        <div class="ios-card email-verify">
          <p><i class="fas fa-envelope"></i> Ваш email не подтверждён</p>
          <button class="ios-button small" id="verify-email-btn">Отправить подтверждение</button>
        </div>
      `;
      document.getElementById('verify-email-btn').addEventListener('click', async () => {
        showLoading('Отправка письма...');
        try {
          await sendEmailVerification(auth.currentUser);
          showNotification('Письмо отправлено на email');
        } catch (err) {
          console.error(err);
          showNotification('Ошибка отправки', 'error');
        } finally { hideLoading(); }
      });
    } else {
      emailVerifyContainer.innerHTML = '';
    }

    // save name
    document.getElementById('save-name').addEventListener('click', async () => {
      const newName = document.getElementById('name-input').value.trim();
      if (!newName) { showNotification('Введите имя', 'error'); return; }
      showLoading('Сохранение...');
      try {
        await updateProfile(auth.currentUser, { displayName: newName });
        await update(ref(db, `users/${currentUID}`), { name: newName });
        document.getElementById('profile-name').textContent = newName;
        showNotification('Имя обновлено');
      } catch (err) { console.error(err); showNotification('Ошибка', 'error'); }
      finally { hideLoading(); }
    });

    // save tiktok
    document.getElementById('save-tiktok').addEventListener('click', async () => {
      const t = document.getElementById('tiktok-input').value.trim();
      if (!t) { showNotification('Введите TikTok', 'error'); return; }
      showLoading('Сохранение...');
      try {
        await update(ref(db, `users/${currentUID}`), { tiktok: t });
        showNotification('TikTok сохранён');
      } catch (err) { console.error(err); showNotification('Ошибка', 'error'); }
      finally { hideLoading(); }
    });

    // save youtube
    document.getElementById('save-youtube').addEventListener('click', async () => {
      const y = document.getElementById('youtube-input').value.trim();
      if (!y) { showNotification('Введите YouTube', 'error'); return; }
      showLoading('Сохранение...');
      try {
        await update(ref(db, `users/${currentUID}`), { youtube: y });
        showNotification('YouTube сохранён');
      } catch (err) { console.error(err); showNotification('Ошибка', 'error'); }
      finally { hideLoading(); }
    });

    // change password
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
      if (newPassword.length < 6) { showNotification('Пароль должен быть не менее 6 символов', 'error'); return; }
      showLoading('Смена пароля...');
      try {
        const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, cred);
        await updatePassword(auth.currentUser, newPassword);
        showNotification('Пароль изменён');
        document.getElementById('change-password-modal').classList.add('hidden');
      } catch (err) {
        console.error(err);
        showNotification('Ошибка смены пароля', 'error');
      } finally { hideLoading(); }
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

    // avatar upload via imgbb
    document.getElementById('avatar-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.match('image.*')) { showNotification('Выберите изображение', 'error'); return; }
      if (file.size > 2 * 1024 * 1024) { showNotification('Максимум 2MB', 'error'); return; }

      showLoading('Загрузка аватарки...');
      try {
        const fd = new FormData();
        fd.append('image', file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
          const url = data.data.url;
          await update(ref(db, `users/${currentUID}`), { avatarUrl: url });
          await updateProfile(auth.currentUser, { photoURL: url });
          document.getElementById('avatar-preview').src = url;
          showNotification('Аватар обновлён');
        } else {
          console.error(data);
          showNotification('Ошибка загрузки', 'error');
        }
      } catch (err) {
        console.error(err);
        showNotification('Ошибка загрузки', 'error');
      } finally { hideLoading(); }
    
    // Создаем запись в базе данных
    await set(ref(db, `users/${user.uid}`), {
      ...userDataTemplate,
      name: name,
      email: email
    });

    // logout button in profile
    document.getElementById('logout-btn-top').addEventListener('click', showLogoutModal);
    
    showNotification("Регистрация прошла успешно!");
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    showNotification("Ошибка регистрации: " + error.message, "error");
  }
}

// Логика показа модалки выхода
function showLogoutModal() {
  const modal = document.getElementById('logout-modal');
  modal.classList.remove('hidden');

  const cancel = document.getElementById('logout-cancel');
  const confirm = document.getElementById('logout-confirm');

  cancel.onclick = () => modal.classList.add('hidden');
  confirm.onclick = async () => {
    modal.classList.add('hidden');
    showLoading('Выход...');
    try {
      await signOut(auth);
      showNotification('Вы вышли');
    } catch (err) {
      console.error(err);
      showNotification('Ошибка выхода', 'error');
    } finally { hideLoading(); }
  };
}

// Инициализация авторизации и форм
function initApp() {
  // вкладки авторизации на auth-screen
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

  // login form
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    showLoading('Вход...');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showNotification('Вход успешен');
    } catch (err) {
      console.error(err);
      showNotification('Ошибка входа', 'error');
    } finally { hideLoading(); }
  });

  // signup form
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    showLoading('Регистрация...');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      await sendEmailVerification(user);
      // create user node
      await set(ref(db, `users/${user.uid}`), { ...userDataTemplate, name, email, balance: 0 });
      showNotification('Зарегистрировано — проверьте email');
      // switch to login
      document.getElementById('login-tab').click();
    } catch (err) {
      console.error(err);
      showNotification('Ошибка регистрации', 'error');
    } finally { hideLoading(); }
  });

  // навигация вкладок приложения (ниже)
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      const uid = auth.currentUser?.uid;
      loadSection(section, uid);
    });
  });

  // отслеживание авторизации
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUID = user.uid;
      authScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');
      loadSection('main', currentUID);
      if (!user.emailVerified) showNotification('Подтвердите email для полного доступа', 'error');
    } else {
      currentUID = null;
      authScreen.classList.remove('hidden');
      appScreen.classList.add('hidden');
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
}
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

// запуск
document.addEventListener('DOMContentLoaded', initApp);
// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
  // Загружаем главный раздел по умолчанию
  if (auth.currentUser) {
    dynamicContent.innerHTML = sections.main;
  }
});
