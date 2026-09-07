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
  FileText
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
    invoice_footer_note: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
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

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FFFAED]">
      <Header
        title="Store Settings & Configuration"
        subtitle="Configure shop branding, GSTIN details, invoice headers, and POS counter preferences"
        onToggleSidebar={onToggleSidebar}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
        {saveSuccess && (
          <div className="p-4 bg-[#F0FDF4] border border-[#E8E0CC] text-[#287A4B] rounded-2xl text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-xs">
            <CheckCircle className="w-5 h-5 text-[#287A4B]" />
            <span>Store preferences and GST tax invoice details saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Shop & GST Information */}
          <div className="bg-white rounded-2xl border border-[#E8E0CC] shadow-xs p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E8E0CC]">
              <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#287A4B] flex items-center justify-center font-bold">
                <Store className="w-4 h-4 text-[#287A4B]" />
              </div>
              <div>
                <h3 className="font-bold text-[#292929] text-sm sm:text-base">
                  Shop Identity & Tax Information
                </h3>
                <p className="text-xs text-[#6B6B63]">
                  These details appear directly on official GST Tax Invoices
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#292929] mb-1">
                  Store Legal Name (as registered on GST)
                </label>
                <input
                  type="text"
                  name="shop_name"
                  value={settings.shop_name}
                  onChange={handleChange}
                  placeholder="e.g. NEBULA Supermarket"
                  className="w-full px-3 py-2 bg-[#FFFAED] border border-[#E8E0CC] rounded-xl text-[#292929] font-bold focus:ring-2 focus:ring-[#287A4B]/20 focus:border-[#287A4B] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#292929] mb-1">GSTIN (15 Digits)</label>
                <input
                  type="text"
                  name="shop_gstin"
                  value={settings.shop_gstin}
                  onChange={handleChange}
                  placeholder="e.g. 29AAAAA0000A1Z5"
                  className="w-full px-3 py-2 bg-[#FFFAED] border border-[#E8E0CC] rounded-xl text-[#292929] font-mono font-bold uppercase focus:ring-2 focus:ring-[#287A4B]/20 focus:border-[#287A4B] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#292929] mb-1">Contact Phone</label>
                <input
                  type="text"
                  name="shop_phone"
                  value={settings.shop_phone}
                  onChange={handleChange}
                  placeholder="e.g. +91 98450 12345"
                  className="w-full px-3 py-2 bg-[#FFFAED] border border-[#E8E0CC] rounded-xl text-[#292929] focus:ring-2 focus:ring-[#287A4B]/20 focus:border-[#287A4B] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#292929] mb-1">
                  POS State & Code
                </label>
                <input
                  type="text"
                  name="shop_state_code"
                  value={settings.shop_state_code}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#FFFAED] border border-[#E8E0CC] rounded-xl text-[#292929] focus:ring-2 focus:ring-[#287A4B]/20 focus:border-[#287A4B] outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#292929] mb-1">
                  Store Physical Address
                </label>
                <textarea
                  name="shop_address"
                  rows={2}
                  value={settings.shop_address}
                  onChange={handleChange}
                  placeholder="Shop number, street, area, city, pincode..."
                  className="w-full px-3 py-2 bg-[#FFFAED] border border-[#E8E0CC] rounded-xl text-[#292929] focus:ring-2 focus:ring-[#287A4B]/20 focus:border-[#287A4B] outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Counter & POS Defaults */}
          <div className="bg-white rounded-2xl border border-[#E8E0CC] shadow-xs p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E8E0CC]">
              <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#287A4B] flex items-center justify-center font-bold">
                <Sliders className="w-4 h-4 text-[#287A4B]" />
              </div>
              <div>
                <h3 className="font-bold text-[#292929] text-sm sm:text-base">
                  Billing Counter Preferences
                </h3>
                <p className="text-xs text-[#6B6B63]">
                  Speed up cashier workflows by configuring default behaviors
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#292929] mb-1">
                  Default POS Payment Mode
                </label>
                <select
                  name="default_payment_mode"
                  value={settings.default_payment_mode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#FFFAED] border border-[#E8E0CC] rounded-xl text-[#292929] font-bold"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="khata">Khata (Customer Credit)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#292929] mb-1">Invoice Number Prefix</label>
                <input
                  type="text"
                  name="invoice_prefix"
                  value={settings.invoice_prefix}
                  onChange={handleChange}
                  placeholder="e.g. NEB-2026-"
                  className="w-full px-3 py-2 bg-[#FFFAED] border border-[#E8E0CC] rounded-xl text-[#292929] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#292929] mb-1">
                  Default Brand for Atta
                </label>
                <input
                  type="text"
                  name="default_brand_atta"
                  value={settings.default_brand_atta}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#FFFAED] border border-[#E8E0CC] rounded-xl text-[#292929]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#292929] mb-1">
                  Default Brand for Cooking Oil
                </label>
                <input
                  type="text"
                  name="default_brand_oil"
                  value={settings.default_brand_oil}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#FFFAED] border border-[#E8E0CC] rounded-xl text-[#292929]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Tax Invoice Footer Note */}
          <div className="bg-white rounded-2xl border border-[#E8E0CC] shadow-xs p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E8E0CC]">
              <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#287A4B] flex items-center justify-center font-bold">
                <FileText className="w-4 h-4 text-[#287A4B]" />
              </div>
              <div>
                <h3 className="font-bold text-[#292929] text-sm sm:text-base">
                  Tax Invoice Footer Note
                </h3>
                <p className="text-xs text-[#6B6B63]">
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
                className="w-full px-3 py-2 bg-[#FFFAED] border border-[#E8E0CC] rounded-xl text-[#292929] focus:ring-2 focus:ring-[#287A4B]/20 focus:border-[#287A4B] outline-hidden"
              />
            </div>
          </div>

          {/* Submit CTA */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#287A4B] hover:bg-[#287A4B] text-white font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center space-x-2 text-xs sm:text-sm cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#287A4B]" />
              <span>{saving ? 'Saving...' : 'Save Store Settings'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
