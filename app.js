import {
  auth,
  db,
  ref,
  set,
  get,
  update,
  push,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from './firebase.js';

/* -----------------------
  Конфигурация ImgBB
  (вы дали ключ — используем как ключ imgbb)
  Если вы действительно используете другой сервис — замените URL и параметры.
-------------------------*/
const IMGBB_API_KEY = "1e56db850ecdc3cd2c8ac1e73dac0eb8"; // ваш ключ (предположим imgbb)
const IMGBB_UPLOAD_ENDPOINT = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;

/* -----------------------
  DOM
-------------------------*/
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const dynamicContent = document.getElementById('dynamic-content');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');

const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const forgotPasswordLink = document.getElementById('forgot-password');

const showLoginPassword = document.getElementById('show-login-password');
const showSignupPassword = document.getElementById('show-signup-password');

const notification = document.getElementById('notification');
const tabButtons = document.querySelectorAll('.tab-btn');
const headerAvatar = document.getElementById('header-avatar');
const headerAvatarBtn = document.getElementById('header-avatar-btn');
const headerBalance = document.getElementById('header-balance');
const menuToggle = document.getElementById('menu-toggle');

/* -----------------------
  Шаблоны секций (html строки)
-------------------------*/
function mainSectionHTML() {
  return `
    <section class="ios-section">
      <h2 class="ios-title">Главная</h2>

      <div class="card hero">
        <div class="hero-left">
          <h3>Добро пожаловать в Reemmy</h3>
          <p>Зарабатывайте на размещении рекламы в своих видео — быстрые выплаты и поддержка.</p>
          <div class="hero-stats">
            <div class="hero-stat">
              <div class="num" id="home-total-earned">0₽</div>
              <div class="label">Всего заработано</div>
            </div>
            <div class="hero-stat">
              <div class="num" id="home-balance">0₽</div>
              <div class="label">Текущий баланс</div>
            </div>
          </div>
        </div>
        <div class="hero-right">
          <img src="https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=600&q=80" alt="Main" />
        </div>
      </div>

      <div class="card features">
        <h4>Почему мы</h4>
        <div class="features-grid">
          <div class="feature"><i class="fas fa-check-circle"></i><span>Высокие ставки</span></div>
          <div class="feature"><i class="fas fa-bolt"></i><span>Быстрые выплаты</span></div>
          <div class="feature"><i class="fas fa-headset"></i><span>Поддержка 24/7</span></div>
        </div>
      </div>
    </section>
  `;
}

function materialsSectionHTML() {
  return `
    <section class="ios-section">
      <h2 class="ios-title">Доступные задания</h2>
      <div id="tasks-container" class="tasks-grid">
        <div class="loading">Загрузка заданий...</div>
      </div>
    </section>
  `;
}

function statsSectionHTML() {
  return `
    <section class="ios-section">
      <h2 class="ios-title">Статистика</h2>
      <div class="card stats-card">
        <div class="stat-row">
          <div class="stat-item">
            <div class="stat-value" id="stats-tasks-done">0</div>
            <div class="stat-label">Выполнено заданий</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="stats-total-earned">0₽</div>
            <div class="stat-label">Всего заработано</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="stats-balance">0₽</div>
            <div class="stat-label">Текущий баланс</div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function profileSectionHTML() {
  return `
    <section class="ios-section profile-screen">
      <div class="profile-top card">
        <div class="profile-left">
          <div class="profile-avatar-wrap">
            <img id="profile-avatar" class="profile-avatar" src="" alt="avatar" />
            <input id="avatar-input" type="file" accept="image/*" class="hidden" />
            <button id="change-avatar-btn" class="btn small">Загрузить аватар</button>
          </div>
        </div>
        <div class="profile-right">
          <div class="profile-name" id="profile-name">Пользователь</div>
          <div class="profile-email" id="profile-email">Email: —</div>
          <div class="profile-money">
            <div>Текущий баланс: <strong id="profile-balance">0₽</strong></div>
            <div>Всего заработано: <strong id="profile-total-earned">0₽</strong></div>
          </div>
        </div>
        <button id="logout-btn" class="icon-logout" title="Выйти"><i class="fas fa-sign-out-alt"></i></button>
      </div>

      <div class="card profile-actions">
        <button id="withdraw-btn" class="btn ios-button">Вывести средства</button>
        <div class="muted">Кнопка "Вывести" — подключите платёжную интеграцию для реальных выплат.</div>
      </div>

    </section>
  `;
}

/* -----------------------
  Утилиты
-------------------------*/
function showNotification(msg, type = 'success') {
  notification.textContent = msg;
  notification.className = `notification ${type}`;
  notification.classList.remove('hidden');
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3500);
}

function togglePasswordButton(btn, inputId) {
  btn.addEventListener('click', () => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPwd = input.type === 'password';
    input.type = isPwd ? 'text' : 'password';
    btn.innerHTML = isPwd ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
  });
}

/* -----------------------
  Firebase-related helpers
-------------------------*/
async function readUserData(uid) {
  try {
    const snap = await get(ref(db, `users/${uid}`));
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function writeUserData(uid, data) {
  try {
    await update(ref(db, `users/${uid}`), data);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/* -----------------------
  Работа с аватаром:
  - default: DiceBear (seed = uid)
  - пользователь может загрузить файл -> отправим в ImgBB -> сохраним URL в users/{uid}/avatar
-------------------------*/
function diceBearAvatar(seed, size = 128, style = 'avataaars') {
  return `https://api.dicebear.com/7.x/${encodeURIComponent(style)}/svg?seed=${encodeURIComponent(seed)}&scale=100`;
}

async function uploadImageToImgBB(file) {
  // читаем как base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // base64 без префикса
        const base64 = reader.result.split(',')[1];
        const form = new FormData();
        form.append('image', base64);
        // POST на imgbb
        const res = await fetch(IMGBB_UPLOAD_ENDPOINT, {
          method: 'POST',
          body: form
        });
        const json = await res.json();
        if (json && json.data && json.data.url) {
          resolve(json.data.url);
        } else {
          reject(new Error('Ошибка загрузки изображения'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

/* -----------------------
  Загрузка и показ секций
-------------------------*/
async function loadSection(sectionName, user) {
  // вставляем html
  if (sectionName === 'main') {
    dynamicContent.innerHTML = mainSectionHTML();
    // обновим данные пользователя
    if (user) await fillHomeStats(user.uid);
  } else if (sectionName === 'materials') {
    dynamicContent.innerHTML = materialsSectionHTML();
    await loadTasks(user);
  } else if (sectionName === 'stats') {
    dynamicContent.innerHTML = statsSectionHTML();
    if (user) await fillStats(user.uid);
  } else if (sectionName === 'profile') {
    dynamicContent.innerHTML = profileSectionHTML();
    if (user) await setupProfile(user);
  }

  tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionName));
}

/* -----------------------
  Запрос заданий из RTDB: ожидается структура в /Materials или /materials
  каждое задание: title, description, platform, reward, url, users (владельцы/взявшие)
-------------------------*/
async function loadTasks(currentUser) {
  const container = document.getElementById('tasks-container');
  container.innerHTML = '<div class="loading">Загрузка заданий...</div>';
  try {
    // сначала пробуем путь "Materials", потом "materials"
    let snap = await get(ref(db, `Materials`));
    if (!snap.exists()) snap = await get(ref(db, `materials`));
    const tasksObj = snap.exists() ? snap.val() : null;

    if (!tasksObj) {
      container.innerHTML = '<div class="muted">Заданий пока нет.</div>';
      return;
    }

    // tasksObj может быть объектом с ключами
    const tasks = [];
    Object.entries(tasksObj).forEach(([id, t]) => {
      // т.к. у вас в базе может быть вложенность — просто берем поля
      tasks.push({ id, ...t });
    });

    // отрисовка сетки
    container.innerHTML = '';
    tasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'task-card card';

      // reward formatting
      const rewardFormatted = (Number(task.reward) >= 1) ? `${Number(task.reward).toFixed(0)}₽` : `${Number(task.reward)}₽`;

      card.innerHTML = `
        <div class="task-top">
          <div class="task-title">${escapeHtml(task.title || 'Задание')}</div>
          <div class="task-reward">${rewardFormatted}</div>
        </div>
        <div class="task-body">
          <div class="task-desc">${escapeHtml(task.description || '')}</div>
          <div class="task-meta">
            <span class="meta-item"><i class="fab fa-${(task.platform || '').toLowerCase() === 'tiktok' ? 'tiktok' : 'globe'}"></i> ${escapeHtml(task.platform || '—')}</span>
            <a class="meta-item link" href="${escapeHtml(task.url || '#')}" target="_blank">Ссылка</a>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn take-btn">${isTaskTakenByUser(task, currentUser) ? 'Отметить выполненным' : 'Взять задание'}</button>
          <div class="support-message small muted" id="support-${task.id}">Подсказка: свяжитесь с поддержкой в профиле</div>
        </div>
      `;

      // обработчик кнопки
      const btn = card.querySelector('.take-btn');
      btn.addEventListener('click', async () => {
        if (!currentUser) { showNotification('Войдите чтобы взять задание', 'error'); return; }
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Подождите...';
        try {
          await takeOrCompleteTask(task, currentUser.uid);
          // смена текста
          btn.textContent = 'Отметить выполненным';
          showNotification('Задание принято. После проверки начисление будет отображено.', 'success');
          // обновим профиль/баланс
          const userData = await readUserData(currentUser.uid);
          updateHeaderBalance(userData);
        } catch (err) {
          console.error(err);
          showNotification('Ошибка при взятии задания', 'error');
        } finally {
          btn.disabled = false;
        }
      });

      container.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="muted">Ошибка загрузки заданий.</div>';
  }
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe || '';
  return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function isTaskTakenByUser(task, currentUser) {
  if (!currentUser) return false;
  if (!task.users) return false;
  // task.users может быть объект с ключами пользователей
  return Object.values(task.users).some(val => val === currentUser.uid || val === true || typeof val === 'string' && val.includes(currentUser.uid));
}

/* -----------------------
  Логика взятия/выполнения задания
  - Для простоты: когда пользователь нажимает "Взять", мы добавляем запись в
    tasks/{taskId}/users/{uid} = true (или users: { uid: true })
  - Затем можно автоматически начислять reward в user.balance и totalEarned
    (в реальных сценариях — это происходит после проверки админом)
-------------------------*/
async function takeOrCompleteTask(task, uid) {
  const taskRef = ref(db, `Materials/${task.id}`);
  // Попробуем пометить пользователя как взявшего
  const updates = {};
  // set user in task users
  updates[`Materials/${task.id}/users/${uid}`] = true;
  // Добавим в профиль пользователя запись о взятом задании
  updates[`users/${uid}/materials/${task.id}`] = {
    title: task.title || '',
    platform: task.platform || '',
    reward: Number(task.reward) || 0,
    takenAt: Date.now(),
    completed: false
  };

  // если вы хотите начислять сразу:
  const reward = Number(task.reward) || 0;
  if (reward > 0) {
    // получим текущие значения
    const userSnap = await get(ref(db, `users/${uid}`));
    const userData = userSnap.exists() ? userSnap.val() : {};
    const prevBal = Number(userData.balance || 0);
    const prevTotal = Number(userData.totalEarned || 0);
    updates[`users/${uid}/balance`] = prevBal + reward;
    updates[`users/${uid}/totalEarned`] = prevTotal + reward;
  }

  // применяем все апдейты атомарно
  await update(ref(db), updates);
}

/* -----------------------
  Профиль: показать, загрузка аватарки, logout, withdraw
-------------------------*/
async function setupProfile(currentUser) {
  if (!currentUser) return;
  const uid = currentUser.uid;
  const userData = await readUserData(uid) || {};

  // avatar fallback
  const avatarEl = document.getElementById('profile-avatar');
  const headerAv = document.getElementById('header-avatar');
  const avatarUrl = userData.avatar || diceBearAvatar(uid);
  avatarEl.src = avatarUrl;
  if (headerAv) headerAv.src = avatarUrl;

  document.getElementById('profile-name').textContent = userData.name || currentUser.displayName || 'Пользователь';
  document.getElementById('profile-email').textContent = `Email: ${userData.email || currentUser.email || '—'}`;
  document.getElementById('profile-balance').textContent = `${Number(userData.balance || 0)}₽`;
  document.getElementById('profile-total-earned').textContent = `${Number(userData.totalEarned || 0)}₽`;

  // Установим обработчики
  const changeAvatarBtn = document.getElementById('change-avatar-btn');
  const avatarInput = document.getElementById('avatar-input');
  changeAvatarBtn.addEventListener('click', () => avatarInput.click());

  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    changeAvatarBtn.disabled = true;
    changeAvatarBtn.textContent = 'Загрузка...';
    try {
      const url = await uploadImageToImgBB(file);
      // сохраняем в базе
      await writeUserData(uid, { avatar: url });
      avatarEl.src = url;
      if (headerAv) headerAv.src = url;
      showNotification('Аватар сохранён', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Ошибка загрузки аватара. Попробуйте позже', 'error');
    } finally {
      changeAvatarBtn.disabled = false;
      changeAvatarBtn.textContent = 'Загрузить аватар';
    }
  });

  // logout
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      showNotification('Вы вышли из системы', 'success');
    } catch (err) {
      showNotification('Ошибка при выходе', 'error');
    }
  });

  // withdraw (псевдо)
  const withdrawBtn = document.getElementById('withdraw-btn');
  withdrawBtn.addEventListener('click', () => {
    showNotification('Вывод: подключите платёжную систему (псевдо-функция).', 'success');
  });
}

