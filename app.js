import { 
  auth, 
  db, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc
} from './firebase.js';

// DOM элементы
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const authForm = document.getElementById('auth-form');
const addForm = document.getElementById('add-form');
const itemsList = document.getElementById('items-list');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const itemInput = document.getElementById('item-input');

// Проверка состояния аутентификации
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Пользователь вошел в систему
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    loadItems(user.uid);
  } else {
    // Пользователь вышел из системы
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
});

// Вход
loginBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert(error.message);
  }
});

// Регистрация
signupBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;
  
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert(error.message);
  }
});

// Выход
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(error.message);
  }
});

// Добавление элемента
addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = itemInput.value;
  const user = auth.currentUser;
  
  if (text && user) {
    try {
      await addDoc(collection(db, 'users', user.uid, 'items'), {
        text: text,
        completed: false,
        createdAt: new Date()
      });
      itemInput.value = '';
    } catch (error) {
      alert(error.message);
    }
  }
});

// Загрузка и отображение элементов
function loadItems(userId) {
  onSnapshot(collection(db, 'users', userId, 'items'), (snapshot) => {
    itemsList.innerHTML = '';
    
    snapshot.forEach((doc) => {
      const item = doc.data();
      const li = document.createElement('li');
      
      li.innerHTML = `
        <span>${item.text}</span>
        <div>
          <button class="complete-btn" data-id="${doc.id}">✓</button>
          <button class="delete-btn" data-id="${doc.id}">×</button>
        </div>
      `;
      
      if (item.completed) {
        li.querySelector('span').style.textDecoration = 'line-through';
      }
      
      itemsList.appendChild(li);
    });
    
    // Обработчики для кнопок
    document.querySelectorAll('.complete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const itemRef = doc(db, 'users', userId, 'items', id);
        await updateDoc(itemRef, { completed: true });
      });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await deleteDoc(doc(db, 'users', userId, 'items', id));
      });
    });
  });
}
