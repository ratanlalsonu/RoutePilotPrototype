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
  calculatePolylineDistanceKm,
  calculateRemainingDistanceKm,
  calculateVehicleDuration,
  getVehicleSpeedProfile,
  formatDurationText,
  calculateAlternativeRoutes,
  calculateMultipleOptimalRoutes,
  fetchOSRMRoute,
  generateSyntheticSteps,
} from './routingService';
import {
  hazardAffectsRoute,
  calculateBearing,
  getDistanceMeters,
} from '../algorithms/hazardRouteIntersection';
import { evaluateRoutesWithAStar, AStarEvaluationResult } from '../algorithms/aStarPathEvaluator';
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
  aStarEvaluation: AStarEvaluationResult | null;
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
    name: 'Current Location (Live GPS)',
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

export function applyDocumentTheme(theme: 'dark' | 'light') {
  if (typeof window === 'undefined') return;
  const effectiveTheme = theme === 'light' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', effectiveTheme);
  document.body.setAttribute('data-theme', effectiveTheme);
  if (effectiveTheme === 'light') {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }
}

function getInitialState(): RoutePilotState {
  const envMapsKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const envPlacesKey = ((import.meta as any).env?.VITE_GOOGLE_PLACES_API_KEY || '').trim();

  if (typeof window !== 'undefined') {
    try {
      if (envMapsKey) {
        localStorage.setItem('routepilot_gmaps_api_key', envMapsKey);
        if (!localStorage.getItem('routepilot_map_engine')) {
          localStorage.setItem('routepilot_map_engine', 'google');
        }
      }
      if (envPlacesKey) {
        localStorage.setItem('routepilot_places_api_key', envPlacesKey);
      }
      const savedGps = localStorage.getItem('routepilot_driver_gps');
      if (savedGps) {
        try {
          const parsedGps = JSON.parse(savedGps);
          if (parsedGps && typeof parsedGps.lat === 'number' && typeof parsedGps.lng === 'number') {
            INITIAL_JOURNEY.origin.lat = parsedGps.lat;
            INITIAL_JOURNEY.origin.lng = parsedGps.lng;
            INITIAL_JOURNEY.origin.name = parsedGps.placeName || 'Current Location (Live GPS)';
            INITIAL_JOURNEY.currentLocation.lat = parsedGps.lat;
            INITIAL_JOURNEY.currentLocation.lng = parsedGps.lng;
          }
        } catch {}
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.hazards && parsed.journey) {
          if (parsed.appSettings && parsed.appSettings.mapTheme !== 'satellite') {
            parsed.appSettings.mapTheme = 'standard';
          }
          if (envMapsKey) {
            parsed.appSettings.googleMapsApiKey = envMapsKey;
          }
          if (envPlacesKey || envMapsKey) {
            parsed.appSettings.placesApiKey = envPlacesKey || envMapsKey;
          }
          if (savedGps) {
            try {
              const parsedGps = JSON.parse(savedGps);
              if (parsedGps && typeof parsedGps.lat === 'number' && typeof parsedGps.lng === 'number') {
                parsed.journey.origin.lat = parsedGps.lat;
                parsed.journey.origin.lng = parsedGps.lng;
                parsed.journey.origin.name = parsedGps.placeName || 'Current Location (Live GPS)';
                if (!parsed.journey.isNavigating) {
                  parsed.journey.currentLocation.lat = parsedGps.lat;
                  parsed.journey.currentLocation.lng = parsedGps.lng;
                }
              }
            } catch {}
          }
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
  }

  let storedApiKey = envMapsKey;
  let storedPlacesApiKey = envPlacesKey || envMapsKey;

  if (typeof window !== 'undefined') {
    try {
      const localMaps = localStorage.getItem('routepilot_gmaps_api_key');
      if (localMaps && localMaps.trim()) {
        storedApiKey = localMaps.trim();
      }
      const localPlaces = localStorage.getItem('routepilot_places_api_key');
      if (localPlaces && localPlaces.trim()) {
        storedPlacesApiKey = localPlaces.trim();
      }
      // If valid API key is present and engine hasn't been explicitly configured, prefer google
      if (storedApiKey && !localStorage.getItem('routepilot_map_engine')) {
        localStorage.setItem('routepilot_map_engine', 'google');
      }
    } catch {
      // ignore
    }
  }

  const rawStoredTheme = typeof window !== 'undefined' ? localStorage.getItem('routepilot_map_theme') : null;
  const storedMapTheme: 'standard' | 'dark' | 'satellite' =
    rawStoredTheme === 'satellite' || rawStoredTheme === 'dark' ? rawStoredTheme : 'standard';

  const rawStoredAppTheme = typeof window !== 'undefined' ? localStorage.getItem('routepilot_app_theme') : null;
  const storedAppTheme: 'dark' | 'light' = rawStoredAppTheme === 'light' ? 'light' : 'dark';

  const rawStoredMapStyle = typeof window !== 'undefined' ? localStorage.getItem('routepilot_map_style') : null;
  const storedMapStyle: 'standard' | 'dark' | 'satellite' | 'terrain' =
    rawStoredMapStyle === 'dark' || rawStoredMapStyle === 'satellite' || rawStoredMapStyle === 'terrain'
      ? rawStoredMapStyle
      : (storedMapTheme === 'satellite' ? 'satellite' : 'standard');

  const rawStoredLang = typeof window !== 'undefined' ? localStorage.getItem('routepilot_language') : null;
  const storedLanguage: 'en' | 'hi' = rawStoredLang === 'hi' ? 'hi' : 'en';

  // Apply visual theme to DOM immediately on load
  if (typeof window !== 'undefined') {
    applyDocumentTheme(storedAppTheme);
  }

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
      language: storedLanguage,
      appTheme: storedAppTheme,
      mapStyle: storedMapStyle,
      voiceEnabled: true,
      sensorMode: 'HARDWARE',
      esp32Endpoint: 'http://192.168.1.100:80/api/sensor',
      esp32DeviceId: 'ESP32-NODE-01',
      esp32Connected: false,
      googleMapsApiKey: storedApiKey,
      placesApiKey: storedPlacesApiKey,
      routeCommitThresholdMeters: 60,
      minimumProgressMeters: 25,
      mapProvider: 'Google Maps',
      mapTheme: storedMapTheme,
      academicInfo: {
        projectTitle: 'IoT & Web-Based Real-Time Road & Bridge Hazard Detection with Intelligent Dynamic Route Diversion',
        degree: 'B.Tech (Computer Science & Engineering)',
        department: 'Department of Computer Science & Engineering',
        collegeName: 'Engineering & Technology Institute',
        studentName: 'Project Team',
        rollNumber: 'CSE-2024-042',
        guideName: 'Dr. Project Guide / Mentor',
        batch: '2024 - 2025',
      },
    },
    activeMode: 'admin',
    aStarEvaluation: null,
  };
}

