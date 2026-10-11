import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Radio,
  Wifi,
  Globe,
  Server,
  Cpu,
  Battery,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Sliders,
  ExternalLink,
  MapPin,
  HardHat,
  Zap,
} from 'lucide-react';
import { realtimeSync } from '../../../services/realtimeSync';
import { Hazard } from '../../../types';
import { RoadConstructionCircuitCanvas } from './RoadConstructionCircuitCanvas';

interface RoadConstructionSimulatorProps {
  onNavigateToMap?: () => void;
}

interface EventLog {
  id: string;
  time: string;
  stage: 'GPS' | 'ESP32' | 'SIM7600' | 'INTERNET' | 'BACKEND';
  level: 'INFO' | 'DATA' | 'WARN' | 'SUCCESS';
  message: string;
}

export const RoadConstructionSimulator: React.FC<RoadConstructionSimulatorProps> = ({
  onNavigateToMap,
}) => {
  // Master Simulation State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(true);
  const [lteEnabled, setLteEnabled] = useState<boolean>(true);
  const [constructionStatus, setConstructionStatus] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [activeHazardId, setActiveHazardId] = useState<string | null>(null);

  // Active Corridor Location Preset
  const [locationPreset, setLocationPreset] = useState<'NH27' | 'ORCHHA' | 'CIVIL_LINES'>('NH27');

  // Electrical & Battery State
  const [batteryPct, setBatteryPct] = useState<number>(92);
  const [batteryVoltage, setBatteryVoltage] = useState<number>(3.84); // 3.7V nominal

  // Transmission Pipeline Animation State
  const [transmissionStage, setTransmissionStage] = useState<
    'IDLE' | 'GPS_READ' | 'ESP32_PROCESS' | 'LTE_TRANSMIT' | 'INTERNET_ROUTING' | 'CLOUD_ACK'
  >('IDLE');
  const [pulseTick, setPulseTick] = useState<number>(0);

  // Inspector & Drawers
  const [activeDrawer, setActiveDrawer] = useState<'LOGS' | 'STATUS' | 'PINS' | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  // Event Logs
  const [logs, setLogs] = useState<EventLog[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      stage: 'ESP32',
      level: 'INFO',
      message: 'ESP32 DevKit V1 boot sequence OK. Power supply nominal (5V/3.3V).',
    },
    {
      id: 'init-2',
      time: new Date().toLocaleTimeString(),
      stage: 'GPS',
      level: 'INFO',
      message: 'NEO-6M UART initialized on RX2 (GPIO16), TX2 (GPIO17). 9 Satellites locked.',
    },
    {
      id: 'init-3',
      time: new Date().toLocaleTimeString(),
      stage: 'SIM7600',
      level: 'INFO',
      message: 'SIM7600 4G/LTE registered on network. AT+CSQ: 24,99 (-68 dBm).',
    },
  ]);

  const hazardRef = useRef<string | null>(null);
  hazardRef.current = activeHazardId;

  // Preset Coordinates
  const PRESET_COORDS = {
    NH27: {
      name: 'NH-27 Highway Km 42 Work Zone',
      road: 'NH-27 National Highway',
      lat: 25.4585,
      lng: 78.5765,
      workDesc: 'Pavement resurfacing & lane restriction in progress',
      radius: 250,
    },
    ORCHHA: {
      name: 'Orchha Link Bypass Arterial',
      road: 'Orchha Bypass Rd',
      lat: 25.438,
      lng: 78.552,
      workDesc: 'Bridge culvert reconstruction & heavy machinery active',
      radius: 200,
    },
    CIVIL_LINES: {
      name: 'Civil Lines Road Connector',
      road: 'Civil Lines Arterial',
      lat: 25.4642,
      lng: 78.5728,
      workDesc: 'Underground utility trenching & traffic diversion',
      radius: 180,
    },
  };

  const currentCoords = PRESET_COORDS[locationPreset];

  // Helper to append timestamped event logs
  const appendLog = (
    stage: EventLog['stage'],
    level: EventLog['level'],
    message: string
  ) => {
    const newLog: EventLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: new Date().toLocaleTimeString(),
      stage,
      level,
      message,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  // Sync Construction Hazard to RoutePilot
  const syncHazardToRoutePilot = (status: 'ACTIVE' | 'COMPLETED') => {
    if (status === 'ACTIVE') {
      // If we don't already have an active hazard or preset changed, add one
      if (!hazardRef.current) {
        const newHaz = realtimeSync.createHazard({
          type: 'Road Construction',
          severity: 'WARNING',
          latitude: currentCoords.lat,
          longitude: currentCoords.lng,
          locationName: currentCoords.name,
          roadName: currentCoords.road,
          affectedRadius: currentCoords.radius,
          description: `[SIMULATED IoT Alert Device]: ${currentCoords.workDesc}`,
          source: 'LIVE_HARDWARE',
        });
        setActiveHazardId(newHaz.hazardId);
        appendLog(
          'BACKEND',
          'SUCCESS',
          `RoutePilot Map Synced: Active construction marker created at ${currentCoords.name} (${newHaz.hazardId}).`
        );
      }
    } else {
      // COMPLETED: Resolve and clear hazard
      if (hazardRef.current) {
        realtimeSync.resolveHazard(hazardRef.current);
        appendLog(
          'BACKEND',
          'INFO',
          `RoutePilot Map Synced: Construction hazard resolved. Warning marker cleared.`
        );
        setActiveHazardId(null);
      }
    }
  };

  // Cleanup on unmount: Resolve simulated hazard if created
  useEffect(() => {
    return () => {
      if (hazardRef.current) {
        realtimeSync.resolveHazard(hazardRef.current);
      }
    };
  }, []);

  // Sync on initial load and when status/preset changes
  useEffect(() => {
    if (isRunning && lteEnabled) {
      syncHazardToRoutePilot(constructionStatus);
    }
  }, [constructionStatus, locationPreset, isRunning, lteEnabled]);

  // Master Simulation Loop (Telemetry Cycles and Transmission Stages)
  useEffect(() => {
    if (!isRunning) {
      setTransmissionStage('IDLE');
      return;
    }

    const interval = setInterval(() => {
      setPulseTick((t) => (t + 1) % 1000);

      // Simulation Stage Progression (every ~3-4 seconds per full packet broadcast)
      setTransmissionStage((prev) => {
        if (!gpsEnabled) return 'IDLE';

        switch (prev) {
          case 'IDLE':
            return 'GPS_READ';
          case 'GPS_READ':
            appendLog(
              'GPS',
              'DATA',
              `NMEA $GPGGA: Lat ${currentCoords.lat.toFixed(4)}, Lng ${currentCoords.lng.toFixed(4)}, Fix=1, Sats=9`
            );
            return 'ESP32_PROCESS';
          case 'ESP32_PROCESS':
            appendLog(
              'ESP32',
              'DATA',
              `JSON payload packaged: {"dev":"ESP32-CONST-01","status":"${constructionStatus}","lat":${currentCoords.lat},"lng":${currentCoords.lng}}`
            );
            return lteEnabled ? 'LTE_TRANSMIT' : 'IDLE';
          case 'LTE_TRANSMIT':
            appendLog(
              'SIM7600',
              'DATA',
              `AT+HTTPDATA: Sending 148 bytes over 4G LTE uplink (IP: 10.42.19.82)...`
            );
            return 'INTERNET_ROUTING';
          case 'INTERNET_ROUTING':
            appendLog(
              'INTERNET',
              'INFO',
              `Cellular IP packet routed to cloud endpoint /api/v1/road-hazards/construction`
            );
            return 'CLOUD_ACK';
          case 'CLOUD_ACK':
            appendLog(
              'BACKEND',
              'SUCCESS',
              `HTTP 200 OK — Telemetry ingested. RoutePilot Map updated.`
            );
            return 'IDLE';
          default:
            return 'IDLE';
        }
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isRunning, gpsEnabled, lteEnabled, constructionStatus, currentCoords]);

  // Subtle realistic telemetry jitter while running
  useEffect(() => {
    if (!isRunning) return;
    const jitterTimer = setInterval(() => {
      setBatteryVoltage((prev) => {
        const jitter = (Math.random() - 0.5) * 0.01;
        return Number(Math.max(3.5, Math.min(4.15, prev + jitter)).toFixed(2));
      });
    }, 3500);
    return () => clearInterval(jitterTimer);
  }, [isRunning]);

  // Handle hardware reboot via EN pin on ESP32
  const handleRebootEsp32 = () => {
    appendLog('ESP32', 'WARN', 'Hardware Reset (EN Pin toggled LOW). Rebooting MCU...');
    setTransmissionStage('IDLE');
    setTimeout(() => {
      appendLog('ESP32', 'INFO', 'ESP32-DevKitV1 rebooted successfully (CPU 240MHz, Free Heap 284KB).');
      appendLog('GPS', 'INFO', 'NEO-6M UART2 re-synchronized on RX2/TX2.');
      appendLog('SIM7600', 'INFO', 'SIM7600 4G/LTE registered on network (AT+CSQ: 24,99).');
    }, 700);
  };

  // Reset Simulation Handler
  const handleReset = () => {
    setIsRunning(true);
    setGpsEnabled(true);
    setLteEnabled(true);
    setConstructionStatus('ACTIVE');
    setBatteryPct(92);
    setBatteryVoltage(3.84);
    setTransmissionStage('IDLE');
    setLogs([
      {
        id: `reset-${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        stage: 'ESP32',
        level: 'INFO',
        message: 'System reset to default state. ESP32 DevKit restarted.',
      },
    ]);
    syncHazardToRoutePilot('ACTIVE');
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#070A0F] text-xs">
      {/* ============================================================== */}
      {/* 1. TOP INTERACTIVE TOOLBAR (FITS WITHIN ~52px) */}
      {/* ============================================================== */}
      <header className="px-3 py-2 bg-[#161B22] border-b border-[#30363D] flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
        {/* Left: Title & Master Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs">
            <HardHat className="w-4 h-4 text-amber-400" />
            <span>Road Construction Alert Device</span>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">• IoT Simulation</span>
          </div>

          {/* Master Run / Pause / Reset Buttons */}
          <div className="flex items-center gap-1 bg-[#21262D] p-0.5 rounded-xl border border-[#30363D]">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title={isRunning ? 'Pause Simulation' : 'Start Simulation'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause' : 'Start Simulation'}</span>
            </button>

            <button
              onClick={handleReset}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#30363D] transition cursor-pointer flex items-center gap-1"
              title="Reset Simulation to Initial State"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Virtual Contractor Status: ACTIVE / COMPLETED Toggle */}
          <div className="flex items-center gap-1.5 bg-[#0D1117] px-2 py-1 rounded-xl border border-[#30363D]">
            <span className="text-[11px] font-semibold text-slate-300">Work Status:</span>
            <button
              onClick={() => setConstructionStatus('ACTIVE')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                constructionStatus === 'ACTIVE'
                  ? 'bg-orange-600 text-white shadow-sm animate-pulse'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🚧 Active</span>
            </button>
            <button
              onClick={() => setConstructionStatus('COMPLETED')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                constructionStatus === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>✓ Completed</span>
            </button>
          </div>
        </div>

        {/* Right: Module Toggles & Drawers */}
        <div className="flex items-center flex-wrap gap-2">
          {/* GPS Toggle */}
          <button
            onClick={() => {
              setGpsEnabled(!gpsEnabled);
              appendLog(
                'GPS',
                gpsEnabled ? 'WARN' : 'INFO',
                gpsEnabled ? 'GPS receiver disabled by user.' : 'GPS receiver enabled. Searching satellites...'
              );
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
              gpsEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-[#21262D] border-[#30363D] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>GPS {gpsEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* 4G/LTE Toggle */}
          <button
            onClick={() => {
              setLteEnabled(!lteEnabled);
              appendLog(
                'SIM7600',
                lteEnabled ? 'WARN' : 'INFO',
                lteEnabled ? '4G/LTE cellular modem powered down.' : '4G/LTE modem registered on network.'
              );
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
              lteEnabled
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-[#21262D] border-[#30363D] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>4G/LTE {lteEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Location Preset Selector */}
          <select
            value={locationPreset}
            onChange={(e) => setLocationPreset(e.target.value as any)}
            className="bg-[#21262D] border border-[#30363D] text-slate-200 text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-[#AEF5F0] cursor-pointer"
            title="Simulated Construction Site Location"
          >
            <option value="NH27">NH-27 Highway Km 42</option>
            <option value="ORCHHA">Orchha Bypass Road</option>
            <option value="CIVIL_LINES">Civil Lines Connector</option>
          </select>

          {/* View on Map Button */}
          {onNavigateToMap && (
            <button
              onClick={onNavigateToMap}
              className="px-2.5 py-1 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-xs shadow transition cursor-pointer flex items-center gap-1"
              title="View this simulated hazard warning on RoutePilot Live Map"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View on Map</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          {/* Drawer Toggles */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'LOGS' ? null : 'LOGS')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
              activeDrawer === 'LOGS'
                ? 'bg-[#AEF5F0] text-slate-950 border-[#AEF5F0]'
                : 'bg-[#21262D] border-[#30363D] text-slate-300 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Event Logs</span>
          </button>

          <button
            onClick={() => setActiveDrawer(activeDrawer === 'STATUS' ? null : 'STATUS')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
              activeDrawer === 'STATUS'
                ? 'bg-[#AEF5F0] text-slate-950 border-[#AEF5F0]'
                : 'bg-[#21262D] border-[#30363D] text-slate-300 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Diagnostics</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. SUB-BANNER: ROUTEPILOT MAP DIVERSION BROADCAST STATUS */}
      {/* ============================================================== */}
      <div className="px-3 py-1.5 bg-[#0D1117] border-b border-[#30363D] flex items-center justify-between gap-2 shrink-0 text-[11px]">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              constructionStatus === 'ACTIVE'
                ? 'bg-orange-500 animate-ping'
                : 'bg-emerald-500'
            }`}
          />
          <span className="font-bold text-slate-200">
            {constructionStatus === 'ACTIVE'
              ? 'ACTIVE CONSTRUCTION BROADCASTING'
              : 'CONSTRUCTION RESOLVED / NORMAL TRAFFIC'}
          </span>
          <span className="text-slate-400 hidden md:inline">
            Location: {currentCoords.name} ({currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)})
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="text-cyan-300">
            Pipeline:{' '}
            <strong className="text-white">
              {transmissionStage === 'IDLE'
                ? 'Standby'
                : transmissionStage === 'GPS_READ'
                ? '1. Reading GPS'
                : transmissionStage === 'ESP32_PROCESS'
                ? '2. ESP32 Packaging'
                : transmissionStage === 'LTE_TRANSMIT'
                ? '3. SIM7600 Transmit'
                : transmissionStage === 'INTERNET_ROUTING'
                ? '4. Cellular Uplink'
                : '5. Cloud Ingested ✓'}
            </strong>
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400">
            Batt: {batteryVoltage.toFixed(2)}V ({batteryPct}%)
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MAIN CANVAS AREA (FITS SCREEN WITHOUT SCROLLING) */}
      {/* ============================================================== */}
      <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden flex">
        {/* Interactive Scalable SVG Circuit Blueprint */}
        <RoadConstructionCircuitCanvas
          isRunning={isRunning}
          gpsEnabled={gpsEnabled}
          lteEnabled={lteEnabled}
          constructionStatus={constructionStatus}
          transmissionStage={transmissionStage}
          pulseTick={pulseTick}
          batteryPct={batteryPct}
          batteryVoltage={batteryVoltage}
          selectedComponent={selectedComponent}
          onSelectComponent={setSelectedComponent}
          onRebootEsp32={handleRebootEsp32}
        />

        {/* ============================================================== */}
        {/* 4. SLIDE-OVER DRAWER FOR LOGS / DIAGNOSTICS */}
        {/* ============================================================== */}
        {activeDrawer === 'LOGS' && (
          <div className="absolute top-0 right-0 bottom-0 w-80 md:w-96 bg-[#161B22]/95 border-l border-[#30363D] shadow-2xl backdrop-blur-md flex flex-col z-30 animate-in slide-in-from-right duration-200">
            <div className="p-3 border-b border-[#30363D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#AEF5F0]" />
                <span className="font-bold text-white text-xs">Simulated Serial Monitor</span>
              </div>
              <button
                onClick={() => setActiveDrawer(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer px-1"
              >
                ✕
              </button>
            </div>

            <div className="p-2 border-b border-[#30363D] bg-[#0D1117] flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Baud: 115200 (UART2 / UART0)</span>
              <button
                onClick={() => setLogs([])}
                className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="flex-1 p-2.5 overflow-y-auto font-mono text-[11px] space-y-1.5 select-text">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-1.5 rounded bg-[#0D1117]/80 border ${
                    log.level === 'SUCCESS'
                      ? 'border-emerald-500/40 text-emerald-300'
                      : log.level === 'WARN'
                      ? 'border-amber-500/40 text-amber-300'
                      : log.level === 'DATA'
                      ? 'border-cyan-500/30 text-cyan-200'
                      : 'border-[#30363D] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] text-slate-500 mb-0.5">
                    <span>[{log.time}]</span>
                    <span className="font-bold text-slate-400">{log.stage}</span>
                  </div>
                  <div className="break-words">{log.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnostics & Component Inspector Drawer */}
        {(activeDrawer === 'STATUS' || selectedComponent !== null) && (
          <div className="absolute top-0 right-0 bottom-0 w-80 md:w-96 bg-[#161B22]/95 border-l border-[#30363D] shadow-2xl backdrop-blur-md flex flex-col z-30 animate-in slide-in-from-right duration-200">
            <div className="p-3 border-b border-[#30363D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#AEF5F0]" />
                <span className="font-bold text-white text-xs">
                  {selectedComponent ? `Inspector: ${selectedComponent.replace('_', ' ')}` : 'Electrical & Link Diagnostics'}
                </span>
              </div>
              <button
                onClick={() => {
                  setActiveDrawer(null);
                  setSelectedComponent(null);
                }}
                className="text-slate-400 hover:text-white text-xs cursor-pointer px-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {/* Power Diagnostics */}
              <div className="p-3 rounded-xl bg-[#0D1117] border border-[#30363D] space-y-2">
                <div className="text-[11px] font-bold text-red-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Power System (Battery + Regulator)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded bg-[#161B22]">
                    <div className="text-slate-400">18650 Cell</div>
                    <div className="text-white font-bold">{batteryVoltage.toFixed(2)}V ({batteryPct}%)</div>
                  </div>
                  <div className="p-2 rounded bg-[#161B22]">
                    <div className="text-slate-400">Regulator 5V Rail</div>
                    <div className="text-emerald-400 font-bold">5.02V (Peak 2A)</div>
                  </div>
                  <div className="p-2 rounded bg-[#161B22]">
                    <div className="text-slate-400">Regulator 3.3V</div>
                    <div className="text-yellow-400 font-bold">3.31V Regulated</div>
                  </div>
                  <div className="p-2 rounded bg-[#161B22]">
                    <div className="text-slate-400">Current Draw</div>
                    <div className="text-cyan-400 font-bold">~165 mA (Idle)</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  ⚡ 3.7V nominal Li-ion cell stepped up/regulated to 5.0V for SIM7600/VIN and 3.3V for ESP32/GPS. Solar &amp; TP4056 excluded as per specifications.
                </p>
              </div>

              {/* GPS Diagnostics */}
              <div className="p-3 rounded-xl bg-[#0D1117] border border-[#30363D] space-y-2">
                <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>GPS Module (NEO-6M)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded bg-[#161B22]">
                    <div className="text-slate-400">Fix Status</div>
                    <div className="text-emerald-400 font-bold">{gpsEnabled ? '3D FIX (9 Sats)' : 'OFFLINE'}</div>
                  </div>
                  <div className="p-2 rounded bg-[#161B22]">
                    <div className="text-slate-400">HDOP</div>
                    <div className="text-white font-bold">1.18 (High Precision)</div>
                  </div>
                  <div className="p-2 rounded bg-[#161B22] col-span-2">
                    <div className="text-slate-400">Coordinates</div>
                    <div className="text-[#AEF5F0] font-bold">{currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</div>
                  </div>
                </div>
              </div>

              {/* 4G/LTE Diagnostics */}
              <div className="p-3 rounded-xl bg-[#0D1117] border border-[#30363D] space-y-2">
                <div className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  <span>4G/LTE Module (SIM7600)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded bg-[#161B22]">
                    <div className="text-slate-400">Carrier</div>
                    <div className="text-white font-bold">{lteEnabled ? 'Jio 4G / Airtel LTE' : 'DISCONNECTED'}</div>
                  </div>
                  <div className="p-2 rounded bg-[#161B22]">
                    <div className="text-slate-400">Signal (RSSI)</div>
                    <div className="text-emerald-400 font-bold">-68 dBm (4 Bars)</div>
                  </div>
                  <div className="p-2 rounded bg-[#161B22] col-span-2">
                    <div className="text-slate-400">Protocols</div>
                    <div className="text-slate-200">MQTT over TLS / HTTP REST POST</div>
                  </div>
                </div>
              </div>

              {/* Backend Ingestion */}
              <div className="p-3 rounded-xl bg-[#0D1117] border border-[#30363D] space-y-2">
                <div className="text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  <span>RoutePilot Backend Synchronization</span>
                </div>
                <div className="text-[10px] text-slate-300 font-mono space-y-1">
                  <div>Status: <span className="text-emerald-400 font-bold">SYNCHRONIZED (LOCAL STORE)</span></div>
                  <div>Active Hazard ID: <span className="text-amber-300">{activeHazardId || 'None'}</span></div>
                  <div>Map Rendering: <span className="text-orange-400">🏗️ Road Construction Marker</span></div>
                </div>
                <p className="text-[10px] text-slate-500">
                  ℹ️ Simulated telemetry directly feeds RoutePilot's real-time state machine and driver dynamic diversion engine.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
