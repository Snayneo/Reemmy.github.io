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
  reauthenticateWithCredential,
  multiFactor,
  PhoneAuthProvider,
  RecaptchaVerifier
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
const mfaModal = document.getElementById('mfa-modal');
const mfaPhoneStep = document.getElementById('mfa-phone-step');
const mfaCodeStep = document.getElementById('mfa-code-step');
const mfaPhoneInput = document.getElementById('mfa-phone');
const mfaCodeInput = document.getElementById('mfa-code');
const mfaPhoneConfirm = document.getElementById('mfa-phone-confirm');
const mfaCodeConfirm = document.getElementById('mfa-code-confirm');
const mfaPhoneCancel = document.getElementById('mfa-phone-cancel');
const mfaCodeCancel = document.getElementById('mfa-code-cancel');

// Переменные для reCAPTCHA и MFA
let recaptchaVerifier;
let verificationId;

// Инициализация reCAPTCHA
function initRecaptcha() {
  recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
    size: 'normal',
    callback: () => {
      loginBtn.disabled = false;
    },
    'expired-callback': () => {
      loginBtn.disabled = true;
      showNotification('reCAPTCHA истек, обновите страницу', 'error');
    }
  }, auth);
  recaptchaVerifier.render();
}

// Показать модальное окно MFA
function showMfaModal(step = 'phone') {
  mfaModal.classList.remove('hidden');
  if (step === 'phone') {
    mfaPhoneStep.classList.remove('hidden');
    mfaCodeStep.classList.add('hidden');
    // Инициализация reCAPTCHA для MFA
    const mfaRecaptcha = new RecaptchaVerifier('recaptcha-container-mfa', {
      size: 'normal',
      callback: () => {
        mfaPhoneConfirm.disabled = false;
      },
      'expired-callback': () => {
        mfaPhoneConfirm.disabled = true;
        showNotification('reCAPTCHA истек, попробуйте снова', 'error');
      }
    }, auth);
    mfaRecaptcha.render();
  } else {
    mfaPhoneStep.classList.add('hidden');
    mfaCodeStep.classList.remove('hidden');
  }
}

// Скрыть модальное окно MFA
function hideMfaModal() {
  mfaModal.classList.add('hidden');
  mfaPhoneStep.classList.remove('hidden');
  mfaCodeStep.classList.add('hidden');
  mfaPhoneInput.value = '';
  mfaCodeInput.value = '';
}

// Структура данных пользователя
const userDataTemplate = {
  name: "",
  email: "",
  tiktok: "",
  youtube: "",
  balance: 0,
  rewards: {},
  materials: {},
  mfaEnabled: false,
  phoneNumber: ""
};

