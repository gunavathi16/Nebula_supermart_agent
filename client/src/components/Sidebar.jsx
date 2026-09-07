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
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BrandLogo from './BrandLogo';

export default function Sidebar({
  lowStockCount = 0,
  isOpen = true,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const isOwner = user?.role === 'owner';

  const storeOpsItems = [
    { to: '/', label: t('nav_dashboard') || 'Store Dashboard', icon: LayoutDashboard },
    { to: '/pos', label: t('nav_pos') || 'Billing / POS', icon: ShoppingCart, highlight: true },
    { to: '/inventory', label: t('nav_inventory') || 'Inventory', icon: Package, badge: lowStockCount > 0 ? lowStockCount : null },
    { to: '/khata', label: t('nav_khata') || 'Customer Dues', icon: Users },
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
        className={`fixed lg:static inset-y-0 left-0 z-40 bg-[#FFFDF7] border-r border-[#E8E0CC] flex flex-col flex-shrink-0 h-screen transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-64 lg:w-[76px]' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className={`p-4 border-b border-[#E8E0CC] bg-[#FFFDF7] transition-all ${isCollapsed ? 'lg:px-2 lg:py-3' : ''}`}>
          <div className="flex items-center justify-between">
            <div className={isCollapsed ? 'hidden lg:block mx-auto' : 'block'}>
              <BrandLogo size={isCollapsed ? 'sm' : 'md'} showText={!isCollapsed} showTagline={!isCollapsed} />
            </div>
            {isCollapsed && (
              <div className="block lg:hidden">
                <BrandLogo size="md" showTagline={true} />
              </div>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 text-[#6B6B63] hover:text-[#292929] rounded-lg hover:bg-[#FFFAED]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className={`flex-1 ${isCollapsed ? 'p-2 space-y-4' : 'p-3 space-y-6'} overflow-y-auto overflow-x-hidden`}>
          {/* Section 1: STORE OPERATIONS */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B6B63]">
                STORE OPERATIONS
              </div>
            ) : (
              <div className="my-1 border-t border-[#E8E0CC] mx-1" />
            )}

            {storeOpsItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `group relative flex items-center ${
                      isCollapsed ? 'lg:justify-center lg:px-0 px-3 py-2.5' : 'justify-between px-3 py-2.5'
                    } rounded-xl font-medium text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-[#FFF0B3] text-[#292929] font-bold shadow-xs'
                        : 'text-[#292929] hover:bg-[#FFFAED] hover:text-[#292929]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Left Active Accent Indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#FFD84D] rounded-r-full" />
                      )}

                      <div className={`flex items-center ${isCollapsed ? 'lg:justify-center space-x-3 lg:space-x-0' : 'space-x-3 pl-1 truncate'}`}>
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive
                              ? item.highlight
                                ? 'text-[#F28C28]'
                                : 'text-[#287A4B]'
                              : 'text-[#6B6B63] group-hover:text-[#287A4B]'
                          }`}
                        />
                        <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                      </div>

                      {/* Expanded Badges */}
                      <div className={`items-center space-x-1.5 flex-shrink-0 ${isCollapsed ? 'flex lg:hidden' : 'flex'}`}>
                        {item.highlight && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FFF4D6] text-[#F28C28] border border-[#E8E0CC] uppercase">
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

                      {/* Collapsed Dot Indicators (Desktop only) */}
                      {isCollapsed && (
                        <div className="hidden lg:block">
                          {item.badge ? (
                            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                          ) : item.highlight ? (
                            <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-[#F28C28]" />
                          ) : null}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Section 2: BUSINESS */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B6B63]">
                BUSINESS
              </div>
            ) : (
              <div className="my-1 border-t border-[#E8E0CC] mx-1" />
            )}

            {businessItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `group relative flex items-center ${
                      isCollapsed ? 'lg:justify-center lg:px-0 px-3 py-2.5' : 'justify-between px-3 py-2.5'
                    } rounded-xl font-medium text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-[#FFF0B3] text-[#292929] font-bold shadow-xs'
                        : 'text-[#292929] hover:bg-[#FFFAED] hover:text-[#292929]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#FFD84D] rounded-r-full" />
                      )}

                      <div className={`flex items-center ${isCollapsed ? 'lg:justify-center space-x-3 lg:space-x-0' : 'space-x-3 pl-1 truncate'}`}>
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive ? 'text-[#287A4B]' : 'text-[#6B6B63] group-hover:text-[#287A4B]'
                          }`}
                        />
                        <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                      </div>

                      {item.ownerOnly && !isOwner && (
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#FFFAED] border border-[#E8E0CC] text-[#6B6B63] ${isCollapsed ? 'lg:hidden' : ''}`}>
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
        <div className={`border-t border-[#E8E0CC] bg-[#FFFDF7] ${isCollapsed ? 'p-2' : 'p-3'}`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:flex-col lg:gap-2 p-1.5' : 'justify-between p-2'} rounded-xl bg-white border border-[#E8E0CC]`}>
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div
                title={`${user?.name || 'User'} (${user?.role || 'Staff'})`}
                className="w-8 h-8 rounded-full bg-[#FFD84D] text-[#292929] font-black flex items-center justify-center text-xs flex-shrink-0 cursor-default border border-[#E8E0CC]"
              >
                {user?.name && !user.name.includes('Rajesh') ? user.name.charAt(0).toUpperCase() : 'G'}
              </div>
              <div className={`overflow-hidden ${isCollapsed ? 'lg:hidden' : ''}`}>
                <p className="text-xs font-bold text-[#292929] truncate">
                  {user?.name && !user.name.includes('Rajesh') ? user.name : 'Guna (Owner)'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-[#6B6B63] uppercase font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#287A4B]"></span>
                  <span>{user?.role === 'owner' ? 'OWNER' : 'STAFF'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title={t('nav_logout') || 'Logout'}
              className="p-1.5 text-[#6B6B63] hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
