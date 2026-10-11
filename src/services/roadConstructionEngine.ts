import { realtimeSync } from './realtimeSync';
import { Hazard } from '../types';

export interface ConstructionTelemetryState {
  // 1. Power Supply System (Battery + Regulator)
  power: {
    isOn: boolean;
    batteryVoltage: number; // 3.0V - 4.2V
    batteryPercent: number; // 0 - 100%
    batteryCurrentMa: number; // Current draw ~ 140mA - 320mA
    batteryCapacityMah: number; // 2600 mAh
    buck5vRail: number; // 5.02V
    buck3v3Rail: number; // 3.31V
    isCharging: boolean;
    temperatureC: number;
  };

  // 2. ESP32 DevKit V1
  esp32: {
    cpuFreqMhz: number;
    freeHeapKb: number;
    uptimeSeconds: number;
    firmwareState: 'BOOTING' | 'GPS_LOCKING' | 'CELLULAR_CONNECTING' | 'ACTIVE_TELEMETRY' | 'IDLE' | 'SLEEP';
    txLedState: boolean;
    rxLedState: boolean;
    packetCount: number;
  };

  // 3. GPS Module (NEO-6M)
  gps: {
    hasFix: boolean;
    fixType: '3D Fix' | '2D Fix' | 'No Fix';
    satellitesTracked: number;
    hdop: number;
    latitude: number;
    longitude: number;
    altitudeMeters: number;
    speedKmh: number;
    locationName: string;
    roadName: string;
    nmeaSentence: string;
  };

  // 4. 4G/LTE Module (SIM7600)
  modem: {
    powerOn: boolean;
    simStatus: 'READY' | 'SEARCHING' | 'ERROR';
    operator: string;
    networkBand: string;
    rssiDbm: number; // -110 to -50 dBm
    signalBars: number; // 1 to 4
    ipAddress: string;
    netLightState: boolean;
    recentCommands: Array<{ cmd: string; response: string; time: string }>;
  };

  // 5. Internet & 4G/LTE Link
  cellularLink: {
    isTransmitting: boolean;
    lastPingLatencyMs: number;
    signalQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    totalBytesSent: number;
  };

  // 6. Backend Server (Cloud) & RoutePilot State
  cloud: {
    serverEndpoint: string;
    isConnected: boolean;
    isConstructionActive: boolean;
    activeHazardId: string | null;
    workZoneRadiusMeters: number;
    laneStatus: 'FULL_BLOCKAGE' | 'PARTIAL_RESTRICTION';
    severity: 'CRITICAL' | 'WARNING' | 'BLOCKED';
    lastReceivedPacket: {
      timestamp: string;
      deviceId: string;
      payload: any;
    } | null;
  };

  // Live Serial Monitor logs
  serialLogs: Array<{ id: string; time: string; tag: 'PWR' | 'ESP' | 'GPS' | 'LTE' | 'NET' | 'CLOUD'; message: string }>;
}

const PRESET_CONSTRUCTION_SITES = [
  {
    name: 'Civil Lines Arterial Bridge Work',
    roadName: 'Civil Lines Road',
    lat: 25.4585,
    lng: 78.5765,
    radius: 220,
    desc: 'Flyover girder construction & lane resurfacing',
  },
  {
    name: 'NH-35 Banda-Fatehpur Four-Laning',
    roadName: 'NH-35 Arterial Highway',
    lat: 25.4410,
    lng: 78.5620,
    radius: 300,
    desc: 'Heavy earthmovers active; dual-lane road excavation',
  },
  {
    name: 'Orchha Link Bypass Overpass Repair',
    roadName: 'Orchha Link Bypass',
    lat: 25.4380,
    lng: 78.5520,
    radius: 180,
    desc: 'Bridge deck reinforcement & asphalt paving',
  },
  {
    name: 'Railway Station Station Link Trenching',
    roadName: 'Station Link Road',
    lat: 25.4484,
    lng: 78.5562,
    radius: 150,
    desc: 'Underground conduit trenching; road restricted',
  },
];

