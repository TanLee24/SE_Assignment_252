const {
  InvoiceRepository,
  BillingService,
  PaymentService,
  InvoiceStatus,
  TransactionStatus,
  PaymentFailureCode,
  formatMoneyVnd,
  formatDateTime,
  nowIso,
} = window.SPMSPricing;

const STORAGE = window.SPMSPricing.STORAGE_KEYS;
const ACTOR = Object.freeze({
  user: 'user_portal_demo',
  system: 'IoT-SPMS',
  bkpay: 'BKPay',
  datacore: 'DATACORE',
});

const repository = new InvoiceRepository();
const billingService = new BillingService(repository);
const paymentService = new PaymentService(repository);

function getSimulationMode() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get('simulate') || 'demo').toLowerCase();
}

function getDatacoreSimulationMode() {
  const mode = getSimulationMode();
  if (mode === 'datacore-timeout') return 'timeout';
  if (mode === 'datacore-connection_loss') return 'connection_loss';
  return 'demo';
}

function getBkPaySimulationMode() {
  const mode = getSimulationMode();
  if (mode === 'bkpay-timeout') return 'timeout';
  if (mode === 'bkpay-connection_loss') return 'connection_loss';
  return 'demo';
}

function parseJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function clearBanner() {
  const el = document.getElementById('banner');
  if (!el) return;
  el.classList.add('hidden');
  el.innerHTML = '';
}

function setBanner({ variant, title, message }) {
  const el = document.getElementById('banner');
  if (!el) return;

  const style = {
    success: 'bg-tertiary/10 border-tertiary/30 text-on-surface',
    error: 'bg-error-container/30 border-error/30 text-on-surface',
    info: 'bg-surface-container-low border-outline-variant/20 text-on-surface',
  }[variant] || 'bg-surface-container-low border-outline-variant/20 text-on-surface';

  el.className = `mb-6 rounded-lg p-4 border ${style}`;
  el.innerHTML = `
    <div class="flex items-start gap-3">
      <span class="material-symbols-outlined ${variant === 'success' ? 'text-tertiary' : variant === 'error' ? 'text-error' : 'text-primary'}">info</span>
      <div>
        <p class="font-bold">${title}</p>
        <p class="text-sm text-on-surface-variant mt-1">${message}</p>
      </div>
    </div>
  `;
  el.classList.remove('hidden');
}

