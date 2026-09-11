import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Clock, ShieldCheck, Globe, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, subtitle, onToggleSidebar, isSidebarCollapsed }) {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const { language, setLanguage, t } = useLanguage();
  const { user, login } = useAuth();

  const isCollapsed = isSidebarCollapsed ?? (localStorage.getItem('nebula_sidebar_collapsed') === 'true');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isOwner = user?.role === 'owner';
  const displayName = user?.name && !user.name.includes('Rajesh') ? user.name.split(' ')[0] : (isOwner ? 'Guna' : 'Staff');

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-20 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Left: Collapse Navigation Icon in Heading + Page Title & Subtitle */}
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isCollapsed ? "Expand navigation (Ctrl+B)" : "Collapse navigation (Ctrl+B)"}
            className="p-2 text-[#15803D] hover:text-[#166534] bg-[#F8FAFC] hover:bg-slate-100 rounded-xl border border-[#E2E8F0] hover:border-slate-300 transition shadow-xs active:scale-95 cursor-pointer flex items-center justify-center"
            aria-label="Collapse Navigation"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-[#15803D]" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-[#15803D]" />
            )}
          </button>
        )}

        <div>
          <h1 className="text-lg sm:text-xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[#64748B] font-normal hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center/Right: Actions & Indicators */}
      <div className="flex items-center flex-wrap gap-2 sm:gap-3">
        {/* Language Switcher */}
        <div className="flex items-center bg-[#F8FAFC] p-0.5 rounded-xl border border-[#E2E8F0] text-xs">
          <Globe className="w-3.5 h-3.5 text-[#64748B] ml-2 mr-1 hidden md:inline" />
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
              language === 'en'
                ? 'bg-white text-[#0F172A] shadow-xs font-bold border border-slate-200/80'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
              language === 'hi'
                ? 'bg-white text-[#0F172A] shadow-xs font-bold border border-slate-200/80'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            हिन्दी
          </button>
          <button
            onClick={() => setLanguage('ta')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
              language === 'ta'
                ? 'bg-white text-[#0F172A] shadow-xs font-bold border border-slate-200/80'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            தமிழ்
          </button>
        </div>

        {/* Real-time IST Clock */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs font-medium text-[#64748B] bg-[#F8FAFC] px-2.5 py-1.5 rounded-xl border border-[#E2E8F0]">
          <Clock className="w-3.5 h-3.5 text-[#15803D]" />
          <span>
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' • '}
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>

        {/* GST Active Indicator */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-[#15803D] bg-[#F0FDF4] px-2.5 py-1.5 rounded-xl border border-[#BBF7D0]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
          <span>GST Active</span>
        </div>

        {/* User Profile & Role Switcher */}
        <div className="flex items-center space-x-1.5 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs">
          <div className="flex items-center space-x-1.5 px-1.5 py-0.5">
            <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
            <span className="font-bold text-[#0F172A]">
              {displayName}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isOwner
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
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
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] shadow-xs transition cursor-pointer"
          >
            {isOwner ? 'Switch to Staff' : 'Switch to Owner'}
          </button>
        </div>

        {/* Primary CTA: + New Bill (Saffron Orange #EA580C) */}
        <button
          onClick={() => navigate('/pos')}
          className="flex items-center space-x-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Bill (POS)</span>
        </button>
      </div>
    </header>
  );
}
