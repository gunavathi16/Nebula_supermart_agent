-- Schema for Indian Kirana Store Management System
-- SQLite with WAL mode, foreign keys, and strict data integrity

PRAGMA foreign_keys = ON;

-- Users (Owner / Staff)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff', -- 'owner' or 'staff'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products Catalog
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- 'staples', 'packaged', 'dairy', 'beverages', 'personal_care', 'household'
  unit TEXT NOT NULL, -- 'kg', 'g', 'litre', 'ml', 'packet', 'dozen', 'piece'
  is_loose INTEGER NOT NULL DEFAULT 0, -- 1 for sold by weight/loose, 0 for packaged
  cost_price REAL NOT NULL CHECK(cost_price >= 0),
  sell_price REAL NOT NULL CHECK(sell_price >= 0),
  gst_slab REAL NOT NULL CHECK(gst_slab IN (0, 5, 12, 18, 28)), -- standard Indian GST slabs
  hsn_code TEXT NOT NULL,
  stock_qty REAL NOT NULL DEFAULT 0 CHECK(stock_qty >= 0), -- stock can never go negative
  reorder_level REAL NOT NULL DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers (Khata / Credit Account)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  address TEXT,
  khata_balance REAL NOT NULL DEFAULT 0, -- positive means customer owes store money
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bills (Invoices)
CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'finalized', 'cancelled')),
  payment_mode TEXT NOT NULL DEFAULT 'cash' CHECK(payment_mode IN ('cash', 'upi', 'card', 'khata')),
  payment_ref TEXT, -- UPI UTR or card last 4 digits / transaction ID
  subtotal REAL NOT NULL DEFAULT 0, -- total taxable value
  cgst_amount REAL NOT NULL DEFAULT 0,
  sgst_amount REAL NOT NULL DEFAULT 0,
  round_off REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  idempotency_key TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finalized_at DATETIME
);

-- Bill Line Items
CREATE TABLE IF NOT EXISTS bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  unit TEXT NOT NULL,
  hsn_code TEXT NOT NULL,
  qty REAL NOT NULL CHECK(qty > 0),
  unit_price REAL NOT NULL CHECK(unit_price >= 0),
  gst_slab REAL NOT NULL,
  taxable_value REAL NOT NULL,
  cgst_rate REAL NOT NULL, -- e.g. 2.5 for 5% slab
  cgst_amount REAL NOT NULL,
  sgst_rate REAL NOT NULL, -- e.g. 2.5 for 5% slab
  sgst_amount REAL NOT NULL,
  line_total REAL NOT NULL
);

-- Khata Transactions (Credit purchases and Cash/UPI settlements)
CREATE TABLE IF NOT EXISTS khata_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('credit', 'payment')), -- 'credit' = customer purchased on credit (+ balance), 'payment' = customer paid (- balance)
  amount REAL NOT NULL CHECK(amount > 0),
  bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
  payment_mode TEXT DEFAULT 'cash', -- 'cash', 'upi', 'card' for payments
  payment_ref TEXT,
  balance_after REAL NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stock Movements (Audit trail for inventory changes)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('in', 'out', 'adjustment')), -- 'in' = received, 'out' = sold, 'adjustment' = manual audit
  qty REAL NOT NULL, -- positive quantity moved
  cost_price REAL,
  ref_bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shop Settings & Preferences
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product Batches & Expiry (FEFO tracking)
CREATE TABLE IF NOT EXISTS product_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  mfg_date DATE,
  expiry_date DATE NOT NULL,
  stock_qty REAL NOT NULL DEFAULT 0 CHECK(stock_qty >= 0),
  cost_price REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batches_expiry ON product_batches(product_id, expiry_date);

