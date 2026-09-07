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
    <header className="bg-white border-b border-[#E8E0CC] sticky top-0 z-20 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
      {/* Left: Collapse Navigation Icon in Heading + Page Title & Subtitle */}
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isCollapsed ? "Expand navigation (Ctrl+B)" : "Collapse navigation (Ctrl+B)"}
            className="p-2 text-[#287A4B] hover:text-[#1E603A] bg-[#FFFAED] hover:bg-[#FFF4D6] rounded-xl border border-[#E8E0CC] hover:border-[#287A4B]/30 transition shadow-2xs active:scale-95 cursor-pointer flex items-center justify-center"
            aria-label="Collapse Navigation"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-[#287A4B]" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-[#287A4B]" />
            )}
          </button>
        )}

        <div>
          <h1 className="text-lg sm:text-xl font-black text-[#292929] tracking-tight flex items-center gap-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[#6B6B63] font-normal hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center/Right: Actions & Indicators */}
      <div className="flex items-center flex-wrap gap-2 sm:gap-3">
        {/* Language Switcher */}
        <div className="flex items-center bg-[#FFFAED] p-0.5 rounded-xl border border-[#E8E0CC] text-xs">
          <Globe className="w-3.5 h-3.5 text-[#6B6B63] ml-2 mr-1 hidden md:inline" />
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
              language === 'en'
                ? 'bg-white text-[#292929] shadow-xs font-bold border border-[#E8E0CC]/60'
                : 'text-[#6B6B63] hover:text-[#292929]'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
              language === 'hi'
                ? 'bg-white text-[#292929] shadow-xs font-bold border border-[#E8E0CC]/60'
                : 'text-[#6B6B63] hover:text-[#292929]'
            }`}
          >
            हिन्दी
          </button>
          <button
            onClick={() => setLanguage('ta')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
              language === 'ta'
                ? 'bg-white text-[#292929] shadow-xs font-bold border border-[#E8E0CC]/60'
                : 'text-[#6B6B63] hover:text-[#292929]'
            }`}
          >
            தமிழ்
          </button>
        </div>

        {/* Real-time IST Clock */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs font-medium text-[#6B6B63] bg-[#FFFAED] px-2.5 py-1.5 rounded-xl border border-[#E8E0CC]">
          <Clock className="w-3.5 h-3.5 text-[#287A4B]" />
          <span>
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' • '}
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>

        {/* GST Active Indicator */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-[#287A4B] bg-[#F0FDF4] px-2.5 py-1.5 rounded-xl border border-[#E8E0CC]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#287A4B]" />
          <span>GST Active</span>
        </div>

        {/* User Profile & Role Switcher */}
        <div className="flex items-center space-x-1.5 bg-[#FFFAED] p-1 rounded-xl border border-[#E8E0CC] text-xs">
          <div className="flex items-center space-x-1.5 px-1.5 py-0.5">
            <span className="w-2 h-2 rounded-full bg-[#287A4B]"></span>
            <span className="font-bold text-[#292929]">
              {displayName}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isOwner
                  ? 'bg-[#FFF4D6] text-[#F28C28] border border-[#FFE7A3]'
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
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-white hover:bg-[#FFF4D6] text-[#6B6B63] hover:text-[#292929] border border-[#E8E0CC] shadow-2xs transition cursor-pointer"
          >
            {isOwner ? 'Switch to Staff' : 'Switch to Owner'}
          </button>
        </div>

        {/* Primary CTA: + New Bill (Saffron Orange #F28C28) */}
        <button
          onClick={() => navigate('/pos')}
          className="flex items-center space-x-1.5 bg-[#F28C28] hover:bg-[#D9771A] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Bill (POS)</span>
        </button>
      </div>
    </header>
  );
}
