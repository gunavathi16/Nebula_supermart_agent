import { db, runInTransaction } from './database.js';

export function setupBatches() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      batch_number TEXT NOT NULL,
      mfg_date DATE,
      expiry_date DATE NOT NULL,
      stock_qty REAL NOT NULL DEFAULT 0 CHECK(stock_qty >= 0),
      cost_price REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_batches_expiry ON product_batches(product_id, expiry_date);
  `);

  const count = db.prepare('SELECT count(*) as c FROM product_batches').get().c;
  if (count === 0) {
    const prods = db.prepare('SELECT id, name, stock_qty, cost_price FROM products').all();
    runInTransaction(() => {
      const insert = db.prepare(`
        INSERT INTO product_batches (product_id, batch_number, mfg_date, expiry_date, stock_qty, cost_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const p of prods) {
        if (p.stock_qty > 0) {
          const isDairy = p.name.toLowerCase().includes('milk') || p.name.toLowerCase().includes('butter');
          const isStaple = p.name.toLowerCase().includes('atta') || p.name.toLowerCase().includes('rice');
          
          const half1 = Math.floor(p.stock_qty / 2) || p.stock_qty;
          const half2 = p.stock_qty - half1;

          // Batch 1 (Expiring sooner - dairy in 4 days, staple in 45 days, others in 90 days)
          const days1 = isDairy ? 4 : (isStaple ? 45 : 90);
          const exp1 = new Date(Date.now() + days1 * 86400000).toISOString().split('T')[0];
          const mfg1 = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
          insert.run(p.id, `BTH-${p.id}-A1`, mfg1, exp1, half1, p.cost_price);

          // Batch 2 (Expiring later)
          if (half2 > 0) {
            const days2 = isDairy ? 12 : (isStaple ? 120 : 180);
            const exp2 = new Date(Date.now() + days2 * 86400000).toISOString().split('T')[0];
            const mfg2 = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
            insert.run(p.id, `BTH-${p.id}-B2`, mfg2, exp2, half2, p.cost_price);
          }
        }
      }
    });
    console.log('Seeded initial product batches for FEFO tracking successfully.');
  } else {
    console.log(`Product batches already populated (${count} records).`);
  }
}

setupBatches();
