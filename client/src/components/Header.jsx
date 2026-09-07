import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, ShieldCheck, Globe, Menu } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, subtitle, onToggleSidebar }) {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const { language, setLanguage, t } = useLanguage();
  const { user, login } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isOwner = user?.role === 'owner';
  const displayName = user?.name ? user.name.split(' ')[0] : (isOwner ? 'Rajesh' : 'Staff');

  return (
    <header className="bg-white border-b border-[#E5E7E2] sticky top-0 z-20 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Left: Hamburger (mobile) + Page Title & Subtitle */}
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-[#647067] hover:text-[#172018] rounded-xl hover:bg-slate-100 transition"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#172018] tracking-tight flex items-center gap-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[#647067] font-normal hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center/Right: Actions & Indicators */}
      <div className="flex items-center flex-wrap gap-2 sm:gap-3">
        {/* Language Switcher */}
        <div className="flex items-center bg-[#FAFAF7] p-0.5 rounded-xl border border-[#E5E7E2] text-xs">
          <Globe className="w-3.5 h-3.5 text-[#647067] ml-2 mr-1 hidden md:inline" />
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
              language === 'en'
                ? 'bg-white text-[#14532D] shadow-xs font-bold'
                : 'text-[#647067] hover:text-[#172018]'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
              language === 'hi'
                ? 'bg-white text-[#14532D] shadow-xs font-bold'
                : 'text-[#647067] hover:text-[#172018]'
            }`}
          >
            हिन्दी
          </button>
          <button
            onClick={() => setLanguage('ta')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
              language === 'ta'
                ? 'bg-white text-[#14532D] shadow-xs font-bold'
                : 'text-[#647067] hover:text-[#172018]'
            }`}
          >
            தமிழ்
          </button>
        </div>

        {/* Real-time IST Clock */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs font-medium text-[#647067] bg-[#FAFAF7] px-2.5 py-1.5 rounded-xl border border-[#E5E7E2]">
          <Clock className="w-3.5 h-3.5 text-[#14532D]" />
          <span>
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' • '}
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>

        {/* GST Active Indicator */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-[#14532D] bg-[#F0FDF4] px-2.5 py-1.5 rounded-xl border border-[#BBF7D0]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>GST Active</span>
        </div>

        {/* User Profile & Role Switcher */}
        <div className="flex items-center space-x-1.5 bg-[#FAFAF7] p-1 rounded-xl border border-[#E5E7E2] text-xs">
          <div className="flex items-center space-x-1.5 px-1.5 py-0.5">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
            <span className="font-bold text-[#172018]">
              {displayName}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isOwner
                  ? 'bg-emerald-100 text-[#14532D]'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {isOwner ? 'OWNER' : 'STAFF'}
            </span>
          </div>

          <button
            onClick={() => {
              if (isOwner) {
                login('staff', 'staff123');
              } else {
                login('admin', 'kirana123');
              }
            }}
            title="Switch operator role"
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-white hover:bg-slate-50 text-[#647067] hover:text-[#172018] border border-[#E5E7E2] shadow-xs transition"
          >
            {isOwner ? 'Staff' : 'Owner'}
          </button>
        </div>

        {/* Primary CTA: + New Bill (Warm Saffron Accent) */}
        <button
          onClick={() => navigate('/pos')}
          className="flex items-center space-x-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t('header_new_bill') || 'New Bill'}</span>
        </button>
      </div>
    </header>
  );
}
