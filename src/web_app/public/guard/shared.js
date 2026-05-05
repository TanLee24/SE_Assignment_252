/**
 * IoT-SPMS Guard Shared Module
 * Provides auth guard, data loading, and utility functions
 * for all guard/operator portal pages.
 */

const DATA_BASE = '../../data';
const DATA_PATHS = {
    users: `${DATA_BASE}/users.json`,
    sessions: `${DATA_BASE}/sessions.json`,
    parkingStatus: `${DATA_BASE}/dynamic_guidance/parking_status.json`,
};

function getCurrentUser() {
    const raw = sessionStorage.getItem('spms_current_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function requireGuard() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '../login.html';
        return null;
    }
    // Only 'guard' and 'admin' allowed in operator views
    if (user.role !== 'guard' && user.role !== 'admin') {
        window.location.href = '../user/dashboard.html';
        return null;
    }
    return user;
}

function logout() {
    sessionStorage.removeItem('spms_current_user');
    window.location.href = '../login.html';
}

async function loadJSON(path) {
    try {
        const res = await fetch(path);
        return await res.json();
    } catch (e) {
        console.error(`Failed to load ${path}:`, e);
        return null;
    }
}

async function loadSessions() {
    const d = await loadJSON(DATA_PATHS.sessions);
    return d ? d.sessions : [];
}

async function loadParkingStatus() {
    return await loadJSON(DATA_PATHS.parkingStatus);
}

function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatTime(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function injectNavbar(activeId = '') {
    const user = getCurrentUser();
    const nav = document.getElementById('guard-nav');
    if (!nav) return;

    nav.innerHTML = `
        <div class="h-20 px-6 sm:px-10 flex items-center justify-between max-w-[1920px] mx-auto">
            <div class="flex items-center gap-8">
                <a href="../index.html" class="font-headline font-bold text-2xl tracking-tight bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
                    IoT-SPMS <span class="text-[10px] text-on-surface-variant ml-2 px-2 py-0.5 rounded-md bg-surface-container-high font-black uppercase tracking-widest">Operator</span>
                </a>
                <nav class="hidden lg:flex items-center gap-1">
                    <a href="dashboard.html" class="px-4 py-2 rounded-full text-sm font-bold transition-all ${activeId === 'dashboard' ? 'bg-primary-container text-on-primary-container shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}">Giám sát</a>
                    <a href="status.html" class="px-4 py-2 rounded-full text-sm font-bold transition-all ${activeId === 'status' ? 'bg-primary-container text-on-primary-container shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}">Trạng thái bãi đỗ</a>
                    <a href="signage.html" class="px-4 py-2 rounded-full text-sm font-bold transition-all ${activeId === 'signage' ? 'bg-primary-container text-on-primary-container shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}">Điều khiển các bảng chỉ dẫn</a>
                </nav>
            </div>

            <div class="flex items-center gap-6">
                <div class="hidden sm:flex flex-col items-right text-right">
                    <span class="text-sm font-bold text-on-surface">${user?.fullName || 'Bảo vệ'}</span>
                    <span class="text-[10px] text-on-surface-variant uppercase tracking-widest font-black">Gate Operator</span>
                </div>
                <button onclick="logout()" class="h-10 w-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-all border border-outline-variant/30">
                    <span class="material-symbols-outlined">logout</span>
                </button>
            </div>
        </div>
    `;
}
