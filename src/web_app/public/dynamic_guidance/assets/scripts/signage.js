/**
 * IoT-SPMS: Signage Rendering Module
 * Handles UI updates for Global and Local Signage pages.
 */

async function initSignage() {
    const data = await GuidanceSystem.fetchStatus();
    if (!data) return;

    // Detect if we are on Global or Local page
    const pageTitle = document.title;

    if (pageTitle.includes('Global')) {
        updateGlobalSignage(data);
    } else if (pageTitle.includes('Local')) {
        updateLocalSignage(data);
    }
}

/**
 * Update Global Signage LED Board
 */
function updateGlobalSignage(data) {
    const recommendedZone = GuidanceSystem.getRecommendedZone(data.zones);

    data.zones.forEach(zone => {
        // Find zone card - searching for the zone letter in the h2 tag
        const zoneCards = Array.from(document.querySelectorAll('.glass h2'));
        const zoneH2 = zoneCards.find(el => el.textContent.trim() === zone.id);
        const zoneCard = zoneH2 ? zoneH2.closest('.glass') : null;

        if (zoneCard) {
            // Tìm con số chỗ trống ở cột bên phải của thẻ (text-right)
            const vacancyContainer = zoneCard.querySelector('.text-right');
            const vacancyEl = vacancyContainer ? vacancyContainer.querySelector('.font-headline') : null;
            
            if (vacancyEl) {
                const labelEl = vacancyContainer.querySelector('.text-sm'); // Nhãn "CHỖ TRỐNG"
                
                if (zone.available === 0) {
                    vacancyEl.innerText = "HẾT CHỖ";
                    vacancyEl.classList.replace('text-6xl', 'text-4xl');
                    if (labelEl) labelEl.style.display = 'none'; // Ẩn chữ "CHỖ TRỐNG"
                } else {
                    vacancyEl.innerText = zone.available;
                    vacancyEl.classList.replace('text-4xl', 'text-6xl');
                    if (labelEl) labelEl.style.display = 'block'; // Hiện lại chữ "CHỖ TRỐNG"
                }
            }
            
            // Highlight full status
            if (zone.available === 0) {
                zoneCard.classList.add('border-error/50', 'bg-error/10');
            } else {
                zoneCard.classList.remove('border-error/50', 'bg-error/10');
            }
        }
    });

    // --- Update Schematic Map Navigation ---
    // Hide all arrows and reset node styles
    document.querySelectorAll('.guidance-arrow').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.zone-node').forEach(el => el.classList.remove('active-node'));

    if (recommendedZone && recommendedZone.available > 0) {
        // Show arrow to recommended zone
        const arrow = document.getElementById(`arrow-to-${recommendedZone.id}`);
        const node = document.getElementById(`node-${recommendedZone.id}`);
        
        if (arrow) arrow.classList.remove('hidden');
        if (node) node.classList.add('active-node');
    }
}

/**
 * Update Local Signage (Zone-specific)
 */
function updateLocalSignage(data) {
    const urlParams = new URLSearchParams(window.location.search);
    const zoneId = urlParams.get('zone') || "A";
    const zone = data.zones.find(z => z.id === zoneId);
    
    if (zone) {
        document.getElementById('zone-id-large').innerText = zone.id;
        document.getElementById('vacancy-count-large').innerText = zone.available;
        
        // Vẽ các Slot đỗ xe
        renderParkingSlots(zoneId, zone.available);
    }
}

/**
 * Render parking slots into SVG
 */
