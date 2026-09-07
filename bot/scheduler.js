import { apiClient } from './apiClient.js';
import { InputFile } from 'grammy';
import { sessionStore } from './session.js';

let activeBot = null;
let schedulerInterval = null;

/**
 * Send the weekly analysis presentation deck directly to a specific Telegram chat.
 */
export async function sendWeeklyAnalysisDeck(chatId, botInstance, forced = false) {
  const bot = botInstance || activeBot;
  if (!bot) {
    throw new Error('Telegram bot instance is not initialized.');
  }

  try {
    console.log(`[Scheduler] Generating Weekly Analysis Deck for Telegram Chat ${chatId}...`);
    const pptxBuffer = await apiClient.getAnalysisDeckBuffer('7d');
    const filename = `Nebula_Weekly_Analysis_${new Date().toISOString().split('T')[0]}.pptx`;

    // Fetch quick summary metrics for the message caption
    let summaryCaption = `📊 *Weekly Store Operations Analysis Deck Auto-Delivered!*\n\n` +
      `Here is your weekly executive presentation deck (7-Day Performance):\n` +
      `• Gross revenue trends & daily sales velocity\n` +
      `• Top 6 revenue-generating SKUs & category mix\n` +
      `• Critical low-stock alerts & replenishment roadmap\n` +
      `• Complete GST collection breakdown (Intra-State CGST/SGST)\n\n` +
      `_Automated weekly business intelligence for store management._`;

    try {
      const close = await apiClient.getDailyClose();
      if (close) {
        summaryCaption += `\n\n📈 *Today's Snapshot:* ₹${close.today_sales} gross sales | ${close.bills_cut} bills cut`;
      }
    } catch (_) {}

    await bot.api.sendDocument(
      chatId,
      new InputFile(pptxBuffer, filename),
      {
        caption: summaryCaption,
        parse_mode: 'Markdown'
      }
    );

    // Update settings with last sent timestamp
    try {
      await apiClient.setSetting('last_weekly_deck_sent_at', new Date().toISOString());
    } catch (_) {}

    console.log(`[Scheduler] Weekly Analysis Deck sent successfully to Chat ${chatId}!`);
    return { success: true, filename, size_bytes: pptxBuffer.length };
  } catch (err) {
    console.error(`[Scheduler Error] Failed to send weekly deck to ${chatId}:`, err.message);
    throw err;
  }
}

/**
 * Check if weekly deck is due and automatically send it to registered store owners.
 */
async function checkAndSendScheduledDecks() {
  try {
    const settings = await apiClient.getSettings();
    const isEnabled = settings.auto_weekly_deck_enabled !== 'false';
    const targetChatId = settings.owner_telegram_chat_id;

    if (!isEnabled || !targetChatId) {
      return;
    }

    const lastSentStr = settings.last_weekly_deck_sent_at;
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const isDue = !lastSentStr || (now - new Date(lastSentStr).getTime() >= sevenDaysMs);

    if (isDue && activeBot) {
      console.log(`[Scheduler] Weekly deck is due for Chat ${targetChatId}. Sending automated report...`);
      await sendWeeklyAnalysisDeck(targetChatId, activeBot);
    }
  } catch (err) {
    console.warn('[Scheduler Check Error]:', err.message);
  }
}

/**
 * Initialize background scheduler (checks every hour).
 */
export function startWeeklyReportScheduler(bot) {
  activeBot = bot;
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  // Check once 30 seconds after bot boot
  setTimeout(() => {
    checkAndSendScheduledDecks();
  }, 30000);

  // Check every hour
  schedulerInterval = setInterval(() => {
    checkAndSendScheduledDecks();
  }, 60 * 60 * 1000);

  console.log('Weekly Automated Analysis Deck Scheduler active (Interval: 1 hour check).');
}
