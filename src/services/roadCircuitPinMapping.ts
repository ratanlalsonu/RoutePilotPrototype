export interface RoadWireConnection {
  id: string;
  sourceComponent: string;
  sourcePin: string;
  sourceCoords: { x: number; y: number };
  targetComponent: string;
  targetPin: string;
  targetCoords: { x: number; y: number };
  signalType:
    | 'POWER_5V'
    | 'POWER_3V3'
    | 'POWER_3V7'
    | 'GND'
    | 'UART_TX'
    | 'UART_RX'
    | 'LOGICAL_CELLULAR'
    | 'LOGICAL_CLOUD';
  voltage: string;
  color: string;
  path: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  isElectricallyValid: boolean;
  direction: 'SRC_TO_DEST' | 'DEST_TO_SRC' | 'BIDIRECTIONAL';
  description: string;
}

export const ROAD_WIRE_CONNECTIONS: RoadWireConnection[] = [
  // 1. Battery Positive -> Regulator IN+
  {
    id: 'w-batt-pos',
    sourceComponent: '18650 Battery',
    sourcePin: 'BAT+',
    sourceCoords: { x: 83, y: 280 },
    targetComponent: 'DC-DC Converter',
    targetPin: 'IN+',
    targetCoords: { x: 178, y: 334 },
    signalType: 'POWER_3V7',
    voltage: '3.7V - 4.2V DC',
    color: '#ef4444', // Red
    path: 'M 83 280 L 83 255 Q 83 250 88 250 L 173 250 Q 178 250 178 255 L 178 334',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: '18650 Li-ion positive terminal connected to DC-DC boost/buck converter IN+ with correct polarity',
  },
  // 2. Battery Negative -> Regulator IN-
  {
    id: 'w-batt-neg',
    sourceComponent: '18650 Battery',
    sourcePin: 'BAT-',
    sourceCoords: { x: 83, y: 440 },
    targetComponent: 'DC-DC Converter',
    targetPin: 'IN-',
    targetCoords: { x: 178, y: 406 },
    signalType: 'GND',
    voltage: '0V (Ground Ref)',
    color: '#1e293b', // Dark Slate Ground
    path: 'M 83 440 L 83 460 Q 83 465 88 465 L 173 465 Q 178 465 178 460 L 178 406',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: '18650 Li-ion negative return connected to DC-DC converter IN- ground terminal',
  },
  // 3. Regulator 5V -> ESP32 VIN
  {
    id: 'w-reg-5v-esp',
    sourceComponent: 'Regulator 5V Terminal',
    sourcePin: '5V',
    sourceCoords: { x: 350, y: 350 },
    targetComponent: 'ESP32 DevKit V1',
    targetPin: 'VIN',
    targetCoords: { x: 514, y: 661 },
    signalType: 'POWER_5V',
    voltage: '5.0V Regulated',
    color: '#ef4444', // Red
    path: 'M 350 350 L 350 656 Q 350 661 355 661 L 514 661',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: 'Regulated 5.0V rail feeding ESP32 internal 3.3V LDO regulator via VIN pin (never connected directly to GPIOs)',
  },
  // 4. Regulator 5V -> SIM7600 VCC
  {
    id: 'w-reg-5v-sim',
    sourceComponent: 'Regulator 5V Terminal',
    sourcePin: '5V',
    sourceCoords: { x: 350, y: 350 },
    targetComponent: 'SIM7600 4G/LTE',
    targetPin: 'VCC',
    targetCoords: { x: 910, y: 483 },
    signalType: 'POWER_5V',
    voltage: '5.0V (2A Peak)',
    color: '#ef4444', // Red
    path: 'M 350 350 L 340 350 Q 335 350 335 355 L 335 730 Q 335 735 340 735 L 905 735 Q 910 735 910 730 L 910 483',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: 'High-current 5.0V rail capable of 2A burst current for SIM7600 cellular transmissions (powered from regulator, not ESP32)',
  },
  // 5. Regulator 3.3V -> NEO-6M GPS VCC
  {
    id: 'w-reg-3v3-gps',
    sourceComponent: 'Regulator 3.3V Terminal',
    sourcePin: '3.3V',
    sourceCoords: { x: 385, y: 280 },
    targetComponent: 'NEO-6M GPS Module',
    targetPin: 'VCC',
    targetCoords: { x: 555, y: 220 },
    signalType: 'POWER_3V3',
    voltage: '3.3V Regulated',
    color: '#facc15', // Amber Yellow
    path: 'M 385 280 L 385 175 Q 385 170 390 170 L 550 170 Q 555 170 555 175 L 555 220',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: 'Clean regulated 3.3V power supply rail feeding NEO-6M GPS satellite receiver VCC',
  },
  // 6. Common Ground -> ESP32 GND
  {
    id: 'w-gnd-common-esp',
    sourceComponent: 'Power Supply Ground',
    sourcePin: 'GND',
    sourceCoords: { x: 390, y: 430 },
    targetComponent: 'ESP32 DevKit V1',
    targetPin: 'GND',
    targetCoords: { x: 514, y: 641 },
    signalType: 'GND',
    voltage: '0V (Ground Ref)',
    color: '#1e293b', // Dark Slate Ground
    path: 'M 390 430 L 390 636 Q 390 641 395 641 L 514 641',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: 'Primary common system ground reference connecting regulator ground bus to ESP32 DevKit GND',
  },
  // 7. ESP32 GND -> NEO-6M GPS GND
  {
    id: 'w-gnd-esp-gps',
    sourceComponent: 'ESP32 DevKit V1',
    sourcePin: 'GND',
    sourceCoords: { x: 756, y: 401 },
    targetComponent: 'NEO-6M GPS Module',
    targetPin: 'GND',
    targetCoords: { x: 595, y: 220 },
    signalType: 'GND',
    voltage: '0V (Ground Ref)',
    color: '#1e293b',
    path: 'M 756 401 L 765 401 Q 770 401 770 396 L 770 305 Q 770 300 765 300 L 600 300 Q 595 300 595 295 L 595 220',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'BIDIRECTIONAL',
    description: 'Common ground return for NEO-6M GPS module connecting to ESP32 ground bus',
  },
  // 8. ESP32 GND -> SIM7600 GND
  {
    id: 'w-gnd-esp-sim',
    sourceComponent: 'ESP32 DevKit V1',
    sourcePin: 'GND',
    sourceCoords: { x: 756, y: 661 },
    targetComponent: 'SIM7600 4G/LTE',
    targetPin: 'GND',
    targetCoords: { x: 960, y: 483 },
    signalType: 'GND',
    voltage: '0V (Ground Ref)',
    color: '#1e293b',
    path: 'M 756 661 L 955 661 Q 960 661 960 656 L 960 483',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'BIDIRECTIONAL',
    description: 'Shared low-impedance common ground reference between ESP32 and SIM7600 cellular modem',
  },
  // 9. GPS TX -> ESP32 RX2 (GPIO 16)
  {
    id: 'w-gps-tx',
    sourceComponent: 'NEO-6M GPS Module',
    sourcePin: 'TX',
    sourceCoords: { x: 640, y: 220 },
    targetComponent: 'ESP32 DevKit V1',
    targetPin: '16',
    targetCoords: { x: 756, y: 581 },
    signalType: 'UART_TX',
    voltage: '3.3V Logic',
    color: '#38bdf8', // Cyan Blue
    path: 'M 640 220 L 640 315 Q 640 320 645 320 L 790 320 Q 795 320 795 325 L 795 576 Q 795 581 790 581 L 756 581',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: 'UART Data (GPS TX → ESP32 RX2): Streams NMEA sentences ($GPGGA, $GPRMC) @ 9600 baud into ESP32 Hardware UART2 RX (GPIO16)',
  },
  // 10. GPS RX -> ESP32 TX2 (GPIO 17)
  {
    id: 'w-gps-rx',
    sourceComponent: 'ESP32 DevKit V1',
    sourcePin: '17',
    sourceCoords: { x: 756, y: 561 },
    targetComponent: 'NEO-6M GPS Module',
    targetPin: 'RX',
    targetCoords: { x: 685, y: 220 },
    signalType: 'UART_RX',
    voltage: '3.3V Logic',
    color: '#34d399', // Emerald Green
    path: 'M 756 561 L 775 561 Q 780 561 780 556 L 780 340 Q 780 335 775 335 L 690 335 Q 685 335 685 330 L 685 220',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: 'UART Command (ESP32 TX2 → GPS RX): Transmits UBX configuration & refresh commands from ESP32 Hardware UART2 TX (GPIO17) to GPS',
  },
  // 11. SIM7600 TX -> ESP32 RX (GPIO 21)
  {
    id: 'w-sim-tx',
    sourceComponent: 'SIM7600 4G/LTE',
    sourcePin: 'TX',
    sourceCoords: { x: 1010, y: 483 },
    targetComponent: 'ESP32 DevKit V1',
    targetPin: '21',
    targetCoords: { x: 756, y: 501 },
    signalType: 'UART_TX',
    voltage: '3.3V Logic',
    color: '#38bdf8', // Cyan Blue
    path: 'M 1010 483 L 1010 530 Q 1010 535 1005 535 L 815 535 Q 810 535 810 530 L 810 506 Q 810 501 805 501 L 756 501',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: 'UART Data (SIM7600 TX → ESP32 RX): Streams AT command responses and HTTP return codes @ 115200 baud into ESP32 GPIO21',
  },
  // 12. SIM7600 RX -> ESP32 TX (GPIO 22)
  {
    id: 'w-sim-rx',
    sourceComponent: 'ESP32 DevKit V1',
    sourcePin: '22',
    sourceCoords: { x: 756, y: 441 },
    targetComponent: 'SIM7600 4G/LTE',
    targetPin: 'RX',
    targetCoords: { x: 1055, y: 483 },
    signalType: 'UART_RX',
    voltage: '3.3V Logic',
    color: '#34d399', // Emerald Green
    path: 'M 756 441 L 820 441 Q 825 441 825 446 L 825 455 Q 825 460 830 460 L 1050 460 Q 1055 460 1055 465 L 1055 483',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: 'UART Command (ESP32 TX → SIM7600 RX): Transmits AT+HTTPDATA & AT+HTTPACTION telemetry commands from ESP32 GPIO22 to modem',
  },
  // 13. SIM7600 4G/LTE Antenna -> Internet (Logical Network Link)
  {
    id: 'w-sim-internet',
    sourceComponent: 'SIM7600 Whip Antenna',
    sourcePin: 'RF_OUT',
    sourceCoords: { x: 1102, y: 345 },
    targetComponent: 'Internet Gateway',
    targetPin: 'CELLULAR_LINK',
    targetCoords: { x: 1167, y: 395 },
    signalType: 'LOGICAL_CELLULAR',
    voltage: '4G/LTE RF (B3/B40)',
    color: '#38bdf8', // Cyan
    path: 'M 1102 345 Q 1140 345 1167 395',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: 'Logical Network Link: Over-the-air 4G/LTE cellular TCP/IP connection from SIM7600 antenna to Internet (no physical wire)',
  },
  // 14. Internet -> RoutePilot Backend Server (Logical Network Link)
  {
    id: 'w-internet-cloud',
    sourceComponent: 'Internet Gateway',
    sourcePin: 'CLOUD_PORT',
    sourceCoords: { x: 1303, y: 395 },
    targetComponent: 'RoutePilot Backend Server',
    targetPin: 'REST_INGEST',
    targetCoords: { x: 1340, y: 395 },
    signalType: 'LOGICAL_CLOUD',
    voltage: 'HTTPS / TLS / REST',
    color: '#c084fc', // Purple
    path: 'M 1303 395 L 1340 395',
    status: 'CONNECTED',
    isElectricallyValid: true,
    direction: 'SRC_TO_DEST',
    description: 'Logical Network Link: Secure HTTPS REST route feeding road hazard telemetry into RoutePilot Backend Server',
  },
];

