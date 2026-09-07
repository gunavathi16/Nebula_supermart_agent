import { Router } from 'express';
import { db } from '../db/database.js';
import { generateInvoicePdf } from '../services/pdfInvoiceService.js';

const router = Router();

// List finalized invoices
router.get('/', (req, res) => {
  const { search, payment_mode, from_date, to_date, limit = 50 } = req.query;
  let sql = `
    SELECT b.*, c.phone as customer_phone
    FROM bills b
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE b.status = 'finalized'
  `;
  const params = [];

  if (search) {
    sql += ` AND (b.bill_number LIKE ? OR b.customer_name LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term);
  }

  if (payment_mode) {
    sql += ` AND b.payment_mode = ?`;
    params.push(payment_mode);
  }

  if (from_date) {
    sql += ` AND date(b.finalized_at) >= date(?)`;
    params.push(from_date);
  }

  if (to_date) {
    sql += ` AND date(b.finalized_at) <= date(?)`;
    params.push(to_date);
  }

  sql += ` ORDER BY b.finalized_at DESC LIMIT ?`;
  params.push(Number(limit));

  const invoices = db.prepare(sql).all(...params);
  res.json(invoices);
});

// Get invoice by ID with line items
router.get('/:id', (req, res) => {
  const invoice = db.prepare(`
    SELECT b.*, c.name as customer_name_db, c.phone as customer_phone, c.address as customer_address
    FROM bills b
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const items = db.prepare(`SELECT * FROM bill_items WHERE bill_id = ?`).all(req.params.id);
  res.json({ ...invoice, items });
});

// Download GST Invoice PDF
router.get('/:id/pdf', async (req, res) => {
  const { id } = req.params;

  const invoice = db.prepare(`
    SELECT b.*, c.name as customer_name_db, c.phone as customer_phone, c.address as customer_address
    FROM bills b
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE b.id = ?
  `).get(id);

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const items = db.prepare(`SELECT * FROM bill_items WHERE bill_id = ?`).all(id);
  const settingsRows = db.prepare(`SELECT key, value FROM settings`).all();
  const settings = {};
  settingsRows.forEach(r => { settings[r.key] = r.value; });

  try {
    const pdfBuffer = await generateInvoicePdf(invoice, items, settings);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Tax_Invoice_${invoice.bill_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: `Failed to generate PDF invoice: ${err.message}` });
  }
});

export default router;
