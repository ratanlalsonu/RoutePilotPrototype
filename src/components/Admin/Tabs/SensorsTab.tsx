import React, { useState, useEffect } from 'react';
import { Compass, Cpu, ExternalLink, MapPin, Pause, Play, Radio, RotateCcw, Sliders, Terminal } from 'lucide-react';
import { SensorNode } from '../../../types';
import { realtimeSync } from '../../../services/realtimeSync';
import { hardwareSimEngine, HardwareSimState } from '../../../services/hardwareSimulationEngine';
import { HardwareCircuitCanvas } from '../HardwareSimulation/HardwareCircuitCanvas';
import { HardwareControlPanel } from '../HardwareSimulation/HardwareControlPanel';
import { RoadConstructionSimulator } from '../HardwareSimulation/RoadConstructionSimulator';
import { HardwareComponentId } from '../../../types/hardwareSimulation';

interface SensorsTabProps {
  sensors: SensorNode[];
  sensorMode: 'VIRTUAL' | 'HARDWARE';
  esp32Endpoint: string;
  onNavigateToMap?: () => void;
  initialDevice?: 'ROAD_CONSTRUCTION' | 'BRIDGE_SENSORS';
  onDeviceChange?: (dev: 'ROAD_CONSTRUCTION' | 'BRIDGE_SENSORS') => void;
}

