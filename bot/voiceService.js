import axios from 'axios';
import { config } from './config.js';

/**
 * Download a voice file from Telegram and transcribe it via Gemini Multimodal Audio.
 */
export async function transcribeTelegramVoice(botApi, fileId) {
  try {
    const file = await botApi.getFile(fileId);
    if (!file || !file.file_path) {
      throw new Error('Could not retrieve audio file path from Telegram.');
    }

    const downloadUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 15000
    });

    const audioBuffer = Buffer.from(response.data);
    const base64Audio = audioBuffer.toString('base64');

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured for voice transcription.');
    }

    // Call Gemini multimodal endpoint
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const promptText = `You are an AI audio transcriber for Nebula Supermarket & Kirana Store in Bengaluru.
The speaker is recording a grocery retail order in English, Hindi, or Tamil (or mixed Hinglish / Tanglish, for example:
- "2kg sugar, 1 Aashirvaad atta 5kg, 4 Maggi, pay with UPI"
- "ek kilo chini aur do packet amul doodh, cash mein"
- "irandu kilo sarkarai, oru atta 5kg, naalu maggi, upi panam").
Accurately identify and transcribe the order items, quantities, units, and payment method into clean shopkeeper order text.
Output ONLY the clean transcribed sentence, without any explanations, disclaimers, or extra commentary.`;

    const geminiRes = await axios.post(geminiUrl, {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'audio/ogg',
                data: base64Audio
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
        maxOutputTokens: 150
      }
    }, {
      timeout: 20000
    });

    const text = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned an empty transcription.');
    }

    return text.trim();
  } catch (err) {
    const errorDetails = err.response?.data?.error?.message || err.message;
    throw new Error(`Voice Transcription Error: ${errorDetails}`);
  }
}
