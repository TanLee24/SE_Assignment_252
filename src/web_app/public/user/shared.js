/**
 * IoT-SPMS User Shared Module
 * Provides auth guard, data loading, and utility functions
 * for all user portal pages.
 */

// ─── Data Paths ──────────────────────────────────────────────
const DATA_BASE = '../../data';
const DATA_PATHS = {
    users: `${DATA_BASE}/users.json`,
    sessions: `${DATA_BASE}/sessions.json`,
    transactions: `${DATA_BASE}/transactions.json`,
    parkingStatus: `${DATA_BASE}/dynamic_guidance/parking_status.json`,
};

// ─── Auth Guard ──────────────────────────────────────────────
function getCurrentUser() {
    const raw = sessionStorage.getItem('spms_current_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function requireUser() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '../login.html';
        return null;
    }
    // Strict role check: only 'user' allowed here
    if (user.role === 'admin') {
        window.location.href = '../admin/admin_dashboard.html';
        return null;
    }
    if (user.role === 'guard') {
        window.location.href = '../guard/dashboard.html';
        return null;
    }
    return user;
}

function logout() {
    sessionStorage.removeItem('spms_current_user');
    window.location.href = '../login.html';
}

// ─── Data Loading (fetch JSON) ───────────────────────────────
async function loadJSON(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(`Failed to load ${path}:`, e);
        return null;
    }
}

async function loadUsers() { return await loadJSON(DATA_PATHS.users); }
async function loadSessions() {
    const d = await loadJSON(DATA_PATHS.sessions);
    return d ? d.sessions : [];
}
async function loadTransactions() {
    const d = await loadJSON(DATA_PATHS.transactions);
    return d ? d.transactions : [];
}
async function loadParkingStatus() { return await loadJSON(DATA_PATHS.parkingStatus); }

// ─── Formatters ──────────────────────────────────────────────
function formatVND(amount) {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDateTime(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTime(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Navigation ──────────────────────────────────────────────
function injectNavbar(activeId = '') {
    const user = getCurrentUser();
    const nav = document.getElementById('user-nav');
    if (!nav) return;

    nav.innerHTML = `
        <div class="h-20 px-6 sm:px-10 flex items-center justify-between max-w-[1920px] mx-auto">
            <div class="flex items-center gap-8">
                <a href="../index.html" class="font-headline font-bold text-2xl tracking-tight bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
                    IoT-SPMS
                </a>
                <nav class="hidden lg:flex items-center gap-1">
                    <a href="dashboard.html" class="px-4 py-2 rounded-full text-sm font-bold transition-all ${activeId === 'dashboard' ? 'bg-primary-container text-on-primary-container shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}">Tổng quan</a>
                    <a href="status.html" class="px-4 py-2 rounded-full text-sm font-bold transition-all ${activeId === 'status' ? 'bg-primary-container text-on-primary-container shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}">Trạng thái bãi đỗ</a>
                    <a href="billing.html" class="px-4 py-2 rounded-full text-sm font-bold transition-all ${activeId === 'billing' ? 'bg-primary-container text-on-primary-container shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}">Thanh toán</a>
                </nav>
            </div>

            <div class="flex items-center gap-6">
                <div class="hidden sm:flex flex-col items-right text-right">
                    <span class="text-sm font-bold text-on-surface">${user?.fullName || 'Người dùng'}</span>
                    <span class="text-[10px] text-on-surface-variant uppercase tracking-widest font-black">${user?.role || 'User'}</span>
                </div>
                <div class="h-10 w-10 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center text-primary overflow-hidden">
                    <span class="material-symbols-outlined">account_circle</span>
                </div>
                <button onclick="logout()" class="h-10 w-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-all">
                    <span class="material-symbols-outlined">logout</span>
                </button>
            </div>
        </div>
    `;
}
