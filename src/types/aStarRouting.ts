/**
 * Type Definitions for RoutePilot A* Pathfinding and Road Graph Engine
 */

import {
  StandardVehicleType,
  TrafficLevel,
  HazardSeverity,
  RoadStatus,
  RouteWeights,
} from '../algorithms/aStarConfig';

/**
 * 1. ROAD GRAPH: NODE
 * Represents an intersection, junction, or endpoint
 */
export interface AStarRoadNode {
  id: string;             // e.g. "N1", "Sadar_Crossing"
  name: string;           // Human-readable junction name
  lat: number;
  lng: number;
  x?: number;             // Optional normalized SVG/Canvas coordinate (0-100%)
  y?: number;
  isIntersection?: boolean;
}

/**
 * 1. ROAD GRAPH: EDGE
 * Represents a directed road segment connecting two nodes
 */
export interface AStarRoadEdge {
  edgeId: string;               // e.g. "R12"
  fromNode: string;             // e.g. "N1"
  toNode: string;               // e.g. "N2"
  distance: number;             // In kilometers (km)
  estimatedTravelTime: number;  // In minutes (min)
  trafficLevel: TrafficLevel;   // "LOW" | "MEDIUM" | "HIGH"
  trafficCost: number;          // Normalized 0.0 - 1.0 (or custom)
  hazardSeverity: HazardSeverity; // "SAFE" | "WARNING" | "CRITICAL" | "BLOCKED"
  hazardCost: number;           // Normalized 0.0 - 1.0 (or custom)
  vehicleAllowed: boolean;      // Whether selected vehicle is allowed
  allowedVehicles?: StandardVehicleType[]; // Explicit vehicle whitelist if applicable
  restrictionCost: number;      // 0 if allowed, Infinity if disallowed
  roadStatus: RoadStatus;       // "OPEN" | "BLOCKED"
  roadName?: string;            // Descriptive road name (e.g. "Outer Ring Bypass")
  geometry?: [number, number][]; // Lat/Lng polyline points along actual road
  points?: { x: number; y: number }[]; // Canvas points
  affectedHazardId?: string;
  speedLimitKmh?: number;
}

/**
 * Weighted Road Graph
 */
export interface AStarRoadGraph {
  nodes: Map<string, AStarRoadNode>;
  adjacency: Map<string, AStarRoadEdge[]>; // fromNode -> outgoing edges
  edges: Map<string, AStarRoadEdge>;
}

/**
 * Step trace item for college presentation demonstration
 * 12. A* TRACE / DEBUG INFORMATION
 */
export interface AStarTraceStep {
  step: number;
  nodeId: string;
  nodeName: string;
  g: number;
  h: number;
  f: number;
  previousNodeId: string | null;
  previousNodeName: string | null;
  edgeCost: number;
  edgeId?: string;
  explanation: string;
  costBreakdown?: {
    distanceCost: number;
    timeCost: number;
    trafficCost: number;
    hazardCost: number;
    restrictionCost: number;
  };
}

/**
 * 11. ROUTE RESULT
 * Complete return structure from A* pathfinding
 */
export interface AStarRouteResult {
  algorithm: 'A*';
  source: string;
  destination: string;
  vehicleType: string;
  path: string[];                 // Array of Node Names
  nodeSequence: string[];         // Array of Node IDs
  pathEdges: AStarRoadEdge[];
  fullGeometry: [number, number][]; // Real road polyline coordinates
  totalDistance: number;          // In km
  estimatedTime: number;          // In minutes
  totalCost: number;              // Accumulated g(Goal)
  nodesEvaluated: number;
  hazardsAvoided: string[];
  blockedRoadsAvoided: string[];
  trafficSummary: TrafficLevel | string;
  costBreakdown: {
    distanceCost: number;
    timeCost: number;
    trafficCost: number;
    hazardCost: number;
    restrictionCost: number;
  };
  trace: AStarTraceStep[];
  success: boolean;
  weightsUsed: RouteWeights;
  errorMessage?: string;
}

/**
 * Options for running A*
 */
export interface AStarExecutionOptions {
  startNodeId: string;
  goalNodeId: string;
  vehicleType?: string; // CAR | BIKE | VAN
  weights?: RouteWeights;
  maxDistanceKm?: number;
  maxTravelTimeMin?: number;
  edgePenalties?: Map<string, number>;
  disallowedEdgeIds?: Set<string>;
}
