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

  const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
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

// Current user profile
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