/* -----------------------
  Обновление header-баланса и home stats
-------------------------*/
async function updateHeaderBalance(userData) {
  if (!userData) return;
  const bal = Number(userData.balance || 0);
  headerBalance.textContent = `Баланс: ${bal}₽`;
  const homeBalEl = document.getElementById('home-balance');
  const homeTotalEl = document.getElementById('home-total-earned');
  if (homeBalEl) homeBalEl.textContent = `${bal}₽`;
  if (homeTotalEl) homeTotalEl.textContent = `${Number(userData.totalEarned || 0)}₽`;
}

async function fillHomeStats(uid) {
  const userData = await readUserData(uid);
  updateHeaderBalance(userData);
}

async function fillStats(uid) {
  const userData = await readUserData(uid) || {};
  document.getElementById('stats-tasks-done').textContent = Object.keys(userData.materials || {}).length;
  document.getElementById('stats-total-earned').textContent = `${Number(userData.totalEarned || 0)}₽`;
  document.getElementById('stats-balance').textContent = `${Number(userData.balance || 0)}₽`;
}

/* -----------------------
  AUTH logic: tabs, forms, handlers
-------------------------*/
function resetAuthForms() {
  loginForm.reset();
  signupForm.reset();
}

/* Toggle tabs */
loginTab.addEventListener('click', () => {
  loginTab.classList.add('active');
  signupTab.classList.remove('active');
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
  resetAuthForms();
});
signupTab.addEventListener('click', () => {
  signupTab.classList.add('active');
  loginTab.classList.remove('active');
  signupForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  resetAuthForms();
});

