import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Zap,
  Radio,
  Server,
  Cpu,
  Battery,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Droplets,
  Compass,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Sliders,
  Terminal,
  Layers,
  ArrowRight,
  Gauge,
  Wifi,
  ExternalLink,
} from 'lucide-react';
import { realtimeSync } from '../../../services/realtimeSync';
import { Hazard, HazardSeverity, HazardType } from '../../../types';

interface HardwareSimulationWorkbenchProps {
  onNavigateToTab?: (tab: string) => void;
}

export const HardwareSimulationWorkbench: React.FC<HardwareSimulationWorkbenchProps> = ({
  onNavigateToTab,
}) => {
  // Master Simulation Controls
  const [isRunning, setIsRunning] = useState(true);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 5>(1);
  const [autoSyncRoutePilot, setAutoSyncRoutePilot] = useState(true);
  const [activeHazardId, setActiveHazardId] = useState<string | null>(null);
  const [showSerialMonitor, setShowSerialMonitor] = useState(false);
  const [showWiringOverlay, setShowWiringOverlay] = useState(true);
  const [activeTabSubView, setActiveTabSubView] = useState<'interactive' | 'overview'>('interactive');

  // 8. Power Supply State
  const [powerOn, setPowerOn] = useState(true);
  const [batteryPercent, setBatteryPercent] = useState(96);
  const [voltageRegulator, setVoltageRegulator] = useState<3.3 | 5.0>(5.0);

  // 1. MPU6050 (Accelerometer + Gyroscope)
  const [mpuVibration, setMpuVibration] = useState(0.42); // mm/s
  const [mpuAccelZ, setMpuAccelZ] = useState(0.98); // g
  const [mpuGyroY, setMpuGyroY] = useState(0.04); // rad/s

  // 2. Tilt Sensor (SW-520D)
  const [tiltAngle, setTiltAngle] = useState(0.3); // degrees
  const [tiltThreshold, setTiltThreshold] = useState(5.0); // degrees

  // 3. Load Cell + HX711 (Strain Sensor)
  const [bridgeLoadTons, setBridgeLoadTons] = useState(16.5); // Tons
  const [strainMicrostrain, setStrainMicrostrain] = useState(420); // με

  // 4. Ultrasonic Sensor (HC-SR04)
  const [distanceClearanceM, setDistanceClearanceM] = useState(3.6); // meters
  const [echoTimeMs, setEchoTimeMs] = useState(10.8); // ms

  // 5. Water Level Sensor
  const [waterLevelPct, setWaterLevelPct] = useState(14); // 0 - 100 %
  const [waterDepthM, setWaterDepthM] = useState(0.35); // meters

  // 6. GPS Module (NEO-6M)
  const [gpsLat, setGpsLat] = useState(25.4585);
  const [gpsLng, setGpsLng] = useState(78.5765);
  const [gpsLocationName, setGpsLocationName] = useState('Civil Lines Bridge Corridor');
  const [gpsRoadName, setGpsRoadName] = useState('Civil Lines Road');
  const [gpsSatellites, setGpsSatellites] = useState(11);
  const [gpsFixStatus, setGpsFixStatus] = useState<'3D_FIX' | 'SEARCHING'>('3D_FIX');

  // Central ESP32 DevKit V1
  const [espLoopRateMs, setEspLoopRateMs] = useState(800);
  const [espIsRebooting, setEspIsRebooting] = useState(false);
  const [espUptime, setEspUptime] = useState(124);
  const [serialLogs, setSerialLogs] = useState<string[]>([
    '[BOOT] ESP32-DevKitV1 initialized (CPU 240MHz, Flash 4MB)',
    '[I2C] MPU6050 initialized at address 0x68 (SDA:21, SCL:22)',
    '[GPIO] SW-520D Tilt Sensor attached to GPIO 27 (INTERRUPT_FALLING)',
    '[HX711] 24-bit ADC Load Cell calibrated (gain: 128, DT:32, SCK:33)',
    '[HC-SR04] Ultrasonic sensor ready (TRIG:14, ECHO:13)',
    '[ADC] Water level sensor calibrated on ADC1_CH6 (GPIO 34)',
    '[UART] NEO-6M GPS locked at 9600 baud (RX:16, TX:17)',
    '[SPI] SX1278 LoRa initialized at 433.00 MHz (BW:125kHz, CR:4/5, SF:7)',
  ]);

  // 7. LoRa Module (SX1278 / Ra-02)
  const [loraFreqMhz, setLoraFreqMhz] = useState(433.0);
  const [loraTxPowerDbm, setLoraTxPowerDbm] = useState(17);
  const [loraPacketsSent, setLoraPacketsSent] = useState(148);
  const [isLoraTxPulsing, setIsLoraTxPulsing] = useState(false);

  // LoRa Gateway
  const [gatewayPacketsReceived, setGatewayPacketsReceived] = useState(148);
  const [gatewayRssiDbm, setGatewayRssiDbm] = useState(-81);
  const [gatewaySnrDb, setGatewaySnrDb] = useState(9.4);

  // Backend Server Hazard Analysis
  const [detectedHazardStatus, setDetectedHazardStatus] = useState<{
    isHazard: boolean;
    type: HazardType;
    severity: HazardSeverity;
    reason: string;
    details: string;
  }>({
    isHazard: false,
    type: 'Bridge Damage',
    severity: 'SAFE',
    reason: 'All sensor nodes within normal safety envelopes',
    details: 'Vib: 0.42 mm/s, Tilt: 0.3°, Load: 16.5T, Water: 14%',
  });

  // Calculate DO (Digital Out) state of Tilt Sensor
  const isTiltTriggered = tiltAngle >= tiltThreshold || tiltAngle <= -tiltThreshold;
  // Calculate Load Cell Overload
  const isLoadOverloaded = bridgeLoadTons >= 45.0;
  // Calculate MPU6050 Vibration Hazard
  const isVibrationCritical = mpuVibration >= 3.0;
  const isVibrationWarning = mpuVibration >= 1.5;
  // Calculate Flood / Water Level Hazard
  const isFloodHazard = waterLevelPct >= 70 || distanceClearanceM <= 1.0;

  // Ref to track last created hazard ID to avoid duplicates
  const activeHazardRef = useRef<string | null>(null);

  // Natural subtle telemetry jitter when running
  useEffect(() => {
    if (!isRunning || !powerOn || espIsRebooting) return;

    const interval = setInterval(() => {
      // Small jitter for realism
      setMpuVibration((prev) => {
        const jitter = (Math.random() - 0.5) * 0.04;
        return Number(Math.max(0.1, prev + jitter).toFixed(2));
      });
      setMpuAccelZ((prev) => {
        const jitter = (Math.random() - 0.5) * 0.02;
        return Number((0.98 + jitter).toFixed(2));
      });
      setTiltAngle((prev) => {
        const jitter = (Math.random() - 0.5) * 0.06;
        return Number((prev + jitter).toFixed(1));
      });
      setBridgeLoadTons((prev) => {
        const jitter = (Math.random() - 0.5) * 0.3;
        return Number(Math.max(0.5, prev + jitter).toFixed(1));
      });
      setStrainMicrostrain((prev) => {
        const val = Math.round(bridgeLoadTons * 28 + (Math.random() - 0.5) * 10);
        return Math.max(20, val);
      });
      setDistanceClearanceM((prev) => {
        const jitter = (Math.random() - 0.5) * 0.02;
        return Number(Math.max(0.2, prev + jitter).toFixed(2));
      });
      setWaterLevelPct((prev) => {
        const jitter = (Math.random() - 0.5) * 0.5;
        return Number(Math.max(0, Math.min(100, prev + jitter)).toFixed(1));
      });

      // Update echo time proportional to distance
      setEchoTimeMs(Number((distanceClearanceM * 2.94).toFixed(1)));
      setWaterDepthM(Number((waterLevelPct * 0.025).toFixed(2)));

      // Battery slow drain
      setBatteryPercent((b) => (b > 1 ? Number((b - 0.005).toFixed(2)) : 100));

      // Packet transmission pulse
      setIsLoraTxPulsing(true);
      setTimeout(() => setIsLoraTxPulsing(false), 350);

      setLoraPacketsSent((p) => p + 1);
      setGatewayPacketsReceived((p) => p + 1);
      setEspUptime((u) => u + 1);

      // Random RSSI jitter
      setGatewayRssiDbm(-80 + Math.floor((Math.random() - 0.5) * 6));
      setGatewaySnrDb(Number((9.2 + (Math.random() - 0.5) * 0.8).toFixed(1)));

      // Serial log update
      const nowStr = new Date().toLocaleTimeString();
      const payloadLog = `[${nowStr}] [TX PKT #${loraPacketsSent + 1}] Vib=${mpuVibration}mm/s, Tilt=${tiltAngle}°, Load=${bridgeLoadTons}T, Dist=${distanceClearanceM}m, Water=${waterLevelPct}%, GPS=(${gpsLat},${gpsLng})`;
      setSerialLogs((prev) => [payloadLog, ...prev.slice(0, 35)]);
    }, Math.max(400, Math.round(espLoopRateMs / simSpeed)));

    return () => clearInterval(interval);
  }, [
    isRunning,
    powerOn,
    espIsRebooting,
    espLoopRateMs,
    simSpeed,
    bridgeLoadTons,
    distanceClearanceM,
    waterLevelPct,
    mpuVibration,
    tiltAngle,
    loraPacketsSent,
    gpsLat,
    gpsLng,
  ]);

  // Hazard Analysis Engine
  useEffect(() => {
    if (!powerOn || espIsRebooting) {
      setDetectedHazardStatus({
        isHazard: false,
        type: 'Bridge Damage',
        severity: 'SAFE',
        reason: 'ESP32 Hardware Powered Down / Rebooting',
        details: 'No telemetry feed from sensor array.',
      });
      return;
    }

    let isHazard = false;
    let type: HazardType = 'Bridge Damage';
    let severity: HazardSeverity = 'SAFE';
    let reason = 'All telemetry values nominal';
    let details = `Vib: ${mpuVibration} mm/s, Tilt: ${tiltAngle}°, Load: ${bridgeLoadTons}T, Water: ${waterLevelPct}%`;

    if (isFloodHazard) {
      isHazard = true;
      type = 'High Water Level';
      severity = waterLevelPct >= 85 ? 'BLOCKED' : 'CRITICAL';
      reason = `Flash Flood Warning: Water level reached ${waterLevelPct}% (${waterDepthM}m) & Bridge Clearance reduced to ${distanceClearanceM}m`;
      details = `ESP32 Water Level Sensor & HC-SR04 detected river crest above safety baseline on ${gpsLocationName}. Road submerged.`;
    } else if (isVibrationCritical || isTiltTriggered) {
      isHazard = true;
      type = isTiltTriggered ? 'Excessive Tilt' : 'Structural Vibration';
      severity = 'CRITICAL';
      reason = isTiltTriggered
        ? `Severe Pier Inclination: Tilt sensor triggered at ${tiltAngle}° (>5.0° critical limit)`
        : `Structural Vibration Spike: Accelerometer measured ${mpuVibration} mm/s (Severe seismic / structural resonance)`;
      details = `MPU6050 & SW-520D hardware trip. High risk of bridge deck damage. Immediate traffic diversion mandatory.`;
    } else if (isLoadOverloaded) {
      isHazard = true;
      type = 'Excessive Strain';
      severity = 'WARNING';
      reason = `Bridge Deck Overload: Load cell recorded ${bridgeLoadTons} Tons (>45T maximum design limit)`;
      details = `HX711 Strain amplifier microstrain: ${strainMicrostrain} με. Heavy convoy restriction required.`;
    } else if (isVibrationWarning) {
      isHazard = true;
      type = 'Structural Vibration';
      severity = 'WARNING';
      reason = `Elevated Vibration: MPU6050 detected ${mpuVibration} mm/s (>1.5 mm/s caution threshold)`;
      details = `Continuous oscillation detected on pier deck. Precautionary speed reduction advisory.`;
    }

    setDetectedHazardStatus({
      isHazard,
      type,
      severity,
      reason,
      details,
    });

    // Auto-Sync to RoutePilot Core Engine if enabled
    if (isHazard && autoSyncRoutePilot && severity !== 'SAFE') {
      if (!activeHazardRef.current) {
        // Create Hazard in RoutePilot
        const created = realtimeSync.createHazard({
          type,
          severity,
          latitude: gpsLat,
          longitude: gpsLng,
          locationName: gpsLocationName,
          roadName: gpsRoadName,
          affectedRadius: 280,
          description: `[IoT HARDWARE ALERT - ESP32 NODE] ${reason}. Automatic diversion triggered.`,
          source: 'LIVE_HARDWARE',
        });
        activeHazardRef.current = created.hazardId;
        setActiveHazardId(created.hazardId);

        // Also add or update registered sensor node reading in realtimeSync
        realtimeSync.addSensorNode({
          id: 'ESP32-HARDWARE-01',
          name: gpsLocationName,
          location: gpsRoadName,
          type: 'Bridge North',
          status: 'Online',
          lat: gpsLat,
          lng: gpsLng,
          battery: Math.round(batteryPercent),
          lastReading: {
            vibrationMmS: mpuVibration,
            waterLevelM: waterDepthM,
            tiltDegrees: tiltAngle,
            strainMicrostrain,
            updatedAt: 'Just now',
          },
        });
      }
    } else if (!isHazard && activeHazardRef.current) {
      // Auto-resolve when restored to normal
      realtimeSync.resolveHazard(activeHazardRef.current);
      activeHazardRef.current = null;
      setActiveHazardId(null);
    }
  }, [
    isFloodHazard,
    isVibrationCritical,
    isVibrationWarning,
    isTiltTriggered,
    isLoadOverloaded,
    mpuVibration,
    tiltAngle,
    bridgeLoadTons,
    waterLevelPct,
    waterDepthM,
    distanceClearanceM,
    strainMicrostrain,
    powerOn,
    espIsRebooting,
    autoSyncRoutePilot,
    gpsLat,
    gpsLng,
    gpsLocationName,
    gpsRoadName,
    batteryPercent,
  ]);

  // Handle rebooting ESP32
  const handleRebootEsp32 = () => {
    setEspIsRebooting(true);
    setSerialLogs((prev) => [
      '[SYS] Reboot command received. Restarting ESP32 microcontroller...',
      ...prev,
    ]);
    setTimeout(() => {
      setEspIsRebooting(false);
      setEspUptime(0);
      setSerialLogs((prev) => [
        '[BOOT] ESP32 reboot complete. All sensor drivers re-attached.',
        ...prev,
      ]);
    }, 1800);
  };

  // Quick Preset Scenarios
  const handleApplyPreset = (scenario: 'normal' | 'earthquake' | 'flood' | 'overload' | 'pier_tilt') => {
    switch (scenario) {
      case 'normal':
        setMpuVibration(0.42);
        setTiltAngle(0.3);
        setBridgeLoadTons(16.5);
        setDistanceClearanceM(3.6);
        setWaterLevelPct(14);
        break;
      case 'earthquake':
        setMpuVibration(5.4);
        setTiltAngle(3.8);
        setBridgeLoadTons(22.0);
        break;
      case 'flood':
        setWaterLevelPct(89);
        setDistanceClearanceM(0.7);
        break;
      case 'overload':
        setBridgeLoadTons(54.2);
        setStrainMicrostrain(1520);
        break;
      case 'pier_tilt':
        setTiltAngle(12.4);
        setMpuVibration(2.1);
        break;
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#080B10] text-slate-100 min-h-full select-none">
      {/* Top Engineering Command Toolbar */}
      <div className="bg-[#10151E] border-b border-[#212836] px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-white tracking-wide">
                  ESP32 IoT Bridge & Road Hazard Hardware Simulation
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE WORKBENCH
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Interactive real-time circuit schematic with animated multi-bus data flow, telemetry packets, and LoRa wireless telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Scenario Injectors */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Play/Pause */}
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isRunning
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Running' : 'Paused'}</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-[#161D2A] border border-[#263143] rounded-xl p-0.5 text-xs font-mono">
            {([1, 2, 5] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  simSpeed === spd
                    ? 'bg-[#AEF5F0] text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Quick Scenario Injectors */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#161D2A] border border-[#263143] p-1 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-400 px-1.5">Inject:</span>
            <button
              onClick={() => handleApplyPreset('normal')}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-[#212A3B] hover:bg-[#2A364B] text-slate-300 hover:text-white transition cursor-pointer"
            >
              Safe Normal
            </button>
            <button
              onClick={() => handleApplyPreset('earthquake')}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer"
            >
              ⚡ Earthquake
            </button>
            <button
              onClick={() => handleApplyPreset('flood')}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition cursor-pointer"
            >
              🌊 Flash Flood
            </button>
            <button
              onClick={() => handleApplyPreset('overload')}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition cursor-pointer"
            >
              🚛 Overload 54T
            </button>
            <button
              onClick={() => handleApplyPreset('pier_tilt')}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition cursor-pointer"
            >
              📐 Pier Tilt
            </button>
          </div>

          {/* Auto-Sync Toggle to RoutePilot Engine */}
          <button
            onClick={() => setAutoSyncRoutePilot(!autoSyncRoutePilot)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              autoSyncRoutePilot
                ? 'bg-[#AEF5F0]/15 text-[#AEF5F0] border-[#AEF5F0]/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="When active, any hazard detected by this circuit is instantly dispatched to RoutePilot live map & drivers"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto-Sync RoutePilot</span>
            <span className="sm:hidden">Sync</span>
            <span
              className={`w-2 h-2 rounded-full ${
                autoSyncRoutePilot ? 'bg-[#AEF5F0] animate-pulse' : 'bg-slate-500'
              }`}
            />
          </button>

          {/* Wiring toggle */}
          <button
            onClick={() => setShowWiringOverlay(!showWiringOverlay)}
            className={`p-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
              showWiringOverlay
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-[#161D2A] text-slate-400 border-[#263143]'
            }`}
            title="Toggle animated wiring traces"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hazard Status Notification Banner */}
      {detectedHazardStatus.isHazard && (
        <div className="bg-red-950/80 border-b border-red-700/60 px-4 py-2 flex items-center justify-between gap-3 text-xs text-red-200 animate-pulse shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-bold text-white">
              🚨 HAZARD DETECTED: {detectedHazardStatus.type} ({detectedHazardStatus.severity})
            </span>
            <span className="hidden md:inline text-red-300">— {detectedHazardStatus.reason}</span>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('Live Map')}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] flex items-center gap-1 shadow cursor-pointer transition"
              >
                <span>View On Map</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => handleApplyPreset('normal')}
              className="px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 text-[11px] font-semibold cursor-pointer transition border border-red-700/50"
            >
              Clear Hazard
            </button>
          </div>
        </div>
      )}

      {/* Main Full-Window Interactive Canvas */}
      <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-5 relative">
        {/* Animated Wiring Canvas Background (Draws SVG connection curves between sensors, ESP32, power supply, and LoRa) */}
        {showWiringOverlay && (
          <div className="w-full bg-[#0E131C] rounded-2xl p-3 border border-[#1E2638] shadow-inner mb-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-[#1E2638]/70">
              <span className="font-mono font-bold flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Active Bus Interconnections & Live Signal Waveforms
              </span>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Power (5V/3.3V)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" /> I2C (SDA/SCL)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" /> Digital / DO
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> SPI / UART
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400" /> Analog (AO)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> RF 433MHz
                </span>
              </div>
            </div>

            {/* Live Wire Pulser Banner */}
            <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 overflow-x-auto gap-2">
              <div className="flex items-center gap-2 bg-[#141B27] px-2.5 py-1 rounded-lg border border-[#212A3D]">
                <span className="text-yellow-400 font-bold">I2C:</span>
                <span className="text-slate-300">0x68 (MPU6050) — 400kHz</span>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 bg-[#141B27] px-2.5 py-1 rounded-lg border border-[#212A3D]">
                <span className="text-purple-400 font-bold">GPIO 27:</span>
                <span className="text-slate-300">SW-520D Tilt = {isTiltTriggered ? 'TRIGGERED (1)' : 'NORMAL (0)'}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isTiltTriggered ? 'bg-red-400 animate-ping' : 'bg-emerald-400'}`} />
              </div>
              <div className="flex items-center gap-2 bg-[#141B27] px-2.5 py-1 rounded-lg border border-[#212A3D]">
                <span className="text-cyan-400 font-bold">HX711:</span>
                <span className="text-slate-300">DT=32, SCK=33 ({strainMicrostrain} με)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 bg-[#141B27] px-2.5 py-1 rounded-lg border border-[#212A3D]">
                <span className="text-orange-400 font-bold">ADC1:</span>
                <span className="text-slate-300">AO (Water) = {Math.round(waterLevelPct * 40.95)} ADC</span>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 bg-[#141B27] px-2.5 py-1 rounded-lg border border-[#212A3D]">
                <span className="text-emerald-400 font-bold">LoRa SPI:</span>
                <span className="text-slate-300">MISO:19, MOSI:23, SCK:18, CS:5</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ROW 1: TOP SENSORS ARRAY (1 through 6)
            Spaced out across the full window width!
           ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 w-full">
          {/* SENSOR 1: MPU6050 (Accelerometer + Gyroscope) */}
          <div className="bg-[#0F1624] border-2 border-blue-500/40 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-lg shadow-blue-500/5 hover:border-blue-400 transition relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold rounded-bl-xl border-l border-b border-blue-500/30">
              I2C (0x68)
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                <h3 className="font-extrabold text-xs text-white">1. MPU6050</h3>
              </div>
              <p className="text-[10px] text-blue-300 font-medium">Accelerometer + Gyro</p>

              {/* Realistic Hardware SVG Chip Graphic */}
              <div className="my-2 p-2 bg-[#090D15] rounded-xl border border-blue-900/50 flex flex-col items-center justify-center relative">
                <div className="w-16 h-14 bg-[#142B4E] border border-blue-400/50 rounded-lg flex flex-col items-center justify-center shadow-inner relative">
                  <div className="w-7 h-7 bg-[#0A1220] rounded border border-blue-300/60 flex items-center justify-center text-[7px] font-mono text-blue-200 font-bold">
                    MPU
                  </div>
                  <div className="flex justify-between w-full px-1 text-[6px] font-mono text-yellow-400 mt-1">
                    <span>SDA</span>
                    <span>SCL</span>
                  </div>
                </div>

                {/* Live Real-time Readouts */}
                <div className="w-full mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <div className="bg-[#121927] p-1 rounded border border-[#1F2B41] text-center">
                    <span className="text-slate-400 block text-[9px]">Vibration</span>
                    <strong className={`font-bold text-xs ${mpuVibration >= 3.0 ? 'text-red-400 animate-pulse' : mpuVibration >= 1.5 ? 'text-amber-400' : 'text-blue-300'}`}>
                      {mpuVibration} mm/s
                    </strong>
                  </div>
                  <div className="bg-[#121927] p-1 rounded border border-[#1F2B41] text-center">
                    <span className="text-slate-400 block text-[9px]">Accel Z</span>
                    <strong className="text-slate-200 text-xs font-bold">{mpuAccelZ} g</strong>
                  </div>
                </div>
              </div>

              {/* Inline Interactive Controls (Directly Inside Card!) */}
              <div className="space-y-2 mt-2 pt-2 border-t border-[#1C263A]">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                    <span>Vibration (mm/s):</span>
                    <span className="font-mono font-bold text-blue-400">{mpuVibration}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="6.5"
                    step="0.05"
                    value={mpuVibration}
                    onChange={(e) => setMpuVibration(parseFloat(e.target.value))}
                    className="w-full accent-blue-400 cursor-pointer h-1.5 bg-[#1F2B41] rounded-lg"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setMpuVibration(0.4)}
                    className="px-1.5 py-1 rounded bg-[#162135] hover:bg-[#202E4A] text-slate-300 hover:text-white text-[9px] font-semibold transition cursor-pointer"
                  >
                    Normal (0.4)
                  </button>
                  <button
                    onClick={() => setMpuVibration(4.8)}
                    className="px-1.5 py-1 rounded bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white text-[9px] font-bold transition cursor-pointer border border-red-500/40"
                  >
                    Crack (4.8!)
                  </button>
                </div>
              </div>
            </div>

            {/* Pins Footer */}
            <div className="mt-2 pt-2 border-t border-blue-900/40 flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span className="text-red-400">VCC</span>
              <span className="text-slate-500">GND</span>
              <span className="text-yellow-400">SDA (21)</span>
              <span className="text-emerald-400">SCL (22)</span>
            </div>
          </div>

          {/* SENSOR 2: Tilt Sensor (SW-520D) */}
          <div className="bg-[#150F24] border-2 border-purple-500/40 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-lg shadow-purple-500/5 hover:border-purple-400 transition relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold rounded-bl-xl border-l border-b border-purple-500/30">
              GPIO 27 (DO)
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isTiltTriggered ? 'bg-red-400 animate-ping' : 'bg-purple-400 animate-pulse'}`} />
                <h3 className="font-extrabold text-xs text-white">2. Tilt Sensor</h3>
              </div>
              <p className="text-[10px] text-purple-300 font-medium">SW-520D (Inclination)</p>

              {/* Realistic Hardware SVG Chip Graphic */}
              <div className="my-2 p-2 bg-[#0C0816] rounded-xl border border-purple-900/50 flex flex-col items-center justify-center relative">
                <div className="w-16 h-14 bg-[#23153D] border border-purple-400/50 rounded-lg flex flex-col items-center justify-center shadow-inner relative">
                  {/* Metal gold cylinder with tilt simulation */}
                  <div
                    className="w-4 h-8 bg-amber-400/90 rounded-full border border-amber-200 shadow-md transition-transform duration-200"
                    style={{ transform: `rotate(${tiltAngle * 2}deg)` }}
                  />
                  <span className="text-[7px] font-mono text-purple-200 font-bold mt-1">SW-520D</span>
                </div>

                {/* Live Readouts */}
                <div className="w-full mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <div className="bg-[#1C122F] p-1 rounded border border-[#2D1E4B] text-center">
                    <span className="text-slate-400 block text-[9px]">Tilt Angle</span>
                    <strong className={`font-bold text-xs ${isTiltTriggered ? 'text-red-400 animate-pulse' : 'text-purple-300'}`}>
                      {tiltAngle}°
                    </strong>
                  </div>
                  <div className="bg-[#1C122F] p-1 rounded border border-[#2D1E4B] text-center">
                    <span className="text-slate-400 block text-[9px]">DO Output</span>
                    <strong className={`text-xs font-bold ${isTiltTriggered ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isTiltTriggered ? 'HIGH (1)' : 'LOW (0)'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Inline Interactive Controls */}
              <div className="space-y-2 mt-2 pt-2 border-t border-[#291D42]">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                    <span>Inclination (°):</span>
                    <span className="font-mono font-bold text-purple-400">{tiltAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="-25"
                    max="25"
                    step="0.5"
                    value={tiltAngle}
                    onChange={(e) => setTiltAngle(parseFloat(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer h-1.5 bg-[#25173F] rounded-lg"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setTiltAngle(0.2)}
                    className="px-1.5 py-1 rounded bg-[#25173F] hover:bg-[#342157] text-slate-300 hover:text-white text-[9px] font-semibold transition cursor-pointer"
                  >
                    Level (0.2°)
                  </button>
                  <button
                    onClick={() => setTiltAngle(12.5)}
                    className="px-1.5 py-1 rounded bg-purple-600/40 hover:bg-purple-600 text-purple-200 hover:text-white text-[9px] font-bold transition cursor-pointer border border-purple-500/40"
                  >
                    Lean (12.5°)
                  </button>
                </div>
              </div>
            </div>

            {/* Pins Footer */}
            <div className="mt-2 pt-2 border-t border-purple-900/40 flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span className="text-red-400">VCC</span>
              <span className="text-slate-500">GND</span>
              <span className="text-purple-400">DO (GPIO 27)</span>
            </div>
          </div>

          {/* SENSOR 3: Load Cell + HX711 (Strain Sensor) */}
          <div className="bg-[#0B1A14] border-2 border-emerald-500/40 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-lg shadow-emerald-500/5 hover:border-emerald-400 transition relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold rounded-bl-xl border-l border-b border-emerald-500/30">
              DT:32 / SCK:33
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isLoadOverloaded ? 'bg-red-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                <h3 className="font-extrabold text-xs text-white">3. Load Cell + HX711</h3>
              </div>
              <p className="text-[10px] text-emerald-300 font-medium">Strain & Weight Sensor</p>

              {/* Realistic Hardware SVG Chip Graphic */}
              <div className="my-2 p-2 bg-[#07130F] rounded-xl border border-emerald-900/50 flex flex-col items-center justify-center relative">
                {/* Aluminum beam visual */}
                <div className="w-16 h-8 bg-slate-400 rounded border border-slate-300 flex items-center justify-center shadow relative">
                  <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-600" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 absolute left-2" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 absolute right-2" />
                </div>
                {/* Green HX711 ADC board below */}
                <div className="w-14 h-5 bg-[#0F3827] rounded border border-emerald-400/50 mt-1 flex items-center justify-center text-[7px] font-mono text-emerald-200">
                  HX711 (24-bit)
                </div>

                {/* Live Readouts */}
                <div className="w-full mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <div className="bg-[#0E231B] p-1 rounded border border-[#173D2F] text-center">
                    <span className="text-slate-400 block text-[9px]">Deck Load</span>
                    <strong className={`font-bold text-xs ${isLoadOverloaded ? 'text-red-400 animate-pulse' : 'text-emerald-300'}`}>
                      {bridgeLoadTons} T
                    </strong>
                  </div>
                  <div className="bg-[#0E231B] p-1 rounded border border-[#173D2F] text-center">
                    <span className="text-slate-400 block text-[9px]">Microstrain</span>
                    <strong className="text-slate-200 text-xs font-bold">{strainMicrostrain} με</strong>
                  </div>
                </div>
              </div>

              {/* Inline Interactive Controls */}
              <div className="space-y-2 mt-2 pt-2 border-t border-[#133226]">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                    <span>Load (Tons):</span>
                    <span className="font-mono font-bold text-emerald-400">{bridgeLoadTons} T</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="65"
                    step="1"
                    value={bridgeLoadTons}
                    onChange={(e) => setBridgeLoadTons(parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#142F23] rounded-lg"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setBridgeLoadTons(14.0)}
                    className="px-1.5 py-1 rounded bg-[#142F23] hover:bg-[#1C4332] text-slate-300 hover:text-white text-[9px] font-semibold transition cursor-pointer"
                  >
                    Normal (14T)
                  </button>
                  <button
                    onClick={() => setBridgeLoadTons(52.0)}
                    className="px-1.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white text-[9px] font-bold transition cursor-pointer border border-amber-500/40"
                  >
                    Overload 52T!
                  </button>
                </div>
              </div>
            </div>

            {/* Pins Footer */}
            <div className="mt-2 pt-2 border-t border-emerald-900/40 flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span className="text-red-400">VCC</span>
              <span className="text-slate-500">GND</span>
              <span className="text-cyan-400">DT (32)</span>
              <span className="text-emerald-400">SCK (33)</span>
            </div>
          </div>

          {/* SENSOR 4: Ultrasonic Sensor (HC-SR04) */}
          <div className="bg-[#1A180B] border-2 border-amber-500/40 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-lg shadow-amber-500/5 hover:border-amber-400 transition relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold rounded-bl-xl border-l border-b border-amber-500/30">
              TRIG:14 / ECHO:13
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${distanceClearanceM <= 1.0 ? 'text-red-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
                <h3 className="font-extrabold text-xs text-white">4. Ultrasonic Sensor</h3>
              </div>
              <p className="text-[10px] text-amber-300 font-medium">HC-SR04 (Distance)</p>

              {/* Realistic Hardware SVG Chip Graphic */}
              <div className="my-2 p-2 bg-[#121006] rounded-xl border border-amber-900/50 flex flex-col items-center justify-center relative">
                <div className="w-16 h-12 bg-[#2D2A12] border border-amber-400/50 rounded-lg flex items-center justify-around px-1 shadow-inner relative">
                  {/* Two round metal transducers T and R */}
                  <div className="w-5 h-5 rounded-full bg-slate-300 border-2 border-slate-500 flex items-center justify-center text-[6px] font-bold text-slate-800">
                    T
                  </div>
                  <div className="w-5 h-5 rounded-full bg-slate-300 border-2 border-slate-500 flex items-center justify-center text-[6px] font-bold text-slate-800">
                    R
                  </div>
                </div>

                {/* Live Readouts */}
                <div className="w-full mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <div className="bg-[#26210A] p-1 rounded border border-[#3E3613] text-center">
                    <span className="text-slate-400 block text-[9px]">Clearance</span>
                    <strong className={`font-bold text-xs ${distanceClearanceM <= 1.0 ? 'text-red-400 animate-pulse' : 'text-amber-300'}`}>
                      {distanceClearanceM} m
                    </strong>
                  </div>
                  <div className="bg-[#26210A] p-1 rounded border border-[#3E3613] text-center">
                    <span className="text-slate-400 block text-[9px]">Echo Flight</span>
                    <strong className="text-slate-200 text-xs font-bold">{echoTimeMs} ms</strong>
                  </div>
                </div>
              </div>

              {/* Inline Interactive Controls */}
              <div className="space-y-2 mt-2 pt-2 border-t border-[#363013]">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                    <span>Clearance (m):</span>
                    <span className="font-mono font-bold text-amber-400">{distanceClearanceM} m</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="5.0"
                    step="0.1"
                    value={distanceClearanceM}
                    onChange={(e) => setDistanceClearanceM(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-[#2B250B] rounded-lg"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setDistanceClearanceM(3.8)}
                    className="px-1.5 py-1 rounded bg-[#2B250B] hover:bg-[#3D3510] text-slate-300 hover:text-white text-[9px] font-semibold transition cursor-pointer"
                  >
                    Clear (3.8m)
                  </button>
                  <button
                    onClick={() => setDistanceClearanceM(0.7)}
                    className="px-1.5 py-1 rounded bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white text-[9px] font-bold transition cursor-pointer border border-red-500/40"
                  >
                    Submerged (0.7m)
                  </button>
                </div>
              </div>
            </div>

            {/* Pins Footer */}
            <div className="mt-2 pt-2 border-t border-amber-900/40 flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span className="text-red-400">VCC</span>
              <span className="text-slate-500">GND</span>
              <span className="text-yellow-400">TRIG (14)</span>
              <span className="text-purple-400">ECHO (13)</span>
            </div>
          </div>

          {/* SENSOR 5: Water Level Sensor */}
          <div className="bg-[#1C0F12] border-2 border-rose-500/40 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-lg shadow-rose-500/5 hover:border-rose-400 transition relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold rounded-bl-xl border-l border-b border-rose-500/30">
              ADC1 (GPIO 34)
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${waterLevelPct >= 70 ? 'bg-red-400 animate-ping' : 'bg-rose-400 animate-pulse'}`} />
                <h3 className="font-extrabold text-xs text-white">5. Water Level</h3>
              </div>
              <p className="text-[10px] text-rose-300 font-medium">Submersion Monitor</p>

              {/* Realistic Hardware SVG Chip Graphic */}
              <div className="my-2 p-2 bg-[#12080A] rounded-xl border border-rose-900/50 flex flex-col items-center justify-center relative">
                {/* Red sensing PCB with stripes */}
                <div className="w-12 h-14 bg-red-800 rounded border border-red-500 flex flex-col justify-between p-1 relative overflow-hidden">
                  <div className="w-full flex justify-around">
                    <span className="w-0.5 h-8 bg-amber-300" />
                    <span className="w-0.5 h-8 bg-amber-300" />
                    <span className="w-0.5 h-8 bg-amber-300" />
                    <span className="w-0.5 h-8 bg-amber-300" />
                    <span className="w-0.5 h-8 bg-amber-300" />
                  </div>
                  {/* Dynamic water level rising inside graphic */}
                  <div
                    className="absolute bottom-0 inset-x-0 bg-cyan-400/60 border-t border-cyan-200 transition-all duration-300"
                    style={{ height: `${waterLevelPct}%` }}
                  />
                  <span className="text-[7px] font-mono text-white text-center z-10 font-bold">
                    {waterLevelPct}%
                  </span>
                </div>

                {/* Live Readouts */}
                <div className="w-full mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <div className="bg-[#241116] p-1 rounded border border-[#3E1B24] text-center">
                    <span className="text-slate-400 block text-[9px]">Submersion</span>
                    <strong className={`font-bold text-xs ${waterLevelPct >= 70 ? 'text-red-400 animate-pulse' : 'text-rose-300'}`}>
                      {waterLevelPct}%
                    </strong>
                  </div>
                  <div className="bg-[#241116] p-1 rounded border border-[#3E1B24] text-center">
                    <span className="text-slate-400 block text-[9px]">Water Depth</span>
                    <strong className="text-slate-200 text-xs font-bold">{waterDepthM} m</strong>
                  </div>
                </div>
              </div>

              {/* Inline Interactive Controls */}
              <div className="space-y-2 mt-2 pt-2 border-t border-[#381820]">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                    <span>Water Level (%):</span>
                    <span className="font-mono font-bold text-rose-400">{waterLevelPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={waterLevelPct}
                    onChange={(e) => setWaterLevelPct(parseFloat(e.target.value))}
                    className="w-full accent-rose-400 cursor-pointer h-1.5 bg-[#2E141B] rounded-lg"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setWaterLevelPct(12)}
                    className="px-1.5 py-1 rounded bg-[#2E141B] hover:bg-[#431C27] text-slate-300 hover:text-white text-[9px] font-semibold transition cursor-pointer"
                  >
                    Dry (12%)
                  </button>
                  <button
                    onClick={() => setWaterLevelPct(92)}
                    className="px-1.5 py-1 rounded bg-red-600/40 hover:bg-red-600 text-red-200 hover:text-white text-[9px] font-bold transition cursor-pointer border border-red-500/40"
                  >
                    Flood (92%!)
                  </button>
                </div>
              </div>
            </div>

            {/* Pins Footer */}
            <div className="mt-2 pt-2 border-t border-rose-900/40 flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span className="text-red-400">VCC</span>
              <span className="text-slate-500">GND</span>
              <span className="text-orange-400">AO (ADC1 34)</span>
            </div>
          </div>

          {/* SENSOR 6: GPS Module (NEO-6M) */}
          <div className="bg-[#0B1720] border-2 border-cyan-500/40 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-lg shadow-cyan-500/5 hover:border-cyan-400 transition relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold rounded-bl-xl border-l border-b border-cyan-500/30">
              UART2 (RX:16/TX:17)
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="font-extrabold text-xs text-white">6. GPS Module</h3>
              </div>
              <p className="text-[10px] text-cyan-300 font-medium">NEO-6M (Geolocation)</p>

              {/* Realistic Hardware SVG Chip Graphic */}
              <div className="my-2 p-2 bg-[#061016] rounded-xl border border-cyan-900/50 flex flex-col items-center justify-center relative">
                {/* Ceramic patch antenna (tan/gold) */}
                <div className="w-14 h-12 bg-[#8C7A5A] rounded border border-amber-200/60 flex items-center justify-center shadow relative">
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700" />
                  <span className="absolute bottom-0.5 text-[6px] font-mono text-amber-100 font-bold">
                    u-blox NEO
                  </span>
                </div>

                {/* Live Readouts */}
                <div className="w-full mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <div className="bg-[#0F222F] p-1 rounded border border-[#193B52] text-center">
                    <span className="text-slate-400 block text-[9px]">Fix Status</span>
                    <strong className="text-emerald-400 text-[10px] font-bold">● 3D FIX (11 Sat)</strong>
                  </div>
                  <div className="bg-[#0F222F] p-1 rounded border border-[#193B52] text-center">
                    <span className="text-slate-400 block text-[9px]">Coordinates</span>
                    <strong className="text-cyan-300 text-[9px] font-bold">
                      {gpsLat.toFixed(3)},{gpsLng.toFixed(3)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Inline Interactive Controls */}
              <div className="space-y-2 mt-2 pt-2 border-t border-[#122A3B]">
                <div>
                  <label className="text-[10px] text-slate-300 block mb-1">Bridge / Road Node Presets:</label>
                  <select
                    value={gpsLocationName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGpsLocationName(val);
                      if (val.includes('Civil Lines')) {
                        setGpsLat(25.4585);
                        setGpsLng(78.5765);
                        setGpsRoadName('Civil Lines Road');
                      } else if (val.includes('Pahuj')) {
                        setGpsLat(25.4650);
                        setGpsLng(78.5800);
                        setGpsRoadName('River Bridge Expressway');
                      } else if (val.includes('Station')) {
                        setGpsLat(25.4520);
                        setGpsLng(78.5650);
                        setGpsRoadName('Station Underpass Link');
                      } else {
                        setGpsLat(25.4380);
                        setGpsLng(78.5520);
                        setGpsRoadName('Outer Bypass Highway');
                      }
                    }}
                    className="w-full bg-[#102534] border border-[#1C415C] text-cyan-200 text-[10px] rounded p-1 font-mono cursor-pointer"
                  >
                    <option value="Civil Lines Bridge Corridor">Civil Lines Bridge (Active Route)</option>
                    <option value="Pahuj River Bridge Span">Pahuj River Span #3</option>
                    <option value="Station Underpass Flood Zone">Station Underpass</option>
                    <option value="Outer Bypass Perimeter">Outer Bypass Highway</option>
                  </select>
                </div>

                <div className="flex gap-1 text-[9px] font-mono text-slate-400">
                  <span className="truncate">Lat: {gpsLat}</span>
                  <span className="truncate">Lng: {gpsLng}</span>
                </div>
              </div>
            </div>

            {/* Pins Footer */}
            <div className="mt-2 pt-2 border-t border-cyan-900/40 flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span className="text-red-400">VCC</span>
              <span className="text-slate-500">GND</span>
              <span className="text-cyan-400">TX (16)</span>
              <span className="text-purple-400">RX (17)</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            ROW 2: MIDDLE SECTION
            Left: 8. Power Supply (18650 + Regulator)
            Center: ESP32 DevKit V1 (Core Microcontroller)
            Right: 7. LoRa SX1278 -> LoRa Gateway -> Backend Server
           ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
          {/* 8. POWER SUPPLY (18650 Battery + 5V/3.3V Regulator) - Spans 3 cols */}
          <div className="lg:col-span-3 bg-[#180A0E] border-2 border-red-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-xl shadow-red-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-red-500/20 text-red-300 text-[10px] font-mono font-bold rounded-bl-xl border-l border-b border-red-500/30">
              POWER SYSTEM
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${powerOn ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                <h3 className="font-extrabold text-sm text-white">8. Power Supply</h3>
              </div>
              <p className="text-xs text-red-300 font-medium mt-0.5">
                18650 Battery (3.7V) + Buck/Boost Regulator
              </p>

              {/* Realistic Hardware SVG Battery + Regulator Visual */}
              <div className="my-3 p-3 bg-[#0E0507] rounded-xl border border-red-900/40 space-y-3">
                {/* 18650 Battery Holder Visual */}
                <div className="bg-[#1C090D] p-2.5 rounded-lg border border-red-800/40 flex items-center gap-3">
                  {/* Blue Cylindrical 18650 Cell */}
                  <div className="w-20 h-9 bg-blue-600 rounded-md border-2 border-blue-400 shadow-inner flex items-center justify-between px-2 text-[8px] font-mono font-bold text-white relative">
                    <span className="text-[7px]">18650</span>
                    <span>3.7V</span>
                    <div className="w-2 h-4 bg-slate-300 rounded-r absolute -right-2 top-2.5 border border-slate-400" />
                  </div>

                  <div className="flex-1 text-[11px] font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>Charge:</span>
                      <strong className={`font-bold ${batteryPercent > 20 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {batteryPercent}%
                      </strong>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all"
                        style={{ width: `${batteryPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 5V/3.3V Step-down Regulator with 7-Segment Digital Readout */}
                <div className="bg-[#14233C] p-2.5 rounded-lg border border-cyan-600/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-cyan-300 block font-mono">Regulator Board</span>
                    <span className="text-[9px] text-slate-400">IN: 3.7V | OUT: {voltageRegulator.toFixed(1)}V</span>
                  </div>

                  {/* 7-Segment Digital Display simulation */}
                  <div className="bg-[#050B14] px-3 py-1 rounded border border-red-500/50 shadow-inner flex items-center gap-1">
                    <span className="font-mono text-sm font-black text-red-500 tracking-wider">
                      {powerOn ? (voltageRegulator === 5.0 ? '5.02' : '3.31') : '0.00'} V
                    </span>
                  </div>
                </div>
              </div>

              {/* Inline Interactive Controls */}
              <div className="space-y-3 pt-2 border-t border-red-950/60">
                {/* Master Power Switch */}
                <div className="flex items-center justify-between bg-[#260C12] p-2 rounded-xl border border-red-900/50">
                  <span className="text-xs font-semibold text-slate-200">Main Circuit Power:</span>
                  <button
                    onClick={() => setPowerOn(!powerOn)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      powerOn
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {powerOn ? 'POWER ON' : 'POWER OFF'}
                  </button>
                </div>

                {/* Voltage Selector */}
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Regulated Output:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <button
                      onClick={() => setVoltageRegulator(5.0)}
                      className={`py-1.5 rounded-lg font-bold transition border cursor-pointer ${
                        voltageRegulator === 5.0
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                          : 'bg-[#1D0C11] text-slate-400 border-slate-700'
                      }`}
                    >
                      5.0V (ESP32 VIN)
                    </button>
                    <button
                      onClick={() => setVoltageRegulator(3.3)}
                      className={`py-1.5 rounded-lg font-bold transition border cursor-pointer ${
                        voltageRegulator === 3.3
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                          : 'bg-[#1D0C11] text-slate-400 border-slate-700'
                      }`}
                    >
                      3.3V (Logic Rail)
                    </button>
                  </div>
                </div>

                {/* Battery Slider */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Battery Capacity:</span>
                    <span className="font-mono font-bold text-red-400">{batteryPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="1"
                    value={batteryPercent}
                    onChange={(e) => setBatteryPercent(parseInt(e.target.value))}
                    className="w-full accent-red-400 cursor-pointer h-1.5 bg-[#290F16] rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Terminals Footer */}
            <div className="mt-3 pt-2 border-t border-red-900/40 flex items-center justify-between text-[10px] font-mono">
              <span className="text-red-400 font-bold">OUT+ (VIN to ESP32)</span>
              <span className="text-slate-400 font-bold">OUT- (GND Bus)</span>
            </div>
          </div>

          {/* CENTRAL MICROCONTROLLER: ESP32 DevKit V1 - Spans 5 cols */}
          <div className="lg:col-span-5 bg-[#0C1017] border-2 border-slate-600 rounded-2xl p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-slate-700 text-slate-200 text-[10px] font-mono font-bold rounded-bl-xl border-l border-b border-slate-600">
              30-PIN MCU CORE
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${powerOn && !espIsRebooting ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`} />
                  <h3 className="font-extrabold text-sm text-white">Central: ESP32 DevKit V1</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRebootEsp32}
                    disabled={espIsRebooting || !powerOn}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${espIsRebooting ? 'animate-spin' : ''}`} />
                    <span>Reset ESP32</span>
                  </button>
                  <button
                    onClick={() => setShowSerialMonitor(!showSerialMonitor)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 text-[11px] font-mono flex items-center gap-1 border border-cyan-800 transition cursor-pointer"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>{showSerialMonitor ? 'Hide Serial' : 'Serial Log'}</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Dual-Core Tensilica Xtensa 32-bit LX6 @ 240MHz
              </p>

              {/* Microcontroller Visual Board with Authentic Left & Right Pin Rails */}
              <div className="my-3 p-3 bg-[#06080D] rounded-xl border border-slate-800 flex items-center justify-between relative shadow-inner">
                {/* Left Pin Header Rail */}
                <div className="flex flex-col gap-1 text-[8px] font-mono text-slate-400 border-r border-slate-800 pr-2">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />3V3</span>
                  <span className="text-slate-500">EN</span>
                  <span className="text-slate-500">VP</span>
                  <span className="text-slate-500">VN</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />34 (AO)</span>
                  <span className="text-slate-500">35</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />32 (DT)</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />33 (SCK)</span>
                  <span className="text-slate-500">26</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" />27 (DO)</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />14 (TRIG)</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" />13 (ECHO)</span>
                  <span className="flex items-center gap-1 text-red-400 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />VIN</span>
                </div>

                {/* Central ESP-WROOM-32 Shield Graphic */}
                <div className="flex-1 flex flex-col items-center justify-center px-3">
                  <div className="w-28 h-32 bg-[#171D27] border-2 border-slate-500 rounded-lg flex flex-col items-center justify-between p-2 shadow-2xl relative">
                    {/* Metal Antenna trace at top */}
                    <div className="w-16 h-3 bg-amber-500/30 rounded border border-amber-500/50 flex items-center justify-center text-[6px] font-mono text-amber-300">
                      2.4G PCB ANT
                    </div>

                    {/* Metal RF Shield Can */}
                    <div className="w-22 h-18 bg-slate-300 rounded border border-slate-400 flex flex-col items-center justify-center shadow-md text-slate-900 font-bold p-1 text-center">
                      <span className="text-[9px] font-black tracking-wider">ESP-WROOM-32</span>
                      <span className="text-[6px] font-mono text-slate-700">Espressif Systems</span>
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-1 animate-pulse" />
                    </div>

                    {/* Buttons: EN and Boot */}
                    <div className="flex justify-between w-full px-1 text-[7px] font-mono text-slate-400">
                      <span>[EN]</span>
                      <span className="text-cyan-400 font-bold">USB</span>
                      <span>[BOOT]</span>
                    </div>
                  </div>
                </div>

                {/* Right Pin Header Rail */}
                <div className="flex flex-col gap-1 text-[8px] font-mono text-slate-400 border-l border-slate-800 pl-2 text-right">
                  <span className="flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-500" />GND</span>
                  <span className="flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />23 (MOSI)</span>
                  <span className="flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />22 (SCL)</span>
                  <span className="flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" />TX0</span>
                  <span className="flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />RX0</span>
                  <span className="flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />21 (SDA)</span>
                  <span className="flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />19 (MISO)</span>
                  <span className="flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />18 (SCK)</span>
                  <span className="flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />5 (CS)</span>
                  <span className="flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" />4 (RST)</span>
                  <span className="text-slate-500">2</span>
                  <span className="flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />15 (DIO0)</span>
                  <span className="flex items-center justify-end gap-1 text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-slate-500" />GND</span>
                </div>
              </div>

              {/* Live Serial Monitor Drawer (Embedded Directly Inside!) */}
              {showSerialMonitor && (
                <div className="mt-2 p-2 bg-[#05070B] rounded-xl border border-cyan-900/60 font-mono text-[9px] text-cyan-300 max-h-32 overflow-y-auto space-y-1">
                  <div className="text-[10px] font-bold text-white border-b border-slate-800 pb-1 flex justify-between">
                    <span>ESP32 Virtual UART Console (115200 baud)</span>
                    <span className="text-slate-500">Uptime: {espUptime}s</span>
                  </div>
                  {serialLogs.map((log, i) => (
                    <div key={i} className="leading-tight opacity-90 truncate">
                      {log}
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Interactive Controls */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Sampling & Broadcast Rate:</span>
                  <span className="font-mono font-bold text-cyan-400">{espLoopRateMs} ms</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="2500"
                  step="100"
                  value={espLoopRateMs}
                  onChange={(e) => setEspLoopRateMs(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />

                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-center">
                  <div className="bg-[#121722] p-1.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Packets Out</span>
                    <strong className="text-white text-xs">{loraPacketsSent}</strong>
                  </div>
                  <div className="bg-[#121722] p-1.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Free Heap</span>
                    <strong className="text-emerald-400 text-xs">284 KB</strong>
                  </div>
                  <div className="bg-[#121722] p-1.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Core Temp</span>
                    <strong className="text-cyan-300 text-xs">43.2°C</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Microcontroller Footer */}
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Firmware: v2.4.1-RoutePilot</span>
              <span className="text-emerald-400 font-bold">● SPI Bus Active</span>
            </div>
          </div>

          {/* RIGHT CLUSTER: 7. LoRa SX1278 -> LoRa Gateway -> Backend Server - Spans 4 cols */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {/* 7. LoRa Module (SX1278 / Ra-02) */}
            <div className="bg-[#120B1C] border-2 border-indigo-500/40 rounded-2xl p-3.5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${isLoraTxPulsing ? 'bg-emerald-400 animate-ping' : 'bg-indigo-400 animate-pulse'}`} />
                  <h3 className="font-extrabold text-xs text-white">7. LoRa Module (SX1278 / Ra-02)</h3>
                </div>
                <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  433 MHz
                </span>
              </div>
              <p className="text-[10px] text-indigo-300">Long Range RF Transmitter</p>

              {/* Hardware visual + Animated Radio Waves */}
              <div className="my-2 p-2 bg-[#0B0612] rounded-xl border border-indigo-900/40 flex items-center justify-between">
                {/* Ra-02 Module Shield */}
                <div className="w-16 h-14 bg-[#1F1435] rounded border border-indigo-400 flex flex-col items-center justify-center p-1 text-center">
                  <span className="text-[7px] font-mono text-indigo-200 font-bold">Ra-02</span>
                  <span className="text-[6px] font-mono text-slate-400">SX1278</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1 animate-pulse" />
                </div>

                {/* Antenna with Animated Radiating Green Wave Arcs */}
                <div className="flex-1 flex items-center justify-center gap-2 relative">
                  <div className="w-3 h-10 bg-amber-600 rounded-t border border-amber-400" />
                  {/* Concentric RF Waves */}
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full border-2 border-emerald-400/80 absolute animate-ping" />
                    <span className="w-8 h-8 rounded-full border-2 border-emerald-400/50 absolute animate-pulse" />
                    <Radio className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <div className="text-right text-[10px] font-mono">
                  <span className="text-slate-400 block text-[9px]">TX Power</span>
                  <strong className="text-indigo-300 font-bold">+{loraTxPowerDbm} dBm</strong>
                  <span className="text-slate-400 block text-[9px] mt-1">Packets</span>
                  <strong className="text-white font-bold">{loraPacketsSent}</strong>
                </div>
              </div>

              {/* Inline Interactive Controls */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-indigo-950/60 text-[10px]">
                <div>
                  <span className="text-slate-400 block mb-0.5">Frequency:</span>
                  <select
                    value={loraFreqMhz}
                    onChange={(e) => setLoraFreqMhz(parseFloat(e.target.value))}
                    className="w-full bg-[#1A1029] border border-[#2D1C47] text-indigo-200 rounded p-1 font-mono cursor-pointer"
                  >
                    <option value="433.0">433.0 MHz (Standard)</option>
                    <option value="868.0">868.0 MHz (EU)</option>
                    <option value="915.0">915.0 MHz (US)</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Spreading Factor:</span>
                  <div className="bg-[#1A1029] p-1 rounded border border-[#2D1C47] text-center font-mono font-bold text-indigo-300">
                    SF7 / BW 125kHz
                  </div>
                </div>
              </div>
            </div>

            {/* LoRa Gateway & Backend Server Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {/* LoRa Gateway (Receiver at High Location) */}
              <div className="bg-[#0B151F] border-2 border-cyan-600/40 rounded-2xl p-3 flex flex-col justify-between shadow-lg relative">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <h4 className="font-extrabold text-[11px] text-white">LoRa Gateway</h4>
                  </div>
                  <p className="text-[9px] text-cyan-300">High Altitude Tower Rx</p>

                  <div className="my-2 p-1.5 bg-[#060D14] rounded-lg border border-cyan-900/50 space-y-1 font-mono text-[9px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">RSSI:</span>
                      <strong className="text-cyan-300 font-bold">{gatewayRssiDbm} dBm</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">SNR:</span>
                      <strong className="text-emerald-400 font-bold">{gatewaySnrDb} dB</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Packets Rx:</span>
                      <strong className="text-white font-bold">{gatewayPacketsReceived}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-[9px] font-mono text-cyan-400 flex items-center justify-between border-t border-cyan-950/60 pt-1">
                  <span>Uplink: Forwarding</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                </div>
              </div>

              {/* Backend Server (Analyze Data & Detect Hazard) */}
              <div className="bg-[#091122] border-2 border-blue-600/40 rounded-2xl p-3 flex flex-col justify-between shadow-lg relative">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-blue-400" />
                    <h4 className="font-extrabold text-[11px] text-white">Backend Server</h4>
                  </div>
                  <p className="text-[9px] text-blue-300">Hazard Detection Engine</p>

                  <div className="my-2 p-1.5 bg-[#050A14] rounded-lg border border-blue-900/50 space-y-1 text-[9px]">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-400">Status:</span>
                      <span className={`px-1 rounded font-bold ${detectedHazardStatus.isHazard ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {detectedHazardStatus.isHazard ? 'HAZARD TRIP' : 'NOMINAL'}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-300 truncate">
                      {detectedHazardStatus.isHazard ? detectedHazardStatus.type : 'Road Safe'}
                    </div>
                  </div>
                </div>

                <div className="border-t border-blue-950/60 pt-1 flex items-center justify-between text-[9px] font-mono text-blue-400">
                  <span>Auto-Dispatch: {autoSyncRoutePilot ? 'ACTIVE' : 'OFF'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
