import express from 'express';
import { Bot, InputFile, InlineKeyboard, webhookCallback } from 'grammy';
import { config } from './config.js';
import { sessionStore } from './session.js';
import { processAgentMessage } from './agent.js';
import { transcribeTelegramVoice } from './voiceService.js';
import { startWeeklyReportScheduler, sendWeeklyAnalysisDeck } from './scheduler.js';
import { apiClient } from './apiClient.js';

if (!config.telegramToken) {
  console.warn('\n[WARNING]: TELEGRAM_BOT_TOKEN is not set in environment or .env file.');
  console.warn('The Telegram bot will start in mock mode or wait for token configuration.\n');
}

const bot = new Bot(config.telegramToken || 'DUMMY_TOKEN_FOR_INITIALIZATION');

// Middleware: Guard against Telegram update re-delivery (Idempotency)
bot.use(async (ctx, next) => {
  if (ctx.update && ctx.update.update_id) {
    if (sessionStore.isDuplicateUpdate(ctx.update.update_id)) {
      console.log(`[Idempotency Guard] Ignoring duplicate Telegram update #${ctx.update.update_id}`);
      return;
    }
  }
  await next();
});

// Command: /start
bot.command('start', async (ctx) => {
  await ctx.reply(
    '🏪 *Nebula Supermarket • Store Ops (Munimji)*\n' +
    '_Daily Provisions • Honest Measures • Lasting Trust_\n\n' +
    'Manage the whole store in plain shopkeeper English:\n' +
    '• "50 packets of Maggi came in, cost ₹12, MRP ₹14"\n' +
    '• "make a bill: 2kg sugar, 1 Aashirvaad atta 5kg, 4 Maggi, UPI"\n' +
    '• "drop the sugar, make it 6 Maggi"\n' +
    '• "choose payment method" / "pay with cash"\n' +
    '• "how much sugar is left?" / "what\'s running out?"\n' +
    '• "put ₹500 on Ramesh\'s credit" / "Ramesh\'s balance?"\n' +
    '• "send me that bill as a PDF"\n' +
    '• "make this week\'s sales analysis deck"\n' +
    '• "today\'s sales?" / "close the day"\n\n' +
    'Type `/new` to reset session.',
    { parse_mode: 'Markdown' }
  );
});

// Command: /new or /reset - resets conversation context while preserving store DB memory
bot.command(['new', 'reset'], async (ctx) => {
  const chatId = String(ctx.chat.id);
  sessionStore.resetSession(chatId);
  await ctx.reply('🔄 Chat session and active bill reset. Store preferences & inventory memory remain intact.');
});

// Global error handler for Grammy so polling never crashes
bot.catch((err) => {
  console.error('[Telegram Polling Error]:', err.message || err);
});

// Helper: send agent result with text, markdown fallback, inline buttons, and documents
async function sendAgentResult(ctx, chatId, result) {
  // Build inline keyboard if buttons provided
  const replyOptions = {};
  if (result.buttons && result.buttons.length > 0) {
    const keyboard = new InlineKeyboard();
    result.buttons.forEach((row, rowIdx) => {
      if (rowIdx > 0) keyboard.row();
      row.forEach(btn => {
        if (btn.url) {
          keyboard.url(btn.text, btn.url);
        } else {
          keyboard.text(btn.text, btn.callback_data);
        }
      });
    });
    replyOptions.reply_markup = keyboard;
  }

  // Send textual reply with markdown fallback
  if (result.text) {
    console.log(`[Telegram OUT] (${chatId}): "${result.text.slice(0, 80).replace(/\n/g, ' ')}..."`);
    try {
      await ctx.reply(result.text, { parse_mode: 'Markdown', ...replyOptions });
    } catch (formatErr) {
      // Fallback to plain text if Telegram markdown entity parsing fails
      await ctx.reply(result.text, replyOptions);
    }
  }

  // Send attached documents (PDF Invoices or PPTX Analysis Decks)
  if (result.documents && result.documents.length > 0) {
    for (const doc of result.documents) {
      try {
        await ctx.replyWithChatAction('upload_document');
      } catch (_) {}
      await ctx.replyWithDocument(new InputFile(doc.buffer, doc.filename), {
        caption: doc.caption
      });
    }
  }
}

import { identifyProductFromPhoto } from './visionService.js';

