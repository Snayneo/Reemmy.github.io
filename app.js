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
  updateProfile
} from './firebase.js';

// ... (остальные импорты и конфигурация)

// Анимация загрузки
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

// Модальное окно подтверждения выхода
function showLogoutModal() {
  const modal = document.getElementById('logout-modal');
  modal.classList.remove('hidden');
  
  document.getElementById('logout-cancel').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  
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
  });
}

// Обновленный профиль с аватаром
const profileSection = `
  <div class="ios-section">
    <div class="profile-header">
      <div class="avatar-upload">
        <img id="avatar-preview" class="avatar-preview" src="https://ui-avatars.com/api/?name=${auth.currentUser?.displayName || 'U'}&background=007AFF&color=fff">
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
    </div>
    
    ${!auth.currentUser?.emailVerified ? `
    <div class="email-verify">
      <p>Ваш email не подтвержден</p>
      <button class="ios-button small" id="verify-email-btn">
        Отправить подтверждение
      </button>
    </div>
    ` : ''}
  </div>
`;

// Обновленная функция для заданий
async function displayMaterials() {
  // ... (предыдущий код)
  
  // Добавляем комментарии для не пройденных заданий
  if (task.status === 'not_completed') {
    html += `
      <div class="task-comment">
        <strong>Причина:</strong> ${task.rejectionReason || 'Задание не выполнено'}
      </div>
      <button class="ios-button small retry-btn" data-id="${id}">
        Подать на повторную проверку
      </button>
    `;
  }
  
  // ... (остальной код)
}

// Обработчик повторной подачи задания
document.querySelectorAll('.retry-btn').forEach(btn => {
  btn.addEventListener('click', async function() {
    const materialId = this.dataset.id;
    showLoading('Отправка на проверку...');
    try {
      await update(ref(db, `users/${auth.currentUser.uid}/materials/${materialId}`), {
        status: 'pending',
        resubmittedAt: new Date().toISOString()
      });
      showNotification('Задание отправлено на повторную проверку');
      displayMaterials();
    } catch (error) {
      showNotification('Ошибка при отправке', 'error');
    } finally {
      hideLoading();
    }
  });
});

// Инициализация
function initApp() {
  // ... (предыдущий код инициализации)
  
  // Подтверждение email
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'verify-email-btn') {
      showLoading('Отправка письма...');
      try {
        await sendEmailVerification(auth.currentUser);
        showNotification('Письмо с подтверждением отправлено');
      } catch (error) {
        showNotification('Ошибка при отправке', 'error');
      } finally {
        hideLoading();
      }
    }
  });
  
  // Смена пароля
  document.getElementById('change-password-btn')?.addEventListener('click', () => {
    document.getElementById('change-password-modal').classList.remove('hidden');
  });
  
  document.getElementById('password-confirm')?.addEventListener('click', async () => {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    
    if (newPassword.length < 6) {
      showNotification('Пароль должен быть не менее 6 символов', 'error');
      return;
    }
    
    showLoading('Смена пароля...');
    try {
      // Реализация смены пароля через reauthentication
      await updatePassword(auth.currentUser, newPassword);
      showNotification('Пароль успешно изменен');
      document.getElementById('change-password-modal').classList.add('hidden');
    } catch (error) {
      showNotification('Ошибка при смене пароля', 'error');
    } finally {
      hideLoading();
    }
  });
  
  // Загрузка аватарки
  document.getElementById('avatar-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      showLoading('Загрузка аватарки...');
      try {
        // Здесь реализация загрузки на ваш сервер или Firebase Storage
        // Примерная реализация:
        const avatarUrl = await uploadAvatar(file); // Ваша функция загрузки
        await updateProfile(auth.currentUser, { photoURL: avatarUrl });
        document.getElementById('avatar-preview').src = avatarUrl;
        showNotification('Аватар успешно обновлен');
      } catch (error) {
        showNotification('Ошибка при загрузке аватарки', 'error');
      } finally {
        hideLoading();
      }
    }
  });
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);
