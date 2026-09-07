# Nebula Supermarket & Retail — Enterprise POS & Inventory Management System

A production-grade, full-stack Point-of-Sale (POS) and inventory management web application built specifically for Indian Kirana stores and supermarkets. Adheres strictly to Indian retail domain rules, GST intra-state tax splits (CGST + SGST), loose vs. packaged product measurement, atomic database transactions, customer credit ledgers (Khata), and downloadable GST-compliant Tax Invoices.

---

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Recharts (Analytics), Axios
- **Backend**: Node.js, Express (REST API)
- **Database**: SQLite (`node:sqlite` in WAL mode) with ACID-compliant atomic transactions (`runInTransaction`)
- **PDF Generation**: PDFKit (Custom GST Tax Invoice Form matching Indian GST Form INV-1)
- **Authentication**: JWT-based authentication with Owner and Staff roles

---

## Domain Rules & Hard Guarantees Enforced

1. **Currency**:
   - Indian Rupee (`₹` / INR) with standard Indian numbering system (`₹1,25,000.00`).

2. **GST intra-state CGST + SGST Split**:
   - Standard Indian GST slabs: **0%** (fresh produce, loose grains), **5%** (packaged staples, sugar, edible oils), **12%** (butter, ghee, noodles), **18%** (detergents, soaps, biscuits).
   - Intra-state supply rule: Automatically splits tax into 50% CGST and 50% SGST per line item.
   - Retail kirana inclusive MRP pricing: Taxable value and GST breakups are derived backward and rounded accurately to two decimal places.

3. **Atomic Stock Decrement & Oversell Prevention**:
   - Stock can **never** go negative.
   - Validated inside a strict SQLite transaction (`BEGIN IMMEDIATE ... COMMIT / ROLLBACK`). If an item's requested quantity exceeds available stock, the entire sale is rejected at the API/DB layer with a descriptive error.
   - Idempotency guard: Finalizing the same bill twice will not double-decrement stock.

4. **Below-Cost Price Guardrail**:
   - Selling an item below its `cost_price` is blocked by default to protect margins.
   - Requires an explicit toggle (`allow_below_cost: true`) at checkout to override.

5. **Khata (Credit Ledger)**:
   - Full support for customers purchasing on credit.
   - Customers have a running ledger balance.
   - Recording payments ("Ramesh paid ₹300 via UPI") decrements balance atomically and logs an audit transaction.
   - "Settle Balance" action enables one-click full clearance.

6. **Loose vs. Packaged Items**:
   - Supports packaged goods (Aashirvaad Atta 5kg, Tata Salt 1kg, Amul Butter 100g, Maggi 70g, Surf Excel, Fortune Oil 1L).
   - Supports loose goods weighed by kg or gram (Sugar, Sona Masoori Rice, Toor Dal) with fractional decimal quantities (e.g. 1.25 kg, 0.75 kg).

7. **Official GST Tax Invoice (PDF)**:
   - Generates downloadable PDF invoices with shop name, GSTIN, HSN codes, quantity, rate, taxable value, CGST %, CGST amount, SGST %, SGST amount, round-off, grand total, and authorized signature.

---

## Seed Data Catalog

Pre-populated with real Indian Kirana SKUs out of the box:

| SKU | Product Name | Category | Unit | Cost (₹) | MRP (₹) | GST Slab | HSN |
|---|---|---|---|---|---|---|---|
| `AASH-ATTA-5KG` | Aashirvaad Superior MP Atta 5kg | Staples | Packet | ₹210 | ₹265 | 5% | 1101 |
| `TATA-SALT-1KG` | Tata Salt Vacuum Evaporated 1kg | Staples | Packet | ₹22 | ₹28 | 0% | 2501 |
| `AMUL-BTR-100G` | Amul Butter 100g | Dairy | Piece | ₹50 | ₹62 | 12% | 0405 |
| `FORT-OIL-1L` | Fortune Sunlite Sunflower Oil 1L | Staples | Packet | ₹125 | ₹155 | 5% | 1512 |
| `MAGG-NDL-70G` | Maggi 2-Minute Noodles 70g | Packaged | Packet | ₹11.5 | ₹14 | 12% | 1902 |
| `PARL-G-250G` | Parle-G Original Glucose Biscuits 250g | Packaged | Packet | ₹24 | ₹30 | 18% | 1905 |
| `SURF-DET-1KG` | Surf Excel Easy Wash Detergent Powder 1kg | Household | Packet | ₹115 | ₹145 | 18% | 3402 |
| `DETT-SOP-125G` | Dettol Original Bathing Soap 125g | Personal Care | Piece | ₹42 | ₹55 | 18% | 3401 |
| `SUGAR-LOOSE-KG`| Sugar (Madhur Loose) | Staples (Loose) | kg | ₹38 | ₹46 | 5% | 1701 |
| `RICE-SONA-KG` | Sona Masoori Rice (Loose) | Staples (Loose) | kg | ₹48 | ₹62 | 0% | 1006 |
| `DAL-TOOR-KG` | Premium Toor Dal (Loose) | Staples (Loose) | kg | ₹135 | ₹170 | 0% | 0713 |
| `AMUL-MLK-500ML`| Amul Taaza Toned Milk 500ml (Low Stock Alert) | Dairy | Packet | ₹24.5 | ₹27 | 0% | 0401 |

