import { Router } from 'express';
import { db } from '../db/database.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = String(username).trim();
  const user = db.prepare(`SELECT * FROM users WHERE LOWER(username) = LOWER(?)`).get(cleanUsername);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    }
  });
});

// Register new user
router.post('/register', (req, res) => {
  const { username, password, name, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = String(username).trim();
  const cleanPassword = String(password);
  const cleanName = (name && String(name).trim()) ? String(name).trim() : cleanUsername;
  const userRole = (role === 'owner' || role === 'staff') ? role : 'staff';

  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }

  if (cleanPassword.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long' });
  }

  // Check if username already exists (case-insensitive)
  const existing = db.prepare(`SELECT id FROM users WHERE LOWER(username) = LOWER(?)`).get(cleanUsername);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists. Please choose another.' });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO users (username, password, name, role)
      VALUES (?, ?, ?, ?)
    `);
    const result = insert.run(cleanUsername, cleanPassword, cleanName, userRole);
    const newUser = db.prepare(`SELECT id, username, name, role FROM users WHERE id = ?`).get(result.lastInsertRowid);
    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role
      },
      message: 'Account registered successfully'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register user: ' + err.message });
  }
});

// Current user profile
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
