import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  ShoppingCart,
  Search,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  FileText,
  AlertTriangle,
  CreditCard,
  IndianRupee,
  Smartphone,
  BookOpen,
  User,
  Scale,
  RefreshCw,
  Download,
  AlertCircle,
  Camera,
  Sparkles,
  X,
  Layers
} from 'lucide-react';
import Header from '../components/Header';
import { formatINR, formatQtyUnit } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

export default function BillingPOS({ onToggleSidebar }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters & Cart states
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash', 'upi', 'card', 'khata'
  const [paymentRef, setPaymentRef] = useState('');
  const [allowBelowCost, setAllowBelowCost] = useState(false);
  const [billNotes, setBillNotes] = useState('');

  // Live Summary from GST service
  const [summary, setSummary] = useState({
    subtotal: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    roundOff: 0,
    totalAmount: 0
  });

  // Action states
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [finalizedBill, setFinalizedBill] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const searchInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Photo & Barcode Vision Scanner States
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [photoResult, setPhotoResult] = useState(null);
  const [photoError, setPhotoError] = useState('');

  const handleProcessImage = async (file) => {
    if (!file) return;
    setPhotoError('');
    setPhotoResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      setPhotoPreview(base64);
      setPhotoAnalyzing(true);

      try {
        const res = await axios.post('/api/products/identify-photo', {
          image: base64,
          mimeType: file.type || 'image/jpeg'
        });

        if (res.data && res.data.success && res.data.product) {
          setPhotoResult(res.data);
        } else {
          const det = res.data?.details?.detected_product_name;
          setPhotoError(
            det
              ? `Identified "${det}", but it is not in the active catalog.`
              : 'Could not recognize packaging from image. Try a clearer angle.'
          );
        }
      } catch (err) {
        setPhotoError(err.response?.data?.error || err.message || 'Vision identification failed');
      } finally {
        setPhotoAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddIdentifiedProduct = () => {
    if (photoResult && photoResult.product) {
      addToCart(photoResult.product);
      setShowPhotoModal(false);
      setPhotoPreview(null);
      setPhotoResult(null);
    }
  };

  // Load initial products and customers
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [pRes, cRes, sRes] = await Promise.all([
        axios.get('/api/products'),
        axios.get('/api/khata/customers'),
        axios.get('/api/settings')
      ]);

      setProducts(pRes.data);
      setCustomers(cRes.data);
      if (sRes.data?.default_payment_mode) {
        setPaymentMode(sRes.data.default_payment_mode);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Recalculate Live GST & Totals whenever cart changes
  useEffect(() => {
    if (cart.length === 0) {
      setSummary({
        subtotal: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        roundOff: 0,
        totalAmount: 0
      });
      return;
    }

    const payload = cart.map((item) => ({
      qty: Number(item.qty),
      unit_price: Number(item.unit_price),
      gst_slab: Number(item.gst_slab)
    }));

    axios
      .post('/api/billing/calculate', { items: payload })
      .then((res) => {
        setSummary(res.data);
      })
      .catch((err) => console.error(err));
  }, [cart]);

  // Add item to cart
  const addToCart = (product) => {
    setActionError('');
    const existingIndex = cart.findIndex((item) => item.product_id === product.id);

    if (existingIndex > -1) {
      const updated = [...cart];
      const newQty = updated[existingIndex].qty + (product.is_loose ? 0.5 : 1);

      if (newQty > product.stock_qty) {
        setActionError(
          `Warning: Added quantity (${newQty}) exceeds current stock (${product.stock_qty} ${product.unit})`
        );
      }

      updated[existingIndex].qty = Number(newQty.toFixed(2));
      setCart(updated);
    } else {
      const initialQty = product.is_loose ? 1.0 : 1;
      if (initialQty > product.stock_qty) {
        setActionError(
          `Warning: Selected quantity exceeds current stock (${product.stock_qty} ${product.unit})`
        );
      }

      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          is_loose: product.is_loose,
          stock_qty: product.stock_qty,
          cost_price: product.cost_price,
          unit_price: product.sell_price,
          gst_slab: product.gst_slab,
          hsn_code: product.hsn_code,
          qty: initialQty
        }
      ]);
    }
  };

  // Update item quantity
  const updateQty = (index, delta) => {
    const updated = [...cart];
    const item = updated[index];
    const step = item.is_loose ? 0.25 : 1;
    const newQty = Number((item.qty + delta * step).toFixed(2));

    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    if (newQty > item.stock_qty) {
      setActionError(`Cart quantity (${newQty}) exceeds stock (${item.stock_qty} ${item.unit})`);
    } else {
      setActionError('');
    }

    item.qty = newQty;
    setCart(updated);
  };

  // Manual qty edit
  const setExactQty = (index, val) => {
    const updated = [...cart];
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return;
    updated[index].qty = num;
    setCart(updated);
  };

  // Remove from cart
  const removeFromCart = (index) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
    setActionError('');
    setBillNotes('');
  };

  // Handle customer selection
  const handleCustomerChange = (e) => {
    const cId = e.target.value;
    setSelectedCustomerId(cId);
    if (cId) {
      const cust = customers.find((c) => c.id === Number(cId));
      if (cust) setCustomerName(cust.name);
    } else {
      setCustomerName('');
    }
  };

  // Filter products for quick search & categories
  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'staples', label: 'Staples' },
    { id: 'packaged', label: 'Packaged' },
    { id: 'dairy', label: 'Dairy' },
    { id: 'beverages', label: 'Beverages' },
    { id: 'personal_care', label: 'Personal Care' },
    { id: 'household', label: 'Household' }
  ];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.hsn_code && p.hsn_code.includes(productSearch));

    const matchesCategory =
      selectedCategory === 'all' || p.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Finalize Bill Action
  const handleFinalizeBill = async () => {
    if (cart.length === 0) {
      setActionError('Cart is empty. Please add items to create a bill.');
      return;
    }

    if (paymentMode === 'khata' && !selectedCustomerId) {
      setActionError('Khata (Credit) payment requires selecting a customer from the Khata ledger.');
      return;
    }

    const hasBelowCost = cart.some((i) => Number(i.unit_price) < Number(i.cost_price));
    if (hasBelowCost && !allowBelowCost) {
      setActionError(
        'One or more items in cart are priced below cost price. Enable the "Allow Below-Cost Override" checkbox to proceed.'
      );
      return;
    }

    try {
      setSubmitting(true);
      setActionError('');

      // Step 1: Save draft
      const draftRes = await axios.post('/api/billing/draft', {
        customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
        customer_name: customerName || 'Walk-in Customer',
        payment_mode: paymentMode,
        payment_ref: paymentRef,
        notes: billNotes,
        items: cart.map((i) => ({
          product_id: i.product_id,
          qty: i.qty,
          unit_price: i.unit_price,
          gst_slab: i.gst_slab
        }))
      });

      const billId = draftRes.data.id;

      // Step 2: Finalize atomically
      const finalRes = await axios.post(`/api/billing/${billId}/finalize`, {
        payment_mode: paymentMode,
        payment_ref: paymentRef,
        customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
        customer_name: customerName || 'Walk-in Customer',
        allow_below_cost: allowBelowCost
      });

      setFinalizedBill(finalRes.data);
      setShowSuccessModal(true);
      clearCart();
      loadInitialData(); // Refresh product stocks and khata balances
    } catch (err) {
      setActionError(err.response?.data?.error || err.message || 'Failed to finalize bill');
    } finally {
      setSubmitting(false);
    }
  };

  const activeCustomer = customers.find((c) => c.id === Number(selectedCustomerId));

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FAFAF7]">
      <Header
        title="Billing (POS Counter)"
        subtitle="High-speed retail cashier billing & live GST calculation"
        onToggleSidebar={onToggleSidebar}
      />

      <main className="flex-1 p-3 sm:p-5 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Product Catalog & Fast Picker (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {/* Search bar & Scan photo trigger */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E5E7E2] shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#647067] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={t('pos_search_placeholder') || 'Search item by name, SKU or barcode...'}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl text-xs sm:text-sm text-[#172018] focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] font-medium outline-hidden"
                />
                {productSearch && (
                  <button
                    onClick={() => setProductSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#647067] hover:text-[#172018] font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Camera Scanner Trigger */}
              <button
                type="button"
                onClick={() => {
                  setPhotoError('');
                  setPhotoResult(null);
                  setPhotoPreview(null);
                  setShowPhotoModal(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#14532D] border border-[#BBF7D0] rounded-xl text-xs font-bold transition active:scale-95 flex-shrink-0"
              >
                <Camera className="w-4 h-4 text-[#22C55E]" />
                <span className="hidden sm:inline">Photo / Barcode</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#14532D] text-white font-bold shadow-xs'
                      : 'bg-[#FAFAF7] text-[#647067] hover:bg-slate-100 hover:text-[#172018] border border-[#E5E7E2]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#647067]">
              <span>Showing {filteredProducts.length} products</span>
              <span className="font-semibold text-[#14532D]">Click an item card to add to bill</span>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E5E7E2] shadow-xs overflow-y-auto max-h-[calc(100vh-270px)]">
            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-[#647067] text-xs">
                No products found matching "{productSearch}".
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {filteredProducts.map((p) => {
                  const isOut = Number(p.stock_qty) <= 0;
                  const isLow = Number(p.stock_qty) <= Number(p.reorder_level);

                  return (
                    <button
                      key={p.id}
                      onClick={() => !isOut && addToCart(p)}
                      disabled={isOut}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isOut
                          ? 'bg-slate-100 border-[#E5E7E2] opacity-60 cursor-not-allowed'
                          : 'bg-[#FAFAF7] hover:bg-white hover:border-[#14532D] hover:shadow-card border-[#E5E7E2] active:scale-98'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-bold text-[#172018] text-xs line-clamp-2 leading-snug">
                            {p.name}
                          </span>
                          {p.is_loose ? (
                            <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              <Scale className="w-2.5 h-2.5" /> Loose
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-[#647067] font-mono">
                          HSN {p.hsn_code} • GST {p.gst_slab}%
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#E5E7E2] flex items-center justify-between">
                        <div className="font-black text-[#14532D] text-sm">
                          {formatINR(p.sell_price)}
                          <span className="text-[10px] font-normal text-[#647067]">/{p.unit}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold ${
                            isOut ? 'text-[#DC2626]' : isLow ? 'text-[#F97316]' : 'text-[#16A34A]'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : `${formatQtyUnit(p.stock_qty, p.unit, p.is_loose)}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: POS Active Cart & Checkout (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="bg-white rounded-2xl border border-[#E5E7E2] shadow-xs p-4 sm:p-5 flex-1 flex flex-col justify-between">
            <div>
              {/* Cart Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E2]">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#14532D] flex items-center justify-center font-bold">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#172018] text-sm sm:text-base">
                      Current Bill Cart
                    </h2>
                    <p className="text-[11px] text-[#647067]">
                      {cart.length} line item{cart.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs font-bold text-[#DC2626] hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Customer Selector & Khata status */}
              <div className="py-3 border-b border-[#E5E7E2] space-y-2">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-[#647067]" />
                  <select
                    value={selectedCustomerId}
                    onChange={handleCustomerChange}
                    className="w-full text-xs py-1.5 px-2.5 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl font-medium text-[#172018] focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D]"
                  >
                    <option value="">Walk-in Customer (No Khata Credit)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || 'No phone'}) — Khata Bal: {formatINR(c.khata_balance)}
                      </option>
                    ))}
                  </select>
                </div>

                {activeCustomer && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-amber-900">{activeCustomer.name}</span>
                      <span className="text-amber-800 text-[10px] block">Khata Outstanding</span>
                    </div>
                    <span className="text-sm font-black text-amber-900">
                      {formatINR(activeCustomer.khata_balance)}
                    </span>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {actionError && (
                <div className="my-2.5 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                  <div className="flex-1 font-medium">{actionError}</div>
                </div>
              )}

              {/* Cart Items List */}
              <div className="py-2 overflow-y-auto max-h-56 divide-y divide-[#E5E7E2]/60">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-[#647067] text-xs">
                    Cart is empty. Tap items in catalog to build bill.
                  </div>
                ) : (
                  cart.map((item, idx) => {
                    const isBelowCost = Number(item.unit_price) < Number(item.cost_price);
                    const isOverStock = Number(item.qty) > Number(item.stock_qty);

                    return (
                      <div key={idx} className="py-2.5 space-y-1.5">
                        <div className="flex items-start justify-between">
                          <div className="overflow-hidden pr-2">
                            <span className="font-bold text-xs text-[#172018] block truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-[#647067] font-mono">
                              GST {item.gst_slab}% (CGST {item.gst_slab / 2}% + SGST{' '}
                              {item.gst_slab / 2}%)
                            </span>
                          </div>
                          <button
                            onClick={() => removeFromCart(idx)}
                            className="text-[#647067] hover:text-[#DC2626] p-1 transition"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Qty Steppers & Line Total */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => updateQty(idx, -1)}
                              className="w-7 h-7 rounded-lg bg-[#FAFAF7] hover:bg-[#F0FDF4] border border-[#E5E7E2] flex items-center justify-center font-bold text-[#14532D]"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              step={item.is_loose ? '0.05' : '1'}
                              value={item.qty}
                              onChange={(e) => setExactQty(idx, e.target.value)}
                              className="w-14 text-center py-1 border border-[#E5E7E2] rounded-lg font-bold text-xs bg-white text-[#172018]"
                            />
                            <span className="text-[10px] text-[#647067] font-semibold">{item.unit}</span>
                            <button
                              onClick={() => updateQty(idx, 1)}
                              className="w-7 h-7 rounded-lg bg-[#FAFAF7] hover:bg-[#F0FDF4] border border-[#E5E7E2] flex items-center justify-center font-bold text-[#14532D]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-right">
                            <div className="font-black text-[#172018] text-xs">
                              {formatINR(item.qty * item.unit_price)}
                            </div>
                            <div className="text-[10px] text-[#647067]">@ ₹{item.unit_price}</div>
                          </div>
                        </div>

                        {isBelowCost && (
                          <div className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Warning: Below wholesale cost (₹{item.cost_price})
                          </div>
                        )}
                        {isOverStock && (
                          <div className="text-[10px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            Blocked: Exceeds stock ({item.stock_qty} {item.unit} available)
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live Bill Summary & Payment Section */}
            <div className="pt-3 border-t border-[#E5E7E2] space-y-3">
              {/* Summary Card */}
              <div className="p-3 bg-[#FAFAF7] rounded-xl border border-[#E5E7E2] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#647067]">
                  <span>Taxable Subtotal:</span>
                  <span className="font-semibold text-[#172018]">{formatINR(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#647067]">
                  <span>CGST (Intra-state):</span>
                  <span className="font-semibold text-[#172018]">{formatINR(summary.cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-[#647067]">
                  <span>SGST (Intra-state):</span>
                  <span className="font-semibold text-[#172018]">{formatINR(summary.sgstAmount)}</span>
                </div>
                {summary.roundOff !== 0 && (
                  <div className="flex justify-between text-[#647067] text-[11px]">
                    <span>Round Off:</span>
                    <span>{formatINR(summary.roundOff)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-[#E5E7E2] text-sm font-extrabold text-[#172018]">
                  <span>Grand Total:</span>
                  <span className="text-xl font-black text-[#14532D]">
                    {formatINR(summary.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-[10px] font-bold text-[#647067] uppercase tracking-wider mb-1.5">
                  Payment Mode
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: 'cash', label: 'Cash', icon: IndianRupee },
                    { id: 'upi', label: 'UPI', icon: Smartphone },
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'khata', label: 'Khata', icon: BookOpen }
                  ].map((m) => {
                    const Icon = m.icon;
                    const isActive = paymentMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMode(m.id)}
                        className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          isActive
                            ? 'bg-[#14532D] text-white shadow-xs'
                            : 'bg-[#FAFAF7] text-[#647067] hover:bg-[#F0FDF4] hover:text-[#14532D] border border-[#E5E7E2]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(paymentMode === 'upi' || paymentMode === 'card') && (
                <div>
                  <input
                    type="text"
                    placeholder={
                      paymentMode === 'upi'
                        ? 'UPI UTR / Ref (e.g. 340912...)'
                        : 'Card Last 4 digits'
                    }
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#FAFAF7] border border-[#E5E7E2] rounded-xl outline-hidden text-[#172018]"
                  />
                </div>
              )}

              {/* Below cost override checkbox */}
              <div className="flex items-center space-x-2 text-[11px] text-[#647067]">
                <input
                  type="checkbox"
                  id="overrideBelowCost"
                  checked={allowBelowCost}
                  onChange={(e) => setAllowBelowCost(e.target.checked)}
                  className="rounded border-[#E5E7E2] text-[#F97316] focus:ring-[#F97316]"
                />
                <label htmlFor="overrideBelowCost" className="cursor-pointer">
                  Allow below-cost price override
                </label>
              </div>

              {/* Primary Action Button: Saffron Warm Accent */}
              <button
                onClick={handleFinalizeBill}
                disabled={submitting || cart.length === 0}
                className="w-full py-3 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 text-white font-black rounded-xl shadow-xs hover:shadow-md transition active:scale-95 flex items-center justify-center space-x-2 text-sm cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Sale...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Sale ({formatINR(summary.totalAmount)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* MODAL: Bill Finalized Success */}
        {showSuccessModal && finalizedBill && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-card max-w-md w-full p-6 space-y-4 border border-[#E5E7E2] text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center mx-auto border border-[#BBF7D0]">
                <CheckCircle className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-black text-[#172018]">Sale Finalized Successfully!</h3>
                <p className="text-xs text-[#647067] font-mono mt-0.5">
                  Invoice #{finalizedBill.bill_number}
                </p>
              </div>

              <div className="p-4 bg-[#FAFAF7] rounded-2xl border border-[#E5E7E2] text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#647067]">Customer:</span>
                  <span className="font-bold text-[#172018]">
                    {finalizedBill.customer_name || 'Walk-in'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#647067]">Payment Mode:</span>
                  <span className="font-bold uppercase text-[#14532D]">
                    {finalizedBill.payment_mode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#647067]">GST Breakdown:</span>
                  <span className="font-semibold text-[#172018]">
                    CGST: {formatINR(finalizedBill.cgst_amount)} | SGST: {formatINR(finalizedBill.sgst_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black pt-2 border-t border-[#E5E7E2]">
                  <span>Total Amount Paid:</span>
                  <span className="text-[#14532D]">{formatINR(finalizedBill.total_amount)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <a
                  href={`/api/invoices/${finalizedBill.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-[#14532D] hover:bg-[#166534] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download GST Invoice PDF</span>
                </a>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-4 py-2.5 bg-[#FAFAF7] hover:bg-slate-100 text-[#172018] border border-[#E5E7E2] font-bold rounded-xl text-xs"
                >
                  New Bill
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Photo & Barcode Vision Scanner */}
        {showPhotoModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-card max-w-lg w-full p-6 space-y-4 border border-[#E5E7E2]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E2]">
                <div className="flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-[#14532D]" />
                  <h3 className="font-bold text-[#172018] text-base">Photo & Barcode Scanner</h3>
                </div>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="p-1 text-[#647067] hover:text-[#172018] rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#647067]">
                Capture product packaging or barcodes directly with your device camera to identify and bill immediately.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessImage(file);
                }}
              />

              {!photoPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#E5E7E2] hover:border-[#14532D] rounded-2xl p-8 text-center cursor-pointer transition bg-[#FAFAF7] hover:bg-[#F0FDF4] flex flex-col items-center justify-center space-y-2.5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-xs flex items-center justify-center text-[#14532D]">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-[#172018] text-sm">Tap to Take Photo or Upload</p>
                    <p className="text-[11px] text-[#647067] mt-0.5">
                      Supports packaging photos, camera snapshots & barcodes
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden max-h-56 bg-slate-900 flex items-center justify-center border border-[#E5E7E2]">
                    <img
                      src={photoPreview}
                      alt="Scanned product"
                      className="max-h-56 w-auto object-contain"
                    />
                    {photoAnalyzing && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                        <Sparkles className="w-8 h-8 text-[#22C55E] animate-spin" />
                        <span className="text-xs font-bold">Analyzing product photo...</span>
                      </div>
                    )}
                  </div>

                  {photoError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{photoError}</span>
                    </div>
                  )}

                  {photoResult && photoResult.product && (
                    <div className="p-4 bg-[#F0FDF4] rounded-2xl border border-[#BBF7D0] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-[#14532D] font-bold text-xs">
                          <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                          <span>Product Identified</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#14532D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                          Confidence: {photoResult.details?.confidence_percentage || 95}%
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-[#E5E7E2] flex items-center justify-between">
                        <div>
                          <div className="font-bold text-[#172018] text-sm">
                            {photoResult.product.name}
                          </div>
                          <div className="text-[11px] text-[#647067]">
                            SKU: {photoResult.product.sku} • In Stock: {photoResult.product.stock_qty}{' '}
                            {photoResult.product.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-[#14532D] text-base">
                            {formatINR(photoResult.product.sell_price)}
                          </div>
                          <div className="text-[10px] text-[#647067]">
                            GST: {photoResult.product.gst_slab}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null);
                        setPhotoResult(null);
                        setPhotoError('');
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-2 bg-[#FAFAF7] hover:bg-slate-100 text-[#172018] font-bold rounded-xl text-xs border border-[#E5E7E2]"
                    >
                      Scan Another
                    </button>

                    {photoResult?.product && (
                      <button
                        type="button"
                        onClick={handleAddIdentifiedProduct}
                        className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-95 flex items-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add to Bill</span>
                      </button>
                    )}
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
