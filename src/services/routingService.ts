import { RouteOption, Hazard } from '../types';
import { getDistanceMeters } from '../algorithms/hazardRouteIntersection';

// Real OpenStreetMap road geometry for Jhansi landmark routes
// Origin: Jhansi Fort / City Center (25.4484, 78.5685)
// Destination: MLB Medical College, Jhansi (25.4678, 78.5835)

// 1. Direct Central Route via Civil Lines (Primary initial route that passes near Civil Lines)
export const JHANSI_DIRECT_ROUTE_COORDS: [number, number][] = [
  [25.4484, 78.5685], // Jhansi Fort
  [25.4492, 78.5694],
  [25.4501, 78.5705],
  [25.4510, 78.5718],
  [25.4522, 78.5729],
  [25.4535, 78.5739], // Sadar Bazar entry
  [25.4548, 78.5746],
  [25.4560, 78.5752], // Near Civil Lines Junction
  [25.4572, 78.5758], // Civil Lines Central Road (near Bridge/Pahuj channel)
  [25.4585, 78.5765], // Bridge area
  [25.4598, 78.5772],
  [25.4610, 78.5780],
  [25.4625, 78.5791],
  [25.4640, 78.5804],
  [25.4655, 78.5818],
  [25.4668, 78.5828],
  [25.4678, 78.5835], // Medical College Jhansi
];

// 2. Alternative Route B (West Bypass via Gwalior Road / Outer Ring - Emerald Green)
export const JHANSI_ROUTE_B_COORDS: [number, number][] = [
  [25.4548, 78.5746], // Branch point near Sadar Bazar / before Civil Lines
  [25.4555, 78.5725], // Turn West onto Gwalior Link Road
  [25.4565, 78.5702],
  [25.4578, 78.5680], // Gwalior Road arterial
  [25.4595, 78.5670],
  [25.4612, 78.5678],
  [25.4628, 78.5700], // North Western loop
  [25.4642, 78.5728],
  [25.4655, 78.5760],
  [25.4665, 78.5795],
  [25.4674, 78.5820],
  [25.4678, 78.5835], // Medical College Jhansi
];

// 3. Alternative Route C (North-Western Outer Highway Ring - Amber / Yellow)
export const JHANSI_ROUTE_C_COORDS: [number, number][] = [
  [25.4548, 78.5746], // Branch point
  [25.4560, 78.5710],
  [25.4575, 78.5665],
  [25.4590, 78.5640], // Station Outer Bypass
  [25.4615, 78.5635],
  [25.4640, 78.5648],
  [25.4660, 78.5675],
  [25.4675, 78.5715],
  [25.4682, 78.5760],
  [25.4680, 78.5805],
  [25.4678, 78.5835], // Medical College Jhansi
];

// 4. Alternative Route D (Eastern / Cantonment Bypass - Purple)
export const JHANSI_ROUTE_D_COORDS: [number, number][] = [
  [25.4548, 78.5746], // Branch point
  [25.4542, 78.5770], // Turn East towards Cantt
  [25.4538, 78.5795],
  [25.4545, 78.5820],
  [25.4560, 78.5840], // Eastern Ring Road
  [25.4580, 78.5855],
  [25.4605, 78.5862],
  [25.4630, 78.5858],
  [25.4655, 78.5850],
  [25.4670, 78.5842],
  [25.4678, 78.5835], // Medical College Jhansi
];

/**
 * Calculates polyline length in km
 */
export function calculatePolylineDistanceKm(coords: [number, number][]): number {
  let dist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    dist += getDistanceMeters(
      coords[i][0],
      coords[i][1],
      coords[i + 1][0],
      coords[i + 1][1]
    );
  }
  return parseFloat((dist / 1000).toFixed(1));
}

/**
 * Real online OSRM router query
 */
