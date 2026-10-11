import React, { useState, useEffect, useRef } from 'react';
import { roadConstructionEngine, ConstructionTelemetryState } from '../../../services/roadConstructionEngine';
import { realtimeSync } from '../../../services/realtimeSync';

interface RoadConstructionSimulationProps {
  onNavigateToMap?: () => void;
}

export const RoadConstructionSimulation: React.FC<RoadConstructionSimulationProps> = ({
  onNavigateToMap,
}) => {
  const [state, setState] = useState<ConstructionTelemetryState>(roadConstructionEngine.getState());
  const [selectedBlock, setSelectedBlock] = useState<'POWER' | 'ESP32' | 'GPS' | 'LTE' | 'NET' | 'CLOUD' | null>(null);
  const [activeTab, setActiveTab] = useState<'SCHEMATIC' | 'TERMINAL' | 'PAYLOAD' | 'PRESETS'>('SCHEMATIC');
  const [logFilter, setLogFilter] = useState<'ALL' | 'GPS' | 'LTE' | 'CLOUD'>('ALL');
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = roadConstructionEngine.subscribe((newState) => {
      setState({ ...newState });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeTab === 'TERMINAL' && terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.serialLogs.length, activeTab]);

  const presetSites = roadConstructionEngine.getPresetSites();
  const filteredLogs = state.serialLogs.filter((log) => {
    if (logFilter === 'ALL') return true;
    return log.tag === logFilter;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090D13] text-slate-100 overflow-hidden select-none font-sans">
      {/* 1. Header Toolbar */}
      <header className="px-4 py-3 bg-[#111620] border-b border-[#212A37] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-xl shadow-lg shadow-orange-500/10">
            🚧
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                Road Construction IoT Telemetry Workbench
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                ESP32 + SIM7600 + NEO-6M
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              6-Stage Hardware Pipeline: 18650 Li-ion ➔ Buck Converter ➔ ESP32 ➔ GPS ➔ 4G/LTE ➔ Cloud
            </p>
          </div>
        </div>

        {/* Live Quick Telemetry Badges */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Battery Status */}
          <div
            onClick={() => roadConstructionEngine.togglePower()}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
              state.power.isOn
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
            }`}
            title="Click to toggle 18650 Battery Power"
          >
            <span className={`w-2 h-2 rounded-full ${state.power.isOn ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-mono font-bold">{state.power.isOn ? `${state.power.batteryVoltage}V (${state.power.batteryPercent}%)` : 'POWER OFF'}</span>
          </div>

          {/* GPS Fix */}
          <div className="px-2.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 flex items-center gap-1.5">
            <span>🛰️</span>
            <span className="font-mono font-bold">{state.gps.satellitesTracked} Sats (3D Fix)</span>
          </div>

          {/* 4G LTE Signal */}
          <div className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5">
            <span>📶</span>
            <span className="font-mono font-bold">{state.modem.operator} ({state.modem.rssiDbm} dBm)</span>
          </div>

          {/* Construction Deployment Toggle */}
          {state.cloud.isConstructionActive ? (
            <button
              type="button"
              onClick={() => roadConstructionEngine.clearConstructionZone()}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-1.5 transition active:scale-95"
            >
              <span>⏹ Clear Work Zone</span>
              <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded">Active</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => roadConstructionEngine.deployConstructionZone()}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 cursor-pointer flex items-center gap-1.5 transition active:scale-95 animate-pulse"
            >
              <span>🚀 Deploy Construction Zone</span>
            </button>
          )}

          {/* Ping Now */}
          <button
            type="button"
            onClick={() => roadConstructionEngine.transmitHeartbeatPacket()}
            disabled={!state.power.isOn}
            className="p-1.5 rounded-xl bg-[#212A37] hover:bg-[#303E52] border border-[#303E52] text-slate-200 transition cursor-pointer disabled:opacity-40"
            title="Manual Telemetry Ping"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. Sub-Navigation Tabs */}
      <div className="px-4 py-2 bg-[#0E131C] border-b border-[#212A37] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          {[
            { id: 'SCHEMATIC', label: 'Circuit Architecture Diagram', icon: '⚡' },
            { id: 'TERMINAL', label: 'ESP32 / SIM7600 UART Console', icon: '💻' },
            { id: 'PAYLOAD', label: 'Cloud JSON Telemetry Packet', icon: '📦' },
            { id: 'PRESETS', label: 'Construction Site Corridors', icon: '📍' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                  : 'bg-[#161E2A] text-slate-300 hover:text-white hover:bg-[#212A37]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Live RoutePilot Link */}
        {state.cloud.isConstructionActive && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>RoutePilot Hazard Synced: {state.cloud.activeHazardId || 'Active'}</span>
            </span>
            {onNavigateToMap && (
              <button
                type="button"
                onClick={onNavigateToMap}
                className="px-2.5 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-200 text-[11px] font-bold cursor-pointer transition"
              >
                View on Live Map ➔
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Main Content Views */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-4">
        {/* ============================================================== */}
        {/* VIEW 1: SCHEMATIC CIRCUIT (MATCHING THE USER'S DIAGRAM EXACTLY) */}
        {/* ============================================================== */}
        {activeTab === 'SCHEMATIC' && (
          <div className="flex-1 flex flex-col gap-4">
            {/* The SVG Circuit Board */}
            <div className="relative w-full rounded-2xl bg-[#0B0F17] border border-[#212A37] p-4 shadow-2xl overflow-x-auto min-h-[460px] flex items-center justify-center">
              <div className="min-w-[1000px] w-full max-w-[1280px]">
                {/* SVG Visual Schematics matching the user's diagram */}
                <svg
                  viewBox="0 0 1150 520"
                  className="w-full h-auto select-none"
                  style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.6))' }}
                >
                  <defs>
                    {/* Glowing effect filters */}
                    <filter id="wireGlowRed" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.8" />
                    </filter>
                    <filter id="wireGlowYellow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#eab308" floodOpacity="0.8" />
                    </filter>
                    <filter id="wireGlowBlue" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.8" />
                    </filter>
                    <filter id="cellWaveGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06b6d4" floodOpacity="0.7" />
                    </filter>
                  </defs>

                  {/* Wire Connections Layer */}
                  {/* Wire: 18650 Battery to Buck Converter Input */}
                  <path d="M 90 230 L 115 230 L 115 245 L 125 245" stroke="#ef4444" strokeWidth="3" fill="none" />
                  <path d="M 90 270 L 115 270 L 115 255 L 125 255" stroke="#3b82f6" strokeWidth="3" fill="none" />

                  {/* Wire: 5V Rail from Buck (Red wire) to ESP32 VIN (bottom left pin) */}
                  <path
                    d="M 235 240 L 265 240 L 265 440 L 350 440"
                    stroke="#ef4444"
                    strokeWidth="3.5"
                    fill="none"
                    filter="url(#wireGlowRed)"
                  />
                  {/* Wire: 3.3V Rail from Buck (Yellow wire) to ESP32 3V3 (top left pin) */}
                  <path
                    d="M 275 250 L 300 250 L 300 390 L 350 390"
                    stroke="#eab308"
                    strokeWidth="3.5"
                    fill="none"
                    filter="url(#wireGlowYellow)"
                  />
                  {/* Wire: Buck GND to ESP32 GND */}
                  <path d="M 235 270 L 285 270 L 285 415 L 350 415" stroke="#475569" strokeWidth="3" fill="none" />

                  {/* Wire: ESP32 to GPS Module (NEO-6M) */}
                  {/* VCC (Red) */}
                  <path d="M 370 230 L 370 170 L 380 170 L 380 145" stroke="#ef4444" strokeWidth="3" fill="none" filter="url(#wireGlowRed)" />
                  {/* GND (Black) */}
                  <path d="M 405 230 L 405 170 L 415 170 L 415 145" stroke="#475569" strokeWidth="3" fill="none" />
                  {/* GPS TX to ESP32 RX2 (Blue) */}
                  <path d="M 445 145 L 445 180 L 440 180 L 440 230" stroke="#0ea5e9" strokeWidth="3" fill="none" filter="url(#wireGlowBlue)" />
                  {/* GPS RX from ESP32 TX2 (Yellow) */}
                  <path d="M 480 145 L 480 180 L 475 180 L 475 230" stroke="#eab308" strokeWidth="3" fill="none" filter="url(#wireGlowYellow)" />

                  {/* Wire: ESP32 to SIM7600 4G LTE Module */}
                  {/* VCC 5V to SIM7600 (Red) */}
                  <path d="M 525 280 L 555 280 L 555 365 L 595 365" stroke="#ef4444" strokeWidth="3" fill="none" filter="url(#wireGlowRed)" />
                  {/* GND (Black) */}
                  <path d="M 525 380 L 565 380 L 565 385 L 640 385 L 640 365" stroke="#475569" strokeWidth="3" fill="none" />
                  {/* SIM7600 TX to ESP32 RX (Blue) */}
                  <path d="M 525 305 L 685 305 L 685 365" stroke="#0ea5e9" strokeWidth="3" fill="none" filter="url(#wireGlowBlue)" />
                  {/* SIM7600 RX to ESP32 TX (Yellow) */}
                  <path d="M 525 410 L 725 410 L 725 365" stroke="#eab308" strokeWidth="3" fill="none" filter="url(#wireGlowYellow)" />

                  {/* Wireless Radio Transmission Links: SIM7600 -> Internet -> Cloud */}
                  {/* Animated Wave 1: SIM7600 Antenna to Internet Tower */}
                  <g filter="url(#cellWaveGlow)">
                    <path d="M 780 250 C 800 240, 800 280, 820 260" stroke="#06b6d4" strokeWidth="3" strokeDasharray="5,5" fill="none" className="animate-pulse" />
                    <path d="M 790 240 C 810 230, 810 290, 830 260" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="5,5" fill="none" opacity="0.8" />
                  </g>
                  {/* Animated Wave 2: Internet to Backend Server */}
                  <g filter="url(#cellWaveGlow)">
                    <path d="M 940 260 L 980 260" stroke="#10b981" strokeWidth="3" strokeDasharray="6,4" fill="none" className="animate-pulse" />
                  </g>

                  {/* ============================================================== */}
                  {/* 1. POWER SUPPLY SYSTEM (RED CONTAINER) */}
                  {/* ============================================================== */}
                  <g onClick={() => setSelectedBlock('POWER')} className="cursor-pointer group">
                    <rect
                      x="20"
                      y="150"
                      width="280"
                      height="230"
                      rx="14"
                      fill="#12080a"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      className="group-hover:stroke-red-400 transition"
                    />
                    <text x="35" y="180" fill="#ef4444" fontSize="13" fontWeight="bold">
                      1. Power Supply System
                    </text>
                    <text x="35" y="196" fill="#fca5a5" fontSize="10">
                      (Battery + Regulator Only)
                    </text>

                    {/* 18650 Li-ion Battery Graphic */}
                    <g transform="translate(35, 215)">
                      <rect x="0" y="8" width="55" height="110" rx="10" fill="#2563eb" stroke="#60a5fa" strokeWidth="1.5" />
                      <rect x="18" y="0" width="18" height="8" rx="2" fill="#94a3b8" />
                      {/* Battery Liquid Level */}
                      <rect x="4" y="20" width="47" height="92" rx="6" fill="#1e3a8a" opacity="0.6" />
                      <text x="27" y="55" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">18650</text>
                      <text x="27" y="68" textAnchor="middle" fill="#93c5fd" fontSize="8 font-mono">3.7V</text>
                      <text x="27" y="80" textAnchor="middle" fill="#93c5fd" fontSize="8 font-mono">2600mAh</text>
                      <text x="27" y="94" textAnchor="middle" fill="#60a5fa" fontSize="7">Li-ion</text>
                    </g>

                    {/* 5V / 3.3V Buck Converter Graphic */}
                    <g transform="translate(125, 215)">
                      <rect x="0" y="8" width="100" height="90" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                      {/* Inductor 220 coil */}
                      <circle cx="68" cy="48" r="20" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                      <text x="68" y="52" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold" fontFamily="monospace">220</text>
                      {/* USB port icon */}
                      <rect x="4" y="32" width="16" height="32" rx="3" fill="#cbd5e1" />
                      <text x="50" y="112" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">5V / 3.3V</text>
                      <text x="50" y="122" textAnchor="middle" fill="#64748b" fontSize="8">Buck Converter</text>
                    </g>

                    {/* Output Pins Badges */}
                    <circle cx="235" cy="200" r="7" fill="#ef4444" />
                    <text x="235" y="190" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">5V</text>
                    <circle cx="275" cy="210" r="7" fill="#eab308" />
                    <text x="275" y="200" textAnchor="middle" fill="#eab308" fontSize="10" fontWeight="bold">3.3V</text>
                  </g>

                  {/* ============================================================== */}
                  {/* 3. GPS MODULE (NEO-6M) (TOP GREEN CONTAINER) */}
                  {/* ============================================================== */}
                  <g onClick={() => setSelectedBlock('GPS')} className="cursor-pointer group">
                    <rect
                      x="340"
                      y="15"
                      width="210"
                      height="130"
                      rx="14"
                      fill="#071911"
                      stroke="#22c55e"
                      strokeWidth="2.5"
                      className="group-hover:stroke-emerald-400 transition"
                    />
                    <text x="445" y="38" textAnchor="middle" fill="#22c55e" fontSize="13" fontWeight="bold">
                      GPS Module
                    </text>
                    <text x="445" y="52" textAnchor="middle" fill="#86efac" fontSize="10">
                      (NEO-6M)
                    </text>

                    {/* NEO-6M PCB */}
                    <g transform="translate(365, 60)">
                      <rect x="0" y="0" width="160" height="65" rx="6" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />
                      {/* Metal Shield */}
                      <rect x="8" y="8" width="60" height="48" rx="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                      <text x="38" y="34" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">NEO-6M</text>
                      {/* Ceramic Patch Antenna */}
                      <rect x="75" y="8" width="50" height="48" rx="4" fill="#fed7aa" stroke="#fb923c" strokeWidth="1.5" />
                      <circle cx="100" cy="32" r="6" fill="#ea580c" />
                      {/* Pins */}
                      <text x="15" y="75" fill="#ef4444" fontSize="8" fontWeight="bold">VCC</text>
                      <text x="50" y="75" fill="#94a3b8" fontSize="8" fontWeight="bold">GND</text>
                      <text x="80" y="75" fill="#38bdf8" fontSize="8" fontWeight="bold">TX</text>
                      <text x="115" y="75" fill="#eab308" fontSize="8" fontWeight="bold">RX</text>
                      {/* PPS Blinking LED */}
                      <circle cx="145" cy="20" r="3" fill="#3b82f6" className="animate-ping" />
                    </g>
                  </g>

                  {/* ============================================================== */}
                  {/* 2. ESP32 DEVKIT V1 (CENTER) */}
                  {/* ============================================================== */}
                  <g onClick={() => setSelectedBlock('ESP32')} className="cursor-pointer group">
                    {/* DevKit Main Board */}
                    <rect
                      x="350"
                      y="210"
                      width="180"
                      height="290"
                      rx="14"
                      fill="#121824"
                      stroke="#e2e8f0"
                      strokeWidth="2.5"
                      className="group-hover:stroke-[#AEF5F0] transition"
                    />
                    <text x="440" y="235" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">
                      ESP32 DevKit V1
                    </text>

                    {/* ESP-WROOM-32 Metal Can Module */}
                    <g transform="translate(390, 250)">
                      <rect x="0" y="0" width="100" height="120" rx="6" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
                      <rect x="10" y="8" width="80" height="30" rx="3" fill="#475569" />
                      <text x="50" y="28" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold">ESP32</text>
                      <text x="50" y="60" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">DevKit V1</text>
                      <text x="50" y="75" textAnchor="middle" fill="#334155" fontSize="7 font-mono">ESP-WROOM-32</text>
                      <text x="50" y="87" textAnchor="middle" fill="#334155" fontSize="7 font-mono">Wi-Fi + BLE</text>
                    </g>

                    {/* Micro-USB Port */}
                    <rect x="420" y="475" width="40" height="20" rx="3" fill="#64748b" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="440" y="490" textAnchor="middle" fill="#ffffff" fontSize="8 font-bold">USB</text>

                    {/* Buttons EN / BOOT */}
                    <circle cx="380" cy="475" r="5" fill="#334155" stroke="#94a3b8" />
                    <text x="380" y="495" textAnchor="middle" fill="#94a3b8" fontSize="7">EN</text>
                    <circle cx="500" cy="475" r="5" fill="#334155" stroke="#94a3b8" />
                    <text x="500" y="495" textAnchor="middle" fill="#94a3b8" fontSize="7">BOOT</text>

                    {/* Left Pin Header Label Texts */}
                    <g fill="#94a3b8" fontSize="7" fontFamily="monospace">
                      <text x="355" y="260">3V3</text>
                      <text x="355" y="278">EN</text>
                      <text x="355" y="296">VP</text>
                      <text x="355" y="314">VN</text>
                      <text x="355" y="332">34</text>
                      <text x="355" y="350">35</text>
                      <text x="355" y="368">32</text>
                      <text x="355" y="386">33</text>
                      <text x="355" y="404">25</text>
                      <text x="355" y="422">26</text>
                      <text x="355" y="440">VIN</text>
                    </g>

                    {/* Right Pin Header Label Texts */}
                    <g fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="end">
                      <text x="525" y="260">GND</text>
                      <text x="525" y="278">23</text>
                      <text x="525" y="296">22</text>
                      <text x="525" y="314">TX0</text>
                      <text x="525" y="332">RX0</text>
                      <text x="525" y="350">21</text>
                      <text x="525" y="368">19</text>
                      <text x="525" y="386">18</text>
                      <text x="525" y="404">4</text>
                      <text x="525" y="422">2</text>
                      <text x="525" y="440">3V3</text>
                    </g>

                    {/* Active LEDs */}
                    <circle cx="395" cy="435" r="3.5" fill="#ef4444" className={state.power.isOn ? 'animate-pulse' : ''} />
                    <circle cx="485" cy="435" r="3.5" fill="#3b82f6" className={state.esp32.txLedState ? 'animate-ping' : ''} />
                  </g>

                  {/* ============================================================== */}
                  {/* 4. 4G/LTE MODULE (SIM7600) (CYAN CONTAINER) */}
                  {/* ============================================================== */}
                  <g onClick={() => setSelectedBlock('LTE')} className="cursor-pointer group">
                    <rect
                      x="570"
                      y="180"
                      width="200"
                      height="230"
                      rx="14"
                      fill="#061822"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      className="group-hover:stroke-cyan-300 transition"
                    />
                    <text x="670" y="205" textAnchor="middle" fill="#06b6d4" fontSize="13" fontWeight="bold">
                      4. 4G/LTE Module
                    </text>
                    <text x="670" y="220" textAnchor="middle" fill="#a5f3fc" fontSize="10">
                      (SIM7600)
                    </text>

                    {/* SIM7600 PCB Module */}
                    <g transform="translate(585, 235)">
                      <rect x="0" y="0" width="135" height="95" rx="6" fill="#1e3a8a" stroke="#0ea5e9" strokeWidth="1" />
                      {/* SIM7600 Metal Shield */}
                      <rect x="25" y="8" width="100" height="75" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                      <text x="75" y="32" textAnchor="middle" fill="#dc2626" fontSize="11" fontWeight="bold">SIM7600</text>
                      <text x="75" y="46" textAnchor="middle" fill="#0f172a" fontSize="6 font-mono">P/N: S2-1070C-Z1L6E</text>
                      <text x="75" y="56" textAnchor="middle" fill="#334155" fontSize="6 font-mono">IMEI: 86264300000001</text>
                      <text x="75" y="66" textAnchor="middle" fill="#334155" fontSize="6 font-mono">FCC ID: UDV-201810</text>

                      {/* Pins */}
                      <text x="15" y="115" fill="#ef4444" fontSize="8" fontWeight="bold">VCC</text>
                      <text x="50" y="115" fill="#94a3b8" fontSize="8" fontWeight="bold">GND</text>
                      <text x="85" y="115" fill="#38bdf8" fontSize="8" fontWeight="bold">TX</text>
                      <text x="120" y="115" fill="#eab308" fontSize="8" fontWeight="bold">RX</text>

                      {/* External Antenna Connector */}
                      <circle cx="150" cy="45" r="7" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
                      {/* Antenna Stick */}
                      <rect x="157" y="15" width="8" height="60" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                    </g>
                  </g>

                  {/* ============================================================== */}
                  {/* 5. INTERNET (4G / LTE) (BLUE NEON CONTAINER) */}
                  {/* ============================================================== */}
                  <g onClick={() => setSelectedBlock('NET')} className="cursor-pointer group">
                    <rect
                      x="810"
                      y="180"
                      width="120"
                      height="160"
                      rx="14"
                      fill="#071b26"
                      stroke="#0284c7"
                      strokeWidth="2.5"
                      className="group-hover:stroke-sky-400 transition"
                    />
                    <text x="870" y="205" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold">
                      5. Internet
                    </text>
                    <text x="870" y="220" textAnchor="middle" fill="#bae6fd" fontSize="10">
                      (4G / LTE)
                    </text>

                    {/* Globe / Network waves graphic */}
                    <g transform="translate(870, 270)">
                      <circle cx="0" cy="0" r="26" fill="none" stroke="#0ea5e9" strokeWidth="2.5" className={state.cellularLink.isTransmitting ? 'animate-pulse' : ''} />
                      <ellipse cx="0" cy="0" rx="26" ry="12" fill="none" stroke="#0284c7" strokeWidth="1.5" />
                      <line x1="-26" y1="0" x2="26" y2="0" stroke="#0284c7" strokeWidth="1.5" />
                      <line x1="0" y1="-26" x2="0" y2="26" stroke="#0284c7" strokeWidth="1.5" />
                      {/* Radiating Antenna waves */}
                      <path d="M -35 -15 C -45 0, -45 0, -35 15" stroke="#38bdf8" strokeWidth="2" fill="none" />
                      <path d="M 35 -15 C 45 0, 45 0, 35 15" stroke="#38bdf8" strokeWidth="2" fill="none" />
                    </g>
                  </g>

                  {/* ============================================================== */}
                  {/* 6. BACKEND SERVER (CLOUD) (PURPLE CONTAINER) */}
                  {/* ============================================================== */}
                  <g onClick={() => setSelectedBlock('CLOUD')} className="cursor-pointer group">
                    <rect
                      x="970"
                      y="140"
                      width="160"
                      height="240"
                      rx="14"
                      fill="#1e0b2e"
                      stroke="#a855f7"
                      strokeWidth="2.5"
                      className="group-hover:stroke-fuchsia-400 transition"
                    />
                    <text x="1050" y="170" textAnchor="middle" fill="#c084fc" fontSize="13" fontWeight="bold">
                      6. Backend Server
                    </text>
                    <text x="1050" y="186" textAnchor="middle" fill="#e9d5ff" fontSize="10">
                      (Cloud)
                    </text>

                    {/* Cloud Graphic */}
                    <g transform="translate(1050, 215)">
                      <path
                        d="M -25 5 A 12 12 0 0 1 -10 -15 A 20 20 0 0 1 20 -12 A 15 15 0 0 1 30 5 Z"
                        fill="#6b21a8"
                        stroke="#c084fc"
                        strokeWidth="1.5"
                      />
                    </g>

                    {/* Server Rack Drawers */}
                    <g transform="translate(995, 235)">
                      {[0, 28, 56, 84].map((y, i) => (
                        <g key={i} transform={`translate(0, ${y})`}>
                          <rect x="0" y="0" width="110" height="22" rx="4" fill="#0f172a" stroke="#9333ea" strokeWidth="1" />
                          <circle cx="10" cy="11" r="2.5" fill="#10b981" className="animate-pulse" />
                          <circle cx="20" cy="11" r="2.5" fill="#06b6d4" />
                          <circle cx="30" cy="11" r="2.5" fill="#f59e0b" />
                          <line x1="45" y1="11" x2="100" y2="11" stroke="#334155" strokeWidth="3" strokeDasharray="4,3" />
                        </g>
                      ))}
                    </g>
                  </g>
                </svg>
              </div>
            </div>

            {/* Quick Interactive Parameters Drawer below schematic */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Card 1: Power & Battery */}
              <div className="p-3.5 rounded-xl bg-[#111622] border border-[#212A37] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-red-400 mb-2">
                    <span>1. Power System</span>
                    <button
                      type="button"
                      onClick={() => roadConstructionEngine.togglePower()}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                        state.power.isOn ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {state.power.isOn ? 'Switch OFF' : 'Switch ON'}
                    </button>
                  </div>
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>18650 Cell:</span>
                      <span className="font-bold text-white">{state.power.batteryVoltage} V ({state.power.batteryPercent}%)</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Buck 5V Rail:</span>
                      <span className="text-emerald-400 font-bold">{state.power.buck5vRail} V</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Buck 3.3V Rail:</span>
                      <span className="text-amber-400 font-bold">{state.power.buck3v3Rail} V</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Current Draw:</span>
                      <span className="text-cyan-400">{state.power.batteryCurrentMa} mA</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: GPS Telemetry */}
              <div className="p-3.5 rounded-xl bg-[#111622] border border-[#212A37] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2">
                    <span>3. GPS (NEO-6M)</span>
                    <span className="text-[10px] font-mono text-emerald-300">{state.gps.fixType}</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="text-slate-300 truncate font-semibold" title={state.gps.locationName}>
                      📍 {state.gps.locationName}
                    </div>
                    <div className="font-mono text-cyan-300 text-[10px]">
                      {state.gps.latitude.toFixed(4)}°N, {state.gps.longitude.toFixed(4)}°E
                    </div>
                    <div className="flex justify-between text-slate-400 text-[10px] font-mono">
                      <span>Satellites: {state.gps.satellitesTracked}</span>
                      <span>HDOP: {state.gps.hdop}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: 4G LTE Modem */}
              <div className="p-3.5 rounded-xl bg-[#111622] border border-[#212A37] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-400 mb-2">
                    <span>4. 4G/LTE (SIM7600)</span>
                    <span className="text-[10px] font-mono text-cyan-300">{state.modem.simStatus}</span>
                  </div>
                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>Network:</span>
                      <span className="text-white font-bold">{state.modem.operator}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Signal RSSI:</span>
                      <span className="text-emerald-400 font-bold">{state.modem.rssiDbm} dBm</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>IP Address:</span>
                      <span className="text-slate-400">{state.modem.ipAddress}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Work Zone Controls */}
              <div className="p-3.5 rounded-xl bg-[#111622] border border-[#212A37] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-orange-400 mb-1.5">
                    <span>Work Zone Radius</span>
                    <span className="text-xs font-mono text-amber-300 font-bold">{state.cloud.workZoneRadiusMeters} meters</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="10"
                    value={state.cloud.workZoneRadiusMeters}
                    onChange={(e) => roadConstructionEngine.setWorkZoneRadius(Number(e.target.value))}
                    className="w-full accent-orange-500 bg-[#212A37] h-2 rounded-lg cursor-pointer my-1"
                  />
                  <div className="flex items-center justify-between gap-1 text-[10px] mt-2">
                    <button
                      type="button"
                      onClick={() => roadConstructionEngine.setLaneStatus('FULL_BLOCKAGE')}
                      className={`flex-1 py-1 rounded font-bold transition cursor-pointer ${
                        state.cloud.laneStatus === 'FULL_BLOCKAGE'
                          ? 'bg-red-600 text-white shadow'
                          : 'bg-[#1C2533] text-slate-400 hover:text-white'
                      }`}
                    >
                      Full Closure
                    </button>
                    <button
                      type="button"
                      onClick={() => roadConstructionEngine.setLaneStatus('PARTIAL_RESTRICTION')}
                      className={`flex-1 py-1 rounded font-bold transition cursor-pointer ${
                        state.cloud.laneStatus === 'PARTIAL_RESTRICTION'
                          ? 'bg-amber-600 text-white shadow'
                          : 'bg-[#1C2533] text-slate-400 hover:text-white'
                      }`}
                    >
                      Single Lane
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: REAL-TIME SERIAL MONITOR (UART CONSOLE) */}
        {/* ============================================================== */}
        {activeTab === 'TERMINAL' && (
          <div className="flex-1 flex flex-col rounded-2xl bg-[#0B0F17] border border-[#212A37] overflow-hidden min-h-[440px]">
            {/* Terminal Header */}
            <div className="px-4 py-2.5 bg-[#121824] border-b border-[#212A37] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono font-bold text-white">ESP32 UART0 Console & AT Command Bus (115200 Baud)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Filter:</span>
                {(['ALL', 'GPS', 'LTE', 'CLOUD'] as const).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setLogFilter(tag)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition ${
                      logFilter === tag ? 'bg-orange-500 text-slate-950' : 'bg-[#1C2533] text-slate-400 hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Terminal Output Stream */}
            <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 bg-[#080C12]">
              {filteredLogs.map((log) => {
                const tagColor =
                  log.tag === 'PWR' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                  log.tag === 'GPS' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                  log.tag === 'LTE' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' :
                  log.tag === 'CLOUD' ? 'text-purple-400 bg-purple-500/10 border-purple-500/30' :
                  'text-amber-400 bg-amber-500/10 border-amber-500/30';

                return (
                  <div key={log.id} className="flex items-start gap-2.5 leading-relaxed hover:bg-[#121824] px-1.5 py-0.5 rounded transition">
                    <span className="text-slate-500 text-[10px] shrink-0">{log.time}</span>
                    <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold shrink-0 ${tagColor}`}>
                      [{log.tag}]
                    </span>
                    <span className="text-slate-200">{log.message}</span>
                  </div>
                );
              })}
              <div ref={terminalBottomRef} />
            </div>

            {/* NMEA live stream footer */}
            <div className="px-4 py-2 bg-[#0E141E] border-t border-[#212A37] flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="truncate">NMEA: <span className="text-emerald-400">{state.gps.nmeaSentence}</span></span>
              <span className="shrink-0 text-slate-500 ml-3">TX Packets: {state.esp32.packetCount}</span>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: LIVE CLOUD JSON TELEMETRY PAYLOAD */}
        {/* ============================================================== */}
        {activeTab === 'PAYLOAD' && (
          <div className="flex-1 flex flex-col rounded-2xl bg-[#0B0F17] border border-[#212A37] p-4 min-h-[440px]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-purple-300">RoutePilot Cloud Ingest Schema</h3>
                <p className="text-[11px] text-slate-400">Endpoint: POST {state.cloud.serverEndpoint}</p>
              </div>
              <button
                type="button"
                onClick={() => roadConstructionEngine.transmitHeartbeatPacket()}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-600/30"
              >
                <span>⚡ Re-Send Payload</span>
              </button>
            </div>

            <pre className="flex-1 p-4 rounded-xl bg-[#070A0F] border border-[#1E293B] text-emerald-400 font-mono text-xs overflow-auto leading-relaxed">
              {JSON.stringify(
                state.cloud.lastReceivedPacket?.payload || {
                  deviceId: 'RP-ROAD-CONSTRUCT-ESP32',
                  hazardType: 'Road Construction',
                  status: state.cloud.isConstructionActive ? 'ACTIVE_WORK_ZONE' : 'BEACON_STANDBY',
                  location: {
                    lat: state.gps.latitude,
                    lng: state.gps.longitude,
                    name: state.gps.locationName,
                    road: state.gps.roadName,
                    radiusMeters: state.cloud.workZoneRadiusMeters,
                  },
                  laneStatus: state.cloud.laneStatus,
                  severity: state.cloud.severity,
                  telemetry: {
                    batteryVoltageV: state.power.batteryVoltage,
                    batteryPercent: state.power.batteryPercent,
                    signalRssiDbm: state.modem.rssiDbm,
                    satellites: state.gps.satellitesTracked,
                    hdop: state.gps.hdop,
                  },
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              )}
            </pre>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: SITE CORRIDORS & 1-CLICK DEPLOY */}
        {/* ============================================================== */}
        {activeTab === 'PRESETS' && (
          <div className="flex-1 flex flex-col gap-3 min-h-[440px]">
            <h3 className="text-xs font-bold text-slate-300">Select Test Corridor for Construction Telemetry Deployment:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presetSites.map((site, i) => {
                const isSelected = Math.abs(state.gps.latitude - site.lat) < 0.001;
                return (
                  <div
                    key={i}
                    onClick={() => roadConstructionEngine.selectPresetSite(i)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-orange-500/10 border-orange-500 text-white shadow-xl shadow-orange-500/10'
                        : 'bg-[#111622] border-[#212A37] text-slate-300 hover:border-slate-500 hover:bg-[#161E2A]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-white">{site.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#212A37] text-amber-300">
                          {site.radius}m Radius
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-2">{site.roadName}</div>
                      <p className="text-[11px] text-slate-300 italic">{site.desc}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#212A37] flex items-center justify-between text-xs">
                      <span className="font-mono text-cyan-300 text-[10px]">
                        {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          roadConstructionEngine.selectPresetSite(i);
                          roadConstructionEngine.deployConstructionZone();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] transition shadow cursor-pointer"
                      >
                        Deploy Here ➔
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
