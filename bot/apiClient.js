import axios from 'axios';
import { config } from './config.js';

class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 10000
    });
    this.token = null;
  }

  async ensureAuth() {
    if (this.token) return;
    try {
      const res = await this.client.post('/auth/login', {
        username: 'admin',
        password: 'kirana123'
      });
      this.token = res.data.token;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    } catch (err) {
      console.warn('Auto-login failed, proceeding with default unauthenticated/mock headers:', err.message);
    }
  }

  async request(method, url, data = null, params = null, extraConfig = {}) {
    await this.ensureAuth();
    try {
      const res = await this.client({
        method,
        url,
        data,
        params,
        ...extraConfig
      });
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'API request failed';
      const status = err.response?.status;
      throw new Error(`[API Error ${status || ''}]: ${errorMsg}`);
    }
  }

  // --- Products & Inventory ---
  async searchProducts(query) {
    return this.request('GET', '/products', null, { search: query });
  }

  async getProduct(id) {
    return this.request('GET', `/products/${id}`);
  }

  async receiveStock(productId, qty, costPrice, sellPrice, notes) {
    return this.request('POST', `/products/${productId}/receive-stock`, {
      qty,
      cost_price: costPrice,
      sell_price: sellPrice,
      notes
    });
  }

  async createProduct(productData) {
    return this.request('POST', '/products', productData);
  }

  async getLowStock() {
    return this.request('GET', '/products', null, { low_stock: 'true' });
  }

  async getReorderSuggestions() {
    return this.request('GET', '/products/reorder-suggestions');
  }

  async getExpiringProducts(days = 30) {
    return this.request('GET', '/products/expiring', null, { days });
  }

  async getProductBatches(productId) {
    return this.request('GET', `/products/${productId}/batches`);
  }

  // --- Multi-Turn Bills & POS ---
  async startDraftBill(data = {}) {
    return this.request('POST', '/billing/draft/start', data);
  }

  async addBillItem(billId, productId, qty, unitPrice) {
    return this.request('POST', `/billing/draft/${billId}/items`, {
      product_id: productId,
      qty,
      unit_price: unitPrice
    });
  }

  async removeBillItem(billId, itemId) {
    return this.request('DELETE', `/billing/draft/${billId}/items/${itemId}`);
  }

  async previewBill(billId) {
    return this.request('GET', `/billing/${billId}`);
  }

  async finalizeBill(billId, finalizeData) {
    return this.request('POST', `/billing/${billId}/finalize`, finalizeData);
  }

  // --- Khata Credit Ledger ---
  async getCustomerBalance(search) {
    const customers = await this.request('GET', '/khata/customers', null, { search });
    return customers;
  }

  async createCustomer(customerData) {
    return this.request('POST', '/khata/customers', customerData);
  }

  async updateCustomer(customerId, customerData) {
    return this.request('PUT', `/khata/customers/${customerId}`, customerData);
  }

  async addKhataCredit(customerId, amount, notes = '') {
    return this.request('POST', `/khata/customers/${customerId}/credit`, {
      amount,
      notes
    });
  }

  async recordKhataPayment(customerId, amount, paymentMode = 'cash', notes = '') {
    return this.request('POST', `/khata/customers/${customerId}/payment`, {
      amount,
      payment_mode: paymentMode,
      notes
    });
  }

  // --- Reports & Documents ---
  async getDailyClose(date = null) {
    return this.request('GET', '/reports/dashboard');
  }

  async getLatestInvoice() {
    const list = await this.request('GET', '/invoices?limit=1');
    return list && list.length > 0 ? list[0] : null;
  }

  async getInvoicePdfBuffer(billId) {
    await this.ensureAuth();
    const res = await this.client.get(`/invoices/${billId}/pdf`, {
      responseType: 'arraybuffer'
    });
    return Buffer.from(res.data);
  }

  async getAnalysisDeckBuffer(range = '7d') {
    await this.ensureAuth();
    const res = await this.client.get('/reports/deck', {
      params: { range },
      responseType: 'arraybuffer'
    });
    return Buffer.from(res.data);
  }

  // --- Store Preferences & Settings ---
  async getSettings() {
    return this.request('GET', '/settings');
  }

  async setSetting(key, value) {
    return this.request('PUT', '/settings', { [key]: value });
  }
}

export const apiClient = new ApiClient();
