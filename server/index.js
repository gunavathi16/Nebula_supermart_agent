import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db, initDatabase } from './db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../client/dist');

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import billingRoutes from './routes/billing.js';
import invoiceRoutes from './routes/invoices.js';
import khataRoutes from './routes/khata.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import agentRoutes from './routes/agent.js';

dotenv.config();
dotenv.config({ path: '../bot/.env' });

const app = express();
const isLocal = !process.env.RENDER && !process.env.RAILWAY_ENVIRONMENT && process.env.NODE_ENV !== 'production';
const PORT = process.env.SERVER_PORT || (isLocal ? 5000 : process.env.PORT) || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize SQLite tables if not already created
initDatabase();

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/khata', khataRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/agent', agentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Nebula Supermarket POS API',
    timestamp: new Date().toISOString()
  });
});

// Auto-seed database if empty (e.g. fresh production deployment)
try {
  const row = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (!row || row.count === 0) {
    console.log('Database empty, auto-seeding catalog...');
    const { seed } = await import('./db/seed.js');
    seed();
  }
} catch (err) {
  console.warn('Auto-seed check:', err.message);
}

// Serve client static build in production
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Kirana POS Backend Server listening on http://localhost:${PORT}`);
});
