/**
 * Google Maps Platform - Roads API Service
 * Handles:
 * 1. Snap to Roads: aligns noisy GPS breadcrumbs to the physical road geometry.
 * 2. Speed Limits: fetches legally posted speed limits for road segments.
 */

import { getGoogleRoadsApiKey } from './geocodingService';

export interface SnappedPoint {
  location: {
    latitude: number;
    longitude: number;
  };
  originalIndex?: number;
  placeId: string;
}

export interface SpeedLimitInfo {
  placeId: string;
  speedLimit: number; // km/h
  units: 'KPH' | 'MPH';
}

/**
 * Snaps raw GPS coordinates to the nearest road network using Google Roads API
 * https://roads.googleapis.com/v1/snapToRoads
 */
export async function snapToRoads(
  points: [number, number][],
  customApiKey?: string
): Promise<[number, number][]> {
  if (!points || points.length === 0) return points;

  const apiKey = (customApiKey || getGoogleRoadsApiKey()).trim();
  if (!apiKey) return points;

  try {
    // Up to 100 points per request
    const pathString = points
      .slice(0, 100)
      .map(([lat, lng]) => `${lat},${lng}`)
      .join('|');

    // Try local Vite proxy first to prevent browser CORS block
    const proxyUrl = `/api/roads/snap?path=${encodeURIComponent(pathString)}&key=${apiKey}`;
    const directUrl = `https://roads.googleapis.com/v1/snapToRoads?path=${encodeURIComponent(
      pathString
    )}&interpolate=true&key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    let res: Response | null = null;
    try {
      res = await fetch(proxyUrl, { signal: controller.signal });
      if (!res.ok) {
        res = await fetch(directUrl, { signal: controller.signal });
      }
    } catch {
      try {
        res = await fetch(directUrl, { signal: controller.signal });
      } catch {}
    }
    clearTimeout(timeout);

    if (!res || !res.ok) return points;
    const data = await res.json();

    if (data.snappedPoints && Array.isArray(data.snappedPoints) && data.snappedPoints.length > 0) {
      return data.snappedPoints.map((sp: SnappedPoint) => [
        sp.location.latitude,
        sp.location.longitude,
      ]);
    }
  } catch (err) {
    console.warn('[Roads API] SnapToRoads fallback to raw points:', err);
  }

  return points;
}

/**
 * Fetches posted road speed limits for road place IDs
 * https://roads.googleapis.com/v1/speedLimits
 */
export async function fetchSpeedLimits(
  placeIds: string[],
  customApiKey?: string
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!placeIds || placeIds.length === 0) return result;

  const apiKey = (customApiKey || getGoogleRoadsApiKey()).trim();
  if (!apiKey) return result;

  try {
    const params = placeIds.map((id) => `placeId=${encodeURIComponent(id)}`).join('&');
    const url = `https://roads.googleapis.com/v1/speedLimits?${params}&key=${apiKey}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.speedLimits && Array.isArray(data.speedLimits)) {
        data.speedLimits.forEach((sl: SpeedLimitInfo) => {
          result.set(sl.placeId, sl.speedLimit);
        });
      }
    }
  } catch {
    // fallback
  }

  return result;
}