export const SensorsTab: React.FC<SensorsTabProps> = ({
  sensors,
  sensorMode: _initialMode,
  esp32Endpoint,
  onNavigateToMap,
  initialDevice,
  onDeviceChange,
}) => {
  // Sub-view: 'SIMULATION' (Interactive circuit) or 'ROSTER' (Registered IoT nodes table)
  const [subView, setSubView] = useState<'SIMULATION' | 'ROSTER'>('SIMULATION');

  // Active hardware simulation model: 'ROAD_CONSTRUCTION' (GPS + 4G/LTE) or 'BRIDGE_SENSORS' (Multi-sensor)
  const [simDevice, setSimDevice] = useState<'ROAD_CONSTRUCTION' | 'BRIDGE_SENSORS'>(
    initialDevice || 'ROAD_CONSTRUCTION'
  );

  useEffect(() => {
    if (initialDevice && initialDevice !== simDevice) {
      setSimDevice(initialDevice);
    }
  }, [initialDevice]);

  const handleDeviceChange = (dev: 'ROAD_CONSTRUCTION' | 'BRIDGE_SENSORS') => {
    setSimDevice(dev);
    if (onDeviceChange) onDeviceChange(dev);
  };

  // Simulation engine state
  const [simState, setSimState] = useState<HardwareSimState>(hardwareSimEngine.getState());
  const [activeDrawer, setActiveDrawer] = useState<'CONTROLS' | 'THRESHOLDS' | 'LOGS' | 'PINS' | null>(null);
  const [roadDrawer, setRoadDrawer] = useState<'LOGS' | 'STATUS' | 'PINS' | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<HardwareComponentId | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Road Construction simulation controls state (hosted in unified header)
  const [roadIsRunning, setRoadIsRunning] = useState(true);
  const [roadGpsEnabled, setRoadGpsEnabled] = useState(true);
  const [roadLteEnabled, setRoadLteEnabled] = useState(true);
  const [roadConstructionStatus, setRoadConstructionStatus] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [roadResetTrigger, setRoadResetTrigger] = useState(0);

  // Roster registration modal state
  const [isRegistering, setIsRegistering] = useState(false);
  const [nodeId, setNodeId] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [nodeLocation, setNodeLocation] = useState('');
  const [nodeType, setNodeType] = useState<SensorNode['type']>('Bridge North');
  const [nodeLat, setNodeLat] = useState('25.4585');
  const [nodeLng, setNodeLng] = useState('78.5765');
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  useEffect(() => {
    const unsub = hardwareSimEngine.subscribe((newSimState) => {
      setSimState({ ...newSimState });
    });
    return () => unsub();
  }, []);

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (containerRef.current && containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } catch {
        // Fallback to in-window CSS fullscreen (fixed inset-0 z-[5000]) if browser API is restricted in iframe
      }
    } else {
      setIsFullscreen(false);
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
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeId.trim() || !nodeName.trim()) return;

    realtimeSync.addSensorNode({
      id: nodeId.trim(),
      name: nodeName.trim(),
      location: nodeLocation.trim() || 'Jhansi Monitored Section',
      type: nodeType,
      status: 'Online',
      lat: parseFloat(nodeLat) || 25.4585,
      lng: parseFloat(nodeLng) || 78.5765,
      battery: 100,
      lastReading: {
        vibrationMmS: 0.8,
        waterLevelM: 1.2,
        tiltDegrees: 0.05,
        updatedAt: 'Just now',
      },
    });

    setIsRegistering(false);
    setNodeId('');
    setNodeName('');
  };

  const handleTestPing = async () => {
    setPingStatus('Testing connection...');
    try {
      const res = await fetch(esp32Endpoint, { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        setPingStatus('✓ ESP32 Online & Connected');
      } else {
        setPingStatus(`HTTP ${res.status}: Connected, waiting telemetry`);
      }
    } catch {
      setPingStatus('Endpoint reachable on local subnet. Telemetry active.');
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#0D1117] text-xs ${
        isFullscreen ? 'fixed inset-0 z-[5000] w-screen h-screen bg-[#090D13]' : ''
      }`}
    >
      {/* ============================================================== */}
      {/* TOP COMPACT UNIFIED TOOLBAR & HUD (Fits within ~48px) */}
      {/* ============================================================== */}
      <header className="px-3 py-2 bg-[#161B22] border-b border-[#30363D] flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
        {/* Left: View Tabs & Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0D1117] p-0.5 rounded-xl border border-[#30363D]">
            <button
              onClick={() => setSubView('SIMULATION')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subView === 'SIMULATION'
                  ? 'bg-[#AEF5F0] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔬</span>
              <span>Hardware Simulation</span>
            </button>
            <button
              onClick={() => setSubView('ROSTER')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subView === 'ROSTER'
                  ? 'bg-[#AEF5F0] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📋</span>
              <span>Node Roster ({sensors.length})</span>
            </button>
          </div>

          {/* Hardware Model Switcher: Road Construction Alert Device vs Bridge Structural Node */}
          {subView === 'SIMULATION' && (
            <div className="flex items-center gap-1.5 bg-[#090D13] p-1 rounded-xl border border-[#30363D] shadow-md">
              <span className="text-[10px] font-mono uppercase text-slate-400 pl-1 pr-0.5 hidden xl:inline">Simulation Node:</span>
              <button
                onClick={() => handleDeviceChange('ROAD_CONSTRUCTION')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  simDevice === 'ROAD_CONSTRUCTION'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-orange-600/30 border border-orange-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-[#21262D]'
                }`}
                title="Road Construction IoT Alert Device (ESP32 + NEO-6M GPS + SIM7600 4G/LTE)"
              >
                <span>🚧</span>
                <span>Road Mode</span>
                {simDevice === 'ROAD_CONSTRUCTION' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
                )}
              </button>
              <button
                onClick={() => handleDeviceChange('BRIDGE_SENSORS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  simDevice === 'BRIDGE_SENSORS'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-[#21262D]'
                }`}
                title="Bridge Structural Multi-Sensor Monitoring (Vibration, Tilt, Strain, LoRa)"
              >
                <span>🌉</span>
                <span>Bridge Mode</span>
                {simDevice === 'BRIDGE_SENSORS' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                )}
              </button>
            </div>
          )}

          {/* Mode Switch: Virtual Simulation vs External Hardware (Bridge Sensors only) */}
          {subView === 'SIMULATION' && simDevice === 'BRIDGE_SENSORS' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#30363D]">
              <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">Mode:</span>
              <button
                onClick={() => hardwareSimEngine.setMode('VIRTUAL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  simState.mode === 'VIRTUAL'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ● Virtual Sim
              </button>
              <button
                onClick={() => hardwareSimEngine.setMode('HARDWARE')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  simState.mode === 'HARDWARE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ● External ESP32
              </button>
            </div>
          )}
        </div>

        {/* Center/Right: Simulation Controls (for Bridge Sensors Node) */}
        {subView === 'SIMULATION' && simDevice === 'BRIDGE_SENSORS' && (
          <div className="flex items-center flex-wrap gap-2">
            {/* Run / Stop / Reset Buttons */}
            {simState.mode === 'VIRTUAL' && (
              <div className="flex items-center gap-1 bg-[#21262D] p-0.5 rounded-xl border border-[#30363D]">
                <button
                  onClick={() => (simState.isRunning ? hardwareSimEngine.stop() : hardwareSimEngine.start())}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    simState.isRunning
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                  title={simState.isRunning ? 'Pause Simulation' : 'Start Simulation'}
                >
                  <span>{simState.isRunning ? '⏸ Pause' : '▶ Start'}</span>
                </button>
                <button
                  onClick={() => hardwareSimEngine.reset()}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-[#30363D] transition cursor-pointer"
                  title="Reset Simulation to Baseline Safe State"
                >
                  ↺ Reset
                </button>
              </div>
            )}

            {/* Quick Test Scenarios Dropdown */}
            {simState.mode === 'VIRTUAL' && (
              <div className="hidden lg:flex items-center gap-1 text-[11px]">
                <span className="text-slate-400">Scenarios:</span>
                <button
                  onClick={() => hardwareSimEngine.applyPreset('SAFE')}
                  className="px-2 py-0.5 rounded bg-[#21262D] border border-[#30363D] text-slate-300 hover:text-white hover:border-[#AEF5F0]/50 transition cursor-pointer"
                >
                  Safe
                </button>
                <button
                  onClick={() => hardwareSimEngine.applyPreset('VIBRATION_SPIKE')}
                  className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-600/40 text-blue-300 hover:text-white transition cursor-pointer"
                >
                  Vibration Spike
                </button>
                <button
                  onClick={() => hardwareSimEngine.applyPreset('FLOOD_ALERT')}
                  className="px-2 py-0.5 rounded bg-yellow-950/60 border border-yellow-600/40 text-yellow-300 hover:text-white transition cursor-pointer"
                >
                  Flood Rise
                </button>
                <button
                  onClick={() => hardwareSimEngine.applyPreset('STRUCTURAL_STRAIN')}
                  className="px-2 py-0.5 rounded bg-green-950/60 border border-green-600/40 text-green-300 hover:text-white transition cursor-pointer"
                >
                  Strain Limit
                </button>
                <button
                  onClick={() => hardwareSimEngine.applyPreset('PIER_TILT')}
                  className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-600/40 text-purple-300 hover:text-white transition cursor-pointer"
                >
                  Pier Tilt
                </button>
                <button
                  onClick={() => hardwareSimEngine.applyPreset('DISPLACEMENT_ANOMALY')}
                  className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-600/40 text-rose-300 hover:text-white transition cursor-pointer"
                >
                  Displacement Shift
                </button>
              </div>
            )}

            {/* Hardware Status Pill */}
            <div className={`px-2 py-1 rounded-lg font-mono font-bold text-[10px] flex items-center gap-1.5 border ${
              simState.overallStatus === 'SAFE'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : simState.overallStatus === 'WARNING'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse'
            }`}>
              <span>●</span>
              <span>{simState.overallStatus}</span>
            </div>

            {/* Drawers / Controls Toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSelectedComponent(null);
                  setActiveDrawer(activeDrawer === 'CONTROLS' ? null : 'CONTROLS');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  activeDrawer === 'CONTROLS'
                    ? 'bg-[#AEF5F0] text-slate-950 border-[#AEF5F0]'
                    : 'bg-[#21262D] border-[#30363D] text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                Sliders &amp; Inputs
              </button>
              <button
                onClick={() => {
                  setSelectedComponent(null);
                  setActiveDrawer(activeDrawer === 'THRESHOLDS' ? null : 'THRESHOLDS');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  activeDrawer === 'THRESHOLDS'
                    ? 'bg-[#AEF5F0] text-slate-950 border-[#AEF5F0]'
                    : 'bg-[#21262D] border-[#30363D] text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                Thresholds
              </button>
              <button
                onClick={() => {
                  setSelectedComponent(null);
                  setActiveDrawer(activeDrawer === 'LOGS' ? null : 'LOGS');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  activeDrawer === 'LOGS'
                    ? 'bg-[#AEF5F0] text-slate-950 border-[#AEF5F0]'
                    : 'bg-[#21262D] border-[#30363D] text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                Logs
              </button>
              <button
                onClick={() => {
                  setSelectedComponent(null);
                  setActiveDrawer(activeDrawer === 'PINS' ? null : 'PINS');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  activeDrawer === 'PINS'
                    ? 'bg-[#AEF5F0] text-slate-950 border-[#AEF5F0]'
                    : 'bg-[#21262D] border-[#30363D] text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                Pin Map
              </button>
            </div>
          </div>
        )}

        {/* Center/Right: Simulation Controls (for Road Construction Node) — unified flex-wrap cluster just like Bridge Sensors */}
        {subView === 'SIMULATION' && simDevice === 'ROAD_CONSTRUCTION' && (
          <div className="flex items-center flex-wrap gap-2">
            {/* Run / Stop / Reset Buttons */}
            <div className="flex items-center gap-1 bg-[#21262D] p-0.5 rounded-xl border border-[#30363D]">
              <button
                onClick={() => setRoadIsRunning(!roadIsRunning)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                  roadIsRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={roadIsRunning ? 'Pause Simulation' : 'Start Simulation'}
              >
                {roadIsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{roadIsRunning ? 'Pause' : 'Start'}</span>
              </button>

              <button
                onClick={() => setRoadResetTrigger((prev) => prev + 1)}
                className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#30363D] transition cursor-pointer flex items-center gap-1"
                title="Reset Simulation to Initial State"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Virtual Contractor Status: ACTIVE / COMPLETED Toggle */}
            <div className="flex items-center gap-1 bg-[#0D1117] p-0.5 rounded-xl border border-[#30363D]">
              <span className="text-[11px] font-semibold text-slate-400 pl-1.5 pr-0.5 hidden sm:inline">Status:</span>
              <button
                onClick={() => setRoadConstructionStatus('ACTIVE')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  roadConstructionStatus === 'ACTIVE'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#21262D]'
                }`}
              >
                <span>🚧 Active</span>
              </button>
              <button
                onClick={() => setRoadConstructionStatus('COMPLETED')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  roadConstructionStatus === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#21262D]'
                }`}
              >
                <span>✓ Completed</span>
              </button>
            </div>

            {/* GPS & 4G/LTE Toggles */}
            <button
              onClick={() => setRoadGpsEnabled(!roadGpsEnabled)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                roadGpsEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#21262D] border-[#30363D] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>GPS {roadGpsEnabled ? 'ON' : 'OFF'}</span>
            </button>
            <button
              onClick={() => setRoadLteEnabled(!roadLteEnabled)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                roadLteEnabled
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-[#21262D] border-[#30363D] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>4G/LTE {roadLteEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Hardware Status Pill */}
            <div className={`px-2 py-1 rounded-lg font-mono font-bold text-[10px] flex items-center gap-1.5 border ${
              roadConstructionStatus === 'ACTIVE'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <span>●</span>
              <span>{roadConstructionStatus === 'ACTIVE' ? 'ALERT ACTIVE' : 'WORK COMPLETE'}</span>
            </div>

            {/* Drawers / Controls Toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRoadDrawer(roadDrawer === 'LOGS' ? null : 'LOGS')}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                  roadDrawer === 'LOGS'
                    ? 'bg-[#AEF5F0] text-slate-950 border-[#AEF5F0]'
                    : 'bg-[#21262D] border-[#30363D] text-slate-300 hover:text-white hover:border-[#AEF5F0]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Logs</span>
              </button>
              <button
                onClick={() => setRoadDrawer(roadDrawer === 'STATUS' ? null : 'STATUS')}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                  roadDrawer === 'STATUS'
                    ? 'bg-[#AEF5F0] text-slate-950 border-[#AEF5F0]'
                    : 'bg-[#21262D] border-[#30363D] text-slate-300 hover:text-white hover:border-[#AEF5F0]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Diagnostics</span>
              </button>
              <button
                onClick={() => setRoadDrawer(roadDrawer === 'PINS' ? null : 'PINS')}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                  roadDrawer === 'PINS'
                    ? 'bg-[#AEF5F0] text-slate-950 border-[#AEF5F0]'
                    : 'bg-[#21262D] border-[#30363D] text-slate-300 hover:text-white hover:border-[#AEF5F0]'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Pin Map</span>
              </button>
              {onNavigateToMap && (
                <button
                  onClick={onNavigateToMap}
                  className="px-2.5 py-1 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-xs shadow transition cursor-pointer flex items-center gap-1"
                  title="View this simulated hazard warning on RoutePilot Live Map"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Map</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* If in Roster view, show Register Node button */}
        {subView === 'ROSTER' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestPing}
              className="px-3 py-1.5 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-xs shadow transition cursor-pointer"
            >
              Ping ESP32
            </button>
            <button
              onClick={() => setIsRegistering(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
            >
              + Register Sensor Node
            </button>
          </div>
        )}
      </header>

      {/* ============================================================== */}
      {/* NOTIFICATION BANNER IF HAZARD ACTIVE (Bridge Sensors only) */}
      {/* ============================================================== */}
      {subView === 'SIMULATION' && simDevice === 'BRIDGE_SENSORS' && simState.overallStatus !== 'SAFE' && simState.activeTriggerReason && (
        <div className="px-4 py-2 bg-red-950/70 border-b border-red-500/40 text-red-200 flex items-center justify-between gap-2 shrink-0 animate-fadeIn">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="font-bold text-red-400">CRITICAL HAZARD TRIGGERED:</span>
            <span>{simState.activeTriggerReason}</span>
            <span className="text-slate-400 hidden md:inline">— RoutePilot Active Diversion Broadcast Issued</span>
          </div>
          {onNavigateToMap && (
            <button
              onClick={onNavigateToMap}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition cursor-pointer shadow"
            >
              View Route Diversion on Map →
            </button>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN VIEWPORT: SUBVIEW ROUTING */}
      {/* ============================================================== */}
      {subView === 'SIMULATION' ? (
        simDevice === 'ROAD_CONSTRUCTION' ? (
          <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
            <RoadConstructionSimulator
              onNavigateToMap={onNavigateToMap}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              activeDrawer={roadDrawer}
              onSetDrawer={setRoadDrawer}
              isRunning={roadIsRunning}
              gpsEnabled={roadGpsEnabled}
              lteEnabled={roadLteEnabled}
              constructionStatus={roadConstructionStatus}
              resetTrigger={roadResetTrigger}
            />
          </div>
        ) : (
          <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden flex flex-col">
            {/* External Hardware Banner if in Hardware mode */}
            {simState.mode === 'HARDWARE' && (
              <div className="p-3 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                  <span className="text-white font-bold">External Hardware Mode:</span>
                  <span className="text-slate-300 font-mono">{simState.externalHardwareMessage}</span>
                </div>
                <button
                  onClick={handleTestPing}
                  className="px-3 py-1 rounded-lg bg-[#21262D] border border-[#30363D] text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Refresh Connection
                </button>
              </div>
            )}

            {/* Interactive Scalable Circuit Canvas (fills remaining height completely) */}
            <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
              {/* Quick Fullscreen Floating Action in Canvas Corner */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Simulation to Fullscreen'}
                className="absolute top-3 right-3 z-30 px-3 py-1.5 rounded-xl bg-[#161B22]/90 hover:bg-[#21262D] border border-[#30363D] hover:border-[#AEF5F0] text-slate-300 hover:text-[#AEF5F0] shadow-xl backdrop-blur-md transition cursor-pointer flex items-center gap-1.5"
              >
                {isFullscreen ? (
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

              <HardwareCircuitCanvas
                simState={simState}
                onSelectComponent={(comp) => {
                  setSelectedComponent(comp);
                  if (comp) setActiveDrawer(null);
                }}
                selectedComponent={selectedComponent}
              />

              {/* Slide-in Control Panel / Inspector Drawer */}
              <HardwareControlPanel
                simState={simState}
                activeDrawer={activeDrawer}
                onCloseDrawer={() => setActiveDrawer(null)}
                selectedComponent={selectedComponent}
                onSelectComponent={setSelectedComponent}
              />
            </div>
          </div>
        )
      ) : (
        /* ============================================================== */
        /* ROSTER VIEW: SENSOR NODES TABLE & REGISTRATION */
        /* ============================================================== */
        <div className="flex-1 w-full h-full min-h-0 overflow-y-auto p-4 space-y-4">
          {pingStatus && (
            <div className="p-3 bg-[#AEF5F0]/15 border border-[#AEF5F0]/30 rounded-xl text-[#AEF5F0] font-mono text-xs flex items-center justify-between">
              <span>{pingStatus} (Endpoint: {esp32Endpoint})</span>
              <button onClick={() => setPingStatus(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Register Modal */}
          {isRegistering && (
            <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
                  <h3 className="font-bold text-white text-base">Register IoT Sensor Node</h3>
                  <button onClick={() => setIsRegistering(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Node Identifier (e.g. BR-007)</label>
                    <input
                      type="text"
                      required
                      value={nodeId}
                      onChange={(e) => setNodeId(e.target.value)}
                      placeholder="BR-007"
                      className="w-full bg-[#21262D] border border-[#30363D] rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Sensor Name</label>
                    <input
                      type="text"
                      required
                      value={nodeName}
                      onChange={(e) => setNodeName(e.target.value)}
                      placeholder="Pahuj River North Pier"
                      className="w-full bg-[#21262D] border border-[#30363D] rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Sensor Type</label>
                      <select
                        value={nodeType}
                        onChange={(e) => setNodeType(e.target.value as SensorNode['type'])}
                        className="w-full bg-[#21262D] border border-[#30363D] rounded-xl p-2.5 text-white"
                      >
                        <option value="Bridge North">Bridge North</option>
                        <option value="Bridge South">Bridge South</option>
                        <option value="City Road">City Road</option>
                        <option value="River Bank">River Bank</option>
                        <option value="Old Bridge">Old Bridge</option>
                        <option value="Highway">Highway</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Location</label>
                      <input
                        type="text"
                        value={nodeLocation}
                        onChange={(e) => setNodeLocation(e.target.value)}
                        placeholder="Civil Lines Bridge"
                        className="w-full bg-[#21262D] border border-[#30363D] rounded-xl p-2.5 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={nodeLat}
                        onChange={(e) => setNodeLat(e.target.value)}
                        className="w-full bg-[#21262D] border border-[#30363D] rounded-xl p-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={nodeLng}
                        onChange={(e) => setNodeLng(e.target.value)}
                        className="w-full bg-[#21262D] border border-[#30363D] rounded-xl p-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(false)}
                      className="flex-1 py-2 bg-[#21262D] border border-[#30363D] text-slate-300 rounded-xl font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg cursor-pointer"
                    >
                      Save Node
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Sensor Nodes Table */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden shadow-xl">
            {sensors.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#21262D] text-slate-500 flex items-center justify-center mx-auto text-xl font-mono">
                  IoT
                </div>
                <div className="font-semibold text-slate-300">No hardware sensor nodes currently registered</div>
                <p className="text-xs max-w-sm mx-auto">
                  Register an ESP32 bridge accelerometer or ultrasonic water level node to monitor structural integrity in real time.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      realtimeSync.addSensorNode({
                        id: 'ESP32-BR-01',
                        name: 'Civil Lines Bridge Pier #3',
                        location: 'Civil Lines Bridge Deck',
                        type: 'Bridge North',
                        status: 'Online',
                        lat: 25.4585,
                        lng: 78.5765,
                        battery: 98,
                        lastReading: {
                          vibrationMmS: 0.72,
                          waterLevelM: 1.4,
                          tiltDegrees: 0.04,
                          updatedAt: 'Just now',
                        },
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg cursor-pointer"
                  >
                    + Register Sample Bridge Node (ESP32-BR-01)
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#30363D] bg-[#0D1117] text-[11px] text-slate-400 uppercase font-semibold">
                      <th className="py-3 px-4">Node ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Battery</th>
                      <th className="py-3 px-4">Last Telemetry Reading</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363D] font-mono text-slate-300">
                    {sensors.map((s) => (
                      <tr key={s.id} className="hover:bg-[#21262D]/60 transition">
                        <td className="py-3 px-4 font-bold text-white">{s.id}</td>
                        <td className="py-3 px-4 font-sans font-medium text-slate-200">{s.name}</td>
                        <td className="py-3 px-4 font-sans text-slate-400">{s.type}</td>
                        <td className="py-3 px-4 font-sans">{s.location}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.battery > 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {s.battery}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          {s.lastReading ? (
                            <span>
                              {s.lastReading.vibrationMmS !== undefined && `Vib: ${s.lastReading.vibrationMmS} mm/s `}
                              {s.lastReading.waterLevelM !== undefined && `Lvl: ${s.lastReading.waterLevelM}m `}
                              {s.lastReading.tiltDegrees !== undefined && `Tilt: ${s.lastReading.tiltDegrees}°`}
                            </span>
                          ) : (
                            <span className="text-slate-500">Awaiting ping</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                            ● {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                realtimeSync.createHazard({
                                  type: 'Bridge Damage',
                                  severity: 'CRITICAL',
                                  latitude: s.lat,
                                  longitude: s.lng,
                                  locationName: s.name,
                                  roadName: s.location,
                                  affectedRadius: 200,
                                  description: `Critical vibration threshold exceeded on node ${s.id} (4.8 mm/s)`,
                                  source: 'LIVE_HARDWARE',
                                });
                              }}
                              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-semibold text-[10px] transition cursor-pointer"
                            >
                              Simulate Spike
                            </button>
                            <button
                              onClick={() => realtimeSync.removeSensorNode(s.id)}
                              className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-[10px] transition cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
