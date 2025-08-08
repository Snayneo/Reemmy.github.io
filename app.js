// app.js (module)
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
  sendPasswordResetEmail,
  updatePassword,
  updateProfile as fbUpdateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential
} from './firebase.js';

// DOM
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const dynamicContent = document.getElementById('dynamic-content');
const notification = document.getElementById('notification');

// Auth forms
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const passwordResetForm = document.getElementById('password-reset-form');
const showPasswordResetBtn = document.getElementById('show-password-reset');
const backToLoginBtn = document.getElementById('back-to-login');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');

const smallAvatar = document.getElementById('small-avatar');
const smallName = document.getElementById('small-name');
const smallEmail = document.getElementById('small-email');
const logoutBtn = document.getElementById('logout-btn');
const adminTabBtn = document.getElementById('admin-tab');

const sidebarTabs = document.querySelectorAll('.sidebar .tab-btn, .tabs-vertical .tab-btn');
const sideTabButtons = document.querySelectorAll('.tabs-vertical .tab-btn');

// Templates (sections)
const sections = {
  main: `
    <div class="ios-section">
      <h2>Главная</h2>
      <div class="ios-card">
        <img class="card-image" src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1074&q=80" alt="Reemmy">
        <h3>Reemmy — зарабатывать легко</h3>
        <p>Размещай рекламные материалы в видео, зарабатывай за просмотры.</p>
      </div>
    </div>
  `,
  materials: `
    <div class="ios-section">
      <h2>Доступные задания</h2>
      <div class="ios-card" id="materials-card">
        <div class="materials-controls">
          <button class="filter-btn active" data-platform="all">Все</button>
          <button class="filter-btn" data-platform="tiktok">TikTok</button>
          <button class="filter-btn" data-platform="youtube">YouTube</button>
          <button class="filter-btn" data-platform="instagram">Instagram</button>
        </div>
        <div id="materials-list" style="margin-top:12px"></div>
      </div>
    </div>
  `,
  stats: `
    <div class="ios-section">
      <h2>Статистика</h2>
      <div id="stats-container"></div>
    </div>
  `,
  profile: `
    <div class="ios-section">
      <h2>Профиль</h2>
      <div class="ios-card">
        <div style="display:flex;gap:12px;align-items:center">
          <div id="profile-avatar" style="width:96px;height:96px;border-radius:12px;background:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:36px"><i class="fas fa-user"></i></div>
          <div>
            <h3 id="profile-name-title">Загрузка...</h3>
            <p id="profile-email-text" class="muted"></p>
            <input type="file" id="avatar-upload" accept="image/*" style="margin-top:8px">
          </div>
        </div>
      </div>

      <div class="ios-card">
        <h3>Соцсети</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          <input id="tiktok-input" placeholder="@tiktok" />
          <input id="youtube-input" placeholder="ID канала" />
          <input id="instagram-input" placeholder="@instagram" />
          <div style="display:flex;gap:8px;margin-top:8px">
            <button id="save-socials" class="ios-button small">Сохранить</button>
            <button id="change-password-btn" class="ios-button small secondary">Изменить пароль</button>
          </div>
        </div>
      </div>

      <div id="password-change-form" class="ios-card" style="display:none">
        <h3>Сменить пароль</h3>
        <input id="current-password" type="password" placeholder="Текущий пароль" />
        <input id="new-password" type="password" placeholder="Новый пароль (6+)" />
        <input id="confirm-new-password" type="password" placeholder="Повторите новый пароль" />
        <div style="margin-top:8px">
          <button id="save-password-btn" class="ios-button small">Сохранить пароль</button>
          <button id="cancel-password-change" class="ios-button small" style="margin-left:8px">Отмена</button>
        </div>
      </div>
    </div>
  `,
  withdrawal: `
    <div class="ios-section">
      <h2>Вывод средств</h2>
      <div class="ios-card">
        <p>Минимальная сумма вывода: 500 ₽</p>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="withdrawal-amount" type="number" placeholder="Сумма, ₽" />
          <select id="withdrawal-method">
            <option value="qiwi">QIWI</option>
            <option value="yoomoney">YooMoney</option>
            <option value="card">Карта</option>
          </select>
        </div>
        <button id="request-withdrawal" class="ios-button" style="margin-top:10px">Запросить вывод</button>
        <div id="withdrawal-history" style="margin-top:12px"></div>
      </div>
    </div>
  `,
  admin: `
    <div class="ios-section">
      <h2>Админ — модерация</h2>
      <div class="ios-card">
        <h3>Заявки на проверку</h3>
        <div id="admin-pending-list"></div>
      </div>
    </div>
  `
};

