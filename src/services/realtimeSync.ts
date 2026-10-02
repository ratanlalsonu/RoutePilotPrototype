import {
  Hazard,
  SensorNode,
  Journey,
  RouteEvent,
  RoadStatusItem,
  SystemHealth,
  AppSettings,
  RouteOption,
} from '../types';
import {
  JHANSI_DIRECT_ROUTE_COORDS,
  calculatePolylineDistanceKm,
  calculateAlternativeRoutes,
  fetchOSRMRoute,
  generateSyntheticSteps,
} from './routingService';
import {
  hazardAffectsRoute,
  calculateBearing,
  getDistanceMeters,
} from '../algorithms/hazardRouteIntersection';
import { VoiceService } from './voiceService';

const CHANNEL_NAME = 'routepilot_sync_channel';
const STORAGE_KEY = 'routepilot_shared_state_v4_nodummy';

export interface RoutePilotState {
  hazards: Hazard[];
  sensorNodes: SensorNode[];
  journey: Journey;
  routeEvents: RouteEvent[];
  roadStatuses: RoadStatusItem[];
  systemHealth: SystemHealth;
  appSettings: AppSettings;
  activeMode: 'admin' | 'driver';
}

// Zero dummy data baseline - live sensors populate from ESP32/IoT hardware or Admin virtual triggers
const INITIAL_SENSORS: SensorNode[] = [];

// Zero dummy hazards - hazards only exist when created by Admin or reported by live hardware
const INITIAL_HAZARDS: Hazard[] = [];

// Dynamic road statuses - updated dynamically based on real active hazards
const INITIAL_ROAD_STATUSES: RoadStatusItem[] = [];

const INITIAL_ROUTE_EVENTS: RouteEvent[] = [
  {
    id: 'ev-init',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    event: 'RoutePilot Live Engine Initialized',
    driver: 'SYSTEM',
    status: 'Success',
    details: 'Zero dummy data in Admin and Driver modes. Ready for live GPS & destination search.',
  },
];

// Clean Initial Journey with NO dummy destination or fake pre-set telemetry
const INITIAL_JOURNEY: Journey = {
  journeyId: 'JRN-1001',
  driverId: 'DVR-001',
  driverName: 'Driver 01',
  vehicleType: 'car',
  origin: {
    name: 'Current Device Location (Jhansi City)',
    lat: 25.4484,
    lng: 78.5685,
  },
  destination: {
    name: '',
    lat: 0,
    lng: 0,
  },
  currentLocation: {
    lat: 25.4484,
    lng: 78.5685,
    heading: 0,
    pointIndex: 0,
  },
  currentSpeedKmh: 0,
  activeRouteId: '',
  activeRoute: null,
  alternativeRoutes: [],
  diversionState: 'IDLE',
  detectedHazard: null,
  handledHazardIds: [],
  diversionCount: 0,
  hazardsEncounteredCount: 0,
  totalDistanceKm: 0,
  remainingDistanceKm: 0,
  remainingDurationMinutes: 0,
  progressPercent: 0,
  eta: '--:--',
  status: 'IDLE',
  isNavigating: false,
  isSimulating: false,
  simulationSpeed: 1,
  startedAt: '',
};

function getInitialState(): RoutePilotState {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.hazards && parsed.journey) {
          if (parsed.appSettings && parsed.appSettings.mapTheme !== 'satellite') {
            parsed.appSettings.mapTheme = 'standard';
          }
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
  }

  const storedApiKey =
    (typeof window !== 'undefined' ? localStorage.getItem('routepilot_gmaps_api_key') : null) ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
    '';

  const rawStoredTheme = typeof window !== 'undefined' ? localStorage.getItem('routepilot_map_theme') : null;
  const storedMapTheme: 'standard' | 'satellite' = rawStoredTheme === 'satellite' ? 'satellite' : 'standard';

  return {
    hazards: INITIAL_HAZARDS,
    sensorNodes: INITIAL_SENSORS,
    journey: INITIAL_JOURNEY,
    routeEvents: INITIAL_ROUTE_EVENTS,
    roadStatuses: INITIAL_ROAD_STATUSES,
    systemHealth: {
      mapService: 'Online',
      routingService: 'Online',
      database: 'Connected',
      realtimeSync: 'Online',
      sensorNetwork: 'Online',
      apiServer: 'Online',
    },
    appSettings: {
      language: 'en',
      voiceEnabled: true,
      sensorMode: 'HARDWARE',
      esp32Endpoint: 'http://192.168.1.100:80/api/sensor',
      esp32DeviceId: 'ESP32-NODE-01',
      esp32Connected: false,
      googleMapsApiKey: storedApiKey,
      routeCommitThresholdMeters: 60,
      minimumProgressMeters: 25,
      mapProvider: 'OpenStreetMap',
      mapTheme: storedMapTheme,
    },
    activeMode: 'admin',
  };
}

