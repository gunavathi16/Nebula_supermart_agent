import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Users,
  BarChart3,
  Settings,
  Store,
  AlertTriangle,
  LogOut,
  Bot
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import BrandLogo from './BrandLogo';

export default function Sidebar({ lowStockCount = 0 }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const isOwner = user?.role === 'owner';

  const navItems = [
    { to: '/', label: t('nav_dashboard'), icon: LayoutDashboard },
    { to: '/pos', label: t('nav_pos'), icon: ShoppingCart, highlight: true, roleBadge: !isOwner ? 'Counter' : null },
    { to: '/inventory', label: t('nav_inventory'), icon: Package, badge: lowStockCount > 0 ? lowStockCount : null },
    { to: '/khata', label: t('nav_khata'), icon: Users },
    { to: '/invoices', label: t('nav_invoices'), icon: FileText },
    { to: '/agent', label: t('nav_agent'), icon: Bot },
    { to: '/reports', label: t('nav_reports'), icon: BarChart3, ownerOnly: true },
    { to: '/settings', label: t('nav_settings'), icon: Settings, ownerOnly: true },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 h-screen sticky top-0 border-r border-slate-800 z-20">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60">
        <BrandLogo size="md" />
        <p className="text-[10px] text-amber-400/80 font-medium tracking-wider mt-1.5 truncate">
          Daily Provisions • Honest Measures
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-3 pt-2 pb-1">
          <span>{t('nav_store_ops')}</span>
          <span className="text-[10px] lowercase text-slate-400 font-mono">
            {isOwner ? '👑 owner' : '🏷️ staff'}
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? item.highlight
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold shadow-lg shadow-orange-600/30'
                      : 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon className={`w-4 h-4 flex-shrink-0 ${item.highlight ? 'text-amber-300' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center space-x-1.5 flex-shrink-0">
                {item.roleBadge && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {item.roleBadge}
                  </span>
                )}
                {item.ownerOnly && !isOwner && (
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Owner
                  </span>
                )}
                {item.badge && (
                  <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" />
                    {item.badge}
                  </span>
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-orange-400 font-bold flex items-center justify-center text-xs border border-slate-700">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Kirana User'}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.role || 'Staff'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title={t('nav_logout')}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
