import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Bot,
  Send,
  Download,
  FileText,
  Presentation,
  Sparkles,
  RefreshCw,
  Info,
  CheckCircle,
  ExternalLink,
  Store
} from 'lucide-react';
import Header from '../components/Header';
import { useLanguage } from '../context/LanguageContext';

export default function AgentChat() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Namaste Rajesh bhai! I am your Nebula Supermarket Ops Agent. You can manage stock, cut bills, check Khata, or pull reports in plain shopkeeper English.\n\nTry clicking any sample prompt below or type your own.',
      documents: []
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const samplePrompts = [
    'make a bill: 2kg sugar, 1 Aashirvaad atta 5kg, 4 Maggi, UPI',
    'drop the sugar, make it 6 Maggi',
    'finalize bill with UPI',
    '50 packets of Maggi came in, cost ₹12, MRP ₹14',
    'how much sugar is left?',
    "what's running out?",
    "Ramesh's balance?",
    'Ramesh paid ₹300',
    'send me that bill as a PDF',
    "make this week's sales analysis deck",
    "today's sales?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || sending) return;

    const userMsgId = Date.now();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text }]);
    setInput('');
    setSending(true);

    try {
      const res = await axios.post('/api/agent/chat', {
        message: text,
        chat_id: 'web-browser-user'
      });

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: res.data.text,
          documents: res.data.documents || []
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: `⚠️ Error: ${err.response?.data?.error || err.message || 'Could not connect to agent'}`,
          documents: []
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header
        title={t('agent_title')}
        subtitle={t('agent_subtitle')}
      />

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full flex flex-col space-y-4">
        {/* Telegram Live Connection Info Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-md border border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-white shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm sm:text-base">Nebula Supermarket Telegram Agent</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Live Engine Active
                </span>
              </div>
              <p className="text-xs text-slate-300">
                You can interact with the agent right here in your browser, or message your bot on the Telegram app!
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Telegram Bot token setup:</span>
            <code className="bg-slate-950 px-2.5 py-1 rounded-lg text-orange-400 font-mono text-[11px]">
              bot/.env
            </code>
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px] overflow-hidden">
          {/* Chat Messages Log */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm ${
                      isUser
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-900 text-orange-400 border border-slate-700'
                    }`}
                  >
                    {isUser ? 'ME' : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-lg rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-orange-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>

                    {/* Document downloads if generated */}
                    {m.documents && m.documents.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                        {m.documents.map((doc, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-slate-900"
                          >
                            <div className="flex items-center space-x-2 truncate">
                              {doc.type === 'pdf' ? (
                                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                              ) : (
                                <Presentation className="w-5 h-5 text-orange-500 flex-shrink-0" />
                              )}
                              <span className="font-bold text-xs truncate">{doc.caption || doc.filename}</span>
                            </div>
                            <a
                              href={doc.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 flex-shrink-0 shadow transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex items-start space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-orange-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 text-xs text-slate-500 flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-600" />
                  <span>Agent reasoning & orchestrating store tools...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Pills */}
          <div className="p-2.5 bg-slate-100/70 border-t border-slate-200 flex items-center space-x-2 overflow-x-auto text-[11px]">
            <span className="font-bold text-slate-400 uppercase text-[10px] pl-1 whitespace-nowrap">
              Quick Test:
            </span>
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                disabled={sending}
                className="px-2.5 py-1 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 border border-slate-200 rounded-lg whitespace-nowrap text-slate-700 font-medium transition active:scale-95 shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ask the agent anything in shopkeeper English..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-medium"
            />
            <button
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center space-x-1.5 shadow transition active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
