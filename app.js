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
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');

// Показываем загрузку
function showLoading() {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<i class="fas fa-spinner loading-spinner"></i>';
  overlay.id = 'loading-overlay';
  document.body.appendChild(overlay);
}

// Скрываем загрузку
function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
}

// Показать уведомление
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.remove('hidden');
  
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

// Шаблоны контента с новыми изображениями
const sections = {
  main: `
    <div class="ios-section">
      <h2 class="ios-title">Главная</h2>
      <div class="ios-card news-card">
        <div class="card-image"></div>
        <h3>Reemmy - ваш заработок в соцсетях!</h3>
        <p>Монетизируйте ваш контент легко и просто с нашей платформой</p>
      </div>
      <div class="ios-card">
        <div class="card-image"></div>
        <h3><i class="fas fa-star"></i> Преимущества</h3>
        <p>Только проверенные рекламодатели и стабильные выплаты</p>
        <ul class="benefits-list">
          <li><i class="fas fa-check-circle"></i> До 500₽ за 1000 просмотров</li>
          <li><i class="fas fa-check-circle"></i> Вывод от 100₽</li>
          <li><i class="fas fa-check-circle"></i> Поддержка 24/7</li>
        </ul>
      </div>
      <div class="ios-card">
        <div class="card-image"></div>
        <h3><i class="fas fa-info-circle"></i> Как начать?</h3>
        <p>1. Зарегистрируйтесь<br>2. Выберите задание<br>3. Разместите рекламу<br>4. Получайте доход</p>
      </div>
      <div class="notice-card">
        <p><strong>Важная информация:</strong> Reemmy — это независимая партнерская платформа. Мы предоставляем рекламные материалы, которые вы интегрируете в свой контент. Вознаграждение начисляется за подтвержденные просмотры. Участие полностью бесплатное.</p>
      </div>
    </div>
  `,
  // ... остальные секции остаются без изменений
};

// Инициализация приложения
async function initApp() {
  // Обработчики для переключения между вкладками
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

  // Обработчик входа
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoader = loginBtn.querySelector('.btn-loader');
    
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    showLoading();
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showNotification("Добро пожаловать!");
    } catch (error) {
      let message = "Ошибка входа";
      switch(error.code) {
        case "auth/invalid-email": message = "Неверный email"; break;
        case "auth/user-not-found": message = "Пользователь не найден"; break;
        case "auth/wrong-password": message = "Неверный пароль"; break;
        case "auth/too-many-requests": message = "Слишком много попыток"; break;
      }
      showNotification(message, 'error');
    } finally {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
      hideLoading();
    }
  });

  // Обработчик регистрации
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    const btnText = signupBtn.querySelector('.btn-text');
    const btnLoader = signupBtn.querySelector('.btn-loader');
    
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    showLoading();
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await set(ref(db, `users/${userCredential.user.uid}`), {
        name,
        email,
        balance: 0,
        tiktok: "",
        youtube: ""
      });
      
      showNotification("Регистрация успешна!");
      document.getElementById('login-tab').click();
    } catch (error) {
      let message = "Ошибка регистрации";
      switch(error.code) {
        case "auth/email-already-in-use": message = "Email уже используется"; break;
        case "auth/invalid-email": message = "Неверный email"; break;
        case "auth/weak-password": message = "Пароль от 6 символов"; break;
      }
      showNotification(message, 'error');
    } finally {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
      hideLoading();
    }
  });

  // Обработчик выхода
  document.addEventListener('click', (e) => {
    if (e.target.closest('#logout-btn-top')) {
      showLoading();
      signOut(auth).then(() => {
        showNotification("До новых встреч!");
      }).catch(() => {
        showNotification("Ошибка выхода", 'error');
      }).finally(hideLoading);
    }
  });

  // Отслеживание состояния аутентификации
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

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);