### Preloaded Khata Customers:
- **Ramesh Kumar** (Phone: 9876543210) — Balance: ₹850.00
- **Priya Sharma** (Phone: 9845012345) — Balance: ₹320.00
- **Suresh Patel** (Phone: 9712345678) — Balance: ₹0.00 (Settled)
- **Anita Desai** (Phone: 9900112233) — Balance: ₹1,200.00

---

## Getting Started Locally

### 1. Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v10+

### 2. Install All Dependencies
From the repository root:
```bash
npm run install:all
```
*(Or run `npm install` in root, `server/`, and `client/`)*

### 3. Seed Database & Run Domain Tests
```bash
# Seed initial products, settings, and Khata accounts
npm run seed

# Run automated domain & transaction test suite
npm test
```

### 4. Start Development Server
```bash
npm run dev
```
- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:5000`

---

## Default Login Credentials
- **Store Owner**: `username: admin` / `password: kirana123`
- **Billing Staff**: `username: staff` / `password: staff123`

*(Quick-login buttons are also provided on the login page)*

---

## Application Pages & Workflows

1. **Dashboard** (`/`):
   - Daily sales summary, bill counts, and cash/UPI/card/khata payment breakdown.
   - Low-stock warning widget with one-click restock shortcuts.
   - Total store credit outstanding monitor.
2. **Billing (POS)** (`/pos`):
   - High-speed cashier interface with product search and barcode scanning.
   - Loose weight stepper & fractional weigh-scale inputs (e.g. 1.25 kg Sugar).
   - Live CGST + SGST tax calculation.
   - Price below-cost warning and prevention.
   - Save drafts, finalize atomically, and download GST tax invoices.
3. **Inventory** (`/inventory`):
   - Catalog management with category filters and loose vs. packaged badges.
   - "Receive Stock" modal that atomically updates inventory, cost price, and MRP.
   - Complete stock movement audit history.
4. **Invoices** (`/invoices`):
   - Historical bill register with itemized preview drawer.
   - Instant PDF download button for Indian GST Form INV-1 invoices.
5. **Khata Ledger** (`/khata`):
   - Customer credit directory with real-time running balances.
   - Customer passbook showing date, transaction type, credit amount, payment amount, and balance.
   - Record partial payments and full balance settlements.
6. **Reports & Analytics** (`/reports`):
   - Interactive Recharts visualizing sales velocity and top-selling SKUs.
   - GST tax collection breakdown table ready for GSTR-1 and GSTR-3B filings.
   - Inventory valuation (Cost Capital vs. Retail MRP Realization).
7. **Settings** (`/settings`):
   - Shop name, GSTIN, phone, address, and invoice footer notes.
   - Default payment mode and brand preferences.

---

## Telegram Supermarket Ops Agent (`bot/`)

A conversational AI agent that allows the shop owner to run the entire store from a Telegram chat window in natural language shopkeeper phrasing:
- *"50 packets of Maggi came in, cost ₹12, MRP ₹14"*
- *"make a bill: 2kg sugar, 1 Aashirvaad atta 5kg, 4 Maggi, UPI"*
- *"drop the sugar, make it 6 Maggi"*
- *"put ₹500 on Ramesh's credit" / "Ramesh's balance?"*
- *"send me that bill as a PDF"*
- *"make this week's sales analysis deck"*

### Architecture & Harness
- **Agent Harness**: Built on **Vercel AI SDK (`ai`)** using `generateText` with `maxSteps` autonomous control loop (`Observe → Reason → Act → Feed result back → Continue`).
- **Telegram Framework**: **grammY** supporting both production **Webhook** mode and local **Long-Polling** mode.
- **Single Source of Truth**: The agent contains **zero** direct database logic, zero stock arithmetic, and zero GST calculations. All tools are thin HTTP wrappers calling the website's REST API (`http://localhost:5000/api`).

