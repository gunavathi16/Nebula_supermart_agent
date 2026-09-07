import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Users,
  ShoppingCart,
  FileText,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  IndianRupee,
  CheckCircle2
} from 'lucide-react';
import Header from '../components/Header';
import { formatINR, formatDateTime, formatQtyUnit } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
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

    const interval = setInterval(fetchDashboardData, 6000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title={t('dashboard_title')} subtitle={t('dashboard_subtitle')} />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
        </div>
      </div>
    );
  }

  const { today, paymentSplit, khata, lowStock, recentBills } = data || {};

  // Aggregate payment modes
  const paymentMap = { cash: 0, upi: 0, card: 0, khata: 0 };
  (paymentSplit || []).forEach(p => {
    if (paymentMap[p.payment_mode] !== undefined) {
      paymentMap[p.payment_mode] = p.amount;
    }
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header title={t('dashboard_title')} subtitle={t('dashboard_subtitle')} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchDashboardData} className="underline font-semibold">{t('dash_retry')}</button>
          </div>
        )}

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Today's Sales */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-200 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('dash_today_sales')}</span>
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {formatINR(today?.total_sales || 0)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{today?.total_bills || 0} {t('dash_bills_cut')}</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('dash_gst_active')}
              </span>
            </div>
          </div>

          {/* Card 2: Payment Mode Split */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('dash_payments_today')}</span>
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">UPI:</span>
                <span className="font-bold text-slate-900">{formatINR(paymentMap.upi)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">{t('pos_pay_cash')}:</span>
                <span className="font-bold text-slate-900">{formatINR(paymentMap.cash)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">{t('pos_pay_card')} / {t('pos_pay_khata')}:</span>
                <span className="font-bold text-slate-900">{formatINR(paymentMap.card + paymentMap.khata)}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Khata Total Outstanding */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-200 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('dash_khata_outstanding')}</span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-700 tracking-tight">
              {formatINR(khata?.total_outstanding || 0)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{khata?.customers_with_dues || 0} {t('dash_customers_dues')}</span>
              <button
                onClick={() => navigate('/khata')}
                className="text-amber-600 font-semibold hover:underline"
              >
                {t('dash_view_khata')}
              </button>
            </div>
          </div>

          {/* Card 4: Low Stock Warnings */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-red-200 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('dash_low_stock_skus')}</span>
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-600 tracking-tight">
              {lowStock?.count || 0}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{t('dash_items_below_reorder')}</span>
              <button
                onClick={() => navigate('/inventory?filter=low')}
                className="text-rose-600 font-semibold hover:underline"
              >
                {t('dash_restock')}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Operations Bar */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-bold">
              ₹
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base">{t('dash_quick_actions')}</h2>
              <p className="text-xs text-slate-300">{t('dash_quick_desc')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/pos')}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center space-x-1.5 transition active:scale-95 shadow"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t('dash_cut_bill')}</span>
            </button>
            <button
              onClick={() => navigate('/inventory')}
              className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium text-xs sm:text-sm px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('dash_receive_stock')}</span>
            </button>
            <button
              onClick={() => navigate('/khata')}
              className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium text-xs sm:text-sm px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition active:scale-95"
            >
              <IndianRupee className="w-4 h-4" />
              <span>{t('dash_settle_khata')}</span>
            </button>
            <button
              onClick={() => navigate('/invoices')}
              className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium text-xs sm:text-sm px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>{t('dash_gst_invoices')}</span>
            </button>
          </div>
        </div>

        {/* Two Columns: Recent Finalized Bills & Low Stock Restock List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Bills (2 Columns) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{t('dash_recent_bills')}</h3>
                <p className="text-xs text-slate-500">{t('dash_recent_desc')}</p>
              </div>
              <button
                onClick={() => navigate('/invoices')}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1"
              >
                <span>{t('dash_view_all_invoices')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {(!recentBills || recentBills.length === 0) ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                {t('dash_no_bills')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3">{t('dash_bill_num')}</th>
                      <th className="pb-3">{t('dash_customer')}</th>
                      <th className="pb-3">{t('dash_mode')}</th>
                      <th className="pb-3 text-right">{t('dash_amount')}</th>
                      <th className="pb-3 text-right">{t('dash_action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentBills.map(bill => (
                      <tr key={bill.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 font-bold text-slate-900">{bill.bill_number}</td>
                        <td className="py-3 text-slate-600 font-medium">
                          {bill.customer_name || 'Walk-in Customer'}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                            bill.payment_mode === 'upi' ? 'bg-indigo-100 text-indigo-700' :
                            bill.payment_mode === 'cash' ? 'bg-emerald-100 text-emerald-700' :
                            bill.payment_mode === 'khata' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {bill.payment_mode}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-slate-900">
                          {formatINR(bill.total_amount)}
                        </td>
                        <td className="py-3 text-right">
                          <a
                            href={`/api/invoices/${bill.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            <FileText className="w-3 h-3" />
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

          {/* Low Stock Alerts (1 Column) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{t('dash_low_stock_alert')}</h3>
                  <p className="text-xs text-slate-500">{t('dash_items_below_reorder')}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  {lowStock?.count || 0}
                </span>
              </div>

              {(!lowStock?.items || lowStock.items.length === 0) ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  All inventory stocks are healthy above reorder thresholds.
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStock.items.map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div className="overflow-hidden pr-2">
                        <p className="font-semibold text-xs text-slate-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {t('dash_current_stock')}: <span className="font-bold text-rose-600">{formatQtyUnit(item.stock_qty, item.unit)}</span>
                          {' '}({t('dash_reorder_level')}: {item.reorder_level})
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/inventory?restock=${item.id}`)}
                        className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition"
                      >
                        + {t('dash_receive_stock')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/inventory')}
              className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition text-center"
            >
              {t('inv_title')} →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
