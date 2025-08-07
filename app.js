import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from './firebase.js';

// DOM элементы
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const dynamicContent = document.getElementById('dynamic-content');
const navBtns = document.querySelectorAll('.nav-btn');

// Шаблоны контента для каждого раздела
const sections = {
  main: `
    <div class="section" id="main-section">
      <div class="info-card">
        <h2><i class="fas fa-info-circle"></i> Кто мы?</h2>
        <p>Платформа для заработка на рекламе в социальных сетях.</p>
      </div>
      <div class="info-card">
        <h2><i class="fas fa-question-circle"></i> Как это работает?</h2>
        <p>Размещайте рекламные материалы и получайте деньги за просмотры.</p>
      </div>
    </div>
  `,
  
  earn: `
    <div class="section" id="earn-section">
      <h2><i class="fas fa-coins"></i> Способы заработка</h2>
      <div class="info-card">
        <h3>TikTok</h3>
        <p>500 ₽ за 1000 просмотров</p>
      </div>
      <div class="info-card">
        <h3>YouTube</h3>
        <p>300 ₽ за 1000 просмотров</p>
      </div>
    </div>
  `,
  
  profile: `
    <div class="section" id="profile-section">
      <div class="profile-header">
        <div class="avatar">
          <i class="fas fa-user-circle"></i>
        </div>
        <h2 id="profile-name">Имя пользователя</h2>
        <div class="balance">Баланс: <span id="profile-balance">0 ₽</span></div>
        <button id="withdraw-btn">Вывести деньги</button>
      </div>
    </div>
  `,
  
  support: `
    <div class="section" id="support-section">
      <h2><i class="fas fa-headset"></i> Поддержка</h2>
      <div class="info-card">
        <p>Email: support@reemmy.ru</p>
        <p>Telegram: @reemmy_support</p>
      </div>
    </div>
  `
};

// Переключение разделов
function loadSection(sectionId) {
  dynamicContent.innerHTML = sections[sectionId];
  
  // Обновляем активную кнопку
  navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });
}

// Навигация
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    loadSection(btn.dataset.section);
  });
});

// Авторизация
onAuthStateChanged(auth, (user) => {
  if (user) {
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    loadSection('main'); // Загружаем главную по умолчанию
  } else {
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }
});

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  // Проверяем авторизацию при загрузке
  if (auth.currentUser) {
    loadSection('main');
  }
});
