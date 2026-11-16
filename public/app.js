const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

const list = document.getElementById('list');
const input = document.getElementById('new-title');
const errorEl = document.getElementById('error');
const countEl = document.getElementById('count');

// Helper: calls the API and attaches the login token
async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

async function loadTasks() {
  try {
    const tasks = await api('/api/tasks');
    render(tasks);
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

function render(tasks) {
  list.innerHTML = '';

  const remaining = tasks.filter((t) => !t.done).length;
  countEl.textContent = tasks.length ? `${remaining} of ${tasks.length} tasks left` : '';

  if (tasks.length === 0) {
    list.innerHTML = '<p class="empty">No tasks yet. Add your first one above.</p>';
    return;
  }

  tasks.forEach((task) => {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!task.done;
    checkbox.addEventListener('change', () => updateTask(task.id, { done: checkbox.checked }));

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = task.title; // textContent keeps user input safe

    const editBtn = document.createElement('button');
    editBtn.className = 'small';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      const newTitle = prompt('Edit task:', task.title);
      if (newTitle !== null && newTitle.trim()) updateTask(task.id, { title: newTitle });
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'small delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.append(checkbox, title, editBtn, deleteBtn);
    list.appendChild(li);
  });
}

async function addTask() {
  errorEl.textContent = '';
  try {
    await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: input.value }),
    });
    input.value = '';
    loadTasks();
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

async function updateTask(id, changes) {
  try {
    await api(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(changes) });
    loadTasks();
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await api(`/api/tasks/${id}`, { method: 'DELETE' });
    loadTasks();
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

document.getElementById('add').addEventListener('click', addTask);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

loadTasks();