function seedDemoInvoice() {
  const invoices = repository.listInvoices();
  if (invoices.length > 0) return;

  const demoInvoice = {
    id: `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-0001`,
    cycleLabel: `Chu kỳ tháng ${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
    amount: 45000,
    status: InvoiceStatus.PENDING,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    paidAt: null,
    txId: null,
  };

  repository.saveInvoices([demoInvoice]);
  writeJson(STORAGE.transactions, []);
  repository.appendAuditLog({
    severity: 'INFO',
    actor: ACTOR.system,
    action: 'BillingRecordCreated',
    status: 'Success',
    details: `Tạo hóa đơn ${demoInvoice.id} (${demoInvoice.cycleLabel}) ở trạng thái ${demoInvoice.status}.`,
  });
}

function getCurrentInvoice() {
  return repository.getCurrentInvoice();
}

function renderInvoice(invoice) {
  if (!invoice) return;

  document.getElementById('invoiceTitle').textContent = invoice.cycleLabel;
  document.getElementById('invoiceMeta').textContent = 'Phí gửi xe định kỳ';
  document.getElementById('invoiceAmount').textContent = formatMoneyVnd(invoice.amount);
  document.getElementById('invoiceId').textContent = invoice.id;
  document.getElementById('invoiceUpdated').textContent = formatDateTime(invoice.updatedAt);

  const statusEl = document.getElementById('invoiceStatus');
  const statusMap = {
    [InvoiceStatus.PENDING]: { cls: 'bg-secondary-container/30 text-on-secondary-container', label: 'Chưa thanh toán' },
    [InvoiceStatus.PROCESSING]: { cls: 'bg-primary-container/30 text-on-primary-container', label: 'Đang xử lý' },
    [InvoiceStatus.SUCCESS]: { cls: 'bg-tertiary/15 text-tertiary', label: 'Đã thanh toán' },
    [InvoiceStatus.FAILED]: { cls: 'bg-error-container/30 text-error', label: 'Thanh toán thất bại' },
    [InvoiceStatus.CANCELLED]: { cls: 'bg-surface-container-high text-on-surface', label: 'Đã hủy' },
  };
  const cfg = statusMap[invoice.status] || statusMap[InvoiceStatus.PENDING];
  statusEl.className = `mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${cfg.cls}`;
  statusEl.textContent = cfg.label;

  const payBtn = document.getElementById('payBtn');
  payBtn.disabled = invoice.status === InvoiceStatus.SUCCESS || invoice.status === InvoiceStatus.PROCESSING;
  payBtn.textContent = invoice.status === InvoiceStatus.PROCESSING ? 'Đang xử lý thanh toán' : 'Thanh toán qua BKPay';
}

function renderTransactions() {
  const txs = repository.listTransactions();
  const tbody = document.getElementById('txTbody');
  const emptyEl = document.getElementById('txEmpty');
  tbody.innerHTML = '';

  if (!Array.isArray(txs) || txs.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  const sorted = [...txs].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  for (const tx of sorted.slice(0, 20)) {
    const statusBadge = {
      [TransactionStatus.SUCCESS]: 'bg-tertiary/15 text-tertiary',
      [TransactionStatus.PENDING]: 'bg-secondary-container/30 text-on-secondary-container',
      [TransactionStatus.FAILED]: 'bg-error-container/30 text-error',
      [TransactionStatus.CANCELLED]: 'bg-surface-container-high text-on-surface',
    }[tx.status] || 'bg-surface-container-high text-on-surface';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-3 text-sm text-on-surface-variant">${formatDateTime(tx.createdAt)}</td>
      <td class="px-4 py-3 text-sm font-mono text-on-surface">${tx.id || '—'}</td>
      <td class="px-4 py-3 text-sm text-on-surface">${formatMoneyVnd(tx.amount)}</td>
      <td class="px-4 py-3 text-sm">
        <span class="inline-flex px-2 py-1 rounded-full text-xs font-bold ${statusBadge}">${tx.status || '—'}</span>
      </td>
    `;
    tbody.appendChild(row);
  }
}

function getViewFromLocation() {
  const raw = (window.location.hash || '').replace('#', '').trim();
  if (raw === 'transactions') return 'transactions';
  if (raw === 'policy') return 'policy';
  return 'invoices';
}

function setActiveView(view) {
  const meta = {
    invoices: {
      title: 'Pricing • Hóa đơn',
      subtitle: 'Thanh toán hóa đơn chu kỳ qua BKPay. Hệ thống không lưu thông tin thẻ/tài khoản của bạn.',
    },
    transactions: {
      title: 'Pricing • Giao dịch',
      subtitle: 'Theo dõi lịch sử giao dịch BKPay (demo) và trạng thái xử lý.',
    },
    policy: {
      title: 'Pricing • Chính sách',
      subtitle: 'Tóm tắt chính sách giá/billing (demo) theo Task4.',
    },
  }[view] || {
    title: 'Pricing • Hóa đơn',
    subtitle: 'Thanh toán hóa đơn chu kỳ qua BKPay. Hệ thống không lưu thông tin thẻ/tài khoản của bạn.',
  };

  document.getElementById('pricingBrandSub').textContent = meta.title;
  document.getElementById('pricingTitle').textContent = 'Pricing';
  document.getElementById('pricingSubtitle').textContent = meta.subtitle;
  document.title = `IoT-SPMS | ${meta.title}`;

  document.getElementById('view-invoices').classList.toggle('hidden', view !== 'invoices');
  document.getElementById('view-transactions').classList.toggle('hidden', view !== 'transactions');
  document.getElementById('view-policy').classList.toggle('hidden', view !== 'policy');

  document.querySelectorAll('.pricing-tab').forEach((el) => {
    const isActive = el.getAttribute('data-view') === view;
    el.classList.toggle('bg-primary-container/30', isActive);
    el.classList.toggle('border-primary/40', isActive);
  });
}

function applyMaintenanceUi() {
  const params = new URLSearchParams(window.location.search);
  const maintenance = params.get('bkpay') === 'maintenance';
  if (!maintenance) return;
  if (params.get('tx') && params.get('result')) return;

  document.getElementById('payBtn').disabled = true;
  setBanner({
    variant: 'error',
    title: 'Cổng thanh toán đang bảo trì',
    message: 'Vui lòng thử lại sau.',
  });
}