togglePasswordButton(showLoginPassword, 'login-password');
togglePasswordButton(showSignupPassword, 'signup-password');

/* LOGIN submit */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btnText = loginBtn.querySelector('.btn-text');
  const loader = loginBtn.querySelector('.btn-loader');
  btnText.classList.add('hidden'); loader.classList.remove('hidden');
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showNotification('Вход выполнен', 'success');
  } catch (err) {
    console.error(err);
    const map = {
      'auth/invalid-email': 'Неверный формат email',
      'auth/user-not-found': 'Пользователь не найден',
      'auth/wrong-password': 'Неверный пароль',
      'auth/too-many-requests': 'Слишком много попыток'
    };
    showNotification(map[err.code] || err.message || 'Ошибка входа', 'error');
  } finally {
    btnText.classList.remove('hidden'); loader.classList.add('hidden');
  }
});

/* SIGNUP submit */
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const btnText = signupBtn.querySelector('.btn-text');
  const loader = signupBtn.querySelector('.btn-loader');
  btnText.classList.add('hidden'); loader.classList.remove('hidden');
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    // записываем базовые данные
    const defaultData = {
      name: name || '',
      email,
      balance: 0,
      totalEarned: 0,
      materials: {}
    };
    await set(ref(db, `users/${uid}`), defaultData);
    showNotification('Регистрация прошла успешно. Войдите в систему.', 'success');
    // переключимся на вкладку входа
    loginTab.click();
  } catch (err) {
    console.error(err);
    const map = {
      'auth/email-already-in-use': 'Email уже используется',
      'auth/invalid-email': 'Неверный email',
      'auth/weak-password': 'Пароль должен быть минимум 6 символов'
    };
    showNotification(map[err.code] || err.message || 'Ошибка регистрации', 'error');
  } finally {
    btnText.classList.remove('hidden'); loader.classList.add('hidden');
  }
});

