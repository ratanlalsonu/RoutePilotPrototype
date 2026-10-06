import { VehicleType } from '../types';

export interface VehicleDimension {
  width: number;
  height: number;
}

export function getVehicleDimensions(type: VehicleType): VehicleDimension {
  switch (type) {
    case 'bike':
      return { width: 16, height: 32 };
    case 'van':
      return { width: 24, height: 46 };
    case 'bus':
      return { width: 26, height: 60 };
    case 'truck':
      return { width: 28, height: 64 };
    case 'car':
    default:
      return { width: 23, height: 42 };
  }
}

export function getVehicleDisplaySvg(type: VehicleType, maxHeight: number = 36): string {
  const dims = getVehicleDimensions(type);
  const aspect = dims.width / dims.height;
  const targetWidth = Math.round(maxHeight * aspect);
  const fullSvg = getVehicleTopDownSvg(type);
  return fullSvg
    .replace(/width="[^"]+"/, `width="${targetWidth}"`)
    .replace(/height="[^"]+"/, `height="${maxHeight}"`);
}

/**
 * Returns a high-fidelity top-down SVG model for the requested vehicle type.
 * Orientations: Heading 0° points UP (North / Forward along the road).
 * Styled with realistic shading, windshield reflections, headlights, and taillights.
 */
