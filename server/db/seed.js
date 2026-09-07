import { db, initDatabase, runInTransaction } from './database.js';

export function seed() {
  console.log('Initializing schema and seeding Kirana database...');
  initDatabase();

  const insertProduct = db.prepare(`
    INSERT INTO products (name, sku, category, unit, is_loose, cost_price, sell_price, gst_slab, hsn_code, stock_qty, reorder_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(sku) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      unit = excluded.unit,
      is_loose = excluded.is_loose,
      cost_price = excluded.cost_price,
      sell_price = excluded.sell_price,
      gst_slab = excluded.gst_slab,
      hsn_code = excluded.hsn_code,
      stock_qty = excluded.stock_qty,
      reorder_level = excluded.reorder_level
  `);

  const products = [
    // 1. Packaged Staples & Grains
    ['Aashirvaad Superior MP Atta 5kg', 'AASH-ATTA-5KG', 'staples', 'packet', 0, 210.0, 265.0, 5, '1101', 24, 6],
    ['Tata Salt Vacuum Evaporated 1kg', 'TATA-SALT-1KG', 'staples', 'packet', 0, 22.0, 28.0, 0, '2501', 60, 15],
    ['Fortune Sunlite Sunflower Oil 1L', 'FORT-OIL-1L', 'staples', 'packet', 0, 125.0, 155.0, 5, '1512', 32, 8],
    ['India Gate Feast Rozzana Basmati Rice 1kg', 'IND-RICE-1KG', 'staples', 'packet', 0, 88.0, 115.0, 0, '1006', 40, 10],
    ['Saffola Gold Pro Healthy Heart Oil 1L', 'SAFF-OIL-1L', 'staples', 'packet', 0, 155.0, 185.0, 5, '1512', 25, 5],

    // 2. Loose Items Sold by Weight / Decimal Weigh Scale (kg)
    ['Sugar (Madhur Loose)', 'SUGAR-LOOSE-KG', 'staples', 'kg', 1, 38.0, 46.0, 5, '1701', 92.5, 20],
    ['Sona Masoori Rice (Loose)', 'RICE-SONA-KG', 'staples', 'kg', 1, 48.0, 62.0, 0, '1006', 145.0, 30],
    ['Premium Toor Dal (Loose)', 'DAL-TOOR-KG', 'staples', 'kg', 1, 135.0, 170.0, 0, '0713', 54.0, 15],
    ['Moong Dal Washed (Loose)', 'DAL-MOONG-KG', 'staples', 'kg', 1, 105.0, 135.0, 0, '0713', 42.0, 10],
    ['Premium Chana Dal (Loose)', 'DAL-CHANA-KG', 'staples', 'kg', 1, 78.0, 98.0, 0, '0713', 38.0, 10],

    // 3. Dairy & Cold Storage
    ['Amul Butter 100g', 'AMUL-BTR-100G', 'dairy', 'piece', 0, 50.0, 62.0, 12, '0405', 40, 10],
    ['Amul Taaza Toned Milk 500ml', 'AMUL-MLK-500ML', 'dairy', 'packet', 0, 24.5, 27.0, 0, '0401', 4, 15], // Low stock alert
    ['Nandini Pure Cow Ghee 500ml', 'NAND-GHEE-500ML', 'dairy', 'packet', 0, 280.0, 320.0, 12, '0405', 18, 5],
    ['Amul Processed Cheese Slices 200g', 'AMUL-CHS-200G', 'dairy', 'packet', 0, 118.0, 145.0, 12, '0406', 22, 6],
    ['Mother Dairy Fresh Paneer 200g', 'MD-PNR-200G', 'dairy', 'packet', 0, 75.0, 92.0, 0, '0406', 15, 5],

    // 4. Packaged Snacks, Biscuits & Noodles
    ['Maggi 2-Minute Noodles 70g', 'MAGG-NDL-70G', 'packaged', 'packet', 0, 11.5, 14.0, 12, '1902', 120, 25],
    ['Parle-G Original Glucose Biscuits 250g', 'PARL-G-250G', 'packaged', 'packet', 0, 24.0, 30.0, 18, '1905', 75, 20],
    ['Britannia Good Day Butter Cookies 120g', 'BRIT-GD-120G', 'packaged', 'packet', 0, 28.0, 35.0, 18, '1905', 50, 15],
    ['Haldiram Nagpur Aloo Bhujia 200g', 'HALD-BHUJ-200G', 'packaged', 'packet', 0, 48.0, 60.0, 12, '2106', 35, 10],
    ['Lay India Magic Masala Potato Chips 50g', 'LAYS-MAS-50G', 'packaged', 'packet', 0, 16.0, 20.0, 12, '2005', 60, 15],

    // 5. Beverages & Morning Staples
    ['Tata Tea Gold Assam Leaves 250g', 'TATA-TEA-250G', 'beverages', 'packet', 0, 128.0, 160.0, 5, '0902', 30, 8],
    ['Nescafe Classic Instant Coffee 50g Glass Jar', 'NESC-COF-50G', 'beverages', 'piece', 0, 162.0, 195.0, 18, '2101', 20, 5],
    ['Cadbury Bournvita Health Drink 500g', 'BOURN-500G', 'beverages', 'packet', 0, 215.0, 255.0, 18, '1901', 16, 4],

    // 6. Household, Cleaning & Personal Care
    ['Surf Excel Easy Wash Detergent Powder 1kg', 'SURF-DET-1KG', 'household', 'packet', 0, 115.0, 145.0, 18, '3402', 18, 5],
    ['Vim Dishwash Bar 300g with Lemon', 'VIM-BAR-300G', 'household', 'piece', 0, 22.0, 28.0, 18, '3401', 80, 20],
    ['Harpic Power Plus Toilet Cleaner 500ml', 'HARP-500ML', 'household', 'bottle', 0, 84.0, 105.0, 18, '3402', 24, 6],
    ['Dettol Original Bathing Soap 125g', 'DETT-SOP-125G', 'personal_care', 'piece', 0, 42.0, 55.0, 18, '3401', 45, 12],
    ['Colgate Strong Teeth Dental Cream 200g', 'COLG-TP-200G', 'personal_care', 'piece', 0, 92.0, 115.0, 18, '3306', 36, 10],
    ['Clinic Plus Strong & Long Shampoo 175ml', 'CLIN-SHMP-175ML', 'personal_care', 'bottle', 0, 95.0, 120.0, 18, '3305', 28, 8]
  ];

  runInTransaction(() => {
    for (const p of products) {
      insertProduct.run(...p);
    }

    // Default Users
    db.prepare(`
      INSERT INTO users (username, password, name, role)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET password = excluded.password
    `).run('admin', 'kirana123', 'Rajesh Sharma (Owner)', 'owner');

    db.prepare(`
      INSERT INTO users (username, password, name, role)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET password = excluded.password
    `).run('staff', 'staff123', 'Venkatesh (Billing Staff)', 'staff');

    // Customers with initial khata
    const insertCustomer = db.prepare(`
      INSERT INTO customers (id, name, phone, address, khata_balance)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        khata_balance = excluded.khata_balance
    `);

    const customers = [
      [1, 'Ramesh Kumar', '9876543210', '4th Cross, Near Vinayaka Temple', 850.0],
      [2, 'Priya Sharma', '9845012345', 'Flat 203, Rosewood Apts', 320.0],
      [3, 'Suresh Patel', '9712345678', 'Main Road, Opp. SBI ATM', 0.0],
      [4, 'Anita Desai', '9900112233', 'House #88, 2nd Main', 1200.0]
    ];

    for (const c of customers) {
      insertCustomer.run(...c);
    }

    // Initial Khata Transactions
    db.prepare(`DELETE FROM khata_transactions`).run();
    const insertKhataTx = db.prepare(`
      INSERT INTO khata_transactions (customer_id, type, amount, balance_after, notes, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', ?))
    `);

    insertKhataTx.run(1, 'credit', 1150.0, 1150.0, 'Grocery purchase on credit (Atta, Dal, Oil)', '-3 days');
    insertKhataTx.run(1, 'payment', 300.0, 850.0, 'UPI payment received via PhonePe', '-1 day');

    insertKhataTx.run(2, 'credit', 620.0, 620.0, 'Provisions (Sugar, Rice, Biscuits)', '-2 days');
    insertKhataTx.run(2, 'payment', 300.0, 320.0, 'Cash paid at counter', '-5 hours');

    insertKhataTx.run(4, 'credit', 1200.0, 1200.0, 'Monthly household stock-up', '-1 day');

    // Initial Stock Movements (Audit entries for opening balance)
    db.prepare(`DELETE FROM stock_movements`).run();
    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (product_id, type, qty, cost_price, notes, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', ?))
    `);

    const allProducts = db.prepare(`SELECT id, stock_qty, cost_price FROM products`).all();
    for (const prod of allProducts) {
      insertMovement.run(prod.id, 'in', prod.stock_qty, prod.cost_price, 'Opening inventory balance', '-7 days');
    }

    // Settings
    const insertSetting = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    const settings = [
      ['shop_name', 'Nebula Supermarket'],
      ['shop_tagline', 'Daily Provisions • Honest Measures • Lasting Trust'],
      ['shop_address', 'Shop No. 12, Main Market Road, Near Gandhi Circle, Bengaluru, Karnataka — 560001'],
      ['shop_phone', '+91 98450 12345'],
      ['shop_gstin', '29AAAAA0000A1Z5'],
      ['shop_state_code', '29 (Karnataka)'],
      ['default_payment_mode', 'upi'],
      ['default_brand_atta', 'Aashirvaad Superior MP Atta 5kg'],
      ['default_brand_oil', 'Fortune Sunlite Sunflower Oil 1L'],
      ['invoice_prefix', 'NSM-'],
      ['invoice_footer_note', 'Thank you for shopping at Nebula Supermarket! Pakka Saamaan, Pakka Hisaab.']
    ];

    for (const [k, v] of settings) {
      insertSetting.run(k, v);
    }
  });

  console.log('Database seeded successfully!');
}

if (process.argv[1]?.endsWith('seed.js')) {
  seed();
}
