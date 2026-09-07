import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Package,
  Search,
  Plus,
  ArrowDownCircle,
  History,
  Edit2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  X,
  Scale,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import Header from '../components/Header';
import { formatINR, formatQtyUnit, formatDateTime } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

export default function Inventory({ onToggleSidebar }) {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [onlyLowStock, setOnlyLowStock] = useState(searchParams.get('filter') === 'low');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyMovements, setHistoryMovements] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // Form states & views
  const [activeView, setActiveView] = useState('catalog'); // 'catalog' | 'reorder' | 'expiry'
  const [reorderData, setReorderData] = useState(null);
  const [expiryData, setExpiryData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [receiveForm, setReceiveForm] = useState({
    qty: '',
    cost_price: '',
    sell_price: '',
    notes: '',
    batch_number: '',
    expiry_date: '',
    mfg_date: ''
  });

  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'staples',
    unit: 'packet',
    is_loose: false,
    cost_price: '',
    sell_price: '',
    gst_slab: '5',
    hsn_code: '',
    stock_qty: '',
    reorder_level: '10'
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const [rRes, eRes] = await Promise.all([
        axios.get('/api/products/reorder-suggestions'),
        axios.get('/api/products/expiring?days=30')
      ]);
      setReorderData(rRes.data);
      setExpiryData(eRes.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchProducts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await axios.get('/api/products', {
        params: {
          search: search || undefined,
          category: category !== 'all' ? category : undefined,
          low_stock: onlyLowStock ? 'true' : undefined
        }
      });
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchAnalytics();

    const onFocus = () => {
      fetchProducts(false);
      fetchAnalytics();
    };
    window.addEventListener('focus', onFocus);

    const interval = setInterval(() => {
      if (!showAddModal && !showReceiveModal && !showHistoryModal && !editProduct) {
        fetchProducts(false);
      }
    }, 5000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [category, onlyLowStock, search, showAddModal, showReceiveModal, showHistoryModal, editProduct]);

  // Open receive stock modal directly if query param passed
  useEffect(() => {
    const restockId = searchParams.get('restock');
    if (restockId && products.length > 0) {
      const prod = products.find((p) => p.id === Number(restockId));
      if (prod) {
        handleOpenReceive(prod);
        searchParams.delete('restock');
        setSearchParams(searchParams);
      }
    }
  }, [products]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleOpenReceive = (prod, suggestedQty = '') => {
    setSelectedProduct(prod);
    setReceiveForm({
      qty: suggestedQty ? String(suggestedQty) : '',
      cost_price: prod.cost_price,
      sell_price: prod.sell_price,
      notes: '',
      batch_number: `BTH-${prod.id}-${Date.now().toString().slice(-4)}`,
      expiry_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      mfg_date: new Date().toISOString().split('T')[0]
    });
    setFormError('');
    setShowReceiveModal(true);
  };

  const handleReceiveStockSubmit = async (e) => {
    e.preventDefault();
    if (!receiveForm.qty || Number(receiveForm.qty) <= 0) {
      setFormError('Please enter a valid quantity greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`/api/products/${selectedProduct.id}/receive-stock`, receiveForm);
      setShowReceiveModal(false);
      fetchProducts();
      fetchAnalytics();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to receive stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistory = async (prod) => {
    setSelectedProduct(prod);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await axios.get(`/api/products/${prod.id}/history`);
      setHistoryMovements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenAdd = () => {
    setEditProduct(null);
    setProductForm({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-5)}`,
      category: 'staples',
      unit: 'packet',
      is_loose: false,
      cost_price: '',
      sell_price: '',
      gst_slab: '5',
      hsn_code: '1901',
      stock_qty: '10',
      reorder_level: '5'
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (prod) => {
    setEditProduct(prod);
    setProductForm({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      unit: prod.unit,
      is_loose: Boolean(prod.is_loose),
      cost_price: prod.cost_price,
      sell_price: prod.sell_price,
      gst_slab: String(prod.gst_slab),
      hsn_code: prod.hsn_code,
      stock_qty: prod.stock_qty,
      reorder_level: prod.reorder_level
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (
      !productForm.name ||
      !productForm.sku ||
      productForm.cost_price === '' ||
      productForm.sell_price === ''
    ) {
      setFormError('Please fill in all mandatory fields');
      return;
    }

    try {
      setSubmitting(true);
      if (editProduct) {
        await axios.put(`/api/products/${editProduct.id}`, productForm);
      } else {
        await axios.post('/api/products', productForm);
      }
      setShowAddModal(false);
      fetchProducts();
      fetchAnalytics();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'staples', label: 'Staples & Grains' },
    { id: 'packaged', label: 'Packaged' },
    { id: 'dairy', label: 'Dairy' },
    { id: 'household', label: 'Household' },
    { id: 'personal_care', label: 'Personal Care' }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FAFAF7]">
      <Header
        title="Inventory Catalog"
        subtitle="Manage SKU prices, FEFO batches, stock receipts & replenishment"
        onToggleSidebar={onToggleSidebar}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto w-full">
        {/* Top Control & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7E2] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#647067] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by SKU, product name, or HSN code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs sm:text-sm text-[#172018] focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-hidden font-medium"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Low stock toggle */}
            <button
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
                onlyLowStock
                  ? 'bg-red-50 text-red-700 border border-red-200 shadow-xs'
                  : 'bg-[#FAFAF7] text-[#647067] hover:bg-slate-100 border border-[#E5E7E2]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Stock Only</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchProducts(true)}
              className="p-2 bg-[#FAFAF7] hover:bg-slate-100 text-[#647067] rounded-xl border border-[#E5E7E2] transition cursor-pointer"
              title="Refresh inventory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#14532D]' : ''}`} />
            </button>

            {/* Add Product CTA */}
            <button
              onClick={handleOpenAdd}
              className="bg-[#14532D] hover:bg-[#166534] text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Product</span>
            </button>
          </div>
        </div>

        {/* Navigation View Switcher */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E7E2] pb-3 text-xs sm:text-sm">
          <button
            onClick={() => setActiveView('catalog')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition cursor-pointer ${
              activeView === 'catalog'
                ? 'bg-[#14532D] text-white shadow-xs'
                : 'bg-white text-[#647067] hover:bg-[#F0FDF4] hover:text-[#14532D] border border-[#E5E7E2]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Catalog</span>
            <span className="text-[11px] opacity-80">({products.length})</span>
          </button>

          <button
            onClick={() => setActiveView('reorder')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition cursor-pointer ${
              activeView === 'reorder'
                ? 'bg-[#14532D] text-white shadow-xs'
                : 'bg-white text-[#647067] hover:bg-[#F0FDF4] hover:text-[#14532D] border border-[#E5E7E2]'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Smart Reorder & Velocity</span>
            {reorderData?.critical_count > 0 && (
              <span className="bg-[#DC2626] text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {reorderData.critical_count} Critical
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('expiry')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition cursor-pointer ${
              activeView === 'expiry'
                ? 'bg-[#14532D] text-white shadow-xs'
                : 'bg-white text-[#647067] hover:bg-[#F0FDF4] hover:text-[#14532D] border border-[#E5E7E2]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Expiry & FEFO Batches</span>
            {expiryData?.expiring_soon_count > 0 && (
              <span className="bg-[#F97316] text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {expiryData.expiring_soon_count} Due Soon
              </span>
            )}
          </button>
        </div>

        {/* VIEW 1: REORDER FORECAST */}
        {activeView === 'reorder' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
                <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                  Critical Reorders (≤ 3 Days)
                </div>
                <div className="text-2xl font-black text-rose-900 mt-1">
                  {reorderData?.critical_count || 0}
                </div>
                <p className="text-[11px] text-rose-600 mt-1">
                  Items at risk of imminent stockout based on daily velocity
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  Upcoming Reorders (3–7 Days)
                </div>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  {reorderData?.warning_count || 0}
                </div>
                <p className="text-[11px] text-amber-600 mt-1">
                  Items approaching buffer safety thresholds
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Target Stock Buffer
                </div>
                <div className="text-2xl font-black text-[#14532D] mt-1">14 Days</div>
                <p className="text-[11px] text-emerald-600 mt-1">
                  Intelligent dynamic replenishment target
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7E2] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#E5E7E2]">
                <h3 className="font-bold text-[#172018] text-sm">Automated Restock Forecast</h3>
                <p className="text-xs text-[#647067]">
                  Stock replenishment suggestions derived from past sales velocity
                </p>
              </div>

              {!reorderData?.suggestions || reorderData.suggestions.length === 0 ? (
                <div className="py-12 text-center text-[#647067] text-xs">
                  All items are well stocked for the next 14 operating days.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAF7] border-b border-[#E5E7E2] text-[#647067] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-3">Current Stock</th>
                        <th className="py-3 px-3">Daily Velocity</th>
                        <th className="py-3 px-3">Days Left</th>
                        <th className="py-3 px-3">Suggested Order</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7E2]">
                      {reorderData.suggestions.map((s) => (
                        <tr key={s.id} className="hover:bg-[#FAFAF7] transition">
                          <td className="py-3 px-4 font-bold text-[#172018]">{s.name}</td>
                          <td className="py-3 px-3 font-semibold text-[#647067]">
                            {formatQtyUnit(s.stock_qty, s.unit)}
                          </td>
                          <td className="py-3 px-3 font-semibold text-[#172018]">
                            {s.daily_sales_rate} {s.unit}/day
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                s.days_of_stock_left <= 3
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {s.days_of_stock_left <= 0 ? 'Stockout Today' : `${s.days_of_stock_left} days`}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-black text-[#14532D]">
                            +{s.suggested_reorder_qty} {s.unit}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                const prod = products.find((p) => p.id === s.id);
                                if (prod) handleOpenReceive(prod, s.suggested_reorder_qty);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs shadow-xs"
                            >
                              + Restock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: EXPIRY & FEFO BATCHES */}
        {activeView === 'expiry' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[#BBF7D0] shadow-xs bg-[#F0FDF4]/40">
                <div className="text-xs font-bold text-[#14532D] uppercase tracking-wider">
                  Active Tracked Batches
                </div>
                <div className="text-2xl font-black text-[#14532D] mt-1">
                  {expiryData?.all_active_batches || 0}
                </div>
                <p className="text-[11px] text-[#166534] mt-1">
                  Batches tracked across catalog with expiry dates
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/40">
                <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Expiring in Next 30 Days
                </div>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  {expiryData?.expiring_soon_count || 0}
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  Batches allocated first via FEFO dispatch logic
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7E2] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#E5E7E2]">
                <h3 className="font-bold text-[#172018] text-sm">Product Batches & Expiry Timeline</h3>
                <p className="text-xs text-[#647067]">
                  Sorted by earliest expiry date (First-Expired, First-Out sequence)
                </p>
              </div>

              {!expiryData?.expiring_soon || expiryData.expiring_soon.length === 0 ? (
                <div className="py-12 text-center text-[#647067] text-xs">
                  No batches due to expire in the next 30 days.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAF7] border-b border-[#E5E7E2] text-[#647067] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-3">Batch Number</th>
                        <th className="py-3 px-3">Batch Qty</th>
                        <th className="py-3 px-3">Expiry Date</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7E2]">
                      {expiryData.expiring_soon.map((b, idx) => {
                        const isCritical = b.days_until_expiry <= 7;
                        return (
                          <tr key={idx} className="hover:bg-[#FAFAF7] transition">
                            <td className="py-3 px-4 font-bold text-[#172018]">{b.product_name}</td>
                            <td className="py-3 px-3 font-mono text-[#647067] font-medium">
                              {b.batch_number}
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#172018]">
                              {b.stock_qty} {b.unit}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-[#172018]">
                              {b.expiry_date}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                  isCritical
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {b.days_until_expiry <= 0
                                  ? 'Expired Today'
                                  : `in ${b.days_until_expiry} days`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: MAIN CATALOG DIRECTORY */}
        {activeView === 'catalog' && (
          <div className="bg-white rounded-2xl border border-[#E5E7E2] shadow-xs overflow-hidden">
            {/* Category Filter Tabs */}
            <div className="p-3 border-b border-[#E5E7E2] flex items-center gap-1.5 overflow-x-auto text-xs">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                    category === cat.id
                      ? 'bg-[#14532D] text-white font-bold shadow-xs'
                      : 'bg-[#FAFAF7] text-[#647067] hover:bg-slate-100 border border-[#E5E7E2]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 text-[#14532D] animate-spin" />
                <span className="text-xs text-[#647067] font-semibold">Loading catalog...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-[#647067] text-xs">
                No products found in catalog. Click "+ Add Product" to add your first SKU.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAF7] border-b border-[#E5E7E2] text-[#647067] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">SKU / Code</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-right">Cost Price</th>
                      <th className="py-3 px-3 text-right">Selling Price</th>
                      <th className="py-3 px-3">GST / HSN</th>
                      <th className="py-3 px-3">Stock Level</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7E2]">
                    {products.map((p) => {
                      const isOut = Number(p.stock_qty) <= 0;
                      const isLow = Number(p.stock_qty) <= Number(p.reorder_level);

                      return (
                        <tr key={p.id} className="hover:bg-[#FAFAF7] transition">
                          <td className="py-3 px-4 font-mono font-bold text-[#647067] text-[11px]">
                            {p.sku}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#172018] text-xs flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.is_loose ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  <Scale className="w-2.5 h-2.5" /> Loose
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-[#647067] font-medium">per {p.unit}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-[#647067] capitalize">
                            {p.category}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-[#647067]">
                            {formatINR(p.cost_price)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-[#14532D]">
                            {formatINR(p.sell_price)}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-[#647067]">
                            {p.gst_slab}% (HSN {p.hsn_code})
                          </td>
                          <td className="py-3 px-3 font-bold text-[#172018]">
                            {formatQtyUnit(p.stock_qty, p.unit, p.is_loose)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide ${
                                isOut
                                  ? 'bg-red-50 text-[#DC2626] border border-red-200'
                                  : isLow
                                  ? 'bg-amber-50 text-[#B45309] border border-amber-200'
                                  : 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                              }`}
                            >
                              {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Receive Stock CTA */}
                              <button
                                onClick={() => handleOpenReceive(p)}
                                title="Receive New Stock"
                                className="px-2.5 py-1.5 rounded-lg bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#14532D] border border-[#BBF7D0] font-bold text-xs transition cursor-pointer"
                              >
                                + Stock
                              </button>
                              {/* History */}
                              <button
                                onClick={() => handleOpenHistory(p)}
                                title="Movement History"
                                className="p-1.5 rounded-lg bg-[#FAFAF7] hover:bg-slate-100 text-[#647067] border border-[#E5E7E2] transition cursor-pointer"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              {/* Edit */}
                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Product"
                                className="p-1.5 rounded-lg bg-[#FAFAF7] hover:bg-slate-100 text-[#647067] border border-[#E5E7E2] transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODAL: Receive Stock */}
        {showReceiveModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-card max-w-lg w-full p-6 space-y-4 border border-[#E5E7E2]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E2]">
                <div className="flex items-center space-x-2">
                  <ArrowDownCircle className="w-5 h-5 text-[#22C55E]" />
                  <h3 className="font-bold text-[#172018] text-base">
                    Receive Stock: {selectedProduct.name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="p-1 text-[#647067] hover:text-[#172018] rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {formError}
                </div>
              )}

              <form onSubmit={handleReceiveStockSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">
                      Quantity to Receive ({selectedProduct.unit})
                    </label>
                    <input
                      type="number"
                      step={selectedProduct.is_loose ? '0.05' : '1'}
                      required
                      value={receiveForm.qty}
                      onChange={(e) => setReceiveForm({ ...receiveForm, qty: e.target.value })}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl font-bold text-sm text-[#172018]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#172018] mb-1">
                      Batch Number (FEFO)
                    </label>
                    <input
                      type="text"
                      value={receiveForm.batch_number}
                      onChange={(e) =>
                        setReceiveForm({ ...receiveForm, batch_number: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl font-mono text-xs text-[#172018]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">Wholesale Cost Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={receiveForm.cost_price}
                      onChange={(e) =>
                        setReceiveForm({ ...receiveForm, cost_price: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl font-semibold text-xs text-[#172018]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#172018] mb-1">Retail MRP / Sell Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={receiveForm.sell_price}
                      onChange={(e) =>
                        setReceiveForm({ ...receiveForm, sell_price: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl font-bold text-xs text-[#14532D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">Mfg Date</label>
                    <input
                      type="date"
                      value={receiveForm.mfg_date}
                      onChange={(e) => setReceiveForm({ ...receiveForm, mfg_date: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs text-[#172018]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#172018] mb-1">Expiry Date (FEFO)</label>
                    <input
                      type="date"
                      value={receiveForm.expiry_date}
                      onChange={(e) =>
                        setReceiveForm({ ...receiveForm, expiry_date: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs text-[#172018]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#172018] mb-1">
                    Invoice Notes / Supplier Reference
                  </label>
                  <input
                    type="text"
                    value={receiveForm.notes}
                    onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                    placeholder="e.g. Received from Metro Cash & Carry, Invoice #5821"
                    className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs text-[#172018]"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E7E2]">
                  <button
                    type="button"
                    onClick={() => setShowReceiveModal(false)}
                    className="px-4 py-2 bg-[#FAFAF7] text-[#172018] font-bold rounded-xl border border-[#E5E7E2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white font-black rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    {submitting ? 'Receiving...' : '+ Confirm Stock Intake'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add / Edit Product */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-card max-w-xl w-full p-6 space-y-4 border border-[#E5E7E2]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E2]">
                <h3 className="font-black text-[#172018] text-base">
                  {editProduct ? `Edit Product: ${editProduct.name}` : 'Add New Product to Catalog'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-[#647067] hover:text-[#172018] rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {formError}
                </div>
              )}

              <form onSubmit={handleProductSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="e.g. Aashirvaad Atta 5kg"
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs font-medium text-[#172018]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">SKU / Barcode *</label>
                    <input
                      type="text"
                      required
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs font-mono text-[#172018]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">Category</label>
                    <select
                      value={productForm.category}
                      onChange={(e) =>
                        setProductForm({ ...productForm, category: e.target.value })
                      }
                      className="w-full px-2.5 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs text-[#172018]"
                    >
                      <option value="staples">Staples & Grains</option>
                      <option value="packaged">Packaged Foods</option>
                      <option value="dairy">Dairy</option>
                      <option value="household">Household</option>
                      <option value="personal_care">Personal Care</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">Unit</label>
                    <select
                      value={productForm.unit}
                      onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                      className="w-full px-2.5 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs text-[#172018]"
                    >
                      <option value="packet">packet</option>
                      <option value="kg">kg (weight)</option>
                      <option value="g">gram</option>
                      <option value="litre">litre</option>
                      <option value="piece">piece</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">Measure Type</label>
                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="isLooseCheckbox"
                        checked={productForm.is_loose}
                        onChange={(e) =>
                          setProductForm({ ...productForm, is_loose: e.target.checked })
                        }
                        className="rounded border-[#E5E7E2] text-[#14532D]"
                      />
                      <label htmlFor="isLooseCheckbox" className="font-semibold text-[#172018]">
                        Loose (Weighed)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">Wholesale Cost (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={productForm.cost_price}
                      onChange={(e) =>
                        setProductForm({ ...productForm, cost_price: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs font-semibold text-[#172018]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">Selling Price / MRP (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={productForm.sell_price}
                      onChange={(e) =>
                        setProductForm({ ...productForm, sell_price: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs font-bold text-[#14532D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">GST Slab (%)</label>
                    <select
                      value={productForm.gst_slab}
                      onChange={(e) =>
                        setProductForm({ ...productForm, gst_slab: e.target.value })
                      }
                      className="w-full px-2.5 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs text-[#172018]"
                    >
                      <option value="0">0% (Nil)</option>
                      <option value="5">5% (Staples / Oils)</option>
                      <option value="12">12% (Butter / Ghee)</option>
                      <option value="18">18% (Soaps / Detergent)</option>
                      <option value="28">28% (Luxury / Aerated)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">HSN Code</label>
                    <input
                      type="text"
                      value={productForm.hsn_code}
                      onChange={(e) =>
                        setProductForm({ ...productForm, hsn_code: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs font-mono text-[#172018]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#172018] mb-1">Reorder Level</label>
                    <input
                      type="number"
                      value={productForm.reorder_level}
                      onChange={(e) =>
                        setProductForm({ ...productForm, reorder_level: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs text-[#172018]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E7E2]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-[#FAFAF7] text-[#172018] font-bold rounded-xl border border-[#E5E7E2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#14532D] hover:bg-[#166534] text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    {submitting ? 'Saving...' : editProduct ? 'Update Product' : '+ Add to Catalog'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Stock Movements History */}
        {showHistoryModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-card max-w-2xl w-full p-6 space-y-4 border border-[#E5E7E2]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E2]">
                <h3 className="font-black text-[#172018] text-base">
                  Audit History: {selectedProduct.name}
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 text-[#647067] hover:text-[#172018] rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-12 flex justify-center">
                  <RefreshCw className="w-6 h-6 text-[#14532D] animate-spin" />
                </div>
              ) : historyMovements.length === 0 ? (
                <div className="py-12 text-center text-[#647067] text-xs">
                  No stock movements recorded yet for this item.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E7E2]">
                  {historyMovements.map((m) => (
                    <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              m.type === 'in'
                                ? 'bg-[#F0FDF4] text-[#16A34A]'
                                : m.type === 'out'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {m.type === 'in' ? 'Received (+)' : m.type === 'out' ? 'Sold (-)' : m.type}
                          </span>
                          <span className="font-bold text-[#172018]">
                            {m.qty} {selectedProduct.unit}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#647067] mt-0.5">{m.notes}</p>
                      </div>
                      <span className="text-[10px] text-[#647067]">
                        {formatDateTime(m.created_at)}
                      </span>
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
