import assert from 'node:assert';
import { createAgentTools } from '../tools.js';
import { sessionStore } from '../session.js';

console.log('--- STARTING TELEGRAM OPS AGENT TOOL VERIFICATION TESTS ---\n');

async function runAgentTests() {
  const testChatId = 'telegram-test-chat-101';
  const contextBag = { documents: [] };
  const tools = createAgentTools(testChatId, contextBag);

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

  // 1. Tool: search_products
  let foundAttaId;
  let foundMaggiId;
  let foundSugarId;

  await test('Tool search_products finds real Kirana SKUs', async () => {
    const res = await tools.search_products.execute({ query: 'atta' });
    assert.ok(res.count > 0, 'Should find at least 1 atta product');
    const atta = res.products.find(p => p.sku === 'AASH-ATTA-5KG');
    assert.ok(atta, 'Should match Aashirvaad Atta');
    assert.strictEqual(atta.gst_slab, 5);
    foundAttaId = atta.id;

    const maggiRes = await tools.search_products.execute({ query: 'maggi' });
    foundMaggiId = maggiRes.products[0].id;

    const sugarRes = await tools.search_products.execute({ query: 'sugar' });
    foundSugarId = sugarRes.products[0].id;
  });

  // 2. Tool: receive_stock
  await test('Tool receive_stock atomically increments stock via backend', async () => {
    const before = await tools.get_product.execute({ product_id: foundMaggiId });
    const initialQty = before.stock_qty;

    const res = await tools.receive_stock.execute({
      product_id: foundMaggiId,
      qty: 25,
      cost_price: 12.0,
      sell_price: 14.5,
      notes: 'Vendor delivery test'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.new_stock, initialQty + 25);
  });

  // 3. Tool: start_draft_bill, add_bill_item, preview_bill
  let createdBillId;
  await test('Tools start_draft_bill and add_bill_item construct multi-item bill', async () => {
    const draft = await tools.start_draft_bill.execute({
      customer_name: 'Telegram Walkin',
      payment_mode: 'upi'
    });
    assert.ok(draft.bill_id);
    createdBillId = draft.bill_id;

    // Add 2kg loose sugar
    const billAfterSugar = await tools.add_bill_item.execute({
      bill_id: createdBillId,
      product_id: foundSugarId,
      qty: 2.0
    });
    assert.strictEqual(billAfterSugar.items_count, 1);

    // Add 4 packets Maggi
    const billAfterMaggi = await tools.add_bill_item.execute({
      bill_id: createdBillId,
      product_id: foundMaggiId,
      qty: 4
    });
    assert.strictEqual(billAfterMaggi.items_count, 2);
    assert.ok(billAfterMaggi.total > 0);

    // Preview
    const preview = await tools.preview_bill.execute({ bill_id: createdBillId });
    assert.strictEqual(preview.items.length, 2);
    assert.strictEqual(preview.status, 'draft');
  });

  // 4. Tool: remove_bill_item ("drop the sugar")
  await test('Tool remove_bill_item removes item from active draft', async () => {
    const res = await tools.remove_bill_item.execute({
      bill_id: createdBillId,
      product_id: foundSugarId
    });
    assert.strictEqual(res.items.length, 1);
    assert.strictEqual(res.items[0].name.includes('Maggi'), true);
  });

  // 5. Tool: finalize_bill (Atomically decrements stock and clears draft session)
  await test('Tool finalize_bill finalizes sale and decrements stock', async () => {
    const maggiBefore = await tools.get_product.execute({ product_id: foundMaggiId });
    const stockBefore = maggiBefore.stock_qty;

    const res = await tools.finalize_bill.execute({
      bill_id: createdBillId,
      payment_mode: 'upi',
      payment_ref: 'UPI-TEST-112233'
    });

    assert.strictEqual(res.finalized, true);
    assert.strictEqual(res.payment_mode, 'upi');

    const maggiAfter = await tools.get_product.execute({ product_id: foundMaggiId });
    assert.strictEqual(maggiAfter.stock_qty, stockBefore - 4, 'Maggi stock must decrement by 4');

    // Verify session draft is cleared
    const session = sessionStore.getSession(testChatId);
    assert.strictEqual(session.currentDraftBillId, null);
  });

  // 6. Tool: Oversell guardrail propagation
  await test('Oversell guard: selling more than stock is blocked and errors propagate', async () => {
    const draft = await tools.start_draft_bill.execute({});
    // Try to add 10,000 packets of Maggi
    await tools.add_bill_item.execute({
      bill_id: draft.bill_id,
      product_id: foundMaggiId,
      qty: 10000
    });

    // Finalizing must fail at API layer
    await assert.rejects(async () => {
      await tools.finalize_bill.execute({ bill_id: draft.bill_id });
    }, /Insufficient stock/);
  });

  // 7. Tool: get_customer_balance & record_khata_payment
  await test('Tools get_customer_balance and record_khata_payment update credit ledger', async () => {
    const balRes = await tools.get_customer_balance.execute({ search: 'Ramesh' });
    assert.strictEqual(balRes.found, true);
    const ramesh = balRes.customers[0];
    const initialBal = ramesh.khata_balance;

    const payRes = await tools.record_khata_payment.execute({
      customer_id: ramesh.id,
      amount: 100,
      payment_mode: 'upi',
      notes: 'Telegram bot test payment'
    });

    assert.strictEqual(payRes.success, true);
    assert.strictEqual(payRes.new_balance, initialBal - 100);
  });

  // 8. Tool: get_daily_close
  await test('Tool get_daily_close retrieves today sales and tax summary', async () => {
    const close = await tools.get_daily_close.execute({});
    assert.ok(close.today_sales !== undefined);
    assert.ok(Array.isArray(close.payment_breakdown));
  });

  // 9. Tool: get_invoice_pdf (Form GST INV-1 PDF generation)
  await test('Tool get_invoice_pdf generates PDF document and registers in contextBag', async () => {
    const res = await tools.get_invoice_pdf.execute({ bill_id: createdBillId });
    assert.strictEqual(res.success, true);
    assert.ok(contextBag.documents.length >= 1);
    const doc = contextBag.documents.find(d => d.type === 'pdf');
    assert.ok(doc);
    assert.strictEqual(doc.buffer.toString('utf8', 0, 5), '%PDF-');
  });

  // 10. Tool: get_analysis_deck (PowerPoint PPTX presentation generation)
  await test('Tool get_analysis_deck generates PPTX presentation deck with charts', async () => {
    const res = await tools.get_analysis_deck.execute({ date_range: '7d' });
    assert.strictEqual(res.success, true);
    const pptxDoc = contextBag.documents.find(d => d.type === 'pptx');
    assert.ok(pptxDoc);
    assert.ok(pptxDoc.buffer.length > 1000);
    // PPTX is a zipped OpenXML container starting with standard zip magic bytes PK\x03\x04
    assert.strictEqual(pptxDoc.buffer.toString('utf8', 0, 2), 'PK');
  });

  // 11. Tool: get_preference and set_preference (Memory across sessions)
  await test('Tools get_preference and set_preference persist settings in store DB', async () => {
    await tools.set_preference.execute({
      key: 'default_brand_atta',
      value: 'Aashirvaad Superior MP Atta 5kg'
    });

    const pref = await tools.get_preference.execute({ key: 'default_brand_atta' });
    assert.strictEqual(pref.value, 'Aashirvaad Superior MP Atta 5kg');
  });

  console.log(`\n================================`);
  console.log(`TOTAL AGENT TOOL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`================================\n`);

  if (failed > 0) process.exit(1);
}

runAgentTests();
