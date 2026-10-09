export type VehicleType = 'car' | 'bike' | 'van' | 'bus' | 'truck';

export type HazardType =
  | 'Road Construction'
  | 'Road Blockage'
  | 'Bridge Damage'
  | 'High Water Level'
  | 'Structural Vibration'
  | 'Excessive Tilt'
  | 'Excessive Displacement'
  | 'Excessive Strain'
  | 'Accident'
  | 'Other';

export type HazardSeverity = 'SAFE' | 'WARNING' | 'CRITICAL' | 'BLOCKED';

export type HazardSource = 'ADMIN' | 'LIVE_HARDWARE' | 'VIRTUAL_TEST' | 'DRIVER';

export interface Hazard {
  hazardId: string;
  type: HazardType;
  severity: HazardSeverity;
  latitude: number;
  longitude: number;
  locationName: string;
  roadName: string;
  affectedRadius: number; // in meters (e.g. 100m - 300m)
  description: string;
  source: HazardSource;
  status: 'ACTIVE' | 'RESOLVED' | 'DELETED';
  createdAt: string;
  resolvedAt?: string;
}

export interface SensorNode {
  id: string;
  name: string;
  location: string;
  type: 'Bridge North' | 'Bridge South' | 'City Road' | 'River Bank' | 'Old Bridge' | 'Highway';
  status: 'Online' | 'Offline';
  lat: number;
  lng: number;
  battery: number;
  lastReading: {
    vibrationMmS?: number;
    waterLevelM?: number;
    tiltDegrees?: number;
    strainMicrostrain?: number;
    updatedAt: string;
  };
}

export interface RouteStep {
  instruction: string;
  roadName: string;
  distanceMeters: number;
  durationSeconds: number;
  turnType?: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'u-turn' | 'arrive';
}

export interface AStarMetrics {
  gCost: number; // Actual path traversal cost g(n) (accumulated normalized parameters)
  hCost: number; // Admissible heuristic cost h(n) (straight-line distance to goal)
  hazardPenalty: number; // Penalty based on detected hazards / obstacles along path
  totalFCost: number; // f(n) = g(n) + h(n)
  rank: number; // 1 (optimal), 2, 3
  isOptimal: boolean;
  category?: 'OPTIMAL' | 'AVERAGE' | 'WORST';
  status: 'OPTIMAL' | 'ALTERNATIVE' | 'HAZARD_BLOCKED' | 'CAUTION';
  explanation: string;
  evaluatedNodesCount: number;
  costBreakdown?: {
    distanceCost: number;
    timeCost: number;
    trafficCost: number;
    hazardCost: number;
    restrictionCost: number;
  };
  hazardsAvoided?: string[];
  blockedRoadsAvoided?: string[];
  trafficSummary?: string;
  weightsUsed?: {
    distance: number;
    time: number;
    traffic: number;
    hazard: number;
    restriction: number;
  };
}

export interface RouteOption {
  id: string;
  name: string; // e.g. "Optimal Route", "Average Route", "Worst Route"
  category?: 'OPTIMAL' | 'AVERAGE' | 'WORST';
  color: string;
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][]; // [lat, lng]
  viaRoads: string[];
  isRecommended?: boolean;
  maneuver?: {
    instruction: string;
    distanceMeters: number;
    icon?: string;
    turnType?: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'u-turn' | 'arrive';
  };
  steps?: RouteStep[];
  aStarMetrics?: AStarMetrics;
}

export type RouteDiversionState =
  | 'IDLE'
  | 'ROUTE_ACTIVE'
  | 'HAZARD_DETECTED'
  | 'WAITING_FOR_USER_CONFIRMATION'
  | 'CALCULATING_ALTERNATIVES'
  | 'ALTERNATIVES_DISPLAYED'
  | 'DRIVER_ENTERING_ALTERNATIVE'
  | 'NEW_ROUTE_ACTIVE'
  | 'OFF_ROUTE'
  | 'ARRIVED'
  | 'JOURNEY_ENDED';

export interface Journey {
  journeyId: string;
  driverId: string;
  driverName: string;
  vehicleType: VehicleType;
  origin: {
    name: string;
    lat: number;
    lng: number;
  };
  destination: {
    name: string;
    lat: number;
    lng: number;
  };
  currentLocation: {
    lat: number;
    lng: number;
    heading: number; // degrees 0-360
    pointIndex: number;
  };
  currentSpeedKmh: number;
  activeRouteId: string;
  activeRoute: RouteOption | null;
  alternativeRoutes: RouteOption[];
  diversionState: RouteDiversionState;
  detectedHazard: Hazard | null;
  handledHazardIds: string[];
  diversionCount: number;
  hazardsEncounteredCount: number;
  totalDistanceKm: number;
  remainingDistanceKm: number;
  remainingDurationMinutes: number;
  progressPercent: number;
  eta: string;
  status: 'IDLE' | 'ON_ROUTE' | 'DIVERTED' | 'ARRIVED' | 'PAUSED';
  isNavigating: boolean;
  isSimulating: boolean;
  simulationSpeed: number; // multiplier e.g. 1x, 2x, 4x
  progressMeters?: number; // cumulative distance traveled in meters along active route
  startedAt: string;
  completedAt?: string;
}

export interface RouteEvent {
  id: string;
  time: string;
  event: string;
  driver: string;
  status: 'Success' | 'Triggered' | 'In Progress' | 'Active' | 'Warning' | 'Info';
  details?: string;
}

export interface RoadStatusItem {
  roadName: string;
  status: 'Open' | 'Warning' | 'Restricted' | 'Blocked';
  affectedByHazardId?: string;
  hazardType?: string;
}

export interface SystemHealth {
  mapService: 'Online' | 'Offline';
  routingService: 'Online' | 'Offline';
  database: 'Connected' | 'Offline';
  realtimeSync: 'Online' | 'Offline';
  sensorNetwork: '5 / 6 Online' | 'Online' | 'Offline';
  apiServer: 'Online' | 'Offline';
}

export interface AcademicInfo {
  projectTitle: string;
  degree: string;
  department: string;
  collegeName: string;
  studentName: string;
  rollNumber: string;
  guideName: string;
  batch: string;
}

export type AppThemeMode = 'dark' | 'light';
export type MapStyleMode = 'standard' | 'dark' | 'satellite' | 'terrain';

export interface AppSettings {
  language: 'en' | 'hi';
  appTheme: AppThemeMode;
  mapStyle: MapStyleMode;
  voiceEnabled: boolean;
  sensorMode: 'VIRTUAL' | 'HARDWARE';
  esp32Endpoint: string;
  esp32DeviceId: string;
  esp32Connected: boolean;
  googleMapsApiKey?: string;
  placesApiKey?: string;
  useDedicatedPlacesKey?: boolean;
  routingApiKey?: string;
  routeCommitThresholdMeters: number;
  minimumProgressMeters: number;
  mapProvider: 'Google Maps' | 'OpenStreetMap' | 'CartoDark' | 'EsriSatellite';
  mapTheme: 'standard' | 'dark' | 'satellite';
  academicInfo?: AcademicInfo;
}
