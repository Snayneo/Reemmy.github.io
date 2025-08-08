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

// ========== DOM Elements ==========
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const content = document.getElementById('content');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const notification = document.getElementById('notification');
const switchToSignup = document.getElementById('switch-to-signup');
const switchToLogin = document.getElementById('switch-to-login');

// ========== Auth Switch ==========
switchToSignup.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
  switchToSignup.classList.add('hidden');
  switchToLogin.classList.remove('hidden');
});
switchToLogin.addEventListener('click', () => {
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  switchToLogin.classList.add('hidden');
  switchToSignup.classList.remove('hidden');
});

// ========== Forms Submit ==========
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    await signInWithEmailAndPassword(auth, email, password);
    showNotification('Вход выполнен!', 'success');
  } catch (err) {
    showNotification('Неверный email или пароль', 'error');
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    await set(ref(db, `users/${userCredential.user.uid}`), {
      name,
      email,
      balance: 0,
      tiktok: "",
      youtube: "",
      materials: {}
    });
    showNotification('Аккаунт создан!', 'success');
  } catch (err) {
    showNotification('Ошибка регистрации', 'error');
  }
});

// ========== Auth State ==========
onAuthStateChanged(auth, async (user) => {
  if (user) {
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    loadSection('main');
  } else {
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }
});

// ========== Tabs ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadSection(btn.dataset.section);
  });
});

// ========== Notification ==========
function showNotification(msg, type = 'success') {
  notification.textContent = msg;
  notification.className = `notification ${type}`;
  notification.classList.remove('hidden');
  setTimeout(() => notification.classList.add('hidden'), 3000);
}

// ========== Sections ==========
function loadSection(section) {
  if (section === 'main') showMain();
  if (section === 'tasks') showTasks();
  if (section === 'profile') showProfile();
}

// -------- Main Page --------
function showMain() {
  content.innerHTML = `
    <div class="ios-section">
      <h2 class="ios-title">Добро пожаловать в Reemmy!</h2>
      <div class="ios-card">
        <h3>Зарабатывайте на рекламе в соцсетях!</h3>
        <p>Выполняйте задания, привязывайте TikTok/YouTube и получайте вознаграждение.</p>
      </div>
    </div>
  `;
}

// -------- Tasks Page --------
async function showTasks() {
  content.innerHTML = `
    <div class="ios-section">
      <h2 class="ios-title">Задания</h2>
      <div class="materials-filters">
        <button class="filter-btn active" data-platform="all">Все</button>
        <button class="filter-btn" data-platform="tiktok">TikTok</button>
        <button class="filter-btn" data-platform="youtube">YouTube</button>
      </div>
      <div id="materials-list"></div>
    </div>
  `;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      displayMaterials(btn.dataset.platform);
    });
  });
  displayMaterials('all');
}

