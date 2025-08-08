import { 
    auth, 
    db, 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    updateProfile 
} from './firebase.js';

// DOM элементы
const tabItems = document.querySelectorAll('.tab-item');
const pages = document.querySelectorAll('.page');
const authForms = document.getElementById('auth-forms');
const profileInfo = document.getElementById('profile-info');
const registerBtn = document.getElementById('register-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const changeAvatarBtn = document.getElementById('change-avatar-btn');
const avatarUpload = document.getElementById('avatar-upload');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const userBalance = document.getElementById('user-balance');
const materialsList = document.getElementById('materials-list');
const allMaterialsList = document.getElementById('all-materials-list');
const statsContainer = document.getElementById('stats-container');

// Константы
const IMGBB_API_KEY = '1e56db850ecdc3cd2c8ac1e73dac0eb8';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Навигация по табам
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            const pageId = tab.getAttribute('data-page');
            
            tabItems.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
        });
    });
    
    // Проверка состояния аутентификации
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Пользователь вошел
            authForms.style.display = 'none';
            profileInfo.style.display = 'block';
            
            // Загрузка данных пользователя
            loadUserData(user.uid);
            
            // Загрузка материалов
            loadMaterials();
            loadAllMaterials();
        } else {
            // Пользователь не вошел
            authForms.style.display = 'block';
            profileInfo.style.display = 'none';
        }
    });
    
    // Регистрация
    registerBtn.addEventListener('click', registerUser);
    
    // Вход
    loginBtn.addEventListener('click', loginUser);
    
    // Выход
    logoutBtn.addEventListener('click', logoutUser);
    
    // Смена аватара
    changeAvatarBtn.addEventListener('click', () => avatarUpload.click());
    avatarUpload.addEventListener('change', uploadAvatar);
});

// Функции
async function registerUser() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Обновление профиля с именем
        await updateProfile(user, { displayName: name });
        
        // Создание записи в базе данных
        await set(ref(db, 'users/' + user.uid), {
            name: name,
            email: email,
            balance: 0,
            avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
        });
        
        alert('Регистрация успешна!');
    } catch (error) {
        alert('Ошибка регистрации: ' + error.message);
    }
}

async function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('Ошибка входа: ' + error.message);
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        alert('Ошибка выхода: ' + error.message);
    }
}

async function loadUserData(userId) {
    try {
        const snapshot = await get(ref(db, 'users/' + userId));
        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            userName.textContent = userData.name || 'Без имени';
            userEmail.textContent = userData.email || 'Нет email';
            userBalance.textContent = userData.balance || 0;
            
            if (userData.avatar) {
                userAvatar.src = userData.avatar;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
    }
}

async function uploadAvatar() {
    const file = avatarUpload.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            const imageUrl = data.data.url;
            userAvatar.src = imageUrl;
            
            // Обновление аватара в Firebase
            const user = auth.currentUser;
            await update(ref(db, 'users/' + user.uid), {
                avatar: imageUrl
            });
        } else {
            alert('Ошибка загрузки изображения');
        }
    } catch (error) {
        console.error('Ошибка загрузки аватара:', error);
        alert('Ошибка загрузки аватара');
    }
}

async function loadMaterials() {
    try {
        const snapshot = await get(ref(db, 'Materials'));
        if (snapshot.exists()) {
            const materials = snapshot.val();
            materialsList.innerHTML = '';
            
            Object.keys(materials).forEach(key => {
                const material = materials[key];
                materialsList.innerHTML += `
                    <div class="material-card">
                        <h3>${material.title}</h3>
                        <p>${material.description}</p>
                        <p>Платформа: ${material.platform}</p>
                        <p class="reward">Награда: ${material.reward} $</p>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки материалов:', error);
    }
}

async function loadAllMaterials() {
    try {
        const snapshot = await get(ref(db, 'Materials'));
        if (snapshot.exists()) {
            const materials = snapshot.val();
            allMaterialsList.innerHTML = '';
            
            Object.keys(materials).forEach(key => {
                const material = materials[key];
                allMaterialsList.innerHTML += `
                    <div class="material-card">
                        <h3>${material.title}</h3>
                        <p>${material.description}</p>
                        <p>Платформа: ${material.platform}</p>
                        <p class="reward">Награда: ${material.reward} $</p>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки всех материалов:', error);
    }
}