function renderParkingSlots(zoneId, availableCount) {
    const slotsContainer = document.getElementById('slots-container');
    const roadsContainer = document.getElementById('roads-container');
    if (!slotsContainer || !roadsContainer) return;

    slotsContainer.innerHTML = '';
    roadsContainer.innerHTML = '';

    let recommendedSlot = null;
    const totalSlots = 500;
    const numLanes = 5;
    const slotsPerRow = 50;
    
    // 1. Vẽ trục đường dọc (Main Spine) từ Lối vào lên trên
    const verticalRoad = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    verticalRoad.setAttribute("x", "40"); verticalRoad.setAttribute("y", "50");
    verticalRoad.setAttribute("width", "40"); verticalRoad.setAttribute("height", "920");
    verticalRoad.setAttribute("fill", "rgba(255,255,255,0.03)"); verticalRoad.setAttribute("rx", "20");
    roadsContainer.appendChild(verticalRoad);

    // 2. Vẽ 5 làn đường ngang rẽ từ trục dọc (Lanes)
    // Lane 1 ở dưới cùng, Lane 5 ở trên cùng
    for (let l = 0; l < numLanes; l++) {
        const roadY = 850 - l * 180; // Đảo ngược: bắt đầu từ dưới lên
        const road = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        road.setAttribute("x", "40");
        road.setAttribute("y", roadY);
        road.setAttribute("width", "1500");
        road.setAttribute("height", "35");
        road.setAttribute("fill", "rgba(255,255,255,0.02)");
        road.setAttribute("rx", "15");
        roadsContainer.appendChild(road);
    }

    const actualOccupiedCount = totalSlots - availableCount;
    const currentOccupied = new Set();
    while(currentOccupied.size < actualOccupiedCount) {
        currentOccupied.add(Math.floor(Math.random() * totalSlots) + 1);
    }

    // 3. Vẽ 500 ô đỗ (10 hàng, mỗi Lane phục vụ 2 hàng)
    for (let i = 1; i <= totalSlots; i++) {
        const rowIdx = Math.floor((i - 1) / slotsPerRow);
        const colIdx = (i - 1) % slotsPerRow;
        const laneIdx = Math.floor(rowIdx / 2);
        const isUpperRow = rowIdx % 2 === 1; // Hàng trên của Lane

        const xPos = 120 + colIdx * 29;
        const roadY = 850 - laneIdx * 180;
        const yPos = isUpperRow ? (roadY - 60) : (roadY + 45);
        
        const isOccupied = currentOccupied.has(i);
        const isTarget = !isOccupied && !recommendedSlot;
        
        const slotColor = isOccupied ? '#ff716c' : '#4ade80';
        
        if (isTarget) {
            const arrowY = isUpperRow ? (yPos + 60) : (yPos - 5);
            recommendedSlot = { x: xPos + 10, y: arrowY, laneY: roadY + 17 };
        }

        const slotG = document.createElementNS("http://www.w3.org/2000/svg", "g");
        slotG.innerHTML = `
            <rect x="${xPos}" y="${yPos}" width="22" height="50" fill="${slotColor}" rx="3" class="slot" 
                  style="opacity: ${isOccupied ? 0.7 : 0.9}; stroke: rgba(255,255,255,0.15); stroke-width: 0.5"/>
        `;
        slotsContainer.appendChild(slotG);
    }

    // 4. Mũi tên điều hướng từ góc dưới lên
    const arrow = document.getElementById('guidance-arrow');
    const startPos = { x: 60, y: 920 };
    if (recommendedSlot && arrow) {
        // Lộ trình: Lối vào -> Đi lên Spine -> Rẽ phải vào Lane -> Ô đỗ
        const pathData = `M ${startPos.x} ${startPos.y} 
                          L ${startPos.x} ${recommendedSlot.laneY} 
                          L ${recommendedSlot.x} ${recommendedSlot.laneY} 
                          L ${recommendedSlot.x} ${recommendedSlot.y}`;
        arrow.setAttribute('d', pathData);
        arrow.setAttribute('stroke', 'white');
        arrow.setAttribute('stroke-width', '8');
        arrow.classList.remove('hidden');
    } else if (arrow) {
        arrow.classList.add('hidden');
    }
}

// Add a helper for finding text in elements
// (Since standard DOM doesn't have :contains)
window.addEventListener('DOMContentLoaded', initSignage);
setInterval(initSignage, 5000); // Auto update every 5 seconds