/* Forgot password */
forgotPasswordLink.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  if (!email) return showNotification('Введите email для восстановления', 'error');
  try {
    await sendPasswordResetEmail(auth, email);
    showNotification('Письмо для сброса пароля отправлено', 'success');
  } catch (err) {
    showNotification('Ошибка отправки письма: ' + (err.message || ''), 'error');
  }
});

/* Header avatar click -> profile */
headerAvatarBtn && headerAvatarBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) {
    showNotification('Войдите в систему', 'error');
    return;
  }
  await loadSection('profile', user);
});

/* Tabbar handlers */
tabButtons.forEach(btn => btn.addEventListener('click', async () => {
  const section = btn.dataset.section;
  const user = auth.currentUser;
  await loadSection(section, user);
}));

/* -----------------------
  Auth state change
-------------------------*/
onAuthStateChanged(auth, async (user) => {
  if (user) {
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    // обновление header avatar + баланс
    const userData = await readUserData(user.uid);
    const avatarUrl = (userData && userData.avatar) ? userData.avatar : diceBearAvatar(user.uid);
    headerAvatar.src = avatarUrl;
    updateHeaderBalance(userData || {});
    // load main
    await loadSection('main', user);
  } else {
    appScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
  }
});

/* -----------------------
  Когда страница загрузилась — инициализация UI по умолчанию
-------------------------*/
document.addEventListener('DOMContentLoaded', () => {
  // установим дефолтный header avatar
  headerAvatar.src = diceBearAvatar('guest');
});