export function getVehicleTopDownSvg(type: VehicleType): string {
  switch (type) {
    case 'bike':
      return `
        <svg width="100%" height="100%" viewBox="0 0 26 54" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.65));">
          <defs>
            <linearGradient id="bikeTank" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="50%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#0369a1" />
            </linearGradient>
            <linearGradient id="bikeHelmet" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#f8fafc" />
              <stop offset="40%" stop-color="#94a3b8" />
              <stop offset="100%" stop-color="#0f172a" />
            </linearGradient>
          </defs>

          <!-- Front Wheel & Mudguard -->
          <rect x="11.5" y="1" width="3" height="11" rx="1.5" fill="#0f172a" stroke="#334155" stroke-width="0.5" />

          <!-- Handlebars with Grips & Rearview Mirrors -->
          <path d="M4 11 L10 13 L16 13 L22 11" stroke="#334155" stroke-width="2.2" stroke-linecap="round" />
          <circle cx="3.5" cy="10" r="1.5" fill="#0284c7" stroke="#0f172a" stroke-width="0.5" />
          <circle cx="22.5" cy="10" r="1.5" fill="#0284c7" stroke="#0f172a" stroke-width="0.5" />

          <!-- Front Cowl & Bright Headlight -->
          <polygon points="10,7 16,7 14.5,13 11.5,13" fill="#0284c7" />
          <ellipse cx="13" cy="7.5" rx="2" ry="1" fill="#fef08a" />

          <!-- Fuel Tank Body -->
          <path d="M9.5 13 C9.5 13, 7 18, 9 23 C10.5 26, 15.5 26, 17 23 C19 18, 16.5 13, 16.5 13 Z" fill="url(#bikeTank)" stroke="#0c4a6e" stroke-width="0.8" />

          <!-- Rider Shoulders / Jacket -->
          <path d="M6 24 Q13 21 20 24 L19 32 Q13 34 7 32 Z" fill="#1e293b" stroke="#0f172a" stroke-width="0.8" />

          <!-- Rider Helmet (Top-Down with tinted visor reflection) -->
          <ellipse cx="13" cy="26" rx="5" ry="5.8" fill="url(#bikeHelmet)" stroke="#0f172a" stroke-width="0.8" />
          <path d="M10 22 Q13 20 16 22 L15 24 Q13 23 11 24 Z" fill="#0f172a" />
          <path d="M11 22.2 Q13 21.2 15 22.2" stroke="#38bdf8" stroke-width="0.75" />

          <!-- Seat & Dual Exhausts -->
          <path d="M10 33 L16 33 L15 42 L11 42 Z" fill="#0f172a" stroke="#334155" stroke-width="0.5" />
          <rect x="7" y="36" width="1.5" height="9" rx="0.7" fill="#64748b" />
          <rect x="17.5" y="36" width="1.5" height="9" rx="0.7" fill="#64748b" />

          <!-- Rear Fender, Red Taillight, & Rear Wheel -->
          <rect x="11.5" y="43" width="3" height="10" rx="1.5" fill="#0f172a" stroke="#334155" stroke-width="0.5" />
          <rect x="10.5" y="43" width="5" height="1.8" rx="0.6" fill="#ff2222" stroke="#ffffff" stroke-width="0.3" />
        </svg>
      `;

    case 'van':
      return `
        <svg width="100%" height="100%" viewBox="0 0 38 74" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.65));">
          <defs>
            <linearGradient id="vanBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="45%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#0369a1" />
            </linearGradient>
            <linearGradient id="vanRoofGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#e2e8f0" />
              <stop offset="50%" stop-color="#ffffff" />
              <stop offset="100%" stop-color="#cbd5e1" />
            </linearGradient>
            <linearGradient id="vanGlass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0f172a" />
              <stop offset="100%" stop-color="#1e293b" />
            </linearGradient>
          </defs>

          <!-- Wheels Under Arches -->
          <rect x="0.5" y="13" width="4" height="11" rx="2" fill="#0f172a" />
          <rect x="33.5" y="13" width="4" height="11" rx="2" fill="#0f172a" />
          <rect x="0.5" y="53" width="4" height="11" rx="2" fill="#0f172a" />
          <rect x="33.5" y="53" width="4" height="11" rx="2" fill="#0f172a" />

          <!-- Extended Side Mirrors -->
          <rect x="1" y="21" width="3" height="4" rx="1" fill="#0284c7" stroke="#0369a1" stroke-width="0.5" />
          <rect x="34" y="21" width="3" height="4" rx="1" fill="#0284c7" stroke="#0369a1" stroke-width="0.5" />

          <!-- Van Main Body Shell -->
          <path d="
            M11 2
            C15 1.2, 23 1.2, 27 2
            C32 2.8, 34 6, 34 13
            L34 65
            C34 70, 31 72.5, 27 73
            L11 73
            C7 72.5, 4 70, 4 65
            L4 13
            C4 6, 6 2.8, 11 2
            Z
          " fill="url(#vanBodyGrad)" stroke="#0c4a6e" stroke-width="1.2" />

          <!-- Front Bumper & Headlights -->
          <rect x="6.5" y="3.5" width="4.5" height="2.5" rx="1" fill="#fef08a" stroke="#ffffff" stroke-width="0.4" />
          <rect x="27" y="3.5" width="4.5" height="2.5" rx="1" fill="#fef08a" stroke="#ffffff" stroke-width="0.4" />

          <!-- Front Windshield -->
          <path d="
            M8 13
            Q19 14.8 30 13
            L29 22
            Q19 21 9 22
            Z
          " fill="url(#vanGlass)" stroke="#0f172a" stroke-width="0.8" />
          <path d="M9 13.8 Q19 15.5 29 13.8 L27 18 Q19 17 11 18 Z" fill="#38bdf8" opacity="0.4" />

          <!-- Side Front Windows -->
          <rect x="6" y="23" width="1.8" height="9" rx="0.5" fill="#0f172a" />
          <rect x="30.2" y="23" width="1.8" height="9" rx="0.5" fill="#0f172a" />

          <!-- Cargo Roof with Stamped Ribs -->
          <rect x="8" y="23" width="22" height="44" rx="2" fill="url(#vanRoofGrad)" stroke="#94a3b8" stroke-width="0.8" />
          <line x1="12" y1="27" x2="12" y2="63" stroke="#94a3b8" stroke-width="1" />
          <line x1="16.5" y1="27" x2="16.5" y2="63" stroke="#94a3b8" stroke-width="1" />
          <line x1="21.5" y1="27" x2="21.5" y2="63" stroke="#94a3b8" stroke-width="1" />
          <line x1="26" y1="27" x2="26" y2="63" stroke="#94a3b8" stroke-width="1" />

          <!-- Rear Twin Barn-Doors Line & Taillights -->
          <line x1="19" y1="67" x2="19" y2="73" stroke="#0f172a" stroke-width="1" />
          <rect x="5" y="66" width="2.5" height="5" rx="0.8" fill="#ff2222" stroke="#ffffff" stroke-width="0.4" />
          <rect x="30.5" y="66" width="2.5" height="5" rx="0.8" fill="#ff2222" stroke="#ffffff" stroke-width="0.4" />
        </svg>
      `;

    case 'bus':
      return `
        <svg width="100%" height="100%" viewBox="0 0 40 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.7));">
          <defs>
            <linearGradient id="busBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="50%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#0369a1" />
            </linearGradient>
            <linearGradient id="busRoofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#f8fafc" />
              <stop offset="50%" stop-color="#e2e8f0" />
              <stop offset="100%" stop-color="#cbd5e1" />
            </linearGradient>
          </defs>

          <!-- Wheels Under Arches -->
          <rect x="0.5" y="14" width="4" height="12" rx="2" fill="#0f172a" />
          <rect x="35.5" y="14" width="4" height="12" rx="2" fill="#0f172a" />
          <rect x="0.5" y="76" width="4" height="13" rx="2" fill="#0f172a" />
          <rect x="35.5" y="76" width="4" height="13" rx="2" fill="#0f172a" />

          <!-- Outstretched Bus Mirrors -->
          <path d="M2.5 9 C0 9, 0 13, 1.5 14 L3.5 13 Z" fill="#0284c7" stroke="#0369a1" stroke-width="0.5" />
          <path d="M37.5 9 C40 9, 40 13, 38.5 14 L36.5 13 Z" fill="#0284c7" stroke="#0369a1" stroke-width="0.5" />

          <!-- Bus Long Main Body -->
          <rect x="3.5" y="2" width="33" height="96" rx="5.5" fill="url(#busBodyGrad)" stroke="#0c4a6e" stroke-width="1.2" />

          <!-- Front Panoramic Windshield & Destination Header -->
          <path d="
            M6 4.5
            Q20 2 34 4.5
            L33 15
            Q20 13 7 15
            Z
          " fill="#0f172a" stroke="#1e293b" stroke-width="0.8" />
          <path d="M7 5.5 Q20 3.2 33 5.5 L30 10 Q20 8.5 10 10 Z" fill="#38bdf8" opacity="0.45" />

          <!-- LED Destination Board -->
          <rect x="11" y="3" width="18" height="2.2" rx="0.5" fill="#f59e0b" opacity="0.9" />

          <!-- Full-length Side Passenger Windows -->
          <rect x="4.5" y="16" width="1.5" height="74" rx="0.5" fill="#0f172a" />
          <rect x="34" y="16" width="1.5" height="74" rx="0.5" fill="#0f172a" />

          <!-- Roof Area -->
          <rect x="7" y="16.5" width="26" height="73" rx="2.5" fill="url(#busRoofGrad)" stroke="#94a3b8" stroke-width="0.8" />

          <!-- Central Roof AC Unit -->
          <rect x="10.5" y="23" width="19" height="14" rx="1.8" fill="#cbd5e1" stroke="#64748b" stroke-width="0.8" />
          <line x1="13" y1="26" x2="27" y2="26" stroke="#64748b" stroke-width="0.8" />
          <line x1="13" y1="30" x2="27" y2="30" stroke="#64748b" stroke-width="0.8" />
          <line x1="13" y1="34" x2="27" y2="34" stroke="#64748b" stroke-width="0.8" />

          <!-- Roof Escape Hatches -->
          <rect x="13.5" y="47" width="13" height="8" rx="1.2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.8" />
          <rect x="13.5" y="68" width="13" height="8" rx="1.2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.8" />

          <!-- Rear Engine Vents & Wide Taillight Bars -->
          <rect x="8" y="90.5" width="24" height="4.5" rx="1" fill="#0f172a" opacity="0.7" />
          <rect x="5" y="96" width="6.5" height="2" rx="0.5" fill="#ff2222" stroke="#ffffff" stroke-width="0.3" />
          <rect x="28.5" y="96" width="6.5" height="2" rx="0.5" fill="#ff2222" stroke="#ffffff" stroke-width="0.3" />
        </svg>
      `;

    case 'truck':
      return `
        <svg width="100%" height="100%" viewBox="0 0 42 108" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.7));">
          <defs>
            <linearGradient id="truckCabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="50%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#075985" />
            </linearGradient>
            <linearGradient id="truckTrailerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#f8fafc" />
              <stop offset="30%" stop-color="#e2e8f0" />
              <stop offset="50%" stop-color="#ffffff" />
              <stop offset="70%" stop-color="#e2e8f0" />
              <stop offset="100%" stop-color="#cbd5e1" />
            </linearGradient>
          </defs>

          <!-- Front Cab Wheels -->
          <rect x="0.5" y="9" width="4.5" height="12" rx="2" fill="#0f172a" />
          <rect x="37" y="9" width="4.5" height="12" rx="2" fill="#0f172a" />

          <!-- Rear Tandem Trailer Double Axles -->
          <rect x="0.5" y="74" width="4.5" height="12" rx="2" fill="#0f172a" />
          <rect x="37" y="74" width="4.5" height="12" rx="2" fill="#0f172a" />
          <rect x="0.5" y="89" width="4.5" height="12" rx="2" fill="#0f172a" />
          <rect x="37" y="89" width="4.5" height="12" rx="2" fill="#0f172a" />

          <!-- Heavy Duty Mirror Brackets -->
          <rect x="0.5" y="16" width="4" height="4" rx="1" fill="#0284c7" stroke="#0369a1" stroke-width="0.5" />
          <rect x="37.5" y="16" width="4" height="4" rx="1" fill="#0284c7" stroke="#0369a1" stroke-width="0.5" />

          <!-- Truck Cab Unit -->
          <path d="
            M10 2
            C14 1, 28 1, 32 2
            C37 2.8, 38 6, 38 16
            L38 31
            C38 34, 35 35, 31 35
            L11 35
            C7 35, 4 34, 4 31
            L4 16
            C4 6, 5 2.8, 10 2
            Z
          " fill="url(#truckCabGrad)" stroke="#0c4a6e" stroke-width="1.2" />

          <!-- Front Bumper & Dual Headlights -->
          <rect x="6" y="2.5" width="4.5" height="2" rx="0.5" fill="#fef08a" stroke="#ffffff" stroke-width="0.4" />
          <rect x="31.5" y="2.5" width="4.5" height="2" rx="0.5" fill="#fef08a" stroke="#ffffff" stroke-width="0.4" />
          <rect x="13" y="2" width="16" height="1.8" rx="0.5" fill="#94a3b8" />

          <!-- Cab Windshield & Sun Shade -->
          <rect x="8" y="7" width="26" height="11" rx="1.8" fill="#0f172a" stroke="#1e293b" stroke-width="0.8" />
          <path d="M9 8 L33 8 L29 13 L13 13 Z" fill="#38bdf8" opacity="0.4" />
          <rect x="9" y="5.5" width="24" height="2.5" rx="0.8" fill="#0284c7" />

          <!-- Cab Roof Deflector -->
          <path d="M9 19 L33 19 L31 30 L11 30 Z" fill="#0284c7" stroke="#0369a1" stroke-width="0.8" />

          <!-- Dual Exhaust Chimneys -->
          <rect x="5" y="29" width="2.5" height="6" rx="1" fill="#94a3b8" />
          <rect x="34.5" y="29" width="2.5" height="6" rx="1" fill="#94a3b8" />

          <!-- 5th Wheel Coupling Plate -->
          <rect x="16" y="34" width="10" height="6" rx="1" fill="#334155" />
          <circle cx="21" cy="37" r="2" fill="#0f172a" />

          <!-- Massive Heavy Cargo Trailer Box -->
          <rect x="5" y="39" width="32" height="65" rx="2.5" fill="url(#truckTrailerGrad)" stroke="#64748b" stroke-width="1.2" />

          <!-- Trailer Corrugated Steel Ridges -->
          <line x1="5" y1="44" x2="37" y2="44" stroke="#cbd5e1" stroke-width="1" />
          <line x1="5" y1="50" x2="37" y2="50" stroke="#cbd5e1" stroke-width="1" />
          <line x1="5" y1="56" x2="37" y2="56" stroke="#cbd5e1" stroke-width="1" />
          <line x1="5" y1="62" x2="37" y2="62" stroke="#cbd5e1" stroke-width="1" />
          <line x1="5" y1="68" x2="37" y2="68" stroke="#cbd5e1" stroke-width="1" />
          <line x1="5" y1="74" x2="37" y2="74" stroke="#cbd5e1" stroke-width="1" />
          <line x1="5" y1="80" x2="37" y2="80" stroke="#cbd5e1" stroke-width="1" />
          <line x1="5" y1="86" x2="37" y2="86" stroke="#cbd5e1" stroke-width="1" />
          <line x1="5" y1="92" x2="37" y2="92" stroke="#cbd5e1" stroke-width="1" />
          <line x1="5" y1="98" x2="37" y2="98" stroke="#cbd5e1" stroke-width="1" />

          <!-- Rear Protective Bar & Red Brake Lights -->
          <rect x="6" y="104" width="30" height="3" rx="0.5" fill="#334155" />
          <rect x="7" y="102.5" width="5.5" height="2" rx="0.5" fill="#ff2222" stroke="#ffffff" stroke-width="0.3" />
          <rect x="29.5" y="102.5" width="5.5" height="2" rx="0.5" fill="#ff2222" stroke="#ffffff" stroke-width="0.3" />
        </svg>
      `;

    case 'car':
    default:
      // Exact match to user reference screenshot: Blue aerodynamic sports sedan with windshield, roof, rear defroster, and glowing red taillights!
      return `
        <svg width="100%" height="100%" viewBox="0 0 36 66" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.65));">
          <defs>
            <!-- Vibrant Metallic Blue body gradient matching user's image -->
            <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="40%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#0369a1" />
            </linearGradient>
            <!-- Glossy curved roof -->
            <linearGradient id="carRoofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#60a5fa" />
              <stop offset="45%" stop-color="#2563eb" />
              <stop offset="100%" stop-color="#1d4ed8" />
            </linearGradient>
            <!-- Dark tinted automotive glass -->
            <linearGradient id="carGlassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0f172a" />
              <stop offset="50%" stop-color="#1e293b" />
              <stop offset="100%" stop-color="#334155" />
            </linearGradient>
            <!-- Windshield light reflection -->
            <linearGradient id="windshieldReflectGrad" x1="0%" y1="0%" x2="100%" y2="50%">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.85" />
              <stop offset="60%" stop-color="#0284c7" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
            </linearGradient>
            <!-- Taillight radial glow matching reference -->
            <radialGradient id="taillightGlowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ff3333" stop-opacity="1" />
              <stop offset="60%" stop-color="#dc2626" stop-opacity="0.8" />
              <stop offset="100%" stop-color="#991b1b" stop-opacity="0" />
            </radialGradient>
          </defs>

          <!-- Four Wheels Tucked Under Arches -->
          <rect x="0.8" y="10" width="3.8" height="11" rx="1.8" fill="#0f172a" />
          <rect x="31.4" y="10" width="3.8" height="11" rx="1.8" fill="#0f172a" />
          <rect x="0.8" y="46" width="3.8" height="11" rx="1.8" fill="#0f172a" />
          <rect x="31.4" y="46" width="3.8" height="11" rx="1.8" fill="#0f172a" />

          <!-- Aerodynamic Side Mirrors -->
          <path d="M3.5 21 C1 21, 0 24, 1.8 26 L3.8 25 Z" fill="#0284c7" stroke="#0369a1" stroke-width="0.7" />
          <path d="M32.5 21 C35 21, 36 24, 34.2 26 L32.2 25 Z" fill="#0284c7" stroke="#0369a1" stroke-width="0.7" />

          <!-- Sculpted Car Body Shell -->
          <path d="
            M10.5 2
            C14.5 1, 21.5 1, 25.5 2
            C30.5 3.5, 32.5 7.5, 32.5 15
            C33.5 24, 33.5 42, 32.5 53
            C32.5 61, 29.5 64.5, 25.5 65
            C21.5 65.5, 14.5 65.5, 10.5 65
            C6.5 64.5, 3.5 61, 3.5 53
            C2.5 42, 2.5 24, 3.5 15
            C3.5 7.5, 5.5 3.5, 10.5 2
            Z
          " fill="url(#carBodyGrad)" stroke="#0c4a6e" stroke-width="1.2" />

          <!-- Front Hood Sculpting Lines -->
          <path d="M8.5 12 Q18 15 27.5 12" stroke="#0284c7" stroke-width="0.9" fill="none" opacity="0.6" />
          <path d="M11.5 3.5 L13 14" stroke="#38bdf8" stroke-width="0.75" opacity="0.7" />
          <path d="M24.5 3.5 L23 14" stroke="#38bdf8" stroke-width="0.75" opacity="0.7" />

          <!-- Bright Xenon/LED Front Headlights -->
          <ellipse cx="8" cy="4.5" rx="3.2" ry="1.8" fill="#fef08a" stroke="#ffffff" stroke-width="0.5" />
          <ellipse cx="28" cy="4.5" rx="3.2" ry="1.8" fill="#fef08a" stroke="#ffffff" stroke-width="0.5" />

          <!-- Front Windshield -->
          <path d="
            M8 16
            Q18 18 28 16
            L26.5 28
            Q18 27 9.5 28
            Z
          " fill="url(#carGlassGrad)" stroke="#0f172a" stroke-width="0.8" />
          <path d="
            M9 17
            Q18 18.5 27 17
            L24 22.5
            Q18 21.5 10 23.5
            Z
          " fill="url(#windshieldReflectGrad)" />

          <!-- Cabin Roof with Metallic Highlights -->
          <rect x="9" y="27" width="18" height="18" rx="2.8" fill="url(#carRoofGrad)" stroke="#1e3a8a" stroke-width="0.8" />
          <rect x="11.5" y="29" width="13" height="12" rx="1.8" fill="#0f172a" opacity="0.5" />
          <path d="M12.5 30 L23 30 L19 37 L12.5 37 Z" fill="#38bdf8" opacity="0.25" />

          <!-- Rear Window Glass & Defroster Lines -->
          <path d="
            M9.5 46
            Q18 45 26.5 46
            L28 54.5
            Q18 55.5 8 54.5
            Z
          " fill="url(#carGlassGrad)" stroke="#0f172a" stroke-width="0.8" />
          <line x1="11" y1="48.5" x2="25" y2="48.5" stroke="#475569" stroke-width="0.4" />
          <line x1="10.5" y1="51.5" x2="25.5" y2="51.5" stroke="#475569" stroke-width="0.4" />

          <!-- Rear Trunk Lid / Bumper Panel -->
          <rect x="8.5" y="56" width="19" height="6.5" rx="1.4" fill="#0284c7" stroke="#0369a1" stroke-width="0.8" />
          <rect x="11.5" y="57.5" width="13" height="3.5" rx="0.8" fill="#0f172a" opacity="0.45" />

          <!-- Glowing Red Dual Taillights (Exact match to uploaded image) -->
          <circle cx="7.5" cy="61" r="2.8" fill="url(#taillightGlowGrad)" />
          <circle cx="7.5" cy="61" r="1.6" fill="#ff2222" stroke="#ffffff" stroke-width="0.4" />
          <circle cx="28.5" cy="61" r="2.8" fill="url(#taillightGlowGrad)" />
          <circle cx="28.5" cy="61" r="1.6" fill="#ff2222" stroke="#ffffff" stroke-width="0.4" />
        </svg>
      `;
  }
}
