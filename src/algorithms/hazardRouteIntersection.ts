import { Hazard, RouteOption } from '../types';

/**
 * Calculates haversine distance in meters between two lat/lng coordinates
 */
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates the shortest distance in meters from a point (pLat, pLon) to a line segment (aLat, aLon) -> (bLat, bLon)
 */
export function distanceToSegmentMeters(
  pLat: number,
  pLon: number,
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const segmentLen = getDistanceMeters(aLat, aLon, bLat, bLon);
  if (segmentLen === 0) return getDistanceMeters(pLat, pLon, aLat, aLon);

  // Approximate projection in Cartesian plane centered around the points
  const cosLat = Math.cos((((aLat + bLat) / 2) * Math.PI) / 180);
  const ax = aLon * cosLat;
  const ay = aLat;
  const bx = bLon * cosLat;
  const by = bLat;
  const px = pLon * cosLat;
  const py = pLat;

  const dx = bx - ax;
  const dy = by - ay;
  const segSq = dx * dx + dy * dy;

  if (segSq === 0) return getDistanceMeters(pLat, pLon, aLat, aLon);

  let t = ((px - ax) * dx + (py - ay) * dy) / segSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  const projLon = projX / cosLat;
  const projLat = projY;

  return getDistanceMeters(pLat, pLon, projLat, projLon);
}

/**
 * Determines whether a hazard intersects or comes within its affected radius of a route geometry.
 * Returns { affects: boolean, minDistanceMeters, segmentIndex }
 */
export function hazardAffectsRoute(
  hazard: Hazard,
  routeCoordinates: [number, number][],
  driverCurrentIndex: number = 0
): {
  affects: boolean;
  minDistanceMeters: number;
  segmentIndex: number;
  aheadOfDriver: boolean;
} {
  if (!routeCoordinates || routeCoordinates.length < 2) {
    return { affects: false, minDistanceMeters: Infinity, segmentIndex: -1, aheadOfDriver: false };
  }

  let minDistance = Infinity;
  let closestSegment = -1;

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const a = routeCoordinates[i];
    const b = routeCoordinates[i + 1];
    const dist = distanceToSegmentMeters(
      hazard.latitude,
      hazard.longitude,
      a[0],
      a[1],
      b[0],
      b[1]
    );

    if (dist < minDistance) {
      minDistance = dist;
      closestSegment = i;
    }
  }

  const radius = hazard.affectedRadius || 150; // default 150m buffer
  const affects = minDistance <= radius && hazard.status === 'ACTIVE';
  const aheadOfDriver = closestSegment >= Math.max(0, driverCurrentIndex - 2);

  return {
    affects: affects && aheadOfDriver,
    minDistanceMeters: Math.round(minDistance),
    segmentIndex: closestSegment,
    aheadOfDriver,
  };
}

/**
 * Detects which alternative route the vehicle has entered and committed to.
 * Based on proximity threshold and directional alignment.
 */
export function detectRouteCommitment(
  vehicleLat: number,
  vehicleLng: number,
  alternatives: RouteOption[],
  thresholdMeters: number = 65
): { committedRoute: RouteOption; matchedIndex: number } | null {
  if (!alternatives || alternatives.length === 0) return null;

  for (const route of alternatives) {
    if (!route.coordinates || route.coordinates.length < 2) continue;

    // Check distance to the first 40% of the alternative route (where choice branch occurs)
    const checkSegments = Math.min(route.coordinates.length - 1, 20);
    for (let i = 0; i < checkSegments; i++) {
      const a = route.coordinates[i];
      const b = route.coordinates[i + 1];
      const dist = distanceToSegmentMeters(
        vehicleLat,
        vehicleLng,
        a[0],
        a[1],
        b[0],
        b[1]
      );

      if (dist <= thresholdMeters) {
        return { committedRoute: route, matchedIndex: i };
      }
    }
  }

  return null;
}

/**
 * Calculates bearing between two coordinates in degrees (0 = North, 90 = East, etc.)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}