// helpers
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.remove('hidden');
  setTimeout(()=> notification.classList.add('hidden'), 3000);
}

function toMoney(n){ return Number(n || 0).toFixed(2) + '₽' }

// --- AUTH UI logic ---
tabLogin.addEventListener('click', ()=> {
  tabLogin.classList.add('active'); tabSignup.classList.remove('active');
  loginForm.classList.add('active'); signupForm.classList.remove('active'); passwordResetForm.classList.add('hidden');
});
tabSignup.addEventListener('click', ()=> {
  tabSignup.classList.add('active'); tabLogin.classList.remove('active');
  signupForm.classList.add('active'); loginForm.classList.remove('active'); passwordResetForm.classList.add('hidden');
});

showPasswordResetBtn.addEventListener('click', (e)=>{ e.preventDefault(); passwordResetForm.classList.remove('hidden'); loginForm.classList.remove('active'); signupForm.classList.remove('active'); });
backToLoginBtn.addEventListener('click', (e)=>{ e.preventDefault(); passwordResetForm.classList.add('hidden'); loginForm.classList.add('active'); });

// Signup
signupForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!name || !email || password.length < 6) { showNotification('Проверьте поля регистрации', 'error'); return; }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;

    // update displayName
    await fbUpdateProfile(user, { displayName: name });

    // create DB profile with defaults
    const userData = {
      name,
      email,
      tiktok: '',
      youtube: '',
      instagram: '',
      balance: 0,
      rewards: {},
      materials: {},
      avatar: '',
      registrationDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isAdmin: false
    };
    await set(ref(db, `users/${user.uid}`), userData);

    await sendEmailVerification(user);
    showNotification('Аккаунт создан — проверьте почту для подтверждения');
  } catch (err) {
    console.error(err);
    showNotification(err.message || 'Ошибка регистрации', 'error');
  }
});

// Login
loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles the rest
  } catch (err) {
    showNotification(err.message || 'Ошибка входа', 'error');
  }
});

// Password reset
passwordResetForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('reset-email').value.trim();
  try {
    await sendPasswordResetEmail(auth, email);
    showNotification('Ссылка для сброса отправлена');
    passwordResetForm.classList.add('hidden');
    loginForm.classList.add('active');
  } catch (err) {
    showNotification(err.message || 'Ошибка', 'error');
  }
});

// Logout
logoutBtn.addEventListener('click', async ()=>{
  await signOut(auth);
});

// onAuth state
onAuthStateChanged(auth, async (user)=>{
  if (user) {
    // load user data
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');

    const snapshot = await get(ref(db, `users/${user.uid}`));
    const userData = snapshot.exists() ? snapshot.val() : null;

    smallName.textContent = userData?.name || user.displayName || 'Пользователь';
    smallEmail.textContent = user.email || '';
    smallAvatar.innerHTML = userData?.avatar ? `<img src="${userData.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">` : '<i class="fas fa-user"></i>';

    // show admin tab if isAdmin
    if (userData?.isAdmin) adminTabBtn.style.display = 'block';
    else adminTabBtn.style.display = 'none';

    // default tab
    switchTab('main');
  } else {
    // show auth
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }
});