async function startPayment() {
  const invoice = getCurrentInvoice();
  if (!invoice) return;

  clearBanner();

  if (!billingService.canStartPayment(invoice)) {
    setBanner({
      variant: 'error',
      title: 'Không thể thanh toán',
      message: invoice.status === InvoiceStatus.SUCCESS
        ? 'Hóa đơn đã hoàn tất và không thể thanh toán lại.'
        : 'Hóa đơn đang được xử lý. Vui lòng chờ BKPay phản hồi.',
    });
    return;
  }

  try {
    const result = await paymentService.requestPayment(invoice, {
      simulateMode: getBkPaySimulationMode(),
    });

    const { transaction, paymentGatewayResponse } = result;
    repository.appendAuditLog({
      severity: 'INFO',
      actor: ACTOR.user,
      action: 'SelectBKPayPayment',
      status: 'Success',
      details: `Người dùng chọn thanh toán BKPay cho hóa đơn ${invoice.id}.`,
      meta: { invoiceId: invoice.id, transactionId: transaction.id },
    });

    if (paymentGatewayResponse && paymentGatewayResponse.redirectUrl) {
      window.location.href = paymentGatewayResponse.redirectUrl;
      return;
    }

    window.location.href = `bkpay.html?tx=${encodeURIComponent(transaction.id)}&return_to=${encodeURIComponent('payment.html')}`;
  } catch (error) {
    const currentInvoice = repository.getCurrentInvoice();
    if (currentInvoice && currentInvoice.status === InvoiceStatus.PROCESSING) {
      const failureReason = error.code || PaymentFailureCode.PAYMENT_FAILED;
      repository.updateInvoiceStatus(currentInvoice.id, InvoiceStatus.FAILED, {
        patch: { failureReason },
      });

      if (currentInvoice.txId) {
        const currentTransaction = repository.getTransaction(currentInvoice.txId);
        if (currentTransaction) {
          repository.upsertTransaction({
            ...currentTransaction,
            status: TransactionStatus.FAILED,
            failureCode: failureReason,
            failureReason,
            updatedAt: nowIso(),
          });
        }
      }
    }

    const severity = error.code === PaymentFailureCode.TIMEOUT || error.code === PaymentFailureCode.CONNECTION_LOSS ? 'CRITICAL' : 'ERROR';
    repository.appendAuditLog({
      severity,
      actor: ACTOR.system,
      action: 'BKPayInitTransaction',
      status: 'Error',
      details: `Không khởi tạo được giao dịch BKPay cho hóa đơn ${invoice.id}: ${error.message}`,
      meta: { invoiceId: invoice.id, errorCode: error.code || 'UNKNOWN' },
    });

    if (error.code === PaymentFailureCode.TIMEOUT) {
      setBanner({
        variant: 'error',
        title: 'BKPay phản hồi quá chậm',
        message: 'Yêu cầu đã vượt quá thời gian chờ.',
      });
      return;
    }

    if (error.code === PaymentFailureCode.CONNECTION_LOSS) {
      setBanner({
        variant: 'error',
        title: 'Mất kết nối tới BKPay',
        message: 'Không thể mở phiên thanh toán do gián đoạn mạng.',
      });
      return;
    }

    setBanner({
      variant: 'error',
      title: 'Không thể khởi tạo thanh toán',
      message: error.message || 'Vui lòng thử lại sau.',
    });
  }
}

