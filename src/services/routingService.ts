import { RouteOption, Hazard, RouteStep, VehicleType } from '../types';
import { getDistanceMeters } from '../algorithms/hazardRouteIntersection';
import {
  snapToNearestRoad as snapToRoadNetwork,
  buildRoadGraphAndSearchRoutes,
} from './roadGraphBuilder';
import { realtimeSync } from './realtimeSync';
import { getGoogleRoutesApiKey } from './geocodingService';

/**
 * Re-export snapToNearestRoad for components and services
 */
export const snapToNearestRoad = snapToRoadNetwork;

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
  // Add traffic buffer of 1-2 minutes for city driving
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
 * Connects start and end points directly to the road geometry if within a small threshold (e.g. driveway),
 * preventing long arbitrary off-road lines while keeping endpoints snapped cleanly.
 */
export function ensureCompleteEndpoints(
  coords: [number, number][],
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): [number, number][] {
  if (!coords || coords.length < 2) {
    return coords || [];
  }
  const result: [number, number][] = coords.map(([lat, lng]) => [lat, lng]);

  // Connect start point directly to driver's exact location if close by (< 80m)
  const distStart = getDistanceMeters(result[0][0], result[0][1], startLat, startLng);
  if (distStart > 5 && distStart < 80) {
    result.unshift([startLat, startLng]);
  } else if (distStart <= 5) {
    result[0] = [startLat, startLng];
  }

  // Connect end point directly to destination if close by (< 80m)
  const lastIdx = result.length - 1;
  const distEnd = getDistanceMeters(result[lastIdx][0], result[lastIdx][1], endLat, endLng);
  if (distEnd > 5 && distEnd < 80) {
    result.push([endLat, endLng]);
  } else if (distEnd <= 5) {
    result[lastIdx] = [endLat, endLng];
  }

  return result;
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
  const apiKey = getGoogleRoutesApiKey();
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
 * Online OSRM router query supporting multi-alternative routes with local high-speed proxy
 */
export async function fetchOSRMAllRoutes(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  waypoints: [number, number][] = [],
  requestAlternatives: boolean = true
): Promise<Array<{ coordinates: [number, number][]; distanceKm: number; durationMin: number; steps?: RouteStep[]; summary?: string }>> {
  const allPoints = [[startLng, startLat], ...waypoints.map((w) => [w[1], w[0]]), [endLng, endLat]];
  const coordString = allPoints.map((p) => `${p[0]},${p[1]}`).join(';');
  const altParam = requestAlternatives && waypoints.length === 0 ? '&alternatives=3' : '';

  // 1. Try local proxy first
  if (typeof window !== 'undefined') {
    try {
      const proxyUrl = `/api/osrm/route?coords=${encodeURIComponent(coordString)}&alternatives=${requestAlternatives && waypoints.length === 0 ? '3' : 'false'}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && Array.isArray(data.routes) && data.routes.length > 0) {
          return data.routes.map((routeItem: any) => {
            const geoCoords: [number, number][] = (routeItem.geometry?.coordinates || []).map(
              (c: [number, number]) => [c[1], c[0]]
            );
            return {
              coordinates: geoCoords,
              distanceKm: parseFloat(((routeItem.distance || 1000) / 1000).toFixed(1)),
              durationMin: Math.max(1, Math.round((routeItem.duration || 60) / 60)),
              summary: routeItem.legs?.[0]?.summary || undefined,
            };
          });
        }
      }
    } catch {
      // Fallback to direct fetch
    }
  }

  // 2. Direct high-speed endpoints
  const endpoints = [
    'https://router.project-osrm.org',
    'https://routing.openstreetmap.de/routed-car',
  ];

  for (const base of endpoints) {
    try {
      const url = `${base}/route/v1/driving/${coordString}?overview=full&geometries=geojson${altParam}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();
      if (data.routes && Array.isArray(data.routes) && data.routes.length > 0) {
        return data.routes.map((routeItem: any) => {
          const geoCoords: [number, number][] = (routeItem.geometry?.coordinates || []).map(
            (c: [number, number]) => [c[1], c[0]]
          );
          return {
            coordinates: geoCoords,
            distanceKm: parseFloat(((routeItem.distance || 1000) / 1000).toFixed(1)),
            durationMin: Math.max(1, Math.round((routeItem.duration || 60) / 60)),
            summary: routeItem.legs?.[0]?.summary || undefined,
          };
        });
      }
    } catch {
      // Try next mirror
    }
  }

  return [];
}

/**
 * Calculates Multiple Optimal Routes for a given Source, Destination, and Vehicle Type.
 *
 * Pipeline:
 * REAL ROAD NETWORK DATA -> ROAD GRAPH -> A* GRAPH SEARCH -> SELECTED ROAD EDGES -> REAL ROAD GEOMETRY
 *
 * Guaranteed properties:
 * 1. 100% follows real roads using OpenStreetMap road network data.
 * 2. Snaps origin and destination to nearest road network location.
 * 3. Evaluates all junction branches with A* cost function f(n) = g(n) + h(n).
 * 4. Penalizes/blocks affected road edges when hazards are detected.
 * 5. Returns up to 3 genuine road alternatives.
 * 6. NEVER falls back to hardcoded fake routes.
 */
export async function calculateMultipleOptimalRoutes(
  origin: { lat: number; lng: number; name: string },
  destination: { lat: number; lng: number; name: string },
  vehicleType: VehicleType = 'car',
  hazards?: Hazard[]
): Promise<RouteOption[]> {
  const activeHazards = hazards || realtimeSync.getState().hazards;

  const result = await buildRoadGraphAndSearchRoutes(
    origin,
    destination,
    activeHazards,
    vehicleType
  );

  if (result && result.routes && result.routes.length > 0) {
    // Record A* evaluation in global state
    realtimeSync.setAStarEvaluation(result.aStarEvaluation);
    return result.routes;
  }

  // If road graph search fails, return empty array - NEVER draw a fake route!
  return [];
}

/**
 * Calculates genuine on-road alternative routes that safely bypass a detected hazard.
 *
 * Rerouting Pipeline:
 * CURRENT VEHICLE POSITION -> snap to nearest road -> identify road edge ->
 * increase/block affected hazard edges -> run A* to destination -> generate new road route.
 *
 * The previous route does not continue through the blocked hazard segment.
 * The new route follows actual road geometry.
 */
export async function calculateAlternativeRoutes(
  currentLat: number,
  currentLng: number,
  destination: { lat: number; lng: number; name: string },
  hazard: Hazard | null,
  vehicleType: VehicleType = 'car',
  activeRoute: RouteOption | null = null
): Promise<RouteOption[]> {
  const allHazards = realtimeSync.getState().hazards;
  const activeHazardsList: Hazard[] = hazard
    ? [hazard, ...allHazards.filter((h) => h.hazardId !== hazard.hazardId)]
    : allHazards;

  const result = await buildRoadGraphAndSearchRoutes(
    { lat: currentLat, lng: currentLng, name: 'Current Vehicle Position' },
    destination,
    activeHazardsList,
    vehicleType
  );

  if (result && result.routes && result.routes.length > 0) {
    realtimeSync.setAStarEvaluation(result.aStarEvaluation);
    // Return routes (safe bypasses that cleared the hazard)
    return result.routes;
  }

  return [];
}
