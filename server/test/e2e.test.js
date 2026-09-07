import assert from 'node:assert';

console.log('--- RUNNING FULL-STACK E2E HTTP INTEGRATION TESTS ---\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  // 1. Frontend server test
  await test('Frontend React app is serving on http://localhost:3000', async () => {
    const res = await fetch('http://localhost:3000');
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('<div id="root"></div>'), 'HTML must contain root mounting point');
  });

  // 2. Backend health test
  await test('Backend API health endpoint is online on http://localhost:5000', async () => {
    const res = await fetch('http://localhost:5000/api/health');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'online');
  });

  // 3. Auth login test
  let authToken;
  await test('Auth: Owner login returns valid JWT token', async () => {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'kirana123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token, 'Token must be present');
    assert.strictEqual(data.user.role, 'owner');
    authToken = data.token;
  });

  // 4. Products catalog test
  let products = [];
  await test('Products: Returns all seeded loose and packaged kirana items', async () => {
    const res = await fetch('http://localhost:5000/api/products');
    assert.strictEqual(res.status, 200);
    products = await res.json();
    assert.ok(products.length >= 10, 'Must have at least 10 products');
    
    // Check for loose and packaged
    const loose = products.filter(p => p.is_loose === 1);
    const packaged = products.filter(p => p.is_loose === 0);
    assert.ok(loose.length >= 3, 'Must have loose items (sugar, rice, dal)');
    assert.ok(packaged.length >= 5, 'Must have packaged items');
  });

  // 5. Khata customers test
  let customers = [];
  await test('Khata: Customers list includes initial running balances', async () => {
    const res = await fetch('http://localhost:5000/api/khata/customers');
    assert.strictEqual(res.status, 200);
    customers = await res.json();
    assert.ok(customers.length >= 4);
    const ramesh = customers.find(c => c.name === 'Ramesh Kumar');
    assert.ok(ramesh, 'Ramesh Kumar must exist');
    assert.ok(ramesh.khata_balance > 0, 'Ramesh should have outstanding balance');
  });

  // 6. Complete POS Sale & GST PDF Generation
  let createdBillId;
  await test('POS Billing Flow: Create Draft -> Atomically Finalize -> Decrement Stock -> Generate PDF', async () => {
    const atta = products.find(p => p.sku === 'AASH-ATTA-5KG');
    const sugar = products.find(p => p.sku === 'SUGAR-LOOSE-KG');
    const initialAttaStock = atta.stock_qty;
    const initialSugarStock = sugar.stock_qty;

    // Step A: Save Draft
    const draftRes = await fetch('http://localhost:5000/api/billing/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        customer_id: 1, // Ramesh Kumar
        customer_name: 'Ramesh Kumar',
        payment_mode: 'khata', // Credit purchase
        items: [
          { product_id: atta.id, qty: 1, unit_price: atta.sell_price, gst_slab: atta.gst_slab },
          { product_id: sugar.id, qty: 2.5, unit_price: sugar.sell_price, gst_slab: sugar.gst_slab }
        ]
      })
    });

    assert.strictEqual(draftRes.status, 200);
    const draftData = await draftRes.json();
    createdBillId = draftData.id;
    assert.strictEqual(draftData.status, 'draft');

    // Step B: Finalize Bill
    const finalRes = await fetch(`http://localhost:5000/api/billing/${createdBillId}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        payment_mode: 'khata',
        customer_id: 1,
        customer_name: 'Ramesh Kumar'
      })
    });

    assert.strictEqual(finalRes.status, 200);
    const finalData = await finalRes.json();
    assert.strictEqual(finalData.status, 'finalized');
    assert.ok(finalData.finalized_at);

    // Step C: Verify stock decremented
    const refreshedAtta = await (await fetch(`http://localhost:5000/api/products/${atta.id}`)).json();
    const refreshedSugar = await (await fetch(`http://localhost:5000/api/products/${sugar.id}`)).json();
    assert.strictEqual(refreshedAtta.stock_qty, initialAttaStock - 1, 'Atta stock must decrement by 1');
    assert.strictEqual(refreshedSugar.stock_qty, initialSugarStock - 2.5, 'Sugar stock must decrement by 2.5');

    // Step D: Verify PDF Generation
    const pdfRes = await fetch(`http://localhost:5000/api/invoices/${createdBillId}/pdf`);
    assert.strictEqual(pdfRes.status, 200);
    assert.strictEqual(pdfRes.headers.get('content-type'), 'application/pdf');
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    assert.strictEqual(pdfBuffer.toString('utf8', 0, 5), '%PDF-');
  });

  // 7. Khata payment settlement test
  await test('Khata: Record Payment reduces balance atomically', async () => {
    const custBefore = await (await fetch('http://localhost:5000/api/khata/customers/1')).json();
    const balBefore = custBefore.khata_balance;

    const payRes = await fetch('http://localhost:5000/api/khata/customers/1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        amount: 250,
        payment_mode: 'upi',
        notes: 'GPay payment test'
      })
    });

    assert.strictEqual(payRes.status, 200);
    const payData = await payRes.json();
    assert.strictEqual(payData.customer.khata_balance, balBefore - 250);
  });

  // 8. Analytics reports test
  await test('Reports: Analytics endpoint returns trend, top products, and GST summary', async () => {
    const res = await fetch('http://localhost:5000/api/reports/analytics?range=7d');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.salesTrend));
    assert.ok(Array.isArray(data.topProducts));
    assert.ok(Array.isArray(data.gstBreakup));
    assert.ok(data.stockHealth.total_skus > 0);
  });

  console.log(`\n================================`);
  console.log(`TOTAL E2E TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
