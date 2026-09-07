import { tool } from 'ai';
import { z } from 'zod';
import { apiClient } from './apiClient.js';
import { sessionStore } from './session.js';

/**
 * Creates the complete set of AI SDK tools bound to a specific chat context.
 * Enables automatic draft bill session tracking and document emission.
 */
export function createAgentTools(chatId, contextBag = {}) {
  const currentChatId = String(chatId);

  return {
    // 1. Search products
    search_products: tool({
      description: 'Search the grocery catalog for products by name, keyword, or SKU. Returns matching products with id, price, unit, stock, and GST slab.',
      parameters: z.object({
        query: z.string().describe('Product search query e.g. "sugar", "atta", "maggi"')
      }),
      execute: async ({ query }) => {
        const results = await apiClient.searchProducts(query);
        return {
          count: results.length,
          products: results.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            unit: p.unit,
            is_loose: p.is_loose === 1,
            sell_price: p.sell_price,
            cost_price: p.cost_price,
            stock_qty: p.stock_qty,
            gst_slab: p.gst_slab,
            category: p.category,
            reorder_level: p.reorder_level
          }))
        };
      }
    }),

    // 2. Get product details & stock
    get_product: tool({
      description: 'Get full product details and stock level by numeric product ID.',
      parameters: z.object({
        product_id: z.number().describe('Product ID')
      }),
      execute: async ({ product_id }) => {
        return await apiClient.getProduct(product_id);
      }
    }),

    // 3. Receive stock replenishment
    receive_stock: tool({
      description: 'Record incoming stock for a product ("50 packets of Maggi came in, cost ₹12, MRP ₹14"). Atomically increments stock and updates cost/sell price.',
      parameters: z.object({
        product_id: z.number().describe('Product ID'),
        qty: z.number().positive().describe('Quantity of items received (e.g. 50, 25.5)'),
        cost_price: z.number().nonnegative().describe('Cost price per unit paid to distributor/supplier'),
        sell_price: z.number().nonnegative().optional().describe('Optional new MRP / selling price per unit'),
        notes: z.string().optional().describe('Optional vendor / delivery note')
      }),
      execute: async ({ product_id, qty, cost_price, sell_price, notes }) => {
        const res = await apiClient.receiveStock(product_id, qty, cost_price, sell_price, notes);
        return {
          success: true,
          message: res.message,
          product_name: res.product.name,
          new_stock: res.product.stock_qty,
          unit: res.product.unit,
          cost_price: res.product.cost_price,
          sell_price: res.product.sell_price
        };
      }
    }),

    // 4. Create new product in catalog
    create_product: tool({
      description: 'Add a brand new product SKU to the catalog ("new item: Amul Butter 100g, GST 12%, MRP ₹62").',
      parameters: z.object({
        name: z.string().describe('Full product name, e.g. "Amul Butter 100g"'),
        sku: z.string().describe('Unique SKU code e.g. "AMUL-BTR-100G"'),
        category: z.enum(['staples', 'packaged', 'dairy', 'household', 'personal_care']).default('packaged'),
        unit: z.enum(['kg', 'g', 'litre', 'ml', 'packet', 'dozen', 'piece']).default('packet'),
        is_loose: z.boolean().default(false).describe('True if sold loose by weight, false if pre-packaged'),
        cost_price: z.number().nonnegative().describe('Wholesale cost price'),
        sell_price: z.number().nonnegative().describe('Retail selling price / MRP'),
        gst_slab: z.number().describe('Indian GST tax slab: 0, 5, 12, 18, or 28'),
        hsn_code: z.string().default('1901'),
        stock_qty: z.number().nonnegative().default(0),
        reorder_level: z.number().default(10)
      }),
      execute: async (productData) => {
        return await apiClient.createProduct(productData);
      }
    }),

    // 5. Start a new draft bill
    start_draft_bill: tool({
      description: 'Start a new draft bill session. Stock only decrements when finalized.',
      parameters: z.object({
        customer_name: z.string().optional().describe('Optional customer name for the bill'),
        payment_mode: z.enum(['cash', 'upi', 'card', 'khata']).default('cash')
      }),
      execute: async ({ customer_name, payment_mode }) => {
        const session = sessionStore.getSession(currentChatId);
        const res = await apiClient.startDraftBill({
          customer_name,
          payment_mode
        });
        sessionStore.setDraftBill(currentChatId, res.id, res.bill_number, res.idempotency_key);
        return {
          bill_id: res.id,
          bill_number: res.bill_number,
          idempotency_key: res.idempotency_key,
          status: 'draft'
        };
      }
    }),

    // 6. Add or update line item in bill
    add_bill_item: tool({
      description: 'Add an item to the active bill ("make a bill: 2kg sugar, 4 Maggi"). If no bill_id is provided, uses the active in-progress draft bill or creates one.',
      parameters: z.object({
        bill_id: z.number().optional().describe('Bill ID (defaults to active draft bill)'),
        product_id: z.number().describe('Product ID to add'),
        qty: z.number().positive().describe('Quantity to sell (e.g. 2 for 2kg or 4 for 4 packets)'),
        unit_price: z.number().optional().describe('Optional custom selling price override')
      }),
      execute: async ({ bill_id, product_id, qty, unit_price }) => {
        let activeBillId = bill_id;
        const session = sessionStore.getSession(currentChatId);

        if (!activeBillId) {
          if (session.currentDraftBillId) {
            activeBillId = session.currentDraftBillId;
          } else {
            const newBill = await apiClient.startDraftBill({});
            activeBillId = newBill.id;
            sessionStore.setDraftBill(currentChatId, newBill.id, newBill.bill_number, newBill.idempotency_key);
          }
        }

        const res = await apiClient.addBillItem(activeBillId, product_id, qty, unit_price);
        return {
          bill_id: res.id,
          bill_number: res.bill_number,
          items_count: res.items.length,
          items: res.items.map(i => ({
            name: i.product_name,
            qty: i.qty,
            unit: i.unit,
            line_total: i.line_total,
            gst_slab: i.gst_slab
          })),
          subtotal: res.subtotal,
          cgst: res.cgst_amount,
          sgst: res.sgst_amount,
          total: res.total_amount
        };
      }
    }),

    // 7. Remove item from draft bill
    remove_bill_item: tool({
      description: 'Remove an item from the draft bill ("drop the butter").',
      parameters: z.object({
        bill_id: z.number().optional().describe('Bill ID (defaults to active draft bill)'),
        product_id: z.number().describe('Product ID to remove from the bill')
      }),
      execute: async ({ bill_id, product_id }) => {
        const session = sessionStore.getSession(currentChatId);
        const targetBillId = bill_id || session.currentDraftBillId;
        if (!targetBillId) {
          throw new Error('No active draft bill found to modify.');
        }

        const res = await apiClient.removeBillItem(targetBillId, product_id);
        return {
          message: 'Item removed from bill',
          bill_id: res.id,
          total: res.total_amount,
          items: res.items.map(i => ({ name: i.product_name, qty: i.qty, total: i.line_total }))
        };
      }
    }),

    // 8. Preview draft bill
    preview_bill: tool({
      description: 'View the items and totals of the current draft bill.',
      parameters: z.object({
        bill_id: z.number().optional().describe('Bill ID (defaults to active draft bill)')
      }),
      execute: async ({ bill_id }) => {
        const session = sessionStore.getSession(currentChatId);
        const targetBillId = bill_id || session.currentDraftBillId;
        if (!targetBillId) {
          return { message: 'No active draft bill in progress.' };
        }

        const bill = await apiClient.previewBill(targetBillId);
        return {
          bill_id: bill.id,
          bill_number: bill.bill_number,
          status: bill.status,
          customer_name: bill.customer_name,
          payment_mode: bill.payment_mode,
          items: bill.items.map(i => ({
            name: i.product_name,
            qty: i.qty,
            unit: i.unit,
            rate: i.unit_price,
            total: i.line_total,
            gst: `${i.gst_slab}%`
          })),
          taxable_subtotal: bill.subtotal,
          cgst: bill.cgst_amount,
          sgst: bill.sgst_amount,
          grand_total: bill.total_amount
        };
      }
    }),

    // 9. Finalize bill (ATOMIC SALE)
    finalize_bill: tool({
      description: 'Finalize the bill. Atomically decrements inventory stock, creates stock movement records, and updates Khata credit if applicable.',
      parameters: z.object({
        bill_id: z.number().optional().describe('Bill ID (defaults to active draft bill)'),
        payment_mode: z.enum(['cash', 'upi', 'card', 'khata']).default('cash'),
        payment_ref: z.string().optional().describe('UPI UTR or card reference'),
        customer_id: z.number().optional().describe('Required if payment_mode is khata'),
        customer_name: z.string().optional(),
        allow_below_cost: z.boolean().default(false).describe('Explicit flag if selling below cost is permitted')
      }),
      execute: async ({ bill_id, payment_mode, payment_ref, customer_id, customer_name, allow_below_cost }) => {
        const session = sessionStore.getSession(currentChatId);
        const targetBillId = bill_id || session.currentDraftBillId;
        if (!targetBillId) {
          throw new Error('No active draft bill found to finalize.');
        }

        const res = await apiClient.finalizeBill(targetBillId, {
          payment_mode,
          payment_ref,
          customer_id,
          customer_name,
          allow_below_cost,
          idempotency_key: session.currentIdempotencyKey
        });

        // Record last finalized bill in session so "send me that bill as a PDF" targets this exact bill
        sessionStore.setLastFinalizedBill(currentChatId, res.id, res.bill_number);

        // Clear active draft bill upon successful finalization
        sessionStore.clearDraftBill(currentChatId);

        return {
          finalized: true,
          bill_id: res.id,
          bill_number: res.bill_number,
          payment_mode: res.payment_mode,
          total_amount: res.total_amount,
          cgst: res.cgst_amount,
          sgst: res.sgst_amount,
          customer_name: res.customer_name || 'Walk-in Customer',
          finalized_at: res.finalized_at,
          pdf_available: true
        };
      }
    }),

    // 10. Stock queries (Low stock / Stock level)
    get_stock_level: tool({
      description: 'Check available inventory stock quantity for a product ("how much sugar is left?").',
      parameters: z.object({
        product_id: z.number().describe('Product ID')
      }),
      execute: async ({ product_id }) => {
        const prod = await apiClient.getProduct(product_id);
        return {
          product_name: prod.name,
          stock_qty: prod.stock_qty,
          unit: prod.unit,
          reorder_level: prod.reorder_level,
          is_low_stock: prod.stock_qty <= prod.reorder_level
        };
      }
    }),

    get_low_stock: tool({
      description: 'Get list of all items that are running out or below their reorder level ("what is running out?").',
      parameters: z.object({}),
      execute: async () => {
        const items = await apiClient.getLowStock();
        return {
          count: items.length,
          low_stock_items: items.map(i => ({
            id: i.id,
            name: i.name,
            stock_qty: i.stock_qty,
            unit: i.unit,
            reorder_level: i.reorder_level
          }))
        };
      }
    }),

    // 11. Customer Khata Credit queries & payments
    get_customer_balance: tool({
      description: 'Look up a customer credit balance and khata ledger ("What is Ramesh\'s balance?").',
      parameters: z.object({
        search: z.string().describe('Customer name or phone number')
      }),
      execute: async ({ search }) => {
        const matches = await apiClient.getCustomerBalance(search);
        if (matches.length === 0) {
          return { found: false, message: `No customer found matching "${search}".` };
        }
        return {
          found: true,
          customers: matches.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            khata_balance: c.khata_balance
          }))
        };
      }
    }),

    record_khata_payment: tool({
      description: 'Record a payment received from a customer to settle or reduce their khata balance ("Ramesh paid ₹300").',
      parameters: z.object({
        customer_id: z.number().describe('Customer ID'),
        amount: z.number().positive().describe('Amount in INR received'),
        payment_mode: z.enum(['cash', 'upi', 'card']).default('cash'),
        notes: z.string().optional().describe('Optional payment notes')
      }),
      execute: async ({ customer_id, amount, payment_mode, notes }) => {
        const res = await apiClient.recordKhataPayment(customer_id, amount, payment_mode, notes);
        return {
          success: true,
          customer_name: res.customer.name,
          amount_paid: amount,
          new_balance: res.customer.khata_balance,
          message: res.message
        };
      }
    }),

    create_customer: tool({
      description: 'Add a new customer to the khata credit ledger ("add customer: Rajesh, phone: 9876543210, balance: 500").',
      parameters: z.object({
        name: z.string().describe('Full customer name'),
        phone: z.string().optional().describe('10-digit phone number'),
        address: z.string().optional().describe('Customer address'),
        initial_balance: z.number().default(0).describe('Starting credit balance')
      }),
      execute: async ({ name, phone, address, initial_balance }) => {
        return await apiClient.createCustomer({ name, phone, address, initial_balance });
      }
    }),

    update_customer: tool({
      description: 'Update an existing customer in khata credit ledger.',
      parameters: z.object({
        customer_id: z.number().describe('Customer ID'),
        name: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        khata_balance: z.number().optional()
      }),
      execute: async ({ customer_id, name, phone, address, khata_balance }) => {
        return await apiClient.updateCustomer(customer_id, { name, phone, address, khata_balance });
      }
    }),

    add_khata_credit: tool({
      description: 'Add store credit / outstanding debt to a customer khata ("put ₹500 on Ramesh\'s credit", "add 100 on Gunavathi credit").',
      parameters: z.object({
        customer_id: z.number().describe('Customer ID'),
        amount: z.number().positive().describe('Amount in INR to put on credit'),
        notes: z.string().optional().describe('Optional note')
      }),
      execute: async ({ customer_id, amount, notes }) => {
        const res = await apiClient.addKhataCredit(customer_id, amount, notes);
        return {
          success: true,
          customer_name: res.customer.name,
          amount_added: amount,
          new_balance: res.customer.khata_balance,
          message: res.message
        };
      }
    }),

    // 12. Daily close & sales report
    get_daily_close: tool({
      description: 'Get daily sales total, tax collected, cash vs UPI split, and top items ("today\'s sales?", "close the day").',
      parameters: z.object({
        date: z.string().optional().describe('Date YYYY-MM-DD (defaults to today)')
      }),
      execute: async ({ date }) => {
        const res = await apiClient.getDailyClose(date);
        return {
          today_sales: res.today.total_sales,
          bills_cut: res.today.total_bills,
          tax_collected: (res.today.total_cgst || 0) + (res.today.total_sgst || 0),
          payment_breakdown: res.paymentSplit,
          khata_outstanding: res.khata.total_outstanding,
          low_stock_count: res.lowStock.count
        };
      }
    }),

    // 13. PDF GST Tax Invoice
    get_invoice_pdf: tool({
      description: 'Generate and send a clean, GST-compliant PDF invoice document for a bill ("send me that bill as a PDF").',
      parameters: z.object({
        bill_id: z.number().describe('Bill ID to produce invoice for')
      }),
      execute: async ({ bill_id }) => {
        const pdfBuffer = await apiClient.getInvoicePdfBuffer(bill_id);
        const filename = `Tax_Invoice_${bill_id}.pdf`;
        
        // Signal to bot handler to attach this document to Telegram
        if (contextBag.documents) {
          contextBag.documents.push({
            type: 'pdf',
            filename,
            buffer: pdfBuffer,
            caption: `GST Tax Invoice #${bill_id}`
          });
        }

        return {
          success: true,
          bill_id,
          filename,
          size_bytes: pdfBuffer.length,
          message: `PDF invoice #${bill_id} generated and ready to deliver.`
        };
      }
    }),

    // 14. PPTX Analysis Deck
    get_analysis_deck: tool({
      description: 'Generate and send a PowerPoint (.pptx) deck analyzing the store (sales trends, top items, stock health, GST collected with real charts).',
      parameters: z.object({
        date_range: z.enum(['today', '7d', '30d', '90d']).default('7d').describe('Analysis timeframe')
      }),
      execute: async ({ date_range }) => {
        const pptxBuffer = await apiClient.getAnalysisDeckBuffer(date_range);
        const filename = `Store_Analysis_${date_range}.pptx`;

        if (contextBag.documents) {
          contextBag.documents.push({
            type: 'pptx',
            filename,
            buffer: pptxBuffer,
            caption: `Store Operations Analysis Deck (${date_range})`
          });
        }

        return {
          success: true,
          date_range,
          filename,
          size_bytes: pptxBuffer.length,
          message: `Analysis presentation deck (${date_range}) generated with charts.`
        };
      }
    }),

    // 15. Store Preferences & Memory across sessions
    get_preference: tool({
      description: 'Look up standing store preferences (default payment mode, default brand atta, default brand oil, shop GSTIN).',
      parameters: z.object({
        key: z.string().describe('Preference key e.g. "default_brand_atta", "default_payment_mode", "shop_gstin"')
      }),
      execute: async ({ key }) => {
        const settings = await apiClient.getSettings();
        return {
          key,
          value: settings[key] || null
        };
      }
    }),

    set_preference: tool({
      description: 'Set a standing store preference that persists across chats and restarts ("always assume UPI unless I say cash", "default atta = Aashirvaad 5kg").',
      parameters: z.object({
        key: z.string().describe('Preference key to set e.g. "default_payment_mode", "default_brand_atta", "default_brand_oil"'),
        value: z.string().describe('Preference value')
      }),
      execute: async ({ key, value }) => {
        await apiClient.setSetting(key, value);
        return {
          success: true,
          key,
          value,
          message: `Standing preference "${key}" updated to "${value}".`
        };
      }
    }),

    // 16. Smart Reorder Suggestions based on sales velocity & stock runway
    get_reorder_suggestions: tool({
      description: 'Get intelligent reorder recommendations calculated from historical sales velocity, days-of-stock runway, and buffer targets.',
      parameters: z.object({}),
      execute: async () => {
        return apiClient.getReorderSuggestions();
      }
    }),

    // 17. Expiry & FEFO batch monitoring
    get_expiring_products: tool({
      description: 'Check products and batches nearing expiry (within 7 or 30 days) or already expired for FEFO stock management.',
      parameters: z.object({
        days: z.number().default(30).describe('Window of days to check for upcoming expiry')
      }),
      execute: async ({ days }) => {
        return apiClient.getExpiringProducts(days);
      }
    })
  };
}