// Шаблоны контента
const sections = {
  main: `
    <div class="ios-section">
      <h2 class="ios-title">Главная</h2>
      <div class="ios-card news-card">
        <img src="https://images.unsplash.com/photo-1611162617213-7d7a控制器
        <h3>Reemmy - ваш заработок в соцсетях!</h3>
        <p>Монетизируйте ваш контент легко и просто с нашей платформой</p>
      </div>
      <div class="ios-card">
        <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" alt="Заработок" class="card-image">
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
        <h3><i class="fas fa-lock"></i> Безопасность</h3>
        <button class="ios-button small" id="change-password-btn">
          Сменить пароль
        </button>
        <button class="ios-button small" id="mfa-btn">
          <span class="btn-text">Настроить двухфакторную аутентификацию</span>
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

  let filteredMaterials = Object.entries(materials).filter(([_, material]) => {
    if (filterPlatform === 'all') return true;
    return material.platform === filterPlatform;
  });

  if (filteredMaterials.length === 0) {
    materialsList.innerHTML = `
      <div class="ios-card">
        <p>Нет доступных заданий для выбранной платформы.</p>
      </div>
    `;
    return;
  }

  materialsList.innerHTML = filteredMaterials.map(([id, material]) => {
    const userMaterial = userData?.materials?.[id] || {};
    const status = userMaterial.status || 'available';
    const comment = userMaterial.comment || '';

    return `
      <div class="ios-card material-item">
        <div class="material-badge ${material.platform}">
          <i class="fab fa-${material.platform}"></i>
        </div>
        <h3>${material.title}</h3>
        <p class="material-description">${material.description}</p>
        <div class="material-details">
          <p><strong>Вознаграждение:</strong> ${material.reward} ₽</p>
          <p><strong>Платформа:</strong> ${material.platform}</p>
          <p><strong>Срок:</strong> ${material.deadline}</p>
        </div>
        <a href="${material.link}" target="_blank" class="material-link">
          <i class="fas fa-link"></i> Перейти к материалу
        </a>
        <div class="material-actions">
          <button class="ios-button small take-btn ${status !== 'available' ? 'hidden' : ''}" data-id="${id}">
            <span class="btn-text">Взять задание</span>
          </button>
          <button class="ios-button small in-progress-btn ${status !== 'in-progress' ? 'hidden' : ''}" disabled>
            <span class="btn-text">В процессе</span>
          </button>
          <button class="ios-button small completed-btn ${status !== 'completed' ? 'hidden' : ''}" disabled>
            <span class="btn-text">Завершено</span>
          </button>
          <button class="ios-button small rejected-btn ${status !== 'rejected' ? 'hidden' : ''}" disabled>
            <span class="btn-text">Отклонено</span>
          </button>
        </div>
        ${status === 'rejected' ? `
          <div class="task-comment">
            <strong>Комментарий модератора:</strong> ${comment}
          </div>
          <button class="ios-button small retry-btn" data-id="${id}">
            <span class="btn-text">Повторить</span>
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Обработка входа
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  loginBtn.querySelector('.btn-text').classList.add('hidden');
  loginBtn.querySelector('.btn-loader').classList.remove('hidden');
  loginBtn.disabled = true;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Проверка необходимости MFA
    const mfaUser = multiFactor(user);
    if (mfaUser.enrolledFactors.length > 0) {
      showMfaModal('code');
      const phoneFactor = mfaUser.enrolledFactors.find(factor => factor.factorId === 'phone');
      if (phoneFactor) {
        const phoneAuthProvider = new PhoneAuthProvider(auth);
        verificationId = await phoneAuthProvider.verifyPhoneNumber({
          multiFactorHint: phoneFactor,
          session: mfaUser.getSession()
        }, recaptchaVerifier);
      }
    } else {
      showNotification('Вход успешен');
    }
  } catch (error) {
    console.error('Ошибка входа:', error);
    showNotification(error.message, 'error');
  } finally {
    loginBtn.querySelector('.btn-text').classList.remove('hidden');
    loginBtn.querySelector('.btn-loader').classList.add('hidden');
    loginBtn.disabled = false;
  }
});

// Обработка кода MFA
mfaCodeConfirm.addEventListener('click', async () => {
  const code = mfaCodeInput.value;
  if (!code) {
    showNotification('Введите код из SMS', 'error');
    return;
  }

  try {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    await multiFactor(auth.currentUser).enroll(credential);
    showNotification('Двухфакторная аутентификация подтверждена');
    hideMfaModal();
  } catch (error) {
    console.error('Ошибка MFA:', error);
    showNotification('Неверный код SMS', 'error');
  }
});

// Обработка настройки MFA
mfaPhoneConfirm.addEventListener('click', async () => {
  const phoneNumber = mfaPhoneInput.value;
  if (!phoneNumber) {
    showNotification('Введите номер телефона', 'error');
    return;
  }

  try {
    const phoneAuthProvider = new PhoneAuthProvider(auth);
    verificationId = await phoneAuthProvider.verifyPhoneNumber({
      phoneNumber,
      session: multiFactor(auth.currentUser).getSession()
    }, recaptchaVerifier);
    showMfaModal('code');
  } catch (error) {
    console.error('Ошибка отправки SMS:', error);
    showNotification('Ошибка отправки SMS', 'error');
  }
});

// Отмена MFA
mfaPhoneCancel.addEventListener('click', () => hideMfaModal());
mfaCodeCancel.addEventListener('click', () => hideMfaModal());

// Настройка кнопки MFA в профиле
document.addEventListener('click', async (e) => {
  if (e.target.id === 'mfa-btn') {
    const user = auth.currentUser;
    const mfaUser = multiFactor(user);
    if (mfaUser.enrolledFactors.length > 0) {
      showNotification('Двухфакторная аутентификация уже включена');
    } else {
      showMfaModal('phone');
    }
  }
});

// Обработка регистрации
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  
  signupBtn.querySelector('.btn-text').classList.add('hidden');
  signupBtn.querySelector('.btn-loader').classList.remove('hidden');
  signupBtn.disabled = true;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateProfile(user, { displayName: name });
    await set(ref(db, `users/${user.uid}`), {
      ...userDataTemplate,
      name,
      email
    });
    
    await sendEmailVerification(user);
    showNotification('Регистрация успешна! Подтвердите email.');
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    showNotification(error.message, 'error');
  } finally {
    signupBtn.querySelector('.btn-text').classList.remove('hidden');
    signupBtn.querySelector('.btn-loader').classList.add('hidden');
    signupBtn.disabled = false;
  }
});

// Проверка состояния аутентификации
onAuthStateChanged(auth, async (user) => {
  if (user) {
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    dynamicContent.innerHTML = sections.main;
    
    const userData = await loadUserData(user.uid);
    if (userData) {
      document.getElementById('profile-name').textContent = userData.name || 'Пользователь';
      document.getElementById('profile-balance').textContent = `${userData.balance} ₽`;
      document.getElementById('name-input').value = userData.name || '';
      
      const emailVerifyContainer = document.getElementById('email-verify-container');
      if (!user.emailVerified) {
        emailVerifyContainer.innerHTML = `
          <div class="email-verify">
            <p>Подтвердите ваш email</p>
            <button class="ios-button small" id="resend-email-verification">
              Отправить письмо повторно
            </button>
          </div>
        `;
      }
    }
    
    displayMaterials();
  } else {
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    initRecaptcha();
  }
});

// Обработка переключения вкладок
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    const section = button.dataset.section;
    dynamicContent.innerHTML = sections[section];
    if (section === 'materials') {
      displayMaterials();
    }
  });
});

// Обработка выхода
document.getElementById('logout-btn-top').addEventListener('click', showLogoutModal);

// Обработка смены пароля
document.getElementById('change-password-btn').addEventListener('click', () => {
  const modal = document.getElementById('change-password-modal');
  modal.classList.remove('hidden');
  
  document.getElementById('password-cancel').addEventListener('click', () => {
    modal.classList.add('hidden');
  }, { once: true });
  
  document.getElementById('password-confirm').addEventListener('click', async () => {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    
    if (!currentPassword || !newPassword) {
      showNotification('Заполните все поля', 'error');
      return;
    }
    
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      showNotification('Пароль успешно изменен');
      modal.classList.add('hidden');
    } catch (error) {
      console.error('Ошибка смены пароля:', error);
      showNotification('Ошибка смены пароля', 'error');
    }
  }, { once: true });
});