// Switch tab
function switchTab(tabId){
  dynamicContent.innerHTML = sections[tabId] || '<div></div>';
  // activate button in sidebar
  sideTabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  // load data for tab
  const user = auth.currentUser;
  if (!user) return;

  if (tabId === 'materials') {
    displayMaterials('all');
    // filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> {
        document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        displayMaterials(btn.dataset.platform);
      });
    });
  } else if (tabId === 'stats') {
    displayStats(user.uid);
  } else if (tabId === 'profile') {
    setupProfile();
  } else if (tabId === 'withdrawal') {
    setupWithdrawal(user.uid);
  } else if (tabId === 'admin') {
    setupAdmin();
  }
}

// wire sidebar tab clicks
document.querySelectorAll('.tabs-vertical .tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> {
    const id = btn.dataset.tab;
    switchTab(id);
  });
});

// --- MATERIALS & TASK HANDLING ---
async function loadMaterials(){
  const snap = await get(ref(db, 'Materials'));
  return snap.exists() ? snap.val() : {};
}

async function loadUserData(uid){
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}

async function displayMaterials(filterPlatform = 'all'){
  const listEl = document.getElementById('materials-list');
  if (!listEl) return;
  listEl.innerHTML = `<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i><p>Загрузка...</p></div>`;

  const materials = await loadMaterials();
  const uid = auth.currentUser?.uid;
  const userData = uid ? await loadUserData(uid) : null;

  const entries = Object.entries(materials || {});
  let filtered = entries;
  if (filterPlatform !== 'all') filtered = entries.filter(([id,m])=> m.platform === filterPlatform);

  if (filtered.length === 0){
    listEl.innerHTML = `<div class="ios-card"><p>Нет заданий</p></div>`;
    return;
  }

  listEl.innerHTML = filtered.map(([id,material])=>{
    const userMaterial = userData?.materials?.[id];
    const status = userMaterial?.status;
    const badge = material.platform === 'tiktok' ? 'tiktok' : material.platform === 'youtube' ? 'youtube' : material.platform === 'instagram' ? 'instagram' : '';
    let actionHtml = '';

    if (status === 'completed') {
      actionHtml = `<button class="ios-button small" disabled><i class="fas fa-check-circle"></i> Выполнено</button>`;
    } else if (status === 'pending') {
      actionHtml = `<button class="ios-button small" disabled><i class="fas fa-hourglass-half"></i> На проверке</button>`;
    } else if (status === 'rejected') {
      actionHtml = `<button class="ios-button small" disabled style="background:#f8d7da;color:#721c24"><i class="fas fa-times-circle"></i> Отклонено</button>`;
    } else if (status === 'in_progress') {
      actionHtml = `<button class="ios-button small" disabled><i class="fas fa-hourglass-half"></i> В процессе</button>`;
    } else {
      actionHtml = `<button class="ios-button small take-btn" data-id="${id}">Принять задание</button>`;
    }

    return `
      <div class="material-item ios-card" data-id="${id}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;gap:12px;align-items:center">
            <div class="material-badge ${badge}">${badge ? (badge === 'tiktok' ? '<i class="fab fa-tiktok"></i>' : badge === 'youtube' ? '<i class="fab fa-youtube"></i>' : '<i class="fab fa-instagram"></i>') : ''}</div>
            <div>
              <h4 style="margin:0">${material.title || 'Рекламное задание'}</h4>
              <p class="muted" style="margin:0;font-size:13px">${material.description || ''}</p>
            </div>
          </div>
          <div>${actionHtml}</div>
        </div>
        <div style="margin-top:8px;color:var(--muted);font-size:13px">
          Вознаграждение: ${material.reward || 0.1}₽ за 1к просмотров
        </div>
      </div>
    `;
  }).join('');

  // bind take buttons
  document.querySelectorAll('.take-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.dataset.id;
      const uid = auth.currentUser.uid;
      try {
        await update(ref(db, `users/${uid}/materials`), {
          [id]: {
            accepted: new Date().toISOString(),
            status: 'in_progress',
            platform: (await get(ref(db, `Materials/${id}/platform`))).val() || '',
            reward: (await get(ref(db, `Materials/${id}/reward`))).val() || 0,
            title: (await get(ref(db, `Materials/${id}/title`))).val() || '',
            views: 0,
            earnings: 0,
            requirements: (await get(ref(db, `Materials/${id}/requirements`))).val() || ''
          }
        });
        showNotification('Задание принято');
        displayMaterials(filterPlatform);
      } catch (err) {
        showNotification(err.message || 'Ошибка', 'error');
      }
    });
  });
}

