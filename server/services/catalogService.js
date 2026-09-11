import { db, runInTransaction } from '../db/database.js';
import { seed } from '../db/seed.js';

/**
 * Empties all sample / demo stock, products, batches, and transactions
 * so the store is completely new and ready for the user to upload their products.
 */
export function emptyStoreCatalog({ companyId, companyName } = {}) {
  return runInTransaction(() => {
    // Delete transactional and stock records
    db.exec('DELETE FROM khata_transactions;');
    db.exec('DELETE FROM bill_items;');
    db.exec('DELETE FROM bills;');
    db.exec('DELETE FROM product_batches;');
    db.exec('DELETE FROM stock_movements;');
    db.exec('DELETE FROM products;');

    // Reset auto-increment sequences so IDs start fresh from 1
    try {
      db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('products', 'product_batches', 'stock_movements', 'bills', 'bill_items', 'khata_transactions');`);
    } catch (_) {}

    const upsertSetting = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    // Flag store as clean so server startup will not re-seed demo data
    upsertSetting.run('clean_store', '1');

    if (companyName && String(companyName).trim()) {
      upsertSetting.run('shop_name', String(companyName).trim());
    }

    if (companyId && String(companyId).trim()) {
      upsertSetting.run('company_id', String(companyId).trim());
    }

    return {
      success: true,
      message: 'Store stock has been emptied. System is fresh and ready for uploading your market catalog.'
    };
  });
}

/**
 * Re-seeds sample demo products and sets clean_store = '0'
 */
export function seedDemoCatalog() {
  seed();
  const upsertSetting = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES ('clean_store', '0', CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = '0', updated_at = CURRENT_TIMESTAMP
  `);
  upsertSetting.run();
  return {
    success: true,
    message: 'Sample demo products and customers restored successfully.'
  };
}
