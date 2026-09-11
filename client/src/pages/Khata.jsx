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
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import Header from '../components/Header';
import { formatINR, formatDateTime } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

export default function Khata({ onToggleSidebar }) {
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
        const refreshed = res.data.find((c) => c.id === activeCustomer.id);
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
      await axios.post(`/api/khata/customers/${rem.customer_id}/send-reminder`, {
        language: lang
      });
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

  const handleSettleBalance = async (cust) => {
    if (
      !window.confirm(
        `Are you sure you want to mark the entire balance of ${formatINR(
          cust.khata_balance
        )} as settled for ${cust.name}?`
      )
    ) {
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

  const totalOutstanding = customers.reduce(
    (acc, c) => acc + (c.khata_balance > 0 ? c.khata_balance : 0),
    0
  );
  const customersWithDues = customers.filter((c) => c.khata_balance > 0).length;
  const settledCustomers = customers.filter((c) => c.khata_balance <= 0).length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC]">
      <Header
        title="Customer Dues"
        subtitle="Trustworthy customer credit tracking, passbook ledger & payment settlement"
        onToggleSidebar={onToggleSidebar}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto w-full">
        {/* KPI Financial Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Outstanding */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Total Outstanding
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#EA580C] flex items-center justify-center font-bold">
                ₹
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#B45309] tracking-tight">
              {formatINR(totalOutstanding)}
            </div>
            <p className="text-xs text-[#64748B] mt-2 pt-2 border-t border-[#E2E8F0]/60">
              Total credit extended to customers
            </p>
          </div>

          {/* Card 2: Customers with Dues */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Customers with Dues
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#DC2626] tracking-tight">
              {customersWithDues} <span className="text-base font-bold text-[#64748B]">accounts</span>
            </div>
            <p className="text-xs text-[#64748B] mt-2 pt-2 border-t border-[#E2E8F0]/60">
              Active accounts with pending balances
            </p>
          </div>

          {/* Card 3: Settled Accounts */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Settled / Clear
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#15803D] flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#15803D] tracking-tight">
              {settledCustomers} <span className="text-base font-bold text-[#64748B]">accounts</span>
            </div>
            <p className="text-xs text-[#64748B] mt-2 pt-2 border-t border-[#E2E8F0]/60">
              Zero balance or settled accounts
            </p>
          </div>

          {/* Card 4: Actions CTA Card */}
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col justify-center gap-2">
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="w-full py-2.5 px-3 bg-[#EA580C] hover:bg-[#E07D1E] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Khata Customer</span>
            </button>

            <button
              onClick={handleOpenReminders}
              className="w-full py-2 px-3 bg-[#F8FAFC] hover:bg-[#F0FDF4] text-[#15803D] border border-[#E2E8F0] hover:border-[#E2E8F0] font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>WhatsApp Reminders ({customersWithDues})</span>
            </button>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Customers Directory List (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customer by name or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  fetchCustomers();
                }}
                className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden font-medium"
              />
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-360px)] space-y-2">
              {loading ? (
                <div className="py-10 text-center text-[#64748B] text-xs font-semibold">
                  Loading Khata directory...
                </div>
              ) : customers.length === 0 ? (
                <div className="py-10 text-center text-[#64748B] text-xs">No customers found.</div>
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
                          ? 'border-[#15803D] bg-[#F0FDF4] shadow-xs ring-1 ring-[#15803D]'
                          : 'border-[#E2E8F0] hover:border-[#15803D]/40 bg-white'
                      }`}
                    >
                      <div className="overflow-hidden pr-2">
                        <div className="font-bold text-xs text-[#0F172A] truncate">{c.name}</div>
                        <div className="text-[11px] text-[#64748B] flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#64748B]" />
                          <span>{c.phone || 'No phone'}</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div
                          className={`text-xs font-black ${
                            hasDue ? 'text-[#B45309]' : 'text-[#15803D]'
                          }`}
                        >
                          {formatINR(c.khata_balance)}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            hasDue
                              ? 'bg-amber-100 text-[#B45309]'
                              : 'bg-[#F0FDF4] text-[#15803D] border border-[#E2E8F0]'
                          }`}
                        >
                          {hasDue ? 'Due' : 'Settled'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Selected Customer Ledger Passbook (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 flex flex-col justify-between">
            {!activeCustomer ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-[#64748B] space-y-2">
                <Users className="w-10 h-10 text-[#15803D]/40 stroke-1" />
                <p className="text-xs font-medium">
                  Select a customer from the left to view their detailed Khata transaction ledger.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Customer Profile Header */}
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#0F172A] text-base">{activeCustomer.name}</h3>
                    <div className="text-xs text-[#64748B] flex items-center space-x-3 mt-0.5">
                      <span>Phone: {activeCustomer.phone || 'Not provided'}</span>
                      {activeCustomer.address && <span>• {activeCustomer.address}</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenPayment(activeCustomer)}
                      className="px-3.5 py-1.5 bg-[#EA580C] hover:bg-[#E07D1E] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      + Record Payment
                    </button>
                    {activeCustomer.khata_balance > 0 && (
                      <button
                        onClick={() => handleSettleBalance(activeCustomer)}
                        className="px-3.5 py-1.5 bg-[#15803D] hover:bg-[#15803D] text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Settle Balance
                      </button>
                    )}
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B] mb-2">
                    Account Ledger & Passbook History
                  </h4>

                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Type & Notes</th>
                          <th className="p-2.5 text-right">Credit (+)</th>
                          <th className="p-2.5 text-right">Payment (-)</th>
                          <th className="p-2.5 text-right">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {loadingLedger ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-[#64748B]">
                              Loading passbook...
                            </td>
                          </tr>
                        ) : customerLedger.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-[#64748B]">
                              No transactions recorded for this customer yet.
                            </td>
                          </tr>
                        ) : (
                          customerLedger.map((tx) => (
                            <tr key={tx.id} className="hover:bg-[#F8FAFC] transition">
                              <td className="p-2.5 text-[#64748B] font-medium">
                                {formatDateTime(tx.created_at)}
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`font-bold ${
                                    tx.type === 'credit' ? 'text-[#B45309]' : 'text-[#15803D]'
                                  }`}
                                >
                                  {tx.type === 'credit' ? 'Credit Purchase' : 'Payment Received'}
                                </span>
                                <p className="text-[11px] text-[#64748B]">
                                  {tx.notes || (tx.bill_number ? `Bill #${tx.bill_number}` : '-')}
                                </p>
                              </td>
                              <td className="p-2.5 text-right font-bold text-[#B45309]">
                                {tx.type === 'credit' ? formatINR(tx.amount) : '-'}
                              </td>
                              <td className="p-2.5 text-right font-bold text-[#15803D]">
                                {tx.type === 'payment' ? formatINR(tx.amount) : '-'}
                              </td>
                              <td className="p-2.5 text-right font-black text-[#0F172A]">
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-card max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div>
                  <h3 className="font-bold text-[#0F172A] text-base">Record Khata Payment</h3>
                  <p className="text-xs text-[#64748B]">Customer: {activeCustomer.name}</p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {formError}
                </div>
              )}

              <form onSubmit={handlePaymentSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-black text-[#15803D]"
                  />
                  <div className="flex justify-between text-[11px] text-[#64748B] mt-1">
                    <span>Outstanding: {formatINR(activeCustomer.khata_balance)}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentForm({ ...paymentForm, amount: String(activeCustomer.khata_balance) })
                      }
                      className="text-[#15803D] font-bold hover:underline"
                    >
                      Fill Full Dues
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Payment Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'upi', label: 'UPI' },
                      { id: 'cash', label: 'Cash' },
                      { id: 'card', label: 'Card' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, payment_mode: m.id })}
                        className={`py-2 rounded-xl font-bold border transition ${
                          paymentForm.payment_mode === m.id
                            ? 'bg-[#15803D] text-white border-[#15803D]'
                            : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Payment Ref (UPI UTR or Bank Txn ID)
                  </label>
                  <input
                    type="text"
                    value={paymentForm.payment_ref}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_ref: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A]"
                    placeholder="e.g. UPI Ref # 349102"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Notes</label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A]"
                    placeholder="e.g. Paid in person at counter"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 bg-[#F8FAFC] text-[#0F172A] font-bold rounded-xl border border-[#E2E8F0]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#EA580C] hover:bg-[#E07D1E] text-white font-bold rounded-xl shadow-xs transition active:scale-95"
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-card max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <h3 className="font-black text-[#0F172A] text-base">Add New Khata Customer</h3>
                <button
                  onClick={() => setShowAddCustomerModal(false)}
                  className="p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCustomerSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Address / Landmark</label>
                  <input
                    type="text"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    placeholder="e.g. Flat 302, Green Avenue"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Opening Balance (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    value={customerForm.initial_balance}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, initial_balance: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A]"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(false)}
                    className="px-4 py-2 bg-[#F8FAFC] text-[#0F172A] font-bold rounded-xl border border-[#E2E8F0]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#15803D] hover:bg-[#15803D] text-white font-bold rounded-xl shadow-xs transition active:scale-95"
                  >
                    {submitting ? 'Creating...' : '+ Create Khata Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: WhatsApp Reminders */}
        {showRemindersModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-card max-w-2xl w-full p-6 space-y-4 border border-[#E2E8F0]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-[#EA580C]" />
                  <h3 className="font-bold text-[#0F172A] text-base">WhatsApp Due Reminders</h3>
                </div>
                <button
                  onClick={() => setShowRemindersModal(false)}
                  className="p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Language Switcher for WhatsApp message templates */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold text-[#0F172A]">Template Language:</span>
                {['en', 'hi', 'ta'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setReminderLang(lang)}
                    className={`px-2.5 py-1 rounded-lg font-bold uppercase transition ${
                      reminderLang === lang
                        ? 'bg-[#15803D] text-white'
                        : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
                    }`}
                  >
                    {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'தமிழ்'}
                  </button>
                ))}
              </div>

              {loadingReminders ? (
                <div className="py-12 flex justify-center">
                  <RefreshCw className="w-6 h-6 text-[#15803D] animate-spin" />
                </div>
              ) : remindersData.length === 0 ? (
                <div className="py-12 text-center text-[#64748B] text-xs">
                  No customers currently have overdue Khata balances.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-3">
                  {remindersData.map((r) => (
                    <div
                      key={r.customer_id}
                      className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#0F172A]">{r.name}</div>
                        <div className="text-[11px] text-[#64748B] flex items-center space-x-2 mt-0.5">
                          <span>Phone: {r.phone}</span>
                          <span>•</span>
                          <span className="font-bold text-[#B45309]">
                            Due: {formatINR(r.balance)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCopy(r.templates[reminderLang], r.customer_id)}
                          className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#64748B] rounded-lg flex items-center space-x-1"
                        >
                          {copiedKey === r.customer_id ? (
                            <Check className="w-3.5 h-3.5 text-[#15803D]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>Copy</span>
                        </button>

                        <button
                          onClick={() => handleSendWa(r, reminderLang)}
                          className="px-3 py-1.5 bg-[#15803D] hover:bg-[#15803D] text-white font-bold rounded-lg flex items-center space-x-1.5 shadow-xs transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
