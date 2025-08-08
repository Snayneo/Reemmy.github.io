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

// IMGBB API KEY
const IMGBB_API_KEY = '1e56db850ecdc3cd2c8ac1e73dac0eb8';

// Шаблон данных пользователя
const userDataTemplate = {
  name: "",
  email: "",
  tiktok: "",
  youtube: "",
  balance: 0,
  rewards: {},
  materials: {},
  avatar: ""
};

// Секции (как ранее — можно оставить ваш HTML-шаблон)
const sections = {
  main: `...`,       // вставьте свой HTML-шаблон main (или используйте прежний)
  materials: `...`,  // вставьте шаблон materials
  stats: `...`,      // вставьте шаблон stats
  profile: `...`     // вставьте шаблон profile (тот же, что и раньше)
};

// Небольшая утилита вывода уведомлений
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.remove('hidden');
  setTimeout(() => notification.classList.add('hidden'), 3000);
}

// Firebase чтение/запись
async function loadUserData(uid) {
  const snapshot = await get(ref(db, `users/${uid}`));
  return snapshot.exists() ? snapshot.val() : null;
}
async function saveUserData(uid, data) {
  await update(ref(db, `users/${uid}`), data);
}
async function loadMaterials() {
  try {
    const snapshot = await get(ref(db, 'Materials'));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error(error);
    showNotification('Ошибка загрузки заданий', 'error');
    return null;
  }
}
async function loadUserMaterials(uid) {
  const sn = await get(ref(db, `users/${uid}/materials`));
  return sn.exists() ? sn.val() : {};
}

// Конвертер файла в base64
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

// Маппинг статуса -> стиль/текст
function mapStatus(status) {
  if (!status) return { cls: 'status-in_progress', text: 'Доступно' };
  const s = String(status).toLowerCase();
  if (s.includes('отклон')) return { cls: 'status-rejected', text: 'Отклонено' };
  if (s.includes('completed') || s.includes('выполн')) return { cls: 'status-completed', text: 'Выполнено' };
  if (s.includes('in_progress') || s.includes('в_работе') ) return { cls: 'status-in_progress', text: 'В работе' };
  return { cls: 'status-in_progress', text: status };
}

/* ========== displayMaterials (тот же код, что у вас был) ========== */
/* Реализация должна быть вставлена сюда — функция displayMaterials, как в предыдущем app.js,
   она использует loadMaterials(), loadUserMaterials(), mapStatus() и обновляет DOM. */

