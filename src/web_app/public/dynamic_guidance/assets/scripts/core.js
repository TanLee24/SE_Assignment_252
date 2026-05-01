/**
 * IoT-SPMS: Dynamic Guidance Core Module
 * Provides shared functions for fetching parking status and routing logic.
 */

const GuidanceSystem = {
    // Config paths
    dataUrl: '../../data/dynamic_guidance/parking_status.json',
    
    /**
     * Fetch real-time parking data from JSON
     */
    async fetchStatus() {
        try {
            const response = await fetch(this.dataUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch parking status:', error);
            return null;
        }
    },

    /**
     * Logic for Global Routing (UC_AnalyzeStatus)
     * Determines which zone to recommend based on occupancy.
     */
    getRecommendedZone(zones) {
        // Simple logic: return zone with most available slots
        return zones.reduce((prev, current) => (prev.available > current.available) ? prev : current);
    },

    /**
     * Get zone details by ID
     */
    getZoneById(zones, id) {
        return zones.find(z => z.id === id);
    }
};

window.GuidanceSystem = GuidanceSystem;
