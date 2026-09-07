import { Router } from 'express';
import { db, runInTransaction } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// List all customers with khata balance
router.get('/customers', (req, res) => {
  const { search } = req.query;
  let sql = `SELECT * FROM customers WHERE 1=1`;
  const params = [];

  if (search) {
    sql += ` AND (name LIKE ? OR phone LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term);
  }

  sql += ` ORDER BY khata_balance DESC, name ASC`;
  const customers = db.prepare(sql).all(...params);
  res.json(customers);
});

// Create customer
router.post('/customers', authenticate, (req, res) => {
  const { name, phone, address, initial_balance } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  try {
    const result = runInTransaction(() => {
      const info = db.prepare(`
        INSERT INTO customers (name, phone, address, khata_balance)
        VALUES (?, ?, ?, ?)
      `).run(
        name.trim(),
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        Number(initial_balance) || 0
      );

      const customerId = Number(info.lastInsertRowid);

      if (Number(initial_balance) > 0) {
        db.prepare(`
          INSERT INTO khata_transactions (customer_id, type, amount, balance_after, notes)
          VALUES (?, 'credit', ?, ?, 'Opening credit balance')
        `).run(customerId, Number(initial_balance), Number(initial_balance));
      }

      return db.prepare(`SELECT * FROM customers WHERE id = ?`).get(customerId);
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update customer
router.put('/customers/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { name, phone, address, khata_balance } = req.body;

  try {
    const existing = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    db.prepare(`
      UPDATE customers
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          khata_balance = COALESCE(?, khata_balance)
      WHERE id = ?
    `).run(
      name !== undefined && name !== null ? name.trim() : null,
      phone !== undefined && phone !== null ? phone.trim() : null,
      address !== undefined && address !== null ? address.trim() : null,
      khata_balance !== undefined && khata_balance !== null ? Number(khata_balance) : null,
      id
    );

    const updated = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add credit to customer balance ("Put ₹500 on Ramesh's credit")
router.post('/customers/:id/credit', authenticate, (req, res) => {
  const { id } = req.params;
  const { amount, notes } = req.body;

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Credit amount must be greater than zero' });
  }

  try {
    const result = runInTransaction(() => {
      const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
      if (!customer) throw new Error('Customer not found');

      const newBalance = Math.round((customer.khata_balance + numAmount) * 100) / 100;

      db.prepare(`
        UPDATE customers
        SET khata_balance = ?
        WHERE id = ?
      `).run(newBalance, id);

      db.prepare(`
        INSERT INTO khata_transactions (
          customer_id, type, amount, balance_after, notes
        ) VALUES (?, 'credit', ?, ?, ?)
      `).run(
        id,
        numAmount,
        newBalance,
        notes || 'Store credit added'
      );

      const updatedCustomer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
      return updatedCustomer;
    });

    res.json({
      message: `Credit of ₹${numAmount} successfully added to ${result.name}`,
      customer: result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get customer details and ledger
router.get('/customers/:id', (req, res) => {
  const { id } = req.params;
  const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const transactions = db.prepare(`
    SELECT kt.*, b.bill_number
    FROM khata_transactions kt
    LEFT JOIN bills b ON kt.bill_id = b.id
    WHERE kt.customer_id = ?
    ORDER BY kt.created_at DESC
  `).all(id);

  res.json({ ...customer, transactions });
});

// Record customer payment ("Ramesh paid ₹300")
router.post('/customers/:id/payment', authenticate, (req, res) => {
  const { id } = req.params;
  const { amount, payment_mode, payment_ref, notes } = req.body;

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero' });
  }

  try {
    const result = runInTransaction(() => {
      const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
      if (!customer) throw new Error('Customer not found');

      const newBalance = Math.round((customer.khata_balance - numAmount) * 100) / 100;

      db.prepare(`
        UPDATE customers
        SET khata_balance = ?
        WHERE id = ?
      `).run(newBalance, id);

      db.prepare(`
        INSERT INTO khata_transactions (
          customer_id, type, amount, payment_mode, payment_ref,
          balance_after, notes
        ) VALUES (?, 'payment', ?, ?, ?, ?, ?)
      `).run(
        id,
        numAmount,
        payment_mode || 'cash',
        payment_ref || null,
        newBalance,
        notes || `Payment received (${payment_mode ? payment_mode.toUpperCase() : 'CASH'})`
      );

      const updatedCustomer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
      const transactions = db.prepare(`
        SELECT kt.*, b.bill_number
        FROM khata_transactions kt
        LEFT JOIN bills b ON kt.bill_id = b.id
        WHERE kt.customer_id = ?
        ORDER BY kt.created_at DESC
      `).all(id);

      return { customer: updatedCustomer, transactions };
    });

    res.json({
      message: `Payment of ₹${numAmount} successfully recorded for ${result.customer.name}`,
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Settle balance entirely in one action
router.post('/customers/:id/settle', authenticate, (req, res) => {
  const { id } = req.params;
  const { payment_mode, payment_ref } = req.body;

  try {
    const result = runInTransaction(() => {
      const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
      if (!customer) throw new Error('Customer not found');

      const outstanding = Number(customer.khata_balance);
      if (outstanding <= 0) {
        throw new Error('Customer has no outstanding balance to settle');
      }

      db.prepare(`
        UPDATE customers
        SET khata_balance = 0
        WHERE id = ?
      `).run(id);

      db.prepare(`
        INSERT INTO khata_transactions (
          customer_id, type, amount, payment_mode, payment_ref,
          balance_after, notes
        ) VALUES (?, 'payment', ?, ?, ?, 0, 'Full Khata balance settlement')
      `).run(
        id,
        outstanding,
        payment_mode || 'cash',
        payment_ref || null
      );

      const updatedCustomer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
      return updatedCustomer;
    });

    res.json({
      message: `Outstanding balance settled successfully for ${result.name}`,
      customer: result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Ensure last_reminder_at column exists in customers table
try {
  db.exec(`ALTER TABLE customers ADD COLUMN last_reminder_at DATETIME;`);
} catch (_) {}

// Get all customers with pending Khata balance and their multi-lingual reminder templates
router.get('/reminders', (req, res) => {
  try {
    const debtors = db.prepare(`
      SELECT * FROM customers
      WHERE khata_balance > 0
      ORDER BY khata_balance DESC, name ASC
    `).all();

    // Fetch store settings for UPI ID and Store Name
    const settingsRows = db.prepare(`SELECT key, value FROM settings`).all();
    const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

    const shopName = settings.shop_name || 'Nebula Supermarket & Retail';
    const upiId = settings.upi_id || 'nebularetail@okaxis';

    const reminders = debtors.map(c => {
      const cleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, '').slice(-10) : null;
      const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${c.khata_balance}&cu=INR&tn=${encodeURIComponent(`Khata Settlement - ${c.name}`)}`;

      const messages = {
        en: `Dear ${c.name}, this is a gentle payment reminder from ${shopName}. Your pending Khata credit balance is ₹${c.khata_balance}. Kindly pay via UPI to ${upiId} or settle at store counter. Thank you!`,
        hi: `नमस्ते ${c.name} जी, ${shopName} से यह एक विनम्र भुगतान अनुस्मारक है। आपका खाता बकाया ₹${c.khata_balance} है। कृपया इस UPI पर भुगतान करें: ${upiId} या दुकान पर आकर जमा करें। धन्यवाद!`,
        ta: `வணக்கம் ${c.name}, ${shopName} சார்பாக இந்த கட்டண நினைவூட்டல். உங்கள் நிலுவை பாக்கி தொகை ₹${c.khata_balance}. தயவுசெய்து இந்த UPI மூலம் செலுத்தவும்: ${upiId} அல்லது கடையில் செலுத்தவும். நன்றி!`
      };

      const waLinks = {
        en: cleanPhone ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(messages.en + '\n\n👉 Pay via UPI:\n' + upiPayUrl)}` : null,
        hi: cleanPhone ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(messages.hi + '\n\n👉 Pay via UPI:\n' + upiPayUrl)}` : null,
        ta: cleanPhone ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(messages.ta + '\n\n👉 Pay via UPI:\n' + upiPayUrl)}` : null
      };

      return {
        customer_id: c.id,
        name: c.name,
        phone: c.phone,
        clean_phone: cleanPhone,
        khata_balance: c.khata_balance,
        last_reminder_at: c.last_reminder_at,
        upi_id: upiId,
        upi_pay_url: upiPayUrl,
        messages,
        wa_links: waLinks
      };
    });

    const totalOutstanding = debtors.reduce((sum, c) => sum + c.khata_balance, 0);

    res.json({
      count: debtors.length,
      total_outstanding: totalOutstanding,
      reminders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record / trigger reminder for a specific customer
router.post('/customers/:id/send-reminder', authenticate, (req, res) => {
  const { id } = req.params;
  const { language = 'en' } = req.body;

  try {
    const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    if (customer.khata_balance <= 0) {
      return res.status(400).json({ error: 'Customer has no outstanding balance' });
    }

    // Update last_reminder_at timestamp
    const now = new Date().toISOString();
    db.prepare(`UPDATE customers SET last_reminder_at = ? WHERE id = ?`).run(now, id);

    const settingsRows = db.prepare(`SELECT key, value FROM settings`).all();
    const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    const shopName = settings.shop_name || 'Nebula Supermarket & Retail';
    const upiId = settings.upi_id || 'nebularetail@okaxis';

    const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, '').slice(-10) : null;
    const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${customer.khata_balance}&cu=INR&tn=${encodeURIComponent(`Khata Settlement - ${customer.name}`)}`;

    let messageText = '';
    if (language === 'hi') {
      messageText = `नमस्ते ${customer.name} जी, ${shopName} से यह एक विनम्र भुगतान अनुस्मारक है। आपका खाता बकाया ₹${customer.khata_balance} है। कृपया इस UPI पर भुगतान करें: ${upiId} या दुकान पर आकर जमा करें। धन्यवाद!`;
    } else if (language === 'ta') {
      messageText = `வணக்கம் ${customer.name}, ${shopName} சார்பாக இந்த கட்டண நினைவூட்டல். உங்கள் நிலுவை பாக்கி தொகை ₹${customer.khata_balance}. தயவுசெய்து இந்த UPI மூலம் செலுத்தவும்: ${upiId} அல்லது கடையில் செலுத்தவும். நன்றி!`;
    } else {
      messageText = `Dear ${customer.name}, this is a gentle payment reminder from ${shopName}. Your pending Khata credit balance is ₹${customer.khata_balance}. Kindly pay via UPI to ${upiId} or settle at store counter. Thank you!`;
    }

    const waLink = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(messageText + '\n\n👉 Pay via UPI:\n' + upiPayUrl)}` : null;

    res.json({
      success: true,
      customer_name: customer.name,
      phone: customer.phone,
      khata_balance: customer.khata_balance,
      last_reminder_at: now,
      message: messageText,
      upi_id: upiId,
      upi_pay_url: upiPayUrl,
      wa_link: waLink
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
