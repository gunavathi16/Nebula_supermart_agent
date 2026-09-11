import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, 'bot', '.env') });
dotenv.config();


export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  apiBaseUrl: process.env.API_BASE_URL || (process.env.PORT ? `http://localhost:${process.env.PORT}/api` : 'http://localhost:5000/api'),
  apiToken: process.env.API_TOKEN || '',
  llmProvider: process.env.LLM_PROVIDER || 'anthropic', // 'anthropic', 'openai', 'google'
  port: parseInt(process.env.BOT_PORT || '3001', 10),
  webhookUrl: process.env.WEBHOOK_URL || '',
  webhookPath: process.env.WEBHOOK_PATH || '/webhook'
};
