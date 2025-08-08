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

// IMGBB API KEY (используйте ваш ключ)
const IMGBB_API_KEY = '1e56db850ecdc3cd2c8ac1e73dac0eb8';

// Структура данных пользователя
const userDataTemplate = {
  name: "",
  email: "",
  tiktok: "",
  youtube: "",
  balance: 0,
  rewards: {},
  materials: {},
  avatar: "" // url
};

// Шаблоны контента (обновлённые)
const sections = {
  main: `
    <div class="ios-section">
      <h2 class="ios-title">Главная</h2>

      <div class="main-hero-grid" id="hero-grid">
        <div class="hero-card"><img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=60&auto=format&fit=crop" alt="hero1"></div>
        <div class="hero-card"><img src="https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1200&q=60&auto=format&fit=crop" alt="hero2"></div>
        <div class="hero-card"><img src="https://images.unsplash.com/photo-1485217988980-11786ced9454?w=1200&q=60&auto=format&fit=crop" alt="hero3"></div>
        <div class="hero-card"><img src="https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&q=60&auto=format&fit=crop" alt="hero4"></div>
      </div>

      <div class="ios-card news-card">
        <h3>Reemmy — зарабатывать легко</h3>
        <p>Размещайте рекламу в своих соцсетях и получайте выплату за 1к просмотров.</p>
      </div>

      <div class="ios-card">
        <h3>Почему Reemmy?</h3>
        <ul class="benefits-list">
          <li><i class="fas fa-check-circle"></i> Высокие ставки</li>
          <li><i class="fas fa-check-circle"></i> Быстрые выплаты (от 1000₽)</li>
          <li><i class="fas fa-check-circle"></i> Поддержка 24/7</li>
        </ul>
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
        <button class="logout-btn-top" id="logout-btn-top" title="Выйти">
          <i class="fas fa-sign-out-alt"></i>
        </button>
        <div class="avatar">
          <img id="profile-avatar" src="" alt="avatar">
        </div>
        <div id="profile-name">Загрузка...</div>
        <div class="balance">
          <span>Баланс:</span>
          <strong id="profile-balance">0 ₽</strong>
        </div>

        <div class="avatar-row" style="margin-top:8px;">
          <label class="avatar-upload-label" id="avatar-upload-label">
            <i class="fas fa-camera"></i> Изменить аватар
            <input type="file" id="avatar-file" accept="image/*">
          </label>
        </div>
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

      <div class="payout-row" id="payout-row">
        <!-- Появится кнопка выплат или подсказка -->
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

// Сохранение данных пользователя (update)
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

// Загрузка материалов пользователя (accepted и статусы)
async function loadUserMaterials(uid) {
  try {
    const snapshot = await get(ref(db, `users/${uid}/materials`));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (err) {
    console.error(err);
    return {};
  }
}

// Форматирование статуса в CSS класс и текст
function mapStatus(status) {
  if (!status) return { cls: 'status-in_progress', text: 'Доступно' };
  const s = String(status).toLowerCase();
  if (s.includes('отклон') || s.includes('rejected')) return { cls: 'status-rejected', text: 'Отклонено' };
  if (s.includes('complete') || s.includes('заверш') || s.includes('completed')) return { cls: 'status-completed', text: 'Выполнено' };
  if (s.includes('in_progress') || s.includes('в_работе') || s.includes('in progress')) return { cls: 'status-in_progress', text: 'В работе' };
  return { cls: 'status-in_progress', text: status };
}

// Отображение материалов с фильтрацией и слиянием статусов пользователя
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
    materialsList.innerHTML = `<div class="ios-card"><p>Ошибка загрузки заданий. Попробуйте позже.</p></div>`;
    return;
  }

  const uid = auth.currentUser?.uid;
  const userMaterials = uid ? await loadUserMaterials(uid) : {};

  let entries = Object.entries(materials || {});
  if (filterPlatform !== 'all') {
    entries = entries.filter(([_, material]) => material.platform === filterPlatform);
  }

  if (entries.length === 0) {
    materialsList.innerHTML = `<div class="ios-card"><p>Нет заданий для выбранной платформы</p></div>`;
    return;
  }

  materialsList.innerHTML = entries.map(([id, material]) => {
    const userMat = userMaterials[id] || null;
    const statusData = mapStatus(userMat?.status);
    // thumb (если в материале нет — взять случайную картинку)
    const thumb = material.thumb || `https://source.unsplash.com/400x300/?${encodeURIComponent(material.platform || 'ads')}`;
    const reward = material.reward !== undefined ? material.reward : 0.1;
    const acceptedDate = userMat?.accepted ? new Date(userMat.accepted).toLocaleString() : null;
    const comment = userMat?.comment || userMat?.comments || "";
    const disabled = userMat && userMat.status && !String(userMat.status).toLowerCase().includes('отклон') && !String(userMat.status).toLowerCase().includes('rejected') ? 'disabled' : '';
    const actionLabel = userMat ? (String(userMat.status).toLowerCase().includes('отклон') || String(userMat.status).toLowerCase().includes('rejected') ? 'Принять заново' : 'В работе') : 'Принять задание';

    return `
      <div class="material-item" data-id="${id}" data-platform="${material.platform || 'other'}">
        <div class="material-thumb"><img src="${thumb}" alt=""></div>
        <div class="material-info">
          <h3>${material.title || 'Рекламное задание'}</h3>
          <div class="material-meta">
            <div><strong>${material.platform ? material.platform.charAt(0).toUpperCase()+material.platform.slice(1) : 'Любая'}</strong></div>
            <div>•</div>
            <div>Вознаграждение: <strong>${reward}₽ / 1к просмотров</strong></div>
            ${acceptedDate ? `<div>•</div><div>Принято: ${acceptedDate}</div>` : ''}
          </div>
          <p class="material-desc">${material.description || 'Разместите рекламу в своем контенте'}</p>
          ${comment ? `<div class="material-comment"><strong>Комментарий модератора:</strong><div>${comment}</div></div>` : ''}
        </div>
        <div class="material-actions">
          ${userMat ? `<div class="status-pill ${statusData.cls}">${statusData.text}</div>` : `<div style="height:34px;"></div>`}
          <button class="ios-button small take-btn" ${disabled ? 'disabled' : ''} style="${disabled ? 'opacity:0.6;cursor:not-allowed;' : ''}">
            <span class="btn-text">${actionLabel}</span>
            <span class="btn-loader hidden"><i class="fas fa-spinner fa-spin"></i></span>
          </button>
          ${material.url ? `<a href="${material.url}" target="_blank" class="material-link small">Материалы</a>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Обработчики для кнопок "Принять задание"
  document.querySelectorAll('.take-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (this.disabled) return;
      const btnText = this.querySelector('.btn-text');
      const btnLoader = this.querySelector('.btn-loader');

      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');

      const materialId = this.closest('.material-item').dataset.id;
      const uid = auth.currentUser?.uid;

      if (!uid) {
        showNotification('Сначала войдите в аккаунт', 'error');
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        return;
      }

      try {
        // Сохранить в users/{uid}/materials/{id}
        await update(ref(db, `users/${uid}/materials`), {
          [materialId]: {
            accepted: new Date().toISOString(),
            status: 'in_progress'
          }
        });
        showNotification('Задание успешно принято!');
        // обновим отображение (переоткрыть материалы)
        displayMaterials(document.querySelector('.filter-btn.active').dataset.platform);
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
      document.getElementById('profile-name').textContent = userData.name || 'Пользователь';
      document.getElementById('profile-balance').textContent = `${userData.balance || 0} ₽`;
      document.getElementById('profile-tiktok').textContent = userData.tiktok || "Не указан";
      document.getElementById('profile-youtube').textContent = userData.youtube || "Не указан";
      const avatarEl = document.getElementById('profile-avatar');
      avatarEl.src = userData.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

      // top logout
      document.getElementById('logout-btn-top').addEventListener('click', () => {
        if (confirm('Точно хотите выйти?')) {
          signOut(auth);
        }
      });

      // Save tiktok
      document.getElementById('save-tiktok').addEventListener('click', async () => {
        const btn = document.getElementById('save-tiktok');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        btnText.classList.add('hidden'); btnLoader.classList.remove('hidden');
        const tiktok = document.getElementById('tiktok-input').value;
        if (tiktok) {
          try {
            await saveUserData(uid, { tiktok });
            document.getElementById('profile-tiktok').textContent = tiktok;
            showNotification('TikTok сохранен!');
          } catch (error) {
            showNotification(`Ошибка: ${error.message}`, 'error');
          } finally {
            btnText.classList.remove('hidden'); btnLoader.classList.add('hidden');
          }
        } else {
          showNotification('Введите никнейм TikTok', 'error');
          btnText.classList.remove('hidden'); btnLoader.classList.add('hidden');
        }
      });

      // Save youtube
      document.getElementById('save-youtube').addEventListener('click', async () => {
        const btn = document.getElementById('save-youtube');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        btnText.classList.add('hidden'); btnLoader.classList.remove('hidden');
        const youtube = document.getElementById('youtube-input').value;
        if (youtube) {
          try {
            await saveUserData(uid, { youtube });
            document.getElementById('profile-youtube').textContent = youtube;
            showNotification('YouTube сохранен!');
          } catch (error) {
            showNotification(`Ошибка: ${error.message}`, 'error');
          } finally {
            btnText.classList.remove('hidden'); btnLoader.classList.add('hidden');
          }
        } else {
          showNotification('Введите ID канала', 'error');
          btnText.classList.remove('hidden'); btnLoader.classList.add('hidden');
        }
      });

      // Payout logic: только вывод от 1000 ₽
      const payoutRow = document.getElementById('payout-row');
      payoutRow.innerHTML = '';
      const balance = Number(userData.balance || 0);
      if (balance >= 1000) {
        const payoutBtn = document.createElement('button');
        payoutBtn.className = 'ios-button payout';
        payoutBtn.textContent = 'Вывести деньги';
        payoutBtn.addEventListener('click', () => {
          // здесь можно добавить логику выплат
          showNotification('Запрос на вывод создан. Администратор свяжется с вами.', 'success');
        });
        payoutRow.appendChild(payoutBtn);
      } else {
        const info = document.createElement('div');
        info.textContent = 'Выплата доступна от 1000 ₽';
        info.style.color = '#666';
        payoutRow.appendChild(info);
      }

      // Avatar upload handling (imgbb)
      const avatarFileInput = document.getElementById('avatar-file');
      const avatarUploadLabel = document.getElementById('avatar-upload-label');
      avatarUploadLabel.addEventListener('click', () => avatarFileInput.click());

      avatarFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // show loader on label
        avatarUploadLabel.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        try {
          const base64 = await fileToBase64(file);
          const body = new URLSearchParams();
          // imgbb expects raw base64 (without data:image/...;base64,)
          const pure = base64.replace(/^data:image\/[a-z]+;base64,/, '');
          body.append('image', pure);

          const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
          });

          const json = await res.json();
          if (!json.success) throw new Error(json.error?.message || 'Ошибка загрузки изображения');
          const imageUrl = json.data.url;
          // save to user
          await saveUserData(uid, { avatar: imageUrl });
          document.getElementById('profile-avatar').src = imageUrl;
          showNotification('Аватар обновлён');
        } catch (err) {
          console.error(err);
          showNotification('Ошибка загрузки аватара', 'error');
        } finally {
          avatarUploadLabel.innerHTML = `<i class="fas fa-camera"></i> Изменить аватар
            <input type="file" id="avatar-file" accept="image/*">`;
          // rebind input (новый элемент)
          document.getElementById('avatar-file').addEventListener('change', async (e) => {
            const ev = new Event('change');
            avatarFileInput.dispatchEvent(ev);
          });
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

// конвертируем файл в base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Инициализация вкладок
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