class RoadConstructionEngine {
  private state: ConstructionTelemetryState;
  private listeners: Set<(state: ConstructionTelemetryState) => void> = new Set();
  private intervalTimer: any = null;
  private txBlinkTimer: any = null;

  constructor() {
    this.state = {
      power: {
        isOn: true,
        batteryVoltage: 3.96,
        batteryPercent: 88,
        batteryCurrentMa: 185,
        batteryCapacityMah: 2600,
        buck5vRail: 5.03,
        buck3v3Rail: 3.31,
        isCharging: false,
        temperatureC: 28.4,
      },
      esp32: {
        cpuFreqMhz: 240,
        freeHeapKb: 184,
        uptimeSeconds: 142,
        firmwareState: 'ACTIVE_TELEMETRY',
        txLedState: false,
        rxLedState: true,
        packetCount: 18,
      },
      gps: {
        hasFix: true,
        fixType: '3D Fix',
        satellitesTracked: 9,
        hdop: 0.85,
        latitude: PRESET_CONSTRUCTION_SITES[0].lat,
        longitude: PRESET_CONSTRUCTION_SITES[0].lng,
        altitudeMeters: 214.5,
        speedKmh: 0.0,
        locationName: PRESET_CONSTRUCTION_SITES[0].name,
        roadName: PRESET_CONSTRUCTION_SITES[0].roadName,
        nmeaSentence: '$GPGGA,123519,2527.51,N,07834.59,E,1,09,0.85,214.5,M,-34.2,M,,*47',
      },
      modem: {
        powerOn: true,
        simStatus: 'READY',
        operator: 'Airtel 4G LTE',
        networkBand: 'B3 (1800 MHz)',
        rssiDbm: -68,
        signalBars: 4,
        ipAddress: '10.142.88.204',
        netLightState: true,
        recentCommands: [
          { cmd: 'AT', response: 'OK', time: '12:00:01' },
          { cmd: 'AT+CPIN?', response: '+CPIN: READY', time: '12:00:02' },
          { cmd: 'AT+CSQ', response: '+CSQ: 24,99 (-68 dBm)', time: '12:00:03' },
          { cmd: 'AT+CGATT?', response: '+CGATT: 1 (Attached)', time: '12:00:04' },
          { cmd: 'AT+HTTPPOST', response: 'HTTP/1.1 200 OK (284B)', time: '12:00:05' },
        ],
      },
      cellularLink: {
        isTransmitting: false,
        lastPingLatencyMs: 38,
        signalQuality: 'EXCELLENT',
        totalBytesSent: 5112,
      },
      cloud: {
        serverEndpoint: 'https://cloud.routepilot.io/v1/telemetry/construction',
        isConnected: true,
        isConstructionActive: false,
        activeHazardId: null,
        workZoneRadiusMeters: 220,
        laneStatus: 'FULL_BLOCKAGE',
        severity: 'CRITICAL',
        lastReceivedPacket: null,
      },
      serialLogs: [
        { id: '1', time: '12:00:00', tag: 'PWR', message: '18650 Battery active (3.96V). Buck converter output: 5.03V / 3.31V Nominal.' },
        { id: '2', time: '12:00:01', tag: 'ESP', message: 'ESP32-WROOM-32 Booting. Core 0: 240MHz. Free heap: 184 KB.' },
        { id: '3', time: '12:00:02', tag: 'GPS', message: 'NEO-6M UART initialized @ 9600 baud. 3D Satellite fix locked (9 satellites).' },
        { id: '4', time: '12:00:03', tag: 'LTE', message: 'SIM7600 UART ready. Registered on Airtel 4G LTE (RSSI: -68 dBm).' },
        { id: '5', time: '12:00:04', tag: 'NET', message: 'PPP/IP session established: 10.142.88.204. DNS resolved.' },
        { id: '6', time: '12:00:05', tag: 'CLOUD', message: 'Connected to RoutePilot Cloud Telemetry Gateway over TLS 1.3.' },
      ],
    };

    this.startSimulationLoop();
  }

