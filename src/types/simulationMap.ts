export interface StateNode {
  name: string;
  x: number; // Percentage 0 - 100
  y: number; // Percentage 0 - 100
  color?: string;
  isReferenceOnly?: boolean; // e.g. Delhi (not in 28 selectable list)
}

export interface RouteSegment {
  from: string;
  to: string;
  distance: number; // in km
  hazardous?: boolean;
  hazardType?: 'bridge' | 'road' | 'flood' | 'construction';
}

export interface SimulationHazard {
  id: string;
  from: string;
  to: string;
  type: 'bridge' | 'road' | 'flood' | 'construction';
  severity: 'low' | 'medium' | 'high';
  active: boolean;
  description?: string;
}

export interface SimulationRoute {
  source: string;
  destination: string;
  path: string[];
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
    hazardType: string;
  };
  alternatePath?: string[];
  alternateDistanceKm?: number;
}
