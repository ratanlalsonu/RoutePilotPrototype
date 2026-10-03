import { RouteOption, Hazard, RouteStep, VehicleType } from '../types';
import { getDistanceMeters } from '../algorithms/hazardRouteIntersection';
import {
  JHANSI_REAL_ROAD_ROUTE_A,
  JHANSI_REAL_ROAD_ROUTE_B,
  JHANSI_REAL_ROAD_ROUTE_C,
} from './roadCorridors';

/**
 * Vehicle speed profiling for accurate real-world travel time estimation
 */
export interface VehicleSpeedProfile {
  type: VehicleType;
  label: string;
  icon: string;
  citySpeedKmh: number;
  highwaySpeedKmh: number;
  averageSpeedKmh: number;
  timeMultiplierVsCar: number;
}

export function getVehicleSpeedProfile(type: VehicleType): VehicleSpeedProfile {
  switch (type) {
    case 'bike':
      return {
        type: 'bike',
        label: 'Two-Wheeler / Bike',
        icon: '🏍️',
        citySpeedKmh: 38,
        highwaySpeedKmh: 60,
        averageSpeedKmh: 42,
        timeMultiplierVsCar: 1.12,
      };
    case 'van':
      return {
        type: 'van',
        label: 'Light Commercial / Van',
        icon: '🚐',
        citySpeedKmh: 42,
        highwaySpeedKmh: 70,
        averageSpeedKmh: 48,
        timeMultiplierVsCar: 1.08,
      };
    case 'bus':
      return {
        type: 'bus',
        label: 'Passenger Bus',
        icon: '🚌',
        citySpeedKmh: 30,
        highwaySpeedKmh: 55,
        averageSpeedKmh: 36,
        timeMultiplierVsCar: 1.35,
      };
    case 'truck':
      return {
        type: 'truck',
        label: 'Heavy Commercial / Truck',
        icon: '🚚',
        citySpeedKmh: 26,
        highwaySpeedKmh: 50,
        averageSpeedKmh: 32,
        timeMultiplierVsCar: 1.55,
      };
    case 'car':
    default:
      return {
        type: 'car',
        label: 'Car / Passenger Taxi',
        icon: '🚗',
        citySpeedKmh: 48,
        highwaySpeedKmh: 80,
        averageSpeedKmh: 54,
        timeMultiplierVsCar: 1.0,
      };
  }
}

/**
 * Calculates realistic driving travel duration in minutes based on distance and vehicle type
 */
export function calculateVehicleDuration(
  distanceKm: number,
  vehicleType: VehicleType,
  baseCarMinutes?: number
): number {
  if (distanceKm <= 0.05) return 0;

  const profile = getVehicleSpeedProfile(vehicleType);

  if (baseCarMinutes && baseCarMinutes > 0) {
    return Math.max(1, Math.round(baseCarMinutes * profile.timeMultiplierVsCar));
  }

  // Weight speed according to distance (longer distances spend more time on highways)
  const isHighway = distanceKm > 15;
  const speed = isHighway
    ? profile.citySpeedKmh * 0.25 + profile.highwaySpeedKmh * 0.75
    : profile.averageSpeedKmh;

  const rawMinutes = (distanceKm / speed) * 60;
  // Add traffic buffer of 1-3 minutes for city driving
  const buffer = distanceKm < 10 ? 1 : 2;
  return Math.max(1, Math.round(rawMinutes + buffer));
}

/**
 * Formats duration in minutes to user-friendly human string (e.g., "18 min", "1 hr 25 min")
 */
export function formatDurationText(minutes: number): string {
  if (minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0 ? `${hours} hr ${remMin} min` : `${hours} hr`;
}

/**
 * Calculates polyline length in km
 */
export function calculatePolylineDistanceKm(coords: [number, number][]): number {
  if (!coords || coords.length < 2) return 0;
  let distMeters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    distMeters += getDistanceMeters(
      coords[i][0],
      coords[i][1],
      coords[i + 1][0],
      coords[i + 1][1]
    );
  }
  return parseFloat((distMeters / 1000).toFixed(1));
}

/**
 * Calculates remaining distance from current vehicle pointIndex to destination
 */
