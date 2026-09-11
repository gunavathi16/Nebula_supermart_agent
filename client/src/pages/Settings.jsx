import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Settings as SettingsIcon,
  Store,
  ShieldCheck,
  CheckCircle,
  Save,
  RefreshCw,
  Sliders,
  FileText,
  Trash2,
  Sparkles,
  Building2
} from 'lucide-react';
import Header from '../components/Header';
import { useLanguage } from '../context/LanguageContext';

export default function Settings({ onToggleSidebar }) {
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    shop_name: '',
    shop_address: '',
    shop_phone: '',
    shop_gstin: '',
    shop_state_code: '29 (Karnataka)',
    default_payment_mode: 'upi',
    default_brand_atta: 'Aashirvaad Superior MP Atta 5kg',
    default_brand_oil: 'Fortune Sunlite Sunflower Oil 1L',
    invoice_prefix: 'NEB-2026-',
    invoice_footer_note: '',
    company_id: '',
    clean_store: '0'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/settings');
      setSettings((prev) => ({ ...prev, ...res.data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      await axios.put('/api/settings', settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEmptyStock = async () => {
    if (!window.confirm('Are you sure you want to empty the stock catalog? This will remove existing products so you can upload your market products fresh.')) {
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      const res = await axios.post('/api/products/empty-stock', {
        companyId: settings.company_id,
        companyName: settings.shop_name
      });
      setActionSuccess(res.data?.message || 'Stock emptied successfully. Store is ready for product upload.');
      await fetchSettings();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to empty stock.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setActionLoading(true);
      setError('');
      const res = await axios.post('/api/products/seed-demo');
      setActionSuccess(res.data?.message || 'Sample demo stock restored successfully.');
      await fetchSettings();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to seed demo catalog.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC]">
      <Header
        title="Store Settings & Configuration"
        subtitle="Configure shop branding, GSTIN details, invoice headers, and POS counter preferences"
        onToggleSidebar={onToggleSidebar}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
        {saveSuccess && (
          <div className="p-4 bg-[#F0FDF4] border border-[#E2E8F0] text-[#15803D] rounded-2xl text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-xs">
            <CheckCircle className="w-5 h-5 text-[#15803D]" />
            <span>Store preferences and GST tax invoice details saved successfully!</span>
          </div>
        )}

        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-xs">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Shop & GST Information */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#15803D] flex items-center justify-center font-bold">
                <Store className="w-4 h-4 text-[#15803D]" />
              </div>
              <div>
                <h3 className="font-bold text-[#0F172A] text-sm sm:text-base">
                  Shop Identity & Tax Information
                </h3>
                <p className="text-xs text-[#64748B]">
                  These details appear directly on official GST Tax Invoices
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Store Legal Name (as registered on GST)
                </label>
                <input
                  type="text"
                  name="shop_name"
                  value={settings.shop_name}
                  onChange={handleChange}
                  placeholder="e.g. NEBULA Supermarket"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] font-bold focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Company ID / Store Code
                </label>
                <input
                  type="text"
                  name="company_id"
                  value={settings.company_id || ''}
                  onChange={handleChange}
                  placeholder="e.g. MART-101"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] font-mono focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">GSTIN (15 Digits)</label>
                <input
                  type="text"
                  name="shop_gstin"
                  value={settings.shop_gstin}
                  onChange={handleChange}
                  placeholder="e.g. 29AAAAA0000A1Z5"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] font-mono font-bold uppercase focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Contact Phone</label>
                <input
                  type="text"
                  name="shop_phone"
                  value={settings.shop_phone}
                  onChange={handleChange}
                  placeholder="e.g. +91 98450 12345"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  POS State & Code
                </label>
                <input
                  type="text"
                  name="shop_state_code"
                  value={settings.shop_state_code}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#0F172A] mb-1">
                  Store Physical Address
                </label>
                <textarea
                  name="shop_address"
                  rows={2}
                  value={settings.shop_address}
                  onChange={handleChange}
                  placeholder="Shop number, street, area, city, pincode..."
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Counter & POS Defaults */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#15803D] flex items-center justify-center font-bold">
                <Sliders className="w-4 h-4 text-[#15803D]" />
              </div>
              <div>
                <h3 className="font-bold text-[#0F172A] text-sm sm:text-base">
                  Billing Counter Preferences
                </h3>
                <p className="text-xs text-[#64748B]">
                  Speed up cashier workflows by configuring default behaviors
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Default POS Payment Mode
                </label>
                <select
                  name="default_payment_mode"
                  value={settings.default_payment_mode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] font-bold"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="khata">Khata (Customer Credit)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Invoice Number Prefix</label>
                <input
                  type="text"
                  name="invoice_prefix"
                  value={settings.invoice_prefix}
                  onChange={handleChange}
                  placeholder="e.g. NEB-2026-"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Default Brand for Atta
                </label>
                <input
                  type="text"
                  name="default_brand_atta"
                  value={settings.default_brand_atta}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Default Brand for Cooking Oil
                </label>
                <input
                  type="text"
                  name="default_brand_oil"
                  value={settings.default_brand_oil}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Tax Invoice Footer Note */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#15803D] flex items-center justify-center font-bold">
                <FileText className="w-4 h-4 text-[#15803D]" />
              </div>
              <div>
                <h3 className="font-bold text-[#0F172A] text-sm sm:text-base">
                  Tax Invoice Footer Note
                </h3>
                <p className="text-xs text-[#64748B]">
                  Terms and return policies printed on the bottom of customer receipts
                </p>
              </div>
            </div>

            <div className="text-xs">
              <textarea
                name="invoice_footer_note"
                rows={2}
                value={settings.invoice_footer_note}
                onChange={handleChange}
                placeholder="Thank you for shopping with NEBULA Supermarket! Goods once sold can be exchanged within 48 hours."
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] outline-hidden"
              />
            </div>
          </div>

          {/* Section 4: Market Catalog & Stock Onboarding */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#0F172A] text-sm sm:text-base">
                  Market Catalog & Stock Reset
                </h3>
                <p className="text-xs text-[#64748B]">
                  Empty demo products when onboarding a new market or company to upload your real inventory
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-[#0F172A]">Store Catalog Mode</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    {settings.clean_store === '1'
                      ? 'Clean Store Active — Ready for your market products.'
                      : 'Sample Demo Catalog Active — Pre-filled with sample groceries.'}
                  </p>
                </div>
                <span
                  className={`self-start sm:self-auto px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                    settings.clean_store === '1'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {settings.clean_store === '1' ? 'Clean Catalog' : 'Demo Catalog'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleEmptyStock}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition active:scale-95 cursor-pointer flex items-center space-x-1.5 disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Processing...' : 'Empty All Stock (Start Fresh)'}</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSeedDemo}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#15803D] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#15803D]" />
                  <span>{actionLoading ? 'Processing...' : 'Load Sample Demo Stock'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#15803D] hover:bg-[#15803D] text-white font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center space-x-2 text-xs sm:text-sm cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#15803D]" />
              <span>{saving ? 'Saving...' : 'Save Store Settings'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
