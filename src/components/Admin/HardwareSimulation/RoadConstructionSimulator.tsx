import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Server,
  Compass,
  Terminal,
  Sliders,
  Zap,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { realtimeSync } from '../../../services/realtimeSync';
import { Hazard } from '../../../types';
import { RoadConstructionCircuitCanvas } from './RoadConstructionCircuitCanvas';
import { ROAD_PIN_MAPPINGS, ROAD_WIRE_CONNECTIONS } from '../../../services/roadCircuitPinMapping';

interface RoadConstructionSimulatorProps {
  onNavigateToMap?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  activeDrawer?: 'LOGS' | 'STATUS' | 'PINS' | null;
  onSetDrawer?: (drawer: 'LOGS' | 'STATUS' | 'PINS' | null) => void;
  isRunning?: boolean;
  gpsEnabled?: boolean;
  lteEnabled?: boolean;
  constructionStatus?: 'ACTIVE' | 'COMPLETED';
  resetTrigger?: number;
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
  isFullscreen: propIsFullscreen,
  onToggleFullscreen,
  activeDrawer: propActiveDrawer,
  onSetDrawer,
  isRunning: propIsRunning,
  gpsEnabled: propGpsEnabled,
  lteEnabled: propLteEnabled,
  constructionStatus: propConstructionStatus,
  resetTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const effectiveFullscreen = propIsFullscreen !== undefined ? propIsFullscreen : internalFullscreen;