// Callback query handler for inline button taps (e.g. payment mode selection, PDF download & photo actions)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = String(ctx.chat.id);

  try {
    await ctx.answerCallbackQuery();
  } catch (_) {}

  console.log(`[Telegram Button Tap] (${chatId}): "${data}"`);

  let simulatedMsg = '';
  if (data.startsWith('pay_')) {
    const mode = data.replace('pay_', '');
    simulatedMsg = `finalize bill with ${mode}`;
  } else if (data.startsWith('get_pdf')) {
    const id = data.replace('get_pdf_', '').replace('get_pdf', '');
    simulatedMsg = id ? `send bill #${id} as pdf` : `send me that bill as a PDF`;
  } else if (data.startsWith('photo_bill_')) {
    const [_, prodName, qty] = data.split('_bill_')[1].split('_qty_');
    simulatedMsg = `add to bill: ${qty || 1} ${prodName}`;
  } else if (data.startsWith('photo_stock_')) {
    const [_, prodName, qty] = data.split('_stock_')[1].split('_qty_');
    simulatedMsg = `received ${qty || 10} packets of ${prodName}`;
  } else if (data.startsWith('photo_info_')) {
    const prodName = data.replace('photo_info_', '');
    simulatedMsg = `price of ${prodName}`;
  } else {
    simulatedMsg = data;
  }

  try {
    await ctx.replyWithChatAction('typing');
  } catch (_) {}

  try {
    const result = await processAgentMessage(chatId, simulatedMsg);
    await sendAgentResult(ctx, chatId, result);
  } catch (err) {
    console.error(`[Telegram Button Error] (${chatId}):`, err);
    try {
      await ctx.reply(`⚠️ Action Error: ${err.message}`);
    } catch (_) {}
  }
});

// Natural language message handler
bot.on('message:text', async (ctx) => {
  const chatId = String(ctx.chat.id);
  const text = ctx.message.text;

  console.log(`[Telegram IN] (${chatId}): "${text}"`);

  // Send typing indicator
  try {
    await ctx.replyWithChatAction('typing');
  } catch (_) {}

  try {
    const result = await processAgentMessage(chatId, text);
    await sendAgentResult(ctx, chatId, result);
  } catch (err) {
    console.error(`[Telegram Error] (${chatId}):`, err);
    try {
      await ctx.reply(`⚠️ Store Agent Error: ${err.message}`);
    } catch (_) {}
  }
});

// Voice-note order handler (Transcribe audio -> automatic billing & store ops)
bot.on(['message:voice', 'message:audio'], async (ctx) => {
  const chatId = String(ctx.chat.id);
  const fileId = ctx.message.voice?.file_id || ctx.message.audio?.file_id;

  console.log(`[Telegram Voice IN] (${chatId}): Voice order received (file_id: ${fileId})`);

  try {
    await ctx.replyWithChatAction('record_voice');
  } catch (_) {}

  try {
    const transcribedText = await transcribeTelegramVoice(ctx.api, fileId);
    console.log(`[Telegram Voice Transcribed] (${chatId}): "${transcribedText}"`);

    await ctx.reply(`🎙️ *Voice Note Heard:*\n_"${transcribedText}"_\n\nProcessing order...`, {
      parse_mode: 'Markdown'
    });

    const result = await processAgentMessage(chatId, transcribedText);
    await sendAgentResult(ctx, chatId, result);
  } catch (err) {
    console.error(`[Telegram Voice Error] (${chatId}):`, err.message);
    await ctx.reply(`⚠️ Could not transcribe voice note: ${err.message}\nPlease try speaking clearly or send as text.`);
  }
});

