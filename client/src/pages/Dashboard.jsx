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
import { formatINR, formatQtyUnit } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get('/api/reports/dashboard');
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const onFocus = () => fetchDashboardData();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(fetchDashboardData, 8000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const displayName = user?.name ? user.name.split(' ')[0].toUpperCase() : 'RAJESH';

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-[#FAFAF7]">
        <Header
          title="Store Dashboard"
          subtitle="Here's how your store is doing today."
          onToggleSidebar={onToggleSidebar}
        />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#14532D] animate-spin" />
            <p className="text-xs font-semibold text-[#647067]">Loading store metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  const { today, paymentSplit, khata, lowStock, recentBills } = data || {};

  // Aggregate payment modes
  const paymentMap = { cash: 0, upi: 0, card: 0, khata: 0 };
  (paymentSplit || []).forEach((p) => {
    if (paymentMap[p.payment_mode] !== undefined) {
      paymentMap[p.payment_mode] = p.amount;
    }
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FAFAF7]">
      <Header
        title="Store Dashboard"
        subtitle="Here's how your store is doing today."
        onToggleSidebar={onToggleSidebar}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Greeting Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-[#14532D] uppercase bg-[#F0FDF4] px-2.5 py-1 rounded-lg border border-[#BBF7D0]">
                {getGreeting()}, {displayName} 👋
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#172018] tracking-tight mt-1">
              Store Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-[#647067] font-normal">
              Here's how your store is doing today.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/pos')}
              className="flex items-center gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ New Bill</span>
            </button>
            <button
              onClick={fetchDashboardData}
              title="Refresh metrics"
              className="p-2.5 bg-white border border-[#E5E7E2] hover:bg-slate-50 text-[#647067] rounded-xl transition shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#14532D]' : ''}`} />
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

        {/* 4 KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 1: TODAY'S SALES */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7E2] shadow-xs hover:shadow-card transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  TODAY'S SALES
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#14532D] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#14532D] tracking-tight">
                {formatINR(today?.total_sales || 0)}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5E7E2]/60 flex items-center justify-between text-xs text-[#647067]">
              <span className="font-semibold text-[#172018]">
                {today?.total_bills || 0} bills today
              </span>
              <span className="text-[#16A34A] font-semibold flex items-center gap-1 bg-[#F0FDF4] px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            </div>
          </div>

          {/* KPI 2: PAYMENTS TODAY */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7E2] shadow-xs hover:shadow-card transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  PAYMENTS TODAY
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5 mt-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#647067] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> UPI
                  </span>
                  <span className="font-bold text-[#172018]">{formatINR(paymentMap.upi)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#647067] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span> Cash
                  </span>
                  <span className="font-bold text-[#172018]">{formatINR(paymentMap.cash)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#647067] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]"></span> Card / Khata
                  </span>
                  <span className="font-bold text-[#172018]">
                    {formatINR(paymentMap.card + paymentMap.khata)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#E5E7E2]/60 text-[11px] text-[#647067] flex justify-between font-medium">
              <span>Gross Collected</span>
              <span className="font-bold text-[#172018]">
                {formatINR(paymentMap.upi + paymentMap.cash + paymentMap.card)}
              </span>
            </div>
          </div>

          {/* KPI 3: KHATA OUTSTANDING */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7E2] shadow-xs hover:shadow-card transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  KHATA OUTSTANDING
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#F97316] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#B45309] tracking-tight">
                {formatINR(khata?.total_outstanding || 0)}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5E7E2]/60 flex items-center justify-between text-xs">
              <span className="text-[#647067] font-medium">
                {khata?.customers_with_dues || 0} customers with dues
              </span>
              <button
                onClick={() => navigate('/khata')}
                className="text-[#14532D] font-bold hover:text-[#166534] hover:underline"
              >
                View Khata →
              </button>
            </div>
          </div>

          {/* KPI 4: LOW STOCK */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7E2] shadow-xs hover:shadow-card transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#647067]">
                  LOW STOCK
                </span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    (lowStock?.count || 0) > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  (lowStock?.count || 0) > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'
                }`}
              >
                {lowStock?.count || 0} <span className="text-lg font-bold text-[#647067]">SKUs</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5E7E2]/60 flex items-center justify-between text-xs">
              <span className="text-[#647067] font-medium">Items below reorder level</span>
              <button
                onClick={() => navigate('/inventory?filter=low')}
                className="text-[#DC2626] font-bold hover:underline"
              >
                Restock →
              </button>
            </div>
          </div>
        </div>

        {/* LIGHT BRANDED QUICK ACTIONS */}
        <div className="bg-white rounded-2xl border border-[#E5E7E2] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#14532D]"></span>
              <h3 className="text-base sm:text-lg font-bold text-[#172018]">
                Quick Store Actions
              </h3>
            </div>
            <p className="text-xs text-[#647067] mt-0.5">
              Everything you need at the counter.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
            {/* Primary Action: + New Bill (Saffron) */}
            <button
              onClick={() => navigate('/pos')}
              className="col-span-2 sm:col-span-1 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-xs transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ New Bill</span>
            </button>

            {/* Secondary Action 1: Receive Stock */}
            <button
              onClick={() => navigate('/inventory?action=receive')}
              className="bg-[#FAFAF7] hover:bg-[#F0FDF4] text-[#172018] hover:text-[#14532D] border border-[#E5E7E2] font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-[#22C55E]" />
              <span>Receive Stock</span>
            </button>

            {/* Secondary Action 2: Settle Khata */}
            <button
              onClick={() => navigate('/khata')}
              className="bg-[#FAFAF7] hover:bg-[#F0FDF4] text-[#172018] hover:text-[#14532D] border border-[#E5E7E2] font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95"
            >
              <IndianRupee className="w-4 h-4 text-[#F97316]" />
              <span>Settle Khata</span>
            </button>

            {/* Secondary Action 3: GST Invoices */}
            <button
              onClick={() => navigate('/invoices')}
              className="bg-[#FAFAF7] hover:bg-[#F0FDF4] text-[#172018] hover:text-[#14532D] border border-[#E5E7E2] font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95"
            >
              <FileText className="w-4 h-4 text-[#14532D]" />
              <span>GST Invoices</span>
            </button>
          </div>
        </div>

        {/* TWO COLUMNS: RECENT BILLS & STOCK ALERTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Bills (2 Columns) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7E2] p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-[#172018] text-base">Recent Bills</h3>
                <p className="text-xs text-[#647067]">Latest completed counter sales</p>
              </div>
              <button
                onClick={() => navigate('/invoices')}
                className="text-xs font-bold text-[#14532D] hover:text-[#166534] flex items-center space-x-1"
              >
                <span>View all invoices →</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!recentBills || recentBills.length === 0 ? (
              <div className="py-12 text-center text-[#647067] text-xs">
                No bills finalized yet today. Click "+ New Bill" to start!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7E2] text-[#647067] font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-bold">BILL #</th>
                      <th className="pb-3 font-bold">CUSTOMER</th>
                      <th className="pb-3 font-bold">PAYMENT</th>
                      <th className="pb-3 text-right font-bold">AMOUNT</th>
                      <th className="pb-3 text-center font-bold">STATUS</th>
                      <th className="pb-3 text-right font-bold">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7E2]/60">
                    {recentBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-[#FAFAF7] transition">
                        <td className="py-3 font-bold text-[#172018] font-mono">
                          {bill.bill_number}
                        </td>
                        <td className="py-3 text-[#172018] font-medium">
                          {bill.customer_name || 'Walk-in Customer'}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wide ${
                              bill.payment_mode === 'upi'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : bill.payment_mode === 'cash'
                                ? 'bg-[#F0FDF4] text-[#14532D] border border-[#BBF7D0]'
                                : bill.payment_mode === 'khata'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {bill.payment_mode}
                          </span>
                        </td>
                        <td className="py-3 text-right font-black text-[#172018] text-sm">
                          {formatINR(bill.total_amount)}
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                            Paid
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <a
                            href={`/api/invoices/${bill.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg text-[#14532D] hover:bg-[#F0FDF4] border border-transparent hover:border-[#BBF7D0] transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#14532D]" />
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
          <div className="bg-white rounded-2xl border border-[#E5E7E2] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#172018] text-base">Stock Alerts</h3>
                  <p className="text-xs text-[#647067]">Items that need attention</p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    (lowStock?.count || 0) > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {lowStock?.count || 0} SKUs
                </span>
              </div>

              {!lowStock?.items || lowStock.items.length === 0 ? (
                <div className="py-10 text-center text-[#647067] text-xs">
                  <Package className="w-8 h-8 text-[#22C55E] mx-auto mb-2 opacity-70" />
                  All inventory items are above reorder thresholds.
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStock.items.slice(0, 5).map((item) => {
                    const isCritical = Number(item.stock_qty) === 0;
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E5E7E2] flex items-center justify-between gap-3"
                      >
                        <div className="overflow-hidden">
                          <p className="font-bold text-xs text-[#172018] truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-[#647067] mt-0.5">
                            <span>
                              Current:{' '}
                              <span
                                className={`font-bold ${
                                  isCritical ? 'text-[#DC2626]' : 'text-[#F97316]'
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
                          className="flex-shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#F0FDF4] text-[#14532D] hover:bg-[#DCFCE7] border border-[#BBF7D0] transition active:scale-95"
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
              className="mt-5 w-full py-2.5 bg-[#FAFAF7] hover:bg-[#F0FDF4] text-[#14532D] border border-[#E5E7E2] rounded-xl text-xs font-bold transition text-center"
            >
              View All Inventory Catalog →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
