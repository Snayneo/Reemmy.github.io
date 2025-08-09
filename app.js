import { 
  auth, 
  db,
  ref,
  set,
  get,
  update,
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
  avatar: "https://i.ibb.co/7QZKSnC/default-avatar.png",
  balance: 0,
  balanceall: 0,
  rewards: {},
  materials: {},
  withdraws: []
};

// Шаблоны контента
const sections = {
  main: `
    <div class="ios-section">
      <h2 class="ios-title">Главная</h2>
      <div class="ios-card news-card">
        <img src="https://i.supaimg.com/673213d8-d64b-4928-b0b2-e478f7455bfe.png" class="card-image">
        <h3>Reemmy - зарабатывать легко!</h3>
        <p>Начните зарабатывать уже сегодня, размещая рекламу в своих соцсетях</p>
      </div>
      <div class="ios-card">
        <img src="https://i.supaimg.com/443056f6-d050-4ddf-8d32-c097bee63dd1.jpg" alt="Заработок" class="card-image">
        <h3><i class="fas fa-question-circle"></i> Почему мы?</h3>
        <p>Мы платим за каждые 1000 просмотров вашего видео с нашей рекламой</p>
        <ul class="benefits-list">
          <li><i class="fas fa-check-circle"></i> Высокие ставки</li>
          <li><i class="fas fa-check-circle"></i> Быстрые выплаты</li>
          <li><i class="fas fa-check-circle"></i> Поддержка 24/7</li>
        </ul>
      </div>
      <div class="ios-card">
        <img src="https://i.supaimg.com/2db88c63-c9f0-48e2-af15-6bb3fc991be6.jpg" alt="Поддержка" class="card-image">
        <h3><i class="fas fa-headset"></i> Поддержка</h3>
        <p>Email: Reemmyinfo@gmail.com</p>
        <p>Telegram: @Reemmyy</p>
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
        <div class="avatar-container" style="position:relative; display:inline-block;">
          <img id="profile-avatar" class="avatar" src="" alt="Аватар">
          <label class="avatar-upload-btn" for="avatar-upload" title="Сменить аватар">
            <i class="fas fa-camera"></i>
          </label>
          <input type="file" id="avatar-upload" accept="image/*" style="display:none;">
        </div>
        <h2 id="profile-name">Загрузка...</h2>
        <div class="balance-block">
          <div class="balance-info">
            <span>Баланс:</span>
            <strong id="profile-balance">0 ₽</strong>
            <span class="total-earned-label">Всего заработано:</span>
            <strong id="profile-total-earned">0 ₽</strong>
          </div>
          <button class="ios-button small" id="withdraw-btn">Вывести</button>
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
      <div class="ios-card withdraw-history-card" id="withdraw-history-card" style="margin-top:24px;">
        <h3><i class="fas fa-wallet"></i> История выводов</h3>
        <div id="withdraw-history-list" class="withdraw-history-list"></div>
      </div>
    </div>
  `,
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
    if (snapshot.exists()) {
      const materials = snapshot.val();
      return Object.entries(materials)
        .map(([id, material]) => ({ id, ...material }))
        .filter(material => 
          material.title && 
          material.description && 
          material.platform && 
          material.reward && 
          material.url
        );
    }
    return [];
  } catch (error) {
    console.error("Ошибка загрузки заданий:", error);
    showNotification("Ошибка загрузки заданий", "error");
    return [];
  }
}

