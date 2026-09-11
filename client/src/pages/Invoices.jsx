import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText,
  Search,
  Download,
  Eye,
  RefreshCw,
  X,
  ShieldCheck
} from 'lucide-react';
import Header from '../components/Header';
import { formatINR, formatDateTime } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import BrandLogo from '../components/BrandLogo';

export default function Invoices({ onToggleSidebar }) {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/invoices', {
        params: {
          search: search || undefined,
          payment_mode: paymentMode || undefined
        }
      });
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [paymentMode]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleOpenPreview = async (inv) => {
    setShowPreviewModal(true);
    setLoadingDetail(true);
    try {
      const res = await axios.get(`/api/invoices/${inv.id}`);
      setSelectedInvoice(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC]">
      <Header
        title="GST Tax Invoices"
        subtitle="Historical counter bill register, preview drawer & downloadable Form GST INV-1 PDFs"
        onToggleSidebar={onToggleSidebar}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto w-full">
        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Bill # or Customer Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden font-medium"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#15803D] bg-[#F0FDF4] px-3 py-2 rounded-xl border border-[#E2E8F0]">
              <ShieldCheck className="w-4 h-4 text-[#15803D]" />
              <span>GST Status: Active (Intra-state CGST+SGST)</span>
            </div>

            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] outline-hidden"
            >
              <option value="">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="khata">Khata (Credit)</option>
            </select>

            <button
              onClick={fetchInvoices}
              className="p-2 bg-[#F8FAFC] hover:bg-slate-100 text-[#64748B] rounded-xl border border-[#E2E8F0] transition cursor-pointer"
              title="Refresh Invoices"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#15803D]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Invoices List Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-3">Date & Time</th>
                  <th className="py-3.5 px-3">Customer</th>
                  <th className="py-3.5 px-3">Payment</th>
                  <th className="py-3.5 px-3 text-right">Taxable Value</th>
                  <th className="py-3.5 px-3 text-right">GST Total</th>
                  <th className="py-3.5 px-3 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-[#64748B]">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#15803D]" />
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-[#64748B]">
                      No invoices found. Cut your first bill on the POS screen!
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleOpenPreview(inv)}
                          className="font-bold text-[#15803D] hover:underline font-mono text-xs cursor-pointer"
                        >
                          {inv.bill_number}
                        </button>
                      </td>

                      <td className="py-3.5 px-3 text-[#64748B]">
                        {formatDateTime(inv.finalized_at || inv.created_at)}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-[#0F172A]">
                          {inv.customer_name || 'Walk-in'}
                        </div>
                        {inv.customer_phone && (
                          <div className="text-[10px] text-[#64748B]">{inv.customer_phone}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                            inv.payment_mode === 'upi'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : inv.payment_mode === 'cash'
                              ? 'bg-[#F0FDF4] text-[#15803D] border border-[#E2E8F0]'
                              : inv.payment_mode === 'khata'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inv.payment_mode}
                        </span>
                        {inv.payment_ref && (
                          <div className="text-[10px] text-[#64748B] truncate max-w-[100px] mt-0.5">
                            {inv.payment_ref}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-medium text-[#64748B]">
                        {formatINR(inv.subtotal)}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="font-semibold text-[#0F172A]">
                          {formatINR(inv.cgst_amount + inv.sgst_amount)}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          C: {formatINR(inv.cgst_amount)} | S: {formatINR(inv.sgst_amount)}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-black text-[#15803D] text-sm">
                        {formatINR(inv.total_amount)}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenPreview(inv)}
                          className="p-1.5 text-[#64748B] hover:text-[#15803D] hover:bg-[#F0FDF4] rounded-lg transition cursor-pointer"
                          title="Preview Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#F0FDF4] text-[#15803D] hover:bg-[#DCFCE7] font-bold border border-[#E2E8F0] transition text-xs"
                          title="Download GST Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: Invoice Preview Drawer */}
        {showPreviewModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-card max-w-2xl w-full p-6 space-y-4 border border-[#E2E8F0] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center space-x-2.5">
                  <BrandLogo size="sm" showText={false} />
                  <div>
                    <h3 className="font-black text-[#0F172A] text-base">Tax Invoice Preview</h3>
                    <p className="text-xs text-[#64748B] font-mono">
                      {selectedInvoice ? `#${selectedInvoice.bill_number}` : 'Loading...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingDetail || !selectedInvoice ? (
                <div className="py-12 text-center text-[#64748B]">Loading invoice details...</div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Meta Details */}
                  <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Date
                      </span>
                      <span className="font-bold text-[#0F172A]">
                        {formatDateTime(selectedInvoice.finalized_at || selectedInvoice.created_at)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Customer
                      </span>
                      <span className="font-bold text-[#0F172A]">
                        {selectedInvoice.customer_name || 'Walk-in'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Payment Mode
                      </span>
                      <span className="font-bold uppercase text-[#15803D]">
                        {selectedInvoice.payment_mode}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Total Amount
                      </span>
                      <span className="font-black text-[#15803D] text-sm">
                        {formatINR(selectedInvoice.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Item</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-right">Rate</th>
                          <th className="p-2.5 text-right">Taxable</th>
                          <th className="p-2.5 text-center">GST</th>
                          <th className="p-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {(selectedInvoice.items || []).map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold text-[#0F172A]">{it.product_name}</td>
                            <td className="p-2.5 text-center font-semibold text-[#0F172A]">
                              {it.qty} {it.unit}
                            </td>
                            <td className="p-2.5 text-right font-medium text-[#64748B]">
                              {formatINR(it.unit_price)}
                            </td>
                            <td className="p-2.5 text-right font-medium text-[#64748B]">
                              {formatINR(it.taxable_value)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-[11px] text-[#64748B]">
                              {it.gst_slab}%
                            </td>
                            <td className="p-2.5 text-right font-black text-[#15803D]">
                              {formatINR(it.line_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* GST Tax Breakup Box */}
                  <div className="p-3 bg-[#F0FDF4] rounded-xl border border-[#E2E8F0] space-y-1 text-xs">
                    <div className="flex justify-between text-[#64748B]">
                      <span>Taxable Value:</span>
                      <span className="font-semibold text-[#0F172A]">
                        {formatINR(selectedInvoice.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#64748B]">
                      <span>CGST (Intra-state):</span>
                      <span className="font-semibold text-[#0F172A]">
                        {formatINR(selectedInvoice.cgst_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#64748B]">
                      <span>SGST (Intra-state):</span>
                      <span className="font-semibold text-[#0F172A]">
                        {formatINR(selectedInvoice.sgst_amount)}
                      </span>
                    </div>
                    {selectedInvoice.round_off !== 0 && (
                      <div className="flex justify-between text-[#64748B] text-[11px]">
                        <span>Round Off:</span>
                        <span>{formatINR(selectedInvoice.round_off)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-2 border-t border-[#E2E8F0] text-sm font-black text-[#15803D]">
                      <span>Grand Total:</span>
                      <span className="text-base font-black">
                        {formatINR(selectedInvoice.total_amount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="px-4 py-2 bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] font-bold rounded-xl border border-[#E2E8F0]"
                    >
                      Close
                    </button>
                    <a
                      href={`/api/invoices/${selectedInvoice.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#15803D] hover:bg-[#15803D] text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
