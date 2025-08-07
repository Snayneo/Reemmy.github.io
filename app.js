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
  PhoneMultiFactorGenerator,
  RecaptchaVerifier
} from './firebase.js';

// Настройки MFA
const enabledMFA = true; // Включить/выключить MFA для приложения

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

// Глобальные переменные для MFA
let mfaVerificationId;
let phoneRecaptchaVerifier;
let mfaRecaptchaVerifier;

// Инициализация reCAPTCHA
function initRecaptcha() {
  phoneRecaptchaVerifier = new RecaptchaVerifier(auth, 'phone-recaptcha-container', {
    'size': 'invisible',
    'callback': () => {}
  });
  
  mfaRecaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'invisible',
    'callback': () => {}
  });
}

// Показать модальное окно для добавления телефона
function showPhoneModal() {
  const modal = document.getElementById('phone-modal');
  modal.classList.remove('hidden');
  
  document.getElementById('phone-cancel').addEventListener('click', () => {
    modal.classList.add('hidden');
  }, { once: true });
  
  document.getElementById('phone-confirm').addEventListener('click', async () => {
    const phoneNumber = document.getElementById('phone-number').value;
    if (!phoneNumber) {
      showNotification('Введите номер телефона', 'error');
      return;
    }
    
    try {
      showLoading('Отправка SMS...');
      const provider = new PhoneAuthProvider(auth);
      const session = await multiFactor(auth.currentUser).getSession();
      
      const verificationId = await provider.verifyPhoneNumber({
        phoneNumber,
        session
      }, phoneRecaptchaVerifier);
      
      modal.classList.add('hidden');
      showMfaModal(verificationId);
    } catch (error) {
      showNotification(`Ошибка: ${error.message}`, 'error');
    } finally {
      hideLoading();
    }
  }, { once: true });
}

// Показать модальное окно для ввода кода MFA
function showMfaModal(verificationId) {
  mfaVerificationId = verificationId;
  const modal = document.getElementById('mfa-modal');
  modal.classList.remove('hidden');
  
  document.getElementById('mfa-cancel').addEventListener('click', () => {
    modal.classList.add('hidden');
  }, { once: true });
  
  document.getElementById('mfa-confirm').addEventListener('click', async () => {
    const code = document.getElementById('mfa-code').value;
    if (!code || code.length < 6) {
      showNotification('Введите корректный код', 'error');
      return;
    }
    
    try {
      showLoading('Проверка кода...');
      const cred = PhoneAuthProvider.credential(mfaVerificationId, code);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      
      await multiFactor(auth.currentUser).enroll(multiFactorAssertion, 'Телефон для 2FA');
      modal.classList.add('hidden');
      showNotification('Двухфакторная аутентификация успешно настроена!');
    } catch (error) {
      showNotification(`Ошибка: ${error.message}`, 'error');
    } finally {
      hideLoading();
    }
  }, { once: true });
}

// Обработка входа с MFA
async function handleLogin(email, password) {
  try {
    showLoading('Вход в систему...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Проверяем, включена ли MFA
    const enrolledFactors = multiFactor(userCredential.user).enrolledFactors;
    
    if (enabledMFA && enrolledFactors.length === 0) {
      showPhoneModal();
    }
    
    showNotification('Вы успешно вошли в систему');
  } catch (error) {
    showNotification(`Ошибка входа: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

// Остальной код приложения остается без изменений...
// (функции showNotification, showLoading, hideLoading, loadUserData и т.д.)

// Инициализация приложения
function initApp() {
  initRecaptcha();
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Проверяем MFA статус
      const enrolledFactors = multiFactor(user).enrolledFactors;
      
      if (enabledMFA && enrolledFactors.length === 0) {
        showPhoneModal();
      }
      
      authScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');
      loadSection('main');
      
      const userData = await loadUserData(user.uid);
      updateProfileUI(user, userData);
    } else {
      authScreen.classList.remove('hidden');
      appScreen.classList.add('hidden');
    }
  });

  // Остальные обработчики событий...
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);
