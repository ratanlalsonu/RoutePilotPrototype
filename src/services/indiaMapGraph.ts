export interface IndiaPlaceNode {
  id: string;
  name: string;
  hindiName: string;
  code: string;
  x: number; // pixel in 1376x768 coordinate space
  y: number; // pixel in 1376x768 coordinate space
  xPct: number; // 0..100 percentage
  yPct: number; // 0..100 percentage
  pinColor: string; // Hex color matching the pin on the map
  badgeBg: string;
  textColor: string;
  region: 'North' | 'South' | 'East' | 'West' | 'Central' | 'Northeast';
}

export interface IndiaJunctionNode {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface IndiaRoadSegment {
  id: string;
  name: string;
  from: string;
  to: string;
  distanceKm: number;
  baseDurationMinutes: number;
  waypoints: [number, number][]; // Array of [x, y] coordinates matching the road geometry in the graphic
  isBridge?: boolean;
}

export interface GraphRouteResult {
  nodeIds: string[];
  nodes: IndiaPlaceNode[];
  segments: IndiaRoadSegment[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  allPoints: [number, number][]; // Full sequence of [x, y] points along the road
  steps: {
    fromNode: string;
    toNode: string;
    instruction: string;
    distanceKm: number;
    durationMinutes: number;
  }[];
  isHazardBlocked?: boolean;
  blockedSegmentId?: string;
  hazardNote?: string;
}

/**
 * 30 State Nodes precisely located on the 1376 x 768 map graphic
 */
export const INDIA_PLACE_NODES: IndiaPlaceNode[] = [
  {
    id: 'JK',
    name: 'Jammu & Kashmir',
    hindiName: 'जम्मू और कश्मीर',
    code: 'JK',
    x: 172,
    y: 48,
    xPct: (172 / 1376) * 100,
    yPct: (48 / 768) * 100,
    pinColor: '#a855f7', // Purple
    badgeBg: 'bg-purple-950/80 border-purple-500/50 text-purple-200',
    textColor: '#c084fc',
    region: 'North',
  },
  {
    id: 'HP',
    name: 'Himachal Pradesh',
    hindiName: 'हिमाचल प्रदेश',
    code: 'HP',
    x: 468,
    y: 50,
    xPct: (468 / 1376) * 100,
    yPct: (50 / 768) * 100,
    pinColor: '#f97316', // Orange
    badgeBg: 'bg-orange-950/80 border-orange-500/50 text-orange-200',
    textColor: '#fb923c',
    region: 'North',
  },
  {
    id: 'PB',
    name: 'Punjab',
    hindiName: 'पंजाब',
    code: 'PB',
    x: 352,
    y: 165,
    xPct: (352 / 1376) * 100,
    yPct: (165 / 768) * 100,
    pinColor: '#3b82f6', // Blue
    badgeBg: 'bg-blue-950/80 border-blue-500/50 text-blue-200',
    textColor: '#60a5fa',
    region: 'North',
  },
  {
    id: 'HR',
    name: 'Haryana',
    hindiName: 'हरियाणा',
    code: 'HR',
    x: 465,
    y: 236,
    xPct: (465 / 1376) * 100,
    yPct: (236 / 768) * 100,
    pinColor: '#22c55e', // Green
    badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200',
    textColor: '#4ade80',
    region: 'North',
  },
  {
    id: 'UK',
    name: 'Uttarakhand',
    hindiName: 'उत्तराखंड',
    code: 'UK',
    x: 718,
    y: 148,
    xPct: (718 / 1376) * 100,
    yPct: (148 / 768) * 100,
    pinColor: '#06b6d4', // Cyan/Blue
    badgeBg: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200',
    textColor: '#22d3ee',
    region: 'North',
  },
  {
    id: 'DL',
    name: 'Delhi',
    hindiName: 'दिल्ली',
    code: 'DL',
    x: 626,
    y: 265,
    xPct: (626 / 1376) * 100,
    yPct: (265 / 768) * 100,
    pinColor: '#ef4444', // Red
    badgeBg: 'bg-red-950/80 border-red-500/50 text-red-200',
    textColor: '#f87171',
    region: 'North',
  },
  {
    id: 'RJ',
    name: 'Rajasthan',
    hindiName: 'राजस्थान',
    code: 'RJ',
    x: 205,
    y: 295,
    xPct: (205 / 1376) * 100,
    yPct: (295 / 768) * 100,
    pinColor: '#ef4444', // Red
    badgeBg: 'bg-red-950/80 border-red-500/50 text-red-200',
    textColor: '#f87171',
    region: 'West',
  },
  {
    id: 'UP',
    name: 'Uttar Pradesh',
    hindiName: 'उत्तर प्रदेश',
    code: 'UP',
    x: 760,
    y: 326,
    xPct: (760 / 1376) * 100,
    yPct: (326 / 768) * 100,
    pinColor: '#f59e0b', // Yellow/Orange
    badgeBg: 'bg-amber-950/80 border-amber-500/50 text-amber-200',
    textColor: '#fbbf24',
    region: 'North',
  },
  {
    id: 'GJ',
    name: 'Gujarat',
    hindiName: 'गुजरात',
    code: 'GJ',
    x: 165,
    y: 450,
    xPct: (165 / 1376) * 100,
    yPct: (450 / 768) * 100,
    pinColor: '#3b82f6', // Blue
    badgeBg: 'bg-blue-950/80 border-blue-500/50 text-blue-200',
    textColor: '#60a5fa',
    region: 'West',
  },
  {
    id: 'MP',
    name: 'Madhya Pradesh',
    hindiName: 'मध्य प्रदेश',
    code: 'MP',
    x: 466,
    y: 434,
    xPct: (466 / 1376) * 100,
    yPct: (434 / 768) * 100,
    pinColor: '#a855f7', // Purple
    badgeBg: 'bg-purple-950/80 border-purple-500/50 text-purple-200',
    textColor: '#c084fc',
    region: 'Central',
  },
  {
    id: 'BR',
    name: 'Bihar',
    hindiName: 'बिहार',
    code: 'BR',
    x: 962,
    y: 370,
    xPct: (962 / 1376) * 100,
    yPct: (370 / 768) * 100,
    pinColor: '#3b82f6', // Blue
    badgeBg: 'bg-blue-950/80 border-blue-500/50 text-blue-200',
    textColor: '#60a5fa',
    region: 'East',
  },
  {
    id: 'SK',
    name: 'Sikkim',
    hindiName: 'सिक्किम',
    code: 'SK',
    x: 990,
    y: 162,
    xPct: (990 / 1376) * 100,
    yPct: (162 / 768) * 100,
    pinColor: '#a855f7', // Purple
    badgeBg: 'bg-purple-950/80 border-purple-500/50 text-purple-200',
    textColor: '#c084fc',
    region: 'Northeast',
  },
  {
    id: 'AS',
    name: 'Assam',
    hindiName: 'असम',
    code: 'AS',
    x: 1104,
    y: 272,
    xPct: (1104 / 1376) * 100,
    yPct: (272 / 768) * 100,
    pinColor: '#ec4899', // Pink
    badgeBg: 'bg-pink-950/80 border-pink-500/50 text-pink-200',
    textColor: '#f472b6',
    region: 'Northeast',
  },
  {
    id: 'AR',
    name: 'Arunachal Pradesh',
    hindiName: 'अरुणाचल प्रदेश',
    code: 'AR',
    x: 1218,
    y: 92,
    xPct: (1218 / 1376) * 100,
    yPct: (92 / 768) * 100,
    pinColor: '#3b82f6', // Blue
    badgeBg: 'bg-blue-950/80 border-blue-500/50 text-blue-200',
    textColor: '#60a5fa',
    region: 'Northeast',
  },
  {
    id: 'NL',
    name: 'Nagaland',
    hindiName: 'नागालैंड',
    code: 'NL',
    x: 1270,
    y: 268,
    xPct: (1270 / 1376) * 100,
    yPct: (268 / 768) * 100,
    pinColor: '#22c55e', // Green
    badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200',
    textColor: '#4ade80',
    region: 'Northeast',
  },
  {
    id: 'MN',
    name: 'Manipur',
    hindiName: 'मणिपुर',
    code: 'MN',
    x: 1282,
    y: 382,
    xPct: (1282 / 1376) * 100,
    yPct: (382 / 768) * 100,
    pinColor: '#a855f7', // Purple
    badgeBg: 'bg-purple-950/80 border-purple-500/50 text-purple-200',
    textColor: '#c084fc',
    region: 'Northeast',
  },
  {
    id: 'ML',
    name: 'Meghalaya',
    hindiName: 'मेघालय',
    code: 'ML',
    x: 1128,
    y: 402,
    xPct: (1128 / 1376) * 100,
    yPct: (402 / 768) * 100,
    pinColor: '#a855f7', // Purple
    badgeBg: 'bg-purple-950/80 border-purple-500/50 text-purple-200',
    textColor: '#c084fc',
    region: 'Northeast',
  },
  {
    id: 'TR',
    name: 'Tripura',
    hindiName: 'त्रिपुरा',
    code: 'TR',
    x: 1158,
    y: 500,
    xPct: (1158 / 1376) * 100,
    yPct: (500 / 768) * 100,
    pinColor: '#ec4899', // Pink
    badgeBg: 'bg-pink-950/80 border-pink-500/50 text-pink-200',
    textColor: '#f472b6',
    region: 'Northeast',
  },
  {
    id: 'MZ',
    name: 'Mizoram',
    hindiName: 'मिजोरम',
    code: 'MZ',
    x: 1280,
    y: 490,
    xPct: (1280 / 1376) * 100,
    yPct: (490 / 768) * 100,
    pinColor: '#eab308', // Yellow
    badgeBg: 'bg-yellow-950/80 border-yellow-500/50 text-yellow-200',
    textColor: '#fde047',
    region: 'Northeast',
  },
  {
    id: 'JH',
    name: 'Jharkhand',
    hindiName: 'झारखंड',
    code: 'JH',
    x: 853,
    y: 480,
    xPct: (853 / 1376) * 100,
    yPct: (480 / 768) * 100,
    pinColor: '#f97316', // Orange
    badgeBg: 'bg-orange-950/80 border-orange-500/50 text-orange-200',
    textColor: '#fb923c',
    region: 'East',
  },
  {
    id: 'WB',
    name: 'West Bengal',
    hindiName: 'पश्चिम बंगाल',
    code: 'WB',
    x: 1062,
    y: 598,
    xPct: (1062 / 1376) * 100,
    yPct: (598 / 768) * 100,
    pinColor: '#ef4444', // Red
    badgeBg: 'bg-red-950/80 border-red-500/50 text-red-200',
    textColor: '#f87171',
    region: 'East',
  },
  {
    id: 'CG',
    name: 'Chhattisgarh',
    hindiName: 'छत्तीसगढ़',
    code: 'CG',
    x: 651,
    y: 504,
    xPct: (651 / 1376) * 100,
    yPct: (504 / 768) * 100,
    pinColor: '#06b6d4', // Cyan/Blue
    badgeBg: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200',
    textColor: '#22d3ee',
    region: 'Central',
  },
  {
    id: 'OD',
    name: 'Odisha',
    hindiName: 'ओडिशा',
    code: 'OD',
    x: 814,
    y: 594,
    xPct: (814 / 1376) * 100,
    yPct: (594 / 768) * 100,
    pinColor: '#a855f7', // Purple
    badgeBg: 'bg-purple-950/80 border-purple-500/50 text-purple-200',
    textColor: '#c084fc',
    region: 'East',
  },
  {
    id: 'MH',
    name: 'Maharashtra',
    hindiName: 'महाराष्ट्र',
    code: 'MH',
    x: 234,
    y: 596,
    xPct: (234 / 1376) * 100,
    yPct: (596 / 768) * 100,
    pinColor: '#22c55e', // Green
    badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200',
    textColor: '#4ade80',
    region: 'West',
  },
  {
    id: 'TG',
    name: 'Telangana',
    hindiName: 'तेलंगाना',
    code: 'TG',
    x: 578,
    y: 678,
    xPct: (578 / 1376) * 100,
    yPct: (678 / 768) * 100,
    pinColor: '#f59e0b', // Yellow/Orange
    badgeBg: 'bg-amber-950/80 border-amber-500/50 text-amber-200',
    textColor: '#fbbf24',
    region: 'South',
  },
  {
    id: 'AP',
    name: 'Andhra Pradesh',
    hindiName: 'आंध्र प्रदेश',
    code: 'AP',
    x: 754,
    y: 740,
    xPct: (754 / 1376) * 100,
    yPct: (740 / 768) * 100,
    pinColor: '#3b82f6', // Blue
    badgeBg: 'bg-blue-950/80 border-blue-500/50 text-blue-200',
    textColor: '#60a5fa',
    region: 'South',
  },
  {
    id: 'GA',
    name: 'Goa',
    hindiName: 'गोवा',
    code: 'GA',
    x: 180,
    y: 720,
    xPct: (180 / 1376) * 100,
    yPct: (720 / 768) * 100,
    pinColor: '#a855f7', // Purple
    badgeBg: 'bg-purple-950/80 border-purple-500/50 text-purple-200',
    textColor: '#c084fc',
    region: 'West',
  },
  {
    id: 'KA',
    name: 'Karnataka',
    hindiName: 'कर्नाटक',
    code: 'KA',
    x: 396,
    y: 740,
    xPct: (396 / 1376) * 100,
    yPct: (740 / 768) * 100,
    pinColor: '#f97316', // Orange
    badgeBg: 'bg-orange-950/80 border-orange-500/50 text-orange-200',
    textColor: '#fb923c',
    region: 'South',
  },
  {
    id: 'KL',
    name: 'Kerala',
    hindiName: 'केरल',
    code: 'KL',
    x: 358,
    y: 674,
    xPct: (358 / 1376) * 100,
    yPct: (674 / 768) * 100,
    pinColor: '#3b82f6', // Blue
    badgeBg: 'bg-blue-950/80 border-blue-500/50 text-blue-200',
    textColor: '#60a5fa',
    region: 'South',
  },
  {
    id: 'TN',
    name: 'Tamil Nadu',
    hindiName: 'तमिलनाडु',
    code: 'TN',
    x: 605,
    y: 672,
    xPct: (605 / 1376) * 100,
    yPct: (672 / 768) * 100,
    pinColor: '#ef4444', // Red
    badgeBg: 'bg-red-950/80 border-red-500/50 text-red-200',
    textColor: '#f87171',
    region: 'South',
  },
];

/**
 * Key Highway Roundabouts / Overpass Interchanges drawn on the map
 */
export const INDIA_JUNCTIONS: IndiaJunctionNode[] = [
  { id: 'J_NW', name: 'Northwest Hub', x: 295, y: 130 },
  { id: 'J_NORTH', name: 'Delhi-Dehradun Interchange', x: 550, y: 155 },
  { id: 'J_UK_NE', name: 'Himalayan Corridor Junction', x: 835, y: 220 },
  { id: 'J_WEST_IN', name: 'Punjab-Haryana Bypass', x: 395, y: 210 },
  { id: 'J_CENTRAL_WEST', name: 'Jaipur-Gwalior Interchange', x: 380, y: 310 },
  { id: 'J_GUJ_MAH', name: 'Gujarat-Konkan Interchange', x: 250, y: 425 },
  { id: 'J_GANGA_BRIDGE', name: 'Ganga Bridge Overpass', x: 885, y: 395 },
  { id: 'J_BRAHMAPUTRA', name: 'Siliguri-Brahmaputra Bridge', x: 1045, y: 345 },
  { id: 'J_EAST_CORRIDOR', name: 'Northeast Express Hub', x: 1205, y: 310 },
  { id: 'J_SURMA_VALLEY', name: 'Surma Valley Junction', x: 1235, y: 455 },
  { id: 'J_MP_CHHATTIS', name: 'Vindhya Interstate Junction', x: 705, y: 420 },
  { id: 'J_DELTA_BRIDGE', name: 'Mahanadi-Bay Bridge', x: 955, y: 530 },
  { id: 'J_DECCAN_CENTRAL', name: 'Deccan Plateau Hub', x: 425, y: 580 },
  { id: 'J_EASTERN_GHATS', name: 'Eastern Ghats Junction', x: 730, y: 570 },
  { id: 'J_KRISHNA_BASIN', name: 'Krishna-Godavari Interchange', x: 650, y: 680 },
  { id: 'J_KONKAN_SOUTH', name: 'Goa Coastal Interchange', x: 225, y: 640 },
  { id: 'J_CAUVERY_SOUTH', name: 'Cauvery River Interchange', x: 485, y: 745 },
  { id: 'J_COROMANDEL', name: 'Coromandel Express Junction', x: 680, y: 750 },
];

/**
 * Helper to interpolate smooth curve points between endpoints
 */
function createCurve(start: [number, number], ctrl: [number, number], end: [number, number], segments = 10): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const x = mt * mt * start[0] + 2 * mt * t * ctrl[0] + t * t * end[0];
    const y = mt * mt * start[1] + 2 * mt * t * ctrl[1] + t * t * end[1];
    pts.push([Math.round(x), Math.round(y)]);
  }
  return pts;
}

