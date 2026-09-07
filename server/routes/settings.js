import { Router } from 'express';
import { db, runInTransaction } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get all shop settings as a key-value object
router.get('/', (req, res) => {
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

// Update settings
router.put('/', authenticate, (req, res) => {
  const newSettings = req.body;
  if (!newSettings || typeof newSettings !== 'object') {
    return res.status(400).json({ error: 'Settings object is required' });
  }

  try {
    runInTransaction(() => {
      const upsert = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);

      for (const [key, value] of Object.entries(newSettings)) {
        if (value !== undefined && value !== null) {
          upsert.run(key, String(value));
        }
      }
    });

    const rows = db.prepare(`SELECT key, value FROM settings`).all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ message: 'Settings updated successfully', settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
