/**
 * IoT-SPMS: Admin Dashboard Module
 * Handles UI interactions, manual overrides, and signage configuration.
 */

async function initAdmin() {
    const data = await GuidanceSystem.fetchStatus();
    if (!data) return;

    updateDashboard(data);
    setupEventListeners();
}

/**
 * Update Dashboard Stats and Tables
 */
function updateDashboard(data) {
    // 1. Update quick stats
    const totalVacancy = data.zones.reduce((sum, zone) => sum + zone.available, 0);
    const avgOccupancy = Math.round(data.zones.reduce((sum, zone) => sum + (1 - zone.available / zone.total), 0) / data.zones.length * 100);
    
    document.querySelectorAll('.glass .text-4xl')[0].innerText = "24"; // Total active signs (fixed for now)
    document.querySelectorAll('.glass .text-4xl')[2].innerText = `${avgOccupancy}%`; // Avg. Occupancy
    
    // 2. Update alerts count
    const alertsCount = data.alerts.length;
    const alertStat = document.querySelectorAll('.glass .text-4xl')[3];
    if (alertStat) alertStat.innerText = alertsCount.toString().padStart(2, '0');

    // 3. Update sign status list (Dynamic Table)
    const tableBody = document.querySelector('tbody');
    // For now, we update existing rows based on JSON.
}

/**
 * Setup Event Listeners for Buttons
 */
function setupEventListeners() {
    // Broadcast message button
    const broadcastBtn = document.querySelector('button:contains("Broadcast Message")') || 
                         Array.from(document.querySelectorAll('button')).find(el => el.textContent === 'Broadcast Message');
    
    if (broadcastBtn) {
        broadcastBtn.addEventListener('click', () => {
            const msg = document.querySelector('textarea').value;
            if (msg) {
                alert(`Broadcast Message Sent: ${msg}`);
                document.querySelector('textarea').value = '';
            }
        });
    }

    // Manual Strategy buttons
    document.querySelectorAll('input[name="strategy"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            console.log(`Routing Strategy changed to: ${e.target.closest('div').querySelector('.font-bold').innerText}`);
        });
    });
}

window.addEventListener('DOMContentLoaded', initAdmin);