// --- STATS (my tasks) ---
async function displayStats(uid){
  const container = document.getElementById('stats-container');
  container.innerHTML = `<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i><p>Загрузка...</p></div>`;
  const data = await loadUserData(uid);
  const mats = data?.materials || {};
  const totalTasks = Object.keys(mats).length;
  const completedTasks = Object.values(mats).filter(m=>m.status==='completed').length;
  const pendingTasks = Object.values(mats).filter(m=>m.status==='pending').length;
  const inProgress = Object.values(mats).filter(m=>m.status==='in_progress').length;
  const rejected = Object.values(mats).filter(m=>m.status==='rejected').length;
  const totalEarnings = Object.values(mats).reduce((s,m)=>s + (m.earnings || 0), 0);
  const available = data?.balance || 0;

  container.innerHTML = `
    <div class="stats-summary">
      <div class="stat-card"><h4>Всего</h4><p>${totalTasks}</p></div>
      <div class="stat-card"><h4>Выполнено</h4><p>${completedTasks}</p></div>
      <div class="stat-card"><h4>В процессе</h4><p>${inProgress}</p></div>
      <div class="stat-card"><h4>На проверке</h4><p>${pendingTasks}</p></div>
      <div class="stat-card"><h4>Отклонено</h4><p>${rejected}</p></div>
      <div class="stat-card"><h4>Заработано</h4><p>${totalEarnings.toFixed(2)}₽</p></div>
      <div class="stat-card"><h4>Доступно</h4><p>${available.toFixed(2)}₽</p></div>
    </div>

    <div style="margin-top:12px">
      <h3>Ваши задания</h3>
      ${Object.entries(mats).map(([id,task])=>`
        <div class="ios-card" style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <div>
            <h4 style="margin:0">${task.title || '–'}</h4>
            <p class="muted" style="margin:0;font-size:13px">Принято: ${task.accepted ? new Date(task.accepted).toLocaleString() : '-'}</p>
            <p class="muted" style="margin:0;font-size:13px">Просмотров: ${task.views || 0} — Заработано: ${task.earnings || 0}₽</p>
            ${task.status === 'rejected' && task.rejectionReason ? `<p style="color:#9b1c1c;margin:0;font-size:13px">Причина: ${task.rejectionReason}</p>` : ''}
          </div>
          <div>
            ${task.status === 'completed' ? `<span class="ios-button small" disabled><i class="fas fa-check-circle"></i> Выполнено</span>` :
              task.status === 'pending' ? `<span class="ios-button small" disabled><i class="fas fa-hourglass-half"></i> На проверке</span>` :
              task.status === 'rejected' ? `<span class="ios-button small" disabled style="background:#f8d7da;color:#721c24"><i class="fas fa-times-circle"></i> Отклонено</span>` :
              `<button class="ios-button small complete-btn" data-id="${id}">Подтвердить выполнение</button>`
            }
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // bind complete buttons
  document.querySelectorAll('.complete-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.dataset.id;
      const uid = auth.currentUser.uid;
      try {
        await update(ref(db, `users/${uid}/materials/${id}`), {
          status: 'pending',
          submitted: new Date().toISOString()
        });
        showNotification('Задание отправлено на проверку');
        displayStats(uid);
      } catch (err) {
        showNotification(err.message || 'Ошибка', 'error');
      }
    });
  });
}

