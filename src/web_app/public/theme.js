(function () {
    const THEME_KEY = 'spms_theme_mode';
    const MODES = ['system', 'light', 'dark'];

    function isValidMode(mode) {
        return MODES.includes(mode);
    }

    function getStoredMode() {
        const raw = localStorage.getItem(THEME_KEY);
        return isValidMode(raw) ? raw : 'system';
    }

    function getResolvedMode(mode) {
        if (mode === 'light' || mode === 'dark') return mode;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function updateToggleButton(mode, resolved) {
        const btn = document.getElementById('spms-theme-toggle');
        if (!btn) return;

        const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
        const iconMap = {
            light: 'light_mode',
            dark: 'dark_mode',
            system: 'desktop_windows'
        };

        const icon = btn.querySelector('[data-theme-icon]');
        const label = btn.querySelector('[data-theme-label]');

        if (icon) icon.textContent = iconMap[mode] || iconMap.system;
        if (label) label.textContent = `Theme: ${modeLabel}`;

        btn.setAttribute('data-mode', mode);
        btn.setAttribute('title', `Theme: ${modeLabel} (current ${resolved})`);
        btn.setAttribute('aria-label', `Theme: ${modeLabel}`);
    }

    function applyTheme(mode) {
        const safeMode = isValidMode(mode) ? mode : 'system';
        const resolved = getResolvedMode(safeMode);
        const root = document.documentElement;

        root.classList.remove('theme-light', 'theme-dark');
        root.classList.add(resolved === 'dark' ? 'theme-dark' : 'theme-light');
        root.classList.toggle('dark', resolved === 'dark');
        root.dataset.themeMode = safeMode;
        root.dataset.themeResolved = resolved;

        updateToggleButton(safeMode, resolved);
    }

    function setMode(mode) {
        const safeMode = isValidMode(mode) ? mode : 'system';
        localStorage.setItem(THEME_KEY, safeMode);
        applyTheme(safeMode);
    }

    function getNextMode(current) {
        const idx = MODES.indexOf(current);
        return MODES[(idx + 1) % MODES.length];
    }

    function injectToggleButton() {
        if (document.getElementById('spms-theme-toggle')) return;

        const btn = document.createElement('button');
        btn.id = 'spms-theme-toggle';
        btn.type = 'button';
        btn.className = 'spms-theme-toggle';
        btn.innerHTML = `
            <span class="material-symbols-outlined" data-theme-icon aria-hidden="true">desktop_windows</span>
            <span data-theme-label>Theme: System</span>
        `;

        btn.addEventListener('click', () => {
            const currentMode = document.documentElement.dataset.themeMode || 'system';
            setMode(getNextMode(currentMode));
        });

        document.body.appendChild(btn);
        applyTheme(getStoredMode());
    }

    // Apply early to reduce visual jump.
    applyTheme(getStoredMode());

    document.addEventListener('DOMContentLoaded', () => {
        injectToggleButton();
    });

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChanged = () => {
        const current = getStoredMode();
        if (current === 'system') applyTheme('system');
    };

    if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onSystemThemeChanged);
    } else if (typeof media.addListener === 'function') {
        media.addListener(onSystemThemeChanged);
    }

    window.SPMSTheme = {
        setMode,
        getMode: getStoredMode,
        applyTheme
    };
})();
