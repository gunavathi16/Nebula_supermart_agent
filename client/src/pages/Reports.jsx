import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import {
  BarChart3,
  Calendar,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Package,
  AlertTriangle,
  IndianRupee
} from 'lucide-react';
import Header from '../components/Header';
import { formatINR, formatNumber } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

export default function Reports() {
  const { t } = useLanguage();
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/reports/analytics', {
        params: { range }
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [range]);

  const { salesTrend = [], topProducts = [], gstBreakup = [], stockHealth = {} } = data || {};

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header title={t('rep_title')} subtitle={t('rep_subtitle')} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <span className="text-slate-500">Analysis Timeframe:</span>
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: 'Last 90 Days' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setRange(t.id)}
                className={`px-3 py-1.5 rounded-xl transition ${
                  range === t.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchReports}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Inventory Valuation & Health KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total SKUs</span>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stockHealth.total_skus || 0}</div>
            <div className="text-xs text-emerald-600 font-semibold mt-1">
              {stockHealth.healthy_stock || 0} items well-stocked
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Inventory Cost</span>
              <IndianRupee className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {formatINR(stockHealth.total_inventory_cost_value || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Capital tied in stock</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Retail Value (MRP)</span>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">
              {formatINR(stockHealth.total_inventory_retail_value || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Expected retail realization</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Low Stock Needs</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-extrabold text-rose-600">
              {(stockHealth.low_stock || 0) + (stockHealth.out_of_stock || 0)}
            </div>
            <div className="text-xs text-rose-600 font-semibold mt-1">
              {stockHealth.out_of_stock || 0} completely out of stock
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Daily Revenue Trend */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Sales Revenue & GST Trend</h3>
              <p className="text-xs text-slate-500">Daily gross collection vs tax component</p>
            </div>

            <div className="h-72 w-full">
              {salesTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No sales recorded in this period yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="sale_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(val) => [formatINR(val), '']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="total_sales" name="Sales (₹)" fill="#ea580c" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="total_gst" name="GST Tax (₹)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Top Selling Products */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Top Selling Products</h3>
              <p className="text-xs text-slate-500">Highest grossing SKUs in selected timeframe</p>
            </div>

            <div className="h-72 w-full">
              {topProducts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No products sold in this period yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topProducts.slice(0, 6)}
                    margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      dataKey="product_name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 10, fill: '#334155' }}
                    />
                    <Tooltip
                      formatter={(val) => [formatINR(val), 'Revenue']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="total_revenue" fill="#10b981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* GST Tax Collection Slabs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">GST Tax Collection by Slab</h3>
              <p className="text-xs text-slate-500">
                Official intra-state 50-50 CGST and SGST split report for monthly/quarterly GSTR-1 & GSTR-3B filings
              </p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>GSTR-1 Ready</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">GST Rate Slab</th>
                  <th className="py-3 px-3">Taxable Value (A)</th>
                  <th className="py-3 px-3">CGST (Rate / 2)</th>
                  <th className="py-3 px-3">SGST (Rate / 2)</th>
                  <th className="py-3 px-3">Total Tax (CGST + SGST)</th>
                  <th className="py-3 px-4 text-right">Gross Invoiced Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gstBreakup.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No GST records for this timeframe.
                    </td>
                  </tr>
                ) : (
                  gstBreakup.map((row) => (
                    <tr key={row.gst_slab} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                          {row.gst_slab}% Slab
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {formatINR(row.taxable_value)}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {formatINR(row.cgst_collected)} ({row.gst_slab / 2}%)
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {formatINR(row.sgst_collected)} ({row.gst_slab / 2}%)
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatINR(row.total_gst)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {formatINR(row.gross_sales)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