class RealtimeSyncManager {
  private state: RoutePilotState;
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(state: RoutePilotState) => void> = new Set();
  private simulationTimer: any = null;

  constructor() {
    this.state = getInitialState();

    if (typeof window !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_STATE') {
            this.state = event.data.state;
            this.notify();
          }
        };
      } catch {
        // Fallback for environments where BroadcastChannel is blocked
      }

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            this.state = JSON.parse(e.newValue);
            this.notify();
          } catch {
            // ignore
          }
        }
      });
    }

    // Start simulation clock
    this.startSimulationLoop();
  }

  public getState(): RoutePilotState {
    return this.state;
  }

  public subscribe(callback: (state: RoutePilotState) => void): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(broadcast: boolean = true) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        if (broadcast && this.channel) {
          this.channel.postMessage({ type: 'SYNC_STATE', state: this.state });
        }
      } catch {
        // ignore quota error
      }
    }
    this.listeners.forEach((cb) => cb(this.state));
  }

  public setActiveMode(mode: 'admin' | 'driver') {
    this.state.activeMode = mode;
    this.notify();
  }

  public updateSettings(partial: Partial<AppSettings>) {
    this.state.appSettings = { ...this.state.appSettings, ...partial };
    if (partial.language) VoiceService.setLanguage(partial.language);
    if (partial.voiceEnabled !== undefined) VoiceService.setEnabled(partial.voiceEnabled);
    if (partial.mapTheme && typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_map_theme', partial.mapTheme);
      } catch {}
    }
    this.notify();
  }

  public toggleMapTheme(): 'standard' | 'satellite' {
    const nextTheme: 'standard' | 'satellite' =
      this.state.appSettings.mapTheme === 'satellite' ? 'standard' : 'satellite';
    this.state.appSettings.mapTheme = nextTheme;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_map_theme', nextTheme);
      } catch {}
    }
    this.notify();
    return nextTheme;
  }

  public setMapTheme(theme: 'standard' | 'satellite') {
    this.state.appSettings.mapTheme = theme;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_map_theme', theme);
      } catch {}
    }
    this.notify();
  }

  /**
   * ADMIN: Create hazard at ANY location
   */
  public createHazard(hazardData: {
    type: Hazard['type'];
    severity: Hazard['severity'];
    latitude: number;
    longitude: number;
    locationName: string;
    roadName: string;
    affectedRadius: number;
    description: string;
    source?: Hazard['source'];
  }): Hazard {
    const hazardId = `H${String(this.state.hazards.length + 1).padStart(3, '0')}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newHazard: Hazard = {
      hazardId,
      type: hazardData.type,
      severity: hazardData.severity,
      latitude: hazardData.latitude,
      longitude: hazardData.longitude,
      locationName: hazardData.locationName,
      roadName: hazardData.roadName,
      affectedRadius: hazardData.affectedRadius || 180,
      description: hazardData.description || 'Hazard detected by system',
      source: hazardData.source || 'ADMIN',
      status: 'ACTIVE',
      createdAt: nowTime,
    };

    this.state.hazards = [newHazard, ...this.state.hazards];

    // Log admin creation event
    this.addRouteEvent({
      time: nowTime,
      event: `Hazard ${hazardId} created (${hazardData.type})`,
      driver: 'ADMIN',
      status: 'Active',
      details: `${hazardData.locationName} [Radius: ${newHazard.affectedRadius}m]`,
    });

    // Update road statuses
    this.updateRoadStatusForHazard(newHazard);

    // CRITICAL REQUIREMENT:
    // "Hazard does NOT automatically affect every driver!
    // Only affects driver if it affects that driver's CURRENT ACTIVE ROUTE."
    this.checkHazardAgainstActiveRoute(newHazard);

    this.notify();
    return newHazard;
  }

  /**
   * Resolves a hazard
   */
  public resolveHazard(hazardId: string) {
    const hazard = this.state.hazards.find((h) => h.hazardId === hazardId);
    if (!hazard) return;

    hazard.status = 'RESOLVED';
    hazard.resolvedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update road status
    this.state.roadStatuses = this.state.roadStatuses.map((rs) =>
      rs.affectedByHazardId === hazardId ? { ...rs, status: 'Open', affectedByHazardId: undefined } : rs
    );

    this.addRouteEvent({
      time: hazard.resolvedAt,
      event: `Hazard ${hazardId} resolved`,
      driver: 'ADMIN',
      status: 'Success',
      details: `${hazard.locationName} cleared for normal traffic`,
    });

    // If active driver was blocked by this specific hazard, clear detected alert
    if (this.state.journey.detectedHazard?.hazardId === hazardId) {
      this.state.journey.detectedHazard = null;
      if (this.state.journey.diversionState === 'HAZARD_DETECTED' || this.state.journey.diversionState === 'WAITING_FOR_USER_CONFIRMATION') {
        this.state.journey.diversionState = 'ROUTE_ACTIVE';
      }
    }

    this.notify();
  }

  public deleteHazard(hazardId: string) {
    this.state.hazards = this.state.hazards.filter((h) => h.hazardId !== hazardId);
    this.notify();
  }

  /**
   * Checks if a hazard intersects the active route and notifies the driver if it does!
   */
  public checkHazardAgainstActiveRoute(hazard: Hazard) {
    const j = this.state.journey;
    if (!j.activeRoute || j.status !== 'ON_ROUTE') return;

    // Check if already handled
    if (j.handledHazardIds.includes(hazard.hazardId)) return;

    const { affects, minDistanceMeters, segmentIndex, aheadOfDriver } = hazardAffectsRoute(
      hazard,
      j.activeRoute.coordinates,
      j.currentLocation.pointIndex
    );

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (affects && aheadOfDriver) {
      // HAZARD INTERSECTS ROUTE!
      this.addRouteEvent({
        time: nowTime,
        event: `Hazard ${hazard.hazardId} intersects ${j.driverId} route`,
        driver: j.driverId,
        status: 'Triggered',
        details: `Distance to hazard: ${minDistanceMeters}m near ${hazard.locationName}`,
      });

      j.detectedHazard = hazard;
      j.diversionState = 'HAZARD_DETECTED';
      j.hazardsEncounteredCount += 1;

      // Voice notification to driver
      VoiceService.notifyHazardDetected(hazard.type, hazard.locationName);
    } else {
      // Hazard does not affect current route
      this.addRouteEvent({
        time: nowTime,
        event: `Hazard ${hazard.hazardId} cleared (not on active route)`,
        driver: 'SYSTEM',
        status: 'Info',
        details: `Location ${hazard.locationName} does not intersect current ${j.activeRoute.name}`,
      });
    }
  }

  /**
   * Driver clicks "OK - FIND ALTERNATE ROUTES"
   * Calculates multiple optimal routes directly on map without requiring select buttons!
   */
  public async handleDriverConfirmFindAlternates() {
    const j = this.state.journey;
    if (!j.detectedHazard || !j.activeRoute) return;

    j.diversionState = 'CALCULATING_ALTERNATIVES';
    this.notify();

    const currentCoords: [number, number] = [j.currentLocation.lat, j.currentLocation.lng];

    // Calculate multiple optimal bypass routes from CURRENT LOCATION to ORIGINAL DESTINATION
    const alternatives = await calculateAlternativeRoutes(
      currentCoords[0],
      currentCoords[1],
      j.destination,
      j.detectedHazard
    );

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    j.alternativeRoutes = alternatives;
    j.diversionState = 'ALTERNATIVES_DISPLAYED';
    j.handledHazardIds = [...j.handledHazardIds, j.detectedHazard.hazardId];

    this.addRouteEvent({
      time: nowTime,
      event: 'Alternative routes generated on map',
      driver: j.driverId,
      status: 'Success',
      details: `${alternatives.length} optimal routes calculated from current position (no select button needed)`,
    });

    VoiceService.notifyAlternativesDisplayed(alternatives.length);
    this.notify();
  }

  /**
   * Driver commits to a route by vehicle movement onto it
   * (Once vehicle enters Route B, all other alternatives disappear!)
   */
  public commitToAlternateRoute(selectedRouteId: string) {
    const j = this.state.journey;
    const chosenRoute = j.alternativeRoutes.find((r) => r.id === selectedRouteId);
    if (!chosenRoute) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Transition state
    j.activeRouteId = chosenRoute.id;
    j.activeRoute = chosenRoute;
    j.alternativeRoutes = []; // ALL OTHER ALTERNATIVES DISAPPEAR!
    j.detectedHazard = null;
    j.diversionState = 'NEW_ROUTE_ACTIVE';
    j.diversionCount += 1;
    j.status = 'DIVERTED';

    // Reset vehicle index to beginning of this new route
    j.currentLocation.pointIndex = 0;
    if (chosenRoute.coordinates.length > 0) {
      j.currentLocation.lat = chosenRoute.coordinates[0][0];
      j.currentLocation.lng = chosenRoute.coordinates[0][1];
    }

    this.addRouteEvent({
      time: nowTime,
      event: `Driver entered ${chosenRoute.name}`,
      driver: j.driverId,
      status: 'Success',
      details: `${chosenRoute.name} became ACTIVE route (${chosenRoute.distanceKm} km, ${chosenRoute.durationMinutes} min). Previous alternatives removed.`,
    });

    VoiceService.notifyNewRouteActive(chosenRoute.name);

    setTimeout(() => {
      if (this.state.journey.diversionState === 'NEW_ROUTE_ACTIVE') {
        this.state.journey.diversionState = 'ROUTE_ACTIVE';
        this.notify();
      }
    }, 2000);

    this.notify();
  }

  /**
   * Advance vehicle movement along route
   */
  public advanceVehicle(stepFraction: number = 1) {
    const j = this.state.journey;
    if (!j.isNavigating || !j.activeRoute || j.activeRoute.coordinates.length < 2) return;

    const coords = j.activeRoute.coordinates;
    const totalPoints = coords.length;
    const currentIndex = j.currentLocation.pointIndex;

    // Check if reached destination
    if (currentIndex >= totalPoints - 1) {
      if (j.status !== 'ARRIVED') {
        j.status = 'ARRIVED';
        j.diversionState = 'ARRIVED';
        j.isNavigating = false;
        j.progressPercent = 100;
        j.remainingDistanceKm = 0;
        j.remainingDurationMinutes = 0;
        j.currentSpeedKmh = 0;

        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.addRouteEvent({
          time: nowTime,
          event: 'Driver arrived at destination',
          driver: j.driverId,
          status: 'Success',
          details: `Safely reached ${j.destination.name}`,
        });

        VoiceService.notifyArrived(j.destination.name);
        this.notify();
      }
      return;
    }

    // Move to next point
    const nextIndex = Math.min(totalPoints - 1, currentIndex + 1);
    const currCoord = coords[currentIndex];
    const nextCoord = coords[nextIndex];

    const heading = calculateBearing(currCoord[0], currCoord[1], nextCoord[0], nextCoord[1]);

    j.currentLocation = {
      lat: nextCoord[0],
      lng: nextCoord[1],
      heading,
      pointIndex: nextIndex,
    };

    // Calculate remaining distance and progress
    const remainingCoords = coords.slice(nextIndex);
    const remainingKm = calculatePolylineDistanceKm(remainingCoords);
    j.remainingDistanceKm = remainingKm;
    j.remainingDurationMinutes = Math.max(1, Math.round(remainingKm * 2.1));
    j.progressPercent = Math.min(99, Math.round((nextIndex / (totalPoints - 1)) * 100));

    // If alternatives are currently displayed, check if vehicle moved closer/onto one of them
    if (j.diversionState === 'ALTERNATIVES_DISPLAYED' && j.alternativeRoutes.length > 0) {
      // Natural movement commitment: if vehicle passes or heads towards Route B, commit to it
      // Automatically commit to Route B after 2 steps or proximity
      if (nextIndex > 2) {
        this.commitToAlternateRoute(j.alternativeRoutes[0].id);
        return;
      }
    }

    // Continuously check active hazards ahead on route
    if (j.diversionState === 'ROUTE_ACTIVE' && !j.detectedHazard) {
      for (const h of this.state.hazards) {
        if (h.status === 'ACTIVE' && !j.handledHazardIds.includes(h.hazardId)) {
          const { affects, aheadOfDriver } = hazardAffectsRoute(h, coords, nextIndex);
          if (affects && aheadOfDriver) {
            this.checkHazardAgainstActiveRoute(h);
            break;
          }
        }
      }
    }

    this.notify(false); // local update
  }

  private startSimulationLoop() {
    if (this.simulationTimer) clearInterval(this.simulationTimer);

    const speed = this.state.journey.simulationSpeed || 1;
    const intervalMs = Math.max(350, Math.round(2800 / speed));

    this.simulationTimer = setInterval(() => {
      if (this.state.journey.isNavigating && this.state.journey.isSimulating) {
        // Only advance if not waiting for user confirmation
        if (
          this.state.journey.diversionState === 'ROUTE_ACTIVE' ||
          this.state.journey.diversionState === 'NEW_ROUTE_ACTIVE'
        ) {
          this.advanceVehicle(1);
        }
      }
    }, intervalMs);
  }

  public setSimulationSpeed(speed: number) {
    this.state.journey.simulationSpeed = speed;
    this.startSimulationLoop();
    this.notify();
  }

  public setSimulating(isSimulating: boolean) {
    this.state.journey.isSimulating = isSimulating;
    this.notify();
  }

  public setNavigating(isNavigating: boolean) {
    if (isNavigating) {
      if (!this.state.journey.destination || !this.state.journey.destination.name) {
        this.state.journey.isNavigating = false;
        this.notify();
        return;
      }
      this.state.journey.isNavigating = true;
      this.state.journey.status = 'ON_ROUTE';
      this.state.journey.diversionState = 'ROUTE_ACTIVE';
      this.state.journey.isSimulating = true;
      this.state.journey.currentSpeedKmh = 45;
      if (!this.state.journey.startedAt) {
        this.state.journey.startedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      this.addRouteEvent({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        event: 'Navigation Started',
        driver: this.state.journey.driverId,
        status: 'In Progress',
        details: `En route to ${this.state.journey.destination.name}`,
      });
      VoiceService.speak(
        `Navigation started to ${this.state.journey.destination.name}. Drive safely.`,
        `यात्रा शुरू हुई। ${this.state.journey.destination.name} की ओर सुरक्षित ड्राइव करें।`
      );
    } else {
      this.state.journey.isNavigating = false;
      this.state.journey.currentSpeedKmh = 0;
      this.state.journey.isSimulating = false;
      VoiceService.speak('Navigation paused.', 'यात्रा रोक दी गई है।');
    }
    this.notify();
  }

  public stopNavigation() {
    this.state.journey.isNavigating = false;
    this.state.journey.isSimulating = false;
    this.state.journey.currentSpeedKmh = 0;
    this.state.journey.status = 'IDLE';
    this.state.journey.progressPercent = 0;
    this.state.journey.currentLocation.pointIndex = 0;
    if (this.state.journey.activeRoute && this.state.journey.activeRoute.coordinates.length > 0) {
      this.state.journey.currentLocation.lat = this.state.journey.activeRoute.coordinates[0][0];
      this.state.journey.currentLocation.lng = this.state.journey.activeRoute.coordinates[0][1];
    }
    this.notify();
  }

  public reportHazardFromDriver(data: {
    type: Hazard['type'];
    severity: Hazard['severity'];
    description: string;
    roadName?: string;
  }): Hazard {
    const j = this.state.journey;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const hazardId = `H${String(this.state.hazards.length + 1).padStart(3, '0')}`;
    const roadName = data.roadName || j.activeRoute?.viaRoads[0] || 'Active Corridor';
    const locationName = `Reported near ${j.currentLocation.lat.toFixed(4)}, ${j.currentLocation.lng.toFixed(4)}`;

    const newHazard: Hazard = {
      hazardId,
      type: data.type,
      severity: data.severity,
      latitude: j.currentLocation.lat,
      longitude: j.currentLocation.lng,
      locationName,
      roadName,
      affectedRadius: 200,
      description: data.description || 'Reported live by driver',
      source: 'DRIVER',
      status: 'ACTIVE',
      createdAt: nowTime,
    };

    this.state.hazards = [newHazard, ...this.state.hazards];
    this.addRouteEvent({
      time: nowTime,
      event: `Driver reported hazard: ${data.type}`,
      driver: j.driverId,
      status: 'Triggered',
      details: `${data.description} at ${roadName}`,
    });

    this.updateRoadStatusForHazard(newHazard);
    this.checkHazardAgainstActiveRoute(newHazard);
    this.notify();
    return newHazard;
  }

  public setVehicleType(vehicleType: Journey['vehicleType']) {
    this.state.journey.vehicleType = vehicleType;
    this.notify();
  }

  public async setDestination(dest: { name: string; lat: number; lng: number }) {
    this.state.journey.destination = dest;
    this.state.journey.alternativeRoutes = [];
    this.state.journey.status = 'IDLE';
    this.state.journey.diversionState = 'IDLE';
    this.state.journey.progressPercent = 0;
    this.state.journey.currentSpeedKmh = 0;

    const origin = this.state.journey.origin;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Live OSRM calculation for the selected destination
    const osrm = await fetchOSRMRoute(origin.lat, origin.lng, dest.lat, dest.lng);

    let coordinates: [number, number][] = osrm?.coordinates || [];
    let distanceKm: number = osrm?.distanceKm || 0;
    let durationMin: number = osrm?.durationMin || 0;
    let steps = osrm?.steps;

    if (!coordinates || coordinates.length < 2) {
      // Reliable fallback interpolation
      const pts: [number, number][] = [];
      const numPts = 14;
      for (let i = 0; i <= numPts; i++) {
        const frac = i / numPts;
        const lat = origin.lat + (dest.lat - origin.lat) * frac;
        const lng = origin.lng + (dest.lng - origin.lng) * frac;
        pts.push([parseFloat(lat.toFixed(5)), parseFloat(lng.toFixed(5))]);
      }
      coordinates = pts;
      distanceKm = calculatePolylineDistanceKm(pts);
      durationMin = Math.max(2, Math.round(distanceKm * 2.1));
      steps = generateSyntheticSteps('Active Route', ['City Arterial Corridor'], distanceKm, dest.name);
    }

    if (!steps || steps.length === 0) {
      steps = generateSyntheticSteps('Active Route', ['Live Road Network'], distanceKm, dest.name);
    }

    const activeRoute: RouteOption = {
      id: `route_${Date.now()}`,
      name: `Route to ${dest.name}`,
      color: '#2563eb',
      distanceKm,
      durationMinutes: durationMin,
      coordinates,
      viaRoads: ['Live Road Network'],
      isRecommended: true,
      maneuver: {
        instruction: `Head toward ${dest.name}`,
        distanceMeters: Math.round(distanceKm * 180),
      },
      steps,
    };

    this.state.journey.activeRoute = activeRoute;
    this.state.journey.activeRouteId = activeRoute.id;
    this.state.journey.totalDistanceKm = distanceKm;
    this.state.journey.remainingDistanceKm = distanceKm;
    this.state.journey.remainingDurationMinutes = durationMin;

    const etaDate = new Date(Date.now() + durationMin * 60000);
    this.state.journey.eta = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Place vehicle at start of the calculated route
    if (coordinates.length > 0) {
      this.state.journey.currentLocation = {
        lat: coordinates[0][0],
        lng: coordinates[0][1],
        heading: 0,
        pointIndex: 0,
      };
    }

    this.addRouteEvent({
      time: nowTime,
      event: `Route Configured to ${dest.name}`,
      driver: this.state.journey.driverId,
      status: 'Success',
      details: `Distance: ${distanceKm} km, Duration: ${durationMin} min`,
    });

    this.notify();
  }

  public addRouteEvent(event: Omit<RouteEvent, 'id'>) {
    const newEvent: RouteEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...event,
    };
    this.state.routeEvents = [newEvent, ...this.state.routeEvents.slice(0, 49)];
  }

  private updateRoadStatusForHazard(hazard: Hazard) {
    const existing = this.state.roadStatuses.find((r) => r.roadName === hazard.roadName);
    let status: RoadStatusItem['status'] = 'Warning';
    if (hazard.severity === 'BLOCKED' || hazard.severity === 'CRITICAL') status = 'Blocked';
    else if (hazard.severity === 'WARNING') status = 'Restricted';

    if (existing) {
      existing.status = status;
      existing.affectedByHazardId = hazard.hazardId;
      existing.hazardType = hazard.type;
    } else {
      this.state.roadStatuses.unshift({
        roadName: hazard.roadName,
        status,
        affectedByHazardId: hazard.hazardId,
        hazardType: hazard.type,
      });
    }
  }

  /**
   * Set API Key for Google Maps / Geocoding
   */
  public setApiKey(key: string) {
    this.state.appSettings.googleMapsApiKey = key;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_gmaps_api_key', key);
      } catch {
        // ignore
      }
    }
    this.addRouteEvent({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: 'API Key Configured',
      driver: 'ADMIN',
      status: 'Success',
      details: 'Google Maps & Geocoding API key activated for live lookups',
    });
    this.notify();
  }

  /**
   * Updates Driver position with real device GPS coordinates
   */
  public updateDriverLocationFromGps(lat: number, lng: number, placeName?: string) {
    const j = this.state.journey;
    j.currentLocation = {
      lat,
      lng,
      heading: j.currentLocation.heading,
      pointIndex: 0,
    };
    if (placeName) {
      j.origin.name = placeName;
    }
    j.origin.lat = lat;
    j.origin.lng = lng;

    this.addRouteEvent({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: 'Device Live GPS Acquired',
      driver: j.driverId,
      status: 'Success',
      details: `Position: ${lat.toFixed(5)}, ${lng.toFixed(5)} (${placeName || 'Live GPS'})`,
    });
    this.notify();
  }

  /**
   * Reset demo to zero-dummy clean state
   */
  public resetDemo() {
    this.state.hazards = [];
    this.state.sensorNodes = [];
    this.state.roadStatuses = [];
    this.state.journey = {
      ...INITIAL_JOURNEY,
    };
    this.state.routeEvents = [
      {
        id: `ev-reset-${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        event: 'System State Reset to Clean Live Baseline',
        driver: 'SYSTEM',
        status: 'Success',
        details: 'Zero dummy records in Admin & Driver modes. Ready for live destination search.',
      },
    ];
    this.notify();
  }

  /**
   * Register a new sensor node
   */
  public addSensorNode(sensor: SensorNode) {
    this.state.sensorNodes.unshift(sensor);
    this.addRouteEvent({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: `Sensor Node Registered: ${sensor.id}`,
      driver: 'ADMIN',
      status: 'Success',
      details: `${sensor.name} deployed at ${sensor.location}`,
    });
    this.notify();
  }

  /**
   * Remove a sensor node
   */
  public removeSensorNode(id: string) {
    this.state.sensorNodes = this.state.sensorNodes.filter((s) => s.id !== id);
    this.notify();
  }

  /**
   * Manually update or override a road status
   */
  public toggleRoadStatus(roadName: string, status: RoadStatusItem['status']) {
    const existing = this.state.roadStatuses.find((r) => r.roadName === roadName);
    if (existing) {
      existing.status = status;
    } else {
      this.state.roadStatuses.push({ roadName, status });
    }
    this.addRouteEvent({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: `Road Status Updated: ${roadName}`,
      driver: 'ADMIN',
      status: status === 'Blocked' ? 'Warning' : 'Info',
      details: `Status set to ${status}`,
    });
    this.notify();
  }

  /**
   * Clear route event logs
   */
  public clearRouteEvents() {
    this.state.routeEvents = [
      {
        id: `ev-${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        event: 'Event Logs Cleared',
        driver: 'ADMIN',
        status: 'Info',
        details: 'Audit log reset by administrator',
      },
    ];
    this.notify();
  }

  /**
   * Virtual sensor trigger
   */
  public triggerVirtualSensorEvent(type: string) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.addRouteEvent({
      time,
      event: `Virtual Sensor Trigger: ${type}`,
      driver: 'BR-002',
      status: 'Warning',
      details: 'TEST EVENT — VIRTUAL DATA',
    });

    if (type === 'Structural Vibration' || type === 'Bridge Damage') {
      this.createHazard({
        type: 'Bridge Damage',
        severity: 'CRITICAL',
        latitude: 25.4585,
        longitude: 78.5765,
        locationName: 'Near Civil Lines Bridge, Jhansi',
        roadName: 'Civil Lines Road',
        affectedRadius: 220,
        description: 'VIRTUAL TEST DATA: Excessive bridge accelerometer vibration',
        source: 'VIRTUAL_TEST',
      });
    } else if (type === 'High Water Level') {
      this.createHazard({
        type: 'High Water Level',
        severity: 'WARNING',
        latitude: 25.4610,
        longitude: 78.5710,
        locationName: 'Pahuj River Gauge, Jhansi',
        roadName: 'Pahuj Embankment Rd',
        affectedRadius: 180,
        description: 'VIRTUAL TEST DATA: Water level gauge exceeded safety mark',
        source: 'VIRTUAL_TEST',
      });
    }
  }
}

export const realtimeSync = new RealtimeSyncManager();
