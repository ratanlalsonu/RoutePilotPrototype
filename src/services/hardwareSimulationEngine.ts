import {
  VirtualSensorValues,
  HazardThresholds,
  TelemetryPacket,
  SimulationLogEntry,
  HardwareComponentId,
} from '../types/hardwareSimulation';
import { HazardType, HazardSeverity } from '../types';
import { realtimeSync } from './realtimeSync';

export interface HardwareSimState {
  isRunning: boolean;
  mode: 'VIRTUAL' | 'HARDWARE';
  sensorValues: VirtualSensorValues;
  thresholds: HazardThresholds;
  currentPacket: TelemetryPacket | null;
  packetsSent: number;
  logs: SimulationLogEntry[];
  activeHazardId: string | null;
  overallStatus: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
  activeTriggerReason: string | null;
  activePreset?: 'SAFE' | 'VIBRATION_SPIKE' | 'FLOOD_ALERT' | 'STRUCTURAL_STRAIN' | 'PIER_TILT' | 'DISPLACEMENT_ANOMALY' | null;
  esp32CpuMhz: number;
  batteryVoltage: number;
  regulatorOutputV: number;
  loraRssi: number;
  loraSnr: number;
  gatewayConnected: boolean;
  backendSynced: boolean;
  externalHardwareStatus: 'DISCONNECTED' | 'SEARCHING' | 'CONNECTED';
  externalHardwareMessage: string;
}

const DEFAULT_SENSOR_VALUES: VirtualSensorValues = {
  mpu6050: {
    vibrationMmS: 0.65,
    pitchDeg: 0.08,
    rollDeg: 0.04,
    accelZ: 1.01,
    enabled: true,
  },
  tilt: {
    isTilted: false,
    angleDeg: 0.12,
    enabled: true,
  },
  hx711: {
    strainMicrostrain: 185,
    loadWeightKn: 24.5,
    rawAdc: 84210,
    enabled: true,
  },
  hcsr04: {
    distanceCm: 185.0,
    waterRiseCm: 0.0,
    echoPulseUs: 1075,
    displacementMm: 1.2,
    enabled: true,
  },
  waterLevel: {
    immersionPercent: 8,
    depthMm: 3.2,
    rawAdc: 320,
    enabled: true,
  },
  gps: {
    lat: 25.4585,
    lng: 78.5765,
    satellites: 9,
    hdop: 0.9,
    fix: '3D Fix',
    enabled: true,
  },
};

const DEFAULT_THRESHOLDS: HazardThresholds = {
  vibrationMmS: 1.8,
  tiltAngleDeg: 1.5,
  waterLevelM: 0.30,
  strainMicrostrain: 600,
  loadWeightKn: 85,
  displacementMm: 20.0,
};

type SimListener = (state: HardwareSimState) => void;

class HardwareSimulationEngine {
  private state: HardwareSimState;
  private listeners: Set<SimListener> = new Set();
  private timer: any = null;
  private packetCounter = 100;
  private externalPollTimer: any = null;

