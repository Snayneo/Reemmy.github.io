// app.js — логика приложения
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
  sendEmailVerification,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential
} from './firebase.js';

const IMGBB_API_KEY = '1e56db850ecdc3cd2c8ac1e73dac0eb8';

// DOM
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const dynamicContent = document.getElementById('dynamic-content');
const tabButtons = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const notification = document.getElementById('notification');

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

// Секции HTML (динамически вставляются)
const sections = {
  main: `
    <div class="ios-section">
      <h2 class="ios-title">Главная</h2>
      <div class="ios-card news-card">
        <img src="https://i.ibb.co/0jQ7J3T/reemmy-banner.jpg" alt="Reemmy" class="card-image">
        <h3>Reemmy — заработок в соцсетях</h3>
        <p>Принимай задания, интегрируй материалы и получай вознаграждение.</p>
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
      <div class="materials-list" id="materials-list"></div>
    </div>
  `,
  stats: `
    <div class="ios-section">
      <h2 class="ios-title">Статистика</h2>
      <div id="stats-container"></div>
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
      </div>

      <div class="ios-card">
        <h3><i class="fab fa-tiktok"></i> TikTok</h3>
        <input type="text" id="tiktok-input" placeholder="@username" class="profile-input">
        <button class="ios-button small" id="save-tiktok">Сохранить</button>
      </div>

      <div class="ios-card">
        <h3><i class="fab fa-youtube"></i> YouTube</h3>
        <input type="text" id="youtube-input" placeholder="ID канала или ссылка" class="profile-input">
        <button class="ios-button small" id="save-youtube">Сохранить</button>
      </div>

      <div class="ios-card">
        <h3><i class="fas fa-lock"></i> Безопасность</h3>
        <button class="ios-button small" id="change-password-btn">Сменить пароль</button>
      </div>

      <div id="email-verify-container"></div>
    </div>
  `
};

// Загрузка данных пользователя
async function loadUserData(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}

// Загрузка материалов (узел Materials)
async function loadMaterials() {
  try {
    const snap = await get(ref(db, 'Materials'));
    return snap.exists() ? snap.val() : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

// Отрисовка материалов
async function displayMaterials(filterPlatform = 'all') {
  const materialsList = document.getElementById('materials-list');
  materialsList.innerHTML = `<div class="ios-card"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>`;
  const materials = await loadMaterials();
  const uid = auth.currentUser?.uid;
  const userData = uid ? await loadUserData(uid) : null;

  if (!materials) {
    materialsList.innerHTML = `<div class="ios-card">Нет заданий</div>`;
    return;
  }

  let arr = Object.entries(materials);
  if (filterPlatform !== 'all') arr = arr.filter(([_, m]) => m.platform === filterPlatform);

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

    return `
      <div class="ios-card material-item" data-id="${id}">
        <div class="material-head">${platformIcon} <strong>${material.title || 'Рекламное задание'}</strong></div>
        <div class="material-description">${material.description || ''}</div>
        <div class="material-row"><div>Платформа: ${material.platform || 'Любая'}</div><div>Вознаграждение: ${rewardText}</div></div>
        <div class="material-actions">${actions}</div>
      </div>
    `;
  }).join('');

  // события
  document.querySelectorAll('.take-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.dataset.id;
      const uid = auth.currentUser?.uid;
      if (!uid) { showNotification('Войдите в аккаунт', 'error'); return; }

      const btnText = this.querySelector('.btn-text');
      const btnLoader = this.querySelector('.btn-loader');
      btnText?.classList.add('hidden');
      btnLoader?.classList.remove('hidden');

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
        });
        showNotification('Задание принято');
      } catch (err) {
        console.error(err);
        showNotification('Ошибка при принятии', 'error');
      } finally {
        btnText?.classList.remove('hidden');
        btnLoader?.classList.add('hidden');
        displayMaterials(filterPlatform);
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
    });
  });

  document.querySelectorAll('.filter-btn').forEach(b => {
    b.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
      displayMaterials(this.dataset.platform);
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
    }

    if (pending.length === 0) {
      statsContainer.innerHTML = `<div class="ios-card">Нет заданий на подтверждение</div>`;
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
      });
    });

  } else {
    // простой пользователь — статистика своих заданий
    if (!userData?.materials || Object.keys(userData.materials).length === 0) {
      statsContainer.innerHTML = `<div class="ios-card">У вас нет активных заданий</div>`;
      return;
    }
    const mats = userData.materials;
    const total = Object.keys(mats).length;
    const completed = Object.values(mats).filter(m => m.status === 'completed').length;
    const pending = Object.values(mats).filter(m => m.status === 'pending').length;
    const rejected = Object.values(mats).filter(m => m.status === 'not_completed').length;
    const earnings = Object.values(mats).reduce((s, m) => s + (m.earnings || 0), 0);

    statsContainer.innerHTML = `
      <div class="stats-summary">
        <div class="stat-card"><h3>Всего</h3><p>${total}</p></div>
        <div class="stat-card"><h3>Выполнено</h3><p>${completed}</p></div>
        <div class="stat-card"><h3>На проверке</h3><p>${pending}</p></div>
        <div class="stat-card"><h3>Отклонено</h3><p>${rejected}</p></div>
        <div class="stat-card"><h3>Заработано</h3><p>${earnings.toFixed(2)}₽</p></div>
      </div>
      <div class="tasks-list">
        <h3>История</h3>
        ${Object.entries(mats).map(([id, t]) => `
          <div class="task-item">
            <h4>${t.title}</h4>
            <p>Статус: ${t.status}</p>
            <p>Принято: ${t.accepted ? new Date(t.accepted).toLocaleDateString() : '-'}</p>
            ${t.status === 'not_completed' && t.rejectionReason ? `<p><strong>Причина:</strong> ${t.rejectionReason}</p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }
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
    });

    // logout button in profile
    document.getElementById('logout-btn-top').addEventListener('click', showLogoutModal);
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
    }
  });
}

// запуск
document.addEventListener('DOMContentLoaded', initApp);
