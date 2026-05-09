(function (global) {
  const STORAGE_KEYS = Object.freeze({
    invoices: 'spms_invoices_v1',
    transactions: 'spms_transactions_v1',
    auditLogs: 'spms_audit_logs_v1',
  });

  const InvoiceStatus = Object.freeze({
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
  });

  const TransactionStatus = Object.freeze({
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
  });

  const PaymentFailureCode = Object.freeze({
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    CONNECTION_LOSS: 'CONNECTION_LOSS',
    TIMEOUT: 'TIMEOUT',
    INVOICE_ALREADY_PAID: 'INVOICE_ALREADY_PAID',
    INVOICE_ALREADY_PROCESSING: 'INVOICE_ALREADY_PROCESSING',
    INVALID_PAYMENT_STATE: 'INVALID_PAYMENT_STATE',
    PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  });

  const DEFAULT_ENV = Object.freeze({
    BKPAY_API_BASE_URL: '',
    BKPAY_API_KEY: '',
    DATACORE_API_BASE_URL: '',
    DATACORE_API_KEY: '',
    PAYMENT_TIMEOUT_MS: 8000,
    DATACORE_TIMEOUT_MS: 8000,
    SIMULATION_MODE: 'demo',
  });

  const InvoiceTransition = Object.freeze({
    [InvoiceStatus.PENDING]: [InvoiceStatus.PROCESSING, InvoiceStatus.CANCELLED],
    [InvoiceStatus.PROCESSING]: [InvoiceStatus.SUCCESS, InvoiceStatus.FAILED, InvoiceStatus.CANCELLED],
    [InvoiceStatus.SUCCESS]: [],
    [InvoiceStatus.FAILED]: [InvoiceStatus.PROCESSING, InvoiceStatus.CANCELLED],
    [InvoiceStatus.CANCELLED]: [InvoiceStatus.PROCESSING],
  });

  function nowIso() {
    return new Date().toISOString();
  }

  function safeParseJson(raw, fallback) {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function normalizeStatus(value, fallback) {
    const normalized = String(value || '').toUpperCase();
    return normalized || fallback;
  }

  function formatMoneyVnd(amount) {
    const safeAmount = Number(amount) || 0;
    return `${safeAmount.toLocaleString('vi-VN')} đ`;
  }

  function formatDateTime(isoValue) {
    if (!isoValue) return '—';
    const parsed = new Date(isoValue);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('vi-VN');
  }

  function createError(message, code, meta = {}) {
    const error = new Error(message);
    error.code = code;
    Object.assign(error, meta);
    return error;
  }

  function getPricingEnvironment() {
    const injected = global.__SPMS_ENV__ || global.SPMS_ENV || {};
    return { ...DEFAULT_ENV, ...injected };
  }

  function createAuditEntry({ severity = 'INFO', actor = 'system', action = 'Unknown', status = 'Success', details = '', meta = {} }) {
    return {
      ts: nowIso(),
      severity,
      actor,
      action,
      status,
      details,
      meta,
    };
  }

  function normalizeInvoiceRecord(record) {
    if (!record || typeof record !== 'object') return null;

    const legacyStatus = String(record.status || '').toUpperCase();
    const status = legacyStatus === 'UNPAID'
      ? InvoiceStatus.PENDING
      : legacyStatus === 'PAID'
        ? InvoiceStatus.SUCCESS
        : Object.values(InvoiceStatus).includes(legacyStatus)
          ? legacyStatus
          : InvoiceStatus.PENDING;

    const cycleLabel = record.cycleLabel || record.cycle || 'Chu kỳ thanh toán';

    return {
      id: record.id || record.invoiceId || `INV-${Date.now()}`,
      cycleLabel,
      cardId: record.cardId || null,
      sessionId: record.sessionId || null,
      amount: Number(record.amount) || 0,
      status,
      createdAt: record.createdAt || nowIso(),
      updatedAt: record.updatedAt || record.createdAt || nowIso(),
      paidAt: record.paidAt || null,
      txId: record.txId || null,
      failureReason: record.failureReason || null,
    };
  }

  function normalizeTransactionRecord(record) {
    if (!record || typeof record !== 'object') return null;

    const legacyStatus = String(record.status || '').toUpperCase();
    const status = Object.values(TransactionStatus).includes(legacyStatus) ? legacyStatus : TransactionStatus.PENDING;

    return {
      id: record.id || record.transactionId || `TXN-${Date.now()}`,
      invoiceId: record.invoiceId || null,
      amount: Number(record.amount) || 0,
      method: record.method || 'bkpay',
      status,
      createdAt: record.createdAt || record.timestamp || nowIso(),
      updatedAt: record.updatedAt || record.createdAt || record.timestamp || nowIso(),
      bkpayRef: record.bkpayRef || null,
      providerRef: record.providerRef || null,
      failureCode: record.failureCode || null,
      failureReason: record.failureReason || null,
      signature: record.signature || null,
      retryCount: Number(record.retryCount) || 0,
    };
  }

  class InvoiceRepository {
    constructor(storage = global.localStorage) {
      this.storage = storage;
    }

    readCollection(key, fallback = []) {
      const raw = this.storage.getItem(key);
      const parsed = safeParseJson(raw, fallback);
      return Array.isArray(parsed) ? parsed : fallback;
    }

    writeCollection(key, value) {
      this.storage.setItem(key, JSON.stringify(value));
    }

    listInvoices() {
      const invoices = this.readCollection(STORAGE_KEYS.invoices, []);
      const normalized = invoices.map(normalizeInvoiceRecord).filter(Boolean);
      const hasChanges = normalized.length !== invoices.length || normalized.some((invoice, index) => JSON.stringify(invoice) !== JSON.stringify(invoices[index]));
      if (hasChanges) {
        this.writeCollection(STORAGE_KEYS.invoices, normalized);
      }
      return normalized;
    }

    saveInvoices(invoices) {
      const normalized = Array.isArray(invoices) ? invoices.map(normalizeInvoiceRecord).filter(Boolean) : [];
      this.writeCollection(STORAGE_KEYS.invoices, normalized);
      return normalized;
    }

    getInvoiceById(invoiceId) {
      return this.listInvoices().find((invoice) => invoice.id === invoiceId) || null;
    }

    getCurrentInvoice() {
      const pendingInvoiceId = global.sessionStorage.getItem('spms_pending_invoice_id');
      const invoices = this.listInvoices();

      if (pendingInvoiceId) {
        const selected = invoices.find((invoice) => invoice.id === pendingInvoiceId);
        if (selected) return selected;
      }

      return invoices[0] || null;
    }

    upsertInvoice(nextInvoice) {
      const normalized = normalizeInvoiceRecord(nextInvoice);
      if (!normalized) return null;

      const invoices = this.listInvoices();
      const index = invoices.findIndex((invoice) => invoice.id === normalized.id);
      if (index >= 0) {
        invoices[index] = { ...invoices[index], ...normalized };
      } else {
        invoices.unshift(normalized);
      }
      this.saveInvoices(invoices);
      return normalized;
    }

    canTransitionInvoiceStatus(currentStatus, nextStatus) {
      const fromStatus = normalizeStatus(currentStatus, InvoiceStatus.PENDING);
      const toStatus = normalizeStatus(nextStatus, InvoiceStatus.PENDING);
      return (InvoiceTransition[fromStatus] || []).includes(toStatus);
    }

    updateInvoiceStatus(invoiceId, nextStatus, context = {}) {
      const invoices = this.listInvoices();
      const index = invoices.findIndex((invoice) => invoice.id === invoiceId);
      if (index < 0) return null;

      const currentInvoice = invoices[index];
      const targetStatus = normalizeStatus(nextStatus, InvoiceStatus.PENDING);

      if (!this.canTransitionInvoiceStatus(currentInvoice.status, targetStatus)) {
        throw createError(
          `Invalid invoice transition from ${currentInvoice.status} to ${targetStatus}`,
          PaymentFailureCode.INVALID_PAYMENT_STATE,
          { invoiceId, fromStatus: currentInvoice.status, toStatus: targetStatus, context }
        );
      }

      const updatedInvoice = {
        ...currentInvoice,
        ...context.patch,
        status: targetStatus,
        updatedAt: context.updatedAt || nowIso(),
      };

      invoices[index] = updatedInvoice;
      this.saveInvoices(invoices);
      return updatedInvoice;
    }

    listTransactions() {
      const transactions = this.readCollection(STORAGE_KEYS.transactions, []);
      const normalized = transactions.map(normalizeTransactionRecord).filter(Boolean);
      const hasChanges = normalized.length !== transactions.length || normalized.some((transaction, index) => JSON.stringify(transaction) !== JSON.stringify(transactions[index]));
      if (hasChanges) {
        this.writeCollection(STORAGE_KEYS.transactions, normalized);
      }
      return normalized;
    }

    saveTransactions(transactions) {
      const normalized = Array.isArray(transactions) ? transactions.map(normalizeTransactionRecord).filter(Boolean) : [];
      this.writeCollection(STORAGE_KEYS.transactions, normalized);
      return normalized;
    }

    getTransaction(transactionId) {
      return this.listTransactions().find((transaction) => transaction.id === transactionId) || null;
    }

    upsertTransaction(nextTransaction) {
      const normalized = normalizeTransactionRecord(nextTransaction);
      if (!normalized) return null;

      const transactions = this.listTransactions();
      const index = transactions.findIndex((transaction) => transaction.id === normalized.id);
      if (index >= 0) {
        transactions[index] = { ...transactions[index], ...normalized };
      } else {
        transactions.unshift(normalized);
      }
      this.saveTransactions(transactions);
      return normalized;
    }

    appendAuditLog(entry) {
      const logs = this.readCollection(STORAGE_KEYS.auditLogs, []);
      logs.unshift(createAuditEntry(entry));
      this.writeCollection(STORAGE_KEYS.auditLogs, logs);
      return logs[0];
    }

    clearDemoData() {
      this.storage.removeItem(STORAGE_KEYS.invoices);
      this.storage.removeItem(STORAGE_KEYS.transactions);
      this.storage.removeItem(STORAGE_KEYS.auditLogs);
    }
  }

  class BillingService {
    constructor(repository = new InvoiceRepository()) {
      this.repository = repository;
    }

    calculateParkingFee(session = {}) {
      if (Number.isFinite(Number(session.feeVnd))) {
        return Math.max(0, Math.round(Number(session.feeVnd)));
      }

      const entryTime = session.entryTime ? new Date(session.entryTime) : null;
      const exitTime = session.exitTime ? new Date(session.exitTime) : new Date();
      const durationMs = entryTime && !Number.isNaN(entryTime.getTime()) && !Number.isNaN(exitTime.getTime())
        ? Math.max(0, exitTime.getTime() - entryTime.getTime())
        : 0;
      const hours = Math.max(1, Math.ceil(durationMs / 3600000));
      const rateTable = {
        motorbike: 5000,
        motorcycle: 5000,
        car: 15000,
        suv: 18000,
        truck: 25000,
      };
      const rate = rateTable[String(session.vehicleType || 'car').toLowerCase()] || rateTable.car;
      return hours * rate;
    }

    createPeriodicInvoice(session, cycleLabel = '') {
      const amount = this.calculateParkingFee(session);
      return this.repository.upsertInvoice({
        id: session.invoiceId || `INV-${session.id || Date.now()}`,
        cardId: session.cardId || null,
        sessionId: session.id || null,
        cycleLabel: cycleLabel || `Chu kỳ ${new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}`,
        amount,
        status: InvoiceStatus.PENDING,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        paidAt: null,
        txId: null,
      });
    }

    canStartPayment(invoice) {
      if (!invoice) return false;
      return [InvoiceStatus.PENDING, InvoiceStatus.FAILED, InvoiceStatus.CANCELLED].includes(invoice.status);
    }
  }

  class PaymentService {
    constructor(repository = new InvoiceRepository(), environment = getPricingEnvironment()) {
      this.repository = repository;
      this.environment = environment;
    }

    generatePaymentId() {
      const cryptoApi = global.crypto;
      if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
        return `TXN-${cryptoApi.randomUUID()}`;
      }
      return `TXN-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    }

    async requestPayment(invoice, options = {}) {
      if (!invoice) {
        throw createError('Invoice not found', PaymentFailureCode.PAYMENT_NOT_FOUND);
      }

      if (invoice.status === InvoiceStatus.SUCCESS) {
        throw createError('Invoice has already been paid', PaymentFailureCode.INVOICE_ALREADY_PAID, { invoiceId: invoice.id });
      }

      if (invoice.status === InvoiceStatus.PROCESSING) {
        throw createError('Invoice is already processing', PaymentFailureCode.INVOICE_ALREADY_PROCESSING, { invoiceId: invoice.id });
      }

      const transactionId = this.generatePaymentId();
      const transaction = this.repository.upsertTransaction({
        id: transactionId,
        invoiceId: invoice.id,
        amount: invoice.amount,
        method: 'bkpay',
        status: TransactionStatus.PENDING,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        signature: options.signature || null,
        retryCount: 0,
      });

      const processingInvoice = this.repository.updateInvoiceStatus(invoice.id, InvoiceStatus.PROCESSING, {
        patch: { txId: transactionId, failureReason: null },
      });

      this.repository.appendAuditLog({
        severity: 'INFO',
        actor: 'IoT-SPMS',
        action: 'StartPaymentFlow',
        status: 'Success',
        details: `Khởi tạo thanh toán BKPay cho hóa đơn ${invoice.id} (tx=${transactionId}).`,
        meta: { invoiceId: invoice.id, transactionId },
      });

      const paymentGatewayResponse = await this.callBkPayGateway(transaction, processingInvoice, options);
      return {
        transaction,
        invoice: processingInvoice,
        paymentGatewayResponse,
      };
    }

    async callBkPayGateway(transaction, invoice, options = {}) {
      const simulateMode = String(options.simulateMode || this.environment.SIMULATION_MODE || 'demo').toLowerCase();
      const requestUrl = this.environment.BKPAY_API_BASE_URL ? `${this.environment.BKPAY_API_BASE_URL.replace(/\/$/, '')}/payments` : '';
      const requestTimeoutMs = Number(this.environment.PAYMENT_TIMEOUT_MS) || 8000;

      if (!requestUrl || simulateMode === 'demo') {
        return {
          mode: 'demo',
          redirectUrl: `bkpay.html?tx=${encodeURIComponent(transaction.id)}&return_to=${encodeURIComponent('payment.html')}`,
        };
      }

      if (simulateMode === 'timeout') {
        throw createError('BKPay request timed out', PaymentFailureCode.TIMEOUT, { provider: 'BKPay', invoiceId: invoice.id, transactionId: transaction.id });
      }

      if (simulateMode === 'connection_loss') {
        throw createError('Connection lost while contacting BKPay', PaymentFailureCode.CONNECTION_LOSS, { provider: 'BKPay', invoiceId: invoice.id, transactionId: transaction.id });
      }

      const response = await this.fetchWithTimeout(requestUrl, {
        method: 'POST',
        headers: this.buildHeaders(this.environment.BKPAY_API_KEY),
        body: JSON.stringify({
          transactionId: transaction.id,
          invoiceId: invoice.id,
          amount: invoice.amount,
        }),
      }, requestTimeoutMs, 'BKPay');

      return response;
    }

    async callDatacoreGateway(payload, options = {}) {
      const simulateMode = String(options.simulateMode || this.environment.SIMULATION_MODE || 'demo').toLowerCase();
      const requestUrl = this.environment.DATACORE_API_BASE_URL ? `${this.environment.DATACORE_API_BASE_URL.replace(/\/$/, '')}/invoices/sync` : '';
      const requestTimeoutMs = Number(this.environment.DATACORE_TIMEOUT_MS) || 8000;

      if (!requestUrl || simulateMode === 'demo') {
        return { mode: 'demo', synced: true, payload };
      }

      if (simulateMode === 'timeout') {
        throw createError('DATACORE request timed out', PaymentFailureCode.TIMEOUT, { provider: 'DATACORE' });
      }

      if (simulateMode === 'connection_loss') {
        throw createError('Connection lost while contacting DATACORE', PaymentFailureCode.CONNECTION_LOSS, { provider: 'DATACORE' });
      }

      return await this.fetchWithTimeout(requestUrl, {
        method: 'POST',
        headers: this.buildHeaders(this.environment.DATACORE_API_KEY),
        body: JSON.stringify(payload),
      }, requestTimeoutMs, 'DATACORE');
    }

    buildHeaders(apiKey) {
      return {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      };
    }

    async fetchWithTimeout(url, options, timeoutMs, providerName) {
      const controller = new AbortController();
      const timer = global.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.ok) {
          throw createError(`${providerName} returned HTTP ${response.status}`, PaymentFailureCode.PAYMENT_FAILED, {
            provider: providerName,
            httpStatus: response.status,
          });
        }
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await response.json();
        }
        return await response.text();
      } catch (error) {
        if (error && error.name === 'AbortError') {
          throw createError(`${providerName} timeout`, PaymentFailureCode.TIMEOUT, { provider: providerName });
        }
        if (error && error.code) throw error;
        throw createError(`${providerName} connection lost`, PaymentFailureCode.CONNECTION_LOSS, { provider: providerName, cause: String(error?.message || error) });
      } finally {
        global.clearTimeout(timer);
      }
    }

    mapCallbackResult(result, reason) {
      const normalized = String(result || '').trim().toLowerCase();

      if (normalized === 'success') {
        return { invoiceStatus: InvoiceStatus.SUCCESS, transactionStatus: TransactionStatus.SUCCESS };
      }

      if (normalized === 'cancelled' || normalized === 'canceled') {
        return { invoiceStatus: InvoiceStatus.CANCELLED, transactionStatus: TransactionStatus.CANCELLED };
      }

      if (normalized === 'failed') {
        if (reason === 'insufficient_balance') {
          return { invoiceStatus: InvoiceStatus.FAILED, transactionStatus: TransactionStatus.FAILED, failureCode: PaymentFailureCode.INSUFFICIENT_BALANCE };
        }
        if (reason === 'timeout') {
          return { invoiceStatus: InvoiceStatus.FAILED, transactionStatus: TransactionStatus.FAILED, failureCode: PaymentFailureCode.TIMEOUT };
        }
        if (reason === 'connection_loss') {
          return { invoiceStatus: InvoiceStatus.FAILED, transactionStatus: TransactionStatus.FAILED, failureCode: PaymentFailureCode.CONNECTION_LOSS };
        }
        return { invoiceStatus: InvoiceStatus.FAILED, transactionStatus: TransactionStatus.FAILED, failureCode: PaymentFailureCode.PAYMENT_FAILED };
      }

      if (normalized === 'insufficient_balance') {
        return { invoiceStatus: InvoiceStatus.FAILED, transactionStatus: TransactionStatus.FAILED, failureCode: PaymentFailureCode.INSUFFICIENT_BALANCE };
      }

      if (normalized === 'connection_loss') {
        return { invoiceStatus: InvoiceStatus.FAILED, transactionStatus: TransactionStatus.FAILED, failureCode: PaymentFailureCode.CONNECTION_LOSS };
      }

      if (normalized === 'timeout') {
        return { invoiceStatus: InvoiceStatus.FAILED, transactionStatus: TransactionStatus.FAILED, failureCode: PaymentFailureCode.TIMEOUT };
      }

      return {
        invoiceStatus: InvoiceStatus.FAILED,
        transactionStatus: TransactionStatus.FAILED,
        failureCode: reason === 'insufficient_balance' ? PaymentFailureCode.INSUFFICIENT_BALANCE : PaymentFailureCode.PAYMENT_FAILED,
      };
    }

    processPaymentCallback({ transactionId, result, providerRef = null, reason = null }) {
      if (!transactionId) {
        throw createError('Missing transactionId', PaymentFailureCode.PAYMENT_NOT_FOUND);
      }

      const transaction = this.repository.getTransaction(transactionId);
      if (!transaction) {
        throw createError(`Transaction ${transactionId} not found`, PaymentFailureCode.PAYMENT_NOT_FOUND, { transactionId });
      }

      const invoice = this.repository.getInvoiceById(transaction.invoiceId);
      if (!invoice) {
        throw createError(`Invoice ${transaction.invoiceId} not found`, PaymentFailureCode.PAYMENT_NOT_FOUND, { transactionId, invoiceId: transaction.invoiceId });
      }

      const terminalTransaction = [TransactionStatus.SUCCESS, TransactionStatus.FAILED, TransactionStatus.CANCELLED].includes(transaction.status);
      const terminalInvoice = [InvoiceStatus.SUCCESS, InvoiceStatus.FAILED, InvoiceStatus.CANCELLED].includes(invoice.status);

      if (terminalTransaction || terminalInvoice) {
        this.repository.appendAuditLog({
          severity: 'INFO',
          actor: 'BKPay',
          action: 'WebhookIgnored',
          status: 'Duplicate',
          details: `Bỏ qua webhook lặp cho hóa đơn ${invoice.id} (tx=${transactionId}).`,
          meta: { transactionId, invoiceId: invoice.id, result },
        });
        return {
          idempotent: true,
          invoice,
          transaction,
          message: 'Callback already processed',
        };
      }

      const outcome = this.mapCallbackResult(result, reason);
      const updatedTransaction = this.repository.upsertTransaction({
        ...transaction,
        status: outcome.transactionStatus,
        providerRef: providerRef || transaction.providerRef || null,
        failureCode: outcome.failureCode || null,
        failureReason: outcome.failureCode || null,
        updatedAt: nowIso(),
      });

      const patch = {
        txId: transactionId,
        failureReason: outcome.failureCode || null,
        paidAt: outcome.invoiceStatus === InvoiceStatus.SUCCESS ? nowIso() : invoice.paidAt || null,
      };

      const updatedInvoice = this.repository.updateInvoiceStatus(invoice.id, outcome.invoiceStatus, { patch });

      this.repository.appendAuditLog({
        severity: outcome.invoiceStatus === InvoiceStatus.SUCCESS ? 'INFO' : 'WARNING',
        actor: 'BKPay',
        action: 'PaymentCallbackProcessed',
        status: outcome.invoiceStatus,
        details: outcome.invoiceStatus === InvoiceStatus.SUCCESS
          ? `BKPay webhook xác nhận hóa đơn ${invoice.id} thành công (tx=${transactionId}).`
          : `BKPay webhook trả trạng thái ${outcome.invoiceStatus} cho hóa đơn ${invoice.id} (tx=${transactionId}).`,
        meta: {
          transactionId,
          invoiceId: invoice.id,
          providerRef,
          reason,
          failureCode: outcome.failureCode || null,
        },
      });

      return {
        idempotent: false,
        invoice: updatedInvoice,
        transaction: updatedTransaction,
        outcome,
      };
    }

    async syncWithDatacore(invoice, transaction, options = {}) {
      const payload = {
        invoiceId: invoice.id,
        transactionId: transaction.id,
        invoiceStatus: invoice.status,
        amount: invoice.amount,
        syncedAt: nowIso(),
      };
      return await this.callDatacoreGateway(payload, options);
    }
  }

  const PricingServices = Object.freeze({
    STORAGE_KEYS,
    InvoiceStatus,
    TransactionStatus,
    PaymentFailureCode,
    InvoiceRepository,
    BillingService,
    PaymentService,
    formatMoneyVnd,
    formatDateTime,
    nowIso,
    getPricingEnvironment,
    normalizeInvoiceRecord,
    normalizeTransactionRecord,
  });

  global.SPMSPricing = PricingServices;
})(window);
