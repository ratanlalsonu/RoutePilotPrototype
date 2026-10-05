import { RouteStep, VehicleType, Hazard } from './index';

/**
 * Represents an intersection, junction, or endpoint in the real road network.
 */
export interface RoadNode {
  id: string; // Unique identifier: e.g. "rn_25.44840_78.56850" or OSM node id
  lat: number;
  lng: number;
  name?: string;
  isIntersection?: boolean;
  adjacentEdgeIds: string[];
}

/**
 * Represents a directed real road segment connecting two road nodes.
 * Contains the dense OpenStreetMap road centerline geometry coordinates.
 */
export interface RoadEdge {
  id: string; // Unique identifier: e.g. "e_rn1_rn2"
  fromNodeId: string;
  toNodeId: string;
  roadName: string;
  distanceMeters: number;
  baseDurationSeconds: number;
  speedLimitKmh: number;
  // Dense polyline coordinates along the actual road [lat, lng]
  geometry: [number, number][];
  // Dynamic cost factors
  hazardPenalty: number;
  isBlocked: boolean;
  affectedHazardId?: string;
  // Turn navigation metadata
  turnType?: RouteStep['turnType'];
  instruction?: string;
}

/**
 * Represents the road network graph structure:
 * NODE -> ROAD EDGE -> NODE
 */
export interface RoadGraph {
  nodes: Map<string, RoadNode>;
  adjacency: Map<string, RoadEdge[]>; // nodeId -> outgoing edges
  edges: Map<string, RoadEdge>;
}

/**
 * Search options passed to the A* graph search engine
 */
export interface AStarSearchParams {
  startNodeId: string;
  goalNodeId: string;
  vehicleType: VehicleType;
  // Optional edge ID penalties to force alternative branch selection (e.g. for Route B and Route C)
  edgePenalties?: Map<string, number>;
  // Disallowed edge IDs (e.g. blocked by critical hazards)
  disallowedEdgeIds?: Set<string>;
  // Active hazards to evaluate against during traversal
  activeHazards?: Hazard[];
}

/**
 * Outcome of an A* graph search traversal on the real road network
 */
export interface AStarSearchResult {
  success: boolean;
  pathNodes: RoadNode[];
  pathEdges: RoadEdge[];
  // Continuous real-road polyline coordinates concatenated from all selected road edges
  fullGeometry: [number, number][];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  // A* mathematical metrics
  accumulatedGCost: number; // g(Goal)
  heuristicHCost: number;   // h(Start)
  hazardPenaltyCost: number; // Sum of hazard penalties along path
  totalFCost: number;       // f(Goal) = g(Goal) + HazardPenalty
  evaluatedNodesCount: number;
  stepLogs: Array<{
    step: number;
    title: string;
    formula: string;
    details: string;
    status: 'info' | 'success' | 'warning' | 'danger';
  }>;
  errorMessage?: string;
}