  const handleToggleFullscreen = async () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }

    if (!internalFullscreen) {
      setInternalFullscreen(true);
      try {
        if (containerRef.current && containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } catch {
        // CSS fallback
      }
    } else {
      setInternalFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (onToggleFullscreen) return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && internalFullscreen) {
        setInternalFullscreen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && internalFullscreen) {
        setInternalFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [internalFullscreen, onToggleFullscreen]);

  // Master Simulation State
  const [internalIsRunning, setInternalIsRunning] = useState<boolean>(true);
  const [internalGpsEnabled, setInternalGpsEnabled] = useState<boolean>(true);
  const [internalLteEnabled, setInternalLteEnabled] = useState<boolean>(true);
  const [internalConstructionStatus, setInternalConstructionStatus] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [activeHazardId, setActiveHazardId] = useState<string | null>(null);

  const isRunning = propIsRunning !== undefined ? propIsRunning : internalIsRunning;
  const gpsEnabled = propGpsEnabled !== undefined ? propGpsEnabled : internalGpsEnabled;
  const lteEnabled = propLteEnabled !== undefined ? propLteEnabled : internalLteEnabled;
  const constructionStatus = propConstructionStatus !== undefined ? propConstructionStatus : internalConstructionStatus;

  const prevResetRef = useRef(resetTrigger);
  useEffect(() => {
    if (resetTrigger !== undefined && prevResetRef.current !== undefined && resetTrigger !== prevResetRef.current) {
      handleReset();
    }
    prevResetRef.current = resetTrigger;
  }, [resetTrigger]);

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
  const [internalDrawer, setInternalDrawer] = useState<'LOGS' | 'STATUS' | 'PINS' | null>(null);
  const activeDrawer = propActiveDrawer !== undefined ? propActiveDrawer : internalDrawer;
  const setActiveDrawer = (drawer: 'LOGS' | 'STATUS' | 'PINS' | null) => {
    if (onSetDrawer) {
      onSetDrawer(drawer);
    } else {
      setInternalDrawer(drawer);
    }
  };
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
      // Do NOT auto-create hazard! Hazard count should only increase when user places hazard on map!
      appendLog(
        'BACKEND',
        'INFO',
        `RoutePilot Status: Work zone IoT beacon telemetry active (${currentCoords.name}). Ready for map hazard placement.`
      );
    } else {
      // COMPLETED: Resolve and clear hazard if any was active
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
    setInternalIsRunning(true);
    setInternalGpsEnabled(true);
    setInternalLteEnabled(true);
    setInternalConstructionStatus('ACTIVE');
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
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#070A0F] text-xs ${
        effectiveFullscreen && !onToggleFullscreen ? 'fixed inset-0 z-[5000] w-screen h-screen bg-[#090D13]' : ''
      }`}
    >
      {/* ============================================================== */}
      {/* MAIN CANVAS AREA (FITS SCREEN WITHOUT SCROLLING) */}
      {/* ============================================================== */}
      <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden flex">
        {/* Quick Fullscreen Floating Action in Canvas Corner (same as Bridge simulation) */}
        <button
          onClick={handleToggleFullscreen}
          title={effectiveFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Simulation to Fullscreen'}
          className="absolute top-3 right-3 z-30 px-3 py-1.5 rounded-xl bg-[#161B22]/90 hover:bg-[#21262D] border border-[#30363D] hover:border-[#AEF5F0] text-slate-300 hover:text-[#AEF5F0] shadow-xl backdrop-blur-md transition cursor-pointer flex items-center gap-1.5"
        >
          {effectiveFullscreen ? (
            <>
              <svg className="w-4 h-4 text-[#AEF5F0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v4m0-4h4m6 6l5-5m0 0v4m0-4h-4m-6 6l-5 5m0 0v-4m0 4h4m6-6l5 5m0 0v-4m0 4h-4" />
              </svg>
              <span className="text-[11px] font-bold text-slate-200">Exit Fullscreen</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-[#AEF5F0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span className="text-[11px] font-bold text-slate-200">Fullscreen</span>
            </>
          )}
        </button>
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

        {/* ============================================================== */}
        {/* HARDWARE WIRING & PIN AUDIT DRAWER (PINS) */}
        {/* ============================================================== */}
        {activeDrawer === 'PINS' && (
          <div className="absolute top-0 right-0 bottom-0 w-80 md:w-[460px] bg-[#161B22]/95 border-l border-[#30363D] shadow-2xl backdrop-blur-md flex flex-col z-30 animate-in slide-in-from-right duration-200">
            <div className="p-3 border-b border-[#30363D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#AEF5F0]" />
                <span className="font-bold text-white text-xs">Hardware Wiring &amp; Pin Audit</span>
              </div>
              <button
                onClick={() => setActiveDrawer(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer px-1"
              >
                ✕
              </button>
            </div>

            <div className="p-2.5 border-b border-[#30363D] bg-[#0D1117] flex items-center justify-between text-[10px] font-mono">
              <span className="text-amber-400 font-bold">STATUS: SIMULATED — NOT LIVE</span>
              <span className="text-emerald-400 font-bold">14/14 Wires Validated</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3 font-mono text-[11px]">
              {/* Architecture Summary */}
              <div className="p-2.5 rounded-xl bg-[#0D1117] border border-[#30363D] space-y-1.5 text-[10px] text-slate-300">
                <div className="text-white font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Audited Electrical Architecture</span>
                </div>
                <div className="space-y-1 text-slate-400">
                  <div>• <span className="text-red-400 font-bold">Power</span>: 18650 (3.7V) → Boost Converter → 5.0V (VIN &amp; SIM7600 VCC 2A peak) + 3.3V (GPS VCC).</div>
                  <div>• <span className="text-slate-200 font-bold">Ground</span>: Star/common GND bus uniting Battery, Converter, ESP32, GPS, and SIM7600.</div>
                  <div>• <span className="text-sky-400 font-bold">GPS UART</span>: NEO-6M TX → ESP32 RX2 (GPIO 16) | ESP32 TX2 (GPIO 17) → GPS RX.</div>
                  <div>• <span className="text-emerald-400 font-bold">LTE UART</span>: SIM7600 TX → ESP32 RX (GPIO 21) | ESP32 TX (GPIO 22) → SIM7600 RX.</div>
                  <div>• <span className="text-purple-400 font-bold">Network</span>: SIM7600 Antenna → Internet → RoutePilot Backend (Logical links, no copper wires).</div>
                </div>
              </div>

              {/* Verified GPIO Mappings */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-white">GPIO Allocation &amp; Signal Validation:</div>
                <div className="space-y-1.5 text-[10px]">
                  {ROAD_PIN_MAPPINGS.map((p, idx) => (
                    <div key={`pin-map-${idx}`} className="p-2 bg-[#0D1117] border border-[#30363D] rounded-lg">
                      <div className="flex justify-between items-center text-white font-bold">
                        <span>{p.component} • {p.pin}</span>
                        <span className="text-[#AEF5F0]">{p.esp32Pin}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 mt-1">
                        <span>{p.signalType} ({p.voltage})</span>
                        <span className="text-emerald-400 font-bold">✓ Electrically Valid</span>
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{p.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wire Connection Table */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-white">Complete Connection Table (Source of Truth):</div>
                <div className="space-y-1.5 text-[10px]">
                  {ROAD_WIRE_CONNECTIONS.map((w) => (
                    <div key={`wire-conn-${w.id}`} className="p-2 bg-[#0D1117] border border-[#30363D] rounded-lg">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color }} />
                          <span className="text-white">{w.sourceComponent} [{w.sourcePin}]</span>
                        </span>
                        <span className="text-sky-300">→ {w.targetComponent} [{w.targetPin}]</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 mt-1">
                        <span>{w.signalType} • {w.voltage}</span>
                        <span className="text-emerald-400 font-bold">✓ Valid &amp; Connected</span>
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5 break-words">{w.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
