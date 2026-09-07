import { Router } from 'express';
import crypto from 'node:crypto';
import { db, runInTransaction } from '../db/database.js';
import { calculateBillSummary, calculateLineGst } from '../services/gstService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Recalculate live line GST without DB write
router.post('/calculate', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  const summary = calculateBillSummary(items);
  res.json(summary);
});

// List draft bills
router.get('/drafts', (req, res) => {
  const drafts = db.prepare(`
    SELECT b.*, c.name as customer_name_db, c.phone as customer_phone
    FROM bills b
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE b.status = 'draft'
    ORDER BY b.created_at DESC
  `).all();

  res.json(drafts);
});

// Get bill with items
router.get('/:id', (req, res) => {
  const bill = db.prepare(`
    SELECT b.*, c.name as customer_name_db, c.phone as customer_phone, c.khata_balance
    FROM bills b
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!bill) return res.status(404).json({ error: 'Bill not found' });

  const items = db.prepare(`SELECT * FROM bill_items WHERE bill_id = ?`).all(req.params.id);
  res.json({ ...bill, items });
});

// Start a new empty Draft Bill
router.post('/draft/start', authenticate, (req, res) => {
  const { customer_id, customer_name, payment_mode, idempotency_key } = req.body || {};
  const billNumber = `INV-${Date.now().toString().slice(-6)}`;
  const key = idempotency_key || crypto.randomUUID();

  try {
    const info = db.prepare(`
      INSERT INTO bills (
        bill_number, customer_id, customer_name, status,
        payment_mode, subtotal, cgst_amount, sgst_amount,
        round_off, total_amount, idempotency_key
      ) VALUES (?, ?, ?, 'draft', ?, 0, 0, 0, 0, 0, ?)
    `).run(
      billNumber,
      customer_id || null,
      customer_name || null,
      payment_mode || 'cash',
      key
    );

    const billId = Number(info.lastInsertRowid);
    const bill = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(billId);
    res.json({ ...bill, items: [] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add or update an item on an existing draft bill
router.post('/draft/:id/items', authenticate, (req, res) => {
  const { id } = req.params;
  const { product_id, qty, unit_price } = req.body;

  try {
    const result = runInTransaction(() => {
      const bill = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(id);
      if (!bill) throw new Error(`Draft bill #${id} not found`);
      if (bill.status === 'finalized') throw new Error('Cannot edit an already finalized bill');

      const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(product_id);
      if (!product) throw new Error(`Product ID ${product_id} not found`);

      const effectiveQty = Number(qty);
      if (effectiveQty <= 0) throw new Error('Quantity must be greater than zero');
      const effectivePrice = unit_price !== undefined ? Number(unit_price) : product.sell_price;

      const calc = calculateLineGst(effectiveQty, effectivePrice, product.gst_slab);

      // Check if item already exists in this bill
      const existing = db.prepare(`SELECT id FROM bill_items WHERE bill_id = ? AND product_id = ?`).get(id, product_id);

      if (existing) {
        db.prepare(`
          UPDATE bill_items SET
            qty = ?,
            unit_price = ?,
            taxable_value = ?,
            cgst_amount = ?,
            sgst_amount = ?,
            line_total = ?
          WHERE id = ?
        `).run(
          effectiveQty,
          effectivePrice,
          calc.taxableValue,
          calc.cgstAmount,
          calc.sgstAmount,
          calc.lineTotal,
          existing.id
        );
      } else {
        db.prepare(`
          INSERT INTO bill_items (
            bill_id, product_id, product_name, sku, unit, hsn_code,
            qty, unit_price, gst_slab, taxable_value, cgst_rate,
            cgst_amount, sgst_rate, sgst_amount, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          product.id,
          product.name,
          product.sku,
          product.unit,
          product.hsn_code,
          effectiveQty,
          effectivePrice,
          product.gst_slab,
          calc.taxableValue,
          calc.cgstRate,
          calc.cgstAmount,
          calc.sgstRate,
          calc.sgstAmount,
          calc.lineTotal
        );
      }

      // Recalculate bill summary
      const allItems = db.prepare(`SELECT * FROM bill_items WHERE bill_id = ?`).all(id);
      const summary = calculateBillSummary(allItems);

      db.prepare(`
        UPDATE bills SET
          subtotal = ?,
          cgst_amount = ?,
          sgst_amount = ?,
          round_off = ?,
          total_amount = ?
        WHERE id = ?
      `).run(
        summary.subtotal,
        summary.cgstAmount,
        summary.sgstAmount,
        summary.roundOff,
        summary.totalAmount,
        id
      );

      const updatedBill = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(id);
      return { ...updatedBill, items: allItems };
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove an item from a draft bill
router.delete('/draft/:id/items/:itemId', authenticate, (req, res) => {
  const { id, itemId } = req.params;

  try {
    const result = runInTransaction(() => {
      const bill = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(id);
      if (!bill) throw new Error(`Draft bill #${id} not found`);
      if (bill.status === 'finalized') throw new Error('Cannot edit an already finalized bill');

      db.prepare(`DELETE FROM bill_items WHERE bill_id = ? AND (id = ? OR product_id = ?)`).run(id, itemId, itemId);

      const allItems = db.prepare(`SELECT * FROM bill_items WHERE bill_id = ?`).all(id);
      const summary = calculateBillSummary(allItems);

      db.prepare(`
        UPDATE bills SET
          subtotal = ?,
          cgst_amount = ?,
          sgst_amount = ?,
          round_off = ?,
          total_amount = ?
        WHERE id = ?
      `).run(
        summary.subtotal,
        summary.cgstAmount,
        summary.sgstAmount,
        summary.roundOff,
        summary.totalAmount,
        id
      );

      const updatedBill = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(id);
      return { ...updatedBill, items: allItems };
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Save or Update Draft Bill (with full items array)
router.post('/draft', authenticate, (req, res) => {
  const {
    id,
    customer_id,
    customer_name,
    payment_mode,
    payment_ref,
    items,
    notes,
    idempotency_key
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Bill must contain at least one item' });
  }

  try {
    const result = runInTransaction(() => {
      const validatedItems = [];
      for (const item of items) {
        const prod = db.prepare(`SELECT * FROM products WHERE id = ?`).get(item.product_id);
        if (!prod) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        const unitPrice = item.unit_price !== undefined ? Number(item.unit_price) : prod.sell_price;
        const qty = Number(item.qty);
        if (qty <= 0) throw new Error(`Quantity for ${prod.name} must be greater than zero`);

        validatedItems.push({
          product_id: prod.id,
          product_name: prod.name,
          sku: prod.sku,
          unit: prod.unit,
          hsn_code: prod.hsn_code,
          qty,
          unit_price: unitPrice,
          gst_slab: prod.gst_slab,
          cost_price: prod.cost_price
        });
      }

      const summary = calculateBillSummary(validatedItems);

      let billId = id;
      if (billId) {
        const existing = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(billId);
        if (!existing) throw new Error('Bill not found');
        if (existing.status === 'finalized') {
          throw new Error('Cannot edit an already finalized bill');
        }

        db.prepare(`
          UPDATE bills SET
            customer_id = ?,
            customer_name = ?,
            payment_mode = ?,
            payment_ref = ?,
            subtotal = ?,
            cgst_amount = ?,
            sgst_amount = ?,
            round_off = ?,
            total_amount = ?,
            notes = ?,
            idempotency_key = COALESCE(?, idempotency_key)
          WHERE id = ?
        `).run(
          customer_id || null,
          customer_name || null,
          payment_mode || 'cash',
          payment_ref || null,
          summary.subtotal,
          summary.cgstAmount,
          summary.sgstAmount,
          summary.roundOff,
          summary.totalAmount,
          notes || null,
          idempotency_key || null,
          billId
        );

        db.prepare(`DELETE FROM bill_items WHERE bill_id = ?`).run(billId);
      } else {
        const billNumber = `INV-${Date.now().toString().slice(-6)}`;
        const key = idempotency_key || crypto.randomUUID();

        const info = db.prepare(`
          INSERT INTO bills (
            bill_number, customer_id, customer_name, status,
            payment_mode, payment_ref, subtotal, cgst_amount,
            sgst_amount, round_off, total_amount, notes, idempotency_key
          ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          billNumber,
          customer_id || null,
          customer_name || null,
          payment_mode || 'cash',
          payment_ref || null,
          summary.subtotal,
          summary.cgstAmount,
          summary.sgstAmount,
          summary.roundOff,
          summary.totalAmount,
          notes || null,
          key
        );

        billId = Number(info.lastInsertRowid);
      }

      const insertItem = db.prepare(`
        INSERT INTO bill_items (
          bill_id, product_id, product_name, sku, unit, hsn_code,
          qty, unit_price, gst_slab, taxable_value, cgst_rate,
          cgst_amount, sgst_rate, sgst_amount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of summary.items) {
        insertItem.run(
          billId,
          item.product_id,
          item.product_name,
          item.sku,
          item.unit,
          item.hsn_code,
          item.qty,
          item.unit_price,
          item.gst_slab,
          item.taxableValue,
          item.cgstRate,
          item.cgstAmount,
          item.sgstRate,
          item.sgstAmount,
          item.lineTotal
        );
      }

      const updatedBill = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(billId);
      const updatedItems = db.prepare(`SELECT * FROM bill_items WHERE bill_id = ?`).all(billId);
      return { ...updatedBill, items: updatedItems };
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Finalize Bill - STRICT ATOMIC TRANSACTION WITH IDEMPOTENCY KEY GUARD
router.post('/:id/finalize', authenticate, (req, res) => {
  const { id } = req.params;
  const {
    payment_mode,
    payment_ref,
    customer_id,
    customer_name,
    allow_below_cost,
    idempotency_key
  } = req.body;

  try {
    const finalizedBill = runInTransaction(() => {
      // Check idempotency by key first
      if (idempotency_key) {
        const alreadyFinalizedByKey = db.prepare(`SELECT * FROM bills WHERE idempotency_key = ? AND status = 'finalized'`).get(idempotency_key);
        if (alreadyFinalizedByKey) {
          const items = db.prepare(`SELECT * FROM bill_items WHERE bill_id = ?`).all(alreadyFinalizedByKey.id);
          return {
            idempotent: true,
            message: 'Bill was already finalized with this idempotency key',
            bill: { ...alreadyFinalizedByKey, items }
          };
        }
      }

      // Fetch bill by id and check status
      const bill = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(id);
      if (!bill) {
        throw new Error('Bill not found');
      }

      if (bill.status === 'finalized') {
        const items = db.prepare(`SELECT * FROM bill_items WHERE bill_id = ?`).all(bill.id);
        return {
          idempotent: true,
          message: 'Bill was already finalized',
          bill: { ...bill, items }
        };
      }

      const items = db.prepare(`SELECT * FROM bill_items WHERE bill_id = ?`).all(id);
      if (items.length === 0) {
        throw new Error('Cannot finalize an empty bill');
      }

      const activePaymentMode = payment_mode || bill.payment_mode || 'cash';
      const activeCustomerId = customer_id !== undefined ? customer_id : bill.customer_id;
      const activeCustomerName = customer_name || bill.customer_name;

      if (activePaymentMode === 'khata' && !activeCustomerId) {
        throw new Error('Khata / Credit purchase requires selecting an existing customer');
      }

      // Validate all items against stock and cost price
      for (const item of items) {
        const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(item.product_id);
        if (!product) {
          throw new Error(`Product "${item.product_name}" no longer exists`);
        }

        // Below-cost guardrail
        if (Number(item.unit_price) < Number(product.cost_price) && !allow_below_cost) {
          throw new Error(
            `Selling below cost price is blocked for "${product.name}". ` +
            `Selling Price: ₹${item.unit_price}, Cost Price: ₹${product.cost_price}. ` +
            `Enable cost override to proceed.`
          );
        }

        // Stock oversell guardrail
        if (Number(product.stock_qty) < Number(item.qty)) {
          throw new Error(
            `Insufficient stock for "${product.name}". ` +
            `Requested: ${item.qty} ${item.unit}, Available in Stock: ${product.stock_qty} ${item.unit}. ` +
            `Sale blocked to prevent negative inventory.`
          );
        }
      }

      // Atomically decrement stock and record stock movements
      const updateStock = db.prepare(`
        UPDATE products
        SET stock_qty = stock_qty - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const recordStockMove = db.prepare(`
        INSERT INTO stock_movements (product_id, type, qty, cost_price, ref_bill_id, notes)
        VALUES (?, 'out', ?, ?, ?, ?)
      `);

      for (const item of items) {
        const product = db.prepare(`SELECT cost_price FROM products WHERE id = ?`).get(item.product_id);
        updateStock.run(item.qty, item.product_id);

        // FEFO (First-Expired, First-Out) batch allocation
        let batchNote = '';
        try {
          const batches = db.prepare(`
            SELECT id, batch_number, expiry_date, stock_qty
            FROM product_batches
            WHERE product_id = ? AND stock_qty > 0
            ORDER BY expiry_date ASC, id ASC
          `).all(item.product_id);

          let remainingToDeduct = Number(item.qty);
          const deductedBatches = [];

          for (const batch of batches) {
            if (remainingToDeduct <= 0) break;
            const deductFromBatch = Math.min(Number(batch.stock_qty), remainingToDeduct);
            db.prepare(`
              UPDATE product_batches
              SET stock_qty = stock_qty - ?
              WHERE id = ?
            `).run(deductFromBatch, batch.id);

            deductedBatches.push(`${batch.batch_number} (-${deductFromBatch})`);
            remainingToDeduct -= deductFromBatch;
          }

          if (deductedBatches.length > 0) {
            batchNote = ` [FEFO: ${deductedBatches.join(', ')}]`;
          }
        } catch (_) {}

        recordStockMove.run(
          item.product_id,
          item.qty,
          product ? product.cost_price : 0,
          bill.id,
          `Sold in Bill #${bill.bill_number}${batchNote}`
        );
      }

      // Handle Khata credit if payment mode is 'khata'
      if (activePaymentMode === 'khata') {
        const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(activeCustomerId);
        if (!customer) {
          throw new Error(`Customer ID ${activeCustomerId} not found for Khata recording`);
        }

        const newBalance = Number(customer.khata_balance) + Number(bill.total_amount);
        db.prepare(`
          UPDATE customers
          SET khata_balance = ?
          WHERE id = ?
        `).run(newBalance, activeCustomerId);

        db.prepare(`
          INSERT INTO khata_transactions (customer_id, type, amount, bill_id, balance_after, notes)
          VALUES (?, 'credit', ?, ?, ?, ?)
        `).run(
          activeCustomerId,
          bill.total_amount,
          bill.id,
          newBalance,
          `Credit purchase on Bill #${bill.bill_number}`
        );
      }

      // Finalize the bill and store idempotency_key
      const keyToSave = idempotency_key || bill.idempotency_key || crypto.randomUUID();
      db.prepare(`
        UPDATE bills
        SET status = 'finalized',
            finalized_at = CURRENT_TIMESTAMP,
            payment_mode = ?,
            payment_ref = ?,
            customer_id = ?,
            customer_name = ?,
            idempotency_key = ?
        WHERE id = ?
      `).run(
        activePaymentMode,
        payment_ref || bill.payment_ref,
        activeCustomerId || null,
        activeCustomerName || null,
        keyToSave,
        bill.id
      );

      const finalized = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(bill.id);
      const finalizedItems = db.prepare(`SELECT * FROM bill_items WHERE bill_id = ?`).all(bill.id);
      return { ...finalized, items: finalizedItems };
    });

    res.json(finalizedBill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel / delete a draft bill
router.delete('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const bill = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(id);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });
  if (bill.status === 'finalized') {
    return res.status(400).json({ error: 'Cannot delete a finalized invoice' });
  }

  runInTransaction(() => {
    db.prepare(`DELETE FROM bill_items WHERE bill_id = ?`).run(id);
    db.prepare(`DELETE FROM bills WHERE id = ?`).run(id);
  });

  res.json({ message: 'Draft bill discarded successfully' });
});

export default router;
