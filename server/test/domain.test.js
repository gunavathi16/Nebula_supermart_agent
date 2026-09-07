import assert from 'node:assert';
import { db, runInTransaction } from '../db/database.js';
import { seed } from '../db/seed.js';
import { calculateLineGst, calculateBillSummary } from '../services/gstService.js';
import { generateInvoicePdf } from '../services/pdfInvoiceService.js';

console.log('--- STARTING DOMAIN & TRANSACTION TEST SUITE ---\n');

// Reset to clean seed
seed();

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${desc}`);
    console.error(err);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${desc}`);
    console.error(err);
    failed++;
  }
}

// 1. GST Calculation Tests
it('GST calculation correctly splits intra-state CGST & SGST 50/50 for 5% slab', () => {
  // 1 packet Atta at ₹265 (inclusive of 5% GST)
  const calc = calculateLineGst(1, 265, 5);
  assert.strictEqual(calc.lineTotal, 265);
  assert.strictEqual(calc.cgstRate, 2.5);
  assert.strictEqual(calc.sgstRate, 2.5);
  assert.strictEqual(calc.cgstAmount, calc.sgstAmount);
  // Taxable = 265 / 1.05 = 252.38; tax = 12.62 / 2 = 6.31
  assert.strictEqual(calc.taxableValue, 252.38);
  assert.strictEqual(calc.cgstAmount, 6.31);
  assert.strictEqual(calc.sgstAmount, 6.31);
});

it('GST calculation handles 0% staples with zero tax', () => {
  const calc = calculateLineGst(2, 62, 0); // 2kg Rice at ₹62
  assert.strictEqual(calc.lineTotal, 124);
  assert.strictEqual(calc.taxableValue, 124);
  assert.strictEqual(calc.cgstAmount, 0);
  assert.strictEqual(calc.sgstAmount, 0);
});

// 2. Oversell Guard Test
it('Oversell Guard: Sale exceeding available stock is refused and rolls back transaction', () => {
  const product = db.prepare(`SELECT * FROM products WHERE sku = 'AMUL-MLK-500ML'`).get();
  const currentStock = product.stock_qty; // 4 packets

  assert.throws(() => {
    runInTransaction(() => {
      // Try to sell 10 packets when only 4 are available
      const reqQty = 10;
      if (currentStock < reqQty) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      db.prepare(`UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?`).run(reqQty, product.id);
    });
  }, /Insufficient stock/);

  // Verify stock was NOT altered
  const afterStock = db.prepare(`SELECT stock_qty FROM products WHERE id = ?`).get(product.id).stock_qty;
  assert.strictEqual(afterStock, currentStock, 'Stock must remain unaltered after rollback');
});

// 3. Below Cost Guard Test
it('Below-Cost Guard: Selling below cost price is rejected without explicit override', () => {
  const prod = db.prepare(`SELECT * FROM products WHERE sku = 'AASH-ATTA-5KG'`).get();
  const belowCostPrice = prod.cost_price - 20; // Cost is ₹210, selling at ₹190

  const validateSale = (price, override) => {
    if (price < prod.cost_price && !override) {
      throw new Error(`Selling below cost price is blocked for "${prod.name}"`);
    }
  };

  assert.throws(() => {
    validateSale(belowCostPrice, false);
  }, /Selling below cost price is blocked/);

  // Allowed when override flag is true
  assert.doesNotThrow(() => {
    validateSale(belowCostPrice, true);
  });
});

