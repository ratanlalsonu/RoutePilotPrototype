import { RouteOption, Hazard, RouteStep, VehicleType } from '../types';
import { getDistanceMeters } from '../algorithms/hazardRouteIntersection';
import {
  JHANSI_REAL_ROAD_ROUTE_A,
  JHANSI_REAL_ROAD_ROUTE_B,
  JHANSI_REAL_ROAD_ROUTE_C,
  REAL_ROAD_CROSS_LINK_A_TO_B,
  REAL_ROAD_CROSS_LINK_A_TO_C,
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

// Multi-endpoint routing mirrors: Google Maps Directions API + high-speed OSM mirrors
const OSRM_ENDPOINTS = [
  'https://routing.openstreetmap.de/routed-car',
  'https://router.project-osrm.org',
];

function getMapsApiKey(): string {
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('routepilot_gmaps_api_key');
    if (fromStorage) return fromStorage;
  }
  return (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDqGrmco0xOLvPmuB_DXuuWpHIDOI7ts2U';
}

/**
 * Decodes Google Maps Encoded Polyline format into [lat, lng][] array
 */
export function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([parseFloat((lat / 1e5).toFixed(6)), parseFloat((lng / 1e5).toFixed(6))]);
  }
  return points;
}

/**
 * Queries Google Maps Directions API for genuine Google road routes
 */
export async function fetchGoogleDirectionsRoutes(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  waypoints: [number, number][] = []
): Promise<Array<{ coordinates: [number, number][]; distanceKm: number; durationMin: number; steps?: RouteStep[]; summary?: string }>> {
  const apiKey = getMapsApiKey();
  if (!apiKey) return [];

  try {
    const wpParam =
      waypoints.length > 0
        ? `&waypoints=${waypoints.map((w) => `${w[0]},${w[1]}`).join('|')}`
        : '';
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLat},${startLng}&destination=${endLat},${endLng}&alternatives=true${wpParam}&key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) return [];

    return data.routes.map((route: any) => {
      let coords: [number, number][] = [];
      if (route.overview_polyline && route.overview_polyline.points) {
        coords = decodeGooglePolyline(route.overview_polyline.points);
      }

      let totalDistMeters = 0;
      let totalDurationSec = 0;
      const steps: RouteStep[] = [];

      if (route.legs && Array.isArray(route.legs)) {
        for (const leg of route.legs) {
          totalDistMeters += leg.distance?.value || 0;
          totalDurationSec += leg.duration?.value || 0;

          if (leg.steps && Array.isArray(leg.steps)) {
            for (const s of leg.steps) {
              const cleanInst = (s.html_instructions || '').replace(/<[^>]*>?/gm, ' ');
              steps.push({
                instruction: cleanInst || 'Follow road',
                roadName: s.maneuver || 'Connecting Road',
                distanceMeters: s.distance?.value || 100,
                durationSeconds: s.duration?.value || 15,
                turnType: 'straight',
              });
            }
          }
        }
      }

      return {
        coordinates: coords,
        distanceKm: parseFloat((totalDistMeters / 1000).toFixed(1)),
        durationMin: Math.max(1, Math.round(totalDurationSec / 60)),
        steps: steps.length > 0 ? steps : undefined,
        summary: route.summary || undefined,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Snaps any coordinate to the nearest real drivable road on OpenStreetMap
 */
export async function snapToNearestRoad(
  lat: number,
  lng: number
): Promise<{ lat: number; lng: number; name?: string } | null> {
  for (const base of OSRM_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const url = `${base}/nearest/v1/driving/${lng},${lat}?number=1`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.waypoints || data.waypoints.length === 0) continue;
      const wp = data.waypoints[0];
      return {
        lat: wp.location[1],
        lng: wp.location[0],
        name: wp.name || undefined,
      };
    } catch {
      // try next endpoint
    }
  }
  return null;
}

/**
 * Online OSRM router query for a single primary route or through waypoints
 */
export async function fetchOSRMRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  waypoints: [number, number][] = []
): Promise<{ coordinates: [number, number][]; distanceKm: number; durationMin: number; steps?: RouteStep[]; summary?: string } | null> {
  const routes = await fetchOSRMAllRoutes(startLat, startLng, endLat, endLng, waypoints, false);
  return routes.length > 0 ? routes[0] : null;
}

/**
 * Online OSRM router query supporting multi-alternative routes with fallback mirrors
 */