function handleReturnFromBkPay() {
  const params = new URLSearchParams(window.location.search);
  const transactionId = params.get('tx');
  const result = params.get('result');
  const reason = params.get('reason');
  if (!transactionId || !result) return;

  try {
    const callbackResult = paymentService.processPaymentCallback({
      transactionId,
      result,
      reason,
      providerRef: params.get('provider_ref'),
    });

    clearBanner();

    if (callbackResult.idempotent) {
      setBanner({
        variant: 'info',
        title: 'Webhook trùng lặp đã được bỏ qua',
        message: `Hóa đơn ${callbackResult.invoice.id} đã ở trạng thái cuối cùng.`,
      });
    } else if (callbackResult.outcome.invoiceStatus === InvoiceStatus.SUCCESS) {
      setBanner({
        variant: 'success',
        title: 'Thanh toán thành công',
        message: 'Hóa đơn đã được cập nhật trạng thái SUCCESS.',
      });

      syncDatacoreAfterSuccess(callbackResult.invoice, callbackResult.transaction);
    } else if (callbackResult.outcome.failureCode === PaymentFailureCode.INSUFFICIENT_BALANCE) {
      setBanner({
        variant: 'error',
        title: 'Số dư không đủ',
        message: 'BKPay trả về trạng thái không đủ số dư. Hóa đơn vẫn có thể được thanh toán lại.',
      });
    } else if (callbackResult.outcome.failureCode === PaymentFailureCode.TIMEOUT) {
      setBanner({
        variant: 'error',
        title: 'BKPay timeout',
        message: 'Hệ thống chưa nhận được phản hồi kịp thời từ cổng thanh toán.',
      });
    } else if (callbackResult.outcome.failureCode === PaymentFailureCode.CONNECTION_LOSS) {
      setBanner({
        variant: 'error',
        title: 'Mất kết nối trong lúc xử lý',
        message: 'Phiên thanh toán đã dừng do gián đoạn kết nối.',
      });
    } else if (callbackResult.outcome.invoiceStatus === InvoiceStatus.CANCELLED) {
      setBanner({
        variant: 'error',
        title: 'Đã hủy giao dịch',
        message: 'Hóa đơn chưa được ghi nhận là đã thanh toán.',
      });
    } else {
      setBanner({
        variant: 'error',
        title: 'Thanh toán thất bại',
        message: 'Hóa đơn vẫn ở trạng thái chờ xử lý.',
      });
    }

    renderInvoice(callbackResult.invoice);
    renderTransactions();
  } catch (error) {
    setBanner({
      variant: 'error',
      title: 'Không thể xử lý webhook',
      message: error.message || 'Webhook BKPay không hợp lệ.',
    });
    repository.appendAuditLog({
      severity: 'ERROR',
      actor: ACTOR.system,
      action: 'WebhookProcessingFailed',
      status: 'Failed',
      details: `Không thể xử lý callback BKPay cho tx=${transactionId}: ${error.message}`,
      meta: { transactionId, result, reason, errorCode: error.code || 'UNKNOWN' },
    });
  }

  params.delete('tx');
  params.delete('result');
  params.delete('reason');
  params.delete('provider_ref');
  const next = window.location.pathname + (params.toString() ? `?${params}` : '');
  window.history.replaceState({}, '', next);
}

async function syncDatacoreAfterSuccess(invoice, transaction) {
  try {
    await paymentService.syncWithDatacore(invoice, transaction, {
      simulateMode: getDatacoreSimulationMode(),
    });
    repository.appendAuditLog({
      severity: 'INFO',
      actor: ACTOR.datacore,
      action: 'InvoiceSync',
      status: 'Success',
      details: `Đồng bộ hóa đơn ${invoice.id} sang DATACORE thành công.`,
      meta: { invoiceId: invoice.id, transactionId: transaction.id },
    });
  } catch (error) {
    repository.appendAuditLog({
      severity: 'ERROR',
      actor: ACTOR.datacore,
      action: 'InvoiceSync',
      status: 'Failed',
      details: `Không đồng bộ được hóa đơn ${invoice.id} sang DATACORE: ${error.message}`,
      meta: { invoiceId: invoice.id, transactionId: transaction.id, errorCode: error.code || 'UNKNOWN' },
    });
  }
}

function resetDemo() {
  repository.clearDemoData();
  seedDemoInvoice();
  clearBanner();
  renderInvoice(getCurrentInvoice());
  setBanner({
    variant: 'info',
    title: 'Đã reset dữ liệu demo',
    message: 'Hệ thống đã tạo lại 1 hóa đơn mẫu ở trạng thái PENDING.',
  });
}

function bindEvents() {
  document.getElementById('payBtn').addEventListener('click', startPayment);
  document.getElementById('refreshBtn').addEventListener('click', () => {
    clearBanner();
    seedDemoInvoice();
    renderInvoice(getCurrentInvoice());
  });
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetDemo);
  }
  document.getElementById('txRefreshBtn').addEventListener('click', renderTransactions);
  window.addEventListener('hashchange', () => setActiveView(getViewFromLocation()));
}

function bootstrap() {
  seedDemoInvoice();
  renderInvoice(getCurrentInvoice());
  renderTransactions();
  handleReturnFromBkPay();
  applyMaintenanceUi();
  setActiveView(getViewFromLocation());
  bindEvents();
}

bootstrap();
