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
  Line
} from 'recharts';
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Package,
  IndianRupee,
  Download
} from 'lucide-react';
import Header from '../components/Header';
import { formatINR } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

export default function Reports({ onToggleSidebar }) {
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
    <div className="flex-1 flex flex-col min-h-screen bg-[#FFFAED]">
      <Header
        title="Reports & Tax Intelligence"
        subtitle="Visual analytics, GST collection reports for GSTR-1/3B & inventory capital valuation"
        onToggleSidebar={onToggleSidebar}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto w-full">
        {/* Filter Controls & Deck Download */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8E0CC] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <span className="text-[#6B6B63]">Analysis Timeframe:</span>
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: 'Last 90 Days' }
            ].map((period) => (
              <button
                key={period.id}
                onClick={() => setRange(period.id)}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  range === period.id
                    ? 'bg-[#287A4B] text-white shadow-xs'
                    : 'bg-[#FFFAED] text-[#6B6B63] hover:bg-[#F0FDF4] hover:text-[#287A4B] border border-[#E8E0CC]'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <a
              href="/api/reports/deck"
              download
              className="px-3 py-2 bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#287A4B] font-bold text-xs rounded-xl border border-[#E8E0CC] flex items-center space-x-1.5 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-[#287A4B]" />
              <span>Download Analysis Deck (.pptx)</span>
            </a>

            <button
              onClick={fetchReports}
              className="p-2 bg-[#FFFAED] hover:bg-slate-100 text-[#6B6B63] rounded-xl border border-[#E8E0CC] transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#287A4B]' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 KPI Cards: Valuation & Stock Capital */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E8E0CC] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B63]">
                Total SKUs
              </span>
              <Package className="w-4 h-4 text-[#287A4B]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#292929]">
              {stockHealth.total_skus || 0}
            </div>
            <p className="text-xs text-[#6B6B63] mt-1">Catalog items tracked</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8E0CC] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B63]">
                Stock Capital Cost
              </span>
              <IndianRupee className="w-4 h-4 text-[#6B6B63]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#292929]">
              {formatINR(stockHealth.inventory_cost_value || 0)}
            </div>
            <p className="text-xs text-[#6B6B63] mt-1">Total wholesale capital tied in inventory</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8E0CC] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B63]">
                Retail MRP Valuation
              </span>
              <TrendingUp className="w-4 h-4 text-[#287A4B]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#287A4B]">
              {formatINR(stockHealth.inventory_retail_value || 0)}
            </div>
            <p className="text-xs text-[#6B6B63] mt-1">Potential retail sales realization</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8E0CC] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B63]">
                Potential Gross Margin
              </span>
              <span className="text-xs font-bold text-[#287A4B] bg-[#F0FDF4] px-1.5 py-0.5 rounded border border-[#E8E0CC]">
                {stockHealth.inventory_retail_value > 0
                  ? (
                      ((stockHealth.inventory_retail_value - stockHealth.inventory_cost_value) /
                        stockHealth.inventory_retail_value) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#287A4B]">
              {formatINR(
                (stockHealth.inventory_retail_value || 0) - (stockHealth.inventory_cost_value || 0)
              )}
            </div>
            <p className="text-xs text-[#6B6B63] mt-1">Expected gross trading profit</p>
          </div>
        </div>

        {/* Charts: Sales Velocity & Top SKUs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Sales Trend LineChart */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E0CC] shadow-xs">
            <h3 className="font-bold text-[#292929] text-sm mb-1">Sales Velocity Trend</h3>
            <p className="text-xs text-[#6B6B63] mb-4">Gross counter revenue timeline</p>

            {salesTrend.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-[#6B6B63] text-xs">
                No sales records found for this period.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E0CC" />
                    <XAxis dataKey="date" stroke="#6B6B63" fontSize={11} tickLine={false} />
                    <YAxis stroke="#6B6B63" fontSize={11} tickLine={false} />
                    <Tooltip
                      formatter={(val) => [formatINR(val), 'Revenue']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        borderColor: '#E8E0CC',
                        fontSize: '12px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#287A4B"
                      strokeWidth={2.5}
                      dot={{ fill: '#287A4B', r: 4 }}
                      activeDot={{ r: 6, fill: '#F28C28' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Products BarChart */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E0CC] shadow-xs">
            <h3 className="font-bold text-[#292929] text-sm mb-1">Top Selling SKUs</h3>
            <p className="text-xs text-[#6B6B63] mb-4">Ranked by revenue contribution</p>

            {topProducts.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-[#6B6B63] text-xs">
                No product sales records found for this period.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts.slice(0, 6)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E0CC" />
                    <XAxis type="number" stroke="#6B6B63" fontSize={11} tickLine={false} />
                    <YAxis
                      dataKey="product_name"
                      type="category"
                      stroke="#6B6B63"
                      fontSize={10}
                      width={90}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val) => [formatINR(val), 'Revenue']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        borderColor: '#E8E0CC',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="total_revenue" fill="#287A4B" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* GST Tax Collection Breakdown (GSTR-1 & GSTR-3B Compliant) */}
        <div className="bg-white rounded-2xl border border-[#E8E0CC] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E8E0CC] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#287A4B]" />
              <h3 className="font-bold text-[#292929] text-sm">
                GST Tax Collection Breakdown (GSTR-1 & GSTR-3B Filing Table)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-[#287A4B] bg-[#F0FDF4] px-2.5 py-1 rounded-lg border border-[#E8E0CC]">
              Intra-state CGST + SGST (50/50 Split)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFFAED] border-b border-[#E8E0CC] text-[#6B6B63] font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">GST Slab Rate</th>
                  <th className="py-3 px-3 text-right">Taxable Turnover (₹)</th>
                  <th className="py-3 px-3 text-right">CGST Collected (₹)</th>
                  <th className="py-3 px-3 text-right">SGST Collected (₹)</th>
                  <th className="py-3 px-4 text-right">Total GST (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0CC]">
                {gstBreakup.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-[#6B6B63]">
                      No GST sales recorded in this period.
                    </td>
                  </tr>
                ) : (
                  gstBreakup.map((row) => (
                    <tr key={row.gst_slab} className="hover:bg-[#FFFAED] transition">
                      <td className="py-3 px-4 font-bold text-[#292929]">{row.gst_slab}% Slab</td>
                      <td className="py-3 px-3 text-right font-medium text-[#6B6B63]">
                        {formatINR(row.taxable_value)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-[#292929]">
                        {formatINR(row.cgst_amount)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-[#292929]">
                        {formatINR(row.sgst_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#287A4B]">
                        {formatINR(row.cgst_amount + row.sgst_amount)}
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