/**
 * Highway Segments directly tracing the elevated roadways in the graphic
 */
export const INDIA_ROAD_SEGMENTS: IndiaRoadSegment[] = [
  // 1. Jammu & Kashmir <-> J_NW
  {
    id: 'JK-J_NW',
    name: 'NH-44 North Jammu Highway',
    from: 'JK',
    to: 'J_NW',
    distanceKm: 280,
    baseDurationMinutes: 240,
    waypoints: createCurve([172, 48], [230, 85], [295, 130]),
  },
  // 2. Himachal Pradesh <-> J_NW
  {
    id: 'HP-J_NW',
    name: 'NH-154 Kangra Valley Road',
    from: 'HP',
    to: 'J_NW',
    distanceKm: 210,
    baseDurationMinutes: 190,
    waypoints: createCurve([468, 50], [380, 85], [295, 130]),
  },
  // 3. J_NW <-> Punjab
  {
    id: 'J_NW-PB',
    name: 'GT Road Punjab Corridor',
    from: 'J_NW',
    to: 'PB',
    distanceKm: 140,
    baseDurationMinutes: 110,
    waypoints: createCurve([295, 130], [320, 145], [352, 165]),
  },
  // 4. Himachal Pradesh <-> J_NORTH
  {
    id: 'HP-J_NORTH',
    name: 'NH-5 Shimla-Doon Highway',
    from: 'HP',
    to: 'J_NORTH',
    distanceKm: 220,
    baseDurationMinutes: 180,
    waypoints: createCurve([468, 50], [510, 100], [550, 155]),
  },
  // 5. J_NORTH <-> Uttarakhand
  {
    id: 'J_NORTH-UK',
    name: 'NH-7 Dehradun-Haridwar Route',
    from: 'J_NORTH',
    to: 'UK',
    distanceKm: 190,
    baseDurationMinutes: 160,
    waypoints: createCurve([550, 155], [630, 148], [718, 148]),
  },
  // 6. J_NORTH <-> Delhi
  {
    id: 'J_NORTH-DL',
    name: 'NH-44 North Delhi Entryway',
    from: 'J_NORTH',
    to: 'DL',
    distanceKm: 180,
    baseDurationMinutes: 130,
    waypoints: createCurve([550, 155], [590, 205], [626, 265]),
  },
  // 7. Punjab <-> J_WEST_IN
  {
    id: 'PB-J_WEST_IN',
    name: 'NH-54 Malwa Highway',
    from: 'PB',
    to: 'J_WEST_IN',
    distanceKm: 120,
    baseDurationMinutes: 90,
    waypoints: createCurve([352, 165], [370, 185], [395, 210]),
  },
  // 8. J_WEST_IN <-> Haryana
  {
    id: 'J_WEST_IN-HR',
    name: 'Hisar-Rohtak Link',
    from: 'J_WEST_IN',
    to: 'HR',
    distanceKm: 130,
    baseDurationMinutes: 100,
    waypoints: createCurve([395, 210], [430, 220], [465, 236]),
  },
  // 9. J_WEST_IN <-> Rajasthan
  {
    id: 'J_WEST_IN-RJ',
    name: 'Thar Desert Expressway',
    from: 'J_WEST_IN',
    to: 'RJ',
    distanceKm: 290,
    baseDurationMinutes: 220,
    waypoints: createCurve([395, 210], [300, 250], [205, 295]),
  },
  // 10. Haryana <-> Delhi
  {
    id: 'HR-DL',
    name: 'Delhi-NCR Peripheral Ring',
    from: 'HR',
    to: 'DL',
    distanceKm: 85,
    baseDurationMinutes: 60,
    waypoints: createCurve([465, 236], [545, 250], [626, 265]),
  },
  // 11. Delhi <-> Uttar Pradesh
  {
    id: 'DL-UP',
    name: 'Yamuna Expressway (DL-UP)',
    from: 'DL',
    to: 'UP',
    distanceKm: 210,
    baseDurationMinutes: 140,
    waypoints: createCurve([626, 265], [690, 295], [760, 326]),
  },
  // 12. Delhi <-> J_CENTRAL_WEST
  {
    id: 'DL-J_CENTRAL_WEST',
    name: 'Delhi-Mumbai Expressway Spur',
    from: 'DL',
    to: 'J_CENTRAL_WEST',
    distanceKm: 260,
    baseDurationMinutes: 190,
    waypoints: createCurve([626, 265], [500, 290], [380, 310]),
  },
  // 13. Rajasthan <-> J_CENTRAL_WEST
  {
    id: 'RJ-J_CENTRAL_WEST',
    name: 'Jaipur-Ajmer Highway',
    from: 'RJ',
    to: 'J_CENTRAL_WEST',
    distanceKm: 220,
    baseDurationMinutes: 170,
    waypoints: createCurve([205, 295], [290, 305], [380, 310]),
  },
  // 14. Rajasthan <-> Gujarat
  {
    id: 'RJ-GJ',
    name: 'NH-62 Marwar-Sabarmati Highway',
    from: 'RJ',
    to: 'GJ',
    distanceKm: 310,
    baseDurationMinutes: 240,
    waypoints: createCurve([205, 295], [180, 370], [165, 450]),
  },
  // 15. J_CENTRAL_WEST <-> Madhya Pradesh
  {
    id: 'J_CENTRAL_WEST-MP',
    name: 'Chambal-Malwa Expressway',
    from: 'J_CENTRAL_WEST',
    to: 'MP',
    distanceKm: 240,
    baseDurationMinutes: 180,
    waypoints: createCurve([380, 310], [420, 370], [466, 434]),
  },
  // 16. Gujarat <-> J_GUJ_MAH
  {
    id: 'GJ-J_GUJ_MAH',
    name: 'Surat-Navsari Highway',
    from: 'GJ',
    to: 'J_GUJ_MAH',
    distanceKm: 140,
    baseDurationMinutes: 100,
    waypoints: createCurve([165, 450], [210, 435], [250, 425]),
  },
  // 17. J_GUJ_MAH <-> Madhya Pradesh
  {
    id: 'J_GUJ_MAH-MP',
    name: 'Narmada Valley Interstate Highway',
    from: 'J_GUJ_MAH',
    to: 'MP',
    distanceKm: 280,
    baseDurationMinutes: 220,
    waypoints: createCurve([250, 425], [360, 430], [466, 434]),
  },
  // 18. J_GUJ_MAH <-> Maharashtra
  {
    id: 'J_GUJ_MAH-MH',
    name: 'Western Ghats Mumbai Expressway',
    from: 'J_GUJ_MAH',
    to: 'MH',
    distanceKm: 230,
    baseDurationMinutes: 170,
    waypoints: createCurve([250, 425], [240, 510], [234, 596]),
  },
  // 19. Uttarakhand <-> J_UK_NE
  {
    id: 'UK-J_UK_NE',
    name: 'NH-9 Kumaon Foothills Road',
    from: 'UK',
    to: 'J_UK_NE',
    distanceKm: 200,
    baseDurationMinutes: 170,
    waypoints: createCurve([718, 148], [775, 180], [835, 220]),
  },
  // 20. J_UK_NE <-> Sikkim
  {
    id: 'J_UK_NE-SK',
    name: 'Himalayan Ridge Highway',
    from: 'J_UK_NE',
    to: 'SK',
    distanceKm: 290,
    baseDurationMinutes: 260,
    waypoints: createCurve([835, 220], [910, 190], [990, 162]),
  },
  // 21. J_UK_NE <-> Uttar Pradesh
  {
    id: 'J_UK_NE-UP',
    name: 'Bareilly-Lucknow Connection',
    from: 'J_UK_NE',
    to: 'UP',
    distanceKm: 180,
    baseDurationMinutes: 140,
    waypoints: createCurve([835, 220], [800, 270], [760, 326]),
  },
  // 22. Uttar Pradesh <-> J_MP_CHHATTIS
  {
    id: 'UP-J_MP_CHHATTIS',
    name: 'Bundelkhand Expressway Link',
    from: 'UP',
    to: 'J_MP_CHHATTIS',
    distanceKm: 190,
    baseDurationMinutes: 150,
    waypoints: createCurve([760, 326], [730, 370], [705, 420]),
  },
  // 23. J_MP_CHHATTIS <-> Madhya Pradesh
  {
    id: 'J_MP_CHHATTIS-MP',
    name: 'Vindhya Express Corridor',
    from: 'J_MP_CHHATTIS',
    to: 'MP',
    distanceKm: 270,
    baseDurationMinutes: 210,
    waypoints: createCurve([705, 420], [580, 425], [466, 434]),
  },
  // 24. J_MP_CHHATTIS <-> Chhattisgarh
  {
    id: 'J_MP_CHHATTIS-CG',
    name: 'Mahanadi Basin Highway',
    from: 'J_MP_CHHATTIS',
    to: 'CG',
    distanceKm: 160,
    baseDurationMinutes: 120,
    waypoints: createCurve([705, 420], [675, 460], [651, 504]),
  },
  // 25. Uttar Pradesh <-> J_GANGA_BRIDGE
  {
    id: 'UP-J_GANGA_BRIDGE',
    name: 'Purvanchal Expressway (UP-Bridge)',
    from: 'UP',
    to: 'J_GANGA_BRIDGE',
    distanceKm: 220,
    baseDurationMinutes: 160,
    isBridge: true,
    waypoints: createCurve([760, 326], [820, 360], [885, 395]),
  },
  // 26. J_GANGA_BRIDGE <-> Bihar
  {
    id: 'J_GANGA_BRIDGE-BR',
    name: 'Mahatma Gandhi Setu Highway',
    from: 'J_GANGA_BRIDGE',
    to: 'BR',
    distanceKm: 130,
    baseDurationMinutes: 100,
    isBridge: true,
    waypoints: createCurve([885, 395], [925, 380], [962, 370]),
  },
  // 27. J_GANGA_BRIDGE <-> Jharkhand
  {
    id: 'J_GANGA_BRIDGE-JH',
    name: 'Grand Trunk Ranchi Road',
    from: 'J_GANGA_BRIDGE',
    to: 'JH',
    distanceKm: 150,
    baseDurationMinutes: 115,
    waypoints: createCurve([885, 395], [870, 440], [853, 480]),
  },
  // 28. Sikkim <-> J_BRAHMAPUTRA
  {
    id: 'SK-J_BRAHMAPUTRA',
    name: 'Teesta River Bridge Highway',
    from: 'SK',
    to: 'J_BRAHMAPUTRA',
    distanceKm: 260,
    baseDurationMinutes: 230,
    isBridge: true,
    waypoints: createCurve([990, 162], [1020, 250], [1045, 345]),
  },
  // 29. Bihar <-> J_BRAHMAPUTRA
  {
    id: 'BR-J_BRAHMAPUTRA',
    name: 'Siliguri Corridor Superhighway',
    from: 'BR',
    to: 'J_BRAHMAPUTRA',
    distanceKm: 170,
    baseDurationMinutes: 130,
    waypoints: createCurve([962, 370], [1000, 360], [1045, 345]),
  },
  // 30. J_BRAHMAPUTRA <-> Assam
  {
    id: 'J_BRAHMAPUTRA-AS',
    name: 'Saraighat Brahmaputra Bridge Express',
    from: 'J_BRAHMAPUTRA',
    to: 'AS',
    distanceKm: 140,
    baseDurationMinutes: 105,
    isBridge: true,
    waypoints: createCurve([1045, 345], [1075, 310], [1104, 272]),
  },
  // 31. J_BRAHMAPUTRA <-> Meghalaya
  {
    id: 'J_BRAHMAPUTRA-ML',
    name: 'Shillong Plateau Highway',
    from: 'J_BRAHMAPUTRA',
    to: 'ML',
    distanceKm: 150,
    baseDurationMinutes: 120,
    waypoints: createCurve([1045, 345], [1085, 375], [1128, 402]),
  },
  // 32. Assam <-> Arunachal Pradesh
  {
    id: 'AS-AR',
    name: 'Bogibeel Trans-Arunachal Highway',
    from: 'AS',
    to: 'AR',
    distanceKm: 260,
    baseDurationMinutes: 220,
    isBridge: true,
    waypoints: createCurve([1104, 272], [1160, 180], [1218, 92]),
  },
  // 33. Assam <-> J_EAST_CORRIDOR
  {
    id: 'AS-J_EAST_CORRIDOR',
    name: 'Kaziranga-Jorhat Highway',
    from: 'AS',
    to: 'J_EAST_CORRIDOR',
    distanceKm: 150,
    baseDurationMinutes: 110,
    waypoints: createCurve([1104, 272], [1155, 290], [1205, 310]),
  },
  // 34. Arunachal Pradesh <-> Nagaland
  {
    id: 'AR-NL',
    name: 'Patkai Hills Border Highway',
    from: 'AR',
    to: 'NL',
    distanceKm: 240,
    baseDurationMinutes: 200,
    waypoints: createCurve([1218, 92], [1245, 180], [1270, 268]),
  },
  // 35. J_EAST_CORRIDOR <-> Nagaland
  {
    id: 'J_EAST_CORRIDOR-NL',
    name: 'Dimapur-Kohima Highway',
    from: 'J_EAST_CORRIDOR',
    to: 'NL',
    distanceKm: 120,
    baseDurationMinutes: 95,
    waypoints: createCurve([1205, 310], [1240, 290], [1270, 268]),
  },
  // 36. J_EAST_CORRIDOR <-> Manipur
  {
    id: 'J_EAST_CORRIDOR-MN',
    name: 'Imphal Valley Highway',
    from: 'J_EAST_CORRIDOR',
    to: 'MN',
    distanceKm: 160,
    baseDurationMinutes: 130,
    waypoints: createCurve([1205, 310], [1245, 345], [1282, 382]),
  },
  // 37. J_EAST_CORRIDOR <-> Meghalaya
  {
    id: 'J_EAST_CORRIDOR-ML',
    name: 'Barak Valley Interstate Link',
    from: 'J_EAST_CORRIDOR',
    to: 'ML',
    distanceKm: 170,
    baseDurationMinutes: 135,
    waypoints: createCurve([1205, 310], [1165, 355], [1128, 402]),
  },
  // 38. Manipur <-> J_SURMA_VALLEY
  {
    id: 'MN-J_SURMA_VALLEY',
    name: 'Loktak Lake Southern Link',
    from: 'MN',
    to: 'J_SURMA_VALLEY',
    distanceKm: 130,
    baseDurationMinutes: 110,
    waypoints: createCurve([1282, 382], [1260, 420], [1235, 455]),
  },
  // 39. J_SURMA_VALLEY <-> Mizoram
  {
    id: 'J_SURMA_VALLEY-MZ',
    name: 'Aizawl Mountain Expressway',
    from: 'J_SURMA_VALLEY',
    to: 'MZ',
    distanceKm: 120,
    baseDurationMinutes: 100,
    waypoints: createCurve([1235, 455], [1260, 470], [1280, 490]),
  },
  // 40. J_SURMA_VALLEY <-> Tripura
  {
    id: 'J_SURMA_VALLEY-TR',
    name: 'Agartala Highway',
    from: 'J_SURMA_VALLEY',
    to: 'TR',
    distanceKm: 140,
    baseDurationMinutes: 115,
    waypoints: createCurve([1235, 455], [1195, 480], [1158, 500]),
  },
  // 41. Meghalaya <-> Tripura
  {
    id: 'ML-TR',
    name: 'Garo Hills Southern Trunk',
    from: 'ML',
    to: 'TR',
    distanceKm: 180,
    baseDurationMinutes: 145,
    waypoints: createCurve([1128, 402], [1140, 450], [1158, 500]),
  },
  // 42. Tripura <-> West Bengal
  {
    id: 'TR-WB',
    name: 'Bay Delta Maritime Overpass',
    from: 'TR',
    to: 'WB',
    distanceKm: 280,
    baseDurationMinutes: 210,
    isBridge: true,
    waypoints: createCurve([1158, 500], [1110, 550], [1062, 598]),
  },
  // 43. Jharkhand <-> J_DELTA_BRIDGE
  {
    id: 'JH-J_DELTA_BRIDGE',
    name: 'Chota Nagpur Expressway',
    from: 'JH',
    to: 'J_DELTA_BRIDGE',
    distanceKm: 180,
    baseDurationMinutes: 135,
    waypoints: createCurve([853, 480], [905, 505], [955, 530]),
  },
  // 44. J_DELTA_BRIDGE <-> West Bengal
  {
    id: 'J_DELTA_BRIDGE-WB',
    name: 'Howrah-Kolkata Express Bridge',
    from: 'J_DELTA_BRIDGE',
    to: 'WB',
    distanceKm: 160,
    baseDurationMinutes: 120,
    isBridge: true,
    waypoints: createCurve([955, 530], [1010, 565], [1062, 598]),
  },
  // 45. J_DELTA_BRIDGE <-> Odisha
  {
    id: 'J_DELTA_BRIDGE-OD',
    name: 'Golden Triangle Coastal Highway',
    from: 'J_DELTA_BRIDGE',
    to: 'OD',
    distanceKm: 190,
    baseDurationMinutes: 145,
    waypoints: createCurve([955, 530], [885, 560], [814, 594]),
  },
  // 46. Chhattisgarh <-> J_EASTERN_GHATS
  {
    id: 'CG-J_EASTERN_GHATS',
    name: 'Bastar-Dandakaranya Highway',
    from: 'CG',
    to: 'J_EASTERN_GHATS',
    distanceKm: 170,
    baseDurationMinutes: 130,
    waypoints: createCurve([651, 504], [690, 535], [730, 570]),
  },
  // 47. J_EASTERN_GHATS <-> Odisha
  {
    id: 'J_EASTERN_GHATS-OD',
    name: 'Bhubaneswar-Cuttack Interstate Highway',
    from: 'J_EASTERN_GHATS',
    to: 'OD',
    distanceKm: 150,
    baseDurationMinutes: 110,
    waypoints: createCurve([730, 570], [770, 580], [814, 594]),
  },
  // 48. J_EASTERN_GHATS <-> Telangana
  {
    id: 'J_EASTERN_GHATS-TG',
    name: 'Warangal-Bhadradri Link',
    from: 'J_EASTERN_GHATS',
    to: 'TG',
    distanceKm: 210,
    baseDurationMinutes: 160,
    waypoints: createCurve([730, 570], [655, 625], [578, 678]),
  },
  // 49. Madhya Pradesh <-> J_DECCAN_CENTRAL
  {
    id: 'MP-J_DECCAN_CENTRAL',
    name: 'Nagpur North-South Corridor',
    from: 'MP',
    to: 'J_DECCAN_CENTRAL',
    distanceKm: 220,
    baseDurationMinutes: 165,
    waypoints: createCurve([466, 434], [445, 510], [425, 580]),
  },
  // 50. Maharashtra <-> J_DECCAN_CENTRAL
  {
    id: 'MH-J_DECCAN_CENTRAL',
    name: 'Samruddhi Mahamarg (MH-Deccan)',
    from: 'MH',
    to: 'J_DECCAN_CENTRAL',
    distanceKm: 210,
    baseDurationMinutes: 150,
    waypoints: createCurve([234, 596], [330, 588], [425, 580]),
  },
  // 51. J_DECCAN_CENTRAL <-> Telangana
  {
    id: 'J_DECCAN_CENTRAL-TG',
    name: 'Hyderabad Outer Ring Express',
    from: 'J_DECCAN_CENTRAL',
    to: 'TG',
    distanceKm: 200,
    baseDurationMinutes: 150,
    waypoints: createCurve([425, 580], [500, 630], [578, 678]),
  },
  // 52. Maharashtra <-> J_KONKAN_SOUTH
  {
    id: 'MH-J_KONKAN_SOUTH',
    name: 'Mumbai-Goa Coastal Superhighway',
    from: 'MH',
    to: 'J_KONKAN_SOUTH',
    distanceKm: 180,
    baseDurationMinutes: 140,
    waypoints: createCurve([234, 596], [230, 620], [225, 640]),
  },
  // 53. J_KONKAN_SOUTH <-> Goa
  {
    id: 'J_KONKAN_SOUTH-GA',
    name: 'Zuari River Express Bridge',
    from: 'J_KONKAN_SOUTH',
    to: 'GA',
    distanceKm: 110,
    baseDurationMinutes: 80,
    isBridge: true,
    waypoints: createCurve([225, 640], [200, 680], [180, 720]),
  },
  // 54. J_KONKAN_SOUTH <-> Karnataka
  {
    id: 'J_KONKAN_SOUTH-KA',
    name: 'Belagavi-Hubli Highway',
    from: 'J_KONKAN_SOUTH',
    to: 'KA',
    distanceKm: 210,
    baseDurationMinutes: 160,
    waypoints: createCurve([225, 640], [310, 690], [396, 740]),
  },
  // 55. Goa <-> Karnataka
  {
    id: 'GA-KA',
    name: 'Karwar Western Ghats Pass',
    from: 'GA',
    to: 'KA',
    distanceKm: 230,
    baseDurationMinutes: 180,
    waypoints: createCurve([180, 720], [290, 730], [396, 740]),
  },
  // 56. Telangana <-> J_KRISHNA_BASIN
  {
    id: 'TG-J_KRISHNA_BASIN',
    name: 'Hyderabad-Vijayawada Highway',
    from: 'TG',
    to: 'J_KRISHNA_BASIN',
    distanceKm: 140,
    baseDurationMinutes: 105,
    waypoints: createCurve([578, 678], [615, 680], [650, 680]),
  },
  // 57. Karnataka <-> J_KRISHNA_BASIN
  {
    id: 'KA-J_KRISHNA_BASIN',
    name: 'Bengaluru-Tirupati Express',
    from: 'KA',
    to: 'J_KRISHNA_BASIN',
    distanceKm: 270,
    baseDurationMinutes: 200,
    waypoints: createCurve([396, 740], [520, 710], [650, 680]),
  },
  // 58. J_KRISHNA_BASIN <-> Andhra Pradesh
  {
    id: 'J_KRISHNA_BASIN-AP',
    name: 'Amaravati-Guntur Capital Corridor',
    from: 'J_KRISHNA_BASIN',
    to: 'AP',
    distanceKm: 160,
    baseDurationMinutes: 115,
    waypoints: createCurve([650, 680], [700, 710], [754, 740]),
  },
  // 59. Odisha <-> Andhra Pradesh
  {
    id: 'OD-AP',
    name: 'Vizag Port Coastal Express',
    from: 'OD',
    to: 'AP',
    distanceKm: 260,
    baseDurationMinutes: 195,
    waypoints: createCurve([814, 594], [785, 670], [754, 740]),
  },
  // 60. Karnataka <-> J_CAUVERY_SOUTH
  {
    id: 'KA-J_CAUVERY_SOUTH',
    name: 'Mysuru-Nilgiris Highway',
    from: 'KA',
    to: 'J_CAUVERY_SOUTH',
    distanceKm: 150,
    baseDurationMinutes: 110,
    waypoints: createCurve([396, 740], [440, 742], [485, 745]),
  },
  // 61. J_CAUVERY_SOUTH <-> Kerala
  {
    id: 'J_CAUVERY_SOUTH-KL',
    name: 'Palakkad Gap Kerala Gateway',
    from: 'J_CAUVERY_SOUTH',
    to: 'KL',
    distanceKm: 180,
    baseDurationMinutes: 140,
    waypoints: createCurve([485, 745], [420, 710], [358, 674]),
  },
  // 62. J_CAUVERY_SOUTH <-> Tamil Nadu
  {
    id: 'J_CAUVERY_SOUTH-TN',
    name: 'Coimbatore-Salem Express',
    from: 'J_CAUVERY_SOUTH',
    to: 'TN',
    distanceKm: 170,
    baseDurationMinutes: 125,
    waypoints: createCurve([485, 745], [545, 710], [605, 672]),
  },
  // 63. Andhra Pradesh <-> J_COROMANDEL
  {
    id: 'AP-J_COROMANDEL',
    name: 'Nellore-Chennai Coastal Highway',
    from: 'AP',
    to: 'J_COROMANDEL',
    distanceKm: 130,
    baseDurationMinutes: 95,
    waypoints: createCurve([754, 740], [715, 745], [680, 750]),
  },
  // 64. J_COROMANDEL <-> Tamil Nadu
  {
    id: 'J_COROMANDEL-TN',
    name: 'Grand Southern Trunk Road',
    from: 'J_COROMANDEL',
    to: 'TN',
    distanceKm: 150,
    baseDurationMinutes: 110,
    waypoints: createCurve([680, 750], [640, 710], [605, 672]),
  },
  // 65. Kerala <-> Tamil Nadu
  {
    id: 'KL-TN',
    name: 'Kanyakumari Southern Tip Highway',
    from: 'KL',
    to: 'TN',
    distanceKm: 260,
    baseDurationMinutes: 200,
    waypoints: createCurve([358, 674], [480, 673], [605, 672]),
  },
];

