import { Router } from 'express';
import { db } from '../db/database.js';

const router = Router();

// Dashboard summary stats
router.get('/dashboard', (req, res) => {
  // Today's sales & count
  const todayStats = db.prepare(`
    SELECT
      COUNT(id) as total_bills,
      COALESCE(SUM(total_amount), 0) as total_sales,
      COALESCE(SUM(subtotal), 0) as total_taxable,
      COALESCE(SUM(cgst_amount), 0) as total_cgst,
      COALESCE(SUM(sgst_amount), 0) as total_sgst
    FROM bills
    WHERE status = 'finalized' AND date(finalized_at) = date('now')
  `).get();

  // Today's sales by payment mode
  const paymentSplit = db.prepare(`
    SELECT payment_mode, COALESCE(SUM(total_amount), 0) as amount, COUNT(id) as count
    FROM bills
    WHERE status = 'finalized' AND date(finalized_at) = date('now')
    GROUP BY payment_mode
  `).all();

  // Total Khata outstanding
  const khataStats = db.prepare(`
    SELECT
      COALESCE(SUM(khata_balance), 0) as total_outstanding,
      COUNT(CASE WHEN khata_balance > 0 THEN 1 END) as customers_with_dues
    FROM customers
  `).get();

  // Low stock items count & top 5 low stock products
  const lowStockProducts = db.prepare(`
    SELECT id, name, sku, unit, stock_qty, reorder_level
    FROM products
    WHERE stock_qty <= reorder_level
    ORDER BY (stock_qty / reorder_level) ASC
    LIMIT 6
  `).all();

  const lowStockCount = db.prepare(`
    SELECT COUNT(id) as count FROM products WHERE stock_qty <= reorder_level
  `).get().count;

  // Recent finalized bills
  const recentBills = db.prepare(`
    SELECT id, bill_number, customer_name, payment_mode, total_amount, finalized_at
    FROM bills
    WHERE status = 'finalized'
    ORDER BY finalized_at DESC
    LIMIT 6
  `).all();

  res.json({
    today: todayStats,
    paymentSplit,
    khata: khataStats,
    lowStock: {
      count: lowStockCount,
      items: lowStockProducts
    },
    recentBills
  });
});

// Analytics: Range based reports, Top items, GST by slab
router.get('/analytics', (req, res) => {
  const { range = '7d' } = req.query;

  let days = 7;
  if (range === 'today') days = 1;
  else if (range === '30d') days = 30;
  else if (range === '90d') days = 90;

  // Daily sales trend for Recharts
  const salesTrend = db.prepare(`
    SELECT
      date(finalized_at) as sale_date,
      COUNT(id) as bill_count,
      ROUND(COALESCE(SUM(total_amount), 0), 2) as total_sales,
      ROUND(COALESCE(SUM(cgst_amount + sgst_amount), 0), 2) as total_gst
    FROM bills
    WHERE status = 'finalized' AND finalized_at >= datetime('now', '-' || ? || ' days')
    GROUP BY date(finalized_at)
    ORDER BY date(finalized_at) ASC
  `).all(days);

  // Top selling items
  const topProducts = db.prepare(`
    SELECT
      bi.product_id,
      bi.product_name,
      bi.unit,
      ROUND(SUM(bi.qty), 2) as total_qty_sold,
      ROUND(SUM(bi.line_total), 2) as total_revenue
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE b.status = 'finalized' AND b.finalized_at >= datetime('now', '-' || ? || ' days')
    GROUP BY bi.product_id, bi.product_name, bi.unit
    ORDER BY total_revenue DESC
    LIMIT 10
  `).all(days);

  // GST collection broken down by slab
  const gstBreakup = db.prepare(`
    SELECT
      bi.gst_slab,
      ROUND(SUM(bi.taxable_value), 2) as taxable_value,
      ROUND(SUM(bi.cgst_amount), 2) as cgst_collected,
      ROUND(SUM(bi.sgst_amount), 2) as sgst_collected,
      ROUND(SUM(bi.cgst_amount + bi.sgst_amount), 2) as total_gst,
      ROUND(SUM(bi.line_total), 2) as gross_sales
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE b.status = 'finalized' AND b.finalized_at >= datetime('now', '-' || ? || ' days')
    GROUP BY bi.gst_slab
    ORDER BY bi.gst_slab ASC
  `).all(days);

  // Stock health overview
  const stockHealth = db.prepare(`
    SELECT
      COUNT(id) as total_skus,
      SUM(CASE WHEN stock_qty = 0 THEN 1 ELSE 0 END) as out_of_stock,
      SUM(CASE WHEN stock_qty > 0 AND stock_qty <= reorder_level THEN 1 ELSE 0 END) as low_stock,
      SUM(CASE WHEN stock_qty > reorder_level THEN 1 ELSE 0 END) as healthy_stock,
      ROUND(SUM(stock_qty * cost_price), 2) as total_inventory_cost_value,
      ROUND(SUM(stock_qty * sell_price), 2) as total_inventory_retail_value
    FROM products
  `).get();

  res.json({
    range,
    salesTrend,
    topProducts,
    gstBreakup,
    stockHealth
  });
});