async function displayMaterials(platform = 'all') {
  const uid = auth.currentUser.uid;
  const userSnap = await get(ref(db, `users/${uid}`));
  const userData = userSnap.exists() ? userSnap.val() : {};
  const matSnap = await get(ref(db, `Materials`));
  const materials = matSnap.exists() ? matSnap.val() : {};
  const materialsList = document.getElementById('materials-list');

  let items = Object.entries(materials);
  if (platform !== 'all') items = items.filter(([id, m]) => m.platform === platform);

  if (!items.length) {
    materialsList.innerHTML = `<div class="ios-card">Заданий пока нет</div>`;
    return;
  }
  materialsList.innerHTML = items.map(([id, m]) => {
    const userMat = (userData.materials && userData.materials[id]) || {};
    const isCompleted = userMat.status === 'completed';
    const isRejected = userMat.status === 'rejected';
    const isInProgress = userMat.status === 'in_progress';
    const hasSocial = m.platform === 'tiktok' ? !!userData.tiktok : m.platform === 'youtube' ? !!userData.youtube : true;

    return `
      <div class="ios-card">
        <h3>${m.title}</h3>
        <p>${m.description}</p>
        <p><strong>Платформа:</strong> ${m.platform}</p>
        <p><strong>Вознаграждение:</strong> ${m.reward}₽ за 1к просмотров</p>
        ${isRejected ? `
          <div class="moderator-comment">
            <p class="platform-warning">Отклонено: ${userMat.moderatorComment || "без причины"}</p>
            <div class="material-actions"><button class="resubmit-btn" data-id="${id}">Отправить повторно</button></div>
          </div>
        ` : ''}
        <div class="material-actions">
          ${isCompleted ? `<button class="completed-btn" disabled>Выполнено</button>` :
            isInProgress ? `<button class="in-progress-btn" disabled>В процессе</button>` :
              `<button class="take-btn" data-id="${id}" ${!hasSocial ? 'disabled' : ''}>Взять задание</button>
              ${!hasSocial ? `<div class="platform-warning">Привяжите ${m.platform} в профиле</div>` : ''}`
          }
        </div>
      </div>
    `
  }).join('');

  document.querySelectorAll('.take-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const matId = btn.dataset.id;
      await set(ref(db, `users/${uid}/materials/${matId}`), { status: "in_progress", timestamp: Date.now() });
      showNotification('Задание принято!');
      displayMaterials(platform);
    });
  });
  document.querySelectorAll('.resubmit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const matId = btn.dataset.id;
      await update(ref(db, `users/${uid}/materials/${matId}`), { status: "in_progress", moderatorComment: null });
      showNotification('Задание отправлено повторно!');
      displayMaterials(platform);
    });
  });
}

// -------- Profile Page --------
async function showProfile() {
  const uid = auth.currentUser.uid;
  const userSnap = await get(ref(db, `users/${uid}`));
  const userData = userSnap.exists() ? userSnap.val() : {};

  content.innerHTML = `
    <div class="ios-section">
      <div class="profile-header">
        <img class="avatar" src="https://www.gravatar.com/avatar/${md5(userData.email || "")}?d=mp" alt="Аватар">
        <h2>${userData.name || "Пользователь"}</h2>
        <div class="balance">Баланс: <strong>${userData.balance || 0} ₽</strong></div>
      </div>
      <div class="ios-card">
        <h3><i class="fab fa-tiktok"></i> TikTok</h3>
        <input id="tiktok-input" class="profile-input" placeholder="@username" value="${userData.tiktok || ""}">
        <button class="ios-button" id="save-tiktok">Сохранить</button>
      </div>
      <div class="ios-card">
        <h3><i class="fab fa-youtube"></i> YouTube</h3>
        <input id="youtube-input" class="profile-input" placeholder="ID канала" value="${userData.youtube || ""}">
        <button class="ios-button" id="save-youtube">Сохранить</button>
      </div>
      <button class="ios-button" id="logout-btn" style="background:var(--ios-red)"><i class="fas fa-sign-out-alt"></i> Выйти</button>
    </div>
  `;

  document.getElementById('save-tiktok').onclick = async () => {
    const tiktok = document.getElementById('tiktok-input').value.trim();
    await update(ref(db, `users/${uid}`), { tiktok });
    showNotification('TikTok сохранён!');
  };
  document.getElementById('save-youtube').onclick = async () => {
    const youtube = document.getElementById('youtube-input').value.trim();
    await update(ref(db, `users/${uid}`), { youtube });
    showNotification('YouTube сохранён!');
  };
  document.getElementById('logout-btn').onclick = async () => {
    await signOut(auth);
  };
}

