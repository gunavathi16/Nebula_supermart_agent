import crypto from 'node:crypto';

/**
 * In-memory / durable session manager keyed by chat_id.
 * Tracks in-progress draft bills, idempotency keys, message history,
 * and de-duplicates Telegram update_ids.
 */
class SessionStore {
  constructor() {
    this.sessions = new Map();
    this.processedUpdateIds = new Set();
  }

  // De-duplicate Telegram updates
  isDuplicateUpdate(updateId) {
    if (!updateId) return false;
    if (this.processedUpdateIds.has(updateId)) {
      return true;
    }
    this.processedUpdateIds.add(updateId);
    // Keep max 5000 recent update IDs in memory to avoid unbounded growth
    if (this.processedUpdateIds.size > 5000) {
      const first = this.processedUpdateIds.values().next().value;
      this.processedUpdateIds.delete(first);
    }
    return false;
  }

  getSession(chatId) {
    const id = String(chatId);
    if (!this.sessions.has(id)) {
      this.sessions.set(id, {
        chatId: id,
        currentDraftBillId: null,
        currentDraftBillNumber: null,
        currentIdempotencyKey: null,
        lastFinalizedBillId: null,
        lastFinalizedBillNumber: null,
        conversationHistory: []
      });
    }
    return this.sessions.get(id);
  }

  setDraftBill(chatId, billId, billNumber, idempotencyKey = null) {
    const session = this.getSession(chatId);
    session.currentDraftBillId = billId;
    session.currentDraftBillNumber = billNumber;
    session.currentIdempotencyKey = idempotencyKey || crypto.randomUUID();
  }

  setLastFinalizedBill(chatId, billId, billNumber) {
    const session = this.getSession(chatId);
    session.lastFinalizedBillId = billId;
    session.lastFinalizedBillNumber = billNumber;
  }

  clearDraftBill(chatId) {
    const session = this.getSession(chatId);
    session.currentDraftBillId = null;
    session.currentDraftBillNumber = null;
    session.currentIdempotencyKey = null;
  }

  addMessage(chatId, role, content) {
    const session = this.getSession(chatId);
    session.conversationHistory.push({ role, content, timestamp: Date.now() });
    // Keep last 20 messages in conversation context
    if (session.conversationHistory.length > 20) {
      session.conversationHistory.shift();
    }
  }

  getMessages(chatId) {
    return this.getSession(chatId).conversationHistory;
  }

  // /new or /reset clears chat conversation & active draft, but store preferences remain in DB
  resetSession(chatId) {
    const id = String(chatId);
    this.sessions.set(id, {
      chatId: id,
      currentDraftBillId: null,
      currentDraftBillNumber: null,
      currentIdempotencyKey: null,
      lastFinalizedBillId: null,
      lastFinalizedBillNumber: null,
      conversationHistory: []
    });
  }
}

export const sessionStore = new SessionStore();