/* ========== loadSection ========== */
async function loadSection(sectionId, uid) {
  dynamicContent.innerHTML = sections[sectionId];

  tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionId));

  if (sectionId === 'profile' && uid) {
    const userData = await loadUserData(uid) || {};
    const profileNameEl = document.getElementById('profile-name');
    const profileBalanceEl = document.getElementById('profile-balance');
    const profileTiktokEl = document.getElementById('profile-tiktok');
    const profileYoutubeEl = document.getElementById('profile-youtube');
    const profileAvatarEl = document.getElementById('profile-avatar');

    profileNameEl.textContent = userData.name || auth.currentUser?.displayName || 'Пользователь';
    profileBalanceEl.textContent = `${userData.balance || 0} ₽`;
    profileTiktokEl.textContent = userData.tiktok || 'Не указан';
    profileYoutubeEl.textContent = userData.youtube || 'Не указан';
    // Сначала берем avatar из auth, затем из DB, затем дефолт
    profileAvatarEl.src = auth.currentUser?.photoURL || userData.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

    // Кнопка выхода в углу
    const logoutBtnTop = document.getElementById('logout-btn-top');
    logoutBtnTop.addEventListener('click', () => {
      if (confirm('Точно хотите выйти?')) signOut(auth);
    });

    // Сохранение соцсетей (как было раньше)
    document.getElementById('save-tiktok').addEventListener('click', async () => {
      const tiktok = document.getElementById('tiktok-input').value;
      if (!tiktok) return showNotification('Введите никнейм TikTok', 'error');
      try { await saveUserData(uid, { tiktok }); showNotification('TikTok сохранен!'); } 
      catch (e) { showNotification(`Ошибка: ${e.message}`, 'error'); }
    });
    document.getElementById('save-youtube').addEventListener('click', async () => {
      const youtube = document.getElementById('youtube-input').value;
      if (!youtube) return showNotification('Введите ID канала', 'error');
      try { await saveUserData(uid, { youtube }); showNotification('YouTube сохранен!'); } 
      catch (e) { showNotification(`Ошибка: ${e.message}`, 'error'); }
    });

    // Payout — от 1000 ₽
    const payoutRow = document.getElementById('payout-row');
    payoutRow.innerHTML = '';
    const balance = Number(userData.balance || 0);
    if (balance >= 1000) {
      const payoutBtn = document.createElement('button');
      payoutBtn.className = 'ios-button payout';
      payoutBtn.textContent = 'Вывести деньги';
      payoutBtn.addEventListener('click', () => showNotification('Запрос на вывод создан. Администратор свяжется с вами.', 'success'));
      payoutRow.appendChild(payoutBtn);
    } else {
      const hint = document.createElement('div');
      hint.textContent = 'Выплата доступна от 1000 ₽';
      hint.style.color = '#666';
      payoutRow.appendChild(hint);
    }

    // ========== AVATAR UPLOAD (imgbb) ==========
    // NOTE: мы будем обновлять и DB, и Auth через updateProfile
    // Элемент input
    const avatarFileInput = document.getElementById('avatar-file');
    const avatarUploadLabel = document.getElementById('avatar-upload-label');

    // Клик по лейблу — открыть файл
    avatarUploadLabel.addEventListener('click', () => avatarFileInput.click());

    avatarFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      avatarUploadLabel.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
      try {
        const base64 = await fileToBase64(file);
        const pure = base64.replace(/^data:image\/[a-z]+;base64,/, '');
        const body = new URLSearchParams();
        body.append('image', pure);

        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || 'Ошибка imgbb');

        const imageUrl = json.data.url;
        // 1) Обновляем профиль в Firebase Auth
        if (auth.currentUser) {
          try {
            await updateProfile(auth.currentUser, { photoURL: imageUrl });
          } catch (err) {
            console.warn('Не удалось обновить auth profile:', err);
          }
        }
        // 2) Сохраняем в Realtime DB
        await saveUserData(auth.currentUser.uid, { avatar: imageUrl });

        // Обновляем DOM
        profileAvatarEl.src = imageUrl;
        showNotification('Аватар обновлён');
      } catch (err) {
        console.error(err);
        showNotification('Ошибка загрузки аватара', 'error');
      } finally {
        // Восстанавливаем лейбл и input (пересоздать input чтобы очистить value)
        avatarUploadLabel.innerHTML = `<i class="fas fa-camera"></i> Изменить аватар
          <input type="file" id="avatar-file" accept="image/*">`;
        // биндим новый input
        const newInput = document.getElementById('avatar-file');
        newInput.addEventListener('change', avatarFileInput.dispatchEvent.bind(avatarFileInput, new Event('change')));
      }
    });
  }

  if (sectionId === 'materials') {
    // вызов вашей displayMaterials
    await displayMaterials();
    // фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        displayMaterials(this.dataset.platform);
      });
    });
  }
}

/* ========== auth state, forms, инициализация ========== */
tabButtons.forEach(btn => btn.addEventListener('click', () => {
  const uid = auth.currentUser?.uid;
  if (uid) loadSection(btn.dataset.section, uid);
}));

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
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Установим displayName в Auth
    try { await updateProfile(cred.user, { displayName: name }); } catch (e) { console.warn(e); }
    const userData = { ...userDataTemplate, name, email, avatar: cred.user.photoURL || '' };
    await set(ref(db, `users/${cred.user.uid}`), userData);
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

// Переключение вкладок формы
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
