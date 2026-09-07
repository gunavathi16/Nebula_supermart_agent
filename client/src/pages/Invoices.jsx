import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText,
  Search,
  Download,
  Eye,
  Calendar,
  Filter,
  RefreshCw,
  X,
  CreditCard,
  IndianRupee,
  Smartphone,
  BookOpen
} from 'lucide-react';
import Header from '../components/Header';
import { formatINR, formatDateTime, formatDate, formatQtyUnit } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

export default function Invoices() {
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
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header title={t('inv_page_title')} subtitle={t('inv_page_subtitle')} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Bill # or Customer Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-medium"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="khata">Khata (Credit)</option>
            </select>

            <button
              onClick={fetchInvoices}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
              title="Refresh Invoices"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Invoices List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-3">Date & Time</th>
                  <th className="py-3.5 px-3">Customer</th>
                  <th className="py-3.5 px-3">Payment</th>
                  <th className="py-3.5 px-3">Taxable Value</th>
                  <th className="py-3.5 px-3">GST (CGST + SGST)</th>
                  <th className="py-3.5 px-3">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Invoice PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-600" />
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      No invoices found. Cut your first bill on the POS screen!
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleOpenPreview(inv)}
                          className="font-bold text-slate-900 hover:text-orange-600 transition"
                        >
                          {inv.bill_number}
                        </button>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500">
                        {formatDateTime(inv.finalized_at || inv.created_at)}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{inv.customer_name || 'Walk-in'}</div>
                        {inv.customer_phone && (
                          <div className="text-[10px] text-slate-400">{inv.customer_phone}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                          inv.payment_mode === 'upi' ? 'bg-indigo-100 text-indigo-700' :
                          inv.payment_mode === 'cash' ? 'bg-emerald-100 text-emerald-700' :
                          inv.payment_mode === 'khata' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {inv.payment_mode}
                        </span>
                        {inv.payment_ref && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[100px]">{inv.payment_ref}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-600">
                        {formatINR(inv.subtotal)}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-700">
                          {formatINR(inv.cgst_amount + inv.sgst_amount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          C: {formatINR(inv.cgst_amount)} | S: {formatINR(inv.sgst_amount)}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-extrabold text-slate-900 text-sm">
                        {formatINR(inv.total_amount)}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenPreview(inv)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Preview Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 font-bold border border-orange-200 transition text-[11px]"
                          title="Download GST Invoice PDF"
                        >
                          <Download className="w-3 h-3" />
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Tax Invoice Preview</h3>
                    <p className="text-xs text-slate-500">
                      {selectedInvoice ? `#${selectedInvoice.bill_number}` : 'Loading...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingDetail || !selectedInvoice ? (
                <div className="py-12 text-center text-slate-400">Loading invoice details...</div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Meta Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer</span>
                      <span className="font-bold text-slate-800">{selectedInvoice.customer_name || 'Walk-in'}</span>
                      {selectedInvoice.customer_phone && <span className="block text-slate-500">{selectedInvoice.customer_phone}</span>}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Mode</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedInvoice.payment_mode}</span>
                      {selectedInvoice.payment_ref && <span className="block text-slate-500">Ref: {selectedInvoice.payment_ref}</span>}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Date & Time</span>
                      <span className="font-medium text-slate-700">{formatDateTime(selectedInvoice.finalized_at)}</span>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Item</th>
                          <th className="p-2.5">HSN</th>
                          <th className="p-2.5">Qty</th>
                          <th className="p-2.5">Rate</th>
                          <th className="p-2.5">GST Slab</th>
                          <th className="p-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedInvoice.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="p-2.5 font-semibold text-slate-900">{item.product_name}</td>
                            <td className="p-2.5 font-mono text-slate-500">{item.hsn_code}</td>
                            <td className="p-2.5">{item.qty} {item.unit}</td>
                            <td className="p-2.5">₹{item.unit_price}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                                {item.gst_slab}%
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900">
                              {formatINR(item.line_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Breakup */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 ml-auto max-w-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (Taxable):</span>
                      <span className="font-semibold">{formatINR(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (50%):</span>
                      <span className="font-semibold">{formatINR(selectedInvoice.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (50%):</span>
                      <span className="font-semibold">{formatINR(selectedInvoice.sgst_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                      <span>Grand Total:</span>
                      <span className="text-orange-600">{formatINR(selectedInvoice.total_amount)}</span>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                    >
                      Close
                    </button>
                    <a
                      href={`/api/invoices/${selectedInvoice.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Official GST PDF</span>
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
