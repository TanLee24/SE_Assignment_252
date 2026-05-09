const {
  InvoiceRepository,
  PaymentService,
  formatMoneyVnd,
  formatDateTime,
} = window.SPMSPricing;

const repository = new InvoiceRepository();
const paymentService = new PaymentService(repository);

const STORAGE = window.SPMSPricing.STORAGE_KEYS;

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

function nowIso() {
  return new Date().toISOString();
}

function addAudit(entry) {
  const logs = parseJson(STORAGE.auditLogs, []);
  logs.unshift({ ts: nowIso(), ...entry });
  writeJson(STORAGE.auditLogs, logs);
}

function resolveReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('return_to') || 'payment.html';
  if (returnTo.includes('://') || returnTo.startsWith('//')) return 'payment.html';
  return returnTo;
}

function redirectResult(transactionId, result, reason = '') {
  const returnTo = resolveReturnUrl();
  const base = returnTo.includes('?') ? `${returnTo}&` : `${returnTo}?`;
  const url = `${base}tx=${encodeURIComponent(transactionId)}&result=${encodeURIComponent(result)}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`;
  window.location.href = url;
}

function getTransaction(transactionId) {
  return repository.getTransaction(transactionId);
}

function seedDemoIfNeeded(transaction) {
  if (!transaction) return;
  addAudit({
    severity: 'INFO',
    actor: 'BKPay',
    action: 'UserRedirectedToBKPay',
    status: 'Success',
    details: `Người dùng được chuyển hướng sang BKPay cho giao dịch ${transaction.id}.`,
    meta: { transactionId: transaction.id, invoiceId: transaction.invoiceId },
  });
}

function renderTransaction(transaction) {
  if (!transaction) {
    document.getElementById('errorBox').classList.remove('hidden');
    document.getElementById('successBtn').disabled = true;
    document.getElementById('failBtn').disabled = true;
    document.getElementById('cancelBtn').disabled = true;
    document.getElementById('insufficientBtn').disabled = true;
    document.getElementById('timeoutBtn').disabled = true;
    document.getElementById('connectionBtn').disabled = true;
    return;
  }

  document.getElementById('txMeta').textContent = `tx=${transaction.id} • invoice=${transaction.invoiceId} • status=${transaction.status}`;
  document.getElementById('txAmount').textContent = formatMoneyVnd(transaction.amount);

  const demoPayUrl = `https://pay.bkpay.local/checkout?tx=${encodeURIComponent(transaction.id)}`;
  document.getElementById('demoPayBox').classList.remove('hidden');
  document.getElementById('payLink').href = demoPayUrl;
  document.getElementById('payUrlText').textContent = demoPayUrl;
  document.getElementById('qrImg').src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(demoPayUrl)}`;
}

function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  const transactionId = params.get('tx');
  const transaction = transactionId ? getTransaction(transactionId) : null;

  document.getElementById('backLink').href = resolveReturnUrl();
  renderTransaction(transaction);
  seedDemoIfNeeded(transaction);

  const bind = (id, handler) => {
    const element = document.getElementById(id);
    if (element) element.addEventListener('click', handler);
  };

  bind('successBtn', () => {
    if (!transaction) return;
    redirectResult(transaction.id, 'success');
  });

  bind('failBtn', () => {
    if (!transaction) return;
    redirectResult(transaction.id, 'failed', 'payment_failed');
  });

  bind('cancelBtn', () => {
    if (!transaction) return;
    redirectResult(transaction.id, 'cancelled');
  });

  bind('insufficientBtn', () => {
    if (!transaction) return;
    redirectResult(transaction.id, 'failed', 'insufficient_balance');
  });

  bind('timeoutBtn', () => {
    if (!transaction) return;
    redirectResult(transaction.id, 'failed', 'timeout');
  });

  bind('connectionBtn', () => {
    if (!transaction) return;
    redirectResult(transaction.id, 'failed', 'connection_loss');
  });
}

bootstrap();
