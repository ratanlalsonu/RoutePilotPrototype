import React, { useState } from 'react';
import { HardwareSimState } from '../../../services/hardwareSimulationEngine';
import { WIRE_CONNECTIONS, PIN_MAPPINGS } from '../../../services/circuitPinMapping';
import { HardwareComponentId, WireConnection } from '../../../types/hardwareSimulation';

interface HardwareCircuitCanvasProps {
  simState: HardwareSimState;
  onSelectComponent: (comp: HardwareComponentId | null) => void;
  selectedComponent: HardwareComponentId | null;
}

export const HardwareCircuitCanvas: React.FC<HardwareCircuitCanvasProps> = ({
  simState,
  onSelectComponent,
  selectedComponent,
}) => {
  const [hoveredWire, setHoveredWire] = useState<WireConnection | null>(null);
  const [hoveredPin, setHoveredPin] = useState<{ comp: HardwareComponentId; pin: string } | null>(null);

  const { isRunning, sensorValues, thresholds } = simState;

  // Active status checks
  const mpuIsCritical = sensorValues.mpu6050.enabled && sensorValues.mpu6050.vibrationMmS >= thresholds.vibrationMmS;
  const tiltIsWarning = sensorValues.tilt.enabled && (sensorValues.tilt.isTilted || sensorValues.tilt.angleDeg >= thresholds.tiltAngleDeg);
  const waterIsBlocked = (sensorValues.hcsr04.enabled || sensorValues.waterLevel.enabled) &&
    ((sensorValues.hcsr04.waterRiseCm / 100 >= thresholds.waterLevelM) || (sensorValues.waterLevel.depthMm / 1000 >= thresholds.waterLevelM));
  const strainIsCritical = sensorValues.hx711.enabled &&
    (sensorValues.hx711.strainMicrostrain >= thresholds.strainMicrostrain || sensorValues.hx711.loadWeightKn >= thresholds.loadWeightKn);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#090D13] overflow-hidden select-none">
      {/* SVG Circuit Blueprint */}
      <svg
        viewBox="0 0 1600 780"
        className="w-full h-full max-h-full block"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Subtle circuit board dot grid pattern */}
          <pattern id="pcbGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#1f2937" fillOpacity="0.4" />
          </pattern>

          {/* Glow filters for active wires & lasers */}
          <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="hazardGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Linear gradients for metallic sensors */}
          <linearGradient id="metalBeam" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          <linearGradient id="usCan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="60%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          <linearGradient id="batteryCell" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="40%" stopColor="#3b82f6" />
            <stop offset="80%" stopColor="#1e40af" />
          </linearGradient>

          <linearGradient id="espShield" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>

        {/* Background Grid */}
        <rect width="1600" height="780" fill="#0B0F17" />
        <rect width="1600" height="780" fill="url(#pcbGrid)" />

        {/* ============================================================== */}
        {/* WIRES LAYER (Underneath components) */}
        {/* ============================================================== */}
        <g id="wires-layer">
          {WIRE_CONNECTIONS.map((w) => {
            const isHighlighted = hoveredWire?.id === w.id ||
              hoveredPin?.pin === w.sourcePin ||
              hoveredPin?.pin === w.targetPin;
            const isDimmed = hoveredWire && !isHighlighted;

            return (
              <g
                key={w.id}
                className="cursor-pointer transition-opacity duration-200"
                style={{ opacity: isDimmed ? 0.2 : 1 }}
                onMouseEnter={() => setHoveredWire(w)}
                onMouseLeave={() => setHoveredWire(null)}
              >
                {/* Thick invisible hover target */}
                <path d={w.path} fill="none" stroke="transparent" strokeWidth="14" />

                {/* Outer shadow/glow when highlighted */}
                {isHighlighted && (
                  <path
                    d={w.path}
                    fill="none"
                    stroke={w.color}
                    strokeWidth="8"
                    strokeOpacity="0.4"
                    filter="url(#wireGlow)"
                  />
                )}

                {/* Base wire line */}
                <path
                  d={w.path}
                  fill="none"
                  stroke={w.color === '#1e293b' ? '#2d3748' : w.color}
                  strokeWidth={isHighlighted ? 4 : 2.5}
                  strokeLinecap="round"
                />

                {/* Signal packet animation dots moving along active wires */}
                {isRunning && (
                  <path
                    d={w.path}
                    fill="none"
                    stroke={w.color === '#1e293b' ? '#64748b' : '#ffffff'}
                    strokeWidth={isHighlighted ? 3 : 2}
                    strokeDasharray="6 24"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="120"
                      to="0"
                      dur={w.signalType === 'I2C' || w.signalType === 'SPI' ? '1.2s' : '2.2s'}
                      repeatCount="indefinite"
                    />
                  </path>
                )}
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* COMPONENT 1: MPU6050 (Top Left) */}
        {/* ============================================================== */}
        <g
          id="comp-mpu6050"
          transform="translate(35, 25)"
          onClick={() => onSelectComponent(selectedComponent === 'mpu6050' ? null : 'mpu6050')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          {/* Card Frame */}
          <rect
            width="220"
            height="210"
            rx="12"
            fill="#161B22"
            stroke={mpuIsCritical ? '#ef4444' : selectedComponent === 'mpu6050' ? '#AEF5F0' : '#2563eb'}
            strokeWidth={mpuIsCritical ? 2.5 : 1.8}
            filter={mpuIsCritical ? 'url(#hazardGlow)' : undefined}
          />
          <text x="110" y="24" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            1. MPU6050
          </text>
          <text x="110" y="38" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            (Accelerometer + Gyroscope)
          </text>

          {/* Blue PCB Board */}
          <rect x="40" y="50" width="140" height="110" rx="6" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="1.5" />
          {/* Mounting holes */}
          <circle cx="50" cy="60" r="4" fill="#0B0F17" stroke="#eab308" strokeWidth="1" />
          <circle cx="170" cy="60" r="4" fill="#0B0F17" stroke="#eab308" strokeWidth="1" />
          <circle cx="50" cy="150" r="4" fill="#0B0F17" stroke="#eab308" strokeWidth="1" />
          <circle cx="170" cy="150" r="4" fill="#0B0F17" stroke="#eab308" strokeWidth="1" />
          {/* MPU6050 QFN-24 Chip */}
          <rect x="85" y="80" width="50" height="50" rx="3" fill="#111827" stroke="#374151" strokeWidth="1" />
          <text x="110" y="103" textAnchor="middle" fill="#f8fafc" fontSize="8" fontWeight="bold" fontFamily="monospace">
            MPU-6050
          </text>
          <text x="110" y="115" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">
            I2C 0x68
          </text>
          {/* LED indicator */}
          <circle cx="148" cy="85" r="3" fill={sensorValues.mpu6050.enabled ? (mpuIsCritical ? '#ef4444' : '#22c55e') : '#64748b'}>
            {mpuIsCritical && isRunning && <animate attributeName="opacity" values="1;0.2;1" dur="0.6s" repeatCount="indefinite" />}
          </circle>

          {/* Telemetry pill */}
          <rect x="50" y="132" width="120" height="18" rx="4" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
          <text x="110" y="144" textAnchor="middle" fill={mpuIsCritical ? '#f87171' : '#38bdf8'} fontSize="9" fontWeight="bold" fontFamily="monospace">
            Vib: {sensorValues.mpu6050.vibrationMmS.toFixed(2)} mm/s
          </text>

          {/* Bottom Pin Header */}
          {[
            { name: 'VCC', x: 45, col: '#ef4444' },
            { name: 'GND', x: 85, col: '#94a3b8' },
            { name: 'SDA', x: 125, col: '#eab308' },
            { name: 'SCL', x: 165, col: '#22c55e' },
          ].map((p) => (
            <g key={p.name} onMouseEnter={() => setHoveredPin({ comp: 'mpu6050', pin: p.name })} onMouseLeave={() => setHoveredPin(null)}>
              <circle cx={p.x} cy="195" r="4.5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <text x={p.x} y="184" textAnchor="middle" fill={p.col} fontSize="9" fontWeight="bold" fontFamily="monospace">
                {p.name}
              </text>
            </g>
          ))}
        </g>

        {/* ============================================================== */}
        {/* COMPONENT 2: Tilt Sensor (SW-520D) (Top Center-Left) */}
        {/* ============================================================== */}
        <g
          id="comp-tilt"
          transform="translate(285, 25)"
          onClick={() => onSelectComponent(selectedComponent === 'tilt' ? null : 'tilt')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          <rect
            width="180"
            height="210"
            rx="12"
            fill="#161B22"
            stroke={tiltIsWarning ? '#a855f7' : selectedComponent === 'tilt' ? '#AEF5F0' : '#7c3aed'}
            strokeWidth={tiltIsWarning ? 2.5 : 1.8}
            filter={tiltIsWarning ? 'url(#hazardGlow)' : undefined}
          />
          <text x="90" y="24" textAnchor="middle" fill="#c084fc" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            2. Tilt Sensor
          </text>
          <text x="90" y="38" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            (SW-520D Incline)
          </text>

          {/* Module PCB */}
          <rect x="35" y="52" width="110" height="110" rx="5" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1.5" />
          {/* Metallic SW-520D canister */}
          <rect x="75" y="58" width="30" height="36" rx="4" fill="url(#metalBeam)" stroke="#475569" strokeWidth="1" />
          {/* Blue trimmer potentiometer */}
          <rect x="50" y="100" width="28" height="28" rx="2" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
          <circle cx="64" cy="114" r="7" fill="#f8fafc" />
          <line x1="59" y1="114" x2="69" y2="114" stroke="#475569" strokeWidth="1.5" />
          {/* LM393 chip */}
          <rect x="90" y="100" width="34" height="22" rx="2" fill="#0f172a" />
          <text x="107" y="114" textAnchor="middle" fill="#94a3b8" fontSize="6" fontFamily="monospace">LM393</text>
          {/* DO status LED */}
          <circle cx="128" cy="72" r="3" fill={sensorValues.tilt.isTilted ? '#ef4444' : '#22c55e'}>
            {sensorValues.tilt.isTilted && <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />}
          </circle>

          {/* Telemetry Pill */}
          <rect x="35" y="138" width="110" height="18" rx="4" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
          <text x="90" y="150" textAnchor="middle" fill={tiltIsWarning ? '#e879f9' : '#a78bfa'} fontSize="9" fontWeight="bold" fontFamily="monospace">
            {sensorValues.tilt.isTilted ? '⚠ TILT ALERT' : `Angle: ${sensorValues.tilt.angleDeg.toFixed(1)}°`}
          </text>

          {/* Pins at bottom */}
          {[
            { name: 'VCC', x: 45, col: '#ef4444' },
            { name: 'GND', x: 90, col: '#94a3b8' },
            { name: 'DO',  x: 135, col: '#c084fc' },
          ].map((p) => (
            <g key={p.name} onMouseEnter={() => setHoveredPin({ comp: 'tilt', pin: p.name })} onMouseLeave={() => setHoveredPin(null)}>
              <circle cx={p.x} cy="195" r="4.5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <text x={p.x} y="184" textAnchor="middle" fill={p.col} fontSize="9" fontWeight="bold" fontFamily="monospace">
                {p.name}
              </text>
            </g>
          ))}
        </g>

        {/* ============================================================== */}
        {/* COMPONENT 3: Load Cell + HX711 (Top Center) */}
        {/* ============================================================== */}
        <g
          id="comp-hx711"
          transform="translate(495, 25)"
          onClick={() => onSelectComponent(selectedComponent === 'hx711' ? null : 'hx711')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          <rect
            width="260"
            height="210"
            rx="12"
            fill="#161B22"
            stroke={strainIsCritical ? '#ef4444' : selectedComponent === 'hx711' ? '#AEF5F0' : '#16a34a'}
            strokeWidth={strainIsCritical ? 2.5 : 1.8}
            filter={strainIsCritical ? 'url(#hazardGlow)' : undefined}
          />
          <text x="130" y="24" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            3. Load Cell + HX711
          </text>
          <text x="130" y="38" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            (Bridge Strain Gauge)
          </text>

          {/* Aluminum Load Cell Beam */}
          <rect x="25" y="48" width="210" height="34" rx="4" fill="url(#metalBeam)" stroke="#475569" strokeWidth="1.5" />
          <circle cx="60" cy="65" r="7" fill="#0B0F17" stroke="#334155" strokeWidth="1.5" />
          <circle cx="130" cy="65" r="9" fill="#0B0F17" stroke="#334155" strokeWidth="1.5" />
          <circle cx="200" cy="65" r="7" fill="#0B0F17" stroke="#334155" strokeWidth="1.5" />
          <text x="130" y="58" textAnchor="middle" fill="#334155" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
            STRAIN BEAM
          </text>

          {/* 4 connecting gauge wires to HX711 */}
          <path d="M 195 72 C 220 75, 220 95, 195 105" fill="none" stroke="#ef4444" strokeWidth="1.5" />
          <path d="M 195 76 C 225 79, 225 100, 195 110" fill="none" stroke="#0f172a" strokeWidth="1.5" />
          <path d="M 195 80 C 230 83, 230 105, 195 115" fill="none" stroke="#f8fafc" strokeWidth="1.5" />
          <path d="M 195 84 C 235 87, 235 110, 195 120" fill="none" stroke="#22c55e" strokeWidth="1.5" />

          {/* HX711 Green PCB Module */}
          <rect x="50" y="95" width="145" height="48" rx="4" fill="#15803d" stroke="#14532d" strokeWidth="1.5" />
          <rect x="95" y="104" width="40" height="26" rx="2" fill="#0f172a" />
          <text x="115" y="119" textAnchor="middle" fill="#f8fafc" fontSize="7" fontWeight="bold" fontFamily="monospace">
            HX711
          </text>
          <text x="115" y="127" textAnchor="middle" fill="#86efac" fontSize="6" fontFamily="monospace">
            24-Bit ADC
          </text>

          {/* Telemetry readout */}
          <rect x="50" y="148" width="160" height="18" rx="4" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
          <text x="130" y="160" textAnchor="middle" fill={strainIsCritical ? '#f87171' : '#4ade80'} fontSize="9" fontWeight="bold" fontFamily="monospace">
            {sensorValues.hx711.strainMicrostrain} µε • {sensorValues.hx711.loadWeightKn.toFixed(1)} kN
          </text>

          {/* Bottom Pins */}
          {[
            { name: 'VCC', x: 50, col: '#ef4444' },
            { name: 'GND', x: 100, col: '#94a3b8' },
            { name: 'DT',  x: 150, col: '#06b6d4' },
            { name: 'SCK', x: 200, col: '#22c55e' },
          ].map((p) => (
            <g key={p.name} onMouseEnter={() => setHoveredPin({ comp: 'hx711', pin: p.name })} onMouseLeave={() => setHoveredPin(null)}>
              <circle cx={p.x} cy="195" r="4.5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <text x={p.x} y="184" textAnchor="middle" fill={p.col} fontSize="9" fontWeight="bold" fontFamily="monospace">
                {p.name}
              </text>
            </g>
          ))}
        </g>

        {/* ============================================================== */}
        {/* COMPONENT 4: Ultrasonic HC-SR04 (Top Center-Right) */}
        {/* ============================================================== */}
        <g
          id="comp-hcsr04"
          transform="translate(785, 25)"
          onClick={() => onSelectComponent(selectedComponent === 'hcsr04' ? null : 'hcsr04')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          <rect
            width="220"
            height="210"
            rx="12"
            fill="#161B22"
            stroke={waterIsBlocked ? '#ef4444' : selectedComponent === 'hcsr04' ? '#AEF5F0' : '#ca8a04'}
            strokeWidth={waterIsBlocked ? 2.5 : 1.8}
            filter={waterIsBlocked ? 'url(#hazardGlow)' : undefined}
          />
          <text x="110" y="24" textAnchor="middle" fill="#facc15" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            4. Ultrasonic Sensor
          </text>
          <text x="110" y="38" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            (HC-SR04 Flood Clearance)
          </text>

          {/* Blue PCB */}
          <rect x="30" y="50" width="160" height="95" rx="5" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="1.5" />
          {/* Dual Ultrasonic Transducer Cans */}
          <circle cx="68" cy="95" r="26" fill="url(#usCan)" stroke="#0f172a" strokeWidth="2" />
          <circle cx="68" cy="95" r="16" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" strokeDasharray="2 2" />
          <text x="68" y="99" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="sans-serif">T</text>

          <circle cx="152" cy="95" r="26" fill="url(#usCan)" stroke="#0f172a" strokeWidth="2" />
          <circle cx="152" cy="95" r="16" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" strokeDasharray="2 2" />
          <text x="152" y="99" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="sans-serif">R</text>

          {/* Crystal Oscillator in center */}
          <rect x="103" y="85" width="14" height="22" rx="2" fill="url(#metalBeam)" stroke="#475569" strokeWidth="1" />
          <text x="110" y="99" textAnchor="middle" fill="#0f172a" fontSize="5" fontWeight="bold" fontFamily="sans-serif">40k</text>

          {/* Telemetry pill */}
          <rect x="35" y="150" width="150" height="18" rx="4" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
          <text x="110" y="162" textAnchor="middle" fill={waterIsBlocked ? '#f87171' : '#fde047'} fontSize="9" fontWeight="bold" fontFamily="monospace">
            Rise: +{sensorValues.hcsr04.waterRiseCm.toFixed(1)}cm | Gap: {sensorValues.hcsr04.distanceCm.toFixed(0)}cm
          </text>

          {/* Bottom Pins */}
          {[
            { name: 'VCC',  x: 45,  col: '#ef4444' },
            { name: 'GND',  x: 85,  col: '#94a3b8' },
            { name: 'TRIG', x: 125, col: '#eab308' },
            { name: 'ECHO', x: 165, col: '#c084fc' },
          ].map((p) => (
            <g key={p.name} onMouseEnter={() => setHoveredPin({ comp: 'hcsr04', pin: p.name })} onMouseLeave={() => setHoveredPin(null)}>
              <circle cx={p.x} cy="195" r="4.5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <text x={p.x} y="184" textAnchor="middle" fill={p.col} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                {p.name}
              </text>
            </g>
          ))}
        </g>

        {/* ============================================================== */}
        {/* COMPONENT 5: Water Level Sensor (Top Right-Center) */}
        {/* ============================================================== */}
        <g
          id="comp-water_level"
          transform="translate(1035, 25)"
          onClick={() => onSelectComponent(selectedComponent === 'water_level' ? null : 'water_level')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          <rect
            width="180"
            height="210"
            rx="12"
            fill="#161B22"
            stroke={waterIsBlocked ? '#ef4444' : selectedComponent === 'water_level' ? '#AEF5F0' : '#dc2626'}
            strokeWidth={waterIsBlocked ? 2.5 : 1.8}
            filter={waterIsBlocked ? 'url(#hazardGlow)' : undefined}
          />
          <text x="90" y="24" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            5. Water Level Sensor
          </text>
          <text x="90" y="38" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            (Conductive Depth Trace)
          </text>

          {/* Red Sensor Probe Board */}
          <rect x="50" y="50" width="80" height="95" rx="4" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
          {/* Top header on probe */}
          <rect x="62" y="54" width="56" height="22" rx="2" fill="#0f172a" />
          <circle cx="72" cy="65" r="3" fill="#facc15" />
          <circle cx="90" cy="65" r="3" fill="#facc15" />
          <circle cx="108" cy="65" r="3" fill="#facc15" />
          {/* Parallel gold immersion trace fingers */}
          {[60, 68, 76, 84, 92, 100, 108, 116].map((tx, idx) => (
            <line
              key={idx}
              x1={tx}
              y1="82"
              x2={tx}
              y2="138"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ))}

          {/* Water Immersion Graphic */}
          <rect
            x="50"
            y={145 - (sensorValues.waterLevel.immersionPercent * 0.6)}
            width="80"
            height={sensorValues.waterLevel.immersionPercent * 0.6}
            fill="#38bdf8"
            fillOpacity="0.4"
          />

          {/* Telemetry pill */}
          <rect x="25" y="150" width="130" height="18" rx="4" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
          <text x="90" y="162" textAnchor="middle" fill={waterIsBlocked ? '#f87171' : '#38bdf8'} fontSize="9" fontWeight="bold" fontFamily="monospace">
            Depth: {sensorValues.waterLevel.depthMm.toFixed(1)}mm ({sensorValues.waterLevel.immersionPercent}%)
          </text>

          {/* Bottom Pins */}
          {[
            { name: 'VCC', x: 45, col: '#ef4444' },
            { name: 'GND', x: 90, col: '#94a3b8' },
            { name: 'AO',  x: 135, col: '#f97316' },
          ].map((p) => (
            <g key={p.name} onMouseEnter={() => setHoveredPin({ comp: 'water_level', pin: p.name })} onMouseLeave={() => setHoveredPin(null)}>
              <circle cx={p.x} cy="195" r="4.5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <text x={p.x} y="184" textAnchor="middle" fill={p.col} fontSize="9" fontWeight="bold" fontFamily="monospace">
                {p.name}
              </text>
            </g>
          ))}
        </g>

        {/* ============================================================== */}
        {/* COMPONENT 6: NEO-6M GPS Module (Top Right) */}
        {/* ============================================================== */}
        <g
          id="comp-gps"
          transform="translate(1245, 25)"
          onClick={() => onSelectComponent(selectedComponent === 'gps' ? null : 'gps')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          <rect
            width="220"
            height="210"
            rx="12"
            fill="#161B22"
            stroke={selectedComponent === 'gps' ? '#AEF5F0' : '#0891b2'}
            strokeWidth="1.8"
          />
          <text x="110" y="24" textAnchor="middle" fill="#22d3ee" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            6. GPS Module
          </text>
          <text x="110" y="38" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            (NEO-6M Satellite Fix)
          </text>

          {/* Blue PCB */}
          <rect x="25" y="50" width="170" height="95" rx="5" fill="#0e7490" stroke="#155e75" strokeWidth="1.5" />
          {/* Ceramic Patch Antenna with gold dot */}
          <rect x="110" y="58" width="75" height="78" rx="4" fill="#fed7aa" stroke="#c2410c" strokeWidth="1.5" />
          <circle cx="147" cy="97" r="4" fill="#b45309" />
          {/* u-blox NEO-6M shielded IC */}
          <rect x="35" y="65" width="65" height="45" rx="2" fill="url(#metalBeam)" stroke="#475569" strokeWidth="1" />
          <text x="67" y="85" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
            u-blox
          </text>
          <text x="67" y="96" textAnchor="middle" fill="#334155" fontSize="7" fontFamily="monospace">
            NEO-6M
          </text>
          {/* Status PPS LED */}
          <circle cx="45" cy="120" r="3" fill="#22c55e">
            {isRunning && <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />}
          </circle>

          {/* Telemetry pill */}
          <rect x="25" y="150" width="170" height="18" rx="4" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
          <text x="110" y="162" textAnchor="middle" fill="#67e8f9" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
            25.4585°N, 78.5765°E • {sensorValues.gps.satellites} Sats 3D
          </text>

          {/* Bottom Pins */}
          {[
            { name: 'VCC', x: 45, col: '#ef4444' },
            { name: 'GND', x: 90, col: '#94a3b8' },
            { name: 'TX',  x: 135, col: '#3b82f6' },
            { name: 'RX',  x: 180, col: '#a855f7' },
          ].map((p) => (
            <g key={p.name} onMouseEnter={() => setHoveredPin({ comp: 'gps', pin: p.name })} onMouseLeave={() => setHoveredPin(null)}>
              <circle cx={p.x} cy="195" r="4.5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <text x={p.x} y="184" textAnchor="middle" fill={p.col} fontSize="9" fontWeight="bold" fontFamily="monospace">
                {p.name}
              </text>
            </g>
          ))}
        </g>

        {/* ============================================================== */}
        {/* COMPONENT 8: 18650 Battery + Buck Regulator (Lower Left) */}
        {/* ============================================================== */}
        <g
          id="comp-power"
          transform="translate(35, 460)"
          onClick={() => onSelectComponent(selectedComponent === 'battery_regulator' ? null : 'battery_regulator')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          <rect
            width="460"
            height="260"
            rx="14"
            fill="#161B22"
            stroke={selectedComponent === 'battery_regulator' ? '#AEF5F0' : '#b91c1c'}
            strokeWidth="1.8"
          />
          <text x="230" y="26" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="700" fontFamily="sans-serif">
            8. Power Supply System
          </text>
          <text x="230" y="42" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">
            (18650 Li-Ion Battery + 5V/3.3V Step-Down Buck Regulator)
          </text>

          {/* 18650 Battery Cell Holder */}
          <rect x="25" y="70" width="180" height="95" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
          {/* Blue Cylindrical 18650 Battery */}
          <rect x="35" y="80" width="150" height="75" rx="37" fill="url(#batteryCell)" stroke="#1e3a8a" strokeWidth="1.5" />
          {/* Positive nipple */}
          <rect x="185" y="103" width="10" height="30" rx="3" fill="url(#metalBeam)" />
          <text x="110" y="123" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">
            18650 3.7V
          </text>
          <text x="110" y="138" textAnchor="middle" fill="#bfdbfe" fontSize="9" fontFamily="sans-serif">
            2600mAh Li-Ion
          </text>

          {/* Internal Battery Leads to Regulator */}
          <path d="M 195 118 C 220 118, 230 95, 250 95" fill="none" stroke="#ef4444" strokeWidth="2.5" />
          <path d="M 35 118 C 15 118, 15 200, 250 185" fill="none" stroke="#1e293b" strokeWidth="2.5" />

          {/* DC-DC Buck Step-Down Module */}
          <rect x="240" y="60" width="195" height="145" rx="6" fill="#1e3a8a" stroke="#172554" strokeWidth="2" />

          {/* Terminals on Regulator */}
          <rect x="245" y="85" width="20" height="20" rx="2" fill="#0f172a" />
          <circle cx="255" cy="95" r="4" fill="#facc15" />
          <text x="255" y="80" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="bold" fontFamily="monospace">IN+</text>

          <rect x="245" y="175" width="20" height="20" rx="2" fill="#0f172a" />
          <circle cx="255" cy="185" r="4" fill="#facc15" />
          <text x="255" y="170" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="monospace">IN-</text>

          <rect x="410" y="85" width="20" height="20" rx="2" fill="#0f172a" />
          <circle cx="420" cy="95" r="4" fill="#facc15" />
          <text x="420" y="80" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="bold" fontFamily="monospace">OUT+</text>

          <rect x="410" y="175" width="20" height="20" rx="2" fill="#0f172a" />
          <circle cx="420" cy="185" r="4" fill="#facc15" />
          <text x="420" y="170" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="monospace">OUT-</text>

          {/* Red 3-digit 7-segment LED Display */}
          <rect x="290" y="85" width="80" height="42" rx="3" fill="#000000" stroke="#7f1d1d" strokeWidth="1" />
          <text x="330" y="115" textAnchor="middle" fill="#ef4444" fontSize="22" fontWeight="bold" fontFamily="monospace" letterSpacing="2">
            5.01
          </text>
          <text x="330" y="125" textAnchor="middle" fill="#fca5a5" fontSize="7" fontFamily="sans-serif">
            OUTPUT VOLTS (REGULATED)
          </text>

          {/* Inductor coil & electrolytic capacitor */}
          <circle cx="305" cy="155" r="14" fill="#0f172a" stroke="#475569" strokeWidth="2" />
          <text x="305" y="159" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">330</text>

          {/* Trimpot adjustment */}
          <rect x="345" y="145" width="22" height="22" rx="2" fill="#0284c7" />
          <circle cx="356" cy="156" r="5" fill="#f8fafc" />

          {/* Description line */}
          <text x="230" y="235" textAnchor="middle" fill="#cbd5e1" fontSize="10.5" fontWeight="500" fontFamily="sans-serif">
            Supplies clean 5.0V to ESP32 VIN & 3.3V rail to sensor array
          </text>
        </g>

        {/* ============================================================== */}
        {/* COMPONENT: ESP32 DevKit V1 (Center) */}
        {/* ============================================================== */}
        <g
          id="comp-esp32"
          transform="translate(620, 360)"
          onClick={() => onSelectComponent(selectedComponent === 'esp32' ? null : 'esp32')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          {/* Main Board PCB */}
          <rect
            width="220"
            height="380"
            rx="14"
            fill="#0f172a"
            stroke={selectedComponent === 'esp32' ? '#AEF5F0' : '#475569'}
            strokeWidth="2.5"
          />

          {/* ESP-WROOM-32 Metal RF Shield */}
          <rect x="35" y="30" width="150" height="145" rx="6" fill="url(#espShield)" stroke="#64748b" strokeWidth="1.5" />
          {/* Wi-Fi & BT Antenna trace area at top */}
          <rect x="50" y="35" width="120" height="25" rx="2" fill="#0f172a" />
          <path d="M 60 48 L 75 48 L 85 40 L 95 48 L 110 40 L 125 48 L 140 40 L 155 48" fill="none" stroke="#eab308" strokeWidth="1.5" />

          {/* Chip Label */}
          <text x="110" y="85" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold" fontFamily="sans-serif">
            ESP32
          </text>
          <text x="110" y="103" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontWeight="600" fontFamily="sans-serif">
            DevKit V1
          </text>
          <text x="110" y="122" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
            240MHz Dual-Core
          </text>
          <text x="110" y="136" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">
            Wi-Fi + BLE 4.2
          </text>

          {/* Status LEDs on board */}
          <circle cx="55" cy="195" r="3.5" fill="#ef4444" /> {/* Power Red LED */}
          <circle cx="70" cy="195" r="3.5" fill={isRunning ? '#3b82f6' : '#1e3a8a'}>
            {isRunning && <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite" />}
          </circle> {/* GPIO2 Blue LED */}

          {/* Micro USB Port at bottom */}
          <rect x="80" y="348" width="60" height="28" rx="4" fill="url(#metalBeam)" stroke="#334155" strokeWidth="1.5" />
          <rect x="92" y="358" width="36" height="12" rx="2" fill="#0f172a" />

          {/* Push buttons (EN and BOOT) */}
          <g transform="translate(45, 320)">
            <rect width="26" height="22" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <circle cx="13" cy="11" r="5" fill="#e2e8f0" />
            <text x="13" y="28" textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="bold">EN</text>
          </g>
          <g transform="translate(150, 320)">
            <rect width="26" height="22" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <circle cx="13" cy="11" r="5" fill="#e2e8f0" />
            <text x="13" y="28" textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="bold">BOOT</text>
          </g>

          {/* LEFT PIN HEADER (14 pins) */}
          {[
            { name: '3V3', y: 50, col: '#ef4444' },
            { name: 'EN',  y: 71, col: '#94a3b8' },
            { name: 'VP',  y: 92, col: '#94a3b8' },
            { name: 'VN',  y: 113, col: '#94a3b8' },
            { name: '34',  y: 134, col: '#94a3b8' },
            { name: '35',  y: 155, col: '#94a3b8' },
            { name: '32',  y: 176, col: '#c084fc' }, // Tilt DO
            { name: '33',  y: 197, col: '#f97316' }, // Water AO
            { name: '26',  y: 218, col: '#06b6d4' }, // HX711 DT
            { name: '27',  y: 239, col: '#22c55e' }, // HX711 SCK
            { name: '14',  y: 260, col: '#ec4899' }, // LoRa RST
            { name: '12',  y: 281, col: '#eab308' }, // HC-SR04 TRIG
            { name: '13',  y: 302, col: '#c084fc' }, // HC-SR04 ECHO
            { name: 'VIN', y: 323, col: '#ef4444' }, // 5V IN
          ].map((p) => (
            <g key={`esp32-left-${p.name}-${p.y}`} onMouseEnter={() => setHoveredPin({ comp: 'esp32', pin: p.name })} onMouseLeave={() => setHoveredPin(null)}>
              <circle cx="15" cy={p.y} r="4" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <text x="24" y={p.y + 3} fill={p.col} fontSize="9" fontWeight="bold" fontFamily="monospace">
                {p.name}
              </text>
            </g>
          ))}

          {/* RIGHT PIN HEADER (13 pins) */}
          {[
            { name: 'GND', y: 50, col: '#94a3b8' },
            { name: '23',  y: 71, col: '#3b82f6' }, // LoRa MOSI
            { name: '22',  y: 92, col: '#22c55e' }, // MPU SCL
            { name: 'TX0', y: 113, col: '#a855f7' }, // GPS RX
            { name: 'RX0', y: 134, col: '#3b82f6' }, // GPS TX
            { name: '21',  y: 155, col: '#eab308' }, // MPU SDA
            { name: '19',  y: 176, col: '#22c55e' }, // LoRa MISO
            { name: '18',  y: 197, col: '#eab308' }, // LoRa SCK
            { name: '5',   y: 218, col: '#f97316' }, // LoRa CS
            { name: '4',   y: 239, col: '#94a3b8' },
            { name: '2',   y: 260, col: '#64748b' }, // LoRa DIO0
            { name: '15',  y: 281, col: '#94a3b8' },
            { name: 'GND', y: 302, col: '#94a3b8' },
          ].map((p) => (
            <g key={`esp32-right-${p.name}-${p.y}`} onMouseEnter={() => setHoveredPin({ comp: 'esp32', pin: p.name })} onMouseLeave={() => setHoveredPin(null)}>
              <circle cx="205" cy={p.y} r="4" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <text x="196" y={p.y + 3} textAnchor="end" fill={p.col} fontSize="9" fontWeight="bold" fontFamily="monospace">
                {p.name}
              </text>
            </g>
          ))}
        </g>

        {/* ============================================================== */}
        {/* COMPONENT 7: SX1278 / Ra-02 LoRa Module (Mid-Lower Right) */}
        {/* ============================================================== */}
        <g
          id="comp-lora"
          transform="translate(935, 430)"
          onClick={() => onSelectComponent(selectedComponent === 'lora' ? null : 'lora')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          <rect
            width="290"
            height="270"
            rx="14"
            fill="#161B22"
            stroke={selectedComponent === 'lora' ? '#AEF5F0' : '#7c3aed'}
            strokeWidth="1.8"
          />
          <text x="145" y="24" textAnchor="middle" fill="#c084fc" fontSize="13" fontWeight="700" fontFamily="sans-serif">
            7. LoRa Module
          </text>
          <text x="145" y="40" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">
            (SX1278 / Ra-02 433MHz Long Range)
          </text>

          {/* Blue Carrier PCB */}
          <rect x="50" y="55" width="160" height="190" rx="6" fill="#1e3a8a" stroke="#172554" strokeWidth="1.5" />
          {/* Metal Ra-02 shielded module */}
          <rect x="80" y="85" width="105" height="105" rx="4" fill="url(#espShield)" stroke="#64748b" strokeWidth="1" />
          <text x="132" y="130" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
            Ra-02
          </text>
          <text x="132" y="148" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="sans-serif">
            SX1278
          </text>
          <text x="132" y="162" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
            433MHz • +20dBm
          </text>

          {/* Brass SMA Connector & Black Rubber Duck Whip Antenna */}
          <rect x="210" y="125" width="22" height="24" rx="2" fill="#d97706" stroke="#b45309" strokeWidth="1.5" />
          <path d="M 232 137 L 275 137 L 275 60 L 268 60 L 268 137" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
          <circle cx="271.5" cy="58" r="3.5" fill="#0f172a" />

          {/* Left Pin Header on LoRa module */}
          {[
            { name: 'VCC',  y: 35, col: '#ef4444' },
            { name: 'GND',  y: 65, col: '#94a3b8' },
            { name: 'MISO', y: 95, col: '#22c55e' },
            { name: 'MOSI', y: 125, col: '#3b82f6' },
            { name: 'SCK',  y: 155, col: '#eab308' },
            { name: 'CS',   y: 185, col: '#f97316' },
            { name: 'RST',  y: 215, col: '#ec4899' },
            { name: 'DIO0', y: 245, col: '#64748b' },
          ].map((p) => (
            <g key={p.name} onMouseEnter={() => setHoveredPin({ comp: 'lora', pin: p.name })} onMouseLeave={() => setHoveredPin(null)}>
              <circle cx="10" cy={p.y} r="4.5" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <text x="22" y={p.y + 3} fill={p.col} fontSize="9" fontWeight="bold" fontFamily="monospace">
                {p.name}
              </text>
            </g>
          ))}
        </g>

        {/* ============================================================== */}
        {/* WIRELESS RF TRANSMISSION WAVES (LoRa Antenna -> Gateway) */}
        {/* ============================================================== */}
        <g id="wireless-lora-waves">
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M 1220 ${480 - i * 16} A ${30 + i * 18} ${30 + i * 18} 0 0 1 1220 ${520 + i * 16}`}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity={isRunning ? 0.9 : 0.2}
            >
              {isRunning && (
                <animate
                  attributeName="opacity"
                  values="0.1;1;0.1"
                  dur="1.5s"
                  begin={`${i * 0.4}s`}
                  repeatCount="indefinite"
                />
              )}
            </path>
          ))}
          <text x="1265" y="475" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="bold" fontFamily="monospace">
            433.175 MHz
          </text>
          <text x="1265" y="488" textAnchor="middle" fill="#86efac" fontSize="8" fontFamily="monospace">
            LoRa RF
          </text>
        </g>

        {/* ============================================================== */}
        {/* COMPONENT 10: LoRa Gateway (Receiver at High Location) */}
        {/* ============================================================== */}
        <g
          id="comp-gateway"
          transform="translate(1320, 395)"
          onClick={() => onSelectComponent(selectedComponent === 'gateway' ? null : 'gateway')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          <rect
            width="245"
            height="150"
            rx="12"
            fill="#161B22"
            stroke={selectedComponent === 'gateway' ? '#AEF5F0' : '#2563eb'}
            strokeWidth="1.8"
          />
          <text x="122" y="24" textAnchor="middle" fill="#60a5fa" fontSize="13" fontWeight="700" fontFamily="sans-serif">
            LoRa Gateway
          </text>
          <text x="122" y="38" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            (Receiver at High Location Tower)
          </text>

          {/* Receiver Module */}
          <rect x="25" y="50" width="195" height="85" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
          {/* Receiver Antenna */}
          <rect x="35" y="60" width="10" height="40" rx="2" fill="#d97706" />
          <path d="M 40 60 L 40 25" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />

          {/* Gateway Microcontroller */}
          <rect x="60" y="62" width="80" height="60" rx="4" fill="#0f172a" stroke="#1d4ed8" strokeWidth="1" />
          <text x="100" y="85" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
            SX1278
          </text>
          <text x="100" y="98" textAnchor="middle" fill="#93c5fd" fontSize="8">
            LoRa Gateway
          </text>

          {/* Status LEDs & Metrics */}
          <circle cx="160" cy="72" r="3.5" fill="#22c55e">
            {isRunning && <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />}
          </circle>
          <text x="170" y="75" fill="#22c55e" fontSize="8" fontWeight="bold">RX SYNC</text>

          <text x="155" y="94" fill="#cbd5e1" fontSize="8" fontFamily="monospace">
            RSSI: -68 dBm
          </text>
          <text x="155" y="106" fill="#cbd5e1" fontSize="8" fontFamily="monospace">
            SNR: +9.4 dB
          </text>
          <text x="155" y="118" fill="#38bdf8" fontSize="7.5" fontFamily="monospace">
            Packets: #{simState.packetsSent}
          </text>
        </g>

        {/* Link Arrow from Gateway to Backend */}
        <g id="gateway-to-backend-link">
          <path d="M 1442 545 L 1442 580" fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4 4">
            {isRunning && (
              <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.8s" repeatCount="indefinite" />
            )}
          </path>
          <polygon points="1442,585 1438,576 1446,576" fill="#38bdf8" />
          <text x="1455" y="565" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace">
            TCP/IP LAN
          </text>
        </g>

        {/* ============================================================== */}
        {/* COMPONENT 11: Backend Server (Bottom Right) */}
        {/* ============================================================== */}
        <g
          id="comp-backend"
          transform="translate(1320, 585)"
          onClick={() => onSelectComponent(selectedComponent === 'backend' ? null : 'backend')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
        >
          <rect
            width="245"
            height="155"
            rx="12"
            fill="#161B22"
            stroke={selectedComponent === 'backend' ? '#AEF5F0' : '#0284c7'}
            strokeWidth="1.8"
          />
          <text x="122" y="24" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="700" fontFamily="sans-serif">
            Backend Server
          </text>
          <text x="122" y="38" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            (Analyze Data & Detect Hazard)
          </text>

          {/* Rack Server Stack */}
          {[0, 1, 2].map((idx) => (
            <g key={idx} transform={`translate(25, ${50 + idx * 26})`}>
              <rect width="195" height="22" rx="3" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
              <circle cx="12" cy="11" r="2.5" fill="#22c55e" />
              <circle cx="20" cy="11" r="2.5" fill={isRunning ? '#38bdf8' : '#1e3a8a'}>
                {isRunning && <animate attributeName="opacity" values="1;0.2;1" dur={`${0.6 + idx * 0.2}s`} repeatCount="indefinite" />}
              </circle>
              {/* Drive bays */}
              {[35, 60, 85, 110, 135].map((bx) => (
                <rect key={bx} x={bx} y="5" width="20" height="12" rx="1" fill="#1e293b" />
              ))}
              <text x="180" y="14" textAnchor="end" fill="#94a3b8" fontSize="7" fontFamily="monospace">
                NODE-{idx + 1}
              </text>
            </g>
          ))}

          {/* RoutePilot Engine Sync Status badge */}
          <rect x="25" y="128" width="195" height="20" rx="4" fill="#0B0F17" stroke="#334155" strokeWidth="1" />
          <text x="122" y="141" textAnchor="middle" fill="#a7f3d0" fontSize="8.5" fontWeight="bold" fontFamily="sans-serif">
            ✓ Synchronized with RoutePilot A* Engine
          </text>
        </g>
      </svg>

      {/* Interactive Wire & Pin Details Tooltip Overlay (when hovering) */}
      {hoveredWire && (
        <div className="absolute bottom-3 left-4 max-w-md p-3 rounded-xl bg-[#161B22]/95 border border-[#30363D] shadow-2xl backdrop-blur-md text-xs text-slate-200 z-30 pointer-events-none animate-fadeIn">
          <div className="flex items-center justify-between gap-2 border-b border-[#30363D] pb-1.5 mb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: hoveredWire.color }} />
              <span>Traceable Connection</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#21262D] text-[#AEF5F0]">
              {hoveredWire.signalType} • {hoveredWire.voltage}
            </span>
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Source:</span>
              <span className="text-white font-bold">{hoveredWire.sourceComponent.toUpperCase()} [{hoveredWire.sourcePin}]</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Destination:</span>
              <span className="text-[#AEF5F0] font-bold">{hoveredWire.targetComponent.toUpperCase()} [{hoveredWire.targetPin}]</span>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-300 font-sans">{hoveredWire.description}</p>
        </div>
      )}

      {/* Pin Hover Overlay */}
      {hoveredPin && !hoveredWire && (
        <div className="absolute bottom-3 left-4 p-2.5 rounded-xl bg-[#161B22]/95 border border-[#30363D] shadow-2xl backdrop-blur-md text-xs z-30 pointer-events-none animate-fadeIn font-mono">
          <div className="text-[#AEF5F0] font-bold">
            {hoveredPin.comp.toUpperCase()} Pin: {hoveredPin.pin}
          </div>
          <div className="text-[11px] text-slate-300">
            {PIN_MAPPINGS.find((p) => p.component === hoveredPin.comp && p.pin === hoveredPin.pin)?.description || 'Terminal Pin'}
          </div>
        </div>
      )}
    </div>
  );
};
