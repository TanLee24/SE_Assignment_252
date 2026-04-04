# Design System Specification: High-Tech IoT-SPMS

## 1. Overview & Creative North Star: "The Kinetic Pulse"
The Creative North Star for this design system is **"The Kinetic Pulse."** In a Smart Parking Management System, data is never static; it is a living, breathing flow of occupancy, sensors, and movement. We are moving away from the "static dashboard" trope and toward a digital cockpit that feels alive.

This system rejects the rigidity of traditional enterprise software. Instead of boxes within boxes, we utilize **Tonal Layering** and **Luminous Depth**. The interface should feel like a high-end physical console—think of a glass head-up display (HUD) in a premium electric vehicle. We achieve this through intentional asymmetry, where data "floats" in a dark void, and hierarchy is communicated through light and blur rather than lines and borders.

## 2. Colors: The Deep-Sea Spectrum
Our palette is rooted in the "Deep Navy" void, using luminescence to guide the eye. We follow a strict hierarchy of light to ensure the UI feels "emitted" rather than "printed."

### The "No-Line" Rule
**Standard 1px borders are strictly prohibited for sectioning.** To define boundaries, use color-stepping. A card (`surface-container-low`) sits on a background (`surface`) without a stroke. The transition in value provides the edge.

### Surface Hierarchy & Nesting
*   **Background (`#0a0e15`):** The absolute base. The "void."
*   **Surface Container Low (`#0f131b`):** Primary sectioning (e.g., Sidebar or Main Content Area).
*   **Surface Container High (`#1b2029`):** Interactive elements and "active" cards.
*   **Surface Bright (`#262c37`):** Hover states and emphasized modal surfaces.

### The "Glass & Gradient" Rule
To achieve the "Futuristic" requirement, use **Glassmorphism** for floating overlays (Modals, Tooltips, Dropdowns). 
*   **Formula:** `surface-container-highest` at 60% opacity + `backdrop-blur: 12px`.
*   **Signature Texture:** Use a linear gradient for primary CTAs: `primary-dim (#2f6cf0)` to `primary (#8eabff)` at a 135-degree angle. This mimics the "glow" of a sensor light.

## 3. Typography: Precision & Atmosphere
We utilize a dual-font system to balance "High-Tech" with "High-Readability."

*   **Display & Headlines (Space Grotesk):** This is our "Engineered" voice. Its geometric, slightly wider stance feels like a technical schematic. Use `display-lg` for big data points (e.g., "98% Occupancy") to give them an editorial, authoritative weight.
*   **Body & Titles (Manrope):** Chosen for its exceptional legibility in dark modes. Manrope's modern sans-serif curves soften the "brutalist" edge of the headlines, making the system feel professional and approachable for long-term monitoring.
*   **Hierarchy Note:** Always use `on-surface-variant (#a8abb5)` for secondary labels to ensure the "bright accent blue" of the data points remains the focal point.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows look "muddy" in a dark UI. We use **Luminous Elevation**.

*   **The Layering Principle:** Instead of lifting a card with a shadow, lift it by shifting from `surface-container-lowest` to `surface-container-low`.
*   **Ambient Glows:** When an element must "float" (e.g., an active parking bay on a map), use a glow instead of a shadow. Use `primary-dim` at 15% opacity with a `40px` blur.
*   **The Ghost Border Fallback:** If a border is required for extreme density, use `outline-variant (#444850)` at **15% opacity**. It should be felt, not seen.
*   **Interactive Glow:** On hover, a card should not just change color; it should gain a subtle inner-glow (`box-shadow: inset 0 0 10px rgba(47, 108, 240, 0.2)`).

## 5. Components

### Modern Buttons
*   **Primary:** Gradient fill (`primary-dim` to `primary`). No border. `xl` roundedness (0.75rem).
*   **Secondary:** Glass-style. `surface-variant` at 40% opacity with a `backdrop-blur`.
*   **Tertiary:** Ghost style. No background, `primary-dim` text, with a glowing hover state.

### Real-Time Status Indicators (IoT Specific)
*   **The "Pulse" State:** For active sensors, use a 4px dot of `primary` with a concentric "ping" animation (a scaling circle that fades out).
*   **Occupancy Chips:** Use `secondary-container` for backgrounds. Instead of a "Full" label, use a high-contrast `primary-fixed` numerical display.

### Cards & Lists
*   **The Rule of Space:** Forbid the use of divider lines between list items. Use `16px` of vertical whitespace. 
*   **Nested Cards:** A card containing a chart should use `surface-container-highest` for the chart background to "recess" the data into the card surface.

### Input Fields
*   **Field Style:** Use `surface-container-low` with a bottom-only "active" highlight of `primary`. This mimics terminal interfaces.
*   **Error States:** Use `error_dim (#d7383b)` only for text and icons. Never turn the entire box red; it breaks the "Deep Navy" aesthetic.

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Place your "Main Metric" (e.g., Total Spots) off-center or significantly larger than other items to create an editorial feel.
*   **Embrace the Dark:** Keep 80% of the screen in the `surface` to `surface-container-low` range. Contrast is your most valuable resource; don't waste it.
*   **Soft Gradients:** Use gradients that move through similar hues (Navy to Bright Blue), never to transparent or black.

### Don't:
*   **No Pure White:** Never use `#FFFFFF`. Use `on-surface (#f1f3fe)` for text to prevent "haloing" and eye strain on dark backgrounds.
*   **No 1px Dividers:** Do not separate "Total Spots" from "Available Spots" with a line. Use a background color shift or a large typographic gap.
*   **No Sharp Corners:** Avoid the `none` roundedness. Even in a "High-Tech" system, a `sm` (0.125rem) or `md` (0.375rem) radius makes the UI feel premium and manufactured rather than "default."