/**
 * Adjacency graph builder for bidirectional pathfinding
 */
export interface AdjacencyEdge {
  targetId: string;
  road: IndiaRoadSegment;
  weight: number;
}

export function buildIndiaGraph(): Map<string, AdjacencyEdge[]> {
  const graph = new Map<string, AdjacencyEdge[]>();

  const allNodeIds = [
    ...INDIA_PLACE_NODES.map((n) => n.id),
    ...INDIA_JUNCTIONS.map((j) => j.id),
  ];
  allNodeIds.forEach((id) => graph.set(id, []));

  INDIA_ROAD_SEGMENTS.forEach((road) => {
    // Add forward
    const listFrom = graph.get(road.from) || [];
    listFrom.push({ targetId: road.to, road, weight: road.distanceKm });
    graph.set(road.from, listFrom);

    // Add reverse
    const listTo = graph.get(road.to) || [];
    listTo.push({ targetId: road.from, road, weight: road.distanceKm });
    graph.set(road.to, listTo);
  });

  return graph;
}

/**
 * Get node coordinates by ID (either place node or junction)
 */
export function getNodeCoords(id: string): { x: number; y: number; name: string } | null {
  const place = INDIA_PLACE_NODES.find((p) => p.id === id);
  if (place) return { x: place.x, y: place.y, name: place.name };
  const junc = INDIA_JUNCTIONS.find((j) => j.id === id);
  if (junc) return { x: junc.x, y: junc.y, name: junc.name };
  return null;
}

