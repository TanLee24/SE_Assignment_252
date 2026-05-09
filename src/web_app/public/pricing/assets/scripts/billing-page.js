const {
  InvoiceRepository,
  BillingService,
  InvoiceStatus,
  formatMoneyVnd,
  formatDateTime,
} = window.SPMSPricing;

const repository = new InvoiceRepository();
const billingService = new BillingService(repository);

const user = requireUser();
if (user) {
  injectNavbar('billing');
  loadCombinedBilling();
}

function seedUserInvoices() {
  const allInvoices = repository.listInvoices();
  const userInvoices = allInvoices.filter((invoice) => invoice.cardId === user.cardId);
  if (userInvoices.length > 0) return userInvoices;

  const seedInvoices = [
    { id: `INV-${user.id}-05`, cardId: user.cardId, cycleLabel: 'Tháng 05/2026', amount: 45000, status: InvoiceStatus.PENDING, createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-01T08:00:00Z' },
    { id: `INV-${user.id}-04`, cardId: user.cardId, cycleLabel: 'Tháng 04/2026', amount: 32000, status: InvoiceStatus.SUCCESS, createdAt: '2026-04-05T14:30:00Z', updatedAt: '2026-04-05T14:30:00Z', paidAt: '2026-04-05T14:30:00Z' },
    { id: `INV-${user.id}-03`, cardId: user.cardId, cycleLabel: 'Tháng 03/2026', amount: 55000, status: InvoiceStatus.FAILED, createdAt: '2026-03-02T09:15:00Z', updatedAt: '2026-03-02T09:15:00Z' },
    { id: `INV-${user.id}-02`, cardId: user.cardId, cycleLabel: 'Tháng 02/2026', amount: 28000, status: InvoiceStatus.SUCCESS, createdAt: '2026-02-03T10:45:00Z', updatedAt: '2026-02-03T10:45:00Z', paidAt: '2026-02-03T10:45:00Z' },
    { id: `INV-${user.id}-01`, cardId: user.cardId, cycleLabel: 'Tháng 01/2026', amount: 42000, status: InvoiceStatus.SUCCESS, createdAt: '2026-01-04T16:20:00Z', updatedAt: '2026-01-04T16:20:00Z', paidAt: '2026-01-04T16:20:00Z' },
    { id: `INV-${user.id}-12`, cardId: user.cardId, cycleLabel: 'Tháng 12/2025', amount: 38000, status: InvoiceStatus.PENDING, createdAt: '2025-12-05T11:10:00Z', updatedAt: '2025-12-05T11:10:00Z' },
    { id: `INV-${user.id}-11`, cardId: user.cardId, cycleLabel: 'Tháng 11/2025', amount: 47000, status: InvoiceStatus.SUCCESS, createdAt: '2025-11-02T13:55:00Z', updatedAt: '2025-11-02T13:55:00Z', paidAt: '2025-11-02T13:55:00Z' },
  ];

  repository.saveInvoices([...allInvoices, ...seedInvoices]);
  return seedInvoices;
}

async function loadCombinedBilling() {
  const userInvoices = seedUserInvoices();
  renderBillingTable(userInvoices);
}

function renderBillingTable(data) {
  const tableBody = document.getElementById('billingTableBody');
  const emptyMsg = document.getElementById('billingEmpty');

  if (!Array.isArray(data) || data.length === 0) {
    tableBody.innerHTML = '';
    emptyMsg.classList.remove('hidden');
    return;
  }

  tableBody.innerHTML = '';
  const sorted = [...data].sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));

  sorted.forEach((invoice) => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-white/5 transition-all';

    const statusConfig = {
      [InvoiceStatus.PENDING]: { label: 'Chưa thanh toán', cls: 'bg-error/20 text-error' },
      [InvoiceStatus.PROCESSING]: { label: 'Đang xử lý', cls: 'bg-primary-container/20 text-on-primary-container' },
      [InvoiceStatus.SUCCESS]: { label: 'Đã thanh toán', cls: 'bg-tertiary/20 text-tertiary' },
      [InvoiceStatus.FAILED]: { label: 'Thanh toán thất bại', cls: 'bg-error-container/20 text-error' },
      [InvoiceStatus.CANCELLED]: { label: 'Đã hủy', cls: 'bg-surface-container-high text-on-surface-variant' },
    }[invoice.status] || { label: invoice.status || '—', cls: 'bg-surface-container-high text-on-surface-variant' };

    const showPayAction = billingService.canStartPayment(invoice);
    const actionButton = invoice.status === InvoiceStatus.SUCCESS
      ? '<button class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 cursor-default">Không có thao tác</button>'
      : showPayAction
        ? `<button onclick="goToPayment('${invoice.id}')" class="px-4 py-2 rounded-lg bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">Thanh toán ngay</button>`
        : '<button class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 cursor-default">Đang xử lý</button>';

    row.innerHTML = `
      <td class="px-6 py-4 font-bold text-on-surface">${invoice.cycleLabel || invoice.cycle || '—'}</td>
      <td class="px-6 py-4 font-mono text-[10px] text-on-surface-variant">${invoice.id}</td>
      <td class="px-6 py-4 font-headline font-bold text-tertiary">${formatMoneyVnd(invoice.amount)}</td>
      <td class="px-6 py-4"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusConfig.cls}">${statusConfig.label}</span></td>
      <td class="px-6 py-4 text-xs text-on-surface-variant">${invoice.status === InvoiceStatus.SUCCESS ? formatDateTime(invoice.paidAt || invoice.updatedAt) : '—'}</td>
      <td class="px-6 py-4 text-right">${actionButton}</td>
    `;
    tableBody.appendChild(row);
  });

  emptyMsg.classList.add('hidden');
}

function goToPayment(invoiceId) {
  sessionStorage.setItem('spms_pending_invoice_id', invoiceId);
  window.location.href = '../pricing/payment.html';
}

window.goToPayment = goToPayment;