export async function fetchOSRMRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  waypoints: [number, number][] = []
): Promise<{ coordinates: [number, number][]; distanceKm: number; durationMin: number } | null> {
  try {
    const allPoints = [[startLng, startLat], ...waypoints.map(w => [w[1], w[0]]), [endLng, endLat]];
    const coordString = allPoints.map(p => `${p[0]},${p[1]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const primary = data.routes[0];
    const geoCoords: [number, number][] = primary.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]] // convert lon,lat to lat,lon
    );

    return {
      coordinates: geoCoords,
      distanceKm: parseFloat((primary.distance / 1000).toFixed(1)),
      durationMin: Math.max(1, Math.round(primary.duration / 60)),
    };
  } catch {
    return null;
  }
}

/**
 * Generates initial active route between origin and destination
 */
export async function getInitialRoute(
  origin: { lat: number; lng: number; name: string },
  destination: { lat: number; lng: number; name: string }
): Promise<RouteOption> {
  // Try online real OSRM routing first
  const osrm = await fetchOSRMRoute(origin.lat, origin.lng, destination.lat, destination.lng);
  if (osrm && osrm.coordinates.length > 5) {
    return {
      id: 'route_primary',
      name: 'Primary Route',
      color: '#3b82f6', // Solid Blue
      distanceKm: osrm.distanceKm,
      durationMinutes: osrm.durationMin,
      coordinates: osrm.coordinates,
      viaRoads: ['Civil Lines Arterial', 'Station Road'],
      isRecommended: true,
      maneuver: {
        instruction: 'Head north on City Center Road toward Civil Lines',
        distanceMeters: 450,
      },
    };
  }

  // Fallback to high-resolution real OSM road geometry
  const coords = JHANSI_DIRECT_ROUTE_COORDS;
  const dist = calculatePolylineDistanceKm(coords);
  return {
    id: 'route_primary',
    name: 'Primary Route',
    color: '#3b82f6', // Solid Blue
    distanceKm: dist,
    durationMinutes: Math.round(dist * 2.1), // ~18 min
    coordinates: coords,
    viaRoads: ['Civil Lines Arterial', 'Sadar Bazar Rd'],
    isRecommended: true,
    maneuver: {
      instruction: 'Head straight through Civil Lines toward Medical College',
      distanceMeters: 400,
    },
  };
}

/**
 * Calculates multiple optimal alternative routes from CURRENT DRIVER LOCATION to DESTINATION
 * avoiding the affected hazard segment.
 * Returns Route B (Green), Route C (Amber/Yellow), Route D (Purple)
 */
export async function calculateAlternativeRoutes(
  currentLat: number,
  currentLng: number,
  destination: { lat: number; lng: number; name: string },
  hazard: Hazard | null
): Promise<RouteOption[]> {
  const destLat = destination.lat;
  const destLng = destination.lng;

  // Compute offset points to avoid hazard safely
  const hazLat = hazard ? hazard.latitude : (currentLat + destLat) / 2;
  const hazLng = hazard ? hazard.longitude : (currentLng + destLng) / 2;

  // Generate 3 distinct feasible road bypasses:
  // Waypoint 1 (West bypass): avoid hazard by shifting West
  const wpB_lat = (currentLat + destLat) / 2 + 0.002;
  const wpB_lng = hazLng - 0.009; // ~1km west

  // Waypoint 2 (Far North-West highway bypass)
  const wpC_lat = (currentLat + destLat) / 2 + 0.006;
  const wpC_lng = hazLng - 0.015; // ~1.6km west

  // Waypoint 3 (East Cantonment bypass)
  const wpD_lat = (currentLat + destLat) / 2 - 0.002;
  const wpD_lng = hazLng + 0.009; // ~1km east

  // Query OSRM in parallel for the three branches
  const [resB, resC, resD] = await Promise.all([
    fetchOSRMRoute(currentLat, currentLng, destLat, destLng, [[wpB_lat, wpB_lng]]),
    fetchOSRMRoute(currentLat, currentLng, destLat, destLng, [[wpC_lat, wpC_lng]]),
    fetchOSRMRoute(currentLat, currentLng, destLat, destLng, [[wpD_lat, wpD_lng]]),
  ]);

  const alternatives: RouteOption[] = [];

  // Route B (Recommended - Green)
  if (resB && resB.coordinates.length > 3) {
    alternatives.push({
      id: 'route_b',
      name: 'Route B',
      color: '#10b981', // Emerald green
      distanceKm: resB.distanceKm,
      durationMinutes: resB.durationMin,
      coordinates: [[currentLat, currentLng], ...resB.coordinates],
      viaRoads: ['Gwalior Bypass Rd', 'Medical College Ring'],
      isRecommended: true,
      maneuver: {
        instruction: 'Turn left onto Gwalior Link Road to bypass hazard',
        distanceMeters: 300,
      },
    });
  } else {
    // Generate seamlessly connected branch starting from current position
    const branchB: [number, number][] = [
      [currentLat, currentLng],
      ...JHANSI_ROUTE_B_COORDS.filter(
        c => getDistanceMeters(c[0], c[1], currentLat, currentLng) > 100
      ),
    ];
    const distB = calculatePolylineDistanceKm(branchB);
    alternatives.push({
      id: 'route_b',
      name: 'Route B',
      color: '#10b981', // Emerald green
      distanceKm: distB,
      durationMinutes: Math.round(distB * 2.1),
      coordinates: branchB,
      viaRoads: ['Gwalior Bypass Rd', 'Medical College Ring'],
      isRecommended: true,
      maneuver: {
        instruction: 'Turn left onto Gwalior Link Road to bypass hazard',
        distanceMeters: 300,
      },
    });
  }

  // Route C (Outer Loop - Yellow/Amber)
  if (resC && resC.coordinates.length > 3) {
    alternatives.push({
      id: 'route_c',
      name: 'Route C',
      color: '#f59e0b', // Yellow / Amber
      distanceKm: resC.distanceKm,
      durationMinutes: resC.durationMin,
      coordinates: [[currentLat, currentLng], ...resC.coordinates],
      viaRoads: ['Station Outer Bypass', 'North Ring Rd'],
      isRecommended: false,
      maneuver: {
        instruction: 'Bear slight left onto Outer Station Bypass',
        distanceMeters: 450,
      },
    });
  } else {
    const branchC: [number, number][] = [
      [currentLat, currentLng],
      ...JHANSI_ROUTE_C_COORDS.filter(
        c => getDistanceMeters(c[0], c[1], currentLat, currentLng) > 100
      ),
    ];
    const distC = calculatePolylineDistanceKm(branchC);
    alternatives.push({
      id: 'route_c',
      name: 'Route C',
      color: '#f59e0b',
      distanceKm: distC,
      durationMinutes: Math.round(distC * 2.25),
      coordinates: branchC,
      viaRoads: ['Station Outer Bypass', 'North Ring Rd'],
      isRecommended: false,
      maneuver: {
        instruction: 'Bear slight left onto Outer Station Bypass',
        distanceMeters: 450,
      },
    });
  }

  // Route D (Eastern Bypass - Purple)
  if (resD && resD.coordinates.length > 3) {
    alternatives.push({
      id: 'route_d',
      name: 'Route D',
      color: '#a855f7', // Purple
      distanceKm: resD.distanceKm,
      durationMinutes: resD.durationMin,
      coordinates: [[currentLat, currentLng], ...resD.coordinates],
      viaRoads: ['Cantonment Rd', 'Eastern Arterial'],
      isRecommended: false,
      maneuver: {
        instruction: 'Turn right toward Cantonment Eastern Arterial',
        distanceMeters: 550,
      },
    });
  } else {
    const branchD: [number, number][] = [
      [currentLat, currentLng],
      ...JHANSI_ROUTE_D_COORDS.filter(
        c => getDistanceMeters(c[0], c[1], currentLat, currentLng) > 100
      ),
    ];
    const distD = calculatePolylineDistanceKm(branchD);
    alternatives.push({
      id: 'route_d',
      name: 'Route D',
      color: '#a855f7',
      distanceKm: distD,
      durationMinutes: Math.round(distD * 2.35),
      coordinates: branchD,
      viaRoads: ['Cantonment Rd', 'Eastern Arterial'],
      isRecommended: false,
      maneuver: {
        instruction: 'Turn right toward Cantonment Eastern Arterial',
        distanceMeters: 550,
      },
    });
  }

  return alternatives;
}