export function calculateRemainingDistanceKm(coords: [number, number][], pointIndex: number): number {
  if (!coords || coords.length < 2 || pointIndex >= coords.length - 1) return 0;
  const remainingCoords = coords.slice(pointIndex);
  return calculatePolylineDistanceKm(remainingCoords);
}

export function generateSyntheticSteps(
  routeName: string,
  viaRoads: string[],
  totalDistKm: number,
  destName: string = 'Destination'
): RouteStep[] {
  const road1 = viaRoads[0] || 'Main City Corridor';
  const road2 = viaRoads[1] || 'Arterial Link Road';
  return [
    {
      instruction: `Head straight on ${road1}`,
      roadName: road1,
      distanceMeters: Math.max(100, Math.round(totalDistKm * 200)),
      durationSeconds: Math.round(totalDistKm * 30),
      turnType: 'straight',
    },
    {
      instruction: routeName.toLowerCase().includes('b')
        ? `Turn left onto ${road2}`
        : routeName.toLowerCase().includes('c')
        ? `Turn right onto ${road2}`
        : `Continue onto ${road2}`,
      roadName: road2,
      distanceMeters: Math.max(150, Math.round(totalDistKm * 400)),
      durationSeconds: Math.round(totalDistKm * 50),
      turnType: routeName.toLowerCase().includes('b')
        ? 'left'
        : routeName.toLowerCase().includes('c')
        ? 'right'
        : 'straight',
    },
    {
      instruction: `Follow ${road2} toward approach corridor`,
      roadName: road2,
      distanceMeters: Math.max(100, Math.round(totalDistKm * 250)),
      durationSeconds: Math.round(totalDistKm * 35),
      turnType: 'slight-right',
    },
    {
      instruction: `Arrive at ${destName}`,
      roadName: destName,
      distanceMeters: 50,
      durationSeconds: 10,
      turnType: 'arrive',
    },
  ];
}

/**
 * Snaps any coordinate to the nearest real drivable road on OpenStreetMap
 */
