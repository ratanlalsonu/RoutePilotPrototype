/**
 * A* Pathfinding Configuration Module for RoutePilot
 *
 * Centralized, editable weights and normalization parameters.
 * Safety is prioritized over shortest distance.
 */

export type StandardVehicleType = 'CAR' | 'BIKE' | 'VAN' | 'BUS' | 'TRUCK';
export type TrafficLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type HazardSeverity = 'SAFE' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
export type RoadStatus = 'OPEN' | 'BLOCKED';

export interface RouteWeights {
  distance: number;     // Wd
  time: number;         // Wt
  traffic: number;      // Wc
  hazard: number;       // Wh
  restriction: number;  // Wr
}

export interface WeightPreset {
  id: string;
  name: string;
  description: string;
  weights: RouteWeights;
}

/**
 * 8. CONFIGURABLE WEIGHTS
 * Central configuration object.
 * Safety (Wh = 5.0) has higher priority than shortest distance (Wd = 1.0).
 */
export const ROUTE_WEIGHTS: RouteWeights = {
  distance: 1.0,     // Wd - Distance Weight
  time: 1.5,         // Wt - Travel Time Weight
  traffic: 0.0,      // Wc - Optional / Disabled
  hazard: 5.0,       // Wh - Hazard Safety Priority
  restriction: 1000, // Wr - Heavy blocker
};

/**
 * Weighting strategies for user tuning and college presentation demos
 */
export const WEIGHT_PRESETS: WeightPreset[] = [
  {
    id: 'safety_priority',
    name: 'Safety Priority (Default)',
    description: 'Heavily penalizes hazards (Wh = 5.0). Prioritizes safety over distance.',
    weights: {
      distance: 1.0,
      time: 1.5,
      traffic: 0.0,
      hazard: 5.0,
      restriction: 1000,
    },
  },
  {
    id: 'fastest_time',
    name: 'Fastest Travel Time',
    description: 'Prioritizes travel duration (Wt = 3.0) while avoiding hazards.',
    weights: {
      distance: 0.6,
      time: 3.0,
      traffic: 0.0,
      hazard: 4.0,
      restriction: 1000,
    },
  },
  {
    id: 'shortest_distance',
    name: 'Shortest Distance',
    description: 'Prioritizes shortest kilometers (Wd = 3.0) while avoiding critical hazards.',
    weights: {
      distance: 3.0,
      time: 1.0,
      traffic: 0.0,
      hazard: 3.5,
      restriction: 1000,
    },
  },
  {
    id: 'balanced',
    name: 'Balanced Multi-Objective',
    description: 'Equally balances distance, time, and hazard avoidance.',
    weights: {
      distance: 1.5,
      time: 1.5,
      traffic: 0.0,
      hazard: 4.5,
      restriction: 1000,
    },
  },
];

/**
 * 2. NORMALIZE THE PARAMETERS
 * Configurable mappings between 0.0 and 1.0
 */
export const TRAFFIC_LEVEL_COST: Record<TrafficLevel, number> = {
  LOW: 0.0,
  MEDIUM: 0.5,
  HIGH: 1.0,
};

export const HAZARD_SEVERITY_COST: Record<HazardSeverity, number> = {
  SAFE: 0.0,
  WARNING: 0.3,
  CRITICAL: 0.7,
  BLOCKED: 1.0,
};

export interface NormalizationBounds {
  maxRelevantDistanceKm: number;
  maxRelevantTravelTimeMin: number;
}

export const DEFAULT_NORMALIZATION_BOUNDS: NormalizationBounds = {
  maxRelevantDistanceKm: 1000.0, // National / intercity highway corridor scale (1000 km)
  maxRelevantTravelTimeMin: 1440.0, // Full 24-hour travel time scale (1440 minutes = 24 hours)
};

/**
 * Dynamic normalization bound calculator
 * Ensures that even for ultra-long trips (e.g., 2000+ km or >24 hrs), values scale smoothly without saturation.
 */
export function getAdaptiveDistanceBound(distanceKm: number = 0): number {
  return Math.max(DEFAULT_NORMALIZATION_BOUNDS.maxRelevantDistanceKm, Math.ceil(distanceKm || 0));
}

export function getAdaptiveTimeBound(durationMinutes: number = 0): number {
  return Math.max(DEFAULT_NORMALIZATION_BOUNDS.maxRelevantTravelTimeMin, Math.ceil(durationMinutes || 0));
}

/**
 * Normalizes distance onto [0.0, 1.0] scale without premature saturation
 */
export function normalizeDistance(
  distanceKm: number,
  maxDistKm: number = DEFAULT_NORMALIZATION_BOUNDS.maxRelevantDistanceKm
): number {
  const safeBound = Math.max(0.1, maxDistKm);
  return Math.min(1.0, Math.max(0, distanceKm / safeBound));
}

/**
 * Normalizes travel time onto [0.0, 1.0] scale without premature saturation
 */
export function normalizeTravelTime(
  travelTimeMin: number,
  maxTimeMin: number = DEFAULT_NORMALIZATION_BOUNDS.maxRelevantTravelTimeMin
): number {
  const safeBound = Math.max(0.1, maxTimeMin);
  return Math.min(1.0, Math.max(0, travelTimeMin / safeBound));
}

/**
 * Normalizes vehicle type casing and aliases
 */
export function normalizeVehicleType(v?: string): StandardVehicleType {
  const upper = (v || 'CAR').trim().toUpperCase();
  if (upper === 'BIKE' || upper === 'MOTORCYCLE' || upper === 'TWO_WHEELER') return 'BIKE';
  if (upper === 'VAN' || upper === 'SUV' || upper === 'TEMPO') return 'VAN';
  if (upper === 'BUS') return 'BUS';
  if (upper === 'TRUCK' || upper === 'HEAVY') return 'TRUCK';
  return 'CAR';
}

/**
 * Traffic data disclaimer text
 */
export const VIRTUAL_TRAFFIC_DISCLAIMER = 'VIRTUAL MODE: Traffic data is simulated/test data.';