// Отображение материалов
async function displayMaterials() {
  const materialsList = document.getElementById('materials-list');
  if (!materialsList) return;

  materialsList.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i><p>Загрузка заданий...</p></div>';

  try {
    const materials = await loadMaterials();
    
    if (materials.length === 0) {
      materialsList.innerHTML = '<div class="no-materials">Нет доступных заданий</div>';
      return;
    }

    let html = '';
    materials.forEach(material => {
      html += `
        <div class="ios-card material-item">
          <div class="material-badge ${material.platform}">
            <i class="fab fa-${material.platform === 'tiktok' ? 'tiktok' : 'youtube'}"></i>
          </div>
          <h3>${material.title}</h3>
          <div class="material-description">${material.description}</div>
          <div class="material-details">
            <p><strong>Платформа:</strong> ${material.platform === 'tiktok' ? 'TikTok' : 'YouTube'}</p>
            <p><strong>Вознаграждение:</strong> ${material.reward} ₽ за 1000 просмотров</p>
            <p><strong>Ссылка:</strong> 
              <a href="${material.url}" class="material-link" target="_blank" rel="noopener noreferrer">
                <i class="fas fa-external-link-alt"></i> ${material.url}
              </a>
            </p>
          </div>
          <div class="material-actions">
            <button class="ios-button take-btn" data-material-id="${material.id}">
              <span class="btn-text">Взять задание</span>
              <span class="btn-loader hidden"><i class="fas fa-spinner fa-spin"></i></span>
            </button>
          </div>
        </div>
      `;
    });

    materialsList.innerHTML = html;

    document.querySelectorAll('.take-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const materialId = this.dataset.materialId;
        const btnText = this.querySelector('.btn-text');
        const btnLoader = this.querySelector('.btn-loader');
        
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        
        try {
          const user = auth.currentUser;
          if (!user) {
            throw new Error('Пользователь не авторизован');
          }
          
          await update(ref(db, `users/${user.uid}/materials/${materialId}`), {
            status: 'in_progress',
            takenAt: new Date().toISOString()
          });
          
          showNotification('Задание успешно взято!');
          btnText.textContent = 'В процессе';
          btn.classList.add('in-progress-btn');
          btn.classList.remove('take-btn');
        } catch (error) {
          console.error('Ошибка при взятии задания:', error);
          showNotification(`Ошибка: ${error.message}`, 'error');
        } finally {
          btnText.classList.remove('hidden');
          btnLoader.classList.add('hidden');
        }
      });
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const platform = this.dataset.platform;
        const items = document.querySelectorAll('.material-item');
        
        items.forEach(item => {
          const itemPlatform = item.querySelector('.material-badge').classList.contains('tiktok') ? 'tiktok' : 'youtube';
          if (platform === 'all' || itemPlatform === platform) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });
  } catch (error) {
    console.error('Ошибка при отображении заданий:', error);
    materialsList.innerHTML = '<div class="error-message">Произошла ошибка при загрузке заданий</div>';
  }
}

// Отображение статистики
async function displayStats(uid) {
  const statsContainer = document.getElementById('stats-container');
  if (!statsContainer) return;

  statsContainer.innerHTML = '<div class="stats-placeholder"><i class="fas fa-chart-line"></i><p>Здесь будет отображаться статистика выполненных заданий</p></div>';

  try {
    const userData = await loadUserData(uid);
    if (!userData || !userData.materials) {
      return;
    }

    let completedCount = 0;
    let inProgressCount = 0;
    let totalEarnings = 0;
    
    Object.values(userData.materials).forEach(material => {
      if (material.status === 'completed') {
        completedCount++;
        totalEarnings += material.earnings || 0;
      } else if (material.status === 'in_progress') {
        inProgressCount++;
      }
    });

    const html = `
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
          <h3>Заработано</h3>
          <p>${totalEarnings} ₽</p>
        </div>
      </div>
      <div class="tasks-list">
        <h3>Последние задания</h3>
        ${Object.entries(userData.materials)
          .slice(0, 5)
          .map(([id, material]) => `
            <div class="task-item">
              <div class="task-info">
                <h4>${material.title || 'Задание'}</h4>
                <p>${new Date(material.takenAt).toLocaleDateString()}</p>
                <p>${material.platform === 'tiktok' ? 'TikTok' : 'YouTube'}</p>
              </div>
              <div class="task-status">
                <span class="status-badge ${material.status === 'completed' ? 'completed' : ''}">
                  ${material.status === 'completed' ? 'Выполнено' : 'В процессе'}
                </span>
              </div>
            </div>
          `).join('')}
      </div>
    `;

    statsContainer.innerHTML = html;
  } catch (error) {
    console.error('Ошибка при загрузке статистики:', error);
    statsContainer.innerHTML = '<div class="error-message">Произошла ошибка при загрузке статистики</div>';
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
    throw error;
  }
}

