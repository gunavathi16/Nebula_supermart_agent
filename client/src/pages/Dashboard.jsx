import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Users,
  Plus,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  IndianRupee,
  FileText,
  Package,
  Sparkles,
  CheckCircle2,
  Gift,
  Copy,
  Check,
  X,
  Share2
} from 'lucide-react';
import Header from '../components/Header';
import BrandLogo from '../components/BrandLogo';
import { formatINR, formatQtyUnit } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ onToggleSidebar, isSidebarCollapsed }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReferModal, setShowReferModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://nebula.store/join?ref=GUNA-KIRANA-2026');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/reports/dashboard');
      setData(res.data);
    } catch (err) {
      setError(t('dash_load_err') || 'Unable to connect to POS database. Please verify the server is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const displayName = user?.name && !user.name.includes('Rajesh') ? user.name.split(' ')[0] : 'Guna';

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC]">
        <Header
          title="Store Dashboard"
          subtitle="Here's how your store is doing today."
          onToggleSidebar={onToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#15803D] animate-spin" />
            <p className="text-xs font-semibold text-[#64748B]">Loading store metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  const { today, paymentSplit, khata, lowStock, recentBills } = data || {};

  const paymentMap = { cash: 0, upi: 0, card: 0, khata: 0 };
  (paymentSplit || []).forEach((p) => {
    if (paymentMap[p.payment_mode] !== undefined) {
      paymentMap[p.payment_mode] = p.amount;
    }
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC]">
      <Header
        title="Store Dashboard"
        subtitle="Here's how your store is doing today."
        onToggleSidebar={onToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* EXECUTIVE NEBULA BRANDED GREETING BANNER */}
        <div className="bg-gradient-to-r from-amber-50/80 via-slate-50 to-white rounded-2xl border border-amber-200/60 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <BrandLogo size="md" showText={true} showTagline={true} />
            <div className="hidden sm:block h-10 w-px bg-[#E2E8F0]" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#0F172A] tracking-tight flex items-center gap-1.5">
                <span>{getGreeting()}, {displayName}</span>
                <span>👋</span>
              </h2>
              <p className="text-xs text-[#64748B] font-normal mt-0.5">
                Here's how your store is doing today.
              </p>
            </div>
          </div>

          {/* Right End: Refer & Earn Banner Card + Refresh Button */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
            <div
              onClick={() => setShowReferModal(true)}
              title="Refer & Earn — Click to invite friends and earn rewards"
              className="relative group overflow-hidden rounded-xl border border-amber-200/90 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer bg-[#FFFBEB] flex items-center"
            >
              <img
                src="/referral-banner.jpg"
                alt="Refer & Earn - Invite your friends and earn rewards"
                className="h-20 sm:h-24 md:h-26 w-auto object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-amber-900/5 transition-colors pointer-events-none rounded-xl" />
            </div>

            <button
              onClick={fetchDashboardData}
              title="Refresh metrics"
              className="p-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] rounded-xl transition shadow-xs cursor-pointer flex-shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#15803D]' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchDashboardData} className="underline font-bold">
              {t('dash_retry') || 'Retry'}
            </button>
          </div>
        )}

        {/* 4 KPI CARDS (White, #E2E8F0 Border, Color Accents) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 1: TODAY'S SALES (Green Accent #15803D) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs hover:shadow-sm transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  TODAY'S SALES
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#15803D] tracking-tight">
                {formatINR(today?.total_sales || 0)}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold text-[#0F172A]">
                {today?.total_bills || 0} bills today
              </span>
              <span className="text-[#15803D] font-semibold flex items-center gap-1 bg-[#F0FDF4] px-2 py-0.5 rounded-full border border-[#BBF7D0] text-[10px]">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            </div>
          </div>

          {/* KPI 2: PAYMENTS TODAY (Subtle Blue / Slate Accent) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs hover:shadow-sm transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  PAYMENTS TODAY
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5 mt-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> UPI
                  </span>
                  <span className="font-bold text-[#0F172A]">{formatINR(paymentMap.upi)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span> Cash
                  </span>
                  <span className="font-bold text-[#0F172A]">{formatINR(paymentMap.cash)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]"></span> Card / Khata
                  </span>
                  <span className="font-bold text-[#0F172A]">
                    {formatINR(paymentMap.card + paymentMap.khata)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] text-[11px] text-[#64748B] flex justify-between font-medium">
              <span>Gross Collected</span>
              <span className="font-bold text-[#0F172A]">
                {formatINR(paymentMap.upi + paymentMap.cash + paymentMap.card)}
              </span>
            </div>
          </div>

          {/* KPI 3: KHATA OUTSTANDING (Orange Accent #EA580C) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs hover:shadow-sm transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  KHATA OUTSTANDING
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#EA580C] border border-amber-200 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#EA580C] tracking-tight">
                {formatINR(khata?.total_outstanding || 0)}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="text-[#64748B] font-medium">
                {khata?.customers_with_dues || 0} customers with dues
              </span>
              <button
                onClick={() => navigate('/khata')}
                className="text-[#EA580C] font-bold hover:text-[#C2410C] hover:underline cursor-pointer"
              >
                View Khata →
              </button>
            </div>
          </div>

          {/* KPI 4: LOW STOCK (Red Accent #DC2626) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs hover:shadow-sm transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  LOW STOCK
                </span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                    (lowStock?.count || 0) > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  (lowStock?.count || 0) > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'
                }`}
              >
                {lowStock?.count || 0} <span className="text-lg font-bold text-[#64748B]">SKUs</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="text-[#64748B] font-medium">Items below reorder level</span>
              <button
                onClick={() => navigate('/inventory?filter=low')}
                className="text-[#DC2626] font-bold hover:underline cursor-pointer"
              >
                Restock →
              </button>
            </div>
          </div>
        </div>

        {/* QUICK STORE ACTIONS (White Background, Green / Amber / Saffron Accents) */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] border border-amber-300"></span>
              <h3 className="text-base sm:text-lg font-black text-[#0F172A]">
                Quick Store Actions
              </h3>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Everything you need at the counter.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
            {/* Primary Action: New Bill (Saffron Orange #EA580C) */}
            <button
              onClick={() => navigate('/pos')}
              className="col-span-2 sm:col-span-1 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Bill</span>
            </button>

            {/* Secondary Action 1: Receive Stock (White + Green #15803D) */}
            <button
              onClick={() => navigate('/inventory?action=receive')}
              className="bg-white hover:bg-[#F0FDF4] text-[#15803D] hover:text-[#166534] border border-[#E2E8F0] hover:border-[#15803D]/40 font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-[#15803D]" />
              <span>Receive Stock</span>
            </button>

            {/* Secondary Action 2: Settle Khata (White + Orange #EA580C) */}
            <button
              onClick={() => navigate('/khata')}
              className="bg-white hover:bg-amber-50 text-[#EA580C] hover:text-[#C2410C] border border-[#E2E8F0] hover:border-[#EA580C]/40 font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <IndianRupee className="w-4 h-4 text-[#EA580C]" />
              <span>Settle Khata</span>
            </button>

            {/* Secondary Action 3: GST Invoices (White + Green #15803D) */}
            <button
              onClick={() => navigate('/invoices')}
              className="bg-white hover:bg-[#F0FDF4] text-[#15803D] hover:text-[#166534] border border-[#E2E8F0] hover:border-[#15803D]/40 font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4 text-[#15803D]" />
              <span>GST Invoices</span>
            </button>
          </div>
        </div>

        {/* TWO COLUMNS: RECENT BILLS & STOCK ALERTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Bills (2 Columns) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-[#0F172A] text-base">Recent Bills</h3>
                <p className="text-xs text-[#64748B]">Latest completed counter sales</p>
              </div>
              <button
                onClick={() => navigate('/invoices')}
                className="text-xs font-bold text-[#15803D] hover:text-[#166534] flex items-center space-x-1 cursor-pointer"
              >
                <span>View all invoices →</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!recentBills || recentBills.length === 0 ? (
              <div className="py-12 text-center text-[#64748B] text-xs">
                No bills finalized yet today. Click "New Bill" to start!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 font-bold">BILL #</th>
                      <th className="py-2.5 px-3 font-bold">CUSTOMER</th>
                      <th className="py-2.5 px-3 font-bold">PAYMENT</th>
                      <th className="py-2.5 px-3 text-right font-bold">AMOUNT</th>
                      <th className="py-2.5 px-3 text-center font-bold">STATUS</th>
                      <th className="py-2.5 px-3 text-right font-bold">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {recentBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-[#F8FAFC] transition">
                        <td className="py-3 px-3 font-bold text-[#0F172A] font-mono">
                          {bill.bill_number}
                        </td>
                        <td className="py-3 px-3 text-[#0F172A] font-medium">
                          {bill.customer_name || 'Walk-in Customer'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wide border ${
                              bill.payment_mode === 'upi'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : bill.payment_mode === 'cash'
                                ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                                : bill.payment_mode === 'khata'
                                ? 'bg-amber-50 text-[#EA580C] border-amber-200'
                                : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'
                            }`}
                          >
                            {bill.payment_mode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-[#0F172A] text-sm">
                          {formatINR(bill.total_amount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span>
                            Paid
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <a
                            href={`/api/invoices/${bill.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg text-[#EA580C] hover:text-[#C2410C] hover:bg-amber-50 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#EA580C]" />
                            <span>PDF</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stock Alerts (1 Column) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-[#0F172A] text-base">Stock Alerts</h3>
                  <p className="text-xs text-[#64748B]">Items that need attention</p>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    (lowStock?.count || 0) > 0
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                  }`}
                >
                  {lowStock?.count || 0} SKUs
                </span>
              </div>

              {!lowStock?.items || lowStock.items.length === 0 ? (
                <div className="py-10 text-center text-[#64748B] text-xs">
                  <Package className="w-8 h-8 text-[#15803D] mx-auto mb-2 opacity-70" />
                  All inventory items are above reorder thresholds.
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStock.items.slice(0, 5).map((item) => {
                    const isCritical = Number(item.stock_qty) === 0;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          isCritical
                            ? 'bg-red-50/70 border-red-200'
                            : 'bg-amber-50/70 border-amber-200'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <p className="font-bold text-xs text-[#0F172A] truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-0.5">
                            <span>
                              Current:{' '}
                              <span
                                className={`font-bold ${
                                  isCritical ? 'text-red-700' : 'text-[#EA580C]'
                                }`}
                              >
                                {formatQtyUnit(item.stock_qty, item.unit)}
                              </span>
                            </span>
                            <span>•</span>
                            <span>Reorder: {item.reorder_level}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/inventory?restock=${item.id}`)}
                          className="flex-shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-white text-[#EA580C] hover:bg-amber-50 border border-[#E2E8F0] hover:border-[#EA580C]/40 transition active:scale-95 shadow-xs cursor-pointer"
                        >
                          + Receive Stock
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/inventory')}
              className="mt-5 w-full py-2.5 bg-[#F8FAFC] hover:bg-slate-100 text-[#15803D] border border-[#E2E8F0] rounded-xl text-xs font-bold transition text-center cursor-pointer"
            >
              View All Inventory Catalog →
            </button>
          </div>
        </div>
      </main>

      {/* REFER & EARN MODAL */}
      {showReferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-emerald-50 p-6 border-b border-[#E2E8F0]">
              <button
                onClick={() => setShowReferModal(false)}
                className="absolute top-4 right-4 p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-full hover:bg-white/80 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-2xl shadow-xs">
                  🎁
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0F172A]">Refer & Earn Rewards</h3>
                  <p className="text-xs text-[#64748B]">NEBULA Supermarket Partner Program</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#0F172A]">
                  <span>Your Unique Store Referral Link</span>
                  <span className="text-[10px] text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                    Active Partner
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value="https://nebula.store/join?ref=GUNA-KIRANA-2026"
                    className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-xl text-xs font-mono text-[#0F172A] select-all outline-hidden"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer ${
                      copied
                        ? 'bg-[#15803D] text-white shadow-xs'
                        : 'bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A]'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-bold text-[#0F172A]">How it works:</p>
                <div className="space-y-2 text-[#64748B]">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
                    <span>Invite fellow kirana or supermarket store owners using your link.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
                    <span>When they sign up for NEBULA, they get 1 month of free POS.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
                    <span>You receive ₹500 in billing credits instantly in your account.</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent('Hey! Manage your supermarket billing, POS, and inventory effortlessly with NEBULA Supermarket OS. Sign up with my link to get 1 Month Free: https://nebula.store/join?ref=GUNA-KIRANA-2026')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share via WhatsApp</span>
                </a>
                <button
                  onClick={() => setShowReferModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#0F172A] rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