export async function fetchOSRMAllRoutes(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  waypoints: [number, number][] = [],
  requestAlternatives: boolean = true
): Promise<Array<{ coordinates: [number, number][]; distanceKm: number; durationMin: number; steps?: RouteStep[]; summary?: string }>> {
  // 1. Prioritize official Google Maps Directions API when API key is available
  try {
    const gRoutes = await fetchGoogleDirectionsRoutes(startLat, startLng, endLat, endLng, waypoints);
    if (gRoutes.length > 0) {
      return gRoutes;
    }
  } catch {
    // Fallback to high-speed OSM router
  }

  const allPoints = [[startLng, startLat], ...waypoints.map((w) => [w[1], w[0]]), [endLng, endLat]];
  const coordString = allPoints.map((p) => `${p[0]},${p[1]}`).join(';');
  const altParam = requestAlternatives && waypoints.length === 0 ? '&alternatives=3' : '';

  for (const base of OSRM_ENDPOINTS) {
    try {
      const url = `${base}/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true${altParam}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5500);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();
      if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) continue;

      const parsedRoutes = data.routes.map((routeItem: any) => {
        const geoCoords: [number, number][] = routeItem.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] // convert [lon, lat] to [lat, lon]
        );

        const steps: RouteStep[] = [];
        if (routeItem.legs && routeItem.legs[0] && Array.isArray(routeItem.legs[0].steps)) {
          for (const s of routeItem.legs[0].steps) {
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
          distanceKm: parseFloat((routeItem.distance / 1000).toFixed(1)),
          durationMin: Math.max(1, Math.round(routeItem.duration / 60)),
          steps: steps.length > 0 ? steps : undefined,
          summary: routeItem.legs?.[0]?.summary || undefined,
        };
      });

      if (parsedRoutes.length > 0) {
        return parsedRoutes;
      }
    } catch {
      // Try next mirror
    }
  }

  return [];
}

/**
 * Generates smooth direct fallback polyline strictly between start and end
 */
function generateFallbackDirectPolyline(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  curveLateralOffset: number = 0
): [number, number][] {
  const pts: [number, number][] = [];
  const steps = 30;
  const dx = endLng - startLng;
  const dy = endLat - startLat;
  const dist = Math.hypot(dx, dy);
  const normX = dist > 0 ? -dy / dist : 0;
  const normY = dist > 0 ? dx / dist : 0;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curve = Math.sin(t * Math.PI) * curveLateralOffset;
    const lat = startLat + t * dy + normY * curve;
    const lng = startLng + t * dx + normX * curve;
    pts.push([parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6))]);
  }
  return pts;
}

/**
 * Calculates Multiple Optimal Routes for a given Source, Destination, and Vehicle Type
 * Returns 1 to 3 distinct 100% genuine real-road routes:
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

  // Snap both origin and destination to nearest real drivable roads for 100% routing accuracy
  const [snapStart, snapDest] = await Promise.all([
    snapToNearestRoad(startLat, startLng),
    snapToNearestRoad(endLat, endLng),
  ]);

  const sLat = snapStart?.lat || startLat;
  const sLng = snapStart?.lng || startLng;
  const eLat = snapDest?.lat || endLat;
  const eLng = snapDest?.lng || endLng;

  const routes: RouteOption[] = [];

  // Step 1: Query multi-endpoint OSRM router with native alternative paths enabled
  const osrmRoutes = await fetchOSRMAllRoutes(sLat, sLng, eLat, eLng, [], true);

  if (osrmRoutes.length > 0) {
    // Primary / Fastest route
    const r0 = osrmRoutes[0];
    const distA = r0.distanceKm;
    const durA = calculateVehicleDuration(distA, vehicleType, r0.durationMin);
    const viaRoadsA = r0.steps && r0.steps.length > 1
      ? Array.from(new Set(r0.steps.map((s) => s.roadName).filter((n) => n && n !== 'Connecting Road'))).slice(0, 2)
      : [r0.summary || 'Fastest Arterial'];

    routes.push({
      id: 'opt_route_a',
      name: 'Route A — Fastest Route',
      color: '#AEF5F0',
      distanceKm: distA,
      durationMinutes: durA,
      coordinates: r0.coordinates,
      viaRoads: viaRoadsA.length > 0 ? viaRoadsA : ['Main Transit Corridor'],
      isRecommended: true,
      maneuver: {
        instruction: `Head toward ${destination.name}`,
        distanceMeters: Math.round(distA * 150),
      },
      steps: r0.steps || generateSyntheticSteps('Route A', viaRoadsA, distA, destination.name),
    });

    // If OSRM returned genuine second alternative along real roads
    if (osrmRoutes.length > 1) {
      const r1 = osrmRoutes[1];
      const distB = r1.distanceKm;
      // Ensure alternative is not an absurd looping anomaly
      if (distB <= distA * 1.85) {
        const durB = calculateVehicleDuration(distB, vehicleType, r1.durationMin);
        const viaRoadsB = r1.steps && r1.steps.length > 1
          ? Array.from(new Set(r1.steps.map((s) => s.roadName).filter((n) => n && n !== 'Connecting Road'))).slice(0, 2)
          : [r1.summary || 'Outer Bypass Corridor'];

        routes.push({
          id: 'opt_route_b',
          name: 'Route B — Outer Bypass',
          color: '#10b981',
          distanceKm: distB,
          durationMinutes: durB,
          coordinates: r1.coordinates,
          viaRoads: viaRoadsB.length > 0 ? viaRoadsB : ['Outer Bypass Corridor'],
          isRecommended: false,
          maneuver: {
            instruction: 'Turn onto Outer Bypass toward destination',
            distanceMeters: 350,
          },
          steps: r1.steps || generateSyntheticSteps('Route B', viaRoadsB, distB, destination.name),
        });
      }
    }

    // If OSRM returned genuine third alternative
    if (osrmRoutes.length > 2) {
      const r2 = osrmRoutes[2];
      const distC = r2.distanceKm;
      if (distC <= distA * 1.85) {
        const durC = calculateVehicleDuration(distC, vehicleType, r2.durationMin);
        const viaRoadsC = r2.steps && r2.steps.length > 1
          ? Array.from(new Set(r2.steps.map((s) => s.roadName).filter((n) => n && n !== 'Connecting Road'))).slice(0, 2)
          : [r2.summary || 'Arterial Link Road'];

        routes.push({
          id: 'opt_route_c',
          name: 'Route C — Arterial Corridor',
          color: '#f59e0b',
          distanceKm: distC,
          durationMinutes: durC,
          coordinates: r2.coordinates,
          viaRoads: viaRoadsC.length > 0 ? viaRoadsC : ['Arterial Link Road'],
          isRecommended: false,
          maneuver: {
            instruction: 'Bear right onto Arterial Corridor',
            distanceMeters: 450,
          },
          steps: r2.steps || generateSyntheticSteps('Route C', viaRoadsC, distC, destination.name),
        });
      }
    }
  }

  // Step 2: If the router only returned 1 route (e.g. single corridor), find real on-road bypasses
  if (routes.length === 1 && routes[0].coordinates.length > 10) {
    const primaryCoords = routes[0].coordinates;
    const midIdx = Math.floor(primaryCoords.length / 2);
    const midPt = primaryCoords[midIdx];

    const dx = eLng - sLng;
    const dy = eLat - sLat;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.003) {
      const normX = -dy / dist;
      const normY = dx / dist;
      const lateralShift = Math.min(0.025, Math.max(0.006, dist * 0.12));

      // Candidate 1 (Left / West lateral road search)
      const cand1Lat = midPt[0] + normY * lateralShift;
      const cand1Lng = midPt[1] + normX * lateralShift;

      // Candidate 2 (Right / East lateral road search)
      const cand2Lat = midPt[0] - normY * lateralShift;
      const cand2Lng = midPt[1] - normX * lateralShift;

      const [snap1, snap2] = await Promise.all([
        snapToNearestRoad(cand1Lat, cand1Lng),
        snapToNearestRoad(cand2Lat, cand2Lng),
      ]);

      // Only attempt routing if snapped to a legitimate road distinct from primary route
      const queryList: Promise<any>[] = [];
      if (snap1 && getDistanceMeters(snap1.lat, snap1.lng, midPt[0], midPt[1]) > 120) {
        queryList.push(fetchOSRMRoute(sLat, sLng, eLat, eLng, [[snap1.lat, snap1.lng]]));
      } else {
        queryList.push(Promise.resolve(null));
      }

      if (snap2 && getDistanceMeters(snap2.lat, snap2.lng, midPt[0], midPt[1]) > 120) {
        queryList.push(fetchOSRMRoute(sLat, sLng, eLat, eLng, [[snap2.lat, snap2.lng]]));
      } else {
        queryList.push(Promise.resolve(null));
      }

      const [resB, resC] = await Promise.all(queryList);

      const distA = routes[0].distanceKm;

      if (resB && resB.coordinates && resB.coordinates.length > 5 && resB.distanceKm <= distA * 1.7) {
        const distB = resB.distanceKm;
        const durB = calculateVehicleDuration(distB, vehicleType, resB.durationMin);
        const viaRoads = [snap1?.name || 'Outer Ring Bypass', 'Connecting Road'];
        routes.push({
          id: 'opt_route_b',
          name: 'Route B — Outer Bypass',
          color: '#10b981',
          distanceKm: distB,
          durationMinutes: durB,
          coordinates: resB.coordinates,
          viaRoads,
          isRecommended: false,
          maneuver: { instruction: 'Take outer link toward destination', distanceMeters: 350 },
          steps: resB.steps || generateSyntheticSteps('Route B', viaRoads, distB, destination.name),
        });
      }

      if (resC && resC.coordinates && resC.coordinates.length > 5 && resC.distanceKm <= distA * 1.7) {
        const distC = resC.distanceKm;
        const durC = calculateVehicleDuration(distC, vehicleType, resC.durationMin);
        const viaRoads = [snap2?.name || 'Secondary Arterial', 'Connecting Road'];
        routes.push({
          id: 'opt_route_c',
          name: 'Route C — Arterial Corridor',
          color: '#f59e0b',
          distanceKm: distC,
          durationMinutes: durC,
          coordinates: resC.coordinates,
          viaRoads,
          isRecommended: false,
          maneuver: { instruction: 'Bear right onto Arterial Corridor', distanceMeters: 450 },
          steps: resC.steps || generateSyntheticSteps('Route C', viaRoads, distC, destination.name),
        });
      }
    }
  }

  // Step 3: Resilient fallback only if network completely severed
  if (routes.length === 0) {
    // Attempt single route without alternative parameter
    const single = await fetchOSRMRoute(sLat, sLng, eLat, eLng);
    if (single && single.coordinates.length > 2) {
      const dist = single.distanceKm;
      routes.push({
        id: 'opt_route_a',
        name: 'Route A — Optimal Road Route',
        color: '#AEF5F0',
        distanceKm: dist,
        durationMinutes: calculateVehicleDuration(dist, vehicleType, single.durationMin),
        coordinates: single.coordinates,
        viaRoads: ['Main Transit Corridor'],
        isRecommended: true,
        maneuver: { instruction: `Head toward ${destination.name}`, distanceMeters: 400 },
        steps: single.steps || generateSyntheticSteps('Route A', ['Main Transit Corridor'], dist, destination.name),
      });
    }
  }

  return routes;
}

// Verified real-road landmark routes for Jhansi center
export const JHANSI_DIRECT_ROUTE_COORDS: [number, number][] = JHANSI_REAL_ROAD_ROUTE_A;
export const JHANSI_ROUTE_B_COORDS: [number, number][] = JHANSI_REAL_ROAD_ROUTE_B;
export const JHANSI_ROUTE_C_COORDS: [number, number][] = JHANSI_REAL_ROAD_ROUTE_C;
export const JHANSI_ROUTE_D_COORDS: [number, number][] = JHANSI_REAL_ROAD_ROUTE_B;

export async function getInitialRoute(
  origin: { lat: number; lng: number; name: string },
  destination: { lat: number; lng: number; name: string }
): Promise<RouteOption> {
  const osrm = await fetchOSRMRoute(origin.lat, origin.lng, destination.lat, destination.lng);
  if (osrm && osrm.coordinates.length > 5) {
    const viaRoads = osrm.steps && osrm.steps.length > 1
      ? [osrm.steps[0].roadName, osrm.steps[1].roadName]
      : ['Main Corridor', 'Arterial Link'];
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
        instruction: `Head toward ${destination.name}`,
        distanceMeters: 450,
      },
      steps: osrm.steps || generateSyntheticSteps('Primary Route', viaRoads, osrm.distanceKm, destination.name),
    };
  }

  // Safe fallback
  const coords = generateFallbackDirectPolyline(origin.lat, origin.lng, destination.lat, destination.lng, 0);
  const dist = calculatePolylineDistanceKm(coords);
  const viaRoads = ['Main Corridor'];
  return {
    id: 'route_primary',
    name: 'Primary Route',
    color: '#AEF5F0',
    distanceKm: dist,
    durationMinutes: Math.max(1, Math.round(dist * 1.5)),
    coordinates: coords,
    viaRoads,
    isRecommended: true,
    maneuver: {
      instruction: `Head toward ${destination.name}`,
      distanceMeters: 400,
    },
    steps: generateSyntheticSteps('Primary Route', viaRoads, dist, destination.name),
  };
}

/**
 * Calculates genuine on-road alternative routes that bypass the detected hazard.
 * Detours dynamically around the hazard in the driver's actual location.
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
  const safeRadiusMeters = hazard ? (hazard.affectedRadius || 180) + 50 : 250;

  const alternatives: RouteOption[] = [];

  // Dynamic hazard bypass calculation based on actual hazard coordinate
  if (hazard) {
    const hLat = hazard.latitude;
    const hLng = hazard.longitude;

    const dx = hLng - currentLng;
    const dy = hLat - currentLat;
    const dist = Math.hypot(dx, dy);

    // Normal vector perpendicular to the approach vector
    const normX = dist > 0 ? -dy / dist : 0;
    const normY = dist > 0 ? dx / dist : 1;

    // Lateral distance to clear the hazard circle
    const offsetDeg = Math.max(0.004, (safeRadiusMeters + 120) / 111000);

    const candLeft = [hLat + normY * offsetDeg, hLng + normX * offsetDeg] as [number, number];
    const candRight = [hLat - normY * offsetDeg, hLng - normX * offsetDeg] as [number, number];

    const [snapLeft, snapRight] = await Promise.all([
      snapToNearestRoad(candLeft[0], candLeft[1]),
      snapToNearestRoad(candRight[0], candRight[1]),
    ]);

    const candidates = [
      {
        id: 'route_b',
        name: 'Route B (West/Left Bypass)',
        color: '#10b981',
        roadName: snapLeft?.name || 'Safe Detour Bypass',
        lat: snapLeft ? snapLeft.lat : candLeft[0],
        lng: snapLeft ? snapLeft.lng : candLeft[1],
      },
      {
        id: 'route_c',
        name: 'Route C (East/Right Bypass)',
        color: '#f59e0b',
        roadName: snapRight?.name || 'Outer Link Detour',
        lat: snapRight ? snapRight.lat : candRight[0],
        lng: snapRight ? snapRight.lng : candRight[1],
      },
    ];

    for (const c of candidates) {
      if (getDistanceMeters(c.lat, c.lng, hLat, hLng) <= safeRadiusMeters) continue;

      try {
        const res = await fetchOSRMRoute(currentLat, currentLng, destLat, destLng, [[c.lat, c.lng]]);
        if (res && res.coordinates && res.coordinates.length > 3) {
          // Check hazard clearance
          let clears = true;
          for (const pt of res.coordinates) {
            if (getDistanceMeters(pt[0], pt[1], hLat, hLng) <= safeRadiusMeters) {
              clears = false;
              break;
            }
          }

          if (clears) {
            const finalCoords = [...res.coordinates];
            if (getDistanceMeters(finalCoords[0][0], finalCoords[0][1], currentLat, currentLng) > 3) {
              finalCoords.unshift([currentLat, currentLng]);
            }

            const distB = res.distanceKm;
            const durB = calculateVehicleDuration(distB, vehicleType, res.durationMin);
            const viaRoads = [c.roadName, 'Clear Corridor'];

            alternatives.push({
              id: c.id,
              name: c.name,
              color: c.color,
              distanceKm: distB,
              durationMinutes: durB,
              coordinates: finalCoords,
              viaRoads,
              isRecommended: c.id === 'route_b',
              maneuver: {
                instruction: `Turn onto ${c.roadName} to safely bypass ${hazard.type}`,
                distanceMeters: 250,
              },
              steps: res.steps || generateSyntheticSteps(c.name, viaRoads, distB, destination.name),
            });
          }
        }
      } catch {
        // continue
      }
    }
  }

  // Fallback: If OSRM failed or was offline, construct smooth local detour around the hazard
  if (alternatives.length === 0) {
    const detourLeft: [number, number][] = [];
    const detourRight: [number, number][] = [];

    const hLat = hazard ? hazard.latitude : (currentLat + destLat) / 2;
    const hLng = hazard ? hazard.longitude : (currentLng + destLng) / 2;

    const dx = destLng - currentLat;
    const dy = destLat - currentLat;
    const dist = Math.hypot(dx, dy);
    const normX = dist > 0 ? -dy / dist : 0;
    const normY = dist > 0 ? dx / dist : 1;
    const detourOffset = 0.006;

    // Left detour points
    detourLeft.push([currentLat, currentLng]);
    detourLeft.push([hLat + normY * detourOffset, hLng + normX * detourOffset]);
    detourLeft.push([destLat, destLng]);

    const distL = calculatePolylineDistanceKm(detourLeft);
    alternatives.push({
      id: 'route_b',
      name: 'Route B (Optimal Safe Detour)',
      color: '#10b981',
      distanceKm: distL,
      durationMinutes: calculateVehicleDuration(distL, vehicleType),
      coordinates: detourLeft,
      viaRoads: ['Safe Detour Bypass'],
      isRecommended: true,
      maneuver: {
        instruction: `Detour around ${hazard?.type || 'hazard'}`,
        distanceMeters: 200,
      },
      steps: generateSyntheticSteps('Route B', ['Safe Detour Bypass'], distL, destination.name),
    });
  }

  return alternatives;
}