export interface HardwarePinMapping {
  component: string;
  pin: string;
  esp32Pin: string;
  signalType: string;
  voltage: string;
  description: string;
  isElectricallyValid: boolean;
}

export const ROAD_PIN_MAPPINGS: HardwarePinMapping[] = [
  {
    component: '18650 Li-ion Cell',
    pin: 'BAT+ / BAT-',
    esp32Pin: 'N/A (to DC-DC Converter)',
    signalType: 'Power Input',
    voltage: '3.7V - 4.2V DC',
    description: 'Single-cell 18650 Li-ion positive & negative into Boost/Buck converter',
    isElectricallyValid: true,
  },
  {
    component: 'DC-DC Converter',
    pin: '5V Regulated Out',
    esp32Pin: 'VIN (Pin 14 Left Header)',
    signalType: 'Power Rail',
    voltage: '5.0V Regulated',
    description: 'Feeds ESP32 onboard AMS1117-3.3 regulator safely via VIN',
    isElectricallyValid: true,
  },
  {
    component: 'DC-DC Converter',
    pin: '5V Regulated Out (2A Peak)',
    esp32Pin: 'N/A (Direct to SIM7600 VCC)',
    signalType: 'Power Rail',
    voltage: '5.0V (2A Peak)',
    description: 'High-current 2A burst rail for SIM7600 LTE transmissions (never from ESP32 pins)',
    isElectricallyValid: true,
  },
  {
    component: 'DC-DC Converter',
    pin: '3.3V Regulated Out',
    esp32Pin: 'N/A (Direct to GPS VCC)',
    signalType: 'Power Rail',
    voltage: '3.3V Regulated',
    description: 'Clean regulated logic voltage feeding NEO-6M GPS receiver VCC',
    isElectricallyValid: true,
  },
  {
    component: 'System Ground Bus',
    pin: 'GND Common',
    esp32Pin: 'GND (Pin 13 Left / Pin 1 Right)',
    signalType: 'Ground Reference',
    voltage: '0V',
    description: 'Shared low-impedance ground uniting battery, converter, ESP32, GPS, and SIM7600',
    isElectricallyValid: true,
  },
  {
    component: 'NEO-6M GPS Receiver',
    pin: 'TX',
    esp32Pin: 'GPIO 16 (Hardware UART2 RX)',
    signalType: 'UART Serial In',
    voltage: '3.3V TTL Logic',
    description: 'GPS NMEA sentences ($GPGGA, $GPRMC @ 9600 baud) stream into ESP32 RX2',
    isElectricallyValid: true,
  },
  {
    component: 'NEO-6M GPS Receiver',
    pin: 'RX',
    esp32Pin: 'GPIO 17 (Hardware UART2 TX)',
    signalType: 'UART Serial Out',
    voltage: '3.3V TTL Logic',
    description: 'UBX binary configuration & refresh commands sent from ESP32 TX2 to GPS',
    isElectricallyValid: true,
  },
  {
    component: 'SIM7600 4G/LTE Modem',
    pin: 'TX',
    esp32Pin: 'GPIO 21 (UART RX)',
    signalType: 'UART Serial In',
    voltage: '3.3V TTL Logic',
    description: 'AT command execution responses and HTTP return codes into ESP32',
    isElectricallyValid: true,
  },
  {
    component: 'SIM7600 4G/LTE Modem',
    pin: 'RX',
    esp32Pin: 'GPIO 22 (UART TX)',
    signalType: 'UART Serial Out',
    voltage: '3.3V TTL Logic',
    description: 'AT+HTTPDATA & AT+HTTPACTION telemetry commands sent from ESP32',
    isElectricallyValid: true,
  },
  {
    component: 'SIM7600 4G/LTE Modem',
    pin: 'RF SMA Antenna',
    esp32Pin: 'N/A (Wireless Cellular Link)',
    signalType: 'Logical Network',
    voltage: '4G/LTE RF Carrier',
    description: 'Over-the-air TCP/IP cellular link to Internet (no physical wire)',
    isElectricallyValid: true,
  },
  {
    component: 'Internet Gateway',
    pin: 'TCP/IP Cloud Route',
    esp32Pin: 'N/A (HTTPS Cloud Route)',
    signalType: 'Logical Network',
    voltage: 'HTTPS / TLS / REST',
    description: 'Secure REST ingestion route feeding RoutePilot Backend Server (no physical wire)',
    isElectricallyValid: true,
  },
];