class RealtimeSyncManager {
  private state: RoutePilotState;
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(state: RoutePilotState) => void> = new Set();
  private vehicleListeners: Set<(pos: { lat: number; lng: number; heading: number; pointIndex: number }, speedKmh: number) => void> = new Set();
  private simulationTimer: any = null;
  private animFrameId: number | null = null;
  private lastFrameTimestamp: number = 0;
  private lastTelemetryNotifyTime: number = 0;
  private lastStorageTime: number = 0;
  private hazardCheckCounter: number = 0;

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

    // Early background acquisition of device GPS so driver source location is immediately live
    if (typeof window !== 'undefined' && navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, heading, speed } = pos.coords;
            this.updateDriverLocationFromGps(latitude, longitude, undefined, heading || undefined, speed || undefined);
          },
          () => {},
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
      } catch {}
    }
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

  /**
   * Dedicated high-frequency vehicle position subscriber for silky-smooth 60fps/120fps map rendering
   */
  public subscribeVehiclePosition(
    callback: (pos: { lat: number; lng: number; heading: number; pointIndex: number }, speedKmh: number) => void
  ): () => void {
    this.vehicleListeners.add(callback);
    callback(this.state.journey.currentLocation, this.state.journey.currentSpeedKmh);
    return () => {
      this.vehicleListeners.delete(callback);
    };
  }

  private notify(broadcast: boolean = true, forceSave: boolean = false) {
    if (typeof window !== 'undefined') {
      const now = Date.now();
      // Debounce disk I/O to avoid any frame stuttering during live vehicle movement
      if (forceSave || now - this.lastStorageTime > 6000) {
        this.lastStorageTime = now;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
          if (broadcast && this.channel) {
            this.channel.postMessage({ type: 'SYNC_STATE', state: this.state });
          }
        } catch {
          // ignore quota error
        }
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
    if (partial.language) {
      VoiceService.setLanguage(partial.language);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('routepilot_language', partial.language);
        } catch {}
      }
    }
    if (partial.voiceEnabled !== undefined) VoiceService.setEnabled(partial.voiceEnabled);
    if (partial.mapTheme && typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_map_theme', partial.mapTheme);
      } catch {}
    }
    this.notify();
  }

  public toggleLanguage(): 'en' | 'hi' {
    const nextLang: 'en' | 'hi' = this.state.appSettings.language === 'hi' ? 'en' : 'hi';
    this.updateSettings({ language: nextLang });
    return nextLang;
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

  public setMapTheme(theme: 'standard' | 'dark' | 'satellite') {
    this.state.appSettings.mapTheme = theme;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_map_theme', theme);
      } catch {}
    }
    this.notify();
  }

  public setAppTheme(theme: 'dark' | 'light') {
    this.state.appSettings.appTheme = theme;
    applyDocumentTheme(theme);
    if (theme === 'light' && this.state.appSettings.mapTheme === 'dark') {
      this.state.appSettings.mapTheme = 'standard';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('routepilot_map_theme', 'standard');
        } catch {}
      }
    } else if (theme === 'dark' && this.state.appSettings.mapTheme === 'standard') {
      this.state.appSettings.mapTheme = 'dark';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('routepilot_map_theme', 'dark');
        } catch {}
      }
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_app_theme', theme);
      } catch {}
    }
    this.notify();
  }

  public setMapStyle(style: 'standard' | 'dark' | 'satellite' | 'terrain') {
    this.state.appSettings.mapStyle = style;
    const mapTheme = style === 'satellite' ? 'satellite' : 'standard';
    this.state.appSettings.mapTheme = mapTheme;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_map_style', style);
        localStorage.setItem('routepilot_map_theme', mapTheme);
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

    this.notify(true, true);
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

    this.notify(true, true);
  }

  public resolveAllHazards() {
    const active = this.state.hazards.filter((h) => h.status === 'ACTIVE');
    active.forEach((h) => this.resolveHazard(h.hazardId));
  }

  public deleteHazard(hazardId: string) {
    this.state.hazards = this.state.hazards.filter((h) => h.hazardId !== hazardId);
    this.notify(true, true);
  }

  /**
   * Checks if a hazard intersects the active route and notifies the driver if it does!
   */
  public checkHazardAgainstActiveRoute(hazard: Hazard) {
    const j = this.state.journey;
    // Check whenever an active route exists (both while navigating and during route planning)
    if (!j.activeRoute) return;

    // Check if already handled
    if (j.handledHazardIds.includes(hazard.hazardId)) return;

    const { affects, minDistanceMeters, segmentIndex, aheadOfDriver } = hazardAffectsRoute(
      hazard,
      j.activeRoute.coordinates,
      j.currentLocation.pointIndex || 0
    );

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (affects && (aheadOfDriver || j.status === 'IDLE')) {
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

      // Notify UI immediately so the "Find Other Route" alert is shown to driver
      this.notify(true, true);
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
   * Driver clicks "OK - FIND ALTERNATE ROUTES" / "Find Other Route"
   * Calculates multiple optimal routes directly on map and UI for the user to choose from
   */
  public async handleDriverConfirmFindAlternates() {
    const j = this.state.journey;
    if (!j.detectedHazard || !j.activeRoute) return;

    const currentHazard = j.detectedHazard;
    j.diversionState = 'CALCULATING_ALTERNATIVES';
    this.notify(true, true);

    const currentCoords: [number, number] = [j.currentLocation.lat, j.currentLocation.lng];

    // Calculate multiple optimal bypass routes from CURRENT LOCATION to ORIGINAL DESTINATION
    const alternatives = await calculateAlternativeRoutes(
      currentCoords[0],
      currentCoords[1],
      j.destination,
      currentHazard,
      j.vehicleType,
      j.activeRoute
    );

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (alternatives && alternatives.length > 0) {
      // Find the unblocked optimal route (lowest cost, safe from hazard)
      const optimalDetour = alternatives.find((r) => r.aStarMetrics?.status !== 'HAZARD_BLOCKED') || alternatives[0];
      const otherDetours = alternatives.filter((r) => r.id !== optimalDetour.id);

      // Re-evaluate candidate routes with A* including the previous obstructed route for visual comparison
      const candidateList = [optimalDetour, ...otherDetours];
      try {
        const aStarResult = evaluateRoutesWithAStar(
          candidateList,
          { lat: currentCoords[0], lng: currentCoords[1], name: 'Current Location' },
          j.destination,
          this.state.hazards,
          j.vehicleType
        );
        this.state.aStarEvaluation = aStarResult;
      } catch (err) {
        console.warn('A* Evaluation note:', err);
      }

      // CRITICAL: The new safe optimal route becomes activeRoute!
      j.activeRoute = optimalDetour;
      j.activeRouteId = optimalDetour.id;
      j.alternativeRoutes = otherDetours;

      j.totalDistanceKm = optimalDetour.distanceKm;
      j.remainingDistanceKm = optimalDetour.distanceKm;
      j.remainingDurationMinutes = optimalDetour.durationMinutes;

      const etaDate = new Date(Date.now() + optimalDetour.durationMinutes * 60000);
      j.eta = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // If driver was navigating, reset point index to start of new detour
      if (optimalDetour.coordinates.length > 0) {
        j.currentLocation = {
          lat: optimalDetour.coordinates[0][0],
          lng: optimalDetour.coordinates[0][1],
          heading: j.currentLocation.heading || 0,
          pointIndex: 0,
        };
      }
      j.progressMeters = 0;
      j.progressPercent = 0;
      j.diversionCount += 1;
      if (!j.handledHazardIds.includes(currentHazard.hazardId)) {
        j.handledHazardIds.push(currentHazard.hazardId);
      }

      j.diversionState = 'ALTERNATIVES_DISPLAYED';
      if (j.isNavigating) {
        j.status = 'DIVERTED';
      }

      this.addRouteEvent({
        time: nowTime,
        event: `A* Hazard Detour: ${optimalDetour.name} Activated`,
        driver: j.driverId,
        status: 'Success',
        details: `${alternatives.length} optimal detour routes calculated. Safe route ${optimalDetour.name} (f=${optimalDetour.aStarMetrics?.totalFCost}) active.`,
      });

      VoiceService.speak(
        `Hazard avoided! A* Algorithm calculated ${alternatives.length} detour routes. Rerouted to ${optimalDetour.name}.`,
        `खतरे से बचने के लिए A* एल्गोरिथ्म ने ${alternatives.length} नए मार्ग खोजे। सुरक्षित यात्रा के लिए ${optimalDetour.name} चुना गया है।`
      );
    } else {
      this.addRouteEvent({
        time: nowTime,
        event: 'No Alternative Road Corridor Found',
        driver: j.driverId,
        status: 'Warning',
        details: 'All alternative road corridors obstructed or unreachable from current position.',
      });
      VoiceService.speak(
        'Unable to calculate alternative road route. Please check your connection or stop safely.',
        'वैकल्पिक सड़क मार्ग खोजने में असमर्थ। कृपया सुरक्षित स्थान पर वाहन रोकें।'
      );
    }

    this.notify(true, true);
  }

  /**
   * Driver commits to a route
   */
  public commitToAlternateRoute(selectedRouteId: string) {
    this.selectOptimalRoute(selectedRouteId);
  }

  private getRouteCumulativeDistances(coords: [number, number][]): number[] {
    const cum = [0];
    for (let i = 0; i < coords.length - 1; i++) {
      const d = getDistanceMeters(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
      cum.push(cum[i] + d);
    }
    return cum;
  }

  /**
   * Advance vehicle movement smoothly along route with sub-millisecond continuous interpolation
   */
  public advanceVehicle(deltaSecondsOrStep: number = 0.016) {
    const j = this.state.journey;
    if (!j.isNavigating || !j.activeRoute || j.activeRoute.coordinates.length < 2) return;

    const coords = j.activeRoute.coordinates;
    const cum = this.getRouteCumulativeDistances(coords);
    const totalMeters = cum[cum.length - 1];

    if (totalMeters <= 5) return;

    let metersToAdvance = 0;
    if (deltaSecondsOrStep >= 1) {
      // Manual "Step Forward" click: advance by 80 meters
      metersToAdvance = 80 * deltaSecondsOrStep;
    } else {
      // Continuous smooth interpolation frame (runs at screen refresh rate ~60-120fps)
      const mult = Math.max(0.25, Math.min(10, j.simulationSpeed || 1));
      const profile = getVehicleSpeedProfile(j.vehicleType);
      // Realistic speed adjusted by simulation speed multiplier
      const speedKmh = Math.max(15, Math.round(profile.averageSpeedKmh * mult));
      j.currentSpeedKmh = speedKmh;
      // Convert km/h to m/s with natural visual pacing multiplier (~1.65x)
      const metersPerSecond = (speedKmh / 3.6) * 1.65;
      metersToAdvance = metersPerSecond * deltaSecondsOrStep;
    }

    let currentProgress = j.progressMeters ?? 0;
    if (currentProgress === 0 && j.currentLocation.pointIndex > 0) {
      currentProgress = cum[Math.min(cum.length - 1, j.currentLocation.pointIndex)];
    }

    const nextProgress = currentProgress + metersToAdvance;

    // Check if reached destination
    if (nextProgress >= totalMeters) {
      if (j.status !== 'ARRIVED') {
        j.status = 'ARRIVED';
        j.diversionState = 'ARRIVED';
        j.isNavigating = false;
        j.isSimulating = false;
        j.progressPercent = 100;
        j.remainingDistanceKm = 0;
        j.remainingDurationMinutes = 0;
        j.currentSpeedKmh = 0;
        j.progressMeters = totalMeters;
        const lastPt = coords[coords.length - 1];
        j.currentLocation = {
          lat: lastPt[0],
          lng: lastPt[1],
          heading: j.currentLocation.heading,
          pointIndex: coords.length - 1,
        };

        this.vehicleListeners.forEach((cb) => cb(j.currentLocation, 0));

        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.addRouteEvent({
          time: nowTime,
          event: 'Driver arrived at destination',
          driver: j.driverId,
          status: 'Success',
          details: `Safely reached ${j.destination.name}`,
        });

        VoiceService.notifyArrived(j.destination.name);
        this.notify(true, true);
      }
      return;
    }

    // Find the current segment index along the route
    let idx = 0;
    while (idx < cum.length - 2 && cum[idx + 1] < nextProgress) {
      idx++;
    }

    const segLen = cum[idx + 1] - cum[idx];
    const t = segLen > 0.001 ? Math.max(0, Math.min(1, (nextProgress - cum[idx]) / segLen)) : 0;

    const currCoord = coords[idx];
    const nextCoord = coords[idx + 1];

    const lat = currCoord[0] + t * (nextCoord[0] - currCoord[0]);
    const lng = currCoord[1] + t * (nextCoord[1] - currCoord[1]);
    const heading = calculateBearing(currCoord[0], currCoord[1], nextCoord[0], nextCoord[1]);

    j.progressMeters = nextProgress;
    j.currentLocation = {
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      heading,
      pointIndex: idx,
    };

    // Calculate real remaining distance and progress
    const remainingMeters = Math.max(0, totalMeters - nextProgress);
    const remainingKm = parseFloat((remainingMeters / 1000).toFixed(1));
    j.remainingDistanceKm = remainingKm;
    j.remainingDurationMinutes = calculateVehicleDuration(remainingKm, j.vehicleType);

    // Dynamic progress percent based on real distance
    j.progressPercent = Math.min(99, Math.max(0, Math.round((nextProgress / totalMeters) * 100)));

    // Dynamic ETA clock calculation
    const etaDate = new Date(Date.now() + j.remainingDurationMinutes * 60000);
    j.eta = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Instantly notify high-frequency vehicle listeners (Leaflet marker glides at 60fps without React overhead)
    this.vehicleListeners.forEach((cb) => cb(j.currentLocation, j.currentSpeedKmh));

    // When alternatives are displayed or hazard detected, driver chooses when to commit.
    // Continuously check active hazards ahead on route for new or subsequent hazards
    this.hazardCheckCounter = (this.hazardCheckCounter + 1) % 15;
    if (this.hazardCheckCounter === 0 && (j.diversionState === 'ROUTE_ACTIVE' || j.diversionState === 'NEW_ROUTE_ACTIVE') && !j.detectedHazard) {
      for (const h of this.state.hazards) {
        if (h.status === 'ACTIVE' && !j.handledHazardIds.includes(h.hazardId)) {
          const { affects, aheadOfDriver } = hazardAffectsRoute(h, coords, idx);
          if (affects && aheadOfDriver) {
            this.checkHazardAgainstActiveRoute(h);
            break;
          }
        }
      }
    }

    // Throttle React full state re-renders to 4Hz (every ~250ms) to ensure smooth 60fps performance without DOM lock
    const nowMs = Date.now();
    if (nowMs - this.lastTelemetryNotifyTime > 250) {
      this.lastTelemetryNotifyTime = nowMs;
      this.notify(false);
    }
  }

  private startSimulationLoop() {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
    if (typeof window !== 'undefined' && this.animFrameId) {
      window.cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.lastFrameTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const loop = (timestamp: number) => {
      const now = timestamp || (typeof performance !== 'undefined' ? performance.now() : Date.now());
      // Clamp delta to avoid massive sudden teleportation if tab was backgrounded
      const dt = Math.max(0.001, Math.min(0.08, (now - this.lastFrameTimestamp) / 1000));
      this.lastFrameTimestamp = now;

      if (this.state.journey.isNavigating && this.state.journey.isSimulating) {
        if (
          this.state.journey.diversionState === 'ROUTE_ACTIVE' ||
          this.state.journey.diversionState === 'NEW_ROUTE_ACTIVE'
        ) {
          this.advanceVehicle(dt);
        }
      }

      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        this.animFrameId = window.requestAnimationFrame(loop);
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      this.animFrameId = window.requestAnimationFrame(loop);
    } else {
      // Fallback timer
      this.simulationTimer = setInterval(() => {
        const now = Date.now();
        const dt = Math.max(0.001, Math.min(0.08, (now - this.lastFrameTimestamp) / 1000));
        this.lastFrameTimestamp = now;
        if (this.state.journey.isNavigating && this.state.journey.isSimulating) {
          this.advanceVehicle(dt);
        }
      }, 25);
    }
  }

  public setSimulationSpeed(speed: number) {
    const clamped = Math.max(0.25, Math.min(10, parseFloat(speed.toFixed(2))));
    this.state.journey.simulationSpeed = clamped;
    const profile = getVehicleSpeedProfile(this.state.journey.vehicleType);
    this.state.journey.currentSpeedKmh = Math.max(15, Math.round(profile.averageSpeedKmh * clamped));
    this.vehicleListeners.forEach((cb) => cb(this.state.journey.currentLocation, this.state.journey.currentSpeedKmh));
    this.notify(false);
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
      if (this.state.journey.progressMeters === undefined || this.state.journey.currentLocation.pointIndex === 0) {
        this.state.journey.progressMeters = 0;
      }
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
    this.state.journey.progressMeters = 0;
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
    this.notify(true, true);
    return newHazard;
  }

  public setVehicleType(vehicleType: Journey['vehicleType']) {
    this.state.journey.vehicleType = vehicleType;
    // If destination is already picked, recalculate optimal routes for this vehicle type!
    if (this.state.journey.destination && this.state.journey.destination.name && this.state.journey.destination.lat !== 0) {
      this.generateAndDisplayOptimalRoutes(vehicleType);
      return;
    }
    this.notify();
  }

  /**
   * Set Destination:
   * Sets the source to current device location, sets destination,
   * and IMMEDIATELY generates and highlights the real-road path on the map!
   */
  public async setDestination(dest: { name: string; lat: number; lng: number }) {
    if (!dest || !dest.name || dest.lat === 0) {
      this.state.journey.destination = { name: '', lat: 0, lng: 0 };
      this.state.journey.activeRoute = null;
      this.state.journey.activeRouteId = '';
      this.state.journey.alternativeRoutes = [];
      this.state.journey.status = 'IDLE';
      this.state.journey.diversionState = 'IDLE';
      this.notify();
      return;
    }

    // Set Origin to device's actual current location!
    const currentLoc = this.state.journey.currentLocation;
    this.state.journey.origin = {
      name: this.state.journey.origin?.name || 'Device Current Location',
      lat: currentLoc.lat,
      lng: currentLoc.lng,
    };
    this.state.journey.destination = dest;
    this.state.journey.status = 'IDLE';
    this.state.journey.diversionState = 'CALCULATING_ALTERNATIVES';
    this.state.journey.progressPercent = 0;
    this.state.journey.currentSpeedKmh = 0;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.addRouteEvent({
      time: nowTime,
      event: `Destination Selected: ${dest.name}`,
      driver: this.state.journey.driverId,
      status: 'Info',
      details: 'Calculating real-world road path from device current location...',
    });

    this.notify();

    // Immediately calculate and highlight the path on the map!
    await this.generateAndDisplayOptimalRoutes(this.state.journey.vehicleType || 'car');
  }

  /**
   * Calculates and displays 3 candidate paths tailored to the selected vehicle type.
   * Evaluates all 3 paths using the A* Search Algorithm f(n) = g(n) + h(n) + HazardPenalty.
   * Immediately sets the A* optimal winner as activeRoute!
   */
  public setAStarEvaluation(result: AStarEvaluationResult | null) {
    this.state.aStarEvaluation = result;
  }

  /**
   * Calculates and displays candidate paths tailored to the selected vehicle type.
   * Evaluates paths using the genuine A* Search Algorithm f(n) = g(n) + h(n) + HazardPenalty.
   * Immediately sets the A* optimal winner as activeRoute!
   */
  public async generateAndDisplayOptimalRoutes(vehicleType?: Journey['vehicleType']) {
    const vType = vehicleType || this.state.journey.vehicleType || 'car';
    this.state.journey.vehicleType = vType;

    const currentLoc = this.state.journey.currentLocation;
    const origin = {
      name: this.state.journey.origin?.name || 'Device Current Location',
      lat: currentLoc.lat,
      lng: currentLoc.lng,
    };
    this.state.journey.origin = origin;
    const dest = this.state.journey.destination;

    if (!dest || !dest.name || dest.lat === 0) return;

    this.state.journey.diversionState = 'CALCULATING_ALTERNATIVES';
    this.notify();

    // 1. Calculate distinct candidate real-road routes (Fastest, Outer Bypass, Arterial Link)
    const routes = await calculateMultipleOptimalRoutes(origin, dest, vType, this.state.hazards);

    if (routes && routes.length > 0) {
      let aStarResult = this.state.aStarEvaluation;
      if (!aStarResult || aStarResult.routes.length === 0 || aStarResult.routes[0].id !== routes[0].id) {
        aStarResult = evaluateRoutesWithAStar(
          routes,
          origin,
          dest,
          this.state.hazards,
          vType
        );
        this.state.aStarEvaluation = aStarResult;
      }

      // The A* optimal winner is set as activeRoute!
      const optimal = aStarResult.optimalRoute || routes[0];
      this.state.journey.activeRoute = optimal;
      this.state.journey.activeRouteId = optimal.id;
      // The other paths are displayed as alternatives so all show on map & UI!
      this.state.journey.alternativeRoutes = aStarResult.alternativeRoutes || routes.slice(1);

      this.state.journey.totalDistanceKm = optimal.distanceKm;
      this.state.journey.remainingDistanceKm = optimal.distanceKm;
      this.state.journey.remainingDurationMinutes = optimal.durationMinutes;

      const etaDate = new Date(Date.now() + optimal.durationMinutes * 60000);
      this.state.journey.eta = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.state.journey.diversionState = 'ALTERNATIVES_DISPLAYED';

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.addRouteEvent({
        time: nowTime,
        event: `A* Evaluated Road Graph: ${optimal.name} Selected`,
        driver: this.state.journey.driverId,
        status: 'Success',
        details: `f(n)=${optimal.aStarMetrics?.totalFCost} [g=${optimal.aStarMetrics?.gCost}, h=${optimal.aStarMetrics?.hCost}] • ${optimal.distanceKm} km • ${optimal.durationMinutes} min`,
      });

      VoiceService.speak(
        `A* Algorithm evaluated road network for your ${vType}. ${optimal.name} chosen as optimal with lowest cost.`,
        `${vType} के लिए A* एल्गोरिथ्म ने सड़क नेटवर्क का मूल्यांकन किया। न्यूनतम लागत के साथ ${optimal.name} को सर्वोत्तम चुना गया।`
      );
    } else {
      this.state.journey.activeRoute = null;
      this.state.journey.activeRouteId = '';
      this.state.journey.alternativeRoutes = [];
      this.state.journey.diversionState = 'IDLE';

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.addRouteEvent({
        time: nowTime,
        event: 'Routing Calculation Failed',
        driver: this.state.journey.driverId,
        status: 'Warning',
        details: 'Unable to calculate a road route. Please check your connection or try another destination.',
      });

      VoiceService.speak(
        'Unable to calculate a road route. Please check your connection or try another destination.',
        'सड़क मार्ग की गणना करने में असमर्थ। कृपया कनेक्शन जांचें या कोई अन्य गंतव्य चुनें।'
      );
    }

    this.notify();
  }

  /**
   * Re-evaluates all candidate paths using A* Search Algorithm upon Hazard Detection.
   * Immediately penalizes the blocked route (+9999) and shifts optimal pointer to the best clear detour!
   */
  public async reEvaluateRoutesWithAStarAfterHazard(hazard: Hazard) {
    const j = this.state.journey;
    const vType = j.vehicleType || 'car';
    const origin = {
      name: 'Current Vehicle Position',
      lat: j.currentLocation.lat,
      lng: j.currentLocation.lng,
    };
    const dest = j.destination;

    if (!dest || !dest.name || dest.lat === 0) return;

    // 1. Calculate candidate detour routes bypassing the hazard
    const detourRoutes = await calculateAlternativeRoutes(
      origin.lat,
      origin.lng,
      dest,
      hazard,
      vType,
      j.activeRoute
    );

    // Include previous route so A* algorithm explicitly evaluates and shows why it is blocked
    const candidateRoutes: RouteOption[] = [...detourRoutes];
    if (j.activeRoute) {
      const prev = {
        ...j.activeRoute,
        id: 'blocked_prev_route',
        name: `${j.activeRoute.name} (Obstructed)`,
        color: '#ef4444',
      };
      candidateRoutes.unshift(prev);
    }

    // 2. Evaluate with A* including the newly detected hazard!
    const aStarResult = evaluateRoutesWithAStar(
      candidateRoutes,
      origin,
      dest,
      this.state.hazards,
      vType
    );

    this.state.aStarEvaluation = aStarResult;

    // The new optimal route (which safely bypasses the hazard)
    const newOptimal = aStarResult.optimalRoute;
    j.activeRoute = newOptimal;
    j.activeRouteId = newOptimal.id;
    j.alternativeRoutes = aStarResult.routes.filter((r) => r.id !== newOptimal.id);

    j.totalDistanceKm = newOptimal.distanceKm;
    j.remainingDistanceKm = newOptimal.distanceKm;
    j.remainingDurationMinutes = newOptimal.durationMinutes;
    j.diversionState = 'ALTERNATIVES_DISPLAYED';
    j.diversionCount += 1;
    if (!j.handledHazardIds.includes(hazard.hazardId)) {
      j.handledHazardIds.push(hazard.hazardId);
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.addRouteEvent({
      time: nowTime,
      event: `A* Hazard Reroute: ${newOptimal.name} Chosen`,
      driver: j.driverId,
      status: 'Success',
      details: `Hazard detected on previous path. A* assigned +9999 penalty to blocked corridor and selected safe optimal detour (f=${newOptimal.aStarMetrics?.totalFCost}).`,
    });

    VoiceService.speak(
      `Hazard detected! A* Algorithm re-evaluated 3 routes and safely rerouted vehicle to ${newOptimal.name}.`,
      `सड़क पर खतरा पाया गया! A* एल्गोरिथ्म ने 3 मार्गों का पुनर्मूल्यांकन कर ${newOptimal.name} को नया सुरक्षित मार्ग चुना।`
    );

    this.notify();
  }

  /**
   * User chooses ONE optimal route -> ALL OTHER OPTIMAL PATHS DISAPPEAR & HAZARD NOTIFICATION DISAPPEARS!
   */
  public selectOptimalRoute(selectedRouteId: string) {
    const j = this.state.journey;
    const chosenRoute =
      j.alternativeRoutes.find((r) => r.id === selectedRouteId) ||
      this.state.aStarEvaluation?.routes.find((r) => r.id === selectedRouteId) ||
      (j.activeRoute?.id === selectedRouteId ? j.activeRoute : null);

    if (!chosenRoute) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Chosen route becomes ACTIVE
    j.activeRoute = chosenRoute;
    j.activeRouteId = chosenRoute.id;

    // 2. CRITICAL USER REQUIREMENT:
    // "uske baad other route disapear ho jaye"
    j.alternativeRoutes = []; // ALL OTHER ALTERNATIVE ROUTES DISAPPEAR!

    // 3. CRITICAL USER REQUIREMENT:
    // "uske baad hazard ka notification bhi gayab ho jaye"
    if (j.detectedHazard) {
      if (!j.handledHazardIds.includes(j.detectedHazard.hazardId)) {
        j.handledHazardIds.push(j.detectedHazard.hazardId);
      }
    }
    j.detectedHazard = null; // HAZARD NOTIFICATION DISAPPEARS!
    j.diversionState = 'ROUTE_ACTIVE';
    j.diversionCount += 1;

    // 4. Update distance and ETA
    j.totalDistanceKm = chosenRoute.distanceKm;
    j.remainingDistanceKm = chosenRoute.distanceKm;
    j.remainingDurationMinutes = chosenRoute.durationMinutes;

    const etaDate = new Date(Date.now() + chosenRoute.durationMinutes * 60000);
    j.eta = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 5. Seamless navigation continuation
    j.progressPercent = 0;
    j.progressMeters = 0;

    // Place vehicle at the start of the chosen route
    if (chosenRoute.coordinates.length > 0) {
      j.currentLocation = {
        lat: chosenRoute.coordinates[0][0],
        lng: chosenRoute.coordinates[0][1],
        heading: 0,
        pointIndex: 0,
      };
    }

    if (j.isNavigating) {
      j.status = 'DIVERTED';
    } else {
      j.status = 'IDLE';
    }

    this.addRouteEvent({
      time: nowTime,
      event: `Active Route Chosen: ${chosenRoute.name}`,
      driver: j.driverId,
      status: 'Success',
      details: `Distance: ${chosenRoute.distanceKm} km, Travel Time: ${chosenRoute.durationMinutes} min. Hazard cleared and all alternative routes dismissed.`,
    });

    VoiceService.speak(
      `${chosenRoute.name} selected. Navigation continuing on new route.`,
      `${chosenRoute.name} चुना गया। नए मार्ग पर यात्रा जारी है।`
    );

    this.notify(true, true);
  }

  /**
   * Re-display optimal route alternatives if user wants to change route
   */
  public async showOptimalRoutesAgain() {
    await this.generateAndDisplayOptimalRoutes(this.state.journey.vehicleType);
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
   * Set API Key for Google Places API (New) / Place Search
   */
  public setPlacesApiKey(key: string) {
    this.state.appSettings.placesApiKey = key;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_places_api_key', key);
      } catch {
        // ignore
      }
    }
    this.addRouteEvent({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: 'Places API Key Configured',
      driver: 'ADMIN',
      status: 'Success',
      details: 'Google Places API key activated for real-world place search',
    });
    this.notify();
  }

  /**
   * Updates Driver position with real device GPS coordinates
   */
  public updateDriverLocationFromGps(
    lat: number,
    lng: number,
    placeName?: string,
    heading?: number,
    speedKmh?: number
  ) {
    const j = this.state.journey;
    j.origin.lat = lat;
    j.origin.lng = lng;
    if (placeName) {
      j.origin.name = placeName;
    }

    // Persist real driver GPS to localStorage for instant reload
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          'routepilot_driver_gps',
          JSON.stringify({
            lat,
            lng,
            placeName: placeName || j.origin.name,
            timestamp: Date.now(),
          })
        );
      } catch {}
    }

    if (!j.isNavigating) {
      j.currentLocation = {
        lat,
        lng,
        heading: typeof heading === 'number' && !isNaN(heading) ? heading : (j.currentLocation.heading || 0),
        pointIndex: 0,
      };
      if (typeof speedKmh === 'number' && !isNaN(speedKmh)) {
        j.currentSpeedKmh = Math.max(0, Math.round(speedKmh * 3.6));
      }
      this.vehicleListeners.forEach((cb) => cb(j.currentLocation, j.currentSpeedKmh));

      // If destination already chosen and awaiting route selection, update optimal routes from this new location
      if (j.destination && j.destination.name && j.destination.lat !== 0 && j.alternativeRoutes.length > 0) {
        this.generateAndDisplayOptimalRoutes(j.vehicleType);
        return;
      }
    } else if (!j.isSimulating) {
      // In live real driving mode, update position directly from hardware/device GPS
      j.currentLocation = {
        lat,
        lng,
        heading: typeof heading === 'number' && !isNaN(heading) ? heading : (j.currentLocation.heading || 0),
        pointIndex: j.currentLocation.pointIndex || 0,
      };
      if (typeof speedKmh === 'number' && !isNaN(speedKmh)) {
        j.currentSpeedKmh = Math.max(0, Math.round(speedKmh * 3.6));
      }
      this.vehicleListeners.forEach((cb) => cb(j.currentLocation, j.currentSpeedKmh));
    }

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
   * Trigger Viva / Evaluation scenarios for student project demonstration
   */
  public triggerVivaScenario(scenario: 'underpass_flood' | 'bridge_vibration') {
    if (scenario === 'underpass_flood') {
      this.createHazard({
        type: 'High Water Level',
        severity: 'BLOCKED',
        latitude: 25.4520,
        longitude: 78.5650,
        locationName: 'Railway Underpass (Low-Lying Water Zone)',
        roadName: 'Station Link Road',
        affectedRadius: 260,
        description: 'ESP32 HC-SR04 ultrasonic water sensor detected flood depth 38cm (Threshold: >15cm). Road blocked for safety.',
        source: 'LIVE_HARDWARE',
      });
      this.addSensorNode({
        id: 'ESP32-NODE-FLOOD',
        name: 'Underpass Flood Sensor (HC-SR04)',
        location: 'Station Underpass Ch. 12',
        type: 'City Road',
        status: 'Online',
        lat: 25.4520,
        lng: 78.5650,
        battery: 98,
        lastReading: {
          waterLevelM: 0.38,
          updatedAt: 'Just now',
        },
      });
      this.addRouteEvent({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        event: '[VIVA TEST] ESP32 HC-SR04 Water Level Alert: 38cm detected',
        driver: 'HARDWARE_ESP32',
        status: 'Warning',
        details: 'Hazard broadcasted. Active driver navigation will calculate safe detour.',
      });
    } else if (scenario === 'bridge_vibration') {
      this.createHazard({
        type: 'Structural Vibration',
        severity: 'CRITICAL',
        latitude: 25.4650,
        longitude: 78.5800,
        locationName: 'River Bridge Span #3',
        roadName: 'Main River Bridge Expressway',
        affectedRadius: 300,
        description: 'ESP32 MPU6050 accelerometer detected structural vibration 2.14 mm/s (>0.8 limit) and tilt 1.8°. Bridge closed.',
        source: 'LIVE_HARDWARE',
      });
      this.addSensorNode({
        id: 'ESP32-NODE-BRIDGE',
        name: 'Bridge Structural Health (MPU6050)',
        location: 'River Bridge Pier 3',
        type: 'Bridge North',
        status: 'Online',
        lat: 25.4650,
        lng: 78.5800,
        battery: 94,
        lastReading: {
          vibrationMmS: 2.14,
          tiltDegrees: 1.8,
          updatedAt: 'Just now',
        },
      });
      this.addRouteEvent({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        event: '[VIVA TEST] ESP32 MPU6050 Structural Vibration Alert: 2.14 mm/s',
        driver: 'HARDWARE_ESP32',
        status: 'Warning',
        details: 'Structural threshold breached. Diverting traffic to Ring Road bypass.',
      });
    }
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