/**
 * Straight-line Euclidean distance heuristic h(n)
 */
function heuristicDistance(nodeAId: string, nodeBId: string): number {
  const a = getNodeCoords(nodeAId);
  const b = getNodeCoords(nodeBId);
  if (!a || !b) return 0;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  // Convert map pixel distance to approximate road km (roughly 1.3 km per pixel)
  return Math.sqrt(dx * dx + dy * dy) * 1.35;
}

/**
 * Dijkstra / A* Pathfinding along the map's authentic road network
 */
export function findOptimalIndiaRoute(
  sourceId: string,
  destId: string,
  blockedSegmentIds: string[] = []
): GraphRouteResult | null {
  if (sourceId === destId) return null;

  const graph = buildIndiaGraph();
  const blockedSet = new Set(blockedSegmentIds);

  const distances = new Map<string, number>();
  const previous = new Map<string, { prevNodeId: string; road: IndiaRoadSegment }>();
  const visited = new Set<string>();

  graph.forEach((_, nodeId) => {
    distances.set(nodeId, Infinity);
  });
  distances.set(sourceId, 0);

  // Priority queue / frontier
  const frontier: { id: string; fScore: number }[] = [{ id: sourceId, fScore: 0 }];

  while (frontier.length > 0) {
    // Pop lowest fScore
    frontier.sort((a, b) => a.fScore - b.fScore);
    const current = frontier.shift()!;

    if (current.id === destId) {
      break; // Reached goal!
    }

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const neighbors = graph.get(current.id) || [];
    const currentDist = distances.get(current.id) ?? Infinity;

    for (const edge of neighbors) {
      // If road is blocked by hazard, skip or assign huge penalty
      if (blockedSet.has(edge.road.id)) {
        continue;
      }

      const tentativeDist = currentDist + edge.weight;
      if (tentativeDist < (distances.get(edge.targetId) ?? Infinity)) {
        distances.set(edge.targetId, tentativeDist);
        previous.set(edge.targetId, { prevNodeId: current.id, road: edge.road });

        const h = heuristicDistance(edge.targetId, destId);
        frontier.push({ id: edge.targetId, fScore: tentativeDist + h });
      }
    }
  }

  // Reconstruct path
  if (!previous.has(destId) && sourceId !== destId) {
    // If blocked, try finding path ignoring block to report that it's blocked
    return null;
  }

  const pathNodes: string[] = [];
  const pathRoads: IndiaRoadSegment[] = [];

  let curr = destId;
  pathNodes.push(curr);

  while (curr !== sourceId) {
    const prevInfo = previous.get(curr);
    if (!prevInfo) break;
    pathRoads.unshift(prevInfo.road);
    curr = prevInfo.prevNodeId;
    pathNodes.unshift(curr);
  }

  // Filter only state place nodes for UI summary
  const stateNodesOnPath = pathNodes
    .map((id) => INDIA_PLACE_NODES.find((p) => p.id === id))
    .filter(Boolean) as IndiaPlaceNode[];

  // Build full polyline coordinate sequence
  const allPoints: [number, number][] = [];
  pathRoads.forEach((road, idx) => {
    const fromNode = pathNodes[idx];
    const isForward = road.from === fromNode;
    const pts = isForward ? road.waypoints : [...road.waypoints].reverse();

    pts.forEach((pt, pIdx) => {
      // Avoid duplicate consecutive points
      if (allPoints.length > 0 && pIdx === 0) return;
      allPoints.push(pt);
    });
  });

  const totalDistanceKm = pathRoads.reduce((sum, r) => sum + r.distanceKm, 0);
  const totalDurationMinutes = pathRoads.reduce((sum, r) => sum + r.baseDurationMinutes, 0);

  // Turn-by-turn navigation steps
  const steps = pathRoads.map((road, idx) => {
    const fromId = pathNodes[idx];
    const toId = pathNodes[idx + 1];
    const fromName = getNodeCoords(fromId)?.name || fromId;
    const toName = getNodeCoords(toId)?.name || toId;

    let instruction = `Drive along ${road.name} towards ${toName}`;
    if (road.isBridge) {
      instruction = `Cross ${road.name} overpass bridge into ${toName}`;
    }

    return {
      fromNode: fromId,
      toNode: toId,
      instruction,
      distanceKm: road.distanceKm,
      durationMinutes: road.baseDurationMinutes,
    };
  });

  return {
    nodeIds: pathNodes,
    nodes: stateNodesOnPath,
    segments: pathRoads,
    totalDistanceKm,
    totalDurationMinutes,
    allPoints,
    steps,
  };
}

