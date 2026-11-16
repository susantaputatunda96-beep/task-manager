const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Middleware: checks the login token ----------
function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in.' });

  try {
    req.user = jwt.verify(token, SECRET); // { id, email }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}
app.post('/api/signup', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Enter an email and a password of at least 6 characters.' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(400).json({ error: 'That email is already registered.' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hash);

  const token = jwt.sign({ id: result.lastInsertRowid, email }, SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !bcrypt.compareSync(password || '', user.password)) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// ---------- Task routes (all need login) ----------
app.get('/api/tasks', requireLogin, (req, res) => {
  const tasks = db
    .prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id);
  res.json(tasks);
});

app.post('/api/tasks', requireLogin, (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Task title is required.' });

  const result = db
    .prepare('INSERT INTO tasks (user_id, title) VALUES (?, ?)')
    .run(req.user.id, title);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', requireLogin, (req, res) => {
  const task = db
    .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const title = req.body.title !== undefined ? req.body.title.trim() : task.title;
  const done = req.body.done !== undefined ? (req.body.done ? 1 : 0) : task.done;
  if (!title) return res.status(400).json({ error: 'Task title is required.' });

  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(title, done, task.id);
  res.json({ ...task, title, done });
});

app.delete('/api/tasks/:id', requireLogin, (req, res) => {
  const result = db
    .prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found.' });
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));
