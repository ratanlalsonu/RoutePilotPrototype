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
  distance: 1.0,     // Wd
  time: 1.5,         // Wt
  traffic: 2.0,      // Wc
  hazard: 5.0,       // Wh - Safety Priority
  restriction: 1000, // Wr - Heavy penalty / blocker
};

/**
 * Weighting strategies for user tuning and college presentation demos
 */
export const WEIGHT_PRESETS: WeightPreset[] = [
  {
    id: 'safety_priority',
    name: 'Safety Priority (Default)',
    description: 'Heavily penalizes hazards and high traffic. Diverts away from risks.',
    weights: {
      distance: 1.0,
      time: 1.5,
      traffic: 2.0,
      hazard: 5.0,
      restriction: 1000,
    },
  },
  {
    id: 'fastest_time',
    name: 'Fastest Travel Time',
    description: 'Prioritizes travel duration and smooth highway flow.',
    weights: {
      distance: 0.6,
      time: 3.0,
      traffic: 2.5,
      hazard: 4.0,
      restriction: 1000,
    },
  },
  {
    id: 'shortest_distance',
    name: 'Shortest Distance',
    description: 'Minimizes physical kilometers while respecting critical blockages.',
    weights: {
      distance: 3.0,
      time: 1.0,
      traffic: 1.0,
      hazard: 3.5,
      restriction: 1000,
    },
  },
  {
    id: 'balanced',
    name: 'Balanced Multi-Objective',
    description: 'Equally balances distance, time, traffic, and hazard avoidance.',
    weights: {
      distance: 1.2,
      time: 1.6,
      traffic: 1.8,
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
  maxRelevantDistanceKm: 25.0,  // Standard local/regional segment corridor max
  maxRelevantTravelTimeMin: 45.0, // Standard segment corridor max minutes
};

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