/**
 * Find up to 3 candidate routes (Optimal + Alternatives)
 */
export function findMultipleIndiaRoutes(
  sourceId: string,
  destId: string,
  blockedSegmentIds: string[] = []
): {
  optimalRoute: GraphRouteResult | null;
  alternatives: GraphRouteResult[];
} {
  // 1. Primary Optimal
  const primary = findOptimalIndiaRoute(sourceId, destId, blockedSegmentIds);
  if (!primary) {
    return { optimalRoute: null, alternatives: [] };
  }

  const alternatives: GraphRouteResult[] = [];

  // 2. Compute 1st Alternative by temporarily blocking the most critical road in primary
  if (primary.segments.length > 0) {
    const midIdx = Math.floor(primary.segments.length / 2);
    const roadToExclude = primary.segments[midIdx].id;
    const alt1 = findOptimalIndiaRoute(sourceId, destId, [...blockedSegmentIds, roadToExclude]);
    if (alt1 && alt1.totalDistanceKm !== primary.totalDistanceKm) {
      alternatives.push(alt1);
    }
  }

  // 3. Compute 2nd Alternative
  if (primary.segments.length > 1) {
    const roadToExclude = primary.segments[0].id;
    const alt2 = findOptimalIndiaRoute(sourceId, destId, [...blockedSegmentIds, roadToExclude]);
    if (
      alt2 &&
      alt2.totalDistanceKm !== primary.totalDistanceKm &&
      !alternatives.some((a) => a.totalDistanceKm === alt2.totalDistanceKm)
    ) {
      alternatives.push(alt2);
    }
  }

  return {
    optimalRoute: primary,
    alternatives,
  };
}