// ========== Gravatar MD5 ==========
function md5(str) {
  // Simple MD5 for gravatar (browser, not crypto-secure, but fine for avatars)
  function L(k, d) { return (k << d) | (k >>> (32 - d)); }
  function K(G, k) { var I, d, F, H, x; F = (G & 2147483648); H = (k & 2147483648); I = (G & 1073741824); d = (k & 1073741824); x = (G & 1073741823) + (k & 1073741823); if (I & d) return (x ^ 2147483648 ^ F ^ H); if (I | d) { if (x & 1073741824) return (x ^ 3221225472 ^ F ^ H); else return (x ^ 1073741824 ^ F ^ H); } else return (x ^ F ^ H); }
  function r(d, F, k) { return (d & F) | ((~d) & k); }
  function q(d, F, k) { return (d & k) | (F & (~k)); }
  function p(d, F, k) { return (d ^ F ^ k); }
  function n(d, F, k) { return (F ^ (d | (~k))); }
  function u(G, F, aa, Z, k, H, I) { G = K(G, K(K(r(F, aa, Z), k), I)); return K(L(G, H), F); }
  function f(G, F, aa, Z, k, H, I) { G = K(G, K(K(q(F, aa, Z), k), I)); return K(L(G, H), F); }
  function D(G, F, aa, Z, k, H, I) { G = K(G, K(K(p(F, aa, Z), k), I)); return K(L(G, H), F); }
  function t(G, F, aa, Z, k, H, I) { G = K(G, K(K(n(F, aa, Z), k), I)); return K(L(G, H), F); }
  function e(G) { var k, F = G.length; var d = F + 8; var Z = (d - (d % 64)) / 64; var I = (Z + 1) * 16; var aa = Array(I - 1); var x = 0; var H = 0; while (H < F) { k = (H - (H % 4)) / 4; x = (H % 4) * 8; aa[k] = (aa[k] | (G.charCodeAt(H) << x)); H++; } k = (H - (H % 4)) / 4; x = (H % 4) * 8; aa[k] = aa[k] | (128 << x); aa[I - 2] = F << 3; aa[I - 1] = F >>> 29; return aa; }
  function B(x) { var k = "", F = "", G, d; for (d = 0; d <= 3; d++) { G = (x >>> (d * 8)) & 255; F = "0" + G.toString(16); k = k + F.substr(F.length - 2, 2); } return k; }
  function J(k) { k = k.replace(/\r\n/g, "\n"); var d = ""; for (var F = 0; F < k.length; F++) { var x = k.charCodeAt(F); if (x < 128) { d += String.fromCharCode(x); } else if ((x > 127) && (x < 2048)) { d += String.fromCharCode((x >> 6) | 192); d += String.fromCharCode((x & 63) | 128); } else { d += String.fromCharCode((x >> 12) | 224); d += String.fromCharCode(((x >> 6) & 63) | 128); d += String.fromCharCode((x & 63) | 128); } } return d; }
  let G = Array(); let d, aa, k, F, Z, H, I, x, C, E = 7, v = 12, y = 17, w = 22, V = 5, U = 9, T = 14, S = 20, Q = 4, P = 11, N = 16, M = 23, A = 6, z = 10, X = 15, W = 21;
  str = J(str); G = e(str); H = 1732584193; I = 4023233417; F = 2562383102; Z = 271733878;
  for (d = 0; d < G.length; d += 16) {
    aa = H; k = I; x = F; C = Z;
    H = u(H, I, F, Z, G[d + 0], E, 3614090360); Z = u(Z, H, I, F, G[d + 1], v, 3905402710); F = u(F, Z, H, I, G[d + 2], y, 606105819); I = u(I, F, Z, H, G[d + 3], w, 3250441966);
    H = u(H, I, F, Z, G[d + 4], E, 4118548399); Z = u(Z, H, I, F, G[d + 5], v, 1200080426); F = u(F, Z, H, I, G[d + 6], y, 2821735955); I = u(I, F, Z, H, G[d + 7], w, 4249261313);
    H = u(H, I, F, Z, G[d + 8], E, 1770035416); Z = u(Z, H, I, F, G[d + 9], v, 2336552879); F = u(F, Z, H, I, G[d + 10], y, 4294925233); I = u(I, F, Z, H, G[d + 11], w, 2304563134);
    H = u(H, I, F, Z, G[d + 12], E, 1804603682); Z = u(Z, H, I, F, G[d + 13], v, 4254626195); F = u(F, Z, H, I, G[d + 14], y, 2792965006); I = u(I, F, Z, H, G[d + 15], w, 1236535329);
    H = f(H, I, F, Z, G[d + 1], Q, 4129170786); Z = f(Z, H, I, F, G[d + 6], P, 3225465664); F = f(F, Z, H, I, G[d + 11], N, 643717713); I = f(I, F, Z, H, G[d + 0], M, 3921069994);
    H = f(H, I, F, Z, G[d + 5], Q, 3593408605); Z = f(Z, H, I, F, G[d + 10], P, 38016083); F = f(F, Z, H, I, G[d + 15], N, 3634488961); I = f(I, F, Z, H, G[d + 4], M, 3889429448);
    H = f(H, I, F, Z, G[d + 9], Q, 568446438); Z = f(Z, H, I, F, G[d + 14], P, 3275163606); F = f(F, Z, H, I, G[d + 3], N, 4107603335); I = f(I, F, Z, H, G[d + 8], M, 1163531501);
    H = f(H, I, F, Z, G[d + 13], Q, 2850285829); Z = f(Z, H, I, F, G[d + 2], P, 4243563512); F = f(F, Z, H, I, G[d + 7], N, 1735328473); I = f(I, F, Z, H, G[d + 12], M, 2368359562);
    H = D(H, I, F, Z, G[d + 5], A, 4294588738); Z = D(Z, H, I, F, G[d + 8], z, 2272392833); F = D(F, Z, H, I, G[d + 11], X, 1839030562); I = D(I, F, Z, H, G[d + 14], W, 4259657740);
    H = D(H, I, F, Z, G[d + 1], A, 2763975236); Z = D(Z, H, I, F, G[d + 4], z, 1272893353); F = D(F, Z, H, I, G[d + 7], X, 4139469664); I = D(I, F, Z, H, G[d + 10], W, 3200236656);
    H = D(H, I, F, Z, G[d + 13], A, 681279174); Z = D(Z, H, I, F, G[d + 0], z, 3936430074); F = D(F, Z, H, I, G[d + 3], X, 3572445317); I = D(I, F, Z, H, G[d + 6], W, 76029189);
    H = D(H, I, F, Z, G[d + 9], A, 3654602809); Z = D(Z, H, I, F, G[d + 12], z, 3873151461); F = D(F, Z, H, I, G[d + 15], X, 530742520); I = D(I, F, Z, H, G[d + 2], W, 3299628645);
    H = t(H, I, F, Z, G[d + 0], V, 4096336452); Z = t(Z, H, I, F, G[d + 7], U, 1126891415); F = t(F, Z, H, I, G[d + 14], T, 2878612391); I = t(I, F, Z, H, G[d + 5], S, 4237533241);
    H = t(H, I, F, Z, G[d + 12], V, 1700485571); Z = t(Z, H, I, F, G[d + 3], U, 2399980690); F = t(F, Z, H, I, G[d + 10], T, 4293915773); I = t(I, F, Z, H, G[d + 1], S, 2240044497);
    H = t(H, I, F, Z, G[d + 8], V, 1873313359); Z = t(Z, H, I, F, G[d + 15], U, 4264355552); F = t(F, Z, H, I, G[d + 6], T, 2734768916); I = t(I, F, Z, H, G[d + 13], S, 1309151649);
    H = t(H, I, F, Z, G[d + 4], V, 4149444226); Z = t(Z, H, I, F, G[d + 11], U, 3174756917); F = t(F, Z, H, I, G[d + 2], T, 718787259); I = t(I, F, Z, H, G[d + 9], S, 3951481745);
    H = K(H, aa); I = K(I, k); F = K(F, x); Z = K(Z, C);
  }
  let temp = B(H) + B(I) + B(F) + B(Z);
  return temp.toLowerCase();
}
