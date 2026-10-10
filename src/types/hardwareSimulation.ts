export type HardwareComponentId =
  | 'esp32'
  | 'mpu6050'
  | 'tilt'
  | 'hx711'
  | 'hcsr04'
  | 'water_level'
  | 'gps'
  | 'lora'
  | 'battery_regulator'
  | 'gateway'
  | 'backend';

export type SignalType =
  | 'I2C'
  | 'SPI'
  | 'UART'
  | 'ADC'
  | 'GPIO'
  | 'POWER_5V'
  | 'POWER_3V3'
  | 'POWER_3V7'
  | 'GND'
  | 'STRAIN_ANALOG'
  | 'WIRELESS_RF'
  | 'ETHERNET';

export interface WireConnection {
  id: string;
  sourceComponent: HardwareComponentId;
  sourcePin: string;
  sourceCoords: { x: number; y: number };
  targetComponent: HardwareComponentId;
  targetPin: string;
  targetCoords: { x: number; y: number };
  signalType: SignalType;
  voltage: string;
  color: string;
  path: string; // SVG path 'd' string
  status: 'CONNECTED' | 'ACTIVE' | 'ERROR';
  description: string;
}

export interface PinMapping {
  pin: string;
  label: string;
  component: HardwareComponentId;
  esp32Pin?: string;
  signalType: SignalType;
  voltage: string;
  description: string;
}

export interface VirtualSensorValues {
  mpu6050: {
    vibrationMmS: number;
    pitchDeg: number;
    rollDeg: number;
    accelZ: number;
    enabled: boolean;
  };
  tilt: {
    isTilted: boolean;
    angleDeg: number;
    enabled: boolean;
  };
  hx711: {
    strainMicrostrain: number;
    loadWeightKn: number;
    rawAdc: number;
    enabled: boolean;
  };
  hcsr04: {
    distanceCm: number;
    waterRiseCm: number;
    echoPulseUs: number;
    enabled: boolean;
  };
  waterLevel: {
    immersionPercent: number;
    depthMm: number;
    rawAdc: number;
    enabled: boolean;
  };
  gps: {
    lat: number;
    lng: number;
    satellites: number;
    hdop: number;
    fix: '3D Fix' | '2D Fix' | 'No Fix';
    enabled: boolean;
  };
}

export interface HazardThresholds {
  vibrationMmS: number;       // default: 1.8 mm/s
  tiltAngleDeg: number;       // default: 1.5 deg
  waterLevelM: number;        // default: 0.30 m
  strainMicrostrain: number;  // default: 600 µε
  loadWeightKn: number;       // default: 85 kN
}

export interface TelemetryPacket {
  id: string;
  timestamp: string;
  packetNum: number;
  frequencyMhz: number;
  sf: number;
  rssiDbm: number;
  snrDb: number;
  payloadBytes: number;
  sourceNode: string;
  hazardStatus: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
  activeTrigger?: string;
}

export interface SimulationLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'TELEMETRY' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  module: string;
  message: string;
}
