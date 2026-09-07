import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Clock, ShieldCheck, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, subtitle }) {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const { language, setLanguage, t } = useLanguage();
  const { user, login } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Language Selector: EN | हिन्दी | தமிழ் */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-500 mx-1.5" />
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded-lg font-bold transition ${
              language === 'en'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`px-2 py-1 rounded-lg font-bold transition ${
              language === 'hi'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            हिन्दी
          </button>
          <button
            onClick={() => setLanguage('ta')}
            className={`px-2 py-1 rounded-lg font-bold transition ${
              language === 'ta'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            தமிழ்
          </button>
        </div>

        {/* Real-time Indian Standard Time Clock */}
        <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80">
          <Clock className="w-3.5 h-3.5 text-orange-600" />
          <span>
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' • '}
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </span>
        </div>

        {/* Active Operator Role Badge & Quick Switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center space-x-1.5 px-2 py-0.5">
            <span>{user?.role === 'owner' ? '👑' : '🏷️'}</span>
            <span className="font-bold text-slate-800 hidden lg:inline">
              {user?.name ? user.name.split(' ')[0] : 'Operator'}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
              user?.role === 'owner'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-blue-100 text-blue-900 border border-blue-300'
            }`}>
              {user?.role === 'owner' ? 'Owner' : 'Staff'}
            </span>
          </div>

          <button
            onClick={() => {
              if (user?.role === 'owner') {
                login('staff', 'staff123');
              } else {
                login('admin', 'kirana123');
              }
            }}
            title="Switch operator role"
            className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-sm transition"
          >
            {user?.role === 'owner' ? 'Switch to Staff' : 'Switch to Owner'}
          </button>
        </div>

        {/* GST Active Pill */}
        <div className="hidden xl:flex items-center space-x-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{t('header_gst_active')}</span>
        </div>

        {/* Fast Action CTA */}
        <button
          onClick={() => navigate('/pos')}
          className="flex items-center space-x-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-orange-500/25 transition active:scale-95"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{t('header_new_bill')}</span>
        </button>
      </div>
    </header>
  );
}