  public getState(): ConstructionTelemetryState {
    return this.state;
  }

  public subscribe(listener: (state: ConstructionTelemetryState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  private addLog(tag: ConstructionTelemetryState['serialLogs'][0]['tag'], message: string) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newEntry = { id: Math.random().toString(36).substring(2, 9), time, tag, message };
    this.state.serialLogs = [...this.state.serialLogs.slice(-45), newEntry];
  }

  private startSimulationLoop() {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    this.intervalTimer = setInterval(() => {
      if (!this.state.power.isOn) return;

      // 1. ESP32 uptime
      this.state.esp32.uptimeSeconds += 2;

      // 2. Battery subtle micro-fluctuation / discharge
      const volt = Math.max(3.3, this.state.power.batteryVoltage - 0.00005 + (Math.random() * 0.004 - 0.002));
      this.state.power.batteryVoltage = Math.round(volt * 100) / 100;
      this.state.power.batteryPercent = Math.max(5, Math.min(100, Math.round(((volt - 3.2) / (4.2 - 3.2)) * 100)));

      // 3. Minor GPS jitter representing real NMEA drift (< 1.5m)
      const latJitter = (Math.random() - 0.5) * 0.00004;
      const lngJitter = (Math.random() - 0.5) * 0.00004;
      this.state.gps.latitude = Math.round((this.state.gps.latitude + latJitter) * 100000) / 100000;
      this.state.gps.longitude = Math.round((this.state.gps.longitude + lngJitter) * 100000) / 100000;
      this.state.gps.nmeaSentence = `$GPGGA,${Date.now()},${Math.abs(this.state.gps.latitude).toFixed(4)},N,${Math.abs(this.state.gps.longitude).toFixed(4)},E,1,09,0.85,214.5,M,-34.2,M,,*47`;

      // 4. Modem signal toggle
      this.state.modem.netLightState = !this.state.modem.netLightState;
      this.state.esp32.rxLedState = !this.state.esp32.rxLedState;

      // 5. If construction active, transmit periodic heartbeat packet every 8 seconds
      if (this.state.cloud.isConstructionActive && this.state.esp32.uptimeSeconds % 8 === 0) {
        this.transmitHeartbeatPacket();
      }

      this.notify();
    }, 2000);
  }

  /**
   * Transmits a telemetry packet across the 6-stage hardware pipeline.
   */
  public transmitHeartbeatPacket() {
    if (!this.state.power.isOn) return;

    this.state.cellularLink.isTransmitting = true;
    this.state.esp32.txLedState = true;
    this.state.esp32.packetCount += 1;
    this.state.cellularLink.totalBytesSent += 284;
    this.state.cellularLink.lastPingLatencyMs = Math.floor(32 + Math.random() * 15);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const payload = {
      deviceId: 'RP-ROAD-CONSTRUCT-ESP32',
      hazardType: 'Road Construction',
      status: this.state.cloud.isConstructionActive ? 'ACTIVE_WORK_ZONE' : 'BEACON_STANDBY',
      location: {
        lat: this.state.gps.latitude,
        lng: this.state.gps.longitude,
        name: this.state.gps.locationName,
        road: this.state.gps.roadName,
        radius: this.state.cloud.workZoneRadiusMeters,
      },
      laneStatus: this.state.cloud.laneStatus,
      severity: this.state.cloud.severity,
      telemetry: {
        batteryV: this.state.power.batteryVoltage,
        batteryPct: this.state.power.batteryPercent,
        rssiDbm: this.state.modem.rssiDbm,
        satellites: this.state.gps.satellitesTracked,
        hdop: this.state.gps.hdop,
      },
      timestamp: new Date().toISOString(),
    };

    this.state.cloud.lastReceivedPacket = {
      timestamp: now,
      deviceId: 'RP-ROAD-CONSTRUCT-ESP32',
      payload,
    };

    this.state.modem.recentCommands.push({
      cmd: `AT+HTTPDATA=284,5000 -> POST`,
      response: '200 OK (RoutePilot Cloud ACK)',
      time: now,
    });
    if (this.state.modem.recentCommands.length > 5) {
      this.state.modem.recentCommands.shift();
    }

    this.addLog('LTE', `SIM7600 AT+HTTPACTION=1 -> 200 OK (${this.state.cellularLink.lastPingLatencyMs}ms)`);
    this.addLog('CLOUD', `Cloud Ingest: Packet #${this.state.esp32.packetCount} verified. Radius: ${this.state.cloud.workZoneRadiusMeters}m`);

    // Reset TX LED after 400ms
    if (this.txBlinkTimer) clearTimeout(this.txBlinkTimer);
    this.txBlinkTimer = setTimeout(() => {
      this.state.cellularLink.isTransmitting = false;
      this.state.esp32.txLedState = false;
      this.notify();
    }, 450);

    this.notify();
  }

  /**
   * DEPLOY ROAD CONSTRUCTION ZONE
   * Realistically triggers the full hardware pipeline, broadcasts over 4G LTE,
   * and creates a LIVE "Road Construction" hazard in RoutePilot!
   */
  public deployConstructionZone(siteConfig?: {
    lat?: number;
    lng?: number;
    locationName?: string;
    roadName?: string;
    radius?: number;
    laneStatus?: 'FULL_BLOCKAGE' | 'PARTIAL_RESTRICTION';
  }) {
    if (!this.state.power.isOn) {
      this.addLog('PWR', 'Cannot deploy: Power is OFF! Turn on 18650 Battery System first.');
      return;
    }

    const lat = siteConfig?.lat ?? this.state.gps.latitude;
    const lng = siteConfig?.lng ?? this.state.gps.longitude;
    const locName = siteConfig?.locationName ?? this.state.gps.locationName;
    const road = siteConfig?.roadName ?? this.state.gps.roadName;
    const radius = siteConfig?.radius ?? this.state.cloud.workZoneRadiusMeters;
    const lane = siteConfig?.laneStatus ?? this.state.cloud.laneStatus;

    this.state.gps.latitude = lat;
    this.state.gps.longitude = lng;
    this.state.gps.locationName = locName;
    this.state.gps.roadName = road;
    this.state.cloud.workZoneRadiusMeters = radius;
    this.state.cloud.laneStatus = lane;
    this.state.cloud.severity = lane === 'FULL_BLOCKAGE' ? 'CRITICAL' : 'WARNING';
    this.state.cloud.isConstructionActive = true;

    this.addLog('ESP', `WORK ZONE DEPLOY: Packaging telemetry for ${locName} (${lat}, ${lng})`);
    this.addLog('LTE', `SIM7600 opening HTTPS bearer connection to ${this.state.cloud.serverEndpoint}`);

    // If there's already an active hazard from this node, resolve it first
    if (this.state.cloud.activeHazardId) {
      realtimeSync.resolveHazard(this.state.cloud.activeHazardId);
    }

    // CREATE REAL HAZARD IN ROUTEPILOT!
    const createdHazard = realtimeSync.createHazard({
      type: 'Road Construction',
      severity: this.state.cloud.severity,
      latitude: lat,
      longitude: lng,
      locationName: locName,
      roadName: road,
      affectedRadius: radius,
      description: `IoT Road Construction Beacon (ESP32+SIM7600+NEO-6M): ${lane === 'FULL_BLOCKAGE' ? 'Full road closure for heavy machinery' : 'Single lane restriction with active work zone'}. Battery ${this.state.power.batteryVoltage}V.`,
      source: 'LIVE_HARDWARE',
    });

    this.state.cloud.activeHazardId = createdHazard.hazardId;
    this.addLog('CLOUD', `RoutePilot Central Engine Synced! Hazard ${createdHazard.hazardId} deployed. Dynamic Diversion Active.`);

    this.transmitHeartbeatPacket();
    this.notify();
    return createdHazard;
  }

  /**
   * CLEAR / DECOMMISSION ROAD CONSTRUCTION ZONE
   * Clears the work zone, resolves the hazard in RoutePilot, and notifies cloud.
   */
  public clearConstructionZone() {
    if (this.state.cloud.activeHazardId) {
      realtimeSync.resolveHazard(this.state.cloud.activeHazardId);
      this.addLog('CLOUD', `Hazard ${this.state.cloud.activeHazardId} RESOLVED. Road restored to Open status.`);
    }

    this.state.cloud.isConstructionActive = false;
    this.state.cloud.activeHazardId = null;

    this.addLog('ESP', 'Work zone beacon decommissioned. Reverted to standby monitoring.');
    this.transmitHeartbeatPacket();
    this.notify();
  }

  /**
   * Toggle Battery Power Switch
   */
  public togglePower() {
    this.state.power.isOn = !this.state.power.isOn;
    if (!this.state.power.isOn) {
      this.state.esp32.firmwareState = 'SLEEP';
      this.state.gps.hasFix = false;
      this.state.modem.powerOn = false;
      this.state.cellularLink.isTransmitting = false;
      this.addLog('PWR', '18650 Battery disconnected. System powered down.');
    } else {
      this.state.esp32.firmwareState = 'ACTIVE_TELEMETRY';
      this.state.gps.hasFix = true;
      this.state.modem.powerOn = true;
      this.addLog('PWR', 'Battery switch engaged. Buck converter supplying 5V to VIN & 3.3V to Logic.');
      this.addLog('ESP', 'ESP32 booted up. Reading NEO-6M GPS & SIM7600 4G LTE modem.');
    }
    this.notify();
  }

  /**
   * Select a Preset Construction Location
   */
  public selectPresetSite(index: number) {
    const site = PRESET_CONSTRUCTION_SITES[index] || PRESET_CONSTRUCTION_SITES[0];
    this.state.gps.latitude = site.lat;
    this.state.gps.longitude = site.lng;
    this.state.gps.locationName = site.name;
    this.state.gps.roadName = site.roadName;
    this.state.cloud.workZoneRadiusMeters = site.radius;

    this.addLog('GPS', `Site relocated: ${site.name} [${site.lat}, ${site.lng}]. HDOP 0.85.`);

    // If currently active, redeploy to update coordinates
    if (this.state.cloud.isConstructionActive) {
      this.deployConstructionZone();
    } else {
      this.notify();
    }
  }

  /**
   * Custom coordinates setter
   */
  public setCustomCoordinates(lat: number, lng: number, locationName: string, roadName: string) {
    this.state.gps.latitude = lat;
    this.state.gps.longitude = lng;
    this.state.gps.locationName = locationName;
    this.state.gps.roadName = roadName;

    this.addLog('GPS', `Manual GPS override: ${locationName} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    if (this.state.cloud.isConstructionActive) {
      this.deployConstructionZone();
    } else {
      this.notify();
    }
  }

  /**
   * Update Work Zone Radius
   */
  public setWorkZoneRadius(radiusMeters: number) {
    this.state.cloud.workZoneRadiusMeters = radiusMeters;
    if (this.state.cloud.isConstructionActive && this.state.cloud.activeHazardId) {
      this.deployConstructionZone({ radius: radiusMeters });
    } else {
      this.notify();
    }
  }

  /**
   * Update Lane Restriction
   */
  public setLaneStatus(status: 'FULL_BLOCKAGE' | 'PARTIAL_RESTRICTION') {
    this.state.cloud.laneStatus = status;
    this.state.cloud.severity = status === 'FULL_BLOCKAGE' ? 'CRITICAL' : 'WARNING';
    if (this.state.cloud.isConstructionActive) {
      this.deployConstructionZone({ laneStatus: status });
    } else {
      this.notify();
    }
  }

  public getPresetSites() {
    return PRESET_CONSTRUCTION_SITES;
  }
}

export const roadConstructionEngine = new RoadConstructionEngine();
