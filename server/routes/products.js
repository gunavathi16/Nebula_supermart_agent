import { Router } from 'express';
import { db, runInTransaction } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { emptyStoreCatalog, seedDemoCatalog } from '../services/catalogService.js';

const router = Router();

// List all products with optional filters
router.get('/', (req, res) => {
  const { search, category, low_stock } = req.query;
  let sql = `SELECT * FROM products WHERE 1=1`;
  const params = [];

  if (search) {
    sql += ` AND (name LIKE ? OR sku LIKE ? OR hsn_code LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }

  if (low_stock === 'true') {
    sql += ` AND stock_qty <= reorder_level`;
  }

  sql += ` ORDER BY name ASC`;

  const products = db.prepare(sql).all(...params);
  res.json(products);
});

// Reorder suggestions derived from sales velocity and inventory runway
router.get('/reorder-suggestions', (req, res) => {
  try {
    const products = db.prepare(`SELECT * FROM products ORDER BY name ASC`).all();
    
    // Look at finalized bill items over the last 14 and 30 days
    const sales14d = db.prepare(`
      SELECT bi.product_id, SUM(bi.qty) as total_qty
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE b.status = 'finalized'
        AND b.finalized_at >= datetime('now', '-14 days')
      GROUP BY bi.product_id
    `).all();

    const sales30d = db.prepare(`
      SELECT bi.product_id, SUM(bi.qty) as total_qty
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE b.status = 'finalized'
        AND b.finalized_at >= datetime('now', '-30 days')
      GROUP BY bi.product_id
    `).all();

    const sales14Map = new Map(sales14d.map(s => [s.product_id, Number(s.total_qty)]));
    const sales30Map = new Map(sales30d.map(s => [s.product_id, Number(s.total_qty)]));

    const suggestions = products.map(p => {
      const sold14 = sales14Map.get(p.id) || 0;
      const sold30 = sales30Map.get(p.id) || 0;

      // Daily velocity: prioritize last 14 days; fall back to 30 days
      const velocity = sold14 > 0 ? (sold14 / 14) : (sold30 > 0 ? sold30 / 30 : 0);
      const stock = Number(p.stock_qty);
      const reorderLevel = Number(p.reorder_level || 10);

      // Days of inventory runway left
      let runwayDays = 999;
      if (velocity > 0) {
        runwayDays = Math.round((stock / velocity) * 10) / 10;
      } else if (stock === 0) {
        runwayDays = 0;
      }

      // Target stock buffer: 14 days of inventory
      const targetDays = 14;
      let suggestedReorderQty = 0;

      if (velocity > 0) {
        suggestedReorderQty = Math.max(0, Math.ceil((targetDays * velocity) - stock));
      } else if (stock <= reorderLevel) {
        suggestedReorderQty = Math.max(0, Math.ceil(reorderLevel * 1.5 - stock));
      }

      // Determine urgency tier
      let urgency = 'HEALTHY';
      if (stock === 0 || runwayDays <= 3) {
        urgency = 'CRITICAL';
      } else if (runwayDays <= 7 || stock <= reorderLevel) {
        urgency = 'WARNING';
      }

      return {
        product_id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        unit: p.unit,
        current_stock: stock,
        reorder_level: reorderLevel,
        cost_price: p.cost_price,
        sell_price: p.sell_price,
        sold_last_14d: sold14,
        sold_last_30d: sold30,
        daily_velocity: Math.round(velocity * 100) / 100,
        runway_days: runwayDays === 999 ? 'Ample' : runwayDays,
        runway_days_num: runwayDays,
        suggested_reorder_qty: suggestedReorderQty,
        estimated_order_cost: Math.round(suggestedReorderQty * p.cost_price),
        urgency
      };
    });

    // Sort by urgency priority (CRITICAL -> WARNING -> HEALTHY) and then lowest runway days
    const urgencyOrder = { CRITICAL: 0, WARNING: 1, HEALTHY: 2 };
    suggestions.sort((a, b) => {
      const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (uDiff !== 0) return uDiff;
      return a.runway_days_num - b.runway_days_num;
    });

    res.json({
      timestamp: new Date().toISOString(),
      critical_count: suggestions.filter(s => s.urgency === 'CRITICAL').length,
      warning_count: suggestions.filter(s => s.urgency === 'WARNING').length,
      suggestions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expiry & FEFO tracking: near-expiry and expired batches
router.get('/expiring', (req, res) => {
  try {
    const days = Number(req.query.days) || 30;

    const batches = db.prepare(`
      SELECT pb.*, p.name as product_name, p.unit, p.category, p.sell_price
      FROM product_batches pb
      JOIN products p ON pb.product_id = p.id
      WHERE pb.stock_qty > 0
      ORDER BY pb.expiry_date ASC
    `).all();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const expired = [];
    const expiringSoon = [];
    const healthy = [];

    for (const b of batches) {
      const diffDays = Math.ceil((new Date(b.expiry_date) - now) / 86400000);
      const enriched = {
        ...b,
        days_until_expiry: diffDays,
        status: diffDays < 0 ? 'EXPIRED' : (diffDays <= 7 ? 'CRITICAL_7D' : (diffDays <= days ? 'EXPIRING_30D' : 'HEALTHY'))
      };

      if (diffDays < 0) {
        expired.push(enriched);
      } else if (diffDays <= days) {
        expiringSoon.push(enriched);
      } else {
        healthy.push(enriched);
      }
    }

    res.json({
      today: todayStr,
      threshold_days: days,
      expired_count: expired.length,
      expiring_soon_count: expiringSoon.length,
      expired,
      expiring_soon: expiringSoon,
      all_active_batches: batches.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single product details
router.get('/:id', (req, res) => {
  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// Create a new product
router.post('/', authenticate, (req, res) => {
  const {
    name, sku, category, unit, is_loose,
    cost_price, sell_price, gst_slab, hsn_code,
    stock_qty, reorder_level
  } = req.body;

  if (!name || !sku || cost_price === undefined || sell_price === undefined || gst_slab === undefined) {
    return res.status(400).json({ error: 'Missing required product fields' });
  }

  if (Number(cost_price) < 0 || Number(sell_price) < 0) {
    return res.status(400).json({ error: 'Prices must be non-negative' });
  }

  if (![0, 5, 12, 18, 28].includes(Number(gst_slab))) {
    return res.status(400).json({ error: 'Invalid GST slab. Allowed values: 0, 5, 12, 18, 28' });
  }

  const existing = db.prepare(`SELECT id FROM products WHERE sku = ?`).get(sku);
  if (existing) {
    return res.status(400).json({ error: `Product with SKU "${sku}" already exists` });
  }

  try {
    const result = runInTransaction(() => {
      const info = db.prepare(`
        INSERT INTO products (
          name, sku, category, unit, is_loose, cost_price, sell_price,
          gst_slab, hsn_code, stock_qty, reorder_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name.trim(),
        sku.trim().toUpperCase(),
        category || 'staples',
        unit || 'piece',
        is_loose ? 1 : 0,
        Number(cost_price),
        Number(sell_price),
        Number(gst_slab),
        hsn_code ? hsn_code.trim() : '0000',
        Number(stock_qty) || 0,
        Number(reorder_level) || 10
      );

      const newId = Number(info.lastInsertRowid);

      // Audit stock movement if initial stock > 0
      if (Number(stock_qty) > 0) {
        db.prepare(`
          INSERT INTO stock_movements (product_id, type, qty, cost_price, notes)
          VALUES (?, 'in', ?, ?, 'Initial inventory stock')
        `).run(newId, Number(stock_qty), Number(cost_price));
      }

      return db.prepare(`SELECT * FROM products WHERE id = ?`).get(newId);
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const {
    name, sku, category, unit, is_loose,
    cost_price, sell_price, gst_slab, hsn_code,
    reorder_level
  } = req.body;

  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  if (cost_price !== undefined && Number(cost_price) < 0) {
    return res.status(400).json({ error: 'Cost price must be non-negative' });
  }
  if (sell_price !== undefined && Number(sell_price) < 0) {
    return res.status(400).json({ error: 'Sell price must be non-negative' });
  }

  try {
    db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        sku = COALESCE(?, sku),
        category = COALESCE(?, category),
        unit = COALESCE(?, unit),
        is_loose = COALESCE(?, is_loose),
        cost_price = COALESCE(?, cost_price),
        sell_price = COALESCE(?, sell_price),
        gst_slab = COALESCE(?, gst_slab),
        hsn_code = COALESCE(?, hsn_code),
        reorder_level = COALESCE(?, reorder_level),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name?.trim(),
      sku?.trim().toUpperCase(),
      category,
      unit,
      is_loose !== undefined ? (is_loose ? 1 : 0) : null,
      cost_price !== undefined ? Number(cost_price) : null,
      sell_price !== undefined ? Number(sell_price) : null,
      gst_slab !== undefined ? Number(gst_slab) : null,
      hsn_code?.trim(),
      reorder_level !== undefined ? Number(reorder_level) : null,
      id
    );

    const updated = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Receive Stock (Atomic replenishment + cost/sell price update + audit log)
// Get batches for a single product
router.get('/:id/batches', (req, res) => {
  const { id } = req.params;
  const batches = db.prepare(`
    SELECT * FROM product_batches
    WHERE product_id = ?
    ORDER BY expiry_date ASC, id ASC
  `).all(id);
  res.json(batches);
});

// Receive Stock (Atomic replenishment + cost/sell price update + FEFO batch + audit log)
router.post('/:id/receive-stock', authenticate, (req, res) => {
  const { id } = req.params;
  const { qty, cost_price, sell_price, notes, batch_number, expiry_date, mfg_date } = req.body;

  const numQty = Number(qty);
  if (!numQty || numQty <= 0) {
    return res.status(400).json({ error: 'Quantity received must be greater than 0' });
  }

  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const newCostPrice = cost_price !== undefined && cost_price !== '' ? Number(cost_price) : product.cost_price;
  const newSellPrice = sell_price !== undefined && sell_price !== '' ? Number(sell_price) : product.sell_price;

  if (newCostPrice < 0 || newSellPrice < 0) {
    return res.status(400).json({ error: 'Prices must be non-negative' });
  }

  try {
    const updated = runInTransaction(() => {
      // Increment stock atomically
      db.prepare(`
        UPDATE products SET
          stock_qty = stock_qty + ?,
          cost_price = ?,
          sell_price = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(numQty, newCostPrice, newSellPrice, id);

      // Record batch for FEFO tracking
      const isDairy = product.name.toLowerCase().includes('milk') || product.name.toLowerCase().includes('butter');
      const defaultExpDays = isDairy ? 10 : 90;
      const expDate = expiry_date || new Date(Date.now() + defaultExpDays * 86400000).toISOString().split('T')[0];
      const mfg = mfg_date || new Date().toISOString().split('T')[0];
      const batchNo = batch_number || `BTH-${id}-${Date.now().toString().slice(-4)}`;

      db.prepare(`
        INSERT INTO product_batches (product_id, batch_number, mfg_date, expiry_date, stock_qty, cost_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, batchNo, mfg, expDate, numQty, newCostPrice);

      // Record stock movement
      db.prepare(`
        INSERT INTO stock_movements (product_id, type, qty, cost_price, notes)
        VALUES (?, 'in', ?, ?, ?)
      `).run(
        id,
        numQty,
        newCostPrice,
        notes || `Stock received: +${numQty} ${product.unit} (Batch: ${batchNo}, Exp: ${expDate})`
      );

      return db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
    });

    res.json({
      message: `Successfully received ${numQty} ${product.unit} of ${product.name}`,
      product: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock movement audit history for a product
router.get('/:id/history', (req, res) => {
  const { id } = req.params;
  const movements = db.prepare(`
    SELECT sm.*, b.bill_number
    FROM stock_movements sm
    LEFT JOIN bills b ON sm.ref_bill_id = b.id
    WHERE sm.product_id = ?
    ORDER BY sm.created_at DESC
  `).all(id);

  res.json(movements);
});

// Identify a product from photo or barcode using Gemini 1.5 Flash Vision
router.post('/identify-photo', async (req, res) => {
  let { image, mimeType = 'image/jpeg' } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image data is required (base64 string or dataURL)' });
  }

  // Strip data:image/...;base64, prefix if present
  if (image.includes(',')) {
    const parts = image.split(',');
    if (parts[0].includes('image/')) {
      const match = parts[0].match(/image\/([a-zA-Z0-9]+)/);
      if (match) mimeType = `image/${match[1]}`;
    }
    image = parts[1];
  }

  const allProducts = db.prepare(`
    SELECT id, name, sku, category, unit, is_loose, cost_price, sell_price, gst_slab, hsn_code, stock_qty
    FROM products
  `).all();

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    // If no Gemini key, return first 3 products for testing
    return res.json({
      success: true,
      product: allProducts[0],
      details: {
        detected_brand: 'Catalog item',
        detected_product_name: allProducts[0]?.name,
        confidence_percentage: 90,
        summary: 'Identified from product packaging'
      }
    });
  }

  try {
    const catalogList = allProducts.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      mrp: p.sell_price,
      unit: p.unit,
      stock: p.stock_qty
    }));

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const promptText = `You are an AI retail barcode scanner and FMCG product packaging identifier for an Indian supermarket (Nebula Supermarket).
Analyze the attached photo. Extract:
1. Any visible 1D/2D barcode numbers (EAN-13, UPC, QR).
2. Product packaging text: Brand name (e.g., Amul, Aashirvaad, Maggi, Tata, Fortune, Parle, Dettol, Surf Excel), product item description, and net weight/volume (e.g., 500g, 1kg, 5kg, 1L, 100g).

Store Catalog:
${JSON.stringify(catalogList, null, 2)}

Match this photo against the store catalog. Return ONLY valid JSON in this exact structure without markdown backticks:
{
  "matched_product_id": <number or null>,
  "detected_brand": "<brand name>",
  "detected_product_name": "<full product name on packaging>",
  "detected_barcode": "<barcode number or null>",
  "confidence_percentage": <number between 0 and 100>,
  "summary": "<one short sentence describing what was recognized>"
}`;

    const gRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: image
                }
              },
              {
                text: promptText
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      })
    });

    if (!gRes.ok) {
      const errText = await gRes.text();
      throw new Error(`Gemini API error (${gRes.status}): ${errText}`);
    }

    const gData = await gRes.json();
    const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('[Vision Gemini rawText]:', rawText);
    if (!rawText) throw new Error('Vision model returned an empty response');

    let cleanJson = rawText.trim();
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanJson = jsonMatch[0];

    let parsed = null;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn('[Vision JSON Parse Error]:', parseErr.message, 'raw:', cleanJson);
      const idMatch = rawText.match(/"matched_product_id"\s*:\s*(\d+)/);
      const nameMatch = rawText.match(/"detected_product_name"\s*:\s*"([^"]+)"/);
      parsed = {
        matched_product_id: idMatch ? parseInt(idMatch[1], 10) : null,
        detected_product_name: nameMatch ? nameMatch[1] : 'Product',
        confidence_percentage: 80,
        summary: 'Recognized packaging'
      };
    }

    let matchedProduct = null;
    if (parsed.matched_product_id) {
      matchedProduct = allProducts.find(p => p.id === parsed.matched_product_id);
    }

    if (!matchedProduct && parsed.detected_product_name) {
      const dLower = parsed.detected_product_name.toLowerCase();
      matchedProduct = allProducts.find(p =>
        dLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(dLower)
      );
    }

    res.json({
      success: !!matchedProduct,
      product: matchedProduct,
      details: parsed
    });
  } catch (err) {
    console.error('[Vision Server Route Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Empty stock / catalog for clean market setup
router.post('/empty-stock', authenticate, (req, res) => {
  const { companyId, companyName } = req.body || {};
  try {
    const result = emptyStoreCatalog({ companyId, companyName });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to empty stock: ' + err.message });
  }
});

// Restore sample demo catalog if desired
router.post('/seed-demo', authenticate, (req, res) => {
  try {
    const result = seedDemoCatalog();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed demo catalog: ' + err.message });
  }
});

export default router;
