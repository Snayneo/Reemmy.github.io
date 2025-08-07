import {
  auth,
  db,
  ref,
  set,
  get,
  push,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from './firebase.js';

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const saveBtn = document.getElementById('save-btn');

loginBtn.addEventListener('click', () => {
  const email = prompt('Введите email:');
  const password = prompt('Введите пароль:');
  signInWithEmailAndPassword(auth, email, password)
    .then(() => alert('Успешный вход!'))
    .catch(err => alert(`Ошибка входа: ${err.message}`));
});

logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

saveBtn.addEventListener('click', () => {
  const task = taskInput.value.trim();
  if (!task) return;

  const userId = auth.currentUser.uid;
  const tasksRef = ref(db, `Materials/${userId}`);
  const newTaskRef = push(tasksRef);

  set(newTaskRef, {
    text: task,
    timestamp: Date.now()
  });

  taskInput.value = '';
});

function loadTasks(userId) {
  const tasksRef = ref(db, `Materials/${userId}`);
  get(tasksRef).then(snapshot => {
    taskList.innerHTML = '';
    if (snapshot.exists()) {
      const tasks = snapshot.val();
      Object.values(tasks).forEach(task => {
        const li = document.createElement('li');
        li.textContent = task.text;
        taskList.appendChild(li);
      });
    } else {
      taskList.innerHTML = '<li>Нет заданий</li>';
    }
  });
}

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    loadTasks(user.uid);
  } else {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('app-section').style.display = 'none';
  }
});
