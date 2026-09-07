import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Search,
  Plus,
  IndianRupee,
  Smartphone,
  CreditCard,
  History,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Phone,
  MapPin,
  FileText,
  Bell,
  Send,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import Header from '../components/Header';
import { formatINR, formatDateTime } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

export default function Khata() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected customer for detailed ledger
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [customerLedger, setCustomerLedger] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);

  // Reminders State
  const [remindersData, setRemindersData] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [reminderLang, setReminderLang] = useState('en'); // 'en', 'hi', 'ta'
  const [copiedKey, setCopiedKey] = useState(null);

  // Forms
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    initial_balance: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_mode: 'upi',
    payment_ref: '',
    notes: ''
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/khata/customers', {
        params: { search: search || undefined }
      });
      setCustomers(res.data);
      if (activeCustomer) {
        const refreshed = res.data.find(c => c.id === activeCustomer.id);
        if (refreshed) setActiveCustomer(refreshed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      setLoadingReminders(true);
      const res = await axios.get('/api/khata/reminders');
      setRemindersData(res.data.reminders || []);
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleOpenReminders = () => {
    fetchReminders();
    setShowRemindersModal(true);
  };

  const handleSendWa = async (rem, lang) => {
    try {
      // Trigger audit update on server
      await axios.post(`/api/khata/customers/${rem.customer_id}/send-reminder`, {
        language: lang
      });
      // Open WhatsApp link in new window
      const waUrl = rem.wa_links?.[lang];
      if (waUrl) {
        window.open(waUrl, '_blank');
      }
      fetchReminders();
      fetchCustomers();
    } catch (err) {
      console.error('Failed to record reminder:', err);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSelectCustomer = async (cust) => {
    setActiveCustomer(cust);
    setLoadingLedger(true);
    try {
      const res = await axios.get(`/api/khata/customers/${cust.id}`);
      setCustomerLedger(res.data.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleOpenPayment = (cust) => {
    setActiveCustomer(cust);
    setPaymentForm({
      amount: cust.khata_balance > 0 ? String(cust.khata_balance) : '',
      payment_mode: 'upi',
      payment_ref: '',
      notes: ''
    });
    setFormError('');
    setShowPaymentModal(true);
  };

  // Submit payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setFormError('Please enter a valid payment amount');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`/api/khata/customers/${activeCustomer.id}/payment`, paymentForm);
      setShowPaymentModal(false);
      fetchCustomers();
      handleSelectCustomer(activeCustomer);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Settle full balance in one click
  const handleSettleBalance = async (cust) => {
    if (!window.confirm(`Are you sure you want to mark the entire balance of ${formatINR(cust.khata_balance)} as settled for ${cust.name}?`)) {
      return;
    }

    try {
      await axios.post(`/api/khata/customers/${cust.id}/settle`, {
        payment_mode: 'cash'
      });
      fetchCustomers();
      if (activeCustomer?.id === cust.id) {
        handleSelectCustomer(cust);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to settle balance');
    }
  };

  // Submit new customer
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      setFormError('Customer name is required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post('/api/khata/customers', customerForm);
      setShowAddCustomerModal(false);
      fetchCustomers();
      handleSelectCustomer(res.data);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add customer');
    } finally {
      setSubmitting(false);
    }
  };

  const totalOutstanding = customers.reduce((acc, c) => acc + (c.khata_balance > 0 ? c.khata_balance : 0), 0);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header title={t('khata_title')} subtitle={t('khata_subtitle')} />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Total Outstanding Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white p-5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-amber-200">
                {t('khata_total_outstanding')}
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {formatINR(totalOutstanding)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleOpenReminders}
              className="bg-white/20 hover:bg-white/30 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-1.5 shadow transition active:scale-95 border border-white/20"
            >
              <Bell className="w-4 h-4 text-amber-200" />
              <span>{t('khata_reminders_btn')}</span>
              {customers.filter(c => c.khata_balance > 0).length > 0 && (
                <span className="ml-1 bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold">
                  {customers.filter(c => c.khata_balance > 0).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="bg-white hover:bg-amber-50 text-amber-900 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-1.5 shadow transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t('khata_add_customer')}</span>
            </button>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Customers List (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customer by name or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  fetchCustomers();
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-320px)] space-y-2">
              {loading ? (
                <div className="py-8 text-center text-slate-400 text-xs">Loading customers...</div>
              ) : customers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No customers found.</div>
              ) : (
                customers.map((c) => {
                  const hasDue = c.khata_balance > 0;
                  const isSelected = activeCustomer?.id === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="overflow-hidden pr-2">
                        <div className="font-bold text-xs text-slate-900 truncate">{c.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone || 'No phone'}</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className={`text-xs font-extrabold ${hasDue ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {formatINR(c.khata_balance)}
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          hasDue ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {hasDue ? 'Due' : 'Clear'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Selected Customer Ledger (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            {!activeCustomer ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 stroke-1" />
                <p className="text-xs">Select a customer from the left to view their detailed Khata transaction ledger.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Customer Profile Header */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{activeCustomer.name}</h3>
                    <div className="text-xs text-slate-500 flex items-center space-x-3 mt-1">
                      <span>Phone: {activeCustomer.phone || 'Not provided'}</span>
                      {activeCustomer.address && <span>• {activeCustomer.address}</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {activeCustomer.khata_balance > 0 && (
                      <button
                        onClick={() => {
                          fetchReminders();
                          setShowRemindersModal(true);
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>{t('khata_send_reminder')}</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenPayment(activeCustomer)}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow transition"
                    >
                      {t('khata_record_payment')}
                    </button>
                    {activeCustomer.khata_balance > 0 && (
                      <button
                        onClick={() => handleSettleBalance(activeCustomer)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
                      >
                        {t('khata_settle_all')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Account Ledger & Passbook
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Type & Note</th>
                          <th className="p-2.5 text-right">Credit (+)</th>
                          <th className="p-2.5 text-right">Payment (-)</th>
                          <th className="p-2.5 text-right">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingLedger ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-slate-400">Loading ledger...</td>
                          </tr>
                        ) : customerLedger.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-slate-400">No transactions recorded for this customer yet.</td>
                          </tr>
                        ) : (
                          customerLedger.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                              <td className="p-2.5 text-slate-500">{formatDateTime(tx.created_at)}</td>
                              <td className="p-2.5">
                                <span className={`font-bold ${tx.type === 'credit' ? 'text-amber-700' : 'text-emerald-700'}`}>
                                  {tx.type === 'credit' ? 'Credit Purchase' : 'Payment Received'}
                                </span>
                                <p className="text-[11px] text-slate-400">{tx.notes || (tx.bill_number ? `Bill #${tx.bill_number}` : '-')}</p>
                              </td>
                              <td className="p-2.5 text-right font-bold text-amber-700">
                                {tx.type === 'credit' ? formatINR(tx.amount) : '-'}
                              </td>
                              <td className="p-2.5 text-right font-bold text-emerald-700">
                                {tx.type === 'payment' ? formatINR(tx.amount) : '-'}
                              </td>
                              <td className="p-2.5 text-right font-extrabold text-slate-900">
                                {formatINR(tx.balance_after)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL: Record Payment */}
        {showPaymentModal && activeCustomer && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Record Khata Payment</h3>
                  <p className="text-xs text-slate-500">Customer: {activeCustomer.name}</p>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">{formError}</div>
              )}

              <form onSubmit={handlePaymentSubmit} className="space-y-3 text-xs">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                  <span className="text-amber-800">Current Outstanding:</span>
                  <span className="font-extrabold text-amber-900 text-sm">{formatINR(activeCustomer.khata_balance)}</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Amount Received (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="e.g. 500"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="upi">UPI (PhonePe / GPay / Paytm)</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card / POS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference / UTR / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Paid at shop counter / UTR 991823"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow"
                  >
                    {submitting ? 'Recording...' : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add Customer */}
        {showAddCustomerModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Add New Khata Customer</h3>
                <button onClick={() => setShowAddCustomerModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">{formError}</div>
              )}

              <form onSubmit={handleCustomerSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number (10 digits)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Address / Landmark</label>
                  <input
                    type="text"
                    placeholder="e.g. 4th Cross, Gandhi Bazaar"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Credit Balance (₹)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="0"
                    value={customerForm.initial_balance}
                    onChange={(e) => setCustomerForm({ ...customerForm, initial_balance: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow"
                  >
                    {submitting ? 'Saving...' : 'Add Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Payment Reminders with Multi-Language WhatsApp & UPI */}
        {showRemindersModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
                <div>
                  <div className="flex items-center space-x-2">
                    <Bell className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-slate-900 text-base">
                      {t('khata_reminders_title')}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('khata_reminders_subtitle')}
                  </p>
                </div>
                <button
                  onClick={() => setShowRemindersModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Language Selector for Reminders */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex-shrink-0">
                <span className="text-xs font-semibold text-slate-700">
                  {t('khata_msg_lang')}:
                </span>
                <div className="flex items-center space-x-1.5 text-xs">
                  <button
                    onClick={() => setReminderLang('en')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      reminderLang === 'en'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setReminderLang('hi')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      reminderLang === 'hi'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    हिन्दी
                  </button>
                  <button
                    onClick={() => setReminderLang('ta')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      reminderLang === 'ta'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    தமிழ்
                  </button>
                </div>
              </div>

              {/* Debtors Reminders List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loadingReminders ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Loading reminder list...
                  </div>
                ) : remindersData.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    🎉 No customers have pending Khata balances right now!
                  </div>
                ) : (
                  remindersData.map((rem) => {
                    const message = rem.messages[reminderLang] || rem.messages.en;
                    const hasPhone = !!rem.clean_phone;
                    const key = `${rem.customer_id}_${reminderLang}`;
                    const isCopied = copiedKey === key;

                    return (
                      <div
                        key={rem.customer_id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{rem.name}</span>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                              <span>📞 {rem.phone || 'No phone registered'}</span>
                              <span>•</span>
                              <span>
                                {rem.last_reminder_at
                                  ? `${t('khata_last_reminded')}: ${formatDateTime(rem.last_reminder_at)}`
                                  : `${t('khata_last_reminded')}: ${t('khata_never_reminded')}`}
                              </span>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="font-extrabold text-amber-700 text-sm">
                              {formatINR(rem.khata_balance)}
                            </span>
                            <div className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-center mt-0.5">
                              Due
                            </div>
                          </div>
                        </div>

                        {/* Message Preview */}
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 italic leading-relaxed">
                          "{message}"
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-[10px] text-slate-400 font-mono">
                            UPI: {rem.upi_id}
                          </span>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleCopy(message, key)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center space-x-1 transition text-xs"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700">{t('khata_copied')}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{t('khata_copy_msg')}</span>
                                </>
                              )}
                            </button>

                            {hasPhone ? (
                              <button
                                onClick={() => handleSendWa(rem, reminderLang)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center space-x-1 shadow transition text-xs active:scale-95"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{t('khata_send_wa')}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                Add phone to enable WhatsApp
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setShowRemindersModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