// Инициализация загрузки аватара
function initAvatarUpload() {
  const avatarUpload = document.getElementById('avatar-upload');
  if (!avatarUpload) return;

  avatarUpload.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      const avatarUrl = await uploadImageToImgBB(file);
      await updateProfile(user, { photoURL: avatarUrl });
      await update(ref(db, `users/${user.uid}`), { avatar: avatarUrl });
      
      document.getElementById('profile-avatar').src = avatarUrl;
      showNotification('Аватар успешно обновлен');
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
      showNotification(`Ошибка: ${error.message}`, 'error');
    }
  });
}

// История выводов
function renderWithdrawHistory(withdraws = []) {
  if (!withdraws || !Array.isArray(withdraws) || withdraws.length === 0) {
    return `<div class="withdraw-history-empty">Нет выводов</div>`;
  }
  
  return withdraws
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(w => `
      <div class="withdraw-history-item">
        <div class="withdraw-info">
          <span class="withdraw-amount">${w.amount} ₽</span>
          <span class="withdraw-method">${w.method === 'paypal' ? 'PayPal' : 'Криптовалюта'}</span>
        </div>
        <div class="withdraw-details">
          <span class="withdraw-date">${new Date(w.date).toLocaleDateString()} ${new Date(w.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          <span class="withdraw-status ${w.status}">
            ${w.status === 'pending' ? 'На рассмотрении' : w.status === 'done' ? 'Выполнено' : 'Отклонено'}
          </span>
        </div>
        ${w.wallet ? `<div class="withdraw-wallet">Кошелек: ${w.wallet}</div>` : ''}
      </div>
    `).join('');
}

