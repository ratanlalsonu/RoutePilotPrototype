export interface RoadWireConnection {
  id: string;
  sourceComponent: string;
  sourcePin: string;
  sourceCoords: { x: number; y: number };
  targetComponent: string;
  targetPin: string;
  targetCoords: { x: number; y: number };
  signalType: 'POWER_5V' | 'POWER_3V3' | 'POWER_3V7' | 'GND' | 'UART' | 'CELLULAR_RF' | 'CLOUD_API';
  voltage: string;
  color: string;
  path: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  description: string;
}

export const ROAD_WIRE_CONNECTIONS: RoadWireConnection[] = [
  // 1. Battery Positive -> Regulator IN+
  {
    id: 'w-batt-pos',
    sourceComponent: '18650 Battery',
    sourcePin: 'BAT+',
    sourceCoords: { x: 83, y: 280 },
    targetComponent: 'Boost/Buck Regulator',
    targetPin: 'IN+',
    targetCoords: { x: 178, y: 334 },
    signalType: 'POWER_3V7',
    voltage: '3.7V - 4.2V',
    color: '#ef4444', // Red
    path: 'M 83 280 C 83 250, 140 250, 140 334 L 178 334',
    status: 'CONNECTED',
    description: '18650 Li-ion positive terminal connected to DC-DC converter input',
  },
  // 2. Battery Negative -> Regulator IN-
  {
    id: 'w-batt-neg',
    sourceComponent: '18650 Battery',
    sourcePin: 'BAT-',
    sourceCoords: { x: 83, y: 440 },
    targetComponent: 'Boost/Buck Regulator',
    targetPin: 'IN-',
    targetCoords: { x: 178, y: 406 },
    signalType: 'GND',
    voltage: '0V',
    color: '#3b82f6', // Blue ground return
    path: 'M 83 440 C 83 460, 140 460, 140 406 L 178 406',
    status: 'CONNECTED',
    description: '18650 Li-ion negative return connected to DC-DC ground input',
  },
  // 3. Regulator 5V -> ESP32 VIN
  {
    id: 'w-reg-5v-esp',
    sourceComponent: 'Regulator 5V Terminal',
    sourcePin: '5V',
    sourceCoords: { x: 350, y: 310 },
    targetComponent: 'ESP32 DevKit V1',
    targetPin: 'VIN',
    targetCoords: { x: 514, y: 661 },
    signalType: 'POWER_5V',
    voltage: '5.0V Regulated',
    color: '#ef4444',
    path: 'M 350 310 C 350 710, 470 710, 470 661 L 514 661',
    status: 'CONNECTED',
    description: 'Regulated 5.0V rail feeding ESP32 internal 3.3V LDO regulator via VIN terminal',
  },
  // 4. Regulator 5V -> SIM7600 VCC
  {
    id: 'w-reg-5v-sim',
    sourceComponent: 'Regulator 5V Terminal',
    sourcePin: '5V',
    sourceCoords: { x: 350, y: 310 },
    targetComponent: 'SIM7600 4G/LTE',
    targetPin: 'VCC',
    targetCoords: { x: 910, y: 483 },
    signalType: 'POWER_5V',
    voltage: '5.0V (2A Peak)',
    color: '#ef4444',
    path: 'M 350 310 C 350 740, 910 740, 910 483',
    status: 'CONNECTED',
    description: 'High-current 5.0V power rail capable of 2A burst current for SIM7600 LTE transmissions',
  },
  // 5. Regulator 3.3V -> ESP32 3V3
  {
    id: 'w-reg-3v3-esp',
    sourceComponent: 'Regulator 3.3V Terminal',
    sourcePin: '3.3V',
    sourceCoords: { x: 390, y: 310 },
    targetComponent: 'ESP32 DevKit V1',
    targetPin: '3V3',
    targetCoords: { x: 514, y: 401 },
    signalType: 'POWER_3V3',
    voltage: '3.3V Regulated',
    color: '#facc15', // Yellow
    path: 'M 390 310 C 390 401, 460 401, 514 401',
    status: 'CONNECTED',
    description: 'Regulated 3.3V logic supply to ESP32 main 3V3 bus',
  },
  // 6. Regulator 3.3V -> NEO-6M GPS VCC
  {
    id: 'w-reg-3v3-gps',
    sourceComponent: 'Regulator 3.3V Terminal',
    sourcePin: '3.3V',
    sourceCoords: { x: 390, y: 310 },
    targetComponent: 'NEO-6M GPS Module',
    targetPin: 'VCC',
    targetCoords: { x: 555, y: 220 },
    signalType: 'POWER_3V3',
    voltage: '3.3V Regulated',
    color: '#ef4444',
    path: 'M 390 310 C 390 220, 490 220, 555 220',
    status: 'CONNECTED',
    description: 'Clean regulated 3.3V power rail feeding NEO-6M GPS receiver',
  },
  // 7. Common Ground -> ESP32 GND
  {
    id: 'w-gnd-esp',
    sourceComponent: 'Power Supply Ground',
    sourcePin: 'GND',
    sourceCoords: { x: 350, y: 430 },
    targetComponent: 'ESP32 DevKit V1',
    targetPin: 'GND',
    targetCoords: { x: 514, y: 641 },
    signalType: 'GND',
    voltage: '0V',
    color: '#1e293b',
    path: 'M 350 430 C 350 641, 460 641, 514 641',
    status: 'CONNECTED',
    description: 'Primary common system ground reference connecting to ESP32 DevKit GND',
  },
  // 8. ESP32 GND -> NEO-6M GPS GND
  {
    id: 'w-gnd-gps',
    sourceComponent: 'ESP32 DevKit V1',
    sourcePin: 'GND',
    sourceCoords: { x: 756, y: 401 },
    targetComponent: 'NEO-6M GPS Module',
    targetPin: 'GND',
    targetCoords: { x: 595, y: 220 },
    signalType: 'GND',
    voltage: '0V',
    color: '#1e293b',
    path: 'M 756 401 C 756 310, 595 310, 595 220',
    status: 'CONNECTED',
    description: 'Common ground return for GPS module',
  },
  // 9. ESP32 GND -> SIM7600 GND
  {
    id: 'w-gnd-sim',
    sourceComponent: 'ESP32 DevKit V1',
    sourcePin: 'GND',
    sourceCoords: { x: 756, y: 401 },
    targetComponent: 'SIM7600 4G/LTE',
    targetPin: 'GND',
    targetCoords: { x: 960, y: 483 },
    signalType: 'GND',
    voltage: '0V',
    color: '#1e293b',
    path: 'M 756 401 C 820 401, 960 420, 960 483',
    status: 'CONNECTED',
    description: 'Shared low-impedance ground return for SIM7600 cellular transceiver',
  },
  // 10. GPS TX -> ESP32 RX2 (GPIO 16)
  {
    id: 'w-gps-tx',
    sourceComponent: 'NEO-6M GPS Module',
    sourcePin: 'TX',
    sourceCoords: { x: 640, y: 220 },
    targetComponent: 'ESP32 DevKit V1',
    targetPin: '16',
    targetCoords: { x: 756, y: 581 },
    signalType: 'UART',
    voltage: '3.3V Logic',
    color: '#38bdf8', // Cyan Blue
    path: 'M 640 220 C 640 340, 680 340, 680 581 L 756 581',
    status: 'CONNECTED',
    description: 'UART Data: Streams NMEA $GPGGA & $GPRMC sentences @ 9600 baud from GPS into ESP32 RX2 (GPIO16)',
  },
  // 11. GPS RX -> ESP32 TX2 (GPIO 17)
  {
    id: 'w-gps-rx',
    sourceComponent: 'NEO-6M GPS Module',
    sourcePin: 'RX',
    sourceCoords: { x: 685, y: 220 },
    targetComponent: 'ESP32 DevKit V1',
    targetPin: '17',
    targetCoords: { x: 756, y: 561 },
    signalType: 'UART',
    voltage: '3.3V Logic',
    color: '#facc15', // Amber Yellow
    path: 'M 685 220 C 685 320, 715 320, 715 561 L 756 561',
    status: 'CONNECTED',
    description: 'UART Command: Transmits UBX configuration & refresh commands from ESP32 TX2 (GPIO17) to GPS',
  },
  // 12. SIM7600 TX -> ESP32 RX (GPIO 21)
  {
    id: 'w-sim-tx',
    sourceComponent: 'SIM7600 4G/LTE',
    sourcePin: 'TX',
    sourceCoords: { x: 1010, y: 483 },
    targetComponent: 'ESP32 DevKit V1',
    targetPin: '21',
    targetCoords: { x: 756, y: 501 },
    signalType: 'UART',
    voltage: '3.3V Logic',
    color: '#38bdf8',
    path: 'M 1010 483 C 1010 610, 810 610, 810 501 L 756 501',
    status: 'CONNECTED',
    description: 'UART Responses: SIM7600 AT Command execution responses and HTTP return codes into ESP32 GPIO21',
  },
  // 13. SIM7600 RX -> ESP32 TX (GPIO 22)
  {
    id: 'w-sim-rx',
    sourceComponent: 'SIM7600 4G/LTE',
    sourcePin: 'RX',
    sourceCoords: { x: 1055, y: 483 },
    targetComponent: 'ESP32 DevKit V1',
    targetPin: '22',
    targetCoords: { x: 756, y: 441 },
    signalType: 'UART',
    voltage: '3.3V Logic',
    color: '#facc15',
    path: 'M 1055 483 C 1055 640, 840 640, 840 441 L 756 441',
    status: 'CONNECTED',
    description: 'UART Commands: Transmits AT+HTTPDATA & AT+HTTPACTION packets from ESP32 GPIO22 to modem',
  },
  // 14. SIM7600 Antenna -> Internet Link
  {
    id: 'w-sim-internet',
    sourceComponent: 'SIM7600 Whip Antenna',
    sourcePin: 'RF_OUT',
    sourceCoords: { x: 1102, y: 365 },
    targetComponent: 'Cellular Base Station',
    targetPin: '4G_LTE',
    targetCoords: { x: 1190, y: 395 },
    signalType: 'CELLULAR_RF',
    voltage: 'RF Carrier',
    color: '#38bdf8',
    path: 'M 1102 365 C 1140 365, 1150 395, 1190 395',
    status: 'CONNECTED',
    description: 'Wireless Cellular 4G/LTE Uplink (Band 3 / Band 40) transmitting IP packets to tower',
  },
  // 15. Internet -> Backend Cloud Gateway
  {
    id: 'w-internet-cloud',
    sourceComponent: 'Internet Gateway',
    sourcePin: 'WAN_IP',
    sourceCoords: { x: 1360, y: 395 },
    targetComponent: 'RoutePilot Cloud Server',
    targetPin: 'API_ENDPOINT',
    targetCoords: { x: 1390, y: 395 },
    signalType: 'CLOUD_API',
    voltage: 'TLS/HTTPS',
    color: '#c084fc',
    path: 'M 1360 395 L 1390 395',
    status: 'CONNECTED',
    description: 'Secure HTTPS POST ingestion pipeline to RoutePilot road hazards database',
  },
];
