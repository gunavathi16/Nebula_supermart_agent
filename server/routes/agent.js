import { Router } from 'express';
import { processAgentMessage } from '../../bot/agent.js';

const router = Router();

// Chat with the Ops Agent from Web or Telegram webhook
router.post('/chat', async (req, res) => {
  const { message, chat_id = 'web-owner-session' } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  try {
    const result = await processAgentMessage(chat_id, message.trim());
    
    // Map documents for web download
    const docs = (result.documents || []).map((doc, idx) => ({
      id: idx,
      type: doc.type,
      filename: doc.filename,
      caption: doc.caption,
      downloadUrl: doc.type === 'pdf' 
        ? `/api/invoices/${doc.filename.replace(/[^0-9]/g, '')}/pdf`
        : `/api/reports/deck`
    }));

    res.json({
      text: result.text,
      documents: docs,
      buttons: result.buttons || []
    });
  } catch (err) {
    console.error('Agent chat error:', err);
    res.status(500).json({ error: err.message || 'Agent failed to process message' });
  }
});

export default router;