  constructor() {
    this.state = {
      isRunning: true,
      mode: 'VIRTUAL',
      sensorValues: JSON.parse(JSON.stringify(DEFAULT_SENSOR_VALUES)),
      thresholds: { ...DEFAULT_THRESHOLDS },
      currentPacket: null,
      packetsSent: 0,
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'INFO',
          module: 'ESP32_CORE',
          message: 'System booted: ESP32-WROOM-32 @ 240MHz, SX1278 LoRa 433MHz ready.',
        },
      ],
      activeHazardId: null,
      overallStatus: 'SAFE',
      activeTriggerReason: null,
      esp32CpuMhz: 240,
      batteryVoltage: 3.78,
      regulatorOutputV: 5.01,
      loraRssi: -68,
      loraSnr: 9.4,
      gatewayConnected: true,
      backendSynced: true,
      externalHardwareStatus: 'DISCONNECTED',
      externalHardwareMessage: 'No live sensor data connected. Connect ESP32 via Wi-Fi/UART endpoint.',
    };

    this.startSimulationLoop();
  }

  public getState(): HardwareSimState {
    return this.state;
  }

  public subscribe(listener: SimListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  public addLog(level: SimulationLogEntry['level'], module: string, message: string) {
    const entry: SimulationLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      module,
      message,
    };
    this.state.logs = [entry, ...this.state.logs.slice(0, 49)];
  }

  public start() {
    if (!this.state.isRunning) {
      this.state.isRunning = true;
      this.addLog('INFO', 'SIMULATION', 'Simulation started. Telemetry transmission active.');
      this.startSimulationLoop();
      this.notify();
    }
  }

  public stop() {
    if (this.state.isRunning) {
      this.state.isRunning = false;
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.addLog('INFO', 'SIMULATION', 'Simulation paused. Packet flow halted.');
      this.notify();
    }
  }

  public reset() {
    if (this.state.activeHazardId) {
      try {
        realtimeSync.resolveHazard(this.state.activeHazardId);
      } catch {
        // ignore
      }
    }

    this.state.sensorValues = JSON.parse(JSON.stringify(DEFAULT_SENSOR_VALUES));
    this.state.activeHazardId = null;
    this.state.overallStatus = 'SAFE';
    this.state.activeTriggerReason = null;
    this.state.isRunning = true;

    this.addLog('SUCCESS', 'SYSTEM', 'Simulation reset to baseline. Active hazards cleared.');
    this.startSimulationLoop();
    this.evaluateHazardAndTelemetry();
    this.notify();
  }

  public setMode(mode: 'VIRTUAL' | 'HARDWARE') {
    this.state.mode = mode;
    if (mode === 'HARDWARE') {
      this.stop();
      this.state.externalHardwareStatus = 'SEARCHING';
      this.state.externalHardwareMessage = 'Scanning configured endpoint for live ESP32 telemetry...';
      this.addLog('WARNING', 'MODE_SWITCH', 'Switched to External Hardware Mode. Virtual inputs bypassed.');
      this.pollExternalHardware();
    } else {
      if (this.externalPollTimer) {
        clearInterval(this.externalPollTimer);
        this.externalPollTimer = null;
      }
      this.state.externalHardwareStatus = 'DISCONNECTED';
      this.state.externalHardwareMessage = 'Virtual mode active. Simulated inputs enabled.';
      this.addLog('INFO', 'MODE_SWITCH', 'Switched to Virtual Simulation Mode.');
      this.start();
    }
    this.notify();
  }

  private pollExternalHardware() {
    if (this.externalPollTimer) clearInterval(this.externalPollTimer);

    const checkEndpoint = async () => {
      const endpoint = realtimeSync.getState().appSettings.esp32Endpoint || 'http://192.168.1.100:80/api/sensor';
      try {
        const res = await fetch(endpoint, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const data = await res.json();
          this.state.externalHardwareStatus = 'CONNECTED';
          this.state.externalHardwareMessage = `ESP32 connected at ${endpoint}`;
          this.addLog('SUCCESS', 'ESP32_HW', `Live telemetry frame received from ${endpoint}`);
          // Update actual readings if provided by hardware
          if (data && typeof data === 'object') {
            if (data.vibration !== undefined) this.state.sensorValues.mpu6050.vibrationMmS = Number(data.vibration);
            if (data.waterLevel !== undefined) this.state.sensorValues.hcsr04.waterRiseCm = Number(data.waterLevel);
          }
          this.evaluateHazardAndTelemetry();
        } else {
          this.state.externalHardwareStatus = 'DISCONNECTED';
          this.state.externalHardwareMessage = `HTTP ${res.status}: Connected to endpoint, awaiting sensor payload`;
        }
      } catch {
        this.state.externalHardwareStatus = 'DISCONNECTED';
        this.state.externalHardwareMessage = `No live sensor data. Endpoint ${endpoint} unreachable.`;
      }
      this.notify();
    };

    checkEndpoint();
    this.externalPollTimer = setInterval(checkEndpoint, 5000);
  }

  public updateSensorValue<K extends keyof VirtualSensorValues>(
    component: K,
    patch: Partial<VirtualSensorValues[K]>
  ) {
    if (this.state.mode === 'HARDWARE') {
      return; // Disallow modifying virtual values in external hardware mode
    }

    this.state.sensorValues[component] = {
      ...this.state.sensorValues[component],
      ...patch,
    };

    // If tilt angle changed, update tilt digital switch if angle > threshold
    if (component === 'tilt' && 'angleDeg' in patch) {
      const angle = (patch as any).angleDeg;
      this.state.sensorValues.tilt.isTilted = angle >= this.state.thresholds.tiltAngleDeg;
    }

    this.evaluateHazardAndTelemetry();
    this.notify();
  }

  public toggleSensorEnabled(component: keyof VirtualSensorValues) {
    const cur = this.state.sensorValues[component].enabled;
    this.state.sensorValues[component].enabled = !cur;
    this.addLog(
      !cur ? 'INFO' : 'WARNING',
      component.toUpperCase(),
      `Sensor module ${component.toUpperCase()} ${!cur ? 'ENABLED' : 'DISABLED'}`
    );
    this.evaluateHazardAndTelemetry();
    this.notify();
  }

  public updateThresholds(patch: Partial<HazardThresholds>) {
    this.state.thresholds = {
      ...this.state.thresholds,
      ...patch,
    };
    this.addLog('INFO', 'CONFIG', 'Hazard detection thresholds updated.');
    this.evaluateHazardAndTelemetry();
    this.notify();
  }

  public applyPreset(preset: 'SAFE' | 'VIBRATION_SPIKE' | 'FLOOD_ALERT' | 'STRUCTURAL_STRAIN' | 'PIER_TILT' | 'DISPLACEMENT_ANOMALY') {
    this.state.activePreset = preset;
    switch (preset) {
      case 'SAFE':
        this.state.sensorValues = JSON.parse(JSON.stringify(DEFAULT_SENSOR_VALUES));
        this.addLog('SUCCESS', 'SCENARIO', 'Scenario Applied: Normal Safe Baseline.');
        break;
      case 'VIBRATION_SPIKE':
        this.state.sensorValues.mpu6050.vibrationMmS = 2.85;
        this.state.sensorValues.mpu6050.pitchDeg = 1.8;
        this.state.sensorValues.tilt.angleDeg = 1.95;
        this.state.sensorValues.tilt.isTilted = true;
        this.addLog('CRITICAL', 'SCENARIO', 'Scenario Applied: MPU6050 Structural Vibration Spike (2.85 mm/s > 1.8 limit).');
        break;
      case 'FLOOD_ALERT':
        this.state.sensorValues.hcsr04.waterRiseCm = 42.0;
        this.state.sensorValues.waterLevel.immersionPercent = 88;
        this.state.sensorValues.waterLevel.depthMm = 35.2;
        this.addLog('CRITICAL', 'SCENARIO', 'Scenario Applied: Ultrasonic HC-SR04 Flood Wave (Water rise 42cm > 30cm limit).');
        break;
      case 'STRUCTURAL_STRAIN':
        this.state.sensorValues.hx711.strainMicrostrain = 780;
        this.state.sensorValues.hx711.loadWeightKn = 98.4;
        this.addLog('CRITICAL', 'SCENARIO', 'Scenario Applied: HX711 Load Cell Strain Overload (780 µε > 600 limit).');
        break;
      case 'PIER_TILT':
        this.state.sensorValues.tilt.angleDeg = 2.4;
        this.state.sensorValues.tilt.isTilted = true;
        this.state.sensorValues.mpu6050.pitchDeg = 2.4;
        this.addLog('WARNING', 'SCENARIO', 'Scenario Applied: SW-520D Pier Shift Tilt (2.4° > 1.5° limit).');
        break;
      case 'DISPLACEMENT_ANOMALY':
        this.state.sensorValues.hcsr04.displacementMm = 34.5;
        this.state.sensorValues.hcsr04.distanceCm = 150.5;
        this.state.sensorValues.tilt.angleDeg = 1.8;
        this.state.sensorValues.tilt.isTilted = true;
        this.addLog('CRITICAL', 'SCENARIO', 'Scenario Applied: Pier Structural Displacement Anomaly (34.5 mm > 20 mm limit).');
        break;
    }
    this.evaluateHazardAndTelemetry();
    this.notify();
  }

  private startSimulationLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.state.isRunning || this.state.mode === 'HARDWARE') return;

      // Add micro-jitter to enabled sensors for realism
      const s = this.state.sensorValues;
      if (s.mpu6050.enabled && s.mpu6050.vibrationMmS < 1.5) {
        s.mpu6050.vibrationMmS = Math.max(0.2, +(s.mpu6050.vibrationMmS + (Math.random() * 0.08 - 0.04)).toFixed(2));
      }
      if (s.hx711.enabled && s.hx711.loadWeightKn < 70) {
        s.hx711.loadWeightKn = Math.max(10, +(s.hx711.loadWeightKn + (Math.random() * 0.4 - 0.2)).toFixed(1));
      }

      this.packetCounter++;
      this.state.packetsSent++;
      this.evaluateHazardAndTelemetry();
      this.notify();
    }, 1800);
  }

  private evaluateHazardAndTelemetry() {
    const s = this.state.sensorValues;
    const th = this.state.thresholds;

    let highestSeverity: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BLOCKED' = 'SAFE';
    let triggerReason: string | null = null;
    let hazardType: any = null;
    let hazardDesc = '';

    // Check MPU6050
    if (s.mpu6050.enabled && s.mpu6050.vibrationMmS >= th.vibrationMmS) {
      highestSeverity = 'CRITICAL';
      triggerReason = `MPU6050 Vibration ${s.mpu6050.vibrationMmS} mm/s ≥ threshold ${th.vibrationMmS} mm/s`;
      hazardType = 'Structural Vibration';
      hazardDesc = `Bridge pier accelerometer vibration exceeded critical threshold: ${s.mpu6050.vibrationMmS} mm/s. Structural fatigue detected.`;
    }

    // Check Tilt
    if (s.tilt.enabled && (s.tilt.isTilted || s.tilt.angleDeg >= th.tiltAngleDeg)) {
      if (highestSeverity === 'SAFE') highestSeverity = 'WARNING';
      if (!triggerReason) {
        triggerReason = `SW-520D Tilt ${s.tilt.angleDeg}° ≥ threshold ${th.tiltAngleDeg}°`;
        hazardType = 'Excessive Tilt';
        hazardDesc = `Pier incline switch triggered: deck tilt angle ${s.tilt.angleDeg}° exceeds allowable 1.5° structural tolerance.`;
      }
    }

    // Check Water level & HC-SR04
    const waterDepthM = s.hcsr04.enabled ? s.hcsr04.waterRiseCm / 100 : (s.waterLevel.depthMm / 1000);
    if ((s.hcsr04.enabled || s.waterLevel.enabled) && waterDepthM >= th.waterLevelM) {
      highestSeverity = 'BLOCKED';
      triggerReason = `HC-SR04/Water Sensor flood depth ${(waterDepthM * 100).toFixed(1)} cm ≥ threshold ${(th.waterLevelM * 100).toFixed(1)} cm`;
      hazardType = 'High Water Level';
      hazardDesc = `Ultrasonic HC-SR04 water depth ${(waterDepthM * 100).toFixed(1)} cm exceeds safety clearance (${(th.waterLevelM * 100).toFixed(1)} cm). Road blocked.`;
    }

    // Check HX711 strain
    if (s.hx711.enabled && (s.hx711.strainMicrostrain >= th.strainMicrostrain || s.hx711.loadWeightKn >= th.loadWeightKn)) {
      if (highestSeverity === 'SAFE' || highestSeverity === 'WARNING') highestSeverity = 'CRITICAL';
      if (!triggerReason) {
        triggerReason = `HX711 Strain ${s.hx711.strainMicrostrain} µε ≥ threshold ${th.strainMicrostrain} µε`;
        hazardType = 'Excessive Strain';
        hazardDesc = `Load cell strain sensor registered ${s.hx711.strainMicrostrain} microstrain (${s.hx711.loadWeightKn} kN). Exceeds load capacity limit.`;
      }
    }

    // Check Displacement Sensor (HC-SR04 / Foundation Deflection)
    const dispMm = s.hcsr04.displacementMm ?? 0;
    if (s.hcsr04.enabled && dispMm >= th.displacementMm) {
      if (highestSeverity === 'SAFE' || highestSeverity === 'WARNING') highestSeverity = 'CRITICAL';
      if (!triggerReason) {
        triggerReason = `Displacement Sensor ${dispMm.toFixed(1)} mm ≥ threshold ${th.displacementMm} mm`;
        hazardType = 'Excessive Displacement';
        hazardDesc = `Structural displacement sensor registered pier deflection of ${dispMm.toFixed(1)} mm (allowable limit ${th.displacementMm} mm). Foundation shift alert.`;
      }
    }

    this.state.overallStatus = highestSeverity;
    this.state.activeTriggerReason = triggerReason;

    // Generate telemetry packet
    const packet: TelemetryPacket = {
      id: `PKT-${this.packetCounter}`,
      timestamp: new Date().toLocaleTimeString(),
      packetNum: this.packetCounter,
      frequencyMhz: 433.175,
      sf: 7,
      rssiDbm: Math.floor(-65 - Math.random() * 8),
      snrDb: +(9.2 + Math.random() * 1.5).toFixed(1),
      payloadBytes: 32,
      sourceNode: 'ESP32-DEV-01',
      hazardStatus: highestSeverity,
      activeTrigger: triggerReason || undefined,
    };
    this.state.currentPacket = packet;

    // Synchronize with RoutePilot Realtime Engine
    if (highestSeverity !== 'SAFE' && hazardType) {
      if (!this.state.activeHazardId) {
        const created = realtimeSync.createHazard({
          type: hazardType,
          severity: highestSeverity,
          latitude: s.gps.lat,
          longitude: s.gps.lng,
          locationName: 'Pahuj River Bridge (Sensor Span #3)',
          roadName: 'Civil Lines Bridge Corridor',
          affectedRadius: 250,
          description: hazardDesc,
          source: 'LIVE_HARDWARE',
        });
        this.state.activeHazardId = created.hazardId;
        this.addLog(
          highestSeverity === 'BLOCKED' ? 'CRITICAL' : 'WARNING',
          'ROUTE_PILOT',
          `Hazard ${created.hazardId} published to RoutePilot Route Diversion System!`
        );
      }
    } else {
      // Return to safe -> resolve hazard if one was active
      if (this.state.activeHazardId) {
        try {
          realtimeSync.resolveHazard(this.state.activeHazardId);
          this.addLog('SUCCESS', 'ROUTE_PILOT', `Hazard ${this.state.activeHazardId} resolved. Safe route restored.`);
        } catch {
          // ignore
        }
        this.state.activeHazardId = null;
      }
    }
  }

  public getSimulationHazardData(): {
    isHazard: boolean;
    status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
    type: HazardType;
    severity: HazardSeverity;
    affectedRadius: number;
    triggerReason: string | null;
    description: string;
    source: 'LIVE_HARDWARE' | 'ADMIN';
    activeTriggers: string[];
    telemetrySummary: string;
    packetId?: string;
  } {
    const s = this.state.sensorValues;
    const th = this.state.thresholds;
    const activeTriggers: string[] = [];
    const triggeredTypes: HazardType[] = [];

    // 1. Water Level / HC-SR04
    const waterDepthM = s.hcsr04.enabled ? s.hcsr04.waterRiseCm / 100 : s.waterLevel.depthMm / 1000;
    const waterRiseCm = s.hcsr04.enabled ? s.hcsr04.waterRiseCm : s.waterLevel.depthMm / 10;
    if ((s.hcsr04.enabled || s.waterLevel.enabled) && waterDepthM >= th.waterLevelM) {
      activeTriggers.push(`HC-SR04/Water Sensor: +${waterRiseCm.toFixed(1)} cm water rise (limit: ${(th.waterLevelM * 100).toFixed(0)} cm)`);
      triggeredTypes.push('High Water Level');
    }

    // 2. MPU6050 Vibration
    if (s.mpu6050.enabled && s.mpu6050.vibrationMmS >= th.vibrationMmS) {
      activeTriggers.push(`MPU6050 Vibration: ${s.mpu6050.vibrationMmS.toFixed(2)} mm/s (limit: ${th.vibrationMmS} mm/s)`);
      triggeredTypes.push('Structural Vibration');
    }

    // 3. HX711 Strain & Load
    if (s.hx711.enabled && (s.hx711.strainMicrostrain >= th.strainMicrostrain || s.hx711.loadWeightKn >= th.loadWeightKn)) {
      activeTriggers.push(`HX711 Strain: ${s.hx711.strainMicrostrain} µε / ${s.hx711.loadWeightKn.toFixed(1)} kN (limit: ${th.strainMicrostrain} µε)`);
      triggeredTypes.push('Excessive Strain');
    }

    // 4. Tilt Sensor
    if (s.tilt.enabled && (s.tilt.isTilted || s.tilt.angleDeg >= th.tiltAngleDeg)) {
      activeTriggers.push(`SW-520D Tilt: ${s.tilt.angleDeg.toFixed(1)}° inclination (limit: ${th.tiltAngleDeg}°)`);
      triggeredTypes.push('Excessive Tilt');
    }

    // 5. Displacement Sensor
    const dispMm = s.hcsr04.displacementMm ?? 0;
    if (s.hcsr04.enabled && dispMm >= th.displacementMm) {
      activeTriggers.push(`Displacement Sensor: ${dispMm.toFixed(1)} mm structural shift (limit: ${th.displacementMm} mm)`);
      triggeredTypes.push('Excessive Displacement');
    }

    const isHazard = activeTriggers.length > 0;
    let severity: HazardSeverity = 'SAFE';
    let type: HazardType = 'Bridge Damage';
    let affectedRadius = 180;
    let description = '';

    if (isHazard) {
      if (triggeredTypes.includes('High Water Level')) {
        severity = 'BLOCKED';
        affectedRadius = 260;
      } else if (triggeredTypes.includes('Structural Vibration') || triggeredTypes.includes('Excessive Strain') || triggeredTypes.includes('Excessive Displacement')) {
        severity = 'CRITICAL';
        affectedRadius = 240;
      } else {
        severity = 'WARNING';
        affectedRadius = 200;
      }

      if (triggeredTypes.length > 1) {
        type = 'Bridge Damage';
        description = `ESP32 IoT Multi-Sensor Telemetry Alert: Compound structural hazard detected on bridge span. Active violations: ${activeTriggers.join('; ')}. Sensor Node GPS: (${s.gps.lat.toFixed(4)}, ${s.gps.lng.toFixed(4)}). LoRa Packet #${this.packetCounter}.`;
      } else {
        type = triggeredTypes[0];
        if (type === 'High Water Level') {
          description = `ESP32 IoT Telemetry: Ultrasonic HC-SR04 & Water Level sensor detected flood rise of +${waterRiseCm.toFixed(1)} cm (clearance limit ${(th.waterLevelM * 100).toFixed(0)} cm). Submerged roadway; risk of hydroplaning and deck inundation.`;
        } else if (type === 'Structural Vibration') {
          description = `ESP32 IoT Telemetry: MPU-6050 accelerometer recorded structural vibration of ${s.mpu6050.vibrationMmS.toFixed(2)} mm/s (limit ${th.vibrationMmS} mm/s). Pier oscillation and harmonic resonance alert.`;
        } else if (type === 'Excessive Strain') {
          description = `ESP32 IoT Telemetry: HX-711 24-bit ADC load cell measured ${s.hx711.strainMicrostrain} µε (${s.hx711.loadWeightKn.toFixed(1)} kN). Bridge load rating capacity exceeded.`;
        } else if (type === 'Excessive Tilt') {
          description = `ESP32 IoT Telemetry: SW-520D inclination sensor detected pier tilt of ${s.tilt.angleDeg.toFixed(1)}° (allowable limit ${th.tiltAngleDeg}°). Foundation displacement warning.`;
        } else if (type === 'Excessive Displacement') {
          description = `ESP32 IoT Telemetry: Structural displacement sensor detected deck & pier shift of ${dispMm.toFixed(1)} mm (allowable limit ${th.displacementMm} mm). Foundation settlement risk.`;
        }
      }
    } else {
      severity = 'SAFE';
      type = 'Bridge Damage';
      affectedRadius = 180;
      description = `Manual inspection report. ESP32 Sensor node hardware currently reports normal safe readings across all 6 sensor channels.`;
    }

    const telemetrySummary = `Vib: ${s.mpu6050.vibrationMmS.toFixed(2)} mm/s | Water: +${waterRiseCm.toFixed(1)} cm | Tilt: ${s.tilt.angleDeg.toFixed(1)}° | Strain: ${s.hx711.strainMicrostrain} µε | Disp: ${dispMm.toFixed(1)} mm`;

    return {
      isHazard,
      status: this.state.overallStatus,
      type,
      severity: severity === 'SAFE' ? 'WARNING' : severity,
      affectedRadius,
      triggerReason: this.state.activeTriggerReason,
      description,
      source: isHazard ? 'LIVE_HARDWARE' : 'ADMIN',
      activeTriggers,
      telemetrySummary,
      packetId: this.state.currentPacket?.id,
    };
  }
}

export const hardwareSimEngine = new HardwareSimulationEngine();
