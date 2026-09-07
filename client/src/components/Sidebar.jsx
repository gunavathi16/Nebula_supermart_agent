import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Bot,
  BarChart3,
  Settings,
  AlertTriangle,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BrandLogo from './BrandLogo';

export default function Sidebar({ lowStockCount = 0, isOpen = true, onClose }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const isOwner = user?.role === 'owner';

  const storeOpsItems = [
    { to: '/', label: t('nav_dashboard') || 'Dashboard', icon: LayoutDashboard },
    { to: '/pos', label: t('nav_pos') || 'Billing / POS', icon: ShoppingCart, highlight: true },
    { to: '/inventory', label: t('nav_inventory') || 'Inventory', icon: Package, badge: lowStockCount > 0 ? lowStockCount : null },
    { to: '/khata', label: t('nav_khata') || 'Khata Ledger', icon: Users },
    { to: '/invoices', label: t('nav_invoices') || 'Invoices', icon: FileText },
  ];

  const businessItems = [
    { to: '/agent', label: t('nav_agent') || 'AI Store Agent', icon: Bot },
    { to: '/reports', label: t('nav_reports') || 'Reports & Tax', icon: BarChart3, ownerOnly: true },
    { to: '/settings', label: t('nav_settings') || 'Shop Settings', icon: Settings, ownerOnly: true },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && onClose && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#E5E7E2] flex flex-col flex-shrink-0 h-screen transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#E5E7E2] bg-[#FAFAF7]">
          <div className="flex items-center justify-between">
            <BrandLogo size="md" />
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 text-[#647067] hover:text-[#172018] rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#647067] font-medium tracking-wide mt-2 pl-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
            <span>Smart Retail. Simple Business.</span>
          </p>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
          {/* Section 1: STORE OPERATIONS */}
          <div className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#647067]">
              STORE OPERATIONS
            </div>

            {storeOpsItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-[#F0FDF4] text-[#14532D] font-bold shadow-xs'
                        : 'text-[#647067] hover:bg-[#F0FDF4]/60 hover:text-[#14532D]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Left Active Accent Indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#14532D] rounded-r-full" />
                      )}

                      <div className="flex items-center space-x-3 pl-1 truncate">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive
                              ? item.highlight
                                ? 'text-[#F97316]'
                                : 'text-[#22C55E]'
                              : 'text-[#647067] group-hover:text-[#14532D]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {item.highlight && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-[#F97316] uppercase">
                            Fast POS
                          </span>
                        )}
                        {item.badge && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-100 text-red-700">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Section 2: BUSINESS */}
          <div className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#647067]">
              BUSINESS
            </div>

            {businessItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-[#F0FDF4] text-[#14532D] font-bold shadow-xs'
                        : 'text-[#647067] hover:bg-[#F0FDF4]/60 hover:text-[#14532D]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#14532D] rounded-r-full" />
                      )}

                      <div className="flex items-center space-x-3 pl-1 truncate">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive ? 'text-[#22C55E]' : 'text-[#647067] group-hover:text-[#14532D]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.ownerOnly && !isOwner && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-[#647067]">
                          Owner
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-[#E5E7E2] bg-[#FAFAF7]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E7E2]">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#14532D] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-[#172018] truncate">
                  {user?.name || 'Rajesh (Owner)'}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-[#647067] uppercase font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
                  <span>{user?.role === 'owner' ? 'OWNER' : 'STAFF'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title={t('nav_logout') || 'Logout'}
              className="p-1.5 text-[#647067] hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