// --- PROFILE handlers (avatar, socials, password) ---
async function setupProfile(){
  const user = auth.currentUser;
  if (!user) return;
  const data = await loadUserData(user.uid);

  document.getElementById('profile-name-title').textContent = data?.name || user.displayName || 'Пользователь';
  document.getElementById('profile-email-text').textContent = data?.email || user.email || '';

  const avatarEl = document.getElementById('profile-avatar');
  avatarEl.innerHTML = data?.avatar ? `<img src="${data.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">` : '<i class="fas fa-user"></i>';

  document.getElementById('tiktok-input').value = data?.tiktok || '';
  document.getElementById('youtube-input').value = data?.youtube || '';
  document.getElementById('instagram-input').value = data?.instagram || '';

  // avatar upload (simple base64)
  const avatarUpload = document.getElementById('avatar-upload');
  avatarUpload.addEventListener('change', async ()=>{
    const file = avatarUpload.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      try {
        await update(ref(db, `users/${user.uid}`), { avatar: base64 });
        showNotification('Аватар обновлён');
        setupProfile();
        // update small avatar
        smallAvatar.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
      } catch (err) {
        showNotification(err.message || 'Ошибка', 'error');
      }
    };
    reader.readAsDataURL(file);
  });

  // save socials
  document.getElementById('save-socials').addEventListener('click', async ()=>{
    const t = document.getElementById('tiktok-input').value.trim();
    const y = document.getElementById('youtube-input').value.trim();
    const i = document.getElementById('instagram-input').value.trim();
    try {
      await update(ref(db, `users/${user.uid}`), { tiktok: t, youtube: y, instagram: i });
      showNotification('Соцсети сохранены');
    } catch (err) {
      showNotification(err.message || 'Ошибка', 'error');
    }
  });

  // password change
  document.getElementById('change-password-btn').addEventListener('click', ()=> {
    document.getElementById('password-change-form').style.display = 'block';
  });
  document.getElementById('cancel-password-change').addEventListener('click', ()=> {
    document.getElementById('password-change-form').style.display = 'none';
  });
  document.getElementById('save-password-btn').addEventListener('click', async ()=>{
    const current = document.getElementById('current-password').value;
    const nw = document.getElementById('new-password').value;
    const conf = document.getElementById('confirm-new-password').value;
    if (!current || !nw || !conf) { showNotification('Заполните все поля', 'error'); return; }
    if (nw !== conf) { showNotification('Пароли не совпадают', 'error'); return; }
    if (nw.length < 6) { showNotification('Пароль должен быть 6+ символов', 'error'); return; }

    try {
      const credential = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, nw);
      showNotification('Пароль успешно изменён');
      document.getElementById('password-change-form').style.display = 'none';
    } catch (err) {
      showNotification(err.message || 'Ошибка', 'error');
    }
  });
}

// --- WITHDRAWAL (simple request saved to DB for manual processing) ---
async function setupWithdrawal(uid){
  document.getElementById('withdrawal-amount').value = '';
  document.getElementById('withdrawal-method').value = 'qiwi';
  document.getElementById('request-withdrawal').addEventListener('click', async ()=>{
    const amount = Number(document.getElementById('withdrawal-amount').value || 0);
    const method = document.getElementById('withdrawal-method').value;
    const user = auth.currentUser;
    if (amount < 500) { showNotification('Минимум 500₽', 'error'); return; }
    const data = await loadUserData(user.uid);
    if ((data.balance || 0) < amount) { showNotification('Недостаточно средств', 'error'); return; }
    try {
      // push withdrawal request
      await push(ref(db, 'Withdrawals'), {
        uid: user.uid,
        amount,
        method,
        created: new Date().toISOString(),
        status: 'requested'
      });
      // deduct balance (mark pending)
      await update(ref(db, `users/${user.uid}`), { balance: (data.balance - amount) });
      showNotification('Запрос отправлен администратору');
    } catch (err) {
      showNotification(err.message || 'Ошибка', 'error');
    }
  });
}

