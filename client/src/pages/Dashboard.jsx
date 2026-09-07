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
  CheckCircle2
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
      <div className="flex-1 flex flex-col min-h-screen bg-[#FFFAED]">
        <Header
          title="Store Dashboard"
          subtitle="Here's how your store is doing today."
          onToggleSidebar={onToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#287A4B] animate-spin" />
            <p className="text-xs font-semibold text-[#6B6B63]">Loading store metrics...</p>
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
    <div className="flex-1 flex flex-col min-h-screen bg-[#FFFAED]">
      <Header
        title="Store Dashboard"
        subtitle="Here's how your store is doing today."
        onToggleSidebar={onToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* WARM NEBULA BRANDED GREETING BANNER */}
        <div className="bg-[#FFF4D6] rounded-2xl border border-[#E8E0CC] p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <BrandLogo size="md" showText={true} showTagline={true} />
            <div className="hidden sm:block h-10 w-px bg-[#E8E0CC]" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#292929] tracking-tight flex items-center gap-1.5">
                <span>{getGreeting()}, {displayName}</span>
                <span>👋</span>
              </h2>
              <p className="text-xs text-[#6B6B63] font-normal mt-0.5">
                Here's how your store is doing today.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Hand-drawn Grocery Bag illustration decorative accent */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-[#FFFAED] border border-[#E8E0CC] p-1.5 hidden md:flex items-center justify-center flex-shrink-0 shadow-2xs">
              <img
                src="/nebula-bag-logo.png"
                alt="NEBULA Grocery"
                className="w-full h-full object-contain"
              />
            </div>
            <button
              onClick={fetchDashboardData}
              title="Refresh metrics"
              className="p-2.5 bg-white border border-[#E8E0CC] hover:bg-[#FFF4D6] text-[#292929] rounded-xl transition shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#287A4B]' : ''}`} />
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

        {/* 4 KPI CARDS (Warm White, #E8E0CC Border, Color Accents) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 1: TODAY'S SALES (Green Accent #287A4B) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8E0CC] shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B63]">
                  TODAY'S SALES
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#287A4B] border border-[#E8E0CC] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#287A4B] tracking-tight">
                {formatINR(today?.total_sales || 0)}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E8E0CC]/60 flex items-center justify-between text-xs text-[#6B6B63]">
              <span className="font-semibold text-[#292929]">
                {today?.total_bills || 0} bills today
              </span>
              <span className="text-[#287A4B] font-semibold flex items-center gap-1 bg-[#F0FDF4] px-2 py-0.5 rounded-full border border-[#E8E0CC] text-[10px]">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            </div>
          </div>

          {/* KPI 2: PAYMENTS TODAY (Subtle Blue / Yellow Accent) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8E0CC] shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B63]">
                  PAYMENTS TODAY
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5 mt-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B63] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> UPI
                  </span>
                  <span className="font-bold text-[#292929]">{formatINR(paymentMap.upi)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B63] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#287A4B]"></span> Cash
                  </span>
                  <span className="font-bold text-[#292929]">{formatINR(paymentMap.cash)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B63] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F28C28]"></span> Card / Khata
                  </span>
                  <span className="font-bold text-[#292929]">
                    {formatINR(paymentMap.card + paymentMap.khata)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#E8E0CC]/60 text-[11px] text-[#6B6B63] flex justify-between font-medium">
              <span>Gross Collected</span>
              <span className="font-bold text-[#292929]">
                {formatINR(paymentMap.upi + paymentMap.cash + paymentMap.card)}
              </span>
            </div>
          </div>

          {/* KPI 3: KHATA OUTSTANDING (Orange Accent #F28C28) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8E0CC] shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B63]">
                  KHATA OUTSTANDING
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#FFF4D6] text-[#F28C28] border border-[#FFE7A3] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#F28C28] tracking-tight">
                {formatINR(khata?.total_outstanding || 0)}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E8E0CC]/60 flex items-center justify-between text-xs">
              <span className="text-[#6B6B63] font-medium">
                {khata?.customers_with_dues || 0} customers with dues
              </span>
              <button
                onClick={() => navigate('/khata')}
                className="text-[#F28C28] font-bold hover:text-[#D9771A] hover:underline cursor-pointer"
              >
                View Khata →
              </button>
            </div>
          </div>

          {/* KPI 4: LOW STOCK (Red Accent #DC2626) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8E0CC] shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B63]">
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
                  (lowStock?.count || 0) > 0 ? 'text-[#DC2626]' : 'text-[#287A4B]'
                }`}
              >
                {lowStock?.count || 0} <span className="text-lg font-bold text-[#6B6B63]">SKUs</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E8E0CC]/60 flex items-center justify-between text-xs">
              <span className="text-[#6B6B63] font-medium">Items below reorder level</span>
              <button
                onClick={() => navigate('/inventory?filter=low')}
                className="text-[#DC2626] font-bold hover:underline cursor-pointer"
              >
                Restock →
              </button>
            </div>
          </div>
        </div>

        {/* QUICK STORE ACTIONS (Warm White Background, Green / Yellow / Saffron Accents) */}
        <div className="bg-white rounded-2xl border border-[#E8E0CC] p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD84D] border border-[#E8E0CC]"></span>
              <h3 className="text-base sm:text-lg font-black text-[#292929]">
                Quick Store Actions
              </h3>
            </div>
            <p className="text-xs text-[#6B6B63] mt-0.5">
              Everything you need at the counter.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
            {/* Primary Action: New Bill (Saffron Orange #F28C28) */}
            <button
              onClick={() => navigate('/pos')}
              className="col-span-2 sm:col-span-1 bg-[#F28C28] hover:bg-[#D9771A] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Bill</span>
            </button>

            {/* Secondary Action 1: Receive Stock (White + Green #287A4B) */}
            <button
              onClick={() => navigate('/inventory?action=receive')}
              className="bg-white hover:bg-[#F0FDF4] text-[#287A4B] hover:text-[#1E603A] border border-[#E8E0CC] hover:border-[#287A4B]/40 font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <PlusCircle className="w-4 h-4 text-[#287A4B]" />
              <span>Receive Stock</span>
            </button>

            {/* Secondary Action 2: Settle Khata (White + Orange #F28C28) */}
            <button
              onClick={() => navigate('/khata')}
              className="bg-white hover:bg-[#FFF4D6] text-[#F28C28] hover:text-[#D9771A] border border-[#E8E0CC] hover:border-[#F28C28]/40 font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <IndianRupee className="w-4 h-4 text-[#F28C28]" />
              <span>Settle Khata</span>
            </button>

            {/* Secondary Action 3: GST Invoices (White + Green #287A4B) */}
            <button
              onClick={() => navigate('/invoices')}
              className="bg-white hover:bg-[#F0FDF4] text-[#287A4B] hover:text-[#1E603A] border border-[#E8E0CC] hover:border-[#287A4B]/40 font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <FileText className="w-4 h-4 text-[#287A4B]" />
              <span>GST Invoices</span>
            </button>
          </div>
        </div>

        {/* TWO COLUMNS: RECENT BILLS & STOCK ALERTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Bills (2 Columns) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E0CC] p-5 sm:p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-[#292929] text-base">Recent Bills</h3>
                <p className="text-xs text-[#6B6B63]">Latest completed counter sales</p>
              </div>
              <button
                onClick={() => navigate('/invoices')}
                className="text-xs font-bold text-[#287A4B] hover:text-[#1E603A] flex items-center space-x-1 cursor-pointer"
              >
                <span>View all invoices →</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!recentBills || recentBills.length === 0 ? (
              <div className="py-12 text-center text-[#6B6B63] text-xs">
                No bills finalized yet today. Click "New Bill" to start!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E8E0CC] bg-[#FFFAED] text-[#6B6B63] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 font-bold">BILL #</th>
                      <th className="py-2.5 px-3 font-bold">CUSTOMER</th>
                      <th className="py-2.5 px-3 font-bold">PAYMENT</th>
                      <th className="py-2.5 px-3 text-right font-bold">AMOUNT</th>
                      <th className="py-2.5 px-3 text-center font-bold">STATUS</th>
                      <th className="py-2.5 px-3 text-right font-bold">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E0CC]/60">
                    {recentBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-[#FFFAED] transition">
                        <td className="py-3 px-3 font-bold text-[#292929] font-mono">
                          {bill.bill_number}
                        </td>
                        <td className="py-3 px-3 text-[#292929] font-medium">
                          {bill.customer_name || 'Walk-in Customer'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wide border ${
                              bill.payment_mode === 'upi'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : bill.payment_mode === 'cash'
                                ? 'bg-[#F0FDF4] text-[#287A4B] border-[#E8E0CC]'
                                : bill.payment_mode === 'khata'
                                ? 'bg-[#FFF4D6] text-[#F28C28] border-[#FFE7A3]'
                                : 'bg-[#FFFAED] text-[#292929] border-[#E8E0CC]'
                            }`}
                          >
                            {bill.payment_mode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-[#292929] text-sm">
                          {formatINR(bill.total_amount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#287A4B] bg-[#F0FDF4] px-2 py-0.5 rounded-full border border-[#E8E0CC]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#287A4B]"></span>
                            Paid
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <a
                            href={`/api/invoices/${bill.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg text-[#F28C28] hover:text-[#D9771A] hover:bg-[#FFF4D6] transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#F28C28]" />
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
          <div className="bg-white rounded-2xl border border-[#E8E0CC] p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-[#292929] text-base">Stock Alerts</h3>
                  <p className="text-xs text-[#6B6B63]">Items that need attention</p>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    (lowStock?.count || 0) > 0
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-[#F0FDF4] text-[#287A4B] border-[#E8E0CC]'
                  }`}
                >
                  {lowStock?.count || 0} SKUs
                </span>
              </div>

              {!lowStock?.items || lowStock.items.length === 0 ? (
                <div className="py-10 text-center text-[#6B6B63] text-xs">
                  <Package className="w-8 h-8 text-[#287A4B] mx-auto mb-2 opacity-70" />
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
                            : 'bg-[#FFF4D6]/70 border-[#FFE7A3]'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <p className="font-bold text-xs text-[#292929] truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-[#6B6B63] mt-0.5">
                            <span>
                              Current:{' '}
                              <span
                                className={`font-bold ${
                                  isCritical ? 'text-red-700' : 'text-[#F28C28]'
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
                          className="flex-shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-white text-[#F28C28] hover:bg-[#FFF4D6] border border-[#E8E0CC] hover:border-[#F28C28]/40 transition active:scale-95 shadow-2xs cursor-pointer"
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
              className="mt-5 w-full py-2.5 bg-[#FFFAED] hover:bg-[#FFF4D6] text-[#287A4B] border border-[#E8E0CC] rounded-xl text-xs font-bold transition text-center cursor-pointer"
            >
              View All Inventory Catalog →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