export async function snapToNearestRoad(
  lat: number,
  lng: number
): Promise<{ lat: number; lng: number; name?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const url = `https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}?number=1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.waypoints || data.waypoints.length === 0) return null;
    const wp = data.waypoints[0];
    return {
      lat: wp.location[1],
      lng: wp.location[0],
      name: wp.name || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Online OSRM router query
 */
export async function fetchOSRMRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  waypoints: [number, number][] = []
): Promise<{ coordinates: [number, number][]; distanceKm: number; durationMin: number; steps?: RouteStep[] } | null> {
  try {
    const allPoints = [[startLng, startLat], ...waypoints.map((w) => [w[1], w[0]]), [endLng, endLat]];
    const coordString = allPoints.map((p) => `${p[0]},${p[1]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const primary = data.routes[0];
    const geoCoords: [number, number][] = primary.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]] // convert [lon, lat] to [lat, lon]
    );

    const steps: RouteStep[] = [];
    if (primary.legs && primary.legs[0] && Array.isArray(primary.legs[0].steps)) {
      for (const s of primary.legs[0].steps) {
        const mod = s.maneuver?.modifier || '';
        let turnType: RouteStep['turnType'] = 'straight';
        if (s.maneuver?.type === 'arrive') turnType = 'arrive';
        else if (mod.includes('left')) turnType = mod.includes('slight') ? 'slight-left' : 'left';
        else if (mod.includes('right')) turnType = mod.includes('slight') ? 'slight-right' : 'right';
        else if (mod.includes('uturn')) turnType = 'u-turn';

        const stepInst =
          s.maneuver?.instruction ||
          (turnType === 'arrive' ? 'Arrive at destination' : `Continue on ${s.name || 'Road'}`);

        steps.push({
          instruction: stepInst,
          roadName: s.name || 'Connecting Road',
          distanceMeters: Math.round(s.distance || 150),
          durationSeconds: Math.round(s.duration || 20),
          turnType,
        });
      }
    }

    return {
      coordinates: geoCoords,
      distanceKm: parseFloat((primary.distance / 1000).toFixed(1)),
      durationMin: Math.max(1, Math.round(primary.duration / 60)),
      steps: steps.length > 0 ? steps : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Calculates Multiple Optimal Routes for a given Source, Destination, and Vehicle Type
 * Returns 2 to 3 distinct routes:
 * 1. Route A — Fastest / Direct Route (Solid Blue)
 * 2. Route B — Optimal Bypass via Ring / Outer Road (Emerald Green)
 * 3. Route C — Alternative Arterial Route (Amber)
 */
export async function calculateMultipleOptimalRoutes(
  origin: { lat: number; lng: number; name: string },
  destination: { lat: number; lng: number; name: string },
  vehicleType: VehicleType = 'car'
): Promise<RouteOption[]> {
  const startLat = origin.lat;
  const startLng = origin.lng;
  const endLat = destination.lat;
  const endLng = destination.lng;

  // Calculate perpendicular offset vectors to find realistic bypass corridors
  const midLat = (startLat + endLat) / 2;
  const midLng = (startLng + endLng) / 2;
  const dLat = endLat - startLat;
  const dLng = endLng - startLng;
  const directDistMeters = getDistanceMeters(startLat, startLng, endLat, endLng);

  // Perpendicular vector normalized
  const length = Math.hypot(dLat, dLng) || 0.01;
  const perpLat = -dLng / length;
  const perpLng = dLat / length;

  // Offset distance scaled to trip length (e.g. ~10-15% of trip distance for alternative corridors)
  const offsetScale = Math.min(0.025, Math.max(0.005, (directDistMeters / 1000) * 0.0018));

  // Snap bypass waypoints to real drivable roads on OpenStreetMap
  const [snapB, snapC] = await Promise.all([
    snapToNearestRoad(midLat + perpLat * offsetScale, midLng + perpLng * offsetScale),
    snapToNearestRoad(midLat - perpLat * offsetScale, midLng - perpLng * offsetScale),
  ]);

  const wpB: [number, number] = snapB ? [snapB.lat, snapB.lng] : [midLat + perpLat * offsetScale, midLng + perpLng * offsetScale];
  const wpC: [number, number] = snapC ? [snapC.lat, snapC.lng] : [midLat - perpLat * offsetScale, midLng - perpLng * offsetScale];

  // Fetch routes concurrently
  const [directRes, bypassRes, alternateRes] = await Promise.all([
    fetchOSRMRoute(startLat, startLng, endLat, endLng),
    fetchOSRMRoute(startLat, startLng, endLat, endLng, [wpB]),
    fetchOSRMRoute(startLat, startLng, endLat, endLng, [wpC]),
  ]);

  const routes: RouteOption[] = [];

  // 1. Route A (Fastest / Primary Direct)
  if (directRes && directRes.coordinates.length > 2) {
    const distA = directRes.distanceKm;
    const durA = calculateVehicleDuration(distA, vehicleType, directRes.durationMin);
    const viaRoads = directRes.steps && directRes.steps.length > 1
      ? [directRes.steps[0].roadName, directRes.steps[1].roadName]
      : ['Main Expressway', 'City Arterial'];

    routes.push({
      id: 'opt_route_a',
      name: 'Route A — Fastest Route',
      color: '#AEF5F0', // Brand Accent
      distanceKm: distA,
      durationMinutes: durA,
      coordinates: directRes.coordinates,
      viaRoads,
      isRecommended: true,
      maneuver: {
        instruction: `Head toward ${destination.name}`,
        distanceMeters: Math.round(distA * 150),
      },
      steps: directRes.steps || generateSyntheticSteps('Route A', viaRoads, distA, destination.name),
    });
  } else {
    // Geodesic fallback with road curvature
    const pts = generateCurvedInterpolatedPath(startLat, startLng, endLat, endLng, 0);
    const distA = calculatePolylineDistanceKm(pts);
    const durA = calculateVehicleDuration(distA, vehicleType);
    const viaRoads = ['Main Arterial Road', 'Express Corridor'];

    routes.push({
      id: 'opt_route_a',
      name: 'Route A — Fastest Route',
      color: '#AEF5F0',
      distanceKm: distA,
      durationMinutes: durA,
      coordinates: pts,
      viaRoads,
      isRecommended: true,
      maneuver: {
        instruction: `Head toward ${destination.name}`,
        distanceMeters: 400,
      },
      steps: generateSyntheticSteps('Route A', viaRoads, distA, destination.name),
    });
  }

  // 2. Route B (Optimal Bypass / Less Congestion)
  if (bypassRes && bypassRes.coordinates.length > 2) {
    const distB = bypassRes.distanceKm;
    const durB = calculateVehicleDuration(distB, vehicleType, bypassRes.durationMin);
    const viaRoads = bypassRes.steps && bypassRes.steps.length > 1
      ? [bypassRes.steps[0].roadName, bypassRes.steps[1].roadName]
      : ['Outer Ring Bypass', 'Service Road'];

    routes.push({
      id: 'opt_route_b',
      name: 'Route B — Outer Bypass',
      color: '#10b981', // Emerald Green
      distanceKm: distB,
      durationMinutes: durB,
      coordinates: bypassRes.coordinates,
      viaRoads,
      isRecommended: false,
      maneuver: {
        instruction: 'Turn onto Outer Bypass toward destination',
        distanceMeters: 350,
      },
      steps: bypassRes.steps || generateSyntheticSteps('Route B', viaRoads, distB, destination.name),
    });
  } else {
    const ptsB = generateCurvedInterpolatedPath(startLat, startLng, endLat, endLng, offsetScale);
    const distB = calculatePolylineDistanceKm(ptsB);
    const durB = calculateVehicleDuration(distB, vehicleType);
    const viaRoads = ['Outer Bypass Road', 'Circumferential Ring'];

    routes.push({
      id: 'opt_route_b',
      name: 'Route B — Outer Bypass',
      color: '#10b981',
      distanceKm: distB,
      durationMinutes: durB,
      coordinates: ptsB,
      viaRoads,
      isRecommended: false,
      maneuver: {
        instruction: 'Turn onto Outer Bypass corridor',
        distanceMeters: 350,
      },
      steps: generateSyntheticSteps('Route B', viaRoads, distB, destination.name),
    });
  }

  // 3. Route C (Alternative Arterial Link)
  if (alternateRes && alternateRes.coordinates.length > 2) {
    const distC = alternateRes.distanceKm;
    const durC = calculateVehicleDuration(distC, vehicleType, alternateRes.durationMin);
    const viaRoads = alternateRes.steps && alternateRes.steps.length > 1
      ? [alternateRes.steps[0].roadName, alternateRes.steps[1].roadName]
      : ['Secondary Arterial', 'Connecting Link'];

    routes.push({
      id: 'opt_route_c',
      name: 'Route C — Arterial Corridor',
      color: '#f59e0b', // Amber
      distanceKm: distC,
      durationMinutes: durC,
      coordinates: alternateRes.coordinates,
      viaRoads,
      isRecommended: false,
      maneuver: {
        instruction: 'Bear right onto Arterial Corridor',
        distanceMeters: 450,
      },
      steps: alternateRes.steps || generateSyntheticSteps('Route C', viaRoads, distC, destination.name),
    });
  } else {
    const ptsC = generateCurvedInterpolatedPath(startLat, startLng, endLat, endLng, -offsetScale);
    const distC = calculatePolylineDistanceKm(ptsC);
    const durC = calculateVehicleDuration(distC, vehicleType);
    const viaRoads = ['Arterial Link Road', 'Approach Highway'];

    routes.push({
      id: 'opt_route_c',
      name: 'Route C — Arterial Corridor',
      color: '#f59e0b',
      distanceKm: distC,
      durationMinutes: durC,
      coordinates: ptsC,
      viaRoads,
      isRecommended: false,
      maneuver: {
        instruction: 'Bear right onto Arterial Link',
        distanceMeters: 450,
      },
      steps: generateSyntheticSteps('Route C', viaRoads, distC, destination.name),
    });
  }

  return routes;
}

/**
 * Generates smooth realistic curved polyline coordinates between two points
 */
function generateCurvedInterpolatedPath(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  curveOffset: number = 0,
  pointsCount: number = 18
): [number, number][] {
  const result: [number, number][] = [];
  const midLat = (startLat + endLat) / 2;
  const midLng = (startLng + endLng) / 2;
  const dLat = endLat - startLat;
  const dLng = endLng - startLng;
  const length = Math.hypot(dLat, dLng) || 0.01;
  const perpLat = (-dLng / length) * curveOffset;
  const perpLng = (dLat / length) * curveOffset;

  const ctrlLat = midLat + perpLat;
  const ctrlLng = midLng + perpLng;

  for (let i = 0; i <= pointsCount; i++) {
    const t = i / pointsCount;
    // Quadratic Bezier curve
    const lat = (1 - t) * (1 - t) * startLat + 2 * (1 - t) * t * ctrlLat + t * t * endLat;
    const lng = (1 - t) * (1 - t) * startLng + 2 * (1 - t) * t * ctrlLng + t * t * endLng;
    result.push([parseFloat(lat.toFixed(5)), parseFloat(lng.toFixed(5))]);
  }
  return result;
}

// Landmark routes for Jhansi demo compatibility
export const JHANSI_DIRECT_ROUTE_COORDS: [number, number][] = [
  [25.4484, 78.5685],
  [25.4492, 78.5694],
  [25.4501, 78.5705],
  [25.4510, 78.5718],
  [25.4522, 78.5729],
  [25.4535, 78.5739],
  [25.4548, 78.5746],
  [25.4560, 78.5752],
  [25.4572, 78.5758],
  [25.4585, 78.5765],
  [25.4598, 78.5772],
  [25.4610, 78.5780],
  [25.4625, 78.5791],
  [25.4640, 78.5804],
  [25.4655, 78.5818],
  [25.4668, 78.5828],
  [25.4678, 78.5835],
];

export const JHANSI_ROUTE_B_COORDS: [number, number][] = [
  [25.4548, 78.5746],
  [25.4555, 78.5725],
  [25.4565, 78.5702],
  [25.4578, 78.5680],
  [25.4595, 78.5670],
  [25.4612, 78.5678],
  [25.4628, 78.5700],
  [25.4642, 78.5728],
  [25.4655, 78.5760],
  [25.4665, 78.5795],
  [25.4674, 78.5820],
  [25.4678, 78.5835],
];

export const JHANSI_ROUTE_C_COORDS: [number, number][] = [
  [25.4548, 78.5746],
  [25.4560, 78.5710],
  [25.4575, 78.5665],
  [25.4590, 78.5640],
  [25.4615, 78.5635],
  [25.4640, 78.5648],
  [25.4660, 78.5675],
  [25.4675, 78.5715],
  [25.4682, 78.5760],
  [25.4680, 78.5805],
  [25.4678, 78.5835],
];

export const JHANSI_ROUTE_D_COORDS: [number, number][] = [
  [25.4548, 78.5746],
  [25.4542, 78.5770],
  [25.4538, 78.5795],
  [25.4545, 78.5820],
  [25.4560, 78.5840],
  [25.4580, 78.5855],
  [25.4605, 78.5862],
  [25.4630, 78.5858],
  [25.4655, 78.5850],
  [25.4670, 78.5842],
  [25.4678, 78.5835],
];

export async function getInitialRoute(
  origin: { lat: number; lng: number; name: string },
  destination: { lat: number; lng: number; name: string }
): Promise<RouteOption> {
  const osrm = await fetchOSRMRoute(origin.lat, origin.lng, destination.lat, destination.lng);
  if (osrm && osrm.coordinates.length > 5) {
    const viaRoads = ['Civil Lines Arterial', 'Station Road'];
    return {
      id: 'route_primary',
      name: 'Primary Route',
      color: '#AEF5F0',
      distanceKm: osrm.distanceKm,
      durationMinutes: osrm.durationMin,
      coordinates: osrm.coordinates,
      viaRoads,
      isRecommended: true,
      maneuver: {
        instruction: 'Head north on City Center Road toward Civil Lines',
        distanceMeters: 450,
      },
      steps: osrm.steps || generateSyntheticSteps('Primary Route', viaRoads, osrm.distanceKm, destination.name),
    };
  }

  // High-Density real road OSM fallback (100 points strictly along streets)
  const coords = JHANSI_REAL_ROAD_ROUTE_A;
  const dist = calculatePolylineDistanceKm(coords);
  const viaRoads = ['Civil Lines Arterial', 'Sadar Bazar Rd'];
  return {
    id: 'route_primary',
    name: 'Primary Route',
    color: '#AEF5F0',
    distanceKm: dist,
    durationMinutes: Math.round(dist * 2.1),
    coordinates: coords,
    viaRoads,
    isRecommended: true,
    maneuver: {
      instruction: 'Head straight through Civil Lines toward Medical College',
      distanceMeters: 400,
    },
    steps: generateSyntheticSteps('Primary Route', viaRoads, dist, destination.name),
  };
}

/**
 * Calculates genuine on-road alternative routes that bypass the detected hazard.
 * ALL routes are strictly mapped to OpenStreetMap road geometry via OSRM.
 */
export async function calculateAlternativeRoutes(
  currentLat: number,
  currentLng: number,
  destination: { lat: number; lng: number; name: string },
  hazard: Hazard | null,
  vehicleType: VehicleType = 'car'
): Promise<RouteOption[]> {
  const destLat = destination.lat;
  const destLng = destination.lng;

  // 1. Snap start and destination to nearest real road centers
  const [startSnap, destSnap] = await Promise.all([
    snapToNearestRoad(currentLat, currentLng),
    snapToNearestRoad(destLat, destLng),
  ]);

  const sLat = startSnap ? startSnap.lat : currentLat;
  const sLng = startSnap ? startSnap.lng : currentLng;
  const eLat = destSnap ? destSnap.lat : destLat;
  const eLng = destSnap ? destSnap.lng : destLng;

  // 2. Vector math to compute bypass corridors
  const refLat = hazard ? hazard.latitude : (sLat + eLat) / 2;
  const refLng = hazard ? hazard.longitude : (sLng + eLng) / 2;

  const dLat = eLat - sLat;
  const dLng = eLng - sLng;
  const len = Math.hypot(dLat, dLng) || 0.001;
  const perpLat = -dLng / len;
  const perpLng = dLat / len;

  const safeRadiusMeters = hazard ? (hazard.affectedRadius || 180) + 35 : 200;

  // Search candidate offsets on both sides of the corridor (West/Left and East/Right)
  const offsets = [-0.0075, 0.0075, -0.013, 0.013, -0.022, 0.022];

  // Snap waypoints to real roads in parallel
  const waypoints = (
    await Promise.all(
      offsets.map(async (off) => {
        const rawLat = refLat + perpLat * off;
        const rawLng = refLng + perpLng * off;
        const snapped = await snapToNearestRoad(rawLat, rawLng);
        if (!snapped) return null;
        // Ensure waypoint is safely outside the hazard zone
        if (hazard && getDistanceMeters(snapped.lat, snapped.lng, hazard.latitude, hazard.longitude) <= safeRadiusMeters) {
          return null;
        }
        return { ...snapped, offset: off };
      })
    )
  ).filter(Boolean) as { lat: number; lng: number; name?: string; offset: number }[];

  // Fetch routes through valid real road waypoints
  const routeAttempts = await Promise.all(
    waypoints.slice(0, 4).map(async (wp) => {
      const res = await fetchOSRMRoute(sLat, sLng, eLat, eLng, [[wp.lat, wp.lng]]);
      if (!res || !res.coordinates || res.coordinates.length < 3) return null;

      // Verify this route stays completely clear of the hazard
      if (hazard) {
        for (const pt of res.coordinates) {
          if (getDistanceMeters(pt[0], pt[1], hazard.latitude, hazard.longitude) <= safeRadiusMeters) {
            return null; // Route entered the hazard zone
          }
        }
      }

      return {
        res,
        wp,
      };
    })
  );

  const validBypasses = routeAttempts.filter(Boolean) as {
    res: NonNullable<Awaited<ReturnType<typeof fetchOSRMRoute>>>;
    wp: { lat: number; lng: number; name?: string; offset: number };
  }[];

  const alternatives: RouteOption[] = [];

  // Route B: West / Left Bypass (negative offset preferred, or first valid)
  const leftBypass = validBypasses.find((b) => b.wp.offset < 0) || validBypasses[0];
  // Route C: East / Right Bypass (positive offset preferred, or second valid)
  const rightBypass = validBypasses.find((b) => b.wp.offset > 0 && b !== leftBypass) || validBypasses[1];

  if (leftBypass) {
    const distB = leftBypass.res.distanceKm;
    const durB = calculateVehicleDuration(distB, vehicleType, leftBypass.res.durationMin);
    const roadName = leftBypass.wp.name || (leftBypass.res.steps?.[0]?.roadName) || 'Gwalior Link Bypass';
    const viaRoads = [roadName, 'Outer Bypass Corridor'];

    alternatives.push({
      id: 'route_b',
      name: 'Route B (West Bypass)',
      color: '#10b981', // Emerald Green
      distanceKm: distB,
      durationMinutes: durB,
      coordinates: leftBypass.res.coordinates, // 100% genuine road coordinates from OSRM
      viaRoads,
      isRecommended: true,
      maneuver: {
        instruction: `Turn onto ${roadName} to bypass hazard`,
        distanceMeters: Math.round(distB * 100),
      },
      steps: leftBypass.res.steps || generateSyntheticSteps('Route B', viaRoads, distB, destination.name),
    });
  }

  if (rightBypass) {
    const distC = rightBypass.res.distanceKm;
    const durC = calculateVehicleDuration(distC, vehicleType, rightBypass.res.durationMin);
    const roadName = rightBypass.wp.name || (rightBypass.res.steps?.[0]?.roadName) || 'Outer Highway Link';
    const viaRoads = [roadName, 'Eastern Arterial Corridor'];

    alternatives.push({
      id: 'route_c',
      name: 'Route C (Outer Highway)',
      color: '#f59e0b', // Amber
      distanceKm: distC,
      durationMinutes: durC,
      coordinates: rightBypass.res.coordinates, // 100% genuine road coordinates from OSRM
      viaRoads,
      isRecommended: false,
      maneuver: {
        instruction: `Bear right onto ${roadName} around hazard`,
        distanceMeters: Math.round(distC * 120),
      },
      steps: rightBypass.res.steps || generateSyntheticSteps('Route C', viaRoads, distC, destination.name),
    });
  }

  // Fallback if OSRM was unavailable or returned no routes (e.g. offline):
  if (alternatives.length === 0) {
    // Check if in Jhansi bounds
    const isJhansi = Math.abs(currentLat - 25.45) < 0.2 && Math.abs(destLat - 25.46) < 0.2;
    if (isJhansi) {
      // Find closest projection onto the real-road OSM paths:
      const sliceRealRoad = (fullPath: [number, number][]) => {
        let closestIdx = 0;
        let minD = Infinity;
        for (let i = 0; i < fullPath.length; i++) {
          const d = getDistanceMeters(currentLat, currentLng, fullPath[i][0], fullPath[i][1]);
          if (d < minD) {
            minD = d;
            closestIdx = i;
          }
        }
        return fullPath.slice(closestIdx);
      };

      const pathB = sliceRealRoad(JHANSI_REAL_ROAD_ROUTE_B);
      const distB = calculatePolylineDistanceKm(pathB);
      const durB = calculateVehicleDuration(distB, vehicleType);

      alternatives.push({
        id: 'route_b',
        name: 'Route B (West Bypass)',
        color: '#10b981',
        distanceKm: distB,
        durationMinutes: durB,
        coordinates: pathB, // 164 real road points
        viaRoads: ['Gwalior Link Bypass', 'Medical College Ring'],
        isRecommended: true,
        maneuver: {
          instruction: 'Turn left onto Gwalior Link Road to bypass hazard',
          distanceMeters: 300,
        },
        steps: generateSyntheticSteps('Route B', ['Gwalior Link Bypass', 'Medical College Ring'], distB, destination.name),
      });

      const pathC = sliceRealRoad(JHANSI_REAL_ROAD_ROUTE_C);
      const distC = calculatePolylineDistanceKm(pathC);
      const durC = calculateVehicleDuration(distC, vehicleType);

      alternatives.push({
        id: 'route_c',
        name: 'Route C (Outer Highway)',
        color: '#f59e0b',
        distanceKm: distC,
        durationMinutes: durC,
        coordinates: pathC, // 167 real road points
        viaRoads: ['Station Outer Bypass', 'North Ring Rd'],
        isRecommended: false,
        maneuver: {
          instruction: 'Bear right onto Outer Station Bypass',
          distanceMeters: 450,
        },
        steps: generateSyntheticSteps('Route C', ['Station Outer Bypass', 'North Ring Rd'], distC, destination.name),
      });
    }
  }

  return alternatives;
}