// --- ADMIN (moderation) ---
async function setupAdmin(){
  const list = document.getElementById('admin-pending-list');
  list.innerHTML = `<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i><p>Загрузка заявок...</p></div>`;

  // gather all users with pending tasks
  const usersSnap = await get(ref(db, 'users'));
  const users = usersSnap.exists() ? usersSnap.val() : {};
  const pending = [];

  Object.entries(users).forEach(([uid, u])=>{
    if (!u.materials) return;
    Object.entries(u.materials).forEach(([mid, m])=>{
      if (m.status === 'pending') {
        pending.push({ uid, mid, userName: u.name || uid, ...m });
      }
    });
  });

  if (pending.length === 0) {
    list.innerHTML = `<div class="ios-card"><p>Нет заявок на проверку</p></div>`;
    return;
  }

  list.innerHTML = pending.map(p=>`
    <div class="ios-card" style="margin-bottom:8px">
      <h4 style="margin:0">${p.title || '—'}</h4>
      <p class="muted" style="margin:0">От: ${p.userName} • Принято: ${p.accepted ? new Date(p.accepted).toLocaleString() : '-'}</p>
      <p class="muted" style="margin:6px 0 0 0">Просмотров: ${p.views || 0} — Тек. заработано: ${p.earnings || 0}₽</p>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button class="ios-button small admin-approve" data-uid="${p.uid}" data-mid="${p.mid}">Одобрить</button>
        <button class="ios-button small" style="background:#f8d7da;color:#721c24" data-uid="${p.uid}" data-mid="${p.mid}" id="reject-${p.uid}-${p.mid}">Отклонить</button>
      </div>
    </div>
  `).join('');

  // bind approve buttons
  document.querySelectorAll('.admin-approve').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const uid = btn.dataset.uid;
      const mid = btn.dataset.mid;
      try {
        // fetch material and user material
        const matSnap = await get(ref(db, `Materials/${mid}`));
        const mat = matSnap.exists() ? matSnap.val() : {};
        const userMatSnap = await get(ref(db, `users/${uid}/materials/${mid}`));
        const userMat = userMatSnap.exists() ? userMatSnap.val() : {};
        // calculate earnings — for demo просто ставим reward * (views/1000)
        const views = Number(userMat.views || 0);
        const perThousand = Number(mat.reward || userMat.reward || 0);
        const earnings = (views / 1000) * perThousand;
        const earningsFixed = Number(earnings.toFixed(2));

        // update user material
        await update(ref(db, `users/${uid}/materials/${mid}`), {
          status: 'completed',
          completedAt: new Date().toISOString(),
          earnings: earningsFixed
        });

        // add to user balance
        const userData = (await get(ref(db, `users/${uid}`))).val() || {};
        const newBalance = (userData.balance || 0) + earningsFixed;
        await update(ref(db, `users/${uid}`), { balance: newBalance });

        showNotification('Задание одобрено');
        setupAdmin();
      } catch (err) {
        showNotification(err.message || 'Ошибка', 'error');
      }
    });
  });

  // bind reject buttons — ask for reason via prompt (simple)
  pending.forEach(p=>{
    const btn = document.getElementById(`reject-${p.uid}-${p.mid}`);
    if (!btn) return;
    btn.addEventListener('click', async ()=>{
      const reason = prompt('Причина отклонения (коротко):','Нарушение требований');
      if (reason === null) return;
      try {
        await update(ref(db, `users/${p.uid}/materials/${p.mid}`), {
          status: 'rejected',
          rejectionReason: reason,
          reviewedAt: new Date().toISOString()
        });
        showNotification('Задание отклонено');
        setupAdmin();
      } catch (err) {
        showNotification(err.message || 'Ошибка', 'error');
      }
    });
  });
}

// bind initial sidebar tab buttons (left)
document.querySelectorAll('.tabs-vertical .tab-btn').forEach(b=>{
  b.addEventListener('click', ()=> {
    document.querySelectorAll('.tabs-vertical .tab-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    switchTab(b.dataset.tab);
  });
});

// default first button active
document.querySelectorAll('.tabs-vertical .tab-btn')[0].classList.add('active');

// END
