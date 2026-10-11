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
          {/* Subtle PCB dot grid pattern */}
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
        {/* 2. CARD BACKGROUND FRAMES (Rendered before wires so wires pass */}
        {/* cleanly across card boundaries and inside cards) */}
        {/* ============================================================== */}
        <g id="card-backgrounds">
          {/* Card 1 Frame: Power Supply System (x: 24, y: 210, w: 400, h: 340) */}
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

          {/* Card 2 Frame: GPS Module (NEO-6M) (x: 480, y: 20, w: 280, h: 270) */}
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

          {/* Card 3 Frame: ESP32 DevKit V1 (x: 500, y: 350, w: 270, h: 370) */}
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

          {/* Card 4 Frame: 4G/LTE Module SIM7600 (x: 840, y: 260, w: 310, h: 270) */}
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

          {/* Card 5 Frame: Backend Server (x: 1340, y: 260, w: 240, h: 270) */}
          <rect
            x="1340"
            y="260"
            width="240"
            height="270"
            rx="14"
            fill="#0F172A"
            stroke={selectedComponent === 'CLOUD' || selectedComponent === 'BACKEND' || hoveredComponent === 'CLOUD' ? '#AEF5F0' : '#0284c7'}
            strokeWidth="1.8"
          />
        </g>

        {/* ============================================================== */}
        {/* 3. WIRES LAYER (DRAWN FROM SINGLE SOURCE OF TRUTH) */}
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
              (w.signalType.startsWith('POWER') ||
                w.signalType === 'GND' ||
                (w.sourceComponent.includes('GPS') && isGpsActive) ||
                (w.sourceComponent.includes('ESP32') && isEsp32Active) ||
                (w.sourceComponent.includes('SIM7600') && isLteActive) ||
                (w.sourceComponent.includes('Internet') && isInternetActive));

            const isBatteryWire = w.id === 'w-batt-pos' || w.id === 'w-batt-neg';
            const isCellularToInternet = w.id === 'w-sim-internet';
            const isInternetToCloud = w.id === 'w-internet-cloud';
            const isLogicalLink = isCellularToInternet || isInternetToCloud;

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
                    stroke={w.color === '#1e293b' ? '#64748b' : w.color}
                    strokeWidth="8"
                    strokeOpacity="0.5"
                    filter="url(#wireGlow)"
                  />
                )}

                {/* Physical Copper Wire: High-contrast outline for dark ground wires */}
                {w.signalType === 'GND' && (
                  <path
                    d={w.path}
                    fill="none"
                    stroke="#475569"
                    strokeWidth={isHighlighted ? 4.5 : 3.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Base wire physical trace - for real physical wired connections */}
                {!isLogicalLink && (
                  <path
                    d={w.path}
                    fill="none"
                    stroke={w.color === '#1e293b' ? '#0f172a' : w.color}
                    strokeWidth={isHighlighted ? 3.6 : isBatteryWire ? 3.2 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Logical Over-The-Air line-of-sight path (Ethereal dashed trace, NO physical copper wire) */}
                {isLogicalLink && (
                  <path
                    d={w.path}
                    fill="none"
                    stroke={isCellularToInternet ? '#38bdf8' : '#c084fc'}
                    strokeWidth={isHighlighted ? 2.5 : 1.8}
                    strokeDasharray="4 6"
                    strokeOpacity={isHighlighted ? 0.95 : 0.4}
                  />
                )}

                {/* Standard signal pulse animation for active physical wires (excluding static battery wires and logical links) */}
                {isWireActive && !isBatteryWire && !isLogicalLink && (
                  <path
                    d={w.path}
                    fill="none"
                    stroke={w.signalType === 'GND' ? '#94a3b8' : '#ffffff'}
                    strokeWidth={isHighlighted ? 2.8 : 2}
                    strokeDasharray="6 24"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from={w.direction === 'DEST_TO_SRC' ? '-120' : '120'}
                      to="0"
                      dur={w.signalType.startsWith('UART') ? '1.1s' : '2.0s'}
                      repeatCount="indefinite"
                    />
                  </path>
                )}

                {/* SIM7600 -> Internet: Over-the-air RF waves & flying directional packets */}
                {isCellularToInternet && (
                  <g>
                    {/* Concentric RF Radio Wave Arcs emitting from Antenna tip */}
                    <g opacity={isLteActive ? 0.95 : 0.35}>
                      <path d="M 1115 335 A 16 16 0 0 1 1115 365" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round">
                        {isLteActive && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0s" />}
                      </path>
                      <path d="M 1128 328 A 28 28 0 0 1 1128 375" fill="none" stroke="#38bdf8" strokeWidth="2.0" strokeLinecap="round">
                        {isLteActive && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.3s" />}
                      </path>
                      <path d="M 1142 322 A 42 42 0 0 1 1142 385" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round">
                        {isLteActive && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.6s" />}
                      </path>
                    </g>

                    {/* Animated moving wireless packet arrows flying along the path */}
                    {isLteActive && (
                      <g>
                        <path
                          d="M -6 -4 L 0 0 L -6 4"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <animateMotion path={w.path} dur="1.0s" repeatCount="indefinite" rotate="auto" />
                        </path>
                        <path
                          d="M -6 -4 L 0 0 L -6 4"
                          fill="none"
                          stroke="#bae6fd"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <animateMotion path={w.path} dur="1.0s" begin="0.5s" repeatCount="indefinite" rotate="auto" />
                        </path>
                      </g>
                    )}
                  </g>
                )}

                {/* Internet -> Backend Cloud: Directed REST packet stream */}
                {isInternetToCloud && isInternetActive && (
                  <g>
                    <path
                      d="M -6 -4 L 0 0 L -6 4"
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <animateMotion path={w.path} dur="0.8s" repeatCount="indefinite" rotate="auto" />
                    </path>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* 4. HARDWARE MODULES DETAILS & LABELS LAYER */}
        {/* ============================================================== */}

        {/* --- 1. POWER SUPPLY SYSTEM (Left Card: x=24, y=210) --- */}
        <g
          id="power-supply-card"
          className="cursor-pointer transition-transform duration-200"
          onClick={() => onSelectComponent(selectedComponent === 'POWER_SUPPLY' ? null : 'POWER_SUPPLY')}
          onMouseEnter={() => setHoveredComponent('POWER_SUPPLY')}
          onMouseLeave={() => setHoveredComponent(null)}
        >
          {/* Card Header */}
          <text x="40" y="240" fill="#ef4444" fontSize="16" fontWeight="bold" fontFamily="monospace">
            1. Power Supply System
          </text>
          <text x="40" y="260" fill="#fca5a5" fontSize="11" fontFamily="sans-serif">
            (18650 Li-ion + Regulated Boost/Buck-Boost Converter)
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
              Li-ion Cell
            </text>
            {/* Battery Charge Bar */}
            <rect x="15" y="132" width="40" height="6" rx="3" fill="#1e293b" />
            <rect x="15" y="132" width={(40 * batteryPct) / 100} height="6" rx="3" fill="#10b981" />
            <text x="35" y="152" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontFamily="monospace">
              {batteryPct}%
            </text>
          </g>

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
              Boost / Buck-Boost Converter
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
            onMouseEnter={() => setHoveredPin({ comp: 'DC-DC Converter', pin: 'IN+' })}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <circle cx="0" cy="0" r="5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
            <circle cx="0" cy="0" r="2.5" fill="#090D13" />
            <text x="14" y="3" fill="#ef4444" fontSize="8" fontWeight="bold" fontFamily="monospace">IN+</text>
          </g>

          {/* IN- Terminal on Regulator */}
          <g
            transform="translate(178, 406)"
            onMouseEnter={() => setHoveredPin({ comp: 'DC-DC Converter', pin: 'IN-' })}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <circle cx="0" cy="0" r="5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
            <circle cx="0" cy="0" r="2.5" fill="#090D13" />
            <text x="14" y="3" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="monospace">IN-</text>
          </g>

          {/* Regulated Output Terminal Sockets */}
          {/* 3.3V Terminal Socket (Yellow) - positioned higher towards GPS */}
          <g
            transform="translate(385, 280)"
            onMouseEnter={() => setHoveredPin({ comp: 'Regulator 3.3V Terminal', pin: '3.3V' })}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <circle cx="0" cy="0" r="10" fill="#facc15" stroke="#ffffff" strokeWidth="2" filter="url(#powerGlow)" />
            <circle cx="0" cy="0" r="4" fill="#ffffff" />
            <text x="0" y="-16" textAnchor="middle" fill="#facc15" fontSize="12" fontWeight="bold" fontFamily="monospace">
              3.3V Reg
            </text>
          </g>

          {/* 5V Terminal Socket (Red) - positioned middle-right with clear vertical corridor */}
          <g
            transform="translate(350, 350)"
            onMouseEnter={() => setHoveredPin({ comp: 'Regulator 5V Terminal', pin: '5V' })}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <circle cx="0" cy="0" r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="2" filter="url(#powerGlow)" />
            <circle cx="0" cy="0" r="4" fill="#ffffff" />
            <text x="0" y="-16" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold" fontFamily="monospace">
              5V Reg (2A)
            </text>
          </g>

          {/* Common Ground Socket (Dark Slate) - offset to x=390 so vertical GND & 5V traces never overlap */}
          <g
            transform="translate(390, 430)"
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
          {/* Header */}
          <text x="620" y="50" textAnchor="middle" fill="#22c55e" fontSize="16" fontWeight="bold" fontFamily="monospace">
            2. GPS Module
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
            { pin: 'VCC', x: 555, col: '#facc15' },
            { pin: 'GND', x: 595, col: '#94a3b8' },
            { pin: 'TX',  x: 640, col: '#38bdf8' },
            { pin: 'RX',  x: 685, col: '#34d399' },
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

        {/* --- 3. CENTRE: ESP32 DevKit V1 (x=500, y=350) --- */}
        <g
          id="esp32-centre"
          className="cursor-pointer transition-transform duration-200"
          onClick={() => onSelectComponent(selectedComponent === 'ESP32' ? null : 'ESP32')}
          onMouseEnter={() => setHoveredComponent('ESP32')}
          onMouseLeave={() => setHoveredComponent(null)}
        >
          {/* Corner Screws */}
          <circle cx="512" cy="362" r="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="758" cy="362" r="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="512" cy="708" r="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="758" cy="708" r="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />

          {/* Top Title on PCB */}
          <text x="635" y="375" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="monospace">
            3. ESP32 DevKit V1
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
              { pin: '3V3', label: '3V3', color: '#facc15' },
              { pin: 'EN',  label: 'EN', color: '#94a3b8' },
              { pin: 'VP',  label: 'VP', color: '#94a3b8' },
              { pin: 'VN',  label: 'VN', color: '#94a3b8' },
              { pin: '34',  label: '34', color: '#94a3b8' },
              { pin: '35',  label: '35', color: '#94a3b8' },
              { pin: '32',  label: '32', color: '#94a3b8' },
              { pin: '33',  label: '33', color: '#94a3b8' },
              { pin: '25',  label: '25', color: '#94a3b8' },
              { pin: '26',  label: '26', color: '#94a3b8' },
              { pin: '27',  label: '27', color: '#94a3b8' },
              { pin: '12',  label: '12', color: '#94a3b8' },
              { pin: 'GND', label: 'GND', color: '#94a3b8' },
              { pin: 'VIN', label: 'VIN (5V)', color: '#ef4444' },
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
                    {p.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* RIGHT PIN HEADER (x = 756, y = 395 + idx * 20 + 6) */}
          <g>
            {[
              { pin: 'GND', label: 'GND', color: '#94a3b8' },
              { pin: '23',  label: '23', color: '#94a3b8' },
              { pin: '22',  label: '22 (TX)', color: '#34d399' }, // SIM7600 RX
              { pin: 'TX0', label: 'TX0', color: '#64748b' },
              { pin: 'RX0', label: 'RX0', color: '#64748b' },
              { pin: '21',  label: '21 (RX)', color: '#38bdf8' }, // SIM7600 TX
              { pin: '19',  label: '19', color: '#94a3b8' },
              { pin: '18',  label: '18', color: '#94a3b8' },
              { pin: '17',  label: '17 (TX2)', color: '#34d399' }, // GPS RX
              { pin: '16',  label: '16 (RX2)', color: '#38bdf8' }, // GPS TX
              { pin: '4',   label: '4', color: '#94a3b8' },
              { pin: '2',   label: '2', color: '#94a3b8' },
              { pin: '15',  label: '15', color: '#94a3b8' },
              { pin: 'GND', label: 'GND', color: '#94a3b8' },
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
                    {p.label}
                  </text>
                </g>
              );
            })}
          </g>
        </g>

        {/* --- 4. 4G/LTE MODULE (SIM7600) (Right Card: x=840, y=260) --- */}
        <g
          id="sim7600-card"
          className="cursor-pointer transition-transform duration-200"
          onClick={() => onSelectComponent(selectedComponent === 'SIM7600' ? null : 'SIM7600')}
          onMouseEnter={() => setHoveredComponent('SIM7600')}
          onMouseLeave={() => setHoveredComponent(null)}
        >
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
            { pin: 'RX',  x: 1055, col: '#34d399' },
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

        {/* ============================================================== */}
        {/* INTERNET CLOUD LINK (IN THE MIDDLE / BICH ME) */}
        {/* ============================================================== */}
        <g id="internet-middle-link">
          {/* Stream Line 1: SIM7600 Antenna to Internet Capsule */}
          <path
            d="M 1102 345 Q 1140 345 1167 395"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.0"
            strokeDasharray="4 4"
          >
            {isRunning && lteEnabled && (
              <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.8s" repeatCount="indefinite" />
            )}
          </path>

          {/* Central Internet Capsule Badge */}
          <g
            transform="translate(1235, 395)"
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => onSelectComponent(selectedComponent === 'INTERNET' ? null : 'INTERNET')}
            onMouseEnter={() => setHoveredComponent('INTERNET')}
            onMouseLeave={() => setHoveredComponent(null)}
          >
            {/* Outer Capsule Frame */}
            <rect
              x="-68"
              y="-16"
              width="136"
              height="32"
              rx="16"
              fill="#0B0F17"
              stroke={selectedComponent === 'INTERNET' || hoveredComponent === 'INTERNET' ? '#AEF5F0' : '#0284c7'}
              strokeWidth="1.6"
              filter="url(#wireGlow)"
            />

            {/* Internet Globe Symbol */}
            <g transform="translate(-48, 0)">
              <circle cx="0" cy="0" r="9" fill="#0369a1" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1.2" />
              <line x1="-9" y1="0" x2="9" y2="0" stroke="#38bdf8" strokeWidth="0.9" />
              <ellipse cx="0" cy="0" rx="4.8" ry="9" fill="none" stroke="#38bdf8" strokeWidth="0.9" />
              <line x1="0" y1="-9" x2="0" y2="9" stroke="#38bdf8" strokeWidth="0.8" />
              {isRunning && lteEnabled && (
                <circle cx="0" cy="0" r="9" fill="none" stroke="#22c55e" strokeWidth="1.2" opacity="0.8">
                  <animate attributeName="r" values="9;15;9" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
            </g>

            {/* Internet Typography Labels */}
            <text x="-32" y="-2" fill="#38bdf8" fontSize="8.5" fontWeight="bold" fontFamily="sans-serif">
              🌐 INTERNET
            </text>
            <text x="-32" y="9" fill="#94a3b8" fontSize="6.5" fontFamily="monospace">
              CELLULAR TCP-IP
            </text>

            {/* Live Link Green Status Dot */}
            <circle cx="53" cy="0" r="3" fill={lteEnabled ? '#22c55e' : '#64748b'}>
              {isRunning && lteEnabled && (
                <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
              )}
            </circle>
          </g>

          {/* Stream Line 2: Internet Capsule to Backend Server */}
          <path
            d="M 1303 395 L 1340 395"
            fill="none"
            stroke="#c084fc"
            strokeWidth="2.0"
            strokeDasharray="4 4"
          >
            {isRunning && lteEnabled && (
              <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.8s" repeatCount="indefinite" />
            )}
          </path>
          <polygon points="1340,395 1332,390 1332,400" fill="#c084fc" />
        </g>

        {/* ============================================================== */}
        {/* COMPONENT 5: Backend Server (Analyze Data & Detect Hazard) */}
        {/* ============================================================== */}
        <g
          id="comp-backend-server"
          transform="translate(1340, 260)"
          onClick={() => onSelectComponent(selectedComponent === 'CLOUD' || selectedComponent === 'BACKEND' ? null : 'CLOUD')}
          onMouseEnter={() => setHoveredComponent('CLOUD')}
          onMouseLeave={() => setHoveredComponent(null)}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          <text x="120" y="25" textAnchor="middle" fill="#38bdf8" fontSize="14" fontWeight="700" fontFamily="sans-serif">
            5. Backend Server
          </text>
          <text x="120" y="40" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            (Analyze Data & Detect Hazard)
          </text>

          {/* Rack Server Stack */}
          {[0, 1, 2].map((idx) => (
            <g key={`rack-unit-${idx}`} transform={`translate(15, ${56 + idx * 42})`}>
              <rect width="210" height="34" rx="4" fill="#090D13" stroke="#1e293b" strokeWidth="1" />
              {/* Green Healthy LED */}
              <circle cx="14" cy="17" r="3" fill="#22c55e" />
              {/* Pulsing Ingestion Activity LED */}
              <circle cx="25" cy="17" r="3" fill={isInternetActive ? '#38bdf8' : '#1e3a8a'}>
                {isInternetActive && (
                  <animate
                    attributeName="opacity"
                    values="1;0.2;1"
                    dur={`${0.6 + idx * 0.2}s`}
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              {/* Drive Bays */}
              {[42, 68, 94, 120].map((bx) => (
                <rect key={`drive-${idx}-${bx}`} x={bx} y="9" width="18" height="16" rx="2" fill="#1e293b" />
              ))}
              {/* Node Tag */}
              <text x="198" y="21" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                NODE-{idx + 1}
              </text>
              {idx === 0 && constructionStatus === 'ACTIVE' && (
                <text x="156" y="21" fill="#f97316" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                  HAZARD TRIP
                </text>
              )}
            </g>
          ))}

          {/* Telemetry Endpoint Info Pill */}
          <rect x="15" y="196" width="210" height="20" rx="4" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
          <text x="120" y="210" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace">
            /api/v1/road-hazards • HTTP 200 OK
          </text>

          {/* RoutePilot Engine Sync Status Badge */}
          <rect x="15" y="226" width="210" height="28" rx="5" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
          <text x="120" y="244" textAnchor="middle" fill="#a7f3d0" fontSize="8.5" fontWeight="bold" fontFamily="sans-serif">
            ✓ Synchronized with RoutePilot A* Engine
          </text>
        </g>
      </svg>

      {/* ============================================================== */}
      {/* 5. BOTTOM INTERACTIVE STATUS & WIRE INSPECTOR HUD */}
      {/* ============================================================== */}
      <div className="w-full px-4 py-2 bg-[#161B22]/95 border-t border-[#30363D] flex items-center justify-between gap-3 text-xs shrink-0 backdrop-blur-md">
        {/* Wire & Pin Inspector */}
        <div className="flex items-center gap-2 overflow-hidden">
          {hoveredWire ? (
            <div className="flex items-center gap-2 font-mono text-[11px] animate-fadeIn">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredWire.color }} />
              <span className={`font-bold ${hoveredWire.signalType.startsWith('LOGICAL') ? 'text-sky-400' : 'text-white'}`}>
                {hoveredWire.signalType.startsWith('LOGICAL') ? 'NETWORK LINK:' : 'WIRE:'}
              </span>
              <span className="text-slate-300">{hoveredWire.description}</span>
              <span className={`px-1.5 py-0.2 rounded border ${
                hoveredWire.signalType.startsWith('LOGICAL')
                  ? 'bg-sky-950/60 text-sky-300 border-sky-800'
                  : 'bg-[#21262D] text-[#AEF5F0] border-[#30363D]'
              }`}>
                {hoveredWire.voltage}
              </span>
              <span className="text-emerald-400 font-bold text-[10px]">
                {hoveredWire.isElectricallyValid ? '✓ Electrically Valid' : '⚠ Electrical Error'}
              </span>
            </div>
          ) : hoveredPin ? (
            <div className="flex items-center gap-2 font-mono text-[11px] animate-fadeIn">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="font-bold text-white">TERMINAL:</span>
              <span className="text-amber-300 font-bold">{hoveredPin.comp} → {hoveredPin.pin}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
              <span className="text-slate-500">⚡ Hover over any terminal or wire to audit voltage, logic level, and pin connections</span>
            </div>
          )}
        </div>

        {/* Stage Pulse Badge & Simulated Label */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[10px] font-mono font-bold text-amber-400/90 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
            SIMULATED — NOT LIVE
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