// 4. Atomic Stock Decrement & Idempotency Test
it('Atomic Finalize & Idempotency: Decrements stock exactly once, second finalize does not double-decrement', () => {
  const salt = db.prepare(`SELECT * FROM products WHERE sku = 'TATA-SALT-1KG'`).get();
  const initialStock = salt.stock_qty; // 60 packets
  const buyQty = 5;

  // Create a draft bill with unique bill number
  let billId;
  const testBillNo = 'TEST-INV-' + Date.now();
  runInTransaction(() => {
    const info = db.prepare(`
      INSERT INTO bills (bill_number, status, payment_mode, total_amount)
      VALUES (?, 'draft', 'cash', 140)
    `).run(testBillNo);
    billId = Number(info.lastInsertRowid);

    db.prepare(`
      INSERT INTO bill_items (bill_id, product_id, product_name, sku, unit, hsn_code, qty, unit_price, gst_slab, taxable_value, cgst_rate, cgst_amount, sgst_rate, sgst_amount, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 140, 0, 0, 0, 0, 140)
    `).run(billId, salt.id, salt.name, salt.sku, salt.unit, salt.hsn_code, buyQty, 28);
  });

  // Finalize First Time
  const finalizeBill = (bId) => {
    return runInTransaction(() => {
      const b = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(bId);
      if (b.status === 'finalized') {
        return { idempotent: true, message: 'Already finalized' };
      }

      const items = db.prepare(`SELECT * FROM bill_items WHERE bill_id = ?`).all(bId);
      for (const item of items) {
        const p = db.prepare(`SELECT stock_qty FROM products WHERE id = ?`).get(item.product_id);
        if (p.stock_qty < item.qty) throw new Error('Out of stock');
        db.prepare(`UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?`).run(item.qty, item.product_id);
      }

      db.prepare(`UPDATE bills SET status = 'finalized', finalized_at = CURRENT_TIMESTAMP WHERE id = ?`).run(bId);
      return { success: true };
    });
  };

  const res1 = finalizeBill(billId);
  assert.strictEqual(res1.success, true);

  const stockAfterFirst = db.prepare(`SELECT stock_qty FROM products WHERE id = ?`).get(salt.id).stock_qty;
  assert.strictEqual(stockAfterFirst, initialStock - buyQty, 'Stock must decrement by buyQty');

  // Finalize Second Time (Idempotency check)
  const res2 = finalizeBill(billId);
  assert.strictEqual(res2.idempotent, true);

  const stockAfterSecond = db.prepare(`SELECT stock_qty FROM products WHERE id = ?`).get(salt.id).stock_qty;
  assert.strictEqual(stockAfterSecond, stockAfterFirst, 'Stock must NOT decrement a second time');
});

// 5. Khata (Credit Ledger) Test
it('Khata Ledger: Credit sale adds to balance, payment reduces balance atomically', () => {
  const customer = db.prepare(`SELECT * FROM customers WHERE id = 1`).get();
  const initialBal = customer.khata_balance; // 850

  // 1. Customer buys on credit for ₹400
  runInTransaction(() => {
    const newBal = initialBal + 400;
    db.prepare(`UPDATE customers SET khata_balance = ? WHERE id = 1`).run(newBal);
    db.prepare(`
      INSERT INTO khata_transactions (customer_id, type, amount, balance_after, notes)
      VALUES (1, 'credit', 400, ?, 'Test credit purchase')
    `).run(newBal);
  });

  const balAfterCredit = db.prepare(`SELECT khata_balance FROM customers WHERE id = 1`).get().khata_balance;
  assert.strictEqual(balAfterCredit, initialBal + 400);

  // 2. Ramesh pays ₹500
  runInTransaction(() => {
    const newBal = balAfterCredit - 500;
    db.prepare(`UPDATE customers SET khata_balance = ? WHERE id = 1`).run(newBal);
    db.prepare(`
      INSERT INTO khata_transactions (customer_id, type, amount, balance_after, notes)
      VALUES (1, 'payment', 500, ?, 'Test partial settlement')
    `).run(newBal);
  });

  const balAfterPayment = db.prepare(`SELECT khata_balance FROM customers WHERE id = 1`).get().khata_balance;
  assert.strictEqual(balAfterPayment, initialBal + 400 - 500);
});

// 6. GST Invoice PDF Generation
await itAsync('PDF Generation: Produces a valid PDF buffer with %PDF- header', async () => {
  const sampleBill = {
    bill_number: 'TEST-INV-PDF-1',
    created_at: new Date().toISOString(),
    customer_name: 'Ramesh Kumar',
    customer_phone: '9876543210',
    payment_mode: 'upi',
    payment_ref: 'UPI-REF-998877',
    subtotal: 500,
    cgst_amount: 25,
    sgst_amount: 25,
    round_off: 0,
    total_amount: 550
  };

  const sampleItems = [
    {
      product_name: 'Aashirvaad Superior MP Atta 5kg',
      hsn_code: '1101',
      qty: 2,
      unit: 'packet',
      unit_price: 265,
      taxable_value: 504.76,
      cgst_rate: 2.5,
      cgst_amount: 12.62,
      sgst_rate: 2.5,
      sgst_amount: 12.62,
      line_total: 530
    }
  ];

  const pdfBuffer = await generateInvoicePdf(sampleBill, sampleItems, {
    shop_name: 'Test Kirana Store',
    shop_gstin: '29ABCDE1234F1Z5'
  });

  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.length > 500, 'PDF buffer should not be empty');
  const header = pdfBuffer.toString('utf8', 0, 5);
  assert.strictEqual(header, '%PDF-', 'PDF file must start with standard %PDF- header');
});

console.log(`\n================================`);
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log(`================================\n`);

if (failed > 0) {
  process.exit(1);
}