### Tool Surface
| Tool Name | Parameters | Target Backend REST Endpoint |
|---|---|---|
| `search_products` | `query` | `GET /api/products?search={query}` |
| `get_product` | `product_id` | `GET /api/products/{id}` |
| `receive_stock` | `product_id, qty, cost_price, sell_price, notes` | `POST /api/products/{id}/receive-stock` |
| `create_product` | `name, sku, category, unit, cost_price, sell_price, gst_slab, hsn_code` | `POST /api/products` |
| `start_draft_bill`| `customer_name, payment_mode` | `POST /api/billing/draft/start` |
| `add_bill_item` | `bill_id, product_id, qty, unit_price` | `POST /api/billing/draft/{id}/items` |
| `remove_bill_item`| `bill_id, product_id` | `DELETE /api/billing/draft/{id}/items/{itemId}` |
| `preview_bill` | `bill_id` | `GET /api/billing/{id}` |
| `finalize_bill` | `bill_id, payment_mode, payment_ref, customer_id, allow_below_cost` | `POST /api/billing/{id}/finalize` |
| `get_stock_level` | `product_id` | `GET /api/products/{id}` |
| `get_low_stock` | — | `GET /api/products?low_stock=true` |
| `get_customer_balance` | `search` | `GET /api/khata/customers?search={search}` |
| `record_khata_payment` | `customer_id, amount, payment_mode, notes` | `POST /api/khata/customers/{id}/payment` |
| `get_daily_close` | `date` | `GET /api/reports/dashboard` |
| `get_invoice_pdf`| `bill_id` | `GET /api/invoices/{id}/pdf` |
| `get_analysis_deck`| `date_range` | `GET /api/reports/deck?range={range}` |
| `get_preference` | `key` | `GET /api/settings` |
| `set_preference` | `key, value` | `PUT /api/settings` |

### How Each Hard Part Is Handled by Delegating to the Website Backend

1. **Grounding**:
   - The agent never hallucinates products, stock levels, or prices. Every SKU, MRP, and GST rate is fetched live from the backend API via `search_products` or `get_product`.
2. **Oversell Guard**:
   - The backend API verifies `stock_qty >= qty` inside an immediate transaction. If the owner attempts to sell 10 items when only 4 are in stock, the API returns a 400 error (`Insufficient stock`), which the agent relays back to the owner rather than assuming success.
3. **GST Correctness**:
   - All intra-state 50/50 CGST + SGST splits, taxable value derivations, and rounding are computed by the backend's GST engine and returned on every bill preview and finalized invoice.
4. **Multi-Turn Bills**:
   - The agent tracks the active `currentDraftBillId` inside per-chat session state (`bot/session.js`). The owner can add items across messages ("2kg sugar", "and 4 Maggi", "drop the sugar"), and stock only decrements when `finalize_bill` is called.
5. **Idempotency**:
   - Telegram update deduplication: incoming `update_id`s are cached to prevent processing redelivered Telegram updates twice.
   - Bill idempotency: each draft bill receives a unique UUID `idempotency_key`. The `POST /api/billing/:id/finalize` endpoint checks this key; if already finalized, it returns the existing bill immediately without double-decrementing stock.
6. **Concurrency**:
   - Concurrency is enforced at the SQLite transaction boundary (`runInTransaction` in WAL mode). Two simultaneous sales or a sale plus a stock-in operation cannot corrupt inventory.
7. **Guardrails**:
   - Selling below cost price is rejected at the API layer unless `allow_below_cost` is explicitly authorized.
   - Settle Khata on an invalid customer or non-existent bill is blocked and relayed clearly.
8. **Real Artifacts**:
   - Invoices are delivered as genuine GST Tax Invoice PDFs (`Form GST INV-1`) generated via PDFKit.
   - Analysis decks are delivered as genuine PowerPoint (`.pptx`) presentations with real charts and insights generated via `pptxgenjs`, uploaded via Telegram's `sendDocument`.
9. **Memory Across Sessions**:
   - Standing preferences (e.g. `default_brand_atta`, `default_payment_mode`, `shop_gstin`) are persisted in the database `settings` table via `PUT /api/settings`. Starting a `/new` chat clears the conversation context and active draft bill, but store preferences and inventory remain intact.
10. **Ambiguity Resolution**:
    - When a request is ambiguous (e.g. "add atta" when both loose and Aashirvaad exist), the model first checks `get_preference("default_brand_atta")`. If found, it automatically uses that SKU. It only asks a clarifying question if no preference exists.

---

### Running the Telegram Bot

```bash
# 1. Configure bot environment
cp bot/.env.example bot/.env
# Edit bot/.env with your TELEGRAM_BOT_TOKEN and ANTHROPIC_API_KEY (or OPENAI_API_KEY / GEMINI_API_KEY)

# 2. Run automated agent tool tests
npm run bot:test

# 3. Start the Telegram Bot
npm run bot
```