// Download Business Analysis Presentation Deck (PPTX)
router.get('/deck', async (req, res) => {
  const { range = '7d' } = req.query;
  let days = 7;
  if (range === 'today') days = 1;
  else if (range === '30d') days = 30;
  else if (range === '90d') days = 90;

  const salesTrend = db.prepare(`
    SELECT
      date(finalized_at) as sale_date,
      COUNT(id) as bill_count,
      ROUND(COALESCE(SUM(total_amount), 0), 2) as total_sales,
      ROUND(COALESCE(SUM(cgst_amount + sgst_amount), 0), 2) as total_gst
    FROM bills
    WHERE status = 'finalized' AND finalized_at >= datetime('now', '-' || ? || ' days')
    GROUP BY date(finalized_at)
    ORDER BY date(finalized_at) ASC
  `).all(days);

  const topProducts = db.prepare(`
    SELECT
      bi.product_id,
      bi.product_name,
      bi.unit,
      ROUND(SUM(bi.qty), 2) as total_qty_sold,
      ROUND(SUM(bi.line_total), 2) as total_revenue
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE b.status = 'finalized' AND b.finalized_at >= datetime('now', '-' || ? || ' days')
    GROUP BY bi.product_id, bi.product_name, bi.unit
    ORDER BY total_revenue DESC
    LIMIT 10
  `).all(days);

  const gstBreakup = db.prepare(`
    SELECT
      bi.gst_slab,
      ROUND(SUM(bi.taxable_value), 2) as taxable_value,
      ROUND(SUM(bi.cgst_amount), 2) as cgst_collected,
      ROUND(SUM(bi.sgst_amount), 2) as sgst_collected,
      ROUND(SUM(bi.cgst_amount + bi.sgst_amount), 2) as total_gst,
      ROUND(SUM(bi.line_total), 2) as gross_sales
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE b.status = 'finalized' AND b.finalized_at >= datetime('now', '-' || ? || ' days')
    GROUP BY bi.gst_slab
    ORDER BY bi.gst_slab ASC
  `).all(days);

  const stockHealth = db.prepare(`
    SELECT
      COUNT(id) as total_skus,
      SUM(CASE WHEN stock_qty = 0 THEN 1 ELSE 0 END) as out_of_stock,
      SUM(CASE WHEN stock_qty > 0 AND stock_qty <= reorder_level THEN 1 ELSE 0 END) as low_stock,
      SUM(CASE WHEN stock_qty > reorder_level THEN 1 ELSE 0 END) as healthy_stock,
      ROUND(SUM(stock_qty * cost_price), 2) as total_inventory_cost_value,
      ROUND(SUM(stock_qty * sell_price), 2) as total_inventory_retail_value
    FROM products
  `).get();

  const settingsRows = db.prepare(`SELECT key, value FROM settings`).all();
  const settings = {};
  settingsRows.forEach(r => { settings[r.key] = r.value; });

  try {
    const { generateAnalysisDeck } = await import('../services/deckService.js');
    const buffer = await generateAnalysisDeck({ salesTrend, topProducts, gstBreakup, stockHealth }, settings);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="Store_Analysis_Deck_${range}.pptx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: `Failed to generate PPTX deck: ${err.message}` });
  }
});

export default router;
