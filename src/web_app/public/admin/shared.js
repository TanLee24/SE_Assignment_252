/**
 * IoT-SPMS Admin Shared Module
 * Provides auth guard, data loading, navigation, and utility functions
 * for all admin pages.
 */

// ─── Data Paths ──────────────────────────────────────────────
const DATA_BASE = '../../data';
const USERS_DB_KEY = 'spms_users_db_v1';
const DATA_PATHS = {
    users: `${DATA_BASE}/users.json`,
    sessions: `${DATA_BASE}/sessions.json`,
    transactions: `${DATA_BASE}/transactions.json`,
    auditLog: `${DATA_BASE}/audit_log.json`,
    parkingStatus: `${DATA_BASE}/dynamic_guidance/parking_status.json`,
};

// ─── Auth Guard ──────────────────────────────────────────────
function getCurrentUser() {
    const raw = sessionStorage.getItem('spms_current_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function requireAdmin() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '../login.html';
        return null;
    }
    // Only 'admin' allowed here. 'guard' has its own dashboard now.
    if (user.role !== 'admin') {
        if (user.role === 'guard') {
            window.location.href = '../guard/dashboard.html';
        } else {
            window.location.href = '../user/dashboard.html';
        }
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

function safeParseJSON(raw, fallback) {
    try { return JSON.parse(raw); } catch { return fallback; }
}

async function loadUsers() {
    const cached = safeParseJSON(localStorage.getItem(USERS_DB_KEY) || '[]', []);
    if (Array.isArray(cached) && cached.length > 0) {
        return cached;
    }

    const users = await loadJSON(DATA_PATHS.users);
    const normalized = Array.isArray(users) ? users : [];
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(normalized));
    return normalized;
}

async function saveUsers(users) {
    if (!Array.isArray(users)) return false;
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    return true;
}
async function loadSessions() {
    const d = await loadJSON(DATA_PATHS.sessions);
    return d ? d.sessions : [];
}
async function loadTransactions() {
    const d = await loadJSON(DATA_PATHS.transactions);
    return d ? d.transactions : [];
}
async function loadAuditLog() {
    const d = await loadJSON(DATA_PATHS.auditLog);
    return d ? d.logs : [];
}
async function loadParkingStatus() { return await loadJSON(DATA_PATHS.parkingStatus); }

// ─── Formatters ──────────────────────────────────────────────
function formatVND(amount) {
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
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function timeAgo(isoStr) {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    return `${Math.floor(hrs / 24)} ngày trước`;
}

// ─── Severity / Level Badges ─────────────────────────────────
function getLevelBadge(level) {
    const map = {
        info:    { cls: 'bg-[#244592] text-[#9eb6ff]', text: 'INFO' },
        success: { cls: 'bg-[#008188]/20 text-[#00dbe7]', text: 'SUCCESS' },
        warning: { cls: 'bg-amber-500/20 text-amber-300', text: 'WARNING' },
        error:   { cls: 'bg-[#d7383b]/20 text-[#ffb4ab]', text: 'ERROR' },
    };
    const cfg = map[level] || map.info;
    return `<span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${cfg.cls}">${cfg.text}</span>`;
}

function getLevelIcon(level) {
    const map = {
        info:    { icon: 'info', cls: 'text-[#b3c5ff]' },
        success: { icon: 'check_circle', cls: 'text-[#00dbe7]' },
        warning: { icon: 'warning', cls: 'text-amber-400' },
        error:   { icon: 'error', cls: 'text-[#ffb4ab]' },
    };
    const cfg = map[level] || map.info;
    return `<span class="material-symbols-outlined ${cfg.cls} text-lg">${cfg.icon}</span>`;
}

// ─── Role Helpers ────────────────────────────────────────────
function getRoleBadge(role) {
    const map = {
        admin:       { cls: 'bg-[#008188]/20 text-[#00dbe7]', text: 'Admin' },
        guard:       { cls: 'bg-[#244592] text-[#9eb6ff]', text: 'Bảo vệ' },
        staff:       { cls: 'bg-[#2f6cf0]/20 text-[#b3c5ff]', text: 'Cán bộ' },
        student:     { cls: 'bg-[#31353d] text-[#c3c6d7]', text: 'Sinh viên' },
    };
    const cfg = map[role] || { cls: 'bg-[#31353d] text-[#c3c6d7]', text: role };
    return `<span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${cfg.cls}">${cfg.text}</span>`;
}

function getRoleLabel(role) {
    const map = {
        admin: 'Admin',
        guard: 'Bảo vệ',
        staff: 'Cán bộ / Nhân viên',
        student: 'Sinh viên',
    };
    return map[role] || role;
}

// ─── Navigation Builder ──────────────────────────────────────
/**
 * Injects a consistent top navigation bar into the page.
 * Includes responsive hamburger menu for mobile/tablet.
 * @param {string} activePage - The key of the current page for highlighting
 */
function renderAdminNav(activePage) {
    const user = getCurrentUser();
    const displayName = user ? user.fullName : 'Admin';

    const navLinks = [
        { key: 'dashboard',        label: 'Dashboard',         icon: 'dashboard',           href: 'admin_dashboard.html' },
        { key: 'users',            label: 'Users',             icon: 'person_search',       href: 'users.html' },
        { key: 'access_control',   label: 'Access Control',    icon: 'shield_locked',       href: 'access_control.html' },
        { key: 'iot_monitoring',   label: 'IoT Monitoring',    icon: 'sensors',             href: 'iot_monitoring.html' },
        { key: 'dynamic_guidance', label: 'LED Control',       icon: 'signpost',            href: 'dynamic_guidance.html' },
        { key: 'sync',             label: 'Data Sync',         icon: 'sync',                href: 'sync.html' },
        { key: 'analytics',        label: 'Analytics',         icon: 'leaderboard',         href: 'analytics.html' },
        { key: 'logs',             label: 'Audit Logs',        icon: 'history',             href: 'logs.html' },
        { key: 'pricing_config',   label: 'Pricing',           icon: 'price_change',        href: 'pricing_config.html' },
    ];

    // Desktop nav links
    const linksHtml = navLinks.map(l => {
        const isActive = l.key === activePage;
        const cls = isActive
            ? `font-headline font-bold tracking-tight text-primary border-b-2 border-primary-container h-full flex items-center px-2 text-xs xl:text-sm`
            : `font-headline font-bold tracking-tight text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary transition-all duration-300 px-2 xl:px-3 py-2 rounded-lg text-xs xl:text-sm whitespace-nowrap`;
        return `<a class="${cls}" href="${l.href}">${l.label}</a>`;
    }).join('\n');

    // Mobile drawer links
    const mobileLinksHtml = navLinks.map(l => {
        const isActive = l.key === activePage;
        const activeCls = isActive
            ? 'bg-primary/15 text-primary border-l-2 border-primary-container'
            : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-primary';
        return `<a class="flex items-center gap-4 px-6 py-3.5 ${activeCls} transition-all" href="${l.href}" onclick="closeMobileNav()">
            <span class="material-symbols-outlined text-lg">${l.icon}</span>
            <span class="font-body font-semibold text-sm">${l.label}</span>
        </a>`;
    }).join('\n');

    const headerEl = document.getElementById('admin-nav');
    if (!headerEl) return;

    headerEl.innerHTML = `
    <div class="flex justify-between items-center h-16 lg:h-20 px-4 lg:px-8 w-full max-w-[1920px] mx-auto">
        <!-- Hamburger (mobile/tablet) -->
        <button class="lg:hidden p-2 text-on-surface-variant hover:text-primary active:scale-90 transition-all" onclick="toggleMobileNav()" id="hamburgerBtn" aria-label="Menu">
            <span class="material-symbols-outlined text-2xl">menu</span>
        </button>

        <!-- Brand -->
        <a href="admin_dashboard.html" class="flex items-center gap-2">
            <span class="text-lg lg:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary-container font-headline">HCMUT Smart Parking</span>
        </a>

        <!-- Desktop Nav -->
        <nav class="hidden lg:flex gap-1 xl:gap-2 items-center h-full">
            ${linksHtml}
        </nav>

        <!-- Right Actions -->
        <div class="flex items-center gap-2 lg:gap-4">
            <button class="hidden sm:block p-2 text-on-surface-variant hover:text-primary active:scale-95 transition-transform" title="Notifications">
                <span class="material-symbols-outlined">notifications</span>
            </button>
            <button class="hidden sm:block p-2 text-on-surface-variant hover:text-primary active:scale-95 transition-transform" title="Settings">
                <span class="material-symbols-outlined">settings</span>
            </button>
            <div class="relative group">
                <div class="flex items-center gap-2 bg-surface-container-high px-2 lg:px-3 py-1.5 rounded-full cursor-pointer hover:bg-surface-variant transition-colors" title="Tài khoản">
                    <div class="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-xs font-bold text-white">
                        ${displayName.charAt(0).toUpperCase()}
                    </div>
                    <span class="hidden sm:inline font-label text-[10px] lg:text-xs font-bold text-primary uppercase tracking-widest">${user ? getRoleLabel(user.role) : 'Admin'}</span>
                </div>
                <!-- Dropdown menu -->
                <div class="absolute right-0 mt-2 w-48 bg-surface-container-highest border border-outline-variant/15 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] transform origin-top-right scale-95 group-hover:scale-100">
                    <div class="p-3 border-b border-outline-variant/10">
                        <p class="text-sm font-bold text-on-surface truncate">${displayName}</p>
                        <p class="text-[10px] text-on-surface-variant uppercase tracking-widest truncate">${user ? user.email : 'admin@hcmut.edu.vn'}</p>
                    </div>
                    <div class="p-2">
                        <button onclick="logout()" class="w-full text-left px-3 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">logout</span>
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // Mobile Drawer Overlay & Drawer (appended to body to avoid z-index/height issues with fixed parent)
    let drawerContainer = document.getElementById('mobileNavContainer');
    if (!drawerContainer) {
        drawerContainer = document.createElement('div');
        drawerContainer.id = 'mobileNavContainer';
        document.body.appendChild(drawerContainer);
    }

    drawerContainer.innerHTML = `
    <!-- Mobile Drawer Overlay -->
    <div id="mobileNavOverlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] hidden opacity-0 transition-opacity duration-300" onclick="closeMobileNav()"></div>

    <!-- Mobile Drawer -->
    <nav id="mobileNavDrawer" class="fixed top-0 left-0 h-[100dvh] w-72 bg-[#0a0e15] z-[210] transform -translate-x-full transition-transform duration-300 flex flex-col shadow-2xl">
        <div class="flex items-center justify-between p-5 border-b border-outline-variant/15">
            <span class="text-lg font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary-container font-headline">IoT-SPMS</span>
            <button class="p-1 text-on-surface-variant hover:text-primary active:scale-90 transition-all" onclick="closeMobileNav()">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="flex-1 overflow-y-auto py-2 space-y-1">
            ${mobileLinksHtml}
        </div>
        <div class="p-4 border-t border-outline-variant/15">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-primary-container shrink-0 flex items-center justify-center text-sm font-bold text-white">${displayName.charAt(0).toUpperCase()}</div>
                <div class="truncate">
                    <p class="text-sm font-bold text-on-surface truncate">${displayName}</p>
                    <p class="text-[10px] text-primary uppercase tracking-widest font-bold truncate">${user ? getRoleLabel(user.role) : 'Admin'}</p>
                </div>
            </div>
            <button onclick="logout()" class="w-full py-2.5 rounded-lg bg-error/10 border border-error/20 text-error text-sm font-bold flex items-center justify-center gap-2 hover:bg-error/20 transition-all">
                <span class="material-symbols-outlined text-sm">logout</span>
                Đăng xuất
            </button>
        </div>
    </nav>`;
}

// ─── Mobile Nav Toggle ───────────────────────────────────────
function toggleMobileNav() {
    const overlay = document.getElementById('mobileNavOverlay');
    const drawer = document.getElementById('mobileNavDrawer');
    if (!overlay || !drawer) return;
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
        drawer.classList.remove('-translate-x-full');
        drawer.classList.add('translate-x-0');
    });
}

function closeMobileNav() {
    const overlay = document.getElementById('mobileNavOverlay');
    const drawer = document.getElementById('mobileNavDrawer');
    if (!overlay || !drawer) return;
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');
    drawer.classList.remove('translate-x-0');
    drawer.classList.add('-translate-x-full');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

// ─── Footer Builder ──────────────────────────────────────────
function renderAdminFooter() {
    const footerEl = document.getElementById('admin-footer');
    if (!footerEl) return;
    footerEl.innerHTML = `
    <div class="flex flex-col md:flex-row justify-between items-center px-12 gap-4">
        <div class="font-['Manrope'] text-[10px] uppercase tracking-[0.05em] text-[#dfe2ed]/40">
            © 2026 HCMUT IoT Labs · Kinetic Grid Systems
        </div>
        <div class="flex gap-8">
            <span class="font-['Manrope'] text-[10px] uppercase tracking-[0.05em] text-[#dfe2ed]/40">Trạng thái hệ thống: Hoạt động</span>
        </div>
    </div>`;
}

// ─── Toast Notification ──────────────────────────────────────
function showToast(message, type = 'success') {
    let toast = document.getElementById('spms-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'spms-toast';
        toast.className = 'fixed bottom-8 right-8 z-[110] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl transition-all duration-500 translate-y-20 opacity-0';
        document.body.appendChild(toast);
    }

    const colors = {
        success: { bg: 'bg-[#262a32]/90 border border-[#00dbe7]/20', icon: 'check_circle', iconCls: 'text-[#00dbe7]' },
        error:   { bg: 'bg-[#262a32]/90 border border-[#ffb4ab]/20', icon: 'error', iconCls: 'text-[#ffb4ab]' },
        info:    { bg: 'bg-[#262a32]/90 border border-[#b3c5ff]/20', icon: 'info', iconCls: 'text-[#b3c5ff]' },
    };
    const c = colors[type] || colors.info;

    toast.className = `fixed bottom-8 right-8 z-[110] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl transition-all duration-500 ${c.bg}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined ${c.iconCls}">${c.icon}</span>
        <span class="text-sm font-medium text-[#dfe2ed]">${message}</span>`;

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-20', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3500);
}