// Barcode & Product Photo Identifier (Gemini 1.5 Flash Vision)
bot.on('message:photo', async (ctx) => {
  const chatId = String(ctx.chat.id);
  const photos = ctx.message.photo;
  if (!photos || photos.length === 0) return;

  const photo = photos[photos.length - 1]; // highest resolution
  const caption = (ctx.message.caption || '').trim();

  console.log(`[Telegram Photo IN] (${chatId}): Photo received (file_id: ${photo.file_id}, caption: "${caption}")`);

  try {
    await ctx.replyWithChatAction('upload_photo');
  } catch (_) {}

  try {
    const allProds = await apiClient.getProducts();
    const result = await identifyProductFromPhoto(ctx.api, photo.file_id, allProds);

    if (result.success && result.product) {
      const p = result.product;
      const details = result.details || {};
      const margin = (p.sell_price - p.cost_price).toFixed(2);
      const barcodeInfo = details.detected_barcode ? `\n• Barcode (EAN/UPC): \`${details.detected_barcode}\`` : '';

      // If user provided an operational caption (e.g. "bill 2" or "add 10 stock"), execute it right away!
      if (caption) {
        const captionLower = caption.toLowerCase();
        let simulatedAction = '';
        if (captionLower.includes('bill') || captionLower.includes('cart') || captionLower.includes('make a bill')) {
          const qtyMatch = caption.match(/(\d+(?:\.\d+)?)/);
          const qty = qtyMatch ? qtyMatch[1] : '1';
          simulatedAction = `add to bill: ${qty} ${p.name}`;
        } else if (captionLower.includes('stock') || captionLower.includes('came') || captionLower.includes('received')) {
          const qtyMatch = caption.match(/(\d+(?:\.\d+)?)/);
          const qty = qtyMatch ? qtyMatch[1] : '10';
          simulatedAction = `received ${qty} packets of ${p.name}`;
        } else {
          simulatedAction = `${caption} ${p.name}`;
        }

        await ctx.reply(
          `📸 *Item Identified from Photo:* *${p.name}*\n` +
          `• MRP: ₹${p.sell_price} | Stock: ${p.stock_qty} ${p.unit}${barcodeInfo}\n` +
          `Executing your instruction: _"${caption}"_...`,
          { parse_mode: 'Markdown' }
        );

        const opResult = await processAgentMessage(chatId, simulatedAction);
        await sendAgentResult(ctx, chatId, opResult);
        return;
      }

      // If no caption, provide recognition card with quick action buttons
      const keyboard = new InlineKeyboard()
        .text(`🛒 Add 1 to Bill`, `photo_bill_${p.name}_qty_1`)
        .text(`📦 Restock +10`, `photo_stock_${p.name}_qty_10`)
        .row()
        .text(`🏷️ Full Price & Info`, `photo_info_${p.name}`);

      await ctx.reply(
        `📸 *Product Packaging / Barcode Identified!*\n\n` +
        `• Product: *${p.name}*\n` +
        `• Selling Price (MRP): *₹${p.sell_price}* per ${p.unit}\n` +
        `• Available Stock: *${p.stock_qty} ${p.unit}*\n` +
        `• Wholesale Cost: ₹${p.cost_price} (Margin: ₹${margin})\n` +
        `• GST Slab: ${p.gst_slab}%${barcodeInfo}\n` +
        `• Match Confidence: *${details.confidence_percentage || 95}%*\n\n` +
        `Tap an action below to instantly bill or restock this item:`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        }
      );
    } else {
      const detected = result.details?.detected_product_name || 'Product';
      const barcode = result.details?.detected_barcode ? `Barcode: \`${result.details.detected_barcode}\`` : '';
      await ctx.reply(
        `🔍 *Photo Analyzed:*\n` +
        `Recognized item: *${detected}* ${barcode}\n\n` +
        `⚠️ This item is not yet in your store catalog.\n` +
        `To add it to your inventory, reply:\n` +
        `*"add product: ${detected}, cost ₹..., mrp ₹..., stock 20"*`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (err) {
    console.error(`[Telegram Photo Error] (${chatId}):`, err.message);
    await ctx.reply(`⚠️ Could not identify product from photo: ${err.message}\nPlease ensure the barcode or product title is well-lit and clearly visible.`);
  }
});

// Server bootstrap: Webhook vs Long-Polling
const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'online', bot: 'Nebula Supermarket Ops Agent' });
});

if (config.webhookUrl) {
  console.log(`Setting up Telegram Webhook on: ${config.webhookUrl}${config.webhookPath}`);
  app.use(config.webhookPath, webhookCallback(bot, 'express'));

  app.listen(config.port, async () => {
    console.log(`Telegram Bot Webhook server listening on port ${config.port}`);
    if (config.telegramToken && config.telegramToken !== 'DUMMY_TOKEN_FOR_INITIALIZATION') {
      try {
        await bot.api.setWebhook(`${config.webhookUrl}${config.webhookPath}`);
        console.log('Telegram Webhook registered successfully!');
        startWeeklyReportScheduler(bot);
      } catch (err) {
        console.error('Failed to set webhook:', err.message);
      }
    }
  });
} else {
  // Long polling for local development or testing
  if (config.telegramToken && config.telegramToken !== 'DUMMY_TOKEN_FOR_INITIALIZATION') {
    console.log('Starting Telegram Bot in Long Polling mode...');
    bot.start();
    startWeeklyReportScheduler(bot);
  } else {
    console.log('Telegram bot module initialized (Awaiting TELEGRAM_BOT_TOKEN in .env).');
  }

  app.listen(config.port, () => {
    console.log(`Agent status & test server listening on port ${config.port}`);
  });
}

export { bot, app };
