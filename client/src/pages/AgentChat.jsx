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
import BrandLogo from '../components/BrandLogo';

export default function AgentChat({ onToggleSidebar }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Namaste Guna! I am NEBULA AI, your smart store assistant. You can check stock, cut counter bills, inspect Khata balances, or generate sales reports in plain shopkeeper English.\n\nTap any suggested prompt below or type your request.',
      documents: []
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedCards = [
    {
      title: 'What should I restock today?',
      desc: 'Check low-stock SKUs and imminent stockouts'
    },
    {
      title: 'Which products are selling fastest?',
      desc: 'View top revenue & sales velocity items'
    },
    {
      title: "Show today's sales summary.",
      desc: 'Today revenue, bills count & payment breakdown'
    },
    {
      title: 'Who has the highest Khata balance?',
      desc: 'Top outstanding customer dues ledger'
    }
  ];

  const quickPrompts = [
    'make a bill: 2kg sugar, 1 Aashirvaad atta 5kg, 4 Maggi, UPI',
    'drop the sugar, make it 6 Maggi',
    'finalize bill with UPI',
    '50 packets of Maggi came in, cost ₹12, MRP ₹14',
    'how much sugar is left?',
    "Ramesh's balance?",
    'send me that bill as a PDF',
    "make this week's sales analysis deck"
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
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text }]);
    setInput('');
    setSending(true);

    try {
      const res = await axios.post('/api/agent/chat', {
        message: text,
        chat_id: 'web-browser-user'
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: res.data.text,
          documents: res.data.documents || []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: `⚠️ Error: ${
            err.response?.data?.error || err.message || 'Could not connect to store agent'
          }`,
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
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC]">
      <Header
        title="NEBULA AI Store Assistant"
        subtitle="Conversational supermarket operations, instant billing, stock alerts & Khata queries"
        onToggleSidebar={onToggleSidebar}
      />

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full flex flex-col space-y-4">
        {/* Brand Banner Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F0FDF4] border border-[#E2E8F0] flex items-center justify-center text-[#15803D]">
              <Sparkles className="w-6 h-6 text-[#15803D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base text-[#0F172A]">NEBULA AI</h2>
                <span className="text-[10px] font-bold text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded-full border border-[#E2E8F0]">
                  Online • Store Munimji
                </span>
              </div>
              <p className="text-xs text-[#64748B]">Your smart store assistant.</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center text-xs text-[#64748B]">
            <span>100% Real-time Store Database Grounded</span>
          </div>
        </div>

        {/* Suggested Prompt Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {suggestedCards.map((card, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(card.title)}
              className="p-3 bg-white hover:bg-[#F0FDF4] border border-[#E2E8F0] hover:border-[#E2E8F0] rounded-xl text-left transition cursor-pointer group shadow-xs active:scale-98"
            >
              <p className="font-bold text-xs text-[#0F172A] group-hover:text-[#15803D] transition">
                "{card.title}"
              </p>
              <p className="text-[10px] text-[#64748B] mt-1">{card.desc}</p>
            </button>
          ))}
        </div>

        {/* Chat History Box */}
        <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-420px)] min-h-[360px] space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'bot' && (
                <div className="w-8 h-8 rounded-xl bg-[#15803D] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-[#15803D]" />
                </div>
              )}

              <div
                className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm space-y-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-[#15803D] text-white font-medium rounded-tr-none shadow-xs'
                    : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-line leading-relaxed font-sans">{msg.text}</div>

                {/* Attached Documents (PDFs / PPTX Decks) */}
                {msg.documents && msg.documents.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                      Generated Documents:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.documents.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white hover:bg-[#F0FDF4] text-[#15803D] border border-[#E2E8F0] rounded-xl font-bold text-xs transition shadow-xs"
                        >
                          {doc.type === 'pdf' ? (
                            <FileText className="w-4 h-4 text-[#EA580C]" />
                          ) : (
                            <Presentation className="w-4 h-4 text-[#15803D]" />
                          )}
                          <span>{doc.caption || doc.filename}</span>
                          <Download className="w-3.5 h-3.5 ml-1" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-[#15803D] text-white flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin text-[#15803D]" />
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-2xl rounded-tl-none text-xs text-[#64748B] flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#15803D] animate-ping"></span>
                <span>NEBULA AI is processing your store instruction...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Retail Phrases Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="px-3 py-1 bg-white hover:bg-[#F0FDF4] text-[#64748B] hover:text-[#15803D] border border-[#E2E8F0] hover:border-[#E2E8F0] rounded-xl font-medium whitespace-nowrap transition cursor-pointer active:scale-95"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="Type your request (e.g., 'make a bill: 2kg sugar, 4 Maggi, UPI' or 'today sales')..."
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent outline-hidden text-[#0F172A] placeholder-[#64748B]"
          />

          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="px-4 py-2.5 bg-[#EA580C] hover:bg-[#E07D1E] disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>
    </div>
  );
}
