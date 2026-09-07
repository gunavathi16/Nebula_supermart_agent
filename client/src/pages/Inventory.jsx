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
  Filter,
  RefreshCw,
  X,
  Scale
} from 'lucide-react';
import Header from '../components/Header';
import { formatINR, formatQtyUnit, formatDateTime } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

export default function Inventory() {
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

  // Form states
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

    // Re-fetch when user switches back to browser tab from Telegram or another app
    const onFocus = () => {
      fetchProducts(false);
      fetchAnalytics();
    };
    window.addEventListener('focus', onFocus);

    // Sync inventory every 4 seconds in background when modals are not open
    const interval = setInterval(() => {
      if (!showAddModal && !showReceiveModal && !showHistoryModal && !editProduct) {
        fetchProducts(false);
      }
    }, 4000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [category, onlyLowStock, search, showAddModal, showReceiveModal, showHistoryModal, editProduct]);

  // Open receive stock modal directly if query param passed (e.g. from Dashboard alert)
  useEffect(() => {
    const restockId = searchParams.get('restock');
    if (restockId && products.length > 0) {
      const prod = products.find(p => p.id === Number(restockId));
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

  // Open Receive Stock Modal
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

  // Submit Receive Stock
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
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to receive stock');
    } finally {
      setSubmitting(false);
    }
  };

  // Open History Modal
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

  // Open Add Product Modal
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

  // Open Edit Product Modal
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

  // Submit Add / Edit Product
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.sku || !productForm.cost_price || !productForm.sell_price) {
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
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'staples', label: 'Staples & Grains' },
    { id: 'packaged', label: 'Packaged Foods' },
    { id: 'dairy', label: 'Dairy' },
    { id: 'household', label: 'Household' },
    { id: 'personal_care', label: 'Personal Care' }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header title={t('inv_title')} subtitle={t('inv_subtitle')} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by SKU, product name, or HSN code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Low stock toggle */}
            <button
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                onlyLowStock
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Stock Only</span>
            </button>

            {/* Refresh */}
            <button
              onClick={fetchProducts}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
              title="Refresh inventory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Add Product CTA */}
            <button
              onClick={handleOpenAdd}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {/* Navigation View Switcher */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveView('catalog')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${
              activeView === 'catalog'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Catalog</span>
            <span className="text-[11px] opacity-75">({products.length})</span>
          </button>

          <button
            onClick={() => setActiveView('reorder')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${
              activeView === 'reorder'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Smart Reorder & Velocity</span>
            {reorderData?.critical_count > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                {reorderData.critical_count} CRITICAL
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('expiry')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${
              activeView === 'expiry'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Expiry & FEFO Batches</span>
            {expiryData?.expiring_soon_count > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {expiryData.expiring_soon_count} Due Soon
              </span>
            )}
          </button>
        </div>

        {/* VIEW 1: SMART REORDER & SALES VELOCITY */}
        {activeView === 'reorder' && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm bg-gradient-to-br from-rose-50/50 to-white">
                <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">Critical Reorders (≤ 3 Days)</div>
                <div className="text-2xl font-black text-rose-900 mt-1">{reorderData?.critical_count || 0}</div>
                <p className="text-[11px] text-rose-600 mt-1">Items at risk of imminent stockout based on daily velocity</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Upcoming Reorders (3–7 Days)</div>
                <div className="text-2xl font-black text-amber-900 mt-1">{reorderData?.warning_count || 0}</div>
                <p className="text-[11px] text-amber-600 mt-1">Items approaching buffer safety thresholds</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Target Stock Buffer</div>
                <div className="text-2xl font-black text-emerald-900 mt-1">14 Days</div>
                <p className="text-[11px] text-emerald-600 mt-1">Intelligent dynamic replenishment target</p>
              </div>
            </div>

            {/* Reorder Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Velocity-Based Reorder Recommendations</h3>
                  <p className="text-xs text-slate-500">Predicted days of stock runway and suggested order batches</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">Formula: 14d Velocity × Target Buffer</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Current Stock</th>
                      <th className="py-3 px-3">Daily Velocity</th>
                      <th className="py-3 px-3">Runway Remaining</th>
                      <th className="py-3 px-3">Suggested Reorder</th>
                      <th className="py-3 px-3">Est. Order Cost</th>
                      <th className="py-3 px-4 text-right">Quick Restock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!reorderData?.suggestions || reorderData.suggestions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-slate-400">Loading velocity data...</td>
                      </tr>
                    ) : (
                      reorderData.suggestions.map((item) => {
                        const prod = products.find(p => p.id === item.product_id);
                        const isCrit = item.urgency === 'CRITICAL';
                        const isWarn = item.urgency === 'WARNING';

                        return (
                          <tr key={item.product_id} className={`hover:bg-slate-50/70 transition ${isCrit ? 'bg-rose-50/30' : ''}`}>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">SKU: {item.sku}</div>
                            </td>
                            <td className="py-3 px-3 capitalize text-slate-600">{item.category}</td>
                            <td className="py-3 px-3 font-extrabold text-slate-900">
                              {item.current_stock} {item.unit}
                            </td>
                            <td className="py-3 px-3 font-bold text-blue-700">
                              {item.daily_velocity} {item.unit}/day
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                isCrit ? 'bg-rose-100 text-rose-800' : isWarn ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {item.runway_days === 'Ample' ? 'Ample' : `${item.runway_days} days`}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-extrabold text-orange-600 text-sm">
                              {item.suggested_reorder_qty > 0 ? `+${item.suggested_reorder_qty} ${item.unit}` : 'Healthy'}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-700">
                              {item.estimated_order_cost > 0 ? formatINR(item.estimated_order_cost) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {prod && (
                                <button
                                  onClick={() => handleOpenReceive(prod, item.suggested_reorder_qty)}
                                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95"
                                >
                                  + Restock Now
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: EXPIRY & FEFO BATCH TRACKING */}
        {activeView === 'expiry' && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active Inventory Batches</div>
                <div className="text-2xl font-black text-emerald-900 mt-1">{expiryData?.all_active_batches || 0}</div>
                <p className="text-[11px] text-emerald-600 mt-1">Batches tracked across catalog with expiry dates</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Expiring in 30 Days</div>
                <div className="text-2xl font-black text-amber-900 mt-1">{expiryData?.expiring_soon_count || 0}</div>
                <p className="text-[11px] text-amber-600 mt-1">Batches prioritized for sale under FEFO</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">FEFO Enforcement</div>
                <div className="text-2xl font-black text-blue-900 mt-1">100% Active</div>
                <p className="text-[11px] text-blue-600 mt-1">Earliest expiring batches automatically deducted first</p>
              </div>
            </div>

            {/* Expiring Batches Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Product Batches & Expiry Timeline</h3>
                  <p className="text-xs text-slate-500">Sorted by earliest expiry date (First-Expired, First-Out sequence)</p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  ✓ FEFO Auto-Picking
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Batch Number</th>
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Batch Quantity</th>
                      <th className="py-3 px-3">Mfg Date</th>
                      <th className="py-3 px-3">Expiry Date</th>
                      <th className="py-3 px-3">Days Remaining</th>
                      <th className="py-3 px-4 text-right">FEFO Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!expiryData?.expiring_soon || expiryData.expiring_soon.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-slate-400">
                          ✅ No batches expiring within the next 30 days. All inventory is fresh!
                        </td>
                      </tr>
                    ) : (
                      expiryData.expiring_soon.map((b, idx) => {
                        const isCritical = b.days_until_expiry <= 7;
                        return (
                          <tr key={b.id} className={`hover:bg-slate-50/70 transition ${isCritical ? 'bg-rose-50/40' : ''}`}>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.batch_number}</td>
                            <td className="py-3 px-3 font-bold text-slate-900">{b.product_name}</td>
                            <td className="py-3 px-3 capitalize text-slate-600">{b.category}</td>
                            <td className="py-3 px-3 font-extrabold text-slate-900">{b.stock_qty} {b.unit}</td>
                            <td className="py-3 px-3 text-slate-500 font-mono">{b.mfg_date || '-'}</td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">{b.expiry_date}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                isCritical ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {b.days_until_expiry <= 0 ? 'Expired Today' : `in ${b.days_until_expiry} days`}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                              #{idx + 1} Next to Sell
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: STANDARD CATALOG */}
        {activeView === 'catalog' && (
          <>
            {/* Category Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-semibold">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${
                    category === c.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Item Details</th>
                      <th className="py-3.5 px-3">Category / Type</th>
                      <th className="py-3.5 px-3">HSN & GST</th>
                      <th className="py-3.5 px-3">Cost Price</th>
                      <th className="py-3.5 px-3">Selling Price</th>
                      <th className="py-3.5 px-3">Stock Level</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-600" />
                          Loading inventory products...
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-400">
                          No products found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => {
                        const isLow = p.stock_qty <= p.reorder_level;
                        const isOut = p.stock_qty <= 0;
                        const margin = p.sell_price > 0 ? (((p.sell_price - p.cost_price) / p.sell_price) * 100).toFixed(1) : 0;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">SKU: {p.sku}</div>
                            </td>

                            <td className="py-3.5 px-3">
                              <span className="capitalize text-slate-700 font-medium">{p.category}</span>
                              <div className="mt-0.5">
                                {p.is_loose ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    <Scale className="w-2.5 h-2.5" /> Loose ({p.unit})
                                  </span>
                                ) : (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                    Packaged ({p.unit})
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="text-slate-700 font-mono font-medium">HSN: {p.hsn_code}</div>
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                GST {p.gst_slab}%
                              </span>
                            </td>

                            <td className="py-3.5 px-3 font-semibold text-slate-600">
                              {formatINR(p.cost_price)}
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-900 text-sm">{formatINR(p.sell_price)}</div>
                              <div className="text-[10px] text-emerald-600 font-semibold">{margin}% margin</div>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="flex items-center space-x-1.5">
                                <span className={`text-sm font-extrabold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-700'}`}>
                                  {formatQtyUnit(p.stock_qty, p.unit, p.is_loose)}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Reorder: {p.reorder_level} {p.unit}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center space-x-1.5">
                                <button
                                  onClick={() => handleOpenReceive(p)}
                                  title="Receive / Replenish Stock"
                                  className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 font-bold text-[11px] border border-orange-200 transition"
                                >
                                  + Receive
                                </button>
                                <button
                                  onClick={() => handleOpenHistory(p)}
                                  title="Stock Audit Trail"
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(p)}
                                  title="Edit Details"
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* MODAL: Receive Stock Form */}
        {showReceiveModal && selectedProduct && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                    <ArrowDownCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">Receive Stock</h3>
                    <p className="text-xs text-slate-500 truncate max-w-xs">{selectedProduct.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {formError}
                </div>
              )}

              <form onSubmit={handleReceiveStockSubmit} className="space-y-3.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">Current In-Stock:</span>
                  <span className="font-bold text-slate-900">
                    {formatQtyUnit(selectedProduct.stock_qty, selectedProduct.unit, selectedProduct.is_loose)}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quantity Received ({selectedProduct.unit}) *
                  </label>
                  <input
                    type="number"
                    step={selectedProduct.is_loose ? '0.01' : '1'}
                    required
                    placeholder="e.g. 50"
                    value={receiveForm.qty}
                    onChange={(e) => setReceiveForm({ ...receiveForm, qty: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cost Price (₹/unit)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={receiveForm.cost_price}
                      onChange={(e) => setReceiveForm({ ...receiveForm, cost_price: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">New Sell MRP (₹/unit)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={receiveForm.sell_price}
                      onChange={(e) => setReceiveForm({ ...receiveForm, sell_price: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Batch Number (FEFO)</label>
                    <input
                      type="text"
                      placeholder="e.g. BTH-101"
                      value={receiveForm.batch_number}
                      onChange={(e) => setReceiveForm({ ...receiveForm, batch_number: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Expiry Date (FEFO)</label>
                    <input
                      type="date"
                      value={receiveForm.expiry_date}
                      onChange={(e) => setReceiveForm({ ...receiveForm, expiry_date: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vendor / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Received from ITC distributor, Invoice #772"
                    value={receiveForm.notes}
                    onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowReceiveModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow transition"
                  >
                    {submitting ? 'Receiving...' : 'Confirm Stock In'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Stock Audit History */}
        {showHistoryModal && selectedProduct && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Stock Movement History</h3>
                  <p className="text-xs text-slate-500">{selectedProduct.name} ({selectedProduct.sku})</p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
                {loadingHistory ? (
                  <div className="py-8 text-center text-slate-400">Loading audit history...</div>
                ) : historyMovements.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">No stock movements recorded yet.</div>
                ) : (
                  historyMovements.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                            m.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {m.type === 'in' ? '+ In (Received)' : '- Out (Sold)'}
                          </span>
                          <span className="font-bold text-slate-900">
                            {formatQtyUnit(m.qty, selectedProduct.unit, selectedProduct.is_loose)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{m.notes || '-'}</p>
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        {formatDateTime(m.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Add / Edit Product */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">
                  {editProduct ? 'Edit Product Details' : 'Add New Kirana Product'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {formError}
                </div>
              )}

              <form onSubmit={handleProductSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Salt Vacuum Evaporated 1kg"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SKU / Barcode *</label>
                    <input
                      type="text"
                      required
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="staples">Staples & Grains</option>
                      <option value="packaged">Packaged Foods</option>
                      <option value="dairy">Dairy</option>
                      <option value="household">Household</option>
                      <option value="personal_care">Personal Care</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Measurement Unit</label>
                    <select
                      value={productForm.unit}
                      onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="packet">Packet (pkt)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="g">Gram (g)</option>
                      <option value="litre">Litre (L)</option>
                      <option value="ml">Millilitre (ml)</option>
                      <option value="piece">Piece (pc)</option>
                      <option value="dozen">Dozen</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productForm.is_loose}
                        onChange={(e) => setProductForm({ ...productForm, is_loose: e.target.checked })}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="font-semibold text-slate-700">Sold by Weight / Loose</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cost Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 210"
                      value={productForm.cost_price}
                      onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Selling Price / MRP (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 265"
                      value={productForm.sell_price}
                      onChange={(e) => setProductForm({ ...productForm, sell_price: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">GST Slab *</label>
                    <select
                      value={productForm.gst_slab}
                      onChange={(e) => setProductForm({ ...productForm, gst_slab: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold"
                    >
                      <option value="0">0% (Staples / Fresh produce)</option>
                      <option value="5">5% (Packaged staples, sugar, oil)</option>
                      <option value="12">12% (Butter, ghee, processed)</option>
                      <option value="18">18% (Soaps, detergents, biscuits)</option>
                      <option value="28">28% (Luxury items)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">HSN Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 1101"
                      value={productForm.hsn_code}
                      onChange={(e) => setProductForm({ ...productForm, hsn_code: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {editProduct ? 'Current Stock Level' : 'Initial Stock Qty'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!!editProduct}
                      value={productForm.stock_qty}
                      onChange={(e) => setProductForm({ ...productForm, stock_qty: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl disabled:bg-slate-100 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reorder Level</label>
                    <input
                      type="number"
                      value={productForm.reorder_level}
                      onChange={(e) => setProductForm({ ...productForm, reorder_level: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow transition"
                  >
                    {submitting ? 'Saving...' : editProduct ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
