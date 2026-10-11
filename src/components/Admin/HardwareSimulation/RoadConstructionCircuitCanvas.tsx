import React, { useState } from 'react';
import { ROAD_WIRE_CONNECTIONS, RoadWireConnection } from '../../../services/roadCircuitPinMapping';

export interface RoadConstructionCircuitCanvasProps {
  isRunning: boolean;
  gpsEnabled: boolean;
  lteEnabled: boolean;
  constructionStatus: 'ACTIVE' | 'COMPLETED';
  transmissionStage: 'IDLE' | 'GPS_READ' | 'ESP32_PROCESS' | 'LTE_TRANSMIT' | 'INTERNET_ROUTING' | 'CLOUD_ACK';
  pulseTick: number; // Incrementing counter for animation keyframes
  batteryPct: number;
  batteryVoltage: number;
  selectedComponent: string | null;
  onSelectComponent: (id: string | null) => void;
  onRebootEsp32?: () => void;
}

export const RoadConstructionCircuitCanvas: React.FC<RoadConstructionCircuitCanvasProps> = ({
  isRunning,
  gpsEnabled,
  lteEnabled,
  constructionStatus,
  transmissionStage,
  pulseTick: _pulseTick,
  batteryPct,
  batteryVoltage,
  selectedComponent,
  onSelectComponent,
  onRebootEsp32,
}) => {
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [hoveredWire, setHoveredWire] = useState<RoadWireConnection | null>(null);
  const [hoveredPin, setHoveredPin] = useState<{ comp: string; pin: string } | null>(null);

  // Active stage flags for visual indication
  const isGpsActive = isRunning && gpsEnabled && (transmissionStage === 'GPS_READ' || transmissionStage === 'ESP32_PROCESS');
  const isEsp32Active = isRunning && (transmissionStage === 'ESP32_PROCESS' || transmissionStage === 'LTE_TRANSMIT');
  const isLteActive = isRunning && lteEnabled && (transmissionStage === 'LTE_TRANSMIT' || transmissionStage === 'INTERNET_ROUTING');
  const isInternetActive = isRunning && lteEnabled && (transmissionStage === 'INTERNET_ROUTING' || transmissionStage === 'CLOUD_ACK');
  const isCloudActive = isRunning && lteEnabled && transmissionStage === 'CLOUD_ACK';

  // Active work status color
  const statusColor = constructionStatus === 'ACTIVE' ? '#f97316' : '#10b981';

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#070A0F] overflow-hidden select-none">
      {/* Scalable SVG Canvas fitting laptop (1366x768) and desktop (1920x1080) without scrolling */}
      <svg
        viewBox="0 0 1600 750"
        className="w-full h-full max-h-full block"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Subtle PCB dot grid pattern matching Bridge canvas */}
          <pattern id="rcGrid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="#1e293b" fillOpacity="0.55" />
          </pattern>

          {/* Glow Filters for active wires and signals */}
          <filter id="wireGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="dataGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="powerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Linear Gradients for metallic hardware shields & battery */}
          <linearGradient id="batteryLiIon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="35%" stopColor="#2563eb" />
            <stop offset="70%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <linearGradient id="regulatorPcb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="metalShield" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="40%" stopColor="#cbd5e1" />
            <stop offset="70%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          <linearGradient id="ceramicAntenna" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#e2d9bc" />
            <stop offset="100%" stopColor="#d1c7a7" />
          </linearGradient>

          <linearGradient id="espShield" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Directed Data Arrow Markers for Cellular and Cloud links */}
          <marker
            id="lteArrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>

          <marker
            id="cloudArrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#c084fc" />
          </marker>
        </defs>

        {/* 1. Background Grid */}
        <rect width="1600" height="750" fill="#070A0F" />
        <rect width="1600" height="750" fill="url(#rcGrid)" />

        {/* ============================================================== */}
        {/* 2. WIRES LAYER (DRAWN UNDERNEATH ALL HARDWARE COMPONENTS) */}
        {/* Wires come from behind the hardware and terminate directly at pins */}
        {/* ============================================================== */}
        <g id="wires-layer">
          {ROAD_WIRE_CONNECTIONS.map((w) => {
            const isHighlighted =
              hoveredWire?.id === w.id ||
              hoveredPin?.pin === w.sourcePin ||
              hoveredPin?.pin === w.targetPin;
            const isDimmed = hoveredWire && !isHighlighted;

            // Signal active checks
            const isWireActive =
              isRunning &&
              (w.signalType === 'POWER_5V' ||
                w.signalType === 'POWER_3V3' ||
                w.signalType === 'POWER_3V7' ||
                w.signalType === 'GND' ||
                (w.sourceComponent.includes('GPS') && gpsEnabled) ||
                (w.sourceComponent.includes('SIM7600') && lteEnabled) ||
                (w.sourceComponent.includes('Internet') && lteEnabled));

            // Battery to converter wires are strictly static - no animated flow
            const isBatteryWire = w.id === 'w-batt-pos' || w.id === 'w-batt-neg';
            // Network & cloud uplink wires use animated arrowheads only
            const isCellularToInternet = w.id === 'w-sim-internet';
            const isInternetToCloud = w.id === 'w-internet-cloud';
            const isArrowWire = isCellularToInternet || isInternetToCloud;

            return (
              <g
                key={w.id}
                className="cursor-pointer transition-opacity duration-200"
                style={{ opacity: isDimmed ? 0.2 : 1 }}
                onMouseEnter={() => setHoveredWire(w)}
                onMouseLeave={() => setHoveredWire(null)}
              >
                {/* Thick invisible hover detection stroke */}
                <path d={w.path} fill="none" stroke="transparent" strokeWidth="16" />

                {/* Outer glowing aura when highlighted / hovered */}
                {isHighlighted && (
                  <path
                    d={w.path}
                    fill="none"
                    stroke={w.color === '#000000' ? '#64748b' : w.color}
                    strokeWidth="8"
                    strokeOpacity="0.5"
                    filter="url(#wireGlow)"
                  />
                )}

                {/* Base wire physical trace (static wire) - ONLY for real wired connections */}
                {!isArrowWire && (
                  <path
                    d={w.path}
                    fill="none"
                    stroke={w.color === '#1e293b' ? '#334155' : w.color === '#000000' ? '#111827' : w.color}
                    strokeWidth={isHighlighted ? 4 : isBatteryWire ? 3.4 : 2.6}
                    strokeLinecap="round"
                  />
                )}

                {/* Battery negative wire outline for crisp visibility against dark background */}
                {w.id === 'w-batt-neg' && (
                  <path
                    d={w.path}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                )}

                {/* Wireless Over-The-Air line-of-sight path (Ethereal dashed trace, NO physical copper wire) */}
                {isArrowWire && (
                  <path
                    d={w.path}
                    fill="none"
                    stroke={isCellularToInternet ? '#38bdf8' : '#c084fc'}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray="3 6"
                    strokeOpacity={isHighlighted ? 0.9 : 0.25}
                  />
                )}

                {/* 1. Standard signal pulse animation for ESP32/GPS/Power rails (EXCLUDING battery wires and wireless arrow links) */}
                {isWireActive && !isBatteryWire && !isArrowWire && (
                  <path
                    d={w.path}
                    fill="none"
                    stroke={w.color === '#1e293b' ? '#64748b' : '#ffffff'}
                    strokeWidth={isHighlighted ? 3.2 : 2.2}
                    strokeDasharray="6 24"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="120"
                      to="0"
                      dur={w.signalType === 'UART' ? '1.2s' : '2.2s'}
                      repeatCount="indefinite"
                    />
                  </path>
                )}

                {/* 2. WIRELESS 4G/LTE (SIM7600) -> Internet: Pure Over-The-Air Radio Waves & Flying Directional Arrows */}
                {isCellularToInternet && (
                  <g>
                    {/* Expanding RF Radio Wave Arcs emitting from Antenna into the air */}
                    <g opacity={isLteActive ? 0.95 : 0.35}>
                      <path d="M 1118 350 A 20 20 0 0 1 1118 380" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round">
                        {isLteActive && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0s" />}
                      </path>
                      <path d="M 1134 340 A 34 34 0 0 1 1134 392" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round">
                        {isLteActive && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.3s" />}
                      </path>
                      <path d="M 1152 332 A 48 48 0 0 1 1152 404" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round">
                        {isLteActive && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.6s" />}
                      </path>
                      <path d="M 1170 325 A 62 62 0 0 1 1170 415" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round">
                        {isLteActive && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.9s" />}
                      </path>
                    </g>

                    {/* Wireless RF Badge floating in the air gap */}
                    <g transform="translate(1146, 318)" className="pointer-events-none">
                      <rect x="-44" y="-10" width="88" height="20" rx="10" fill="#082f49" stroke="#0284c7" strokeWidth="1.2" opacity="0.92" />
                      <circle cx="-30" cy="0" r="3" fill={isLteActive ? '#38bdf8' : '#64748b'} className={isLteActive ? 'animate-ping' : ''} />
                      <circle cx="-30" cy="0" r="2.5" fill={isLteActive ? '#38bdf8' : '#64748b'} />
                      <text x="5" y="3.5" textAnchor="middle" fill="#7dd3fc" fontSize="8" fontWeight="bold" fontFamily="monospace">
                        WIRELESS 4G
                      </text>
                    </g>

                    {/* Animated moving wireless arrows flying through air (no physical wire) */}
                    {isLteActive && (
                      <g>
                        {/* Wireless Packet Arrow 1 */}
                        <path
                          d="M -8 -5 L 0 0 L -8 5"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <animateMotion
                            path={w.path}
                            dur="1.2s"
                            repeatCount="indefinite"
                            rotate="auto"
                          />
                        </path>
                        {/* Wireless Packet Arrow 2 (staggered) */}
                        <path
                          d="M -8 -5 L 0 0 L -8 5"
                          fill="none"
                          stroke="#bae6fd"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <animateMotion
                            path={w.path}
                            dur="1.2s"
                            begin="0.6s"
                            repeatCount="indefinite"
                            rotate="auto"
                          />
                        </path>
                      </g>
                    )}
                  </g>
                )}

                {/* 3. WIRELESS CLOUD (Internet -> Backend Cloud): Over-The-Air Ingestion Waves & Flying Directional Arrows */}
                {isInternetToCloud && (
                  <g>
                    {/* Radiating Wireless Cloud Signal Arcs bridging Internet and Server */}
                    <g opacity={isInternetActive ? 0.95 : 0.35}>
                      <path d="M 1368 382 A 16 16 0 0 1 1368 408" fill="none" stroke="#c084fc" strokeWidth="2.4" strokeLinecap="round">
                        {isInternetActive && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.1s" repeatCount="indefinite" begin="0s" />}
                      </path>
                      <path d="M 1380 374 A 26 26 0 0 1 1380 416" fill="none" stroke="#c084fc" strokeWidth="2.2" strokeLinecap="round">
                        {isInternetActive && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.1s" repeatCount="indefinite" begin="0.35s" />}
                      </path>
                      <path d="M 1394 366 A 38 38 0 0 1 1394 424" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round">
                        {isInternetActive && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.1s" repeatCount="indefinite" begin="0.7s" />}
                      </path>
                    </g>

                    {/* Wireless Cloud OTA Badge floating in the air gap */}
                    <g transform="translate(1382, 318)" className="pointer-events-none">
                      <rect x="-38" y="-10" width="76" height="20" rx="10" fill="#3b0764" stroke="#7e22ce" strokeWidth="1.2" opacity="0.92" />
                      <circle cx="-25" cy="0" r="3" fill={isInternetActive ? '#c084fc' : '#64748b'} className={isInternetActive ? 'animate-ping' : ''} />
                      <circle cx="-25" cy="0" r="2.5" fill={isInternetActive ? '#c084fc' : '#64748b'} />
                      <text x="5" y="3.5" textAnchor="middle" fill="#e9d5ff" fontSize="8" fontWeight="bold" fontFamily="monospace">
                        OTA SYNC
                      </text>
                    </g>

                    {/* Animated moving wireless arrows flying through air (no physical wire) */}
                    {isInternetActive && (
                      <g>
                        {/* Wireless Packet Arrow 1 */}
                        <path
                          d="M -8 -5 L 0 0 L -8 5"
                          fill="none"
                          stroke="#c084fc"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <animateMotion
                            path={w.path}
                            dur="1.1s"
                            repeatCount="indefinite"
                            rotate="auto"
                          />
                        </path>
                        {/* Wireless Packet Arrow 2 (staggered) */}
                        <path
                          d="M -8 -5 L 0 0 L -8 5"
                          fill="none"
                          stroke="#f3e8ff"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <animateMotion
                            path={w.path}
                            dur="1.1s"
                            begin="0.55s"
                            repeatCount="indefinite"
                            rotate="auto"
                          />
                        </path>
                      </g>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* 3. HARDWARE MODULES (RENDERED ON TOP OF WIRES) */}
        {/* Solid opaque PCBs conceal wires passing behind them */}
        {/* ============================================================== */}

        {/* --- 1. POWER SUPPLY SYSTEM (Left Card) --- */}
        <g
          id="power-supply-card"
          className="cursor-pointer transition-transform duration-200"
          onClick={() => onSelectComponent(selectedComponent === 'POWER_SUPPLY' ? null : 'POWER_SUPPLY')}
          onMouseEnter={() => setHoveredComponent('POWER_SUPPLY')}
          onMouseLeave={() => setHoveredComponent(null)}
        >
          {/* Solid Card Background & Border */}
          <rect
            x="24"
            y="210"
            width="400"
            height="340"
            rx="16"
            fill="#0F172A"
            stroke={selectedComponent === 'POWER_SUPPLY' || hoveredComponent === 'POWER_SUPPLY' ? '#f87171' : '#b91c1c'}
            strokeWidth={selectedComponent === 'POWER_SUPPLY' ? '2.5' : '2'}
          />

          {/* Card Header */}
          <text x="40" y="240" fill="#ef4444" fontSize="16" fontWeight="bold" fontFamily="monospace">
            1. Power Supply System
          </text>
          <text x="40" y="260" fill="#fca5a5" fontSize="11" fontFamily="sans-serif">
            (18650 Li-ion + Regulated Converter Only)
          </text>

          {/* 18650 Li-ion Battery Cylinder */}
          <g transform="translate(48, 280)">
            {/* Battery Body */}
            <rect x="0" y="10" width="70" height="150" rx="10" fill="url(#batteryLiIon)" stroke="#1e40af" strokeWidth="2" />
            {/* Positive Terminal Nipple (BAT+) */}
            <rect x="24" y="0" width="22" height="10" rx="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
            {/* Battery Label Text */}
            <text x="35" y="65" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
              18650
            </text>
            <text x="35" y="85" textAnchor="middle" fill="#93c5fd" fontSize="10" fontFamily="sans-serif">
              {batteryVoltage.toFixed(2)}V
            </text>
            <text x="35" y="102" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="sans-serif">
              2600mAh
            </text>
            <text x="35" y="120" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif">
              Li-ion
            </text>
            {/* Battery Charge Bar */}
            <rect x="15" y="132" width="40" height="6" rx="3" fill="#1e293b" />
            <rect x="15" y="132" width={(40 * batteryPct) / 100} height="6" rx="3" fill="#10b981" />
            <text x="35" y="152" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontFamily="monospace">
              {batteryPct}%
            </text>
          </g>

          {/* Internal Battery Leads to DC-DC Converter (Static Red & Black, No Flow Animation) */}
          {/* BAT+ (83, 280) -> IN+ (178, 334) : Pure Static Red Wire */}
          <path
            d="M 83 280 C 83 235, 178 235, 178 334"
            fill="none"
            stroke="#ef4444"
            strokeWidth="3.4"
            strokeLinecap="round"
          />

          {/* BAT- (83, 440) -> IN- (178, 406) : Pure Static Black Ground Wire */}
          <path
            d="M 83 440 C 83 475, 178 475, 178 406"
            fill="none"
            stroke="#111827"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          {/* Subtle outline for visibility against dark card */}
          <path
            d="M 83 440 C 83 475, 178 475, 178 406"
            fill="none"
            stroke="#475569"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* DC-DC Step-Up Boost & Step-Down Buck Converter PCB */}
          <g transform="translate(170, 310)">
            <rect x="0" y="0" width="160" height="120" rx="8" fill="url(#regulatorPcb)" stroke="#38bdf8" strokeWidth="1.5" />
            {/* Mounting holes */}
            <circle cx="8" cy="8" r="3.5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            <circle cx="152" cy="8" r="3.5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            <circle cx="8" cy="112" r="3.5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            <circle cx="152" cy="112" r="3.5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />

            {/* Toroidal Power Inductor (220) */}
            <circle cx="108" cy="55" r="26" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <circle cx="108" cy="55" r="23" fill="#0f172a" />
            <text x="108" y="60" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold" fontFamily="monospace">
              220
            </text>

            {/* Switching Regulator IC & Capacitors */}
            <rect x="36" y="32" width="30" height="24" rx="2" fill="#020617" stroke="#475569" strokeWidth="1" />
            <circle cx="44" cy="74" r="8" fill="#475569" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="64" cy="74" r="8" fill="#475569" stroke="#cbd5e1" strokeWidth="1" />

            {/* 7-Segment Digital Output Voltage Display */}
            <rect x="25" y="90" width="55" height="22" rx="3" fill="#000000" stroke="#7f1d1d" strokeWidth="1" />
            <text x="52" y="106" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold" fontFamily="monospace">
              5.01V
            </text>

            {/* Subtitle */}
            <text x="80" y="138" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
              DC-DC Regulated Converter
            </text>
          </g>

          {/* Gold Pin Pads where wires emerge and connect: */}
          {/* BAT+ Terminal */}
          <g
            transform="translate(83, 280)"
            onMouseEnter={() => setHoveredPin({ comp: '18650 Battery', pin: 'BAT+' })}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <circle cx="0" cy="0" r="5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
            <circle cx="0" cy="0" r="2.5" fill="#090D13" />
            <text x="0" y="-10" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold" fontFamily="monospace">BAT+</text>
          </g>

          {/* BAT- Terminal */}
          <g
            transform="translate(83, 440)"
            onMouseEnter={() => setHoveredPin({ comp: '18650 Battery', pin: 'BAT-' })}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <circle cx="0" cy="0" r="5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
            <circle cx="0" cy="0" r="2.5" fill="#090D13" />
            <text x="0" y="16" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">BAT-</text>
          </g>

          {/* IN+ Terminal on Regulator */}
          <g
            transform="translate(178, 334)"
            onMouseEnter={() => setHoveredPin({ comp: 'Boost/Buck Regulator', pin: 'IN+' })}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <circle cx="0" cy="0" r="5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
            <circle cx="0" cy="0" r="2.5" fill="#090D13" />
            <text x="14" y="3" fill="#ef4444" fontSize="8" fontWeight="bold" fontFamily="monospace">IN+</text>
          </g>

          {/* IN- Terminal on Regulator */}
          <g
            transform="translate(178, 406)"
            onMouseEnter={() => setHoveredPin({ comp: 'Boost/Buck Regulator', pin: 'IN-' })}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <circle cx="0" cy="0" r="5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
            <circle cx="0" cy="0" r="2.5" fill="#090D13" />
            <text x="14" y="3" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="monospace">IN-</text>
          </g>

          {/* Regulated Output Terminal Sockets */}
          {/* 5V Terminal Socket (Red) */}
          <g
            transform="translate(350, 310)"
            onMouseEnter={() => setHoveredPin({ comp: 'Regulator 5V Terminal', pin: '5V' })}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <circle cx="0" cy="0" r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="2" filter="url(#powerGlow)" />
            <circle cx="0" cy="0" r="4" fill="#ffffff" />
            <text x="0" y="-16" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="bold" fontFamily="monospace">
              5V Reg
            </text>
          </g>

          {/* 3.3V Terminal Socket (Yellow) */}
          <g
            transform="translate(390, 310)"
            onMouseEnter={() => setHoveredPin({ comp: 'Regulator 3.3V Terminal', pin: '3.3V' })}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <circle cx="0" cy="0" r="10" fill="#facc15" stroke="#ffffff" strokeWidth="2" filter="url(#powerGlow)" />
            <circle cx="0" cy="0" r="4" fill="#ffffff" />
            <text x="0" y="-16" textAnchor="middle" fill="#facc15" fontSize="13" fontWeight="bold" fontFamily="monospace">
              3.3V Reg
            </text>
          </g>

          {/* Common Ground Socket (Dark) */}
          <g
            transform="translate(350, 430)"
            onMouseEnter={() => setHoveredPin({ comp: 'Power Supply Ground', pin: 'GND' })}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <circle cx="0" cy="0" r="9" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <circle cx="0" cy="0" r="3.5" fill="#cbd5e1" />
            <text x="0" y="20" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" fontFamily="monospace">
              GND Bus
            </text>
          </g>
        </g>

        {/* --- 2. GPS MODULE (NEO-6M) (Top Center Card Above ESP32) --- */}
        <g
          id="gps-card"
          className="cursor-pointer transition-transform duration-200"
          onClick={() => onSelectComponent(selectedComponent === 'GPS' ? null : 'GPS')}
          onMouseEnter={() => setHoveredComponent('GPS')}
          onMouseLeave={() => setHoveredComponent(null)}
        >
          {/* Solid Card Background */}
          <rect
            x="480"
            y="20"
            width="280"
            height="270"
            rx="16"
            fill="#0F172A"
            stroke={selectedComponent === 'GPS' || hoveredComponent === 'GPS' ? '#4ade80' : '#22c55e'}
            strokeWidth={selectedComponent === 'GPS' ? '2.5' : '2'}
          />

          {/* Header */}
          <text x="620" y="50" textAnchor="middle" fill="#22c55e" fontSize="16" fontWeight="bold" fontFamily="monospace">
            GPS Module
          </text>
          <text x="620" y="68" textAnchor="middle" fill="#86efac" fontSize="11" fontFamily="sans-serif">
            (NEO-6M Satellite Receiver)
          </text>

          {/* Blue PCB Board */}
          <g transform="translate(515, 80)">
            <rect x="0" y="0" width="210" height="150" rx="8" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="3" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="200" cy="10" r="3" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="10" cy="140" r="3" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="200" cy="140" r="3" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />

            {/* NEO-6M Metal Shield IC */}
            <rect x="20" y="24" width="70" height="85" rx="4" fill="url(#metalShield)" stroke="#cbd5e1" strokeWidth="1.5" />
            <text x="55" y="70" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold" fontFamily="monospace">
              NEO-6M
            </text>

            {/* Ceramic Patch Antenna with Gold Pin */}
            <rect x="105" y="20" width="90" height="90" rx="6" fill="url(#ceramicAntenna)" stroke="#a16207" strokeWidth="2" />
            <circle cx="150" cy="65" r="5" fill="#ca8a04" stroke="#713f12" strokeWidth="1" />

            {/* PPS Fix LED */}
            <circle
              cx="18"
              cy="20"
              r="4"
              fill={gpsEnabled && isRunning ? '#22c55e' : '#475569'}
              filter={gpsEnabled && isRunning ? 'url(#dataGlow)' : undefined}
            />

            {/* Live Telemetry Pill */}
            <rect x="20" y="116" width="170" height="18" rx="4" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
            <text x="105" y="129" textAnchor="middle" fill="#67e8f9" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
              {gpsEnabled ? '25.4585°N, 78.5765°E • 9 Sats 3D' : 'GPS Offline / Disabled'}
            </text>
          </g>

          {/* Terminal Pin Pads on GPS Module (VCC: 555, GND: 595, TX: 640, RX: 685; y = 220) */}
          {[
            { pin: 'VCC', x: 555, col: '#ef4444' },
            { pin: 'GND', x: 595, col: '#94a3b8' },
            { pin: 'TX',  x: 640, col: '#38bdf8' },
            { pin: 'RX',  x: 685, col: '#facc15' },
          ].map((p) => (
            <g
              key={`gps-pin-${p.pin}`}
              transform={`translate(${p.x}, 220)`}
              onMouseEnter={() => setHoveredPin({ comp: 'NEO-6M GPS Module', pin: p.pin })}
              onMouseLeave={() => setHoveredPin(null)}
            >
              <circle cx="0" cy="0" r="5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <circle cx="0" cy="0" r="2.5" fill="#090D13" />
              <text x="0" y="14" textAnchor="middle" fill={p.col} fontSize="9" fontWeight="bold" fontFamily="monospace">
                {p.pin}
              </text>
            </g>
          ))}
        </g>

        {/* --- 3. CENTRE: ESP32 DevKit V1 --- */}
        <g
          id="esp32-centre"
          className="cursor-pointer transition-transform duration-200"
          onClick={() => onSelectComponent(selectedComponent === 'ESP32' ? null : 'ESP32')}
          onMouseEnter={() => setHoveredComponent('ESP32')}
          onMouseLeave={() => setHoveredComponent(null)}
        >
          {/* Main PCB Board Frame */}
          <rect
            x="500"
            y="350"
            width="270"
            height="370"
            rx="12"
            fill="#090D13"
            stroke={selectedComponent === 'ESP32' || hoveredComponent === 'ESP32' ? '#38bdf8' : '#334155'}
            strokeWidth={selectedComponent === 'ESP32' ? '2.5' : '2'}
          />

          {/* 4 Corner Screws */}
          <circle cx="512" cy="362" r="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="758" cy="362" r="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="512" cy="708" r="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="758" cy="708" r="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />

          {/* Top Title on PCB */}
          <text x="635" y="375" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="monospace">
            ESP32 DevKit V1
          </text>

          {/* ESP-WROOM-32 Metal RF Shield */}
          <rect x="560" y="395" width="150" height="155" rx="6" fill="url(#espShield)" stroke="#cbd5e1" strokeWidth="1.5" />
          {/* Antenna Serpentine Trace */}
          <path d="M575 405 h120 v10 h-10 v-5 h-20 v5 h-20 v-5 h-20 v5 h-20 v-5 h-20 v10" fill="none" stroke="#ca8a04" strokeWidth="1.5" />
          <text x="635" y="460" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="bold" fontFamily="monospace">
            ESP32
          </text>
          <text x="635" y="480" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
            DevKit V1
          </text>
          <text x="635" y="500" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
            ESP-WROOM-32
          </text>
          <text x="635" y="514" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
            Dual Core 240MHz
          </text>

          {/* Live CPU Telemetry Pill */}
          <rect x="545" y="530" width="180" height="20" rx="4" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
          <text x="635" y="544" textAnchor="middle" fill={statusColor} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
            {constructionStatus === 'ACTIVE' ? 'STATUS: ACTIVE WORK ZONE' : 'STATUS: WORK COMPLETED'}
          </text>

          {/* USB UART Bridge IC */}
          <rect x="615" y="580" width="40" height="30" rx="3" fill="#020617" stroke="#475569" strokeWidth="1" />

          {/* Micro-USB Port at Bottom */}
          <rect x="618" y="690" width="34" height="26" rx="3" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
          <rect x="625" y="696" width="20" height="14" rx="1.5" fill="#1e293b" />

          {/* Push Buttons EN & BOOT with reset capability */}
          <g
            transform="translate(555, 680)"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (onRebootEsp32) onRebootEsp32();
            }}
          >
            <rect x="0" y="0" width="20" height="20" rx="3" fill="#334155" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="10" cy="10" r="5" fill="#64748b" />
            <text x="10" y="32" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">EN</text>
          </g>

          <g transform="translate(695, 680)">
            <rect x="0" y="0" width="20" height="20" rx="3" fill="#334155" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="10" cy="10" r="5" fill="#64748b" />
            <text x="10" y="32" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">BOOT</text>
          </g>

          {/* Power Red LED & Blue Status LED */}
          <circle cx="568" cy="570" r="3.5" fill="#ef4444" filter="url(#powerGlow)" />
          <circle
            cx="568"
            cy="590"
            r="3.5"
            fill={isEsp32Active ? '#38bdf8' : '#1e3a8a'}
            filter={isEsp32Active ? 'url(#dataGlow)' : undefined}
          />

          {/* LEFT PIN HEADER (x = 514, y = 395 + idx * 20 + 6) */}
          <g>
            {[
              { pin: '3V3', color: '#facc15' },
              { pin: 'EN',  color: '#94a3b8' },
              { pin: 'VP',  color: '#94a3b8' },
              { pin: 'VN',  color: '#94a3b8' },
              { pin: '34',  color: '#94a3b8' },
              { pin: '35',  color: '#94a3b8' },
              { pin: '32',  color: '#94a3b8' },
              { pin: '33',  color: '#94a3b8' },
              { pin: '25',  color: '#94a3b8' },
              { pin: '26',  color: '#94a3b8' },
              { pin: '27',  color: '#94a3b8' },
              { pin: '12',  color: '#94a3b8' },
              { pin: 'GND', color: '#94a3b8' },
              { pin: 'VIN', color: '#ef4444' },
            ].map((p, idx) => {
              const py = 395 + idx * 20 + 6;
              return (
                <g
                  key={`esp-left-${p.pin}-${idx}`}
                  transform={`translate(514, ${py})`}
                  onMouseEnter={() => setHoveredPin({ comp: 'ESP32 DevKit V1', pin: p.pin })}
                  onMouseLeave={() => setHoveredPin(null)}
                >
                  <circle cx="0" cy="0" r="4.5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
                  <circle cx="0" cy="0" r="2.2" fill="#090D13" />
                  <text x="14" y="3" fill={p.color} fontSize="9" fontWeight="bold" fontFamily="monospace">
                    {p.pin}
                  </text>
                </g>
              );
            })}
          </g>

          {/* RIGHT PIN HEADER (x = 756, y = 395 + idx * 20 + 6) */}
          <g>
            {[
              { pin: 'GND', color: '#94a3b8' },
              { pin: '23',  color: '#94a3b8' },
              { pin: '22',  color: '#facc15' }, // SIM7600 RX
              { pin: 'TX0', color: '#facc15' },
              { pin: 'RX0', color: '#38bdf8' },
              { pin: '21',  color: '#38bdf8' }, // SIM7600 TX
              { pin: '19',  color: '#94a3b8' },
              { pin: '18',  color: '#94a3b8' },
              { pin: '17',  color: '#facc15' }, // GPS RX
              { pin: '16',  color: '#38bdf8' }, // GPS TX
              { pin: '4',   color: '#94a3b8' },
              { pin: '2',   color: '#94a3b8' },
              { pin: '15',  color: '#94a3b8' },
              { pin: 'GND', color: '#94a3b8' },
            ].map((p, idx) => {
              const py = 395 + idx * 20 + 6;
              return (
                <g
                  key={`esp-right-${p.pin}-${idx}`}
                  transform={`translate(756, ${py})`}
                  onMouseEnter={() => setHoveredPin({ comp: 'ESP32 DevKit V1', pin: p.pin })}
                  onMouseLeave={() => setHoveredPin(null)}
                >
                  <circle cx="0" cy="0" r="4.5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
                  <circle cx="0" cy="0" r="2.2" fill="#090D13" />
                  <text x="-12" y="3" textAnchor="end" fill={p.color} fontSize="9" fontWeight="bold" fontFamily="monospace">
                    {p.pin}
                  </text>
                </g>
              );
            })}
          </g>
        </g>

        {/* --- 4. 4G/LTE MODULE (SIM7600) (Right Card) --- */}
        <g
          id="sim7600-card"
          className="cursor-pointer transition-transform duration-200"
          onClick={() => onSelectComponent(selectedComponent === 'SIM7600' ? null : 'SIM7600')}
          onMouseEnter={() => setHoveredComponent('SIM7600')}
          onMouseLeave={() => setHoveredComponent(null)}
        >
          {/* Solid Card Background */}
          <rect
            x="840"
            y="260"
            width="310"
            height="270"
            rx="16"
            fill="#0F172A"
            stroke={selectedComponent === 'SIM7600' || hoveredComponent === 'SIM7600' ? '#38bdf8' : '#0284c7'}
            strokeWidth={selectedComponent === 'SIM7600' ? '2.5' : '2'}
          />

          {/* Header */}
          <text x="995" y="295" textAnchor="middle" fill="#0284c7" fontSize="16" fontWeight="bold" fontFamily="monospace">
            4. 4G/LTE Module
          </text>
          <text x="995" y="315" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontFamily="sans-serif">
            (SIM7600 Cellular Modem)
          </text>

          {/* Breakout PCB Board */}
          <g transform="translate(865, 335)">
            <rect x="0" y="0" width="220" height="160" rx="8" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="8" cy="8" r="3.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="212" cy="8" r="3.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="8" cy="152" r="3.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="212" cy="152" r="3.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />

            {/* SIM7600 Metal Shield IC */}
            <rect x="40" y="15" width="140" height="110" rx="4" fill="url(#metalShield)" stroke="#cbd5e1" strokeWidth="1.5" />
            <rect x="50" y="24" width="24" height="12" rx="2" fill="#ef4444" />
            <text x="62" y="33" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="sans-serif">SIM</text>

            <text x="110" y="44" textAnchor="middle" fill="#0f172a" fontSize="13" fontWeight="bold" fontFamily="monospace">
              SIM7600
            </text>
            <text x="110" y="65" textAnchor="middle" fill="#1e293b" fontSize="8" fontFamily="monospace">
              LTE Cat-1 / Cat-4
            </text>
            <text x="110" y="78" textAnchor="middle" fill="#1e293b" fontSize="8" fontFamily="monospace">
              AT Commands Uplink
            </text>
            <text x="110" y="90" textAnchor="middle" fill="#334155" fontSize="8" fontFamily="monospace">
              UART 115200 Baud
            </text>

            {/* Gold SMA Connector on Right */}
            <rect x="210" y="45" width="16" height="24" rx="2" fill="#eab308" stroke="#854d0e" strokeWidth="1" />
            {/* Rubber Ducky Antenna with RF Radiation Waves */}
            <g transform="translate(226, -50)">
              <rect x="4" y="0" width="14" height="120" rx="7" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
              <rect x="2" y="90" width="18" height="20" rx="3" fill="#334155" />
              {/* Concentric RF Waves radiating from antenna tip into air */}
              {isLteActive && (
                <g transform="translate(11, 8)">
                  <circle cx="0" cy="0" r="3.5" fill="#38bdf8" />
                  <circle cx="0" cy="0" r="8" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.8">
                    <animate attributeName="r" values="3.5;16" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="0" cy="0" r="8" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.8">
                    <animate attributeName="r" values="3.5;24" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
                  </circle>
                </g>
              )}
            </g>

            {/* Live Signal Telemetry Pill */}
            <rect x="15" y="128" width="190" height="18" rx="4" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
            <text x="110" y="141" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace">
              {lteEnabled ? 'LTE B3 • CSQ: 24 (-68dBm) • IP: 10.42.19.82' : 'Modem Powered Down'}
            </text>
          </g>

          {/* Terminal Pin Pads on SIM7600 (VCC: 910, GND: 960, TX: 1010, RX: 1055; y = 483) */}
          {[
            { pin: 'VCC', x: 910, col: '#ef4444' },
            { pin: 'GND', x: 960, col: '#94a3b8' },
            { pin: 'TX',  x: 1010, col: '#38bdf8' },
            { pin: 'RX',  x: 1055, col: '#facc15' },
          ].map((p) => (
            <g
              key={`sim-pin-${p.pin}`}
              transform={`translate(${p.x}, 483)`}
              onMouseEnter={() => setHoveredPin({ comp: 'SIM7600 4G/LTE', pin: p.pin })}
              onMouseLeave={() => setHoveredPin(null)}
            >
              <circle cx="0" cy="0" r="5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <circle cx="0" cy="0" r="2.5" fill="#090D13" />
              <text x="0" y="14" textAnchor="middle" fill={p.col} fontSize="9" fontWeight="bold" fontFamily="monospace">
                {p.pin}
              </text>
            </g>
          ))}
        </g>

        {/* --- 5. INTERNET CONNECTION INDICATOR --- */}
        <g
          id="internet-card"
          className="cursor-pointer transition-transform duration-200"
          onClick={() => onSelectComponent(selectedComponent === 'INTERNET' ? null : 'INTERNET')}
          onMouseEnter={() => setHoveredComponent('INTERNET')}
          onMouseLeave={() => setHoveredComponent(null)}
        >
          {/* Card Background */}
          <rect
            x="1190"
            y="290"
            width="170"
            height="210"
            rx="16"
            fill="#0F172A"
            stroke={selectedComponent === 'INTERNET' || hoveredComponent === 'INTERNET' ? '#38bdf8' : '#0ea5e9'}
            strokeWidth={selectedComponent === 'INTERNET' ? '2.5' : '2'}
          />

          {/* Header */}
          <text x="1275" y="322" textAnchor="middle" fill="#38bdf8" fontSize="15" fontWeight="bold" fontFamily="monospace">
            5. Internet
          </text>
          <text x="1275" y="340" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontFamily="sans-serif">
            (Cellular IP Uplink)
          </text>

          {/* Radio Waves & Globe */}
          <g transform="translate(1275, 410)">
            <path
              d="M-55 -25 A60 60 0 0 0 -55 25"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={isInternetActive ? 'animate-pulse' : undefined}
            />
            <path
              d="M-40 -18 A45 45 0 0 0 -40 18"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={isInternetActive ? 'animate-pulse' : undefined}
            />
            <path
              d="M55 -25 A60 60 0 0 1 55 25"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={isInternetActive ? 'animate-pulse' : undefined}
            />
            <path
              d="M40 -18 A45 45 0 0 1 40 18"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={isInternetActive ? 'animate-pulse' : undefined}
            />

            <circle cx="0" cy="0" r="26" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" filter={isInternetActive ? 'url(#dataGlow)' : undefined} />
            <ellipse cx="0" cy="0" rx="14" ry="26" fill="none" stroke="#7dd3fc" strokeWidth="1.5" />
            <line x1="-26" y1="0" x2="26" y2="0" stroke="#7dd3fc" strokeWidth="1.5" />
            <line x1="-22" y1="-12" x2="22" y2="-12" stroke="#7dd3fc" strokeWidth="1.2" />
            <line x1="-22" y1="12" x2="22" y2="12" stroke="#7dd3fc" strokeWidth="1.2" />
          </g>

          <text x="1275" y="475" textAnchor="middle" fill="#bae6fd" fontSize="10" fontFamily="sans-serif">
            {lteEnabled ? 'Online (5G / 4G)' : 'Disconnected'}
          </text>
        </g>

        {/* --- 6. FAR RIGHT: BACKEND SERVER / CLOUD --- */}
        <g
          id="cloud-backend-card"
          className="cursor-pointer transition-transform duration-200"
          onClick={() => onSelectComponent(selectedComponent === 'CLOUD' ? null : 'CLOUD')}
          onMouseEnter={() => setHoveredComponent('CLOUD')}
          onMouseLeave={() => setHoveredComponent(null)}
        >
          {/* Card Background */}
          <rect
            x="1405"
            y="260"
            width="180"
            height="270"
            rx="16"
            fill="#0F172A"
            stroke={selectedComponent === 'CLOUD' || hoveredComponent === 'CLOUD' ? '#c084fc' : '#a855f7'}
            strokeWidth={selectedComponent === 'CLOUD' ? '2.5' : '2'}
          />

          {/* Header */}
          <text x="1495" y="295" textAnchor="middle" fill="#c084fc" fontSize="15" fontWeight="bold" fontFamily="monospace">
            6. Backend Cloud
          </text>
          <text x="1495" y="315" textAnchor="middle" fill="#e9d5ff" fontSize="11" fontFamily="sans-serif">
            (RoutePilot Server)
          </text>

          {/* Server Rack Visualization */}
          <g transform="translate(1425, 335)">
            <rect x="0" y="0" width="140" height="135" rx="6" fill="#1e1b4b" stroke="#7e22ce" strokeWidth="1.5" />
            {/* 3 Rack Units */}
            {[0, 42, 84].map((ry, idx) => (
              <g key={`rack-${idx}`} transform={`translate(8, ${ry + 8})`}>
                <rect x="0" y="0" width="124" height="30" rx="3" fill="#0f172a" stroke="#4c1d95" strokeWidth="1" />
                {/* Status LEDs */}
                <circle cx="14" cy="15" r="3" fill={isCloudActive ? '#22c55e' : '#475569'} />
                <circle cx="26" cy="15" r="3" fill={isRunning ? '#38bdf8' : '#1e3a8a'} />
                <circle cx="38" cy="15" r="3" fill="#facc15" />
                {/* Ventilation slots */}
                <line x1="55" y1="12" x2="110" y2="12" stroke="#334155" strokeWidth="2" strokeDasharray="4 3" />
                <line x1="55" y1="18" x2="110" y2="18" stroke="#334155" strokeWidth="2" strokeDasharray="4 3" />
              </g>
            ))}
          </g>

          <text x="1495" y="500" textAnchor="middle" fill="#c084fc" fontSize="10" fontWeight="bold" fontFamily="monospace">
            /api/v1/road-hazards
          </text>
          <text x="1495" y="516" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
            HTTP 200 OK • Ingested
          </text>
        </g>
      </svg>

      {/* ============================================================== */}
      {/* 4. BOTTOM INTERACTIVE STATUS & WIRE INSPECTOR HUD */}
      {/* ============================================================== */}
      <div className="w-full px-4 py-2 bg-[#161B22]/95 border-t border-[#30363D] flex items-center justify-between gap-3 text-xs shrink-0 backdrop-blur-md">
        {/* Wire & Pin Inspector */}
        <div className="flex items-center gap-2 overflow-hidden">
          {hoveredWire ? (
            <div className="flex items-center gap-2 font-mono text-[11px] animate-fadeIn">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredWire.color }} />
              <span className={`font-bold ${hoveredWire.signalType.includes('WIRELESS') ? 'text-sky-400' : 'text-white'}`}>
                {hoveredWire.signalType.includes('WIRELESS') ? 'WIRELESS LINK:' : 'WIRE:'}
              </span>
              <span className="text-slate-300">{hoveredWire.description}</span>
              <span className={`px-1.5 py-0.2 rounded border ${
                hoveredWire.signalType.includes('WIRELESS')
                  ? 'bg-sky-950/60 text-sky-300 border-sky-800'
                  : 'bg-[#21262D] text-[#AEF5F0] border-[#30363D]'
              }`}>
                {hoveredWire.voltage}
              </span>
              <span className="text-slate-400">({hoveredWire.signalType})</span>
            </div>
          ) : hoveredPin ? (
            <div className="flex items-center gap-2 font-mono text-[11px] animate-fadeIn">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="font-bold text-white">TERMINAL:</span>
              <span className="text-amber-300 font-bold">{hoveredPin.comp} → {hoveredPin.pin}</span>
            </div>
          ) : null}
        </div>

        {/* Stage Pulse Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-500 hidden lg:inline">
            Hover any wire or terminal to inspect connections
          </span>
          <div className="px-2 py-0.5 rounded bg-[#21262D] border border-[#30363D] text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
              }`}
            />
            <span>STAGE: {transmissionStage}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