/**
 * Recommended Presets for 1-Click Showcase
 */
export const POPULAR_ROUTE_PRESETS = [
  {
    name: 'Delhi ➔ West Bengal',
    hindi: 'दिल्ली ➔ पश्चिम बंगाल',
    source: 'DL',
    destination: 'WB',
    desc: 'Golden Ganga Express Corridor',
  },
  {
    name: 'Punjab ➔ Tamil Nadu',
    hindi: 'पंजाब ➔ तमिलनाडु',
    source: 'PB',
    destination: 'TN',
    desc: 'Grand North-South Highway',
  },
  {
    name: 'Gujarat ➔ Assam',
    hindi: 'गुजरात ➔ असम',
    source: 'GJ',
    destination: 'AS',
    desc: 'East-West Trans-India Arterial',
  },
  {
    name: 'Jammu & Kashmir ➔ Kerala',
    hindi: 'जम्मू और कश्मीर ➔ केरल',
    source: 'JK',
    destination: 'KL',
    desc: 'Crown to Coast Scenic Expressway',
  },
  {
    name: 'Maharashtra ➔ Delhi',
    hindi: 'महाराष्ट्र ➔ दिल्ली',
    source: 'MH',
    destination: 'DL',
    desc: 'Western Commercial Freight Corridor',
  },
  {
    name: 'Rajasthan ➔ Odisha',
    hindi: 'राजस्थान ➔ ओडिशा',
    source: 'RJ',
    destination: 'OD',
    desc: 'Desert to Eastern Sea Highway',
  },
];
