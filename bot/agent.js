import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { createAgentTools } from './tools.js';
import { sessionStore } from './session.js';
import { apiClient } from './apiClient.js';
import { config } from './config.js';
import { detectLanguage, normalizeLanguageTerms, MESSAGES, SUPPORTED_LANGUAGES } from './i18n.js';

function hasApiKey() {
  return !!(
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  );
}

function getModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    return { model: anthropic('claude-3-5-sonnet-latest'), provider: 'anthropic' };
  }
  if (process.env.OPENAI_API_KEY) {
    return { model: openai('gpt-4o'), provider: 'openai' };
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = key;
    return { model: google('gemini-3.5-flash-lite'), provider: 'google' };
  }
  return null;
}

/**
 * Intelligent deterministic tool orchestrator & retail domain assistant.
 * Handles ANY question regarding Nebula Supermarket & Retail:
 * - Product catalog, prices, GST slabs, margins, and stock levels
 * - Multi-turn draft billing, line item additions, edits, and finalization
 * - Stock-in replenishment for any item
 * - Customer Khata credit balances, ledger records, and payments
 * - Daily sales summaries, PDF invoices, and PPTX analysis decks
 * - Store hours, address, contact, GSTIN, staff, and retail policies
 */
async function runDeterministicToolOrchestrator(chatId, text, tools, contextBag, session, storePrefs) {
  const detectedLang = detectLanguage(text);
  const userLang = session.preferredLanguage || (detectedLang !== 'en' ? detectedLang : (storePrefs.default_language || 'en'));
  const normalizedText = normalizeLanguageTerms(text);
  const lower = normalizedText.toLowerCase().trim();

  // Helper: fetch all products once
  let allProducts = [];
  try {
    const res = await tools.search_products.execute({ query: '' });
    allProducts = res.products || [];
  } catch (_) {}

  // Helper: find product by matching keywords
  function findProductInText(targetText) {
    const t = targetText.toLowerCase();

    // 1. Exact full product name match in text (pick the longest matching name if multiple match)
    const exactMatches = allProducts
      .filter(p => p.name && t.includes(p.name.toLowerCase()))
      .sort((a, b) => b.name.length - a.name.length);
    if (exactMatches.length > 0) {
      return exactMatches[0];
    }

    // 2. Normalized alphanumeric full product name match (ignoring brackets, punctuation, multiple spaces)
    const cleanT = t.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
    const normalizedMatches = allProducts
      .filter(p => {
        if (!p.name) return false;
        const cleanP = p.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        return cleanP.length > 2 && cleanT.includes(cleanP);
      })
      .sort((a, b) => b.name.length - a.name.length);
    if (normalizedMatches.length > 0) {
      return normalizedMatches[0];
    }

    // 3. Check store preferences if generic terms like atta / oil / rice / sugar / milk used
    for (const [prefKey, prefVal] of Object.entries(storePrefs || {})) {
      if (prefKey.startsWith('default_brand_') && prefVal) {
        const itemKeyword = prefKey.replace('default_brand_', '').toLowerCase();
        if (t.includes(itemKeyword)) {
          const m = allProducts.find(p =>
            p.name.toLowerCase() === prefVal.toLowerCase() ||
            p.name.toLowerCase().includes(prefVal.toLowerCase()) ||
            prefVal.toLowerCase().includes(p.name.toLowerCase())
          );
          if (m) return m;
        }
      }
    }
    if (t.includes('atta')) {
      const preferred = storePrefs.default_brand_atta || 'Aashirvaad Superior MP Atta 5kg';
      const m = allProducts.find(p => p.name.toLowerCase().includes(preferred.toLowerCase()) || p.name.toLowerCase().includes('atta'));
      if (m) return m;
    }
    if (t.includes('oil')) {
      const preferred = storePrefs.default_brand_oil || 'Fortune Sunlite Sunflower Oil 1L';
      const m = allProducts.find(p => p.name.toLowerCase().includes(preferred.toLowerCase()) || p.name.toLowerCase().includes('oil'));
      if (m) return m;
    }

    // 4. Best keyword overlap score (excluding common stop/command words)
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'add', 'stock', 'came', 'packet', 'packets',
      'pkt', 'pkts', 'pcs', 'piece', 'pieces', 'cost', 'mrp', 'sell', 'price',
      'rate', 'item', 'items', 'loose', 'make', 'bill', 'unit', 'have', 'much',
      'left', 'running', 'replenish', 'received'
    ]);

    let bestProduct = null;
    let maxScore = -1;

    for (const p of allProducts) {
      const pWords = p.name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      if (pWords.length === 0) continue;

      let matchCount = 0;
      for (const kw of pWords) {
        if (cleanT.includes(kw)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const coverage = matchCount / pWords.length;
        const score = matchCount * 10 + coverage * 10;
        if (score > maxScore) {
          maxScore = score;
          bestProduct = p;
        }
      }
    }

    return bestProduct;
  }

  // 0. LANGUAGE SELECTION & SWITCHING (English / Hindi / Tamil)
  if (
    lower.startsWith('/lang') || lower.startsWith('/language') ||
    lower.includes('language to') || lower.includes('speak in') ||
    lower.includes('baat karo') || lower.includes('pesu') ||
    lower === 'hindi' || lower === 'tamil' || lower === 'english' ||
    lower === 'தமிழ்' || lower === 'हिन्दी'
  ) {
    let targetLang = 'en';
    if (lower.includes('hi') || lower.includes('hindi') || lower.includes('हिन्दी')) {
      targetLang = 'hi';
    } else if (lower.includes('ta') || lower.includes('tamil') || lower.includes('தமிழ்') || lower.includes('pesu')) {
      targetLang = 'ta';
    }
    session.preferredLanguage = targetLang;
    try {
      await tools.set_preference.execute({ key: 'default_language', value: targetLang });
    } catch (_) {}

    return MESSAGES[targetLang].lang_switched;
  }

  // 1. GREETINGS & CAPABILITIES / HELP
  const greetingWords = ['hi', 'hello', 'hey', 'start', '/start', 'help', '/help', 'menu', 'who are you', 'what can you do', 'commands', 'namaste', 'vanakkam'];
  if (greetingWords.includes(lower) || lower === 'about' || lower === 'nebula') {
    if (userLang === 'hi') {
      return (
        `🏪 *नेबुला सुपरमार्केट और किराना ऑप्स एजेंट*\n\n` +
        `नमस्ते! मैं आपकी दुकान के काम आसान बना सकता हूँ:\n\n` +
        `🛒 *बिलिंग:* "2 किलो चीनी, 1 आटा, 4 मैगी बिल बनाओ, UPI"\n` +
        `📦 *इन्वेंटरी:* "दूध का भाव क्या है?", "चीनी कितनी बची है?"\n` +
        `📒 *खाता:* "रमेश का खाता कितना है?", "अनीता ने ₹500 दिए"\n` +
        `📢 *पेमेंट रिमाइंडर:* "रमेश को खाता रिमाइंडर भेजो"\n` +
        `📸 *फोटो स्कैन:* बारकोड या प्रोडक्ट का फोटो भेजें!\n` +
        `🌐 *भाषा बदलें:* \`/lang en\` या \`/lang ta\``
      );
    }
    if (userLang === 'ta') {
      return (
        `🏪 *நெபுலா சூப்பர் மார்க்கெட் ரீடெய்ல் ஏஜென்ட்*\n\n` +
        `வணக்கம்! உங்கள் கடையின் அனைத்து வேலைகளையும் செய்யலாம்:\n\n` +
        `🛒 *பில்லிங்:* "2 கிலோ சர்க்கரை, 1 ஆட்டா, 4 மேகி பில் போடு, UPI"\n` +
        `📦 *சரக்கு இருப்பு:* "பால் விலை என்ன?", "சர்க்கரை எவ்வளவு இருக்கு?"\n` +
        `📒 *கடன் கணக்கு:* "ரமேஷ் பாக்கி எவ்வளவு?", "ரமேஷ் ₹300 கொடுத்தார்"\n` +
        `📢 *கட்டண நினைவூட்டல்:* "ரமேஷ்க்கு கட்டண நினைவூட்டல் அனுப்பு"\n` +
        `📸 *படம் ஸ்கேன்:* பார்கோடு அல்லது பொருளின் புகைப்படத்தை அனுப்பவும்!\n` +
        `🌐 *மொழி மாற்ற:* \`/lang en\` அல்லது \`/lang hi\``
      );
    }
    return (
      `🏪 *Welcome to Nebula Supermarket & Retail Ops Agent*\n\n` +
      `I can help you manage the entire store in plain English, Hindi (हिन्दी), or Tamil (தமிழ்):\n\n` +
      `🛒 *Billing & POS:*\n` +
      `• "make a bill: 2kg sugar, 1 atta, 4 maggi, UPI"\n` +
      `• "add 2 milk" / "drop the sugar"\n` +
      `• "preview bill" / "finalize bill via cash"\n\n` +
      `📦 *Inventory & Pricing:*\n` +
      `• "what products do we sell?" / "list dairy items"\n` +
      `• "price of milk?" / "how much sugar is left?"\n` +
      `• "what's running out?" (low stock alert)\n` +
      `• "50 packets of Maggi came in, cost ₹12, MRP ₹14"\n\n` +
      `📒 *Khata (Credit Ledger) & Reminders:*\n` +
      `• "Ramesh's balance?" / "who owes money?"\n` +
      `• "send khata reminder to Ramesh" (WhatsApp + UPI link)\n` +
      `• "Ramesh paid ₹300"\n\n` +
      `📸 *Visual Scanner:* Send any photo of a barcode or product packaging to identify & bill it!\n\n` +
      `🌐 *Language:* Switch anytime with \`/lang hi\` (हिन्दी) or \`/lang ta\` (தமிழ்).`
    );
  }

  // 1b. HOW TO ADD NEW PRODUCTS GUIDE
  if (
    lower.includes('want to add') || lower.includes('how to add product') ||
    lower.includes('how do i add product') || lower.includes('how to add new product') ||
    lower === 'add product' || lower === 'new product' || lower === 'add new product'
  ) {
    return (
      `📦 *How to Add a New Product to Inventory Catalog:*\n\n` +
      `Send a single message in this format:\n` +
      `*"add product: [Name], cost [₹], mrp [₹], stock [qty], gst [0/5/12/18]%"*\n\n` +
      `*Examples:*\n` +
      `• *"add product: Good Day Biscuits 100g, cost 20, mrp 25, gst 18%, stock 50"*\n` +
      `• *"add product: Fresh Tomatoes 1kg, cost 40, mrp 55, stock 15kg, gst 0%"*\n` +
      `• *"add product: Amul Paneer 200g, cost 70, mrp 90, gst 5%, stock 30"*\n\n` +
      `Once sent, it is saved into the database and instantly appears in the web Inventory catalog (/inventory) and POS!`
    );
  }

  // 1c. STORE PREFERENCES & CROSS-CHAT MEMORY (Standing Instructions)
  // Handles natural language store memory instructions persisted across chats in SQLite settings:
  // e.g. "always assume UPI unless I say cash · default atta = Aashirvaad 5kg → remembered across chats"
  // e.g. "default atta = Aashirvaad 5kg", "always assume cash", "show store preferences", "what are my preferences"
  const isPreferenceQuery = (
    (lower.includes('preference') || lower.includes('preferences') || lower.includes('store memory') || lower.includes('standing instruction')) &&
    (lower.includes('what') || lower.includes('show') || lower.includes('list') || lower.includes('view') || lower.includes('check') || lower.includes('get') || lower.trim() === 'preferences' || lower.trim() === 'memory')
  );

  const isPreferenceSetIntent = (
    lower.includes('assume') ||
    lower.includes('default atta') ||
    lower.includes('default oil') ||
    lower.includes('default rice') ||
    lower.includes('default sugar') ||
    lower.includes('default milk') ||
    lower.includes('default payment') ||
    lower.includes('default brand') ||
    /default\s+[a-z0-9_\s]+[:=]/i.test(text) ||
    lower.includes('remembered across') ||
    lower.includes('remember across') ||
    lower.includes('set preference') ||
    lower.includes('remember preference') ||
    (lower.startsWith('remember ') && (lower.includes('default') || lower.includes('assume') || lower.includes('preference')))
  );

  if (isPreferenceQuery) {
    let currentPrefs = {};
    try {
      currentPrefs = await apiClient.getSettings();
    } catch (_) {
      currentPrefs = storePrefs || {};
    }

    const payMode = (currentPrefs.default_payment_mode || 'upi').toUpperCase();
    const attaBrand = currentPrefs.default_brand_atta || 'Aashirvaad Superior MP Atta 5kg';
    const oilBrand = currentPrefs.default_brand_oil || 'Fortune Sunlite Sunflower Oil 1L';

    let extraBrands = '';
    for (const [k, v] of Object.entries(currentPrefs)) {
      if (k.startsWith('default_brand_') && k !== 'default_brand_atta' && k !== 'default_brand_oil' && v) {
        const item = k.replace('default_brand_', '');
        extraBrands += `• Default ${item.charAt(0).toUpperCase() + item.slice(1)}: *${v}*\n`;
      }
    }

    return (
      `🧠 *Store Memory & Preferences (Persisted Across Chats):*\n\n` +
      `• *Default Payment Mode:* ${payMode} (assumed unless cash specified)\n` +
      `• *Default Atta:* ${attaBrand}\n` +
      `• *Default Oil:* ${oilBrand}\n` +
      (extraBrands ? extraBrands + '\n' : '\n') +
      `• Store Name: *${currentPrefs.shop_name || 'Nebula Supermarket & Retail'}*\n` +
      `• GSTIN: *${currentPrefs.shop_gstin || '29ABCDE1234F1Z5'}*\n\n` +
      `💡 *To update preferences anytime, say:*\n` +
      `• *"always assume UPI unless I say cash"*\n` +
      `• *"default atta = Aashirvaad 5kg"*\n` +
      `• *"default oil = Fortune Sunlite 1L"*`
    );
  }

  if (isPreferenceSetIntent) {
    const updated = [];

    // 1. Payment mode preference:
    const payMatch = text.match(/(?:always\s+)?assume\s+(upi|cash|card|khata)(?:\s+unless\s+i\s+say\s+([a-z]+))?/i) ||
                     text.match(/default\s+payment(?:\s+mode)?\s*[:=\-]?\s*(upi|cash|card|khata)/i) ||
                     text.match(/prefer\s+(upi|cash|card|khata)/i);

    if (payMatch) {
      const mode = payMatch[1].toLowerCase();
      const unlessMode = payMatch[2] ? payMatch[2].toLowerCase() : (mode === 'upi' ? 'cash' : 'upi');
      try {
        await tools.set_preference.execute({ key: 'default_payment_mode', value: mode });
        storePrefs.default_payment_mode = mode;
        const conditionNote = text.toLowerCase().includes('unless') ? ` (unless ${unlessMode.toUpperCase()} specified)` : '';
        updated.push(`• Default Payment Mode: *${mode.toUpperCase()}*${conditionNote}`);
      } catch (err) {
        console.warn('Failed to set default_payment_mode:', err.message);
      }
    }

    // 2. Brand / Item preferences:
    const clauses = text.split(/[·•;\n|]|\band\b|\s+\.\s+/i);

    for (const clause of clauses) {
      const brandMatch = clause.match(/default\s+(?:brand\s+)?([a-zA-Z0-9_\s]+?)\s*[:=]\s*([^·•;\n|→\->\(]+)/i) ||
                         clause.match(/prefer\s+([a-zA-Z0-9_\s]+?)\s+for\s+([^·•;\n|→\->\(]+)/i) ||
                         clause.match(/remember\s+(?:that\s+)?(?:default\s+)?([a-zA-Z0-9_\s]+?)\s*[:=]\s*([^·•;\n|→\->\(]+)/i);

      if (brandMatch) {
        let rawItem = brandMatch[1].trim().toLowerCase();
        let rawBrand = brandMatch[2].trim();

        // Clean up common suffix or notes like "remembered across chats"
        rawBrand = rawBrand.replace(/(?:→|->)?\s*remembered\s+across\s+chats.*$/i, '')
                           .replace(/(?:→|->)?\s*remember\s+across\s+chats.*$/i, '')
                           .replace(/\s*\(remember.*?\)/i, '')
                           .trim();

        if (rawItem === 'payment' || rawItem === 'payment mode') {
          continue;
        }

        const cleanItem = rawItem.replace(/[^a-z0-9_]/g, '');
        if (cleanItem.length > 1 && rawBrand.length > 1) {
          const cleanBrandLower = rawBrand.toLowerCase();
          const matchedProd = allProducts.find(p => {
            const pLower = p.name.toLowerCase();
            return pLower.includes(cleanBrandLower) || cleanBrandLower.includes(pLower) ||
                   (cleanBrandLower.includes('aashirvaad') && pLower.includes('aashirvaad')) ||
                   (cleanBrandLower.includes('fortune') && pLower.includes('fortune'));
          });

          const resolvedValue = matchedProd ? matchedProd.name : rawBrand;
          const prefKey = `default_brand_${cleanItem}`;

          try {
            await tools.set_preference.execute({ key: prefKey, value: resolvedValue });
            storePrefs[prefKey] = resolvedValue;
            const itemDisplayName = cleanItem.charAt(0).toUpperCase() + cleanItem.slice(1);
            updated.push(`• Default ${itemDisplayName}: *${resolvedValue}*`);
          } catch (err) {
            console.warn(`Failed to set ${prefKey}:`, err.message);
          }
        }
      }
    }

    if (updated.length > 0) {
      return (
        `🧠 *Store Preferences Remembered Across Chats!*\n\n` +
        `Saved standing instructions in store database:\n` +
        `${updated.join('\n')}\n\n` +
        `💾 *Persistence:* Stored permanently in SQLite \`settings\` table.\n` +
        `These defaults will be automatically remembered and applied to all future bills and inquiries across sessions!`
      );
    }
  }

  // 2. STORE INFORMATION & RETAIL POLICIES
  if (
    lower.includes('address') || lower.includes('location') || lower.includes('where is') ||
    lower.includes('where are') || lower.includes('directions') || lower.includes('locate')
  ) {
    const addr = storePrefs.shop_address || '#14, 5th Cross, Commercial Hub, Bengaluru, Karnataka - 560004';
    return `📍 *Store Address:*\n${addr}\nLandmark: Near Commercial Hub.`;
  }

  if (
    lower.includes('timing') || lower.includes('hours') ||
    ((lower.includes('open') || lower.includes('close')) && (lower.includes('when') || lower.includes('time') || lower.includes('what')))
  ) {
    return `⏰ *Store Timings:*\nOpen 7 Days a Week from 7:00 AM to 10:30 PM.\nDoor delivery orders accepted until 9:30 PM.`;
  }

  if (lower.includes('phone') || lower.includes('contact') || lower.includes('call') || lower.includes('mobile') || lower.includes('number')) {
    const phone = storePrefs.shop_phone || '+91 98451 98765 / 080-26614589';
    return `📞 *Store Contact Numbers:*\n${phone}\nSupport & Delivery Hotline available 7:00 AM - 10:00 PM.`;
  }

  if (lower.includes('gstin') || (lower.includes('gst') && (lower.includes('number') || lower.includes('registration') || lower.includes('code')))) {
    const gstin = storePrefs.shop_gstin || '29ABCDE1234F1Z5';
    const state = storePrefs.shop_state_code || '29 (Karnataka)';
    return `🏢 *GST & Tax Registration:*\nGSTIN: ${gstin}\nState Code: ${state}\nEvery finalized bill automatically generates a GST-compliant tax invoice with 50/50 CGST + SGST splits.`;
  }

  if ((lower.includes('gst') || lower.includes('tax')) && (lower.includes('slab') || lower.includes('rate') || lower.includes('percent') || lower.includes('category') || lower.includes('rules') || lower.includes('how much'))) {
    return (
      `📊 *Standard GST Slabs at Nebula Supermarket:*\n\n` +
      `• *0% GST (Exempt/Essential):* Fresh milk (Amul Taaza), loose staples (Sona Masoori Rice, Premium Toor Dal), Tata Salt\n` +
      `• *5% GST:* Packaged staples (Aashirvaad Atta 5kg, Fortune Sunflower Oil 1L, Loose Sugar)\n` +
      `• *12% GST:* Processed & dairy products (Amul Butter 100g, Maggi 2-Minute Noodles)\n` +
      `• *18% GST:* Packaged FMCG & personal care (Surf Excel Detergent, Dettol Soap, Parle-G Biscuits)\n\n` +
      `Intra-state sales split equally into CGST and SGST.`
    );
  }

  // --- PAYMENT METHOD SELECTION & FINALIZATION ---
  const paymentMethods = ['cash', 'upi', 'card', 'khata'];
  const matchedPaymentMethod = paymentMethods.find(m => {
    const regex = new RegExp(`(^|[^a-z])${m}([^a-z]|$)`, 'i');
    return regex.test(lower);
  });

  const isPaymentSelectionIntent =
    lower.startsWith('pay with') ||
    lower.startsWith('pay via') ||
    lower.startsWith('pay ') ||
    lower.includes('payment method') ||
    lower.includes('payment mode') ||
    lower.includes('choose payment') ||
    lower.includes('select payment') ||
    lower.includes('set payment') ||
    lower.includes('change payment') ||
    (matchedPaymentMethod && ['cash', 'upi', 'card', 'khata', 'pay cash', 'pay upi', 'pay card', 'pay khata', 'by cash', 'by upi', 'by card'].includes(lower));

  if (isPaymentSelectionIntent && matchedPaymentMethod) {
    const chosenMode = matchedPaymentMethod;
    // If an active draft bill exists, finalize it with this chosen payment method!
    if (session.currentDraftBillId) {
      try {
        const res = await tools.finalize_bill.execute({ payment_mode: chosenMode });
        session.lastFinalizedBillId = res.bill_id || res.id;
        contextBag.buttons = [
          [{ text: '📄 Download GST Invoice PDF', callback_data: `get_pdf_${res.bill_id || res.id}` }]
        ];
        return (
          `✅ *Bill #${res.bill_number} Finalized with ${chosenMode.toUpperCase()}!*\n\n` +
          `• Total Amount: *₹${res.total_amount}*\n` +
          `• Payment Mode: *${res.payment_mode.toUpperCase()}*\n` +
          `• Total Tax (CGST+SGST): ₹${(res.cgst + res.sgst).toFixed(2)}\n` +
          `• Stock decremented atomically in store database.\n\n` +
          `Tap below or say *"send me that bill as a PDF"* to download the official GST invoice.`
        );
      } catch (err) {
        return `⚠️ Could not finalize with ${chosenMode.toUpperCase()}: ${err.message}`;
      }
    } else {
      // If no active draft bill, update store default payment preference
      try {
        await tools.set_preference.execute({ key: 'default_payment_mode', value: chosenMode });
        return `💳 *Default Payment Mode Updated!*\nStore payment preference is now set to *${chosenMode.toUpperCase()}*. All future bills will default to this method.`;
      } catch (_) {
        return `💳 Payment method *${chosenMode.toUpperCase()}* selected. You can now start a bill with *"make a bill: 2kg sugar, 4 maggi"*!`;
      }
    }
  }

  // If user asks "choose payment method" or "payment method" without specifying cash/upi/card:
  if (lower.includes('payment') && (lower.includes('method') || lower.includes('accept') || lower.includes('option') || lower.includes('how to pay') || lower.includes('mode') || lower.includes('ways') || lower.includes('choose') || lower.includes('select'))) {
    contextBag.buttons = [
      [
        { text: '💵 Pay Cash', callback_data: 'pay_cash' },
        { text: '📱 Pay UPI', callback_data: 'pay_upi' }
      ],
      [
        { text: '💳 Pay Card', callback_data: 'pay_card' },
        { text: '📒 Put on Khata', callback_data: 'pay_khata' }
      ]
    ];

    if (session.currentDraftBillId) {
      let previewTotal = '';
      try {
        const preview = await tools.preview_bill.execute({});
        previewTotal = `• Current Bill Amount: *₹${preview.grand_total}*\n\n`;
      } catch (_) {}

      return (
        `💳 *Select Payment Method for Active Bill:*\n\n${previewTotal}` +
        `Tap a button below or reply with your choice:\n` +
        `• *Cash* — Pay cash at counter\n` +
        `• *UPI* — GPay, PhonePe, Paytm QR\n` +
        `• *Card* — Visa, Mastercard, RuPay\n` +
        `• *Khata* — Customer credit account`
      );
    }

    return (
      `💳 *Accepted Payment Modes at Nebula Supermarket:*\n\n` +
      `Tap below or tell me to set your default preference:\n` +
      `1. *UPI:* PhonePe, Google Pay, Paytm, BHIM QR codes (Default mode)\n` +
      `2. *Cash:* Accepted at the counter\n` +
      `3. *Cards:* Visa, Mastercard, RuPay debit/credit cards\n` +
      `4. *Khata:* Digital ledger credit for verified regular customers.`
    );
  }

  if (lower.includes('owner') || lower.includes('staff') || lower.includes('who works') || lower.includes('manager')) {
    return `👥 *Nebula Supermarket Team:*\n• *Store Owner:* Rajesh Sharma\n• *Billing & Counter Staff:* Venkatesh\n• *Contact:* +91 98451 98765`;
  }

  if (lower.includes('return') || lower.includes('refund') || lower.includes('exchange')) {
    return `🔄 *Return & Exchange Policy:*\n• Packaged goods in sealed condition can be exchanged within 48 hours with bill.\n• Perishables and dairy (milk, butter) should be inspected at delivery/counter.\n• Credit notes or instant UPI/cash refunds are issued upon return.`;
  }

  // 3. CATEGORY SPECIFIC FILTER
  const categoryFilters = [
    { key: 'dairy', label: 'Dairy' },
    { key: 'staples', label: 'Staples & Grains' },
    { key: 'packaged', label: 'Packaged Foods' },
    { key: 'household', label: 'Household' },
    { key: 'personal_care', label: 'Personal Care' }
  ];

  for (const cat of categoryFilters) {
    if (lower.includes(cat.key) || (cat.key === 'personal_care' && lower.includes('personal care'))) {
      if (lower.includes('list') || lower.includes('show') || lower.includes('item') || lower.includes('product') || lower.includes('what') || lower.includes('category')) {
        const filtered = allProducts.filter(p => (p.category || '').toLowerCase() === cat.key || (cat.key === 'staples' && !p.category));
        if (filtered.length > 0) {
          let catReply = `📋 *${cat.label} Products (${filtered.length}):*\n\n`;
          for (const item of filtered) {
            catReply += `• *${item.name}*: ₹${item.sell_price}/${item.unit} | Stock: ${item.stock_qty} ${item.unit} | GST: ${item.gst_slab}%\n`;
          }
          return catReply;
        }
      }
    }
  }

  // 4. CATALOG & PRODUCT BROWSING
  if (
    !lower.includes('expir') && !lower.includes('reorder') && !lower.includes('velocity') && !lower.includes('batch') && !lower.includes('fefo') &&
    ((lower.includes('product') || lower.includes('item') || lower.includes('catalog') || lower.includes('inventory') || lower.includes('sell')) &&
     (lower.includes('what') || lower.includes('list') || lower.includes('show') || lower.includes('all') || lower.includes('available') || lower.includes('menu') || lower.includes('do we')))
  ) {
    if (allProducts.length === 0) return 'No products found in store catalog.';
    
    // Group by category
    const categories = {
      staples: '🌾 *Staples & Grains:*',
      dairy: '🥛 *Dairy Products:*',
      packaged: '🍜 *Packaged Foods:*',
      household: '🧼 *Household:*',
      personal_care: '🧴 *Personal Care:*'
    };

    let reply = `📦 *Nebula Supermarket Product Catalog (${allProducts.length} items):*\n\n`;
    for (const [catKey, catTitle] of Object.entries(categories)) {
      const items = allProducts.filter(p => (p.category || '').toLowerCase() === catKey || (catKey === 'staples' && !p.category));
      if (items.length > 0) {
        reply += `${catTitle}\n`;
        for (const item of items) {
          reply += `• ${item.name} — ₹${item.sell_price}/${item.unit} (Stock: ${item.stock_qty} ${item.unit}, GST: ${item.gst_slab}%)\n`;
        }
        reply += '\n';
      }
    }
    reply += `Say "price of [product]" or "how much [product] is left?" for specific details.`;
    return reply;
  }

  // 4a. REORDER SUGGESTIONS FROM SALES VELOCITY & RUNWAY
  if (
    lower.includes('reorder suggestion') || lower.includes('what should i order') ||
    lower.includes('what should i reorder') || lower.includes('sales velocity') ||
    lower.includes('replenishment') || lower.includes('runway') ||
    (lower.includes('reorder') && (lower.includes('suggest') || lower.includes('velocity') || lower.includes('advice') || lower.includes('need to order')))
  ) {
    try {
      const res = await tools.get_reorder_suggestions.execute({});
      const suggestions = res.suggestions || [];
      const critical = suggestions.filter(s => s.urgency === 'CRITICAL');
      const warning = suggestions.filter(s => s.urgency === 'WARNING');

      let reply = `📦 *Smart Reorder Recommendations (Sales Velocity & Runway):*\n\n`;

      if (critical.length > 0) {
        reply += `🚨 *CRITICAL ATTENTION (≤ 3 Days of Stock Remaining):*\n`;
        for (const item of critical.slice(0, 5)) {
          reply += `• *${item.name}*: Current Stock: *${item.current_stock} ${item.unit}*\n` +
            `  Velocity: ${item.daily_velocity} ${item.unit}/day | Runway: *${item.runway_days} days*\n` +
            `  👉 *Order Recommended: ${item.suggested_reorder_qty} ${item.unit}* (Est. Cost: ₹${item.estimated_order_cost})\n\n`;
        }
      }

      if (warning.length > 0) {
        reply += `⚠️ *UPCOMING REORDERS (3–7 Days Runway):*\n`;
        for (const item of warning.slice(0, 4)) {
          reply += `• *${item.name}*: Current Stock: ${item.current_stock} ${item.unit} | Velocity: ${item.daily_velocity}/day\n` +
            `  Runway: *${item.runway_days} days* | Recommended: *+${item.suggested_reorder_qty} ${item.unit}*\n`;
        }
        reply += '\n';
      }

      if (critical.length === 0 && warning.length === 0) {
        reply += `✅ All catalog products currently have healthy stock buffers (> 7 days runway).\n`;
      } else {
        reply += `💡 _Calculated from real sales velocity over past 14 days with a 14-day stock buffer target._`;
      }

      return reply;
    } catch (err) {
      return `Could not compute reorder velocity: ${err.message}`;
    }
  }

  // 4b. EXPIRY & FEFO BATCH TRACKING
  if (
    lower.includes('expir') || lower.includes('fefo') ||
    (lower.includes('batch') && (lower.includes('detail') || lower.includes('track') || lower.includes('info') || lower.includes('show') || lower.includes('list') || lower.includes('what')))
  ) {
    try {
      const res = await tools.get_expiring_products.execute({ days: 30 });
      let reply = `🏷️ *Expiry & FEFO Batch Tracking Report:*\n\n`;

      if (res.expired_count > 0) {
        reply += `⛔ *ALREADY EXPIRED BATCHES (${res.expired_count}):*\n`;
        for (const b of res.expired) {
          reply += `• *${b.product_name}* (Batch: ${b.batch_number}): Expired on ${b.expiry_date} (${b.stock_qty} ${b.unit})\n`;
        }
        reply += '\n';
      }

      if (res.expiring_soon_count > 0) {
        reply += `⚠️ *EXPIRING WITHIN 30 DAYS (${res.expiring_soon_count}):*\n`;
        for (const b of res.expiring_soon) {
          const daysText = b.days_until_expiry <= 0 ? 'Today!' : `in ${b.days_until_expiry} days (${b.expiry_date})`;
          const badge = b.days_until_expiry <= 7 ? '🚨' : '⏳';
          reply += `${badge} *${b.product_name}* (Batch: ${b.batch_number})\n` +
            `  Expires: *${daysText}* | Qty: ${b.stock_qty} ${b.unit}\n`;
        }
        reply += '\n';
      }

      if (res.expired_count === 0 && res.expiring_soon_count === 0) {
        reply += `✅ No products expiring within the next 30 days! Total active batches: ${res.all_active_batches}.\n\n`;
      }

      reply += `🔄 *FEFO Principle Active:* The billing system automatically dispenses earlier expiring batches first during sales to prevent waste.`;
      return reply;
    } catch (err) {
      return `Could not retrieve expiry information: ${err.message}`;
    }
  }

  // 4. LOW STOCK & REORDER ALERTS
  if (lower.includes('running out') || lower.includes('low stock') || lower.includes('reorder') || lower.includes('shortage')) {
    const low = await tools.get_low_stock.execute({});
    if (low.count === 0) return '✅ All inventory items are currently healthy above reorder levels.';
    const itemsList = low.low_stock_items
      .map(i => `• *${i.name}*: only *${i.stock_qty} ${i.unit}* remaining (Reorder threshold: ${i.reorder_level})`)
      .join('\n');
    return `⚠️ *${low.count} Item(s) Running Low on Stock:*\n\n${itemsList}\n\nPlease replenish these items soon!`;
  }

  // 5. CREATE NEW PRODUCT SKU IN INVENTORY CATALOG
  if (
    (lower.includes('add product') || lower.includes('new product') || lower.includes('create product') ||
     lower.includes('new item') || lower.includes('add item') || lower.includes('add sku') || lower.includes('new sku')) &&
    !lower.includes('make a bill') && !lower.includes('add to bill') && !lower.includes('to the bill') &&
    !lower.includes('came in') && !lower.includes('cart') && !lower.includes('in cart') && !lower.includes('to cart')
  ) {
    const colonMatch = text.match(/(?:add product|new product|create product|new item|add item|add sku|new sku)\s*[:\-]?\s*([^,\n;]+)/i);
    let namePart = colonMatch ? colonMatch[1].trim() : '';

    // Guard against dummy phrases
    if (namePart.toLowerCase() === 's' || namePart.toLowerCase().includes('cart') || namePart.toLowerCase() === 'items') {
      namePart = '';
    }

    if (namePart && namePart.length >= 2) {
      namePart = namePart.replace(/\s+(cost|mrp|price|gst|stock|category|unit).*$/i, '').trim();

      const costMatch = text.match(/cost\s*[₹rRs\.:]*\s*(\d+(?:\.\d+)?)/i);
      const mrpMatch = text.match(/(?:mrp|sell\s*(?:price)?|price)\s*[₹rRs\.:]*\s*(\d+(?:\.\d+)?)/i);
      const gstMatch = text.match(/gst\s*(?:slab)?\s*[₹rRs\.:]*\s*(\d+)/i);
      const stockMatch = text.match(/stock\s*[₹rRs\.:]*\s*(\d+(?:\.\d+)?)/i) || text.match(/(\d+)\s*(?:packets?|pkts?|pcs?|kg|pieces?)/i);
      const unitMatch = text.match(/\b(kg|g|grams?|litre|litres?|l|ml|packet|packets?|pkts?|piece|pieces?|pcs?|dozen)\b/i);
      const catMatch = text.match(/\b(staples|packaged|dairy|household|personal_care)\b/i);

      const sell_price = mrpMatch ? parseFloat(mrpMatch[1]) : (costMatch ? parseFloat(costMatch[1]) * 1.25 : 50);
      const cost_price = costMatch ? parseFloat(costMatch[1]) : sell_price * 0.8;

      let gst_slab = 5;
      if (gstMatch) {
        const parsed = parseInt(gstMatch[1], 10);
        if ([0, 5, 12, 18, 28].includes(parsed)) gst_slab = parsed;
      } else if (lower.includes('dairy') || lower.includes('milk') || lower.includes('butter') || lower.includes('noodle')) {
        gst_slab = 12;
      } else if (lower.includes('soap') || lower.includes('detergent') || lower.includes('biscuit') || lower.includes('cleaner')) {
        gst_slab = 18;
      } else if (lower.includes('rice') || lower.includes('salt') || lower.includes('dal') || lower.includes('grain')) {
        gst_slab = 0;
      }

      // Generate clean unique SKU code e.g. "GOOD-DAY-100G-452"
      const words = namePart.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      let sku = words.map(w => w.slice(0, 4)).slice(0, 3).join('-') + '-' + Math.floor(100 + Math.random() * 900);
      if (sku.length < 5) sku = 'SKU-' + Date.now().toString().slice(-6);

      let unit = 'packet';
      if (unitMatch) {
        const u = unitMatch[1].toLowerCase();
        if (u.startsWith('kg')) unit = 'kg';
        else if (u.startsWith('g')) unit = 'g';
        else if (u.startsWith('l')) unit = 'litre';
        else if (u.startsWith('ml')) unit = 'ml';
        else if (u.startsWith('piece') || u.startsWith('pcs')) unit = 'piece';
        else if (u.startsWith('dozen')) unit = 'dozen';
      }

      const is_loose = unit === 'kg' || unit === 'g' || lower.includes('loose');
      let category = catMatch ? catMatch[1].toLowerCase() : 'packaged';
      if (!catMatch) {
        if (lower.includes('atta') || lower.includes('rice') || lower.includes('dal') || lower.includes('sugar') || lower.includes('oil') || lower.includes('flour')) {
          category = 'staples';
        } else if (lower.includes('milk') || lower.includes('butter') || lower.includes('ghee') || lower.includes('paneer') || lower.includes('curd')) {
          category = 'dairy';
        } else if (lower.includes('soap') || lower.includes('shampoo') || lower.includes('paste') || lower.includes('brush') || lower.includes('cream')) {
          category = 'personal_care';
        } else if (lower.includes('surf') || lower.includes('detergent') || lower.includes('cleaner') || lower.includes('wash') || lower.includes('dish')) {
          category = 'household';
        }
      }

      const initialStock = stockMatch ? parseFloat(stockMatch[1]) : 0;

      try {
        const newProd = await tools.create_product.execute({
          name: namePart,
          sku,
          category,
          unit,
          is_loose,
          cost_price: Math.round(cost_price * 100) / 100,
          sell_price: Math.round(sell_price * 100) / 100,
          gst_slab,
          stock_qty: initialStock,
          reorder_level: 10
        });

        const margin = (newProd.sell_price - newProd.cost_price).toFixed(2);
        return (
          `✨ *New Product Created in Inventory Catalog!*\n\n` +
          `• Product: *${newProd.name}*\n` +
          `• SKU: \`${newProd.sku}\`\n` +
          `• Category: *${newProd.category}* (${newProd.is_loose ? 'Loose by weight' : 'Packaged'})\n` +
          `• MRP / Selling Price: *₹${newProd.sell_price}* per ${newProd.unit}\n` +
          `• Wholesale Cost: ₹${newProd.cost_price} (Margin: ₹${margin})\n` +
          `• GST Slab: *${newProd.gst_slab}%* (CGST: ${(newProd.gst_slab/2).toFixed(1)}% + SGST: ${(newProd.gst_slab/2).toFixed(1)}%)\n` +
          `• Initial Stock: *${newProd.stock_qty} ${newProd.unit}*\n\n` +
          `✅ *Live in Inventory!* You can now see it in the web dashboard (/inventory) and bill it anytime with *"make a bill: 1 ${newProd.name}"*.`
        );
      } catch (err) {
        return `⚠️ Could not create product: ${err.message}`;
      }
    }
  }

  // 5b. STOCK IN / REPLENISHMENT (EXISTING PRODUCTS)
  if (lower.includes('came in') || lower.includes('received') || lower.includes('stock in') || lower.includes('replenish') || lower.includes('add stock')) {
    const prod = findProductInText(text);
    if (prod) {
      // Remove product name from text when parsing qty so numbers in product name (e.g. "guna 10 packets", "5kg", "100g") aren't mistakenly parsed as restock qty
      const textWithoutProd = text.replace(new RegExp(prod.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
      const qtyMatch = textWithoutProd.match(/(?:add stock|stock in|received|came in|qty|quantity)?\s*:?\s*(\d+(?:\.\d+)?)\s*(packets?|pkts?|pcs?|kg|litres?|l|pieces?)?/i) || text.match(/(\d+(?:\.\d+)?)\s*(packets?|pkts?|pcs?|kg|litres?|l|pieces?)?/i);
      const costMatch = text.match(/cost\s*[₹rRs\.:]*\s*(\d+(?:\.\d+)?)/i);
      const mrpMatch = text.match(/(?:mrp|sell\s*(?:price)?|price)\s*[₹rRs\.:]*\s*(\d+(?:\.\d+)?)/i);

      const qty = qtyMatch && parseFloat(qtyMatch[1]) > 0 ? parseFloat(qtyMatch[1]) : 50;
      const cost = costMatch ? parseFloat(costMatch[1]) : prod.cost_price;
      const mrp = mrpMatch ? parseFloat(mrpMatch[1]) : prod.sell_price;

      const res = await tools.receive_stock.execute({
        product_id: prod.id,
        qty,
        cost_price: cost,
        sell_price: mrp,
        notes: 'Telegram stock replenishment'
      });

      return `✅ *Stock Replenishment Recorded!*\nReceived ${qty} ${prod.unit} of *${prod.name}*.\nNew Stock Level: *${res.new_stock} ${prod.unit}*\nWholesale Cost: ₹${cost} | MRP: ₹${mrp}\n\nInventory updated atomically in store database.`;
    } else {
      return (
        `⚠️ Product not found in existing catalog.\n` +
        `To add it as a new product SKU, say:\n` +
        `*"add product: [Product Name], cost [₹], mrp [₹], gst [0/5/12/18]%, stock [qty]"*`
      );
    }
  }

  // 6. PRICE INQUIRY (e.g. "price of milk", "how much is tata salt", "mrp of atta")
  if (
    lower.includes('price') || lower.includes('rate') || lower.includes('mrp') ||
    lower.includes('cost of') || lower.includes('how much is') || lower.includes('how much for')
  ) {
    const prod = findProductInText(text);
    if (prod) {
      const margin = (prod.sell_price - prod.cost_price).toFixed(2);
      const marginPct = prod.cost_price > 0 ? ((margin / prod.cost_price) * 100).toFixed(1) : 0;
      return (
        `🏷️ *${prod.name}*\n` +
        `• Selling Price (MRP): *₹${prod.sell_price}* per ${prod.unit}\n` +
        `• Wholesale Cost: ₹${prod.cost_price} (Margin: ₹${margin} / ${marginPct}%)\n` +
        `• GST Slab: *${prod.gst_slab}%*\n` +
        `• Available Stock: *${prod.stock_qty} ${prod.unit}*`
      );
    }
  }

  // 7. STOCK QUANTITY INQUIRY (e.g. "how much sugar is left", "is milk in stock", "do we have rice")
  if (
    lower.includes('how much') || lower.includes('how many') || lower.includes('is left') ||
    lower.includes('in stock') || lower.includes('stock of') || lower.includes('do we have') ||
    lower.includes('available') || lower.includes('left?')
  ) {
    const prod = findProductInText(text);
    if (prod) {
      const stockRes = await tools.get_stock_level.execute({ product_id: prod.id });
      const statusIcon = stockRes.is_low_stock ? '⚠️ Low Stock' : '✅ In Stock';
      return (
        `📦 *${prod.name}*\n` +
        `• Available Quantity: *${stockRes.stock_qty} ${prod.unit}* (${statusIcon})\n` +
        `• Reorder Threshold: ${stockRes.reorder_level} ${prod.unit}\n` +
        `• MRP: ₹${prod.sell_price} per ${prod.unit}`
      );
    }
  }

  // 8. BILLING & POS: Start, Add, Edit, Preview, Finalize
  // Edit bill: drop/remove item
  if (lower.includes('drop') || lower.includes('remove from bill') || lower.includes('delete from bill')) {
    const prod = findProductInText(text);
    if (prod) {
      try {
        await tools.remove_bill_item.execute({ product_id: prod.id });
        const preview = await tools.preview_bill.execute({});
        return `🗑️ Removed *${prod.name}* from Draft Bill #${preview.bill_number}.\nCurrent Total: *₹${preview.grand_total}*.\nRemaining items: ${preview.items.map(i => `${i.qty}x ${i.name}`).join(', ')}`;
      } catch (err) {
        return `Could not remove item: ${err.message}`;
      }
    }
  }

  // Preview active bill
  if (lower.includes('preview') || lower.includes('view bill') || lower.includes('current bill') || lower.includes('bill status')) {
    const preview = await tools.preview_bill.execute({});
    if (preview.items && preview.items.length > 0) {
      const itemsList = preview.items.map(i => `• ${i.qty} ${i.unit} ${i.name} = ₹${i.total} (GST: ${i.gst})`).join('\n');
      return (
        `🧾 *Active Draft Bill #${preview.bill_number}:*\n\n` +
        `${itemsList}\n\n` +
        `• Taxable Subtotal: ₹${preview.taxable_subtotal}\n` +
        `• CGST: ₹${preview.cgst} | SGST: ₹${preview.sgst}\n` +
        `• *Grand Total: ₹${preview.grand_total}*\n` +
        `Payment Mode: ${(preview.payment_mode || 'UPI').toUpperCase()}\n\n` +
        `Say *"finalize bill"* to confirm, or add more items.`
      );
    }
    return `No active draft bill in progress. Say *"make a bill: 2kg sugar, 4 maggi, UPI"* to start one.`;
  }

  // 8. BILLING & POS: Start, Add, Edit, Preview, Finalize
  // Edit bill: drop/remove item
  if (lower.includes('drop') || lower.includes('remove from bill') || lower.includes('delete from bill')) {
    const prod = findProductInText(text);
    if (prod) {
      try {
        await tools.remove_bill_item.execute({ product_id: prod.id });
        const preview = await tools.preview_bill.execute({});
        return `🗑️ Removed *${prod.name}* from Draft Bill #${preview.bill_number}.\nCurrent Total: *₹${preview.grand_total}*.\nRemaining items: ${preview.items.map(i => `${i.qty}x ${i.name}`).join(', ')}`;
      } catch (err) {
        return `Could not remove item: ${err.message}`;
      }
    }
  }

  // Preview active bill
  if (lower.includes('preview') || lower.includes('view bill') || lower.includes('current bill') || lower.includes('bill status')) {
    const preview = await tools.preview_bill.execute({});
    if (preview.items && preview.items.length > 0) {
      contextBag.buttons = [
        [
          { text: '💵 Pay Cash', callback_data: 'pay_cash' },
          { text: '📱 Pay UPI', callback_data: 'pay_upi' }
        ],
        [
          { text: '💳 Pay Card', callback_data: 'pay_card' },
          { text: '📒 Put on Khata', callback_data: 'pay_khata' }
        ]
      ];
      const itemsList = preview.items.map(i => `• ${i.qty} ${i.unit} ${i.name} = ₹${i.total} (GST: ${i.gst})`).join('\n');
      return (
        `🧾 *Active Draft Bill #${preview.bill_number}:*\n\n` +
        `${itemsList}\n\n` +
        `• Taxable Subtotal: ₹${preview.taxable_subtotal}\n` +
        `• CGST: ₹${preview.cgst} | SGST: ₹${preview.sgst}\n` +
        `• *Grand Total: ₹${preview.grand_total}*\n` +
        `Payment Mode: ${(preview.payment_mode || 'UPI').toUpperCase()}\n\n` +
        `Tap a payment button below to finalize, or continue adding items.`
      );
    }
    return `No active draft bill in progress. Say *"make a bill: 2kg sugar, 4 maggi, UPI"* to start one.`;
  }

  // Add items prompt when user says "add products in cart" or "add items" without specifying items
  if (lower === 'add products in cart' || lower === 'add items in cart' || lower === 'add to cart' || lower === 'add items' || lower === 'add products') {
    return (
      `🛒 *Add Items to Bill / Cart:*\n\n` +
      `Tell me the items and quantities you'd like to add, for example:\n` +
      `• *"make a bill: 2kg rice, 3 soap"*\n` +
      `• *"add to bill: 1 Aashirvaad atta 5kg, 4 Maggi"*\n` +
      `• *"add 2kg sugar, UPI"*\n\n` +
      `Once added, say *"finalize bill"* to complete the sale!`
    );
  }

  // Check if message is related to Khata / Customer ledger (NOT billing)
  const isKhataIntent = (
    lower.includes('credit') || lower.includes('khata') || lower.includes('customer') ||
    lower.includes('balance') || lower.includes('owes') || lower.includes('paid') ||
    lower.includes('cleared') || lower.includes('settle')
  ) && !lower.includes('make a bill') && !lower.includes('add to bill') && !lower.includes('add in cart') && !lower.includes('add to cart');

  // Check if message is adding items to bill/cart
  const isAddingItems = !isKhataIntent && (
    lower.includes('make a bill') || lower.includes('bill:') || lower.includes('cut a bill') ||
    lower.includes('add to bill') || lower.includes('add to the bill') || lower.includes('add in cart') ||
    lower.includes('add to cart') || lower.includes('bill for') || lower.startsWith('bill ') ||
    // Or clause like "2kg rice, 3 dettol soap"
    (text.match(/\d+(?:\.\d+)?\s*(?:kg|g|packet|packets?|pkts?|piece|pieces?|pcs?|l|litres?)?\s+[a-zA-Z]+/i) &&
     (lower.includes('rice') || lower.includes('soap') || lower.includes('sugar') || lower.includes('atta') ||
      lower.includes('maggi') || lower.includes('milk') || lower.includes('oil') || lower.includes('dal') ||
      lower.includes('salt') || lower.includes('biscuit') || /\bguna\b/i.test(lower) || lower.includes('butter')))
  );

  if (isAddingItems) {
    if (!session.currentDraftBillId) {
      const defaultMode = storePrefs.default_payment_mode || 'upi';
      const mode = lower.includes('cash') ? 'cash' : lower.includes('card') ? 'card' : lower.includes('khata') ? 'khata' : lower.includes('upi') ? 'upi' : defaultMode;
      await tools.start_draft_bill.execute({ payment_mode: mode });
    }

    const itemsAdded = [];
    // Clean prefix
    const cleanItemsText = text.replace(/(?:make a bill|cut a bill|add to the bill|add to bill|add to cart|add in cart|bill for|bill)\s*[:\-]?/ig, '')
                               .replace(/and finalize(?: the bill)?/ig, '');

    const clauses = cleanItemsText.split(/,|\band\b/i);

    for (const clause of clauses) {
      const trimmed = clause.trim();
      if (!trimmed || trimmed.toLowerCase().includes('finalize') || trimmed.toLowerCase().includes('cash') || trimmed.toLowerCase().includes('upi')) continue;

      const prod = findProductInText(trimmed);
      if (prod) {
        const qtyMatch = trimmed.match(/(\d+(?:\.\d+)?)/);
        const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
        try {
          await tools.add_bill_item.execute({ product_id: prod.id, qty });
          itemsAdded.push(`${qty} ${prod.unit} ${prod.name}`);
        } catch (err) {
          itemsAdded.push(`[Oversell blocked: ${prod.name} (${err.message})]`);
        }
      }
    }

    // If user asked to add items AND finalize in the same sentence (e.g. "2kg rice, 3 dettol soap and finalize the bill")
    if (lower.includes('finalize')) {
      const defaultMode = storePrefs.default_payment_mode || 'upi';
      const paymentMode = lower.includes('khata') ? 'khata' : lower.includes('cash') ? 'cash' : lower.includes('card') ? 'card' : lower.includes('upi') ? 'upi' : defaultMode;
      try {
        const res = await tools.finalize_bill.execute({ payment_mode: paymentMode });
        session.lastFinalizedBillId = res.bill_id || res.id;
        contextBag.buttons = [
          [{ text: '📄 Download GST Invoice PDF', callback_data: `get_pdf_${res.bill_id || res.id}` }]
        ];
        return (
          `✅ *Bill #${res.bill_number} Finalized Successfully!*\n\n` +
          `Added & Billed: ${itemsAdded.join(', ')}\n` +
          `• Total Amount: *₹${res.total_amount}*\n` +
          `• Payment Mode: *${res.payment_mode.toUpperCase()}*\n` +
          `• Total Tax (CGST+SGST): ₹${(res.cgst + res.sgst).toFixed(2)}\n` +
          `• Stock decremented atomically in store database.\n\n` +
          `Tap below or say *"send me that bill as a PDF"* to download the official GST invoice.`
        );
      } catch (err) {
        return `⚠️ Finalize Error: ${err.message}`;
      }
    }

    if (itemsAdded.length > 0) {
      const preview = await tools.preview_bill.execute({});
      contextBag.buttons = [
        [
          { text: '💵 Pay Cash', callback_data: 'pay_cash' },
          { text: '📱 Pay UPI', callback_data: 'pay_upi' }
        ],
        [
          { text: '💳 Pay Card', callback_data: 'pay_card' },
          { text: '📒 Put on Khata', callback_data: 'pay_khata' }
        ]
      ];
      return (
        `🧾 *Draft Bill #${preview.bill_number} Updated:*\n` +
        `Added: ${itemsAdded.join(', ')}\n\n` +
        `• Subtotal: ₹${preview.taxable_subtotal}\n` +
        `• CGST: ₹${preview.cgst} | SGST: ₹${preview.sgst}\n` +
        `• *Total Amount: ₹${preview.grand_total}*\n\n` +
        `Choose payment method below to finalize, or continue adding items:`
      );
    }
  }

  // Finalize active bill (when user says just "finalize bill" or "finalize with cash")
  if (lower.includes('finalize') || lower.includes('cut it') || lower.includes('finish bill') || lower.includes('complete bill') || lower.includes('done with bill')) {
    // Check if bill exists and has items before calling finalize
    if (!session.currentDraftBillId) {
      return `⚠️ Your draft bill is currently empty. Please add items first (e.g. *"make a bill: 2kg rice, 3 soap, cash"*) before finalizing.`;
    }

    try {
      const preview = await tools.preview_bill.execute({});
      if (!preview.items || preview.items.length === 0) {
        return `⚠️ Your draft bill is currently empty. Please add items first (e.g. *"make a bill: 2kg rice, 3 soap, cash"*) before finalizing.`;
      }
    } catch (_) {}

    const defaultMode = storePrefs.default_payment_mode || 'upi';
    const paymentMode = lower.includes('khata') ? 'khata' : lower.includes('cash') ? 'cash' : lower.includes('card') ? 'card' : lower.includes('upi') ? 'upi' : defaultMode;
    try {
      const res = await tools.finalize_bill.execute({ payment_mode: paymentMode });
      session.lastFinalizedBillId = res.bill_id || res.id;
      contextBag.buttons = [
        [{ text: '📄 Download GST Invoice PDF', callback_data: `get_pdf_${res.bill_id || res.id}` }]
      ];
      return (
        `✅ *Bill #${res.bill_number} Finalized Successfully!*\n\n` +
        `• Total Amount: *₹${res.total_amount}*\n` +
        `• Payment Mode: *${res.payment_mode.toUpperCase()}*\n` +
        `• Total Tax (CGST+SGST): ₹${(res.cgst + res.sgst).toFixed(2)}\n` +
        `• Stock decremented atomically in store database.\n\n` +
        `Tap below or say *"send me that bill as a PDF"* to download the official GST invoice.`
      );
    } catch (err) {
      return `⚠️ Finalize Error: ${err.message}`;
    }
  }

  // Helper: find customer by name or phone with exact-longest name matching first
  function findCustomerInText(targetText, customersList) {
    if (!customersList || customersList.length === 0) return null;
    const t = targetText.toLowerCase();

    // 1. Sort by name length descending so e.g. "Gunavathi" is matched before "Guna"
    const sorted = [...customersList].sort((a, b) => (b.name || '').length - (a.name || '').length);

    // 2. Exact full customer name match in target text
    for (const c of sorted) {
      if (!c.name) continue;
      const cName = c.name.toLowerCase().trim();
      if (t.includes(cName)) {
        return c;
      }
      if (c.phone && t.includes(c.phone.trim())) {
        return c;
      }
    }

    // 3. Word boundary match on single-word names (e.g. \bramesh\b, \bguna\b)
    for (const c of sorted) {
      if (!c.name) continue;
      const firstName = c.name.split(/\s+/)[0].toLowerCase().trim();
      if (firstName.length >= 3) {
        const regex = new RegExp(`\\b${firstName}\\b`, 'i');
        if (regex.test(t)) {
          return c;
        }
      }
    }

    return null;
  }

  // 9. KHATA (CREDIT LEDGER)
  // 9a. Add new customer / Update customer in Khata
  const phoneMatch = text.match(/\b([6-9]\d{9})\b/);
  const isAddCustomerIntent =
    lower.includes('add customer') ||
    lower.includes('new customer') ||
    lower.includes('create customer') ||
    lower.includes('add khata') ||
    lower.includes('new khata') ||
    lower.includes('add to khata') ||
    lower.includes('customer on credit') ||
    lower.includes('customer in khata') ||
    (phoneMatch && !lower.includes('bill') && !lower.includes('search') && !lower.includes('price'));

  if (isAddCustomerIntent && !lower.includes('make a bill')) {
    // Check if user just typed the prompt command without customer details
    const strippedCommand = text
      .replace(/(?:add a new customer in khata ledger|add new customer on credit ledger|add new customer in khata|add new customer|add customer to khata|new customer|create customer|add customer|add khata|new khata|on credit ledger|in credit ledger|credit ledger)\s*[:\-]?/ig, '')
      .trim();

    // Parse phone
    const phone = phoneMatch ? phoneMatch[1] : null;

    // Extract balance if provided: e.g. "1000", "₹500", "balance: 500"
    let balance = 0;
    const balanceMatch = strippedCommand.match(/(?:balance|credit|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*$/i) ||
                         strippedCommand.match(/(?:balance|credit|rs\.?|₹)\s*(\d+(?:\.\d+)?)/i);
    if (balanceMatch && (!phone || balanceMatch[1] !== phone)) {
      balance = parseFloat(balanceMatch[1]);
    }

    // Clean name: remove phone and balance numbers
    let rawName = strippedCommand;
    if (phone) {
      rawName = rawName.replace(phone, '');
    }
    if (balanceMatch && balance > 0) {
      rawName = rawName.replace(balanceMatch[0], '');
    }
    const cleanName = rawName.replace(/[,;:\-]/g, ' ').replace(/\s+/g, ' ').trim();

    if (cleanName.length >= 2) {
      try {
        // Fetch existing customers to see if this customer or phone already exists
        const existingList = await tools.get_customer_balance.execute({ search: '' });
        const existing = (existingList.customers || []).find(c =>
          (phone && c.phone === phone) ||
          c.name.toLowerCase() === cleanName.toLowerCase()
        );

        if (existing) {
          // If customer exists with same phone or name, update name/balance!
          const updated = await tools.update_customer.execute({
            customer_id: existing.id,
            name: cleanName,
            phone: phone || existing.phone,
            khata_balance: balance > 0 ? balance : existing.khata_balance
          });

          return (
            `✨ *Customer Updated in Khata Ledger!*\n\n` +
            `• Customer: *${updated.name}*\n` +
            `• Phone Number: *${updated.phone || 'Not provided'}*\n` +
            `• Current Credit Balance: *₹${updated.khata_balance}*\n\n` +
            `✅ Synced in store database! You can now put bills on their credit using *"finalize on ${updated.name}'s khata"* or record settlements with *"${updated.name} paid ₹..."*.`
          );
        }

        // Otherwise create new customer
        const newCust = await tools.create_customer.execute({
          name: cleanName,
          phone,
          initial_balance: balance
        });

        return (
          `✨ *New Customer Added to Khata Ledger!*\n\n` +
          `• Customer Name: *${newCust.name}*\n` +
          `• Phone Number: *${newCust.phone || 'Not provided'}*\n` +
          `• Opening Credit Balance: *₹${newCust.khata_balance}*\n\n` +
          `✅ Active in store database! You can now put bills on their credit using *"finalize on ${newCust.name}'s khata"* or record settlements with *"${newCust.name} paid ₹..."*.`
        );
      } catch (err) {
        return `⚠️ Could not create Khata customer: ${err.message}`;
      }
    } else {
      return (
        `📒 *How to Add a Customer to Khata:*\n\n` +
        `Send a message in this format:\n` +
        `*"add customer: [Customer Name], [10-digit Phone], [Starting Balance]"*\n\n` +
        `*Example:* "add customer: Gunavathi, 6374649820, 1000"`
      );
    }
  }

  // 9b. Put money on customer credit ("put ₹500 on Ramesh's credit", "add 100 on Gunavathi credit", "put 100 on guna credit")
  const isPutCredit =
    (lower.includes('credit') || lower.includes('khata')) &&
    (lower.includes('put ') || lower.includes('add ') || lower.includes('charge ')) &&
    !lower.includes('who owes') && !lower.includes('paid');

  if (isPutCredit) {
    const custRes = await tools.get_customer_balance.execute({ search: '' });
    const customers = custRes.customers || [];
    const cust = findCustomerInText(text, customers);

    const amtMatch = text.match(/(?:put|add|charge)?\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)/i);
    const amt = amtMatch ? parseFloat(amtMatch[1]) : 0;

    if (cust && amt > 0) {
      try {
        const res = await tools.add_khata_credit.execute({
          customer_id: cust.id,
          amount: amt,
          notes: 'Telegram credit addition'
        });

        return (
          `📒 *Store Credit Added to Khata!*\n\n` +
          `Added *₹${amt}* on credit for *${cust.name}*.\n` +
          `• Previous Balance: ₹${cust.khata_balance}\n` +
          `• *New Outstanding Balance: ₹${res.new_balance}*\n` +
          `• Customer Phone: ${cust.phone || 'N/A'}\n\n` +
          `Transaction logged in store credit ledger.`
        );
      } catch (err) {
        return `⚠️ Could not add store credit: ${err.message}`;
      }
    }
  }

  // 9c. Record customer payment ("Ramesh paid ₹300", "Gunavathi paid 10", "Anita cleared 500", "Guna paid 1000")
  if (lower.includes('paid') || lower.includes('cleared') || lower.includes('settled')) {
    const custRes = await tools.get_customer_balance.execute({ search: '' });
    const customers = custRes.customers || [];
    const cust = findCustomerInText(text, customers);

    const amtMatch = text.match(/(?:paid|cleared|settled)?\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)/i);
    const amt = amtMatch ? parseFloat(amtMatch[1]) : 0;

    if (cust && amt > 0) {
      try {
        const pRes = await tools.record_khata_payment.execute({
          customer_id: cust.id,
          amount: amt,
          payment_mode: lower.includes('upi') ? 'upi' : 'cash',
          notes: 'Telegram chat payment'
        });

        return (
          `✅ *Khata Payment Recorded!*\n\n` +
          `Received *₹${amt}* from *${cust.name}* (${lower.includes('upi') ? 'UPI' : 'Cash'}).\n` +
          `• Previous Balance: ₹${cust.khata_balance}\n` +
          `• *Remaining Khata Balance: ₹${pRes.new_balance}*\n` +
          `Payment audit entry added to customer ledger.`
        );
      } catch (err) {
        return `⚠️ Could not record payment: ${err.message}`;
      }
    }
  }

  // 9d. Who owes money / Khata directory list
  if (
    lower.includes('who owes') || lower.includes('list khata') || lower.includes('khata list') ||
    lower.includes('credit balances') || lower.includes('all customers') || lower.includes('pending credit') ||
    (lower.includes('customer balance') && !lower.includes('\''))
  ) {
    const custRes = await tools.get_customer_balance.execute({ search: '' });
    if (custRes.found && custRes.customers.length > 0) {
      const debtors = custRes.customers.filter(c => c.khata_balance > 0);
      const totalCredit = debtors.reduce((sum, c) => sum + c.khata_balance, 0);
      let reply = `📒 *Khata Credit Balances (${debtors.length} customer${debtors.length === 1 ? '' : 's'} with pending balance):*\n\n`;
      for (const c of custRes.customers) {
        const status = c.khata_balance > 0 ? `⚠️ *₹${c.khata_balance}* Due` : `✅ Clear (₹0)`;
        reply += `• *${c.name}*: ${status} (📞 ${c.phone || 'No phone'})\n`;
      }
      reply += `\n*Total Store Credit Outstanding:* ₹${totalCredit}\nSay "[Customer] paid ₹[Amount]" or "put ₹[Amount] on [Customer] credit".`;
      return reply;
    }
  }

  // 9f. KHATA PAYMENT REMINDERS (English, Hindi, Tamil with WhatsApp & UPI Links)
  if (
    lower.includes('reminder') || lower.includes('remind') ||
    lower.includes('yaad dilao') || lower.includes('ninaivuttal') ||
    lower.includes('send reminder') || lower.includes('payment notice')
  ) {
    const custRes = await tools.get_customer_balance.execute({ search: '' });
    const customers = custRes.customers || [];
    const cust = findCustomerInText(text, customers);

    const storeName = storePrefs.shop_name || 'Nebula Supermarket & Retail';
    const storeUpi = storePrefs.upi_id || 'nebularetail@okaxis';

    // 1. Reminder for a specific customer
    if (cust) {
      if (cust.khata_balance <= 0) {
        return `✅ *${cust.name}* has zero outstanding balance! No payment reminder needed.`;
      }

      const cleanPhone = cust.phone ? cust.phone.replace(/[^0-9]/g, '').slice(-10) : null;
      const upiPayUrl = `upi://pay?pa=${encodeURIComponent(storeUpi)}&pn=${encodeURIComponent(storeName)}&am=${cust.khata_balance}&cu=INR&tn=${encodeURIComponent(`Khata Settlement - ${cust.name}`)}`;

      let reminderBody = '';
      if (userLang === 'hi') {
        reminderBody = `नमस्ते ${cust.name} जी, ${storeName} से यह एक विनम्र भुगतान अनुस्मारक है। आपका खाता बकाया ₹${cust.khata_balance} है। कृपया इस UPI पर भुगतान करें: ${storeUpi}। धन्यवाद!`;
      } else if (userLang === 'ta') {
        reminderBody = `வணக்கம் ${cust.name}, ${storeName} சார்பாக இந்த கட்டண நினைவூட்டல். உங்கள் நிலுவை பாக்கி தொகை ₹${cust.khata_balance}. தயவுசெய்து இந்த UPI மூலம் செலுத்தவும்: ${storeUpi}. நன்றி!`;
      } else {
        reminderBody = `Dear ${cust.name}, this is a gentle payment reminder from ${storeName}. Your pending Khata balance is ₹${cust.khata_balance}. Kindly pay via UPI to: ${storeUpi}. Thank you!`;
      }

      if (cleanPhone) {
        const fullWaText = `${reminderBody}\n\n👉 Pay directly via UPI:\n${upiPayUrl}`;
        const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(fullWaText)}`;
        contextBag.buttons = [
          [{ text: '📲 Share on WhatsApp', url: waUrl }]
        ];
      }

      return (
        `📢 *Payment Reminder Generated for ${cust.name}:*\n\n` +
        `• Customer Phone: ${cust.phone || 'Not registered'}\n` +
        `• Outstanding Balance: *₹${cust.khata_balance}*\n` +
        `• Store UPI ID: \`${storeUpi}\`\n\n` +
        `📝 *Message Preview (${userLang.toUpperCase()}):*\n` +
        `_"${reminderBody}"_\n\n` +
        (cleanPhone
          ? `Tap below to send this reminder directly to ${cust.name}'s WhatsApp with 1-click UPI pay link!`
          : `⚠️ Customer has no phone number on file. You can register their mobile number by saying *"add customer: ${cust.name}, [Phone]"*.`)
      );
    }

    // 2. Overview of all debtors needing reminders
    const debtors = customers.filter(c => c.khata_balance > 0);
    if (debtors.length === 0) {
      return `🎉 *Great news!* There are currently zero outstanding Khata balances in the store.`;
    }

    const totalDue = debtors.reduce((sum, c) => sum + c.khata_balance, 0);
    let reply = `📢 *Khata Payment Reminders Overview (${debtors.length} Pending):*\n\n`;
    for (const d of debtors) {
      const phoneTag = d.phone ? `📞 ${d.phone}` : '⚠️ No Phone';
      reply += `• *${d.name}*: Due *₹${d.khata_balance}* (${phoneTag})\n`;
    }
    reply += `\n*Total Credit to Collect:* ₹${totalDue}\n\n` +
      `💡 *To send a reminder to any customer, say:*\n` +
      `• *"send khata reminder to ${debtors[0].name}"*`;
    return reply;
  }

  // 9e. Specific customer balance inquiry ("Ramesh's balance", "Gunavathi balance?", "how much does Guna owe")
  if (lower.includes('balance') || lower.includes('khata') || lower.includes('credit') || lower.includes('owe') || lower.includes('due')) {
    const custRes = await tools.get_customer_balance.execute({ search: '' });
    const customers = custRes.customers || [];
    const cust = findCustomerInText(text, customers);

    if (cust) {
      const status = cust.khata_balance > 0 ? `*₹${cust.khata_balance}* outstanding credit` : `*Zero balance* (No dues)`;
      return (
        `📒 *Khata Details for ${cust.name}:*\n` +
        `• Current Balance: ${status}\n` +
        `• Phone: ${cust.phone || 'Not registered'}\n` +
        `• Address: ${cust.address || 'Neighborhood regular'}\n\n` +
        `Say *"${cust.name} paid ₹..."* to settle or *"put ₹... on ${cust.name} credit"* to add to balance.`
      );
    }
  }

  // 10. REPORTS & DOCUMENTS
  // PDF invoice request: "send me that bill as a PDF", "bill #37 pdf", "fill pdf", "invoice pdf", "pdf"
  if (
    lower.includes('pdf') ||
    lower.includes('invoice') ||
    lower.includes('bill copy') ||
    lower.includes('send bill') ||
    lower.includes('download bill') ||
    lower.includes('get bill') ||
    lower.includes('print bill')
  ) {
    const billIdMatch = text.match(/#?(\d+)/);
    let billId = billIdMatch ? parseInt(billIdMatch[1], 10) : session.lastFinalizedBillId;

    // If no explicit bill ID mentioned and not in session, fetch the most recent finalized invoice across the store
    if (!billId) {
      try {
        const latest = await apiClient.getLatestInvoice();
        if (latest && latest.id) {
          billId = latest.id;
        }
      } catch (_) {}
    }

    if (!billId) {
      billId = 1;
    }

    try {
      await tools.get_invoice_pdf.execute({ bill_id: billId });
      return `📄 *GST Tax Invoice #${billId} Generated!*\nOfficial PDF document attached and ready for download below.`;
    } catch (err) {
      return `Could not generate PDF: ${err.message}`;
    }
  }

  // Scheduled weekly analysis deck commands: "schedule weekly analysis deck", "enable auto weekly deck", "send scheduled deck now"
  if (
    (lower.includes('schedule') || lower.includes('auto')) &&
    (lower.includes('deck') || lower.includes('weekly') || lower.includes('analysis') || lower.includes('presentation'))
  ) {
    if (lower.includes('disable') || lower.includes('stop') || lower.includes('off') || lower.includes('cancel')) {
      try {
        await tools.set_preference.execute({ key: 'auto_weekly_deck_enabled', value: 'false' });
        return `⏸️ *Auto Weekly Analysis Deck Disabled!*\nAutomated scheduled delivery of PowerPoint analysis presentations has been paused. You can re-enable anytime with *"enable auto weekly deck"*.`;
      } catch (err) {
        return `⚠️ Could not update preference: ${err.message}`;
      }
    } else {
      try {
        await tools.set_preference.execute({ key: 'auto_weekly_deck_enabled', value: 'true' });
        await tools.set_preference.execute({ key: 'owner_telegram_chat_id', value: String(chatId) });
        if (lower.includes('now') || lower.includes('send') || lower.includes('trigger')) {
          await tools.get_analysis_deck.execute({ date_range: '7d' });
          return `✅ *Weekly Analysis Deck Scheduled & Sent!*\n\n• Automated delivery: *ACTIVE*\n• Delivery target: This Telegram Chat (${chatId})\n• Frequency: Weekly auto-delivery\n\nYour fresh 7-day presentation deck is attached below!`;
        }
        return `✅ *Automated Weekly Analysis Deck Scheduled!*\n\n• Auto-Delivery Status: *ACTIVE*\n• Registered Chat ID: *${chatId}*\n• Deck Format: Microsoft PowerPoint (.pptx)\n• Contents: 7-day revenue velocity, top SKUs, GST tax breakdown, and low stock warnings.\n\nYou will automatically receive a fresh executive slide deck every week in this chat!`;
      } catch (err) {
        return `⚠️ Could not schedule weekly deck: ${err.message}`;
      }
    }
  }

  // PPTX analysis deck request: "make this week's sales analysis deck"
  if (lower.includes('deck') || lower.includes('analysis') || lower.includes('powerpoint') || lower.includes('presentation') || lower.includes('pptx')) {
    const range = lower.includes('30d') || lower.includes('month') ? '30d' : lower.includes('today') ? 'today' : '7d';
    try {
      await tools.get_analysis_deck.execute({ date_range: range });
      return `📊 *Weekly Store Operations Analysis Deck Generated!*\nFull PowerPoint presentation (.pptx) with sales trends, category charts, and stock health is attached below.`;
    } catch (err) {
      return `Could not generate analysis deck: ${err.message}`;
    }
  }

  // Daily close / Today's sales: "today's sales?", "close the day"
  if (lower.includes('today') || lower.includes('close the day') || lower.includes('daily close') || lower.includes('sales summary')) {
    const close = await tools.get_daily_close.execute({});
    return (
      `📊 *Today's Operations Summary (${new Date().toLocaleDateString('en-IN')}):*\n\n` +
      `• Gross Sales: *₹${close.today_sales}*\n` +
      `• Total Bills Cut: *${close.bills_cut}*\n` +
      `• GST Collected: *₹${close.tax_collected}*\n` +
      `• Khata Outstanding: *₹${close.khata_outstanding}*\n` +
      `• Low Stock Alerts: *${close.low_stock_count} items*\n\n` +
      `Store database is healthy and synced.`
    );
  }

  // 11. GENERAL STORE / PRODUCT DIRECT LOOKUP FALLBACK
  // If the user entered just a product name (e.g. "milk", "Tata Salt", "butter", "rice", "maggi")
  const directProduct = findProductInText(text);
  if (directProduct) {
    const margin = (directProduct.sell_price - directProduct.cost_price).toFixed(2);
    return (
      `🔍 *Found Product: ${directProduct.name}*\n` +
      `• MRP: *₹${directProduct.sell_price}* per ${directProduct.unit}\n` +
      `• Wholesale Cost: ₹${directProduct.cost_price} (Margin: ₹${margin})\n` +
      `• In Stock: *${directProduct.stock_qty} ${directProduct.unit}* (Reorder at: ${directProduct.reorder_level})\n` +
      `• GST Slab: ${directProduct.gst_slab}%\n\n` +
      `Say *"make a bill: 1 ${directProduct.name}"* to bill this item.`
    );
  }

  // 12. GENERAL SHOPKEEPER FALLBACK
  return (
    `🏪 *Nebula Supermarket • Store Ops (Munimji)*\n` +
    `_Daily Provisions • Honest Measures • Lasting Trust_\n\n` +
    `I am ready to assist with any store operations:\n` +
    `• *Check stock & rates:* "price of milk", "how much sugar is left?", "show all products"\n` +
    `• *Quick Billing:* "make a bill: 2kg sugar, 1 atta, 4 maggi, UPI", "drop sugar", "finalize"\n` +
    `• *Khata Ledger:* "Ramesh's balance", "who owes money?", "Anita paid ₹500"\n` +
    `• *Reports & Invoices:* "today's sales", "send bill as PDF", "make sales analysis deck"\n` +
    `• *Store Profile:* "store address", "timings", "GSTIN", "tax slabs"`
  );
}

/**
 * Process an incoming user message through the AI Agent control loop.
 */
export async function processAgentMessage(chatId, userMessageText) {
  const contextBag = { documents: [], buttons: [] };
  const tools = createAgentTools(chatId, contextBag);
  const session = sessionStore.getSession(chatId);

  let storePreferences = {};
  try {
    storePreferences = await apiClient.getSettings();
  } catch (_) {}

  // 1. Run store orchestrator first for instant zero-latency operational commands
  const orchestratorReply = await runDeterministicToolOrchestrator(
    chatId,
    userMessageText,
    tools,
    contextBag,
    session,
    storePreferences
  );

  const isFallback = orchestratorReply.startsWith('🏪 *Nebula Supermarket • Store Ops (Munimji)*');

  // If orchestrator matched an operational action (billing, inventory, khata, pdf, store info), return immediately
  if (!isFallback) {
    sessionStore.addMessage(chatId, 'user', userMessageText);
    sessionStore.addMessage(chatId, 'assistant', orchestratorReply);
    return {
      text: orchestratorReply,
      documents: contextBag.documents,
      buttons: contextBag.buttons || []
    };
  }

  // 2. For novel, conversational, or general inquiries, answer via LLM if available
  if (hasApiKey()) {
    try {
      const modelInfo = getModel();
      if (modelInfo) {
        let productsSummary = '';
        try {
          const res = await tools.search_products.execute({ query: '' });
          if (res && res.products) {
            productsSummary = res.products
              .map(p => `${p.name} (MRP ₹${p.sell_price}/${p.unit}, Stock: ${p.stock_qty})`)
              .join(', ');
          }
        } catch (_) {}

        const systemPrompt = `You are Munimji, the trusted, watchful store operations assistant and bookkeeper for Nebula Supermarket in Bengaluru.
Store: ${storePreferences.shop_name || 'Nebula Supermarket'}
Tagline: ${storePreferences.shop_tagline || 'Daily Provisions • Honest Measures • Lasting Trust'}
Address: ${storePreferences.shop_address || 'Shop No. 12, Main Market Road, Near Gandhi Circle, Bengaluru, Karnataka — 560001'}
Phone: ${storePreferences.shop_phone || '+91 98450 12345'}
GSTIN: ${storePreferences.shop_gstin || '29AAAAA0000A1Z5'} (Karnataka)
Timings: 7:00 AM - 10:30 PM, Open 7 Days
Payment Modes: UPI (GPay, PhonePe, Paytm), Cash, Card, Khata (Store Credit).
Catalog Summary: ${productsSummary.slice(0, 1500)}

Guidelines:
- Persona: You are Munimji. Respectful, unflustered, sharp with numbers, and deeply attentive to the store's relationships.
- Speak in plain, crisp shopkeeper English mixed with familiar trade terms (khata, godown, bori, bill, chutta).
- Avoid cheerful startup fluff, buzzwords, or unnecessary exclamation marks.
- Bold product names, weights (kg/g/pkt), rates, and rupee amounts (₹).
- Format all currency with standard Indian commas and ₹ symbol (e.g. ₹1,250.00).
- When an item cannot be oversold, state the current physical stock clearly and ask for instructions.
- When reporting Khata, give clear, objective ledger figures.
- If they want to bill items, suggest: "make a bill: 2kg sugar, 4 Maggi, UPI".`;

        const history = sessionStore.getMessages(chatId).slice(-6).map(m => ({
          role: m.role,
          content: m.content
        }));
        history.push({ role: 'user', content: userMessageText });

        const response = await generateText({
          model: modelInfo.model,
          system: systemPrompt,
          messages: history,
          maxRetries: 0
        });

        const replyText = response.text || orchestratorReply;
        sessionStore.addMessage(chatId, 'user', userMessageText);
        sessionStore.addMessage(chatId, 'assistant', replyText);

        return {
          text: replyText,
          documents: contextBag.documents,
          buttons: contextBag.buttons || []
        };
      }
    } catch (err) {
      console.warn('[LLM Notice]: ' + (err.message || 'LLM unavailable') + '. Using store fallback.');
    }
  }

  // Fallback to store command help
  sessionStore.addMessage(chatId, 'user', userMessageText);
  sessionStore.addMessage(chatId, 'assistant', orchestratorReply);

  return {
    text: orchestratorReply,
    documents: contextBag.documents,
    buttons: contextBag.buttons || []
  };
}
