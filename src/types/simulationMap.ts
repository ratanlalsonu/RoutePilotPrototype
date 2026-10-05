export interface StateNode {
  name: string;
  x: number; // Percentage 0 - 100
  y: number; // Percentage 0 - 100
  color?: string;
  isReferenceOnly?: boolean; // e.g. Delhi (not in 28 selectable list)
}

export interface RoadNode {
  id: string;
  name: string;
  x: number; // Percentage 0 - 100
  y: number; // Percentage 0 - 100
  isState?: boolean;
  stateName?: string;
}

export interface RoadEdge {
  id: string;
  from: string; // Node ID
  to: string;   // Node ID
  distance: number; // in km
  points: Array<{ x: number; y: number }>; // Normalized 0-100% road geometry points
  blocked: boolean;
  hazard: boolean;
  hazardType?: 'bridge' | 'road' | 'flood' | 'landslide' | 'construction';
  roadType?: 'expressway' | 'national_highway' | 'state_highway';
  speedPenalty?: number; // default 1.0
}

export interface RouteSegment {
  from: string;
  to: string;
  distance: number; // in km
  hazardous?: boolean;
  hazardType?: 'bridge' | 'road' | 'flood' | 'landslide' | 'construction';
}

export interface SimulationHazard {
  id: string;
  from: string;
  to: string;
  edgeId?: string;
  type: 'bridge' | 'road' | 'flood' | 'landslide' | 'construction';
  severity: 'low' | 'medium' | 'high';
  active: boolean;
  description?: string;
}

export interface SimulationRoute {
  source: string;
  destination: string;
  sourceNodeId: string;
  destinationNodeId: string;
  path: string[]; // State / node names
  nodeIds: string[]; // Sequence of node IDs
  edges: RoadEdge[];
  allPoints: Array<{ x: number; y: number }>; // Continuous sequence of road polyline points
  totalDistanceKm: number;
  estimatedMinutes: number;
  segments: {
    from: string;
    to: string;
    distance: number;
    isBlocked?: boolean;
  }[];
  isSafe: boolean;
  blockedSegment?: {
    from: string;
    to: string;
    edgeId?: string;
    hazardType: string;
  };
  blockedEdge?: RoadEdge;
  blockedPoints?: Array<{ x: number; y: number }>;
  alternatePath?: string[];
  alternateNodeIds?: string[];
  alternateEdges?: RoadEdge[];
  alternatePoints?: Array<{ x: number; y: number }>;
  alternateDistanceKm?: number;
}