// Модальное окно вывода средств
function showWithdrawModal(amount, callback) {
  const modalHtml = `
    <div class="modal" id="withdraw-modal">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h3>Вывод ${amount} ₽</h3>
        <p>Выберите способ вывода:</p>
        <div class="withdraw-methods">
          <button class="ios-button withdraw-method-btn" data-method="paypal">
            <i class="fab fa-paypal"></i> PayPal
          </button>
          <button class="ios-button withdraw-method-btn" data-method="crypto">
            <i class="fas fa-coins"></i> Криптовалюта
          </button>
        </div>
        <div id="withdraw-details" class="hidden">
          <input type="text" id="wallet-input" placeholder="Введите ваш кошелек" class="profile-input">
          <button class="ios-button" id="confirm-withdraw">Подтвердить вывод</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = document.getElementById('withdraw-modal');
  const closeBtn = modal.querySelector('.close-modal');
  const methodBtns = modal.querySelectorAll('.withdraw-method-btn');
  const withdrawDetails = modal.querySelector('#withdraw-details');
  const walletInput = modal.querySelector('#wallet-input');
  const confirmBtn = modal.querySelector('#confirm-withdraw');

  let selectedMethod = null;

  closeBtn.addEventListener('click', () => {
    modal.remove();
  });

  methodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMethod = btn.dataset.method;
      methodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      withdrawDetails.classList.remove('hidden');
      
      if (selectedMethod === 'paypal') {
        walletInput.placeholder = 'Введите email PayPal';
      } else {
        walletInput.placeholder = 'Введите адрес криптокошелька';
      }
    });
  });

  confirmBtn.addEventListener('click', async () => {
    const wallet = walletInput.value.trim();
    if (!wallet) {
      showNotification('Введите данные кошелька', 'error');
      return;
    }

    try {
      await callback(selectedMethod, wallet);
      modal.remove();
    } catch (error) {
      console.error('Ошибка вывода:', error);
      showNotification(`Ошибка: ${error.message}`, 'error');
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Загрузка раздела
async function loadSection(sectionId, uid) {
  dynamicContent.innerHTML = sections[sectionId];
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });
  
  if (sectionId === 'profile' && uid) {
    const userData = await loadUserData(uid);
    if (userData) {
      document.getElementById('profile-name').textContent = userData.name;
      document.getElementById('profile-balance').textContent = `${userData.balance || 0} ₽`;
      document.getElementById('profile-tiktok').textContent = userData.tiktok || "Не указан";
      document.getElementById('profile-youtube').textContent = userData.youtube || "Не указан";
      
      let totalEarned = 0;
      if (userData.materials) {
        totalEarned = Object.values(userData.materials).reduce((sum, m) => sum + (m.earnings || 0), 0);
      }
      document.getElementById('profile-total-earned').textContent = `${totalEarned} ₽`;
      
      const avatar = document.getElementById('profile-avatar');
      avatar.src = userData.avatar || 'https://i.ibb.co/7QZKSnC/default-avatar.png';
      avatar.onerror = () => {
        avatar.src = 'https://i.ibb.co/7QZKSnC/default-avatar.png';
      };
      initAvatarUpload();
      
      document.getElementById('save-tiktok').addEventListener('click', async () => {
        const btn = document.getElementById('save-tiktok');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        const tiktok = document.getElementById('tiktok-input').value;
        if (tiktok) {
          try {
            await update(ref(db, `users/${uid}`), { tiktok });
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
            await update(ref(db, `users/${uid}`), { youtube });
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
      
      document.getElementById('withdraw-btn').addEventListener('click', async () => {
        const amount = prompt('Введите сумму для вывода (₽):', '');
        const num = Number(amount);
        
        if (!amount || isNaN(num) || num <= 0) {
          showNotification('Введите корректную сумму', 'error');
          return;
        }
        
        if (num < 1000) {
          showNotification('Минимальная сумма вывода — 1000 ₽', 'error');
          return;
        }
        
        if (num > (userData.balance || 0)) {
          showNotification('Недостаточно средств на балансе', 'error');
          return;
        }
        
        showWithdrawModal(num, async (method, wallet) => {
          const withdraw = {
            amount: num,
            date: new Date().toISOString(),
            status: 'pending',
            method,
            wallet
          };
          
          const newWithdraws = Array.isArray(userData.withdraws) ? [...userData.withdraws, withdraw] : [withdraw];
          
          await update(ref(db, `users/${uid}`), {
            balance: (userData.balance || 0) - num,
            withdraws: newWithdraws
          });
          
          showNotification('Заявка на вывод отправлена! Ожидайте обработки в течение 1-7 дней.');
          loadSection('profile', uid);
        });
      });
      
      const historyList = document.getElementById('withdraw-history-list');
      if (historyList) {
        historyList.innerHTML = renderWithdrawHistory(userData.withdraws || []);
      }
      
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
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.section;
      const uid = auth.currentUser?.uid;
      loadSection(sectionId, uid);
    });
  });

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

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    if (!name || !email || !password) {
      showNotification('Пожалуйста, заполните все поля', 'error');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: name });
      const userData = {
        ...userDataTemplate,
        name,
        email,
        uid: user.uid
      };
      await set(ref(db, `users/${user.uid}`), userData);
      showNotification('Регистрация прошла успешно!');
      signupForm.reset();
      document.getElementById('login-tab').click();
    } catch (error) {
      showNotification(`Ошибка регистрации: ${error.message}`, 'error');
    }
  });

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
}

document.addEventListener('DOMContentLoaded', initApp);
