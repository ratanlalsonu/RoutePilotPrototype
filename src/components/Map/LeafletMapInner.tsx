import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { Hazard, SensorNode, VehicleType, Journey } from '../../types';
import { realtimeSync } from '../../services/realtimeSync';
import { hardwareSimEngine } from '../../services/hardwareSimulationEngine';
import { getTranslation, translateText } from '../../services/i18n';
import { getVehicleTopDownSvg, getVehicleDimensions } from '../../services/vehicleModels';
import { getHazardVisual } from '../../services/hazardVisuals';

// Defensive patch against internal Leaflet TypeError: Cannot read properties of undefined (reading '_leaflet_pos')
if (typeof window !== 'undefined' && L && L.DomUtil) {
  const origGetPos = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el: any) {
    if (!el) return new L.Point(0, 0);
    try {
      if (origGetPos) {
        const p = origGetPos(el);
        if (p) return p;
      }
      return el._leaflet_pos ? el._leaflet_pos : new L.Point(0, 0);
    } catch {
      return new L.Point(0, 0);
    }
  };

  const origSetPos = L.DomUtil.setPosition;
  L.DomUtil.setPosition = function (el: any, point: any) {
    if (!el) return;
    try {
      if (origSetPos) {
        origSetPos(el, point);
      } else {
        el._leaflet_pos = point;
      }
    } catch {
      // safe ignore
    }
  };
}

interface LeafletMapInnerProps {
  mode: 'admin' | 'driver';
  hazards: Hazard[];
  sensorNodes: SensorNode[];
  journey: Journey;
  language?: 'en' | 'hi';
  isCreatingHazard?: boolean;
  onMapClickForHazard?: (lat: number, lng: number) => void;
  onCancelCreateHazard?: () => void;
  onSelectDestinationFromMap?: (lat: number, lng: number) => void;
  onResolveHazard?: (hazardId: string) => void;
  onCommitRoute?: (routeId: string) => void;
  theme?: 'standard' | 'dark' | 'satellite';
  appTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onChangeTheme?: (theme: 'standard' | 'dark' | 'satellite') => void;
  onChangeSpeed?: (speed: number) => void;
  onTogglePlayPause?: () => void;
  isMapClearMode?: boolean;
  onToggleClearMode?: () => void;
  onSwitchEngine?: () => void;
}

export const LeafletMapInner: React.FC<LeafletMapInnerProps> = ({
  mode,
  hazards,
  sensorNodes,
  journey,
  language,
  isCreatingHazard,
  onMapClickForHazard,
  onCancelCreateHazard,
  onSelectDestinationFromMap,
  onResolveHazard,
  onCommitRoute,
  theme,
  appTheme,
  onToggleTheme,
  onChangeTheme,
  onChangeSpeed,
  onTogglePlayPause,
  isMapClearMode,
  onToggleClearMode,
  onSwitchEngine,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const standardLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups for dynamic elements
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const hazardsLayerRef = useRef<L.LayerGroup | null>(null);
  const sensorsLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);

  // User map exploration / free-pan state (prevents vehicle follow from snapping map while user drags)
  const isUserPanningRef = useRef<boolean>(false);
  const [isUserPanning, setIsUserPanning] = useState<boolean>(false);
  const panResumeTimerRef = useRef<any>(null);

  const activeLang = language || realtimeSync.getState().appSettings.language || 'en';
  const t = getTranslation(activeLang);

  const [simState, setSimState] = useState(() => hardwareSimEngine.getState());
  useEffect(() => {
    const unsub = hardwareSimEngine.subscribe((state) => {
      setSimState(state);
    });
    return unsub;
  }, []);

  const [mapStyle, setMapStyle] = useState<'standard' | 'dark' | 'satellite'>(() => {
    if (theme === 'satellite' || theme === 'dark' || theme === 'standard') return theme;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('routepilot_map_theme');
      if (saved === 'satellite' || saved === 'dark' || saved === 'standard') return saved as any;
    }
    return appTheme === 'light' ? 'standard' : 'dark';
  });

  const [domTheme, setDomTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'light' ||
        document.documentElement.classList.contains('light')
        ? 'light'
        : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => {
      const isLightNow =
        document.documentElement.getAttribute('data-theme') === 'light' ||
        document.documentElement.classList.contains('light');
      setDomTheme(isLightNow ? 'light' : 'dark');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    return () => observer.disconnect();
  }, []);

  const isLight =
    (appTheme ? appTheme === 'light' : domTheme === 'light') &&
    mapStyle !== 'dark' &&
    theme !== 'dark';

  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isHazardBannerCollapsed, setIsHazardBannerCollapsed] = useState(false);

  // High-frequency vehicle location
  const [vehiclePos, setVehiclePos] = useState({
    lat: journey.currentLocation.lat,
    lng: journey.currentLocation.lng,
    heading: journey.currentLocation.heading || 0,
  });

  // Keep vehiclePos synced when journey.currentLocation updates (ensures paused vehicle stays in place)
  useEffect(() => {
    if (journey.currentLocation) {
      setVehiclePos({
        lat: journey.currentLocation.lat,
        lng: journey.currentLocation.lng,
        heading: journey.currentLocation.heading || 0,
      });
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setLatLng([journey.currentLocation.lat, journey.currentLocation.lng]);
      }
    }
  }, [journey.currentLocation?.lat, journey.currentLocation?.lng, journey.currentLocation?.heading]);

  // Sync theme
  useEffect(() => {
    if (theme === 'satellite' || theme === 'dark' || theme === 'standard') {
      setMapStyle(theme);
    } else if (appTheme) {
      setMapStyle(appTheme === 'light' ? 'standard' : 'dark');
    }
  }, [theme, appTheme]);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = [
      journey.currentLocation?.lat || 25.4570,
      journey.currentLocation?.lng || 78.5750,
    ];

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    mapRef.current = map;

    // Layer groups
    routesLayerRef.current = L.layerGroup().addTo(map);
    hazardsLayerRef.current = L.layerGroup().addTo(map);
    sensorsLayerRef.current = L.layerGroup().addTo(map);

    // Create base tile layers (standard dark OSM + full-color Esri satellite)
    const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap contributors',
      className: 'osm-dark-tiles',
    });

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        maxNativeZoom: 18,
        attribution: '&copy; Esri World Imagery',
        className: 'esri-satellite-tiles',
      }
    );

    standardLayerRef.current = standardLayer;
    satelliteLayerRef.current = satelliteLayer;

    // Add active layer
    if (mapStyle === 'satellite') {
      satelliteLayer.addTo(map);
    } else {
      standardLayer.addTo(map);
    }

    // Invalidate size on load & container resize
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      standardLayerRef.current = null;
      satelliteLayerRef.current = null;
    };
  }, []);

  // Smooth base layer switching between Standard (Light), Dark, and Satellite
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !standardLayerRef.current || !satelliteLayerRef.current) return;

    if (mapStyle === 'satellite') {
      if (map.hasLayer(standardLayerRef.current)) {
        map.removeLayer(standardLayerRef.current);
      }
      if (!map.hasLayer(satelliteLayerRef.current)) {
        satelliteLayerRef.current.addTo(map);
        satelliteLayerRef.current.bringToBack();
      }
    } else {
      if (map.hasLayer(satelliteLayerRef.current)) {
        map.removeLayer(satelliteLayerRef.current);
      }
      if (!map.hasLayer(standardLayerRef.current)) {
        standardLayerRef.current.addTo(map);
        standardLayerRef.current.bringToBack();
      }
      const container = standardLayerRef.current.getContainer();
      if (container) {
        if (mapStyle === 'dark') {
          container.classList.add('osm-dark-tiles');
          container.classList.remove('osm-light-tiles');
        } else {
          container.classList.add('osm-light-tiles');
          container.classList.remove('osm-dark-tiles');
        }
      }
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 50);
  }, [mapStyle]);

  const handleSelectMapStyle = (style: 'standard' | 'dark' | 'satellite') => {
    setMapStyle(style);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_map_theme', style);
      } catch {}
    }
    if (onChangeTheme) {
      onChangeTheme(style);
    }
  };

  // Track user map exploration/pan so vehicle movement or location ticks never hijack camera while user is exploring
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleUserInteraction = () => {
      isUserPanningRef.current = true;
      setIsUserPanning(true);
      if (panResumeTimerRef.current) {
        clearTimeout(panResumeTimerRef.current);
        panResumeTimerRef.current = null;
      }
    };

    const container = map.getContainer();
    const handlePointerMove = (e: PointerEvent) => {
      if (e.buttons > 0) handleUserInteraction();
    };

    container.addEventListener('pointerdown', handleUserInteraction, { passive: true });
    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('touchstart', handleUserInteraction, { passive: true });
    container.addEventListener('touchmove', handleUserInteraction, { passive: true });
    container.addEventListener('mousedown', handleUserInteraction, { passive: true });
    container.addEventListener('wheel', handleUserInteraction, { passive: true });

    map.on('dragstart', handleUserInteraction);
    map.on('drag', handleUserInteraction);
    map.on('movestart', handleUserInteraction);
    map.on('zoomstart', handleUserInteraction);

    return () => {
      container.removeEventListener('pointerdown', handleUserInteraction);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('touchstart', handleUserInteraction);
      container.removeEventListener('touchmove', handleUserInteraction);
      container.removeEventListener('mousedown', handleUserInteraction);
      container.removeEventListener('wheel', handleUserInteraction);
      map.off('dragstart', handleUserInteraction);
      map.off('drag', handleUserInteraction);
      map.off('movestart', handleUserInteraction);
      map.off('zoomstart', handleUserInteraction);
      if (panResumeTimerRef.current) clearTimeout(panResumeTimerRef.current);
    };
  }, []);

  // Synchronize cursor and Escape key for hazard placement
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const container = map.getContainer();
    if (isCreatingHazard) {
      if (simState.overallStatus === 'SAFE') {
        container.classList.add('is-creating-hazard-safe');
        container.classList.remove('is-creating-hazard');
      } else {
        container.classList.add('is-creating-hazard');
        container.classList.remove('is-creating-hazard-safe');
      }
    } else {
      container.classList.remove('is-creating-hazard');
      container.classList.remove('is-creating-hazard-safe');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreatingHazard && onCancelCreateHazard) {
        onCancelCreateHazard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.classList.remove('is-creating-hazard');
      container.classList.remove('is-creating-hazard-safe');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreatingHazard, onCancelCreateHazard, simState.overallStatus]);

  // Click & Context Menu handlers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (isCreatingHazard) {
        if (simState.overallStatus === 'SAFE') {
          // Block hazard placement on map when simulation has no hazard
          if (onMapClickForHazard) {
            onMapClickForHazard(lat, lng);
          }
          return;
        }
        if (onMapClickForHazard) {
          onMapClickForHazard(lat, lng);
        }
      } else if (mode === 'driver' && !journey.isNavigating && onSelectDestinationFromMap) {
        onSelectDestinationFromMap(lat, lng);
      }
    };

    const handleContextMenu = (e: L.LeafletMouseEvent) => {
      if (mode === 'admin' && onMapClickForHazard) {
        e.originalEvent?.preventDefault();
        onMapClickForHazard(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);
    map.on('contextmenu', handleContextMenu);
    return () => {
      map.off('click', handleMapClick);
      map.off('contextmenu', handleContextMenu);
    };
  }, [isCreatingHazard, onMapClickForHazard, mode, journey.isNavigating, onSelectDestinationFromMap, simState.overallStatus]);

  // Temporary hazard marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!isCreatingHazard) {
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
      return;
    }
  }, [isCreatingHazard]);

  // Render Routes (Active + Alternative)
  useEffect(() => {
    const map = mapRef.current;
    const routesLayer = routesLayerRef.current;
    if (!map || !routesLayer) return;

    routesLayer.clearLayers();

    // 1. Origin Marker - hide when vehicle is currently at origin to prevent overlap with vehicle icon
    const isVehicleAtOrigin = journey.origin && vehiclePos && Math.hypot(vehiclePos.lat - journey.origin.lat, vehiclePos.lng - journey.origin.lng) < 0.0025;
    if (journey.origin && journey.origin.lat && !isVehicleAtOrigin) {
      const originIcon = L.divIcon({
        className: 'origin-marker-container',
        html: `
          <div class="flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
            <div class="w-7 h-7 rounded-full bg-[#AEF5F0] border-2 border-slate-900 flex items-center justify-center shadow-md">
              <div class="w-2.5 h-2.5 rounded-full bg-slate-900"></div>
            </div>
            <div class="px-2 py-0.5 mt-1 ${isLight ? 'bg-white/95 text-slate-800 border-teal-500/60 shadow-md' : 'bg-[#161B22]/95 text-[#AEF5F0] border-[#AEF5F0]/40 shadow'} text-[10px] font-semibold rounded border whitespace-nowrap flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>${mode === 'driver' ? `${activeLang === 'hi' ? 'स्रोत: ' : 'Source: '}${journey.origin.name}` : journey.origin.name}</span>
            </div>
          </div>
        `,
        iconSize: [30, 42],
        iconAnchor: [15, 21],
      });
      L.marker([journey.origin.lat, journey.origin.lng], { icon: originIcon }).addTo(routesLayer);
    }

    // 2. Destination Marker
    if (journey.destination && journey.destination.lat && journey.destination.name) {
      const destIcon = L.divIcon({
        className: 'dest-marker-container',
        html: `
          <div class="flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
            <div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-xl text-white">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <div class="px-2 py-0.5 mt-1 ${isLight ? 'bg-white/95 text-red-700 border-red-500/50 shadow-md' : 'bg-[#161B22]/95 text-red-300 border-red-500/40 shadow-lg'} text-[11px] font-bold rounded border whitespace-nowrap">
              ${journey.destination.name}
            </div>
          </div>
        `,
        iconSize: [34, 46],
        iconAnchor: [17, 23],
      });
      L.marker([journey.destination.lat, journey.destination.lng], { icon: destIcon }).addTo(routesLayer);
    }

    // 3. Active Route Polylines (Dotted Point Road Path from Source to Destination)
    // Note: interactive: false ensures road clicks pass through to map for hazard placement!
    if (journey.activeRoute && journey.activeRoute.coordinates.length > 1) {
      const coords: [number, number][] = journey.activeRoute.coordinates.map(([lat, lng]) => [lat, lng]);

      // Base subtle road corridor underlay
      L.polyline(coords, {
        color: journey.activeRoute.color || '#AEF5F0',
        weight: 4,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(routesLayer);

      // Glowing circular dotted points halo along the exact road
      L.polyline(coords, {
        color: '#00f2fe',
        weight: 14,
        opacity: 0.4,
        dashArray: '0, 18',
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(routesLayer);

      // Main prominent circular dotted points on the road path
      L.polyline(coords, {
        color: journey.activeRoute.color || '#AEF5F0',
        weight: 9,
        opacity: 1,
        dashArray: '0, 18',
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(routesLayer);

      // High-contrast bright inner core for each road dotted point
      L.polyline(coords, {
        color: '#ffffff',
        weight: 4,
        opacity: 0.95,
        dashArray: '0, 18',
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(routesLayer);
    }

    // 4. Alternative Routes Polylines + Badges (Dotted Point Paths along roads)
    if (journey.alternativeRoutes && journey.alternativeRoutes.length > 0) {
      journey.alternativeRoutes.forEach((altRoute) => {
        if (!altRoute.coordinates || altRoute.coordinates.length < 2) return;
        const coords: [number, number][] = altRoute.coordinates.map(([lat, lng]) => [lat, lng]);
        const isBlocked = altRoute.aStarMetrics?.status === 'HAZARD_BLOCKED';
        const dotColor = isBlocked ? '#ef4444' : altRoute.color;

        // Base corridor trace
        L.polyline(coords, {
          color: dotColor,
          weight: 3,
          opacity: 0.3,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(routesLayer);

        // Circular dotted points along the alternative road path
        L.polyline(coords, {
          color: dotColor,
          weight: 8,
          opacity: 0.95,
          dashArray: '0, 18',
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(routesLayer);

        // Inner core dots
        L.polyline(coords, {
          color: '#ffffff',
          weight: 3,
          opacity: 0.85,
          dashArray: '0, 18',
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(routesLayer);

        // Clickable hit zone for the alternative route
        const routeHitZone = L.polyline(coords, {
          weight: 28,
          opacity: 0,
          interactive: true,
        }).addTo(routesLayer);

        routeHitZone.on('click', () => {
          if (onCommitRoute) onCommitRoute(altRoute.id);
        });

        // Midpoint badge
        const midIdx = Math.floor(coords.length / 2);
        const midPt = coords[midIdx];
        if (midPt) {
          const aStarScore = altRoute.aStarMetrics?.totalFCost;
          const isOptimal = altRoute.aStarMetrics?.isOptimal;

          // Format compact route name (e.g. "Route B — Outer Bypass" -> "Route B")
          const fullTranslatedName = translateText(altRoute.name, activeLang);
          const compactName = fullTranslatedName.includes(' — ')
            ? fullTranslatedName.split(' — ')[0].trim()
            : fullTranslatedName;

          const badgeBg = isLight ? '#ffffff' : '#161B22';
          const titleColor = isLight ? '#0f172a' : '#ffffff';
          const metricsColor = isLight ? '#1e293b' : '#cbd5e1';
          const scoreColor = isLight ? '#0284c7' : '#22d3ee';
          const boxShadow = isLight
            ? '0 3px 12px rgba(0, 0, 0, 0.16)'
            : '0 4px 20px rgba(0, 0, 0, 0.7)';

          const badgeIcon = L.divIcon({
            className: 'alt-route-badge-container',
            html: `
              <div
                class="alt-route-badge-pill w-max inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border-2 shadow-md cursor-pointer transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap active:scale-95 transition select-none"
                style="background-color: ${badgeBg}; border-color: ${dotColor}; box-shadow: ${boxShadow};"
                title="${fullTranslatedName}"
              >
                <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${dotColor};"></span>
                <span class="alt-route-title font-bold" style="color: ${titleColor};">${compactName}</span>
                ${isBlocked ? `<span class="text-red-600 font-mono font-bold text-[9px] ${isLight ? 'bg-red-50 border-red-200' : 'bg-red-950/80 border-red-500/40 text-red-400'} px-1 py-0.2 rounded border shrink-0">🛑 ${activeLang === 'hi' ? 'अवरुद्ध' : 'BLOCKED'}</span>` : ''}
                ${!isBlocked && (altRoute.category === 'OPTIMAL' || isOptimal) ? `<span class="text-emerald-500 font-mono font-bold text-[9px] ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'} px-1 py-0.2 rounded border shrink-0">⭐ ${activeLang === 'hi' ? 'इष्टतम' : 'Optimal'}</span>` : ''}
                ${!isBlocked && altRoute.category === 'AVERAGE' ? `<span class="text-sky-500 font-mono font-bold text-[9px] ${isLight ? 'bg-sky-50 border-sky-200' : 'bg-sky-950/80 border-sky-500/40 text-sky-400'} px-1 py-0.2 rounded border shrink-0">⚡ ${activeLang === 'hi' ? 'औसत' : 'Average'}</span>` : ''}
                ${!isBlocked && altRoute.category === 'WORST' ? `<span class="text-amber-500 font-mono font-bold text-[9px] ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/80 border-amber-500/40 text-amber-400'} px-1 py-0.2 rounded border shrink-0">⚠️ ${activeLang === 'hi' ? 'धीमा' : 'Worst'}</span>` : ''}
                <span class="alt-route-metrics font-medium shrink-0" style="color: ${metricsColor};">
                  • ${altRoute.distanceKm} ${activeLang === 'hi' ? 'किमी' : 'km'} • ${altRoute.durationMinutes} ${activeLang === 'hi' ? 'मिनट' : 'min'}
                  ${aStarScore ? `<span class="alt-route-score font-mono ml-0.5 font-bold" style="color: ${scoreColor};">[f=${aStarScore}]</span>` : ''}
                </span>
              </div>
            `,
            iconAnchor: [0, 0],
          });

          const badgeMarker = L.marker(midPt, { icon: badgeIcon }).addTo(routesLayer);
          badgeMarker.on('click', () => {
            if (onCommitRoute) onCommitRoute(altRoute.id);
          });
        }
      });
    }

    // 5. Automatically fit bounds to frame the complete path from Source to Destination!
    const allCoords: [number, number][] = [];
    if (journey.activeRoute?.coordinates && journey.activeRoute.coordinates.length > 0) {
      journey.activeRoute.coordinates.forEach(([lat, lng]) => allCoords.push([lat, lng]));
    }
    if (journey.origin?.lat && journey.origin?.lng) {
      allCoords.push([journey.origin.lat, journey.origin.lng]);
    }
    if (journey.destination?.lat && journey.destination?.lng) {
      allCoords.push([journey.destination.lat, journey.destination.lng]);
    }

    if (!isUserPanningRef.current) {
      if (allCoords.length >= 2 && !journey.isNavigating) {
        // If vehicle has already started traveling along the route (paused mid-trip), keep view on vehicle
        const isTripPausedOrActive =
          (journey.progressMeters && journey.progressMeters > 0) ||
          (journey.currentLocation.pointIndex && journey.currentLocation.pointIndex > 0) ||
          journey.status === 'PAUSED';
        if (isTripPausedOrActive && journey.currentLocation?.lat) {
          try {
            map.panTo([journey.currentLocation.lat, journey.currentLocation.lng]);
          } catch {}
          return;
        }
        try {
          const bounds = L.latLngBounds(allCoords);
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
          }
        } catch {}
      } else if (allCoords.length < 2 && !journey.isNavigating && journey.currentLocation?.lat && journey.currentLocation?.lng) {
        try {
          map.setView([journey.currentLocation.lat, journey.currentLocation.lng], map.getZoom() || 15);
        } catch {}
      }
    }
  }, [
    journey.activeRoute?.id,
    journey.alternativeRoutes?.length,
    journey.origin?.name,
    journey.destination?.name,
    activeLang,
    onCommitRoute,
    isLight,
    mapStyle,
    theme,
    appTheme,
    domTheme,
  ]);

  // Register global window handler for 100% reliable click execution from inside Leaflet popups
  useEffect(() => {
    (window as any).__routePilotResolveHazard = (hazardId: string, ev?: any) => {
      if (ev) {
        try {
          if (ev.stopPropagation) ev.stopPropagation();
          if (ev.preventDefault) ev.preventDefault();
        } catch {}
      }
      if (onResolveHazard) {
        try {
          onResolveHazard(hazardId);
        } catch (err) {
          console.error('Error invoking onResolveHazard:', err);
        }
      }
      realtimeSync.resolveHazard(hazardId);
      if (mapRef.current) {
        mapRef.current.closePopup();
      }
      if (hazardsLayerRef.current) {
        hazardsLayerRef.current.eachLayer((layer: any) => {
          if (layer._hazardId === hazardId) {
            hazardsLayerRef.current?.removeLayer(layer);
          }
        });
      }
    };

    return () => {
      delete (window as any).__routePilotResolveHazard;
    };
  }, [onResolveHazard]);

  // Render Hazards
  useEffect(() => {
    const map = mapRef.current;
    const hazardsLayer = hazardsLayerRef.current;
    if (!map || !hazardsLayer) return;

    hazardsLayer.clearLayers();

    hazards.forEach((hazard) => {
      if (hazard.status !== 'ACTIVE') return;
      const visual = getHazardVisual(hazard.type, hazard.severity);
      const isCritical = hazard.severity === 'CRITICAL' || hazard.severity === 'BLOCKED';
      const color = visual.accentColor;
      const borderColor = isCritical ? '#dc2626' : visual.accentColor;

      // Circle - Interactive so clicking anywhere in the affected radius opens details
      const circle = L.circle([hazard.latitude, hazard.longitude], {
        radius: hazard.affectedRadius || 180,
        fillColor: color,
        fillOpacity: 0.22,
        color: borderColor,
        weight: 1.5,
        interactive: true,
      }).addTo(hazardsLayer);
      (circle as any)._hazardId = hazard.hazardId;

      // Hazard Marker with distinct icon specific to hazard type (e.g. water waves for flood, broken bridge, barricade, etc.)
      const hazardIcon = L.divIcon({
        className: 'hazard-marker-container',
        html: `
          <div class="relative w-full h-full flex flex-col items-center justify-start cursor-pointer select-none" style="pointer-events: auto;">
            <!-- Center Hazard-Specific Icon (anchored at center x:70, y:18) -->
            <div class="relative w-10 h-10 flex items-center justify-center shrink-0">
              <div class="w-10 h-10 rounded-full ${visual.pingClass} animate-ping absolute pointer-events-none"></div>
              <div class="w-9 h-9 rounded-full ${visual.bgClass} border-2 border-white flex items-center justify-center shadow-2xl text-white z-10 transition-transform active:scale-95 pointer-events-auto" style="box-shadow: 0 4px 14px ${visual.accentColor}90;">
                ${visual.svgHtml}
              </div>
            </div>
            <!-- Hazard Type Badge: High Contrast with distinct emoji indicator -->
            <div class="px-2.5 py-0.5 mt-1 flex items-center gap-1 ${
              isLight
                ? `bg-white border-2 text-slate-900 shadow-md font-extrabold ${visual.badgeBorder}`
                : `bg-[#161B22]/95 border ${visual.badgeBorder} ${visual.badgeText} shadow-xl font-bold`
            } text-[11px] rounded-md whitespace-nowrap z-10 pointer-events-auto">
              <span class="text-[12px] leading-none">${visual.emoji}</span>
              <span>${translateText(hazard.type, activeLang)}</span>
            </div>
          </div>
        `,
        iconSize: [140, 72],
        iconAnchor: [70, 18],
      });

      const marker = L.marker([hazard.latitude, hazard.longitude], {
        icon: hazardIcon,
        interactive: true,
        bubblingMouseEvents: false,
        zIndexOffset: 850,
      }).addTo(hazardsLayer);
      (marker as any)._hazardId = hazard.hazardId;

      // Info Popup: Crystal-clear contrast and crisp text for Light & Dark mode
      const isPopupLight = appTheme === 'light';
      const popupHtml = `
        <div class="hazard-popup-box" style="font-family: 'Inter', system-ui, -apple-system, sans-serif; min-width: 215px; max-width: 240px; padding: 1px; color: ${isPopupLight ? '#0f172a' : '#f8fafc'};">
          <!-- Header: Title + Status -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid ${isPopupLight ? '#cbd5e1' : '#30363D'}; padding-bottom: 5px; margin-bottom: 6px; gap: 6px; padding-right: 18px;">
            <div style="display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 9999px; background-color: ${isCritical ? '#ef4444' : '#f59e0b'}; flex-shrink: 0;"></span>
              <strong style="font-size: 12px; font-weight: 800; color: ${isPopupLight ? '#0f172a' : '#ffffff'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${translateText(hazard.type, activeLang)}
              </strong>
            </div>
            <span style="font-size: 9px; font-weight: 800; padding: 1.5px 5px; border-radius: 4px; letter-spacing: 0.5px; flex-shrink: 0; ${
              isCritical
                ? (isPopupLight ? 'background-color: #fee2e2; color: #991b1b; border: 1px solid #ef4444;' : 'background-color: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.5);')
                : (isPopupLight ? 'background-color: #fef3c7; color: #92400e; border: 1px solid #f59e0b;' : 'background-color: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.5);')
            }">
              ${hazard.severity}
            </span>
          </div>

          <!-- Body Info: High contrast labels and values -->
          <div style="font-size: 11px; line-height: 1.45; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; gap: 6px; margin-bottom: 2px;">
              <strong style="color: ${isPopupLight ? '#334155' : '#94a3b8'}; font-weight: 600; flex-shrink: 0;">${activeLang === 'hi' ? 'स्थान:' : 'Location:'}</strong>
              <span style="color: ${isPopupLight ? '#0f172a' : '#f8fafc'}; font-weight: 700; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 135px;" title="${hazard.locationName || hazard.roadName || ''}">${hazard.locationName || hazard.roadName || ''}</span>
            </div>
            ${hazard.roadName && hazard.roadName !== hazard.locationName ? `
              <div style="display: flex; justify-content: space-between; gap: 6px; margin-bottom: 2px;">
                <strong style="color: ${isPopupLight ? '#334155' : '#94a3b8'}; font-weight: 600; flex-shrink: 0;">${activeLang === 'hi' ? 'सड़क:' : 'Road:'}</strong>
                <span style="color: ${isPopupLight ? '#0f172a' : '#f8fafc'}; font-weight: 700; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 135px;">${hazard.roadName}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; gap: 6px; margin-bottom: 2px;">
              <strong style="color: ${isPopupLight ? '#334155' : '#94a3b8'}; font-weight: 600; flex-shrink: 0;">${activeLang === 'hi' ? 'त्रिज्या:' : 'Radius:'}</strong>
              <span style="color: ${isPopupLight ? '#0f172a' : '#f8fafc'}; font-weight: 700;">${hazard.affectedRadius || 180}m</span>
            </div>
            ${hazard.createdAt ? `
              <div style="display: flex; justify-content: space-between; gap: 6px; margin-bottom: 2px;">
                <strong style="color: ${isPopupLight ? '#334155' : '#94a3b8'}; font-weight: 600; flex-shrink: 0;">${activeLang === 'hi' ? 'समय:' : 'Time:'}</strong>
                <span style="color: ${isPopupLight ? '#0f172a' : '#cbd5e1'}; font-weight: 500; font-size: 10px;">${hazard.createdAt} (${translateText(hazard.source, activeLang)})</span>
              </div>
            ` : ''}
            ${hazard.description && hazard.description !== hazard.locationName && hazard.description !== `${hazard.type} reported at ${hazard.locationName}` ? `
              <div style="margin-top: 4px;">
                <div class="hazard-desc-box" style="color: ${isPopupLight ? '#0f172a' : '#f1f5f9'}; background-color: ${isPopupLight ? '#f1f5f9' : '#0D1117'}; border: 1px solid ${isPopupLight ? '#cbd5e1' : '#30363D'}; padding: 4px 6px; border-radius: 5px; font-weight: 500; line-height: 1.3; font-size: 10px;">
                  ${hazard.description}
                </div>
              </div>
            ` : ''}
          </div>

          ${mode === 'admin' ? `
            <!-- Resolve Hazard Button: Admin only -->
            <button
              id="resolve-btn-${hazard.hazardId}"
              data-hazard-id="${hazard.hazardId}"
              type="button"
              onclick="window.__routePilotResolveHazard && window.__routePilotResolveHazard('${hazard.hazardId}', event)"
              style="width: 100%; padding: 6px 10px; background-color: ${isPopupLight ? '#0d9488' : '#059669'}; color: #ffffff; border: none; border-radius: 7px; font-size: 11px; font-weight: 800; cursor: pointer; box-shadow: ${isPopupLight ? '0 2px 6px rgba(13, 148, 136, 0.35)' : '0 3px 8px rgba(5, 150, 105, 0.3)'}; margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.15s ease;"
              onmouseover="this.style.backgroundColor='${isPopupLight ? '#0f766e' : '#047857'}'"
              onmouseout="this.style.backgroundColor='${isPopupLight ? '#0d9488' : '#059669'}'"
            >
              ${t.resolveHazardBtn || '✓ Resolve Hazard'}
            </button>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: true,
        autoPan: true,
        autoClose: true,
        closeOnClick: false,
        offset: [0, -18],
        maxWidth: 240,
      });

      // Instant single-click open handler on both marker and affected circle
      const handleHazardClick = (e: L.LeafletMouseEvent) => {
        if (e) {
          L.DomEvent.stopPropagation(e);
          if (e.originalEvent) {
            L.DomEvent.stopPropagation(e.originalEvent);
            L.DomEvent.preventDefault(e.originalEvent);
          }
        }
        marker.openPopup();
      };

      marker.on('click', handleHazardClick);
      circle.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (!marker.isPopupOpen()) {
          marker.openPopup();
        }
      });

      marker.on('popupopen', (e: any) => {
        const popupNode = e.popup?.getElement() || document.getElementById(`resolve-btn-${hazard.hazardId}`)?.closest('.leaflet-popup');
        if (popupNode) {
          L.DomEvent.disableClickPropagation(popupNode);
          L.DomEvent.disableScrollPropagation(popupNode);
        }
        const btn = document.getElementById(`resolve-btn-${hazard.hazardId}`);
        if (btn) {
          L.DomEvent.disableClickPropagation(btn);
          btn.onclick = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            if (onResolveHazard) onResolveHazard(hazard.hazardId);
            realtimeSync.resolveHazard(hazard.hazardId);
            if (hazardsLayerRef.current) {
              hazardsLayerRef.current.removeLayer(marker);
              hazardsLayerRef.current.removeLayer(circle);
            }
            map.closePopup();
          };
        }
      });
    });
  }, [hazards, activeLang, onResolveHazard, t, mapStyle, mode]);

  // Render Sensor Nodes
  useEffect(() => {
    const map = mapRef.current;
    const sensorsLayer = sensorsLayerRef.current;
    if (!map || !sensorsLayer) return;

    sensorsLayer.clearLayers();

    sensorNodes.forEach((node) => {
      const isOnline = node.status === 'Online';
      const sensorIcon = L.divIcon({
        className: 'sensor-marker-container',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer -translate-x-1/2 -translate-y-1/2">
            ${isOnline ? '<div class="w-6 h-6 rounded-full bg-emerald-500/30 animate-ping absolute"></div>' : ''}
            <div class="w-6 h-6 rounded-full ${isOnline ? 'bg-emerald-600' : 'bg-slate-700'} border border-slate-300 flex items-center justify-center shadow text-white">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
              </svg>
            </div>
            <div class="px-1 py-0.5 mt-0.5 bg-[#161B22]/95 text-[9px] font-mono text-emerald-300 rounded border border-emerald-500/30 whitespace-nowrap">
              ${node.id}
            </div>
          </div>
        `,
        iconSize: [30, 36],
        iconAnchor: [15, 18],
      });

      const marker = L.marker([node.lat, node.lng], { icon: sensorIcon }).addTo(sensorsLayer);

      const isSensorLight = appTheme === 'light';
      const sensorPopup = `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; min-width: 210px; padding: 4px; color: ${isSensorLight ? '#0f172a' : '#f8fafc'};">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid ${isSensorLight ? '#cbd5e1' : '#30363D'}; padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="font-size: 13px; font-weight: 800; color: ${isSensorLight ? '#0f172a' : '#ffffff'};">${node.id} (${node.name})</strong>
            <span style="font-size: 9.5px; font-weight: 800; padding: 2px 6px; border-radius: 5px; ${isOnline ? (isSensorLight ? 'background-color: #d1fae5; color: #047857; border: 1px solid #10b981;' : 'background-color: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4);') : (isSensorLight ? 'background-color: #fee2e2; color: #b91c1c; border: 1px solid #ef4444;' : 'background-color: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4);')}">
              ${node.status}
            </span>
          </div>
          <div style="font-size: 11.5px; line-height: 1.6; color: ${isSensorLight ? '#334155' : '#cbd5e1'};">
            <div style="display: flex; justify-content: space-between;"><strong style="color: ${isSensorLight ? '#475569' : '#94a3b8'};">${activeLang === 'hi' ? 'स्थान:' : 'Location:'}</strong> <span style="color: ${isSensorLight ? '#0f172a' : '#f8fafc'}; font-weight: 600;">${node.location}</span></div>
            <div style="display: flex; justify-content: space-between;"><strong style="color: ${isSensorLight ? '#475569' : '#94a3b8'};">${activeLang === 'hi' ? 'बैटरी:' : 'Battery:'}</strong> <span style="color: #34d399; font-weight: 700;">${node.battery}%</span></div>
            ${node.lastReading?.vibrationMmS !== undefined ? `<div style="display: flex; justify-content: space-between;"><strong style="color: ${isSensorLight ? '#475569' : '#94a3b8'};">${activeLang === 'hi' ? 'कंपन:' : 'Vibration:'}</strong> <span style="font-family: monospace; font-weight: 600;">${node.lastReading.vibrationMmS} mm/s</span></div>` : ''}
            ${node.lastReading?.waterLevelM !== undefined ? `<div style="display: flex; justify-content: space-between;"><strong style="color: ${isSensorLight ? '#475569' : '#94a3b8'};">${activeLang === 'hi' ? 'जल स्तर:' : 'Water Level:'}</strong> <span style="font-family: monospace; font-weight: 600;">${node.lastReading.waterLevelM} m</span></div>` : ''}
            ${node.lastReading?.tiltDegrees !== undefined ? `<div style="display: flex; justify-content: space-between;"><strong style="color: ${isSensorLight ? '#475569' : '#94a3b8'};">${activeLang === 'hi' ? 'झुकाव:' : 'Tilt:'}</strong> <span style="font-family: monospace; font-weight: 600;">${node.lastReading.tiltDegrees}°</span></div>` : ''}
          </div>
        </div>
      `;
      marker.bindPopup(sensorPopup);
    });
  }, [sensorNodes, activeLang]);

  // High Frequency Live Vehicle Movement & Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const createVehicleMarker = (loc: { lat: number; lng: number; heading: number }) => {
      if (!mapRef.current) return;
      try {
        const { width, height } = getVehicleDimensions(journey.vehicleType);
        const vehicleSvg = getVehicleTopDownSvg(journey.vehicleType);

        // Vehicle container size accommodates vehicle and forward pure-vector arrow
        const containerSize = 88;
        const vehicleIcon = L.divIcon({
          className: 'driver-vehicle-marker-wrapper',
          html: `
            <div class="relative flex items-center justify-center pointer-events-none select-none" style="width: ${containerSize}px; height: ${containerSize}px;">
              <!-- Vehicle rotator aligned with heading angle -->
              <div class="vehicle-rotator relative flex items-center justify-center transition-transform duration-75 ease-linear pointer-events-none" style="transform: rotate(${loc.heading}deg); width: ${containerSize}px; height: ${containerSize}px; transform-origin: center center;">
                
                <!-- Pure Vector Direction Arrow (No glow, no blur, crisp vector edges) -->
                <div class="absolute flex flex-col items-center pointer-events-none z-20" style="bottom: calc(50% + ${height / 2 + 4}px); left: 50%; transform: translateX(-50%);">
                  <svg class="w-4 h-4 text-[#00E5FF]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" stroke="#0D1117" stroke-width="1.2" stroke-linejoin="round"/>
                  </svg>
                </div>

                <!-- Balanced Vehicle Sprite -->
                <div class="relative flex items-center justify-center shadow-md" style="width: ${width}px; height: ${height}px;">
                  <div class="w-full h-full flex items-center justify-center">
                    ${vehicleSvg}
                  </div>
                </div>
              </div>
            </div>
          `,
          iconSize: [containerSize, containerSize],
          iconAnchor: [containerSize / 2, containerSize / 2],
        });

        if (!vehicleMarkerRef.current) {
          vehicleMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: vehicleIcon, zIndexOffset: 1000 }).addTo(map);
        } else {
          vehicleMarkerRef.current.setLatLng([loc.lat, loc.lng]);
          vehicleMarkerRef.current.setIcon(vehicleIcon);
        }
      } catch {
        // Defensive ignore
      }
    };

    createVehicleMarker(vehiclePos);

    const unsubscribe = realtimeSync.subscribeVehiclePosition((currentLoc) => {
      setVehiclePos({
        lat: currentLoc.lat,
        lng: currentLoc.lng,
        heading: currentLoc.heading || 0,
      });

      createVehicleMarker(currentLoc);

      // Smooth camera follow when navigating ONLY in driver mode AND ONLY when user is not manually panning
      if (mode === 'driver' && journey.isNavigating && mapRef.current && !isUserPanningRef.current) {
        try {
          const mapInstance = mapRef.current;
          const bounds = mapInstance.getBounds();
          const padLat = (bounds.getNorth() - bounds.getSouth()) * 0.16;
          const padLng = (bounds.getEast() - bounds.getWest()) * 0.16;

          const safeMinLat = bounds.getSouth() + padLat;
          const safeMaxLat = bounds.getNorth() - padLat;
          const safeMinLng = bounds.getWest() + padLng;
          const safeMaxLng = bounds.getEast() - padLng;

          if (
            currentLoc.lat < safeMinLat ||
            currentLoc.lat > safeMaxLat ||
            currentLoc.lng < safeMinLng ||
            currentLoc.lng > safeMaxLng
          ) {
            mapInstance.panTo([currentLoc.lat, currentLoc.lng], { animate: false });
          }
        } catch {
          // Defensive ignore
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [mode, journey.isNavigating, journey.vehicleType]);

  // Fit bounds when active route is initialized
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !journey.activeRoute || journey.activeRoute.coordinates.length < 2 || journey.isNavigating) return;

    // If trip is in progress or paused, keep view centered on paused vehicle! Do NOT fitBounds to origin/destination!
    const isTripPausedOrActive =
      (journey.progressMeters && journey.progressMeters > 0) ||
      (journey.currentLocation.pointIndex && journey.currentLocation.pointIndex > 0) ||
      journey.status === 'PAUSED';
    if (isTripPausedOrActive && journey.currentLocation?.lat) {
      try {
        map.panTo([journey.currentLocation.lat, journey.currentLocation.lng]);
      } catch {}
      return;
    }

    const latLngs: L.LatLngExpression[] = journey.activeRoute.coordinates.map(([lat, lng]) => [lat, lng]);
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [journey.activeRoute?.id, journey.isNavigating]);

  // UI Handlers
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleCenterVehicle = () => {
    isUserPanningRef.current = false;
    setIsUserPanning(false);
    if (panResumeTimerRef.current) clearTimeout(panResumeTimerRef.current);
    if (mapRef.current && vehiclePos) {
      mapRef.current.setView([vehiclePos.lat, vehiclePos.lng], 16, { animate: true });
    }
  };

  const toggleMapStyle = () => {
    const nextStyle = mapStyle === 'satellite' ? 'standard' : 'satellite';
    setMapStyle(nextStyle);
    if (onChangeTheme) {
      onChangeTheme(nextStyle);
    } else if (onToggleTheme) {
      onToggleTheme();
    }
  };

  return (
    <div className={`relative w-full h-full bg-[#0D1117] overflow-hidden select-none ${isLight ? 'leaflet-light-theme' : 'leaflet-dark-theme'}`}>
      {/* Leaflet Map DOM Canvas */}
      <div ref={containerRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />

      {/* Hazard creation banner when placing hazard - Compact & non-intrusive */}
      {isCreatingHazard && (
        <div className="absolute top-2 sm:top-2.5 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto w-[96vw] max-w-xl transition-all duration-200">
          <div className={`backdrop-blur-md text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border shadow-xl flex flex-col gap-1.5 transition-all ${
            simState.overallStatus === 'SAFE'
              ? 'bg-[#161B22]/95 border-emerald-500/80 shadow-emerald-500/10'
              : 'bg-[#161B22]/95 border-red-500/80 shadow-red-500/25 ring-1 ring-red-400/40'
          }`}>
            {/* Top Row: Compact Status Header, Collapse Toggle, & Cancel */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {simState.overallStatus === 'SAFE' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400"></span>
                    <span className="text-[11px] sm:text-xs font-bold text-emerald-300 truncate flex items-center gap-1">
                      <span>🛡️</span>
                      <span>{t.noSimHazardTitle}</span>
                    </span>
                    {!isHazardBannerCollapsed && (
                      <span className="text-[10px] text-slate-300 hidden md:inline truncate ml-1 opacity-90">
                        • {activeLang === 'hi' ? 'नीचे से एनोमली चुनें' : 'Select anomaly below'}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping shrink-0 shadow-sm shadow-red-400"></span>
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="text-[11px] sm:text-xs font-bold text-red-300 truncate flex items-center gap-1">
                        <span>🚨</span>
                        <span>
                          {hardwareSimEngine.getSimulationHazardData().type}
                        </span>
                      </span>
                      <span className="text-[10px] font-semibold text-amber-200 shrink-0">
                        👉 {activeLang === 'hi' ? 'मैप पर क्लिक करें' : 'Click map to place'}
                      </span>
                      {!isHazardBannerCollapsed && simState.activeTriggerReason && (
                        <span className="text-[9px] text-cyan-200/90 font-mono hidden lg:inline truncate">
                          ({simState.activeTriggerReason.split('(')[0].trim()})
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Control buttons: Collapse/Expand + Cancel */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHazardBannerCollapsed(!isHazardBannerCollapsed);
                  }}
                  className="px-1.5 py-0.5 rounded bg-[#21262D] hover:bg-[#30363D] text-slate-400 hover:text-white text-[10px] font-semibold border border-[#30363D] transition cursor-pointer"
                  title={isHazardBannerCollapsed ? "Show anomaly buttons" : "Collapse banner"}
                >
                  {isHazardBannerCollapsed ? '▼' : '▲'}
                </button>

                {onCancelCreateHazard && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelCreateHazard();
                    }}
                    className="px-2 py-0.5 rounded bg-[#21262D] hover:bg-[#30363D] text-slate-300 hover:text-white text-[10px] sm:text-[11px] font-semibold border border-[#30363D] transition cursor-pointer"
                    title="Cancel map placement mode"
                  >
                    ✕ {activeLang === 'hi' ? 'रद्द' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Row: Quick Trigger Anomaly buttons (Hidden if collapsed) */}
            {!isHazardBannerCollapsed && (
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap pt-1 border-t border-slate-700/60">
                <span className="text-[9px] text-amber-300 font-bold uppercase tracking-wider shrink-0">
                  {activeLang === 'hi' ? '⚡ एनोमली:' : '⚡ Anomaly:'}
                </span>

                {/* 1. Flood Alert */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hardwareSimEngine.applyPreset('FLOOD_ALERT');
                  }}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium transition cursor-pointer flex items-center gap-1 border ${
                    simState.activePreset === 'FLOOD_ALERT' || simState.sensorValues.hcsr04.waterRiseCm >= 30
                      ? 'bg-cyan-600 text-white border-cyan-300 ring-1 ring-cyan-300 font-bold shadow-xs'
                      : 'bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border-cyan-500/40'
                  }`}
                  title="Water Level Spikes > 50cm (+42cm Water Rise)"
                >
                  <span>🌊</span>
                  <span>{activeLang === 'hi' ? 'बाढ़' : 'Flood'}</span>
                  {(simState.activePreset === 'FLOOD_ALERT' || simState.sensorValues.hcsr04.waterRiseCm >= 30) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                  )}
                </button>

                {/* 2. Vibration Spike */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hardwareSimEngine.applyPreset('VIBRATION_SPIKE');
                  }}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium transition cursor-pointer flex items-center gap-1 border ${
                    simState.activePreset === 'VIBRATION_SPIKE' || simState.sensorValues.mpu6050.vibrationMmS >= 1.8
                      ? 'bg-amber-600 text-white border-amber-300 ring-1 ring-amber-300 font-bold shadow-xs'
                      : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border-amber-500/40'
                  }`}
                  title="Vibration Spikes > 2.85 mm/s"
                >
                  <span>📈</span>
                  <span>{activeLang === 'hi' ? 'कंपन' : 'Vibration'}</span>
                  {(simState.activePreset === 'VIBRATION_SPIKE' || simState.sensorValues.mpu6050.vibrationMmS >= 1.8) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                  )}
                </button>

                {/* 3. Pier Tilt */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hardwareSimEngine.applyPreset('PIER_TILT');
                  }}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium transition cursor-pointer flex items-center gap-1 border ${
                    simState.activePreset === 'PIER_TILT' || simState.sensorValues.tilt.angleDeg >= 1.5
                      ? 'bg-purple-600 text-white border-purple-300 ring-1 ring-purple-300 font-bold shadow-xs'
                      : 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border-purple-500/40'
                  }`}
                  title="Tilt Angle > 2.4°"
                >
                  <span>📐</span>
                  <span>{activeLang === 'hi' ? 'टिल्ट' : 'Tilt'}</span>
                  {(simState.activePreset === 'PIER_TILT' || simState.sensorValues.tilt.angleDeg >= 1.5) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                  )}
                </button>

                {/* 4. Structural Strain */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hardwareSimEngine.applyPreset('STRUCTURAL_STRAIN');
                  }}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium transition cursor-pointer flex items-center gap-1 border ${
                    simState.activePreset === 'STRUCTURAL_STRAIN' || simState.sensorValues.hx711.strainMicrostrain >= 600
                      ? 'bg-emerald-600 text-white border-emerald-300 ring-1 ring-emerald-300 font-bold shadow-xs'
                      : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border-emerald-500/40'
                  }`}
                  title="HX711 Strain Overload (780 µε / 98.4 kN)"
                >
                  <span>⚖️</span>
                  <span>{activeLang === 'hi' ? 'तनाव' : 'Strain'}</span>
                  {(simState.activePreset === 'STRUCTURAL_STRAIN' || simState.sensorValues.hx711.strainMicrostrain >= 600) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                  )}
                </button>

                {/* 5. Structural Displacement */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hardwareSimEngine.applyPreset('DISPLACEMENT_ANOMALY');
                  }}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium transition cursor-pointer flex items-center gap-1 border ${
                    simState.activePreset === 'DISPLACEMENT_ANOMALY' || (simState.sensorValues.hcsr04.displacementMm ?? 0) >= 20
                      ? 'bg-rose-600 text-white border-rose-300 ring-1 ring-rose-300 font-bold shadow-xs'
                      : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border-rose-500/40'
                  }`}
                  title="Displacement Shift (34.5 mm)"
                >
                  <span>📏</span>
                  <span>{activeLang === 'hi' ? 'विस्थापन' : 'Displacement'}</span>
                  {(simState.activePreset === 'DISPLACEMENT_ANOMALY' || (simState.sensorValues.hcsr04.displacementMm ?? 0) >= 20) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                  )}
                </button>

                {/* 6. Safe Reset */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hardwareSimEngine.applyPreset('SAFE');
                  }}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium transition cursor-pointer flex items-center gap-1 border ${
                    simState.overallStatus === 'SAFE'
                      ? 'bg-[#21262D] text-slate-300 border-[#30363D]'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                  }`}
                  title="Reset simulation to normal safe baseline"
                >
                  <span>↺</span>
                  <span>{activeLang === 'hi' ? 'रीसेट' : 'Reset'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vertical Map Utility Dock (Right Side Center) */}
      <div className={`absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-[990] flex flex-col ${
        isLight ? 'bg-white/95 border-slate-300 shadow-xl' : 'bg-[#161B22]/95 border-[#30363D] shadow-2xl'
      } backdrop-blur-md rounded-2xl border p-1 gap-1`}>
        {/* Map View Modes: Light Map (directly above Satellite), Satellite Mode, Dark Map */}
        <div className="flex flex-col gap-1">
          {/* Light Mode Map Button - Directly above Satellite Mode */}
          <button
            onClick={() => handleSelectMapStyle('standard')}
            title={activeLang === 'hi' ? 'दिन का लाइट मैप (स्वच्छ सड़क मैप)' : 'Light Map (Clean Daytime Streets)'}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer relative group ${
              mapStyle === 'standard'
                ? 'bg-[#0d9488] text-white font-bold shadow-md shadow-teal-600/30'
                : isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#21262D] text-slate-200'
            }`}
            aria-label="Light Map Mode"
          >
            <span className="text-sm select-none">☀️</span>
            <span className="pointer-events-none absolute right-full mr-2 hidden group-hover:flex items-center px-2 py-1 rounded bg-slate-900 text-white text-[10px] whitespace-nowrap border border-slate-700 shadow-xl z-50">
              {activeLang === 'hi' ? 'लाइट मैप (दिन)' : 'Light Map (Day)'}
            </span>
          </button>

          {/* Satellite Mode Toggle */}
          <button
            onClick={() => handleSelectMapStyle('satellite')}
            title={mapStyle === 'satellite' ? t.satelliteActiveBadge : t.satelliteModeTitle}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer relative group ${
              mapStyle === 'satellite'
                ? 'bg-[#0d9488] text-white font-bold shadow-md shadow-teal-600/30'
                : isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#21262D] text-slate-200'
            }`}
            aria-label="Toggle Satellite Mode"
          >
            <span className="text-sm select-none">🛰️</span>
            <span className="pointer-events-none absolute right-full mr-2 hidden group-hover:flex items-center px-2 py-1 rounded bg-slate-900 text-white text-[10px] whitespace-nowrap border border-slate-700 shadow-xl z-50">
              {mapStyle === 'satellite' ? t.satelliteActiveBadge : t.satelliteModeTitle}
            </span>
          </button>

          {/* Dark Mode Map Button */}
          <button
            onClick={() => handleSelectMapStyle('dark')}
            title={activeLang === 'hi' ? 'डार्क मैप (रात का नेविगेशन मैप)' : 'Dark Map (Night Navigation)'}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer relative group ${
              mapStyle === 'dark'
                ? 'bg-[#0d9488] text-white font-bold shadow-md shadow-teal-600/30'
                : isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#21262D] text-slate-200'
            }`}
            aria-label="Dark Map Mode"
          >
            <span className="text-sm select-none">🌙</span>
            <span className="pointer-events-none absolute right-full mr-2 hidden group-hover:flex items-center px-2 py-1 rounded bg-slate-900 text-white text-[10px] whitespace-nowrap border border-slate-700 shadow-xl z-50">
              {activeLang === 'hi' ? 'डार्क मैप (रात)' : 'Dark Map (Night)'}
            </span>
          </button>
        </div>

        <div className={`h-px ${isLight ? 'bg-slate-200' : 'bg-[#30363D]'} mx-1 my-0.5`}></div>

        {/* Zoom In (+) */}
        <button
          onClick={handleZoomIn}
          title={t.zoomInBtn}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${
            isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#21262D] text-slate-200'
          } flex items-center justify-center transition active:scale-95 cursor-pointer`}
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        {/* Zoom Out (-) */}
        <button
          onClick={handleZoomOut}
          title={t.zoomOutBtn}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${
            isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#21262D] text-slate-200'
          } flex items-center justify-center transition active:scale-95 cursor-pointer`}
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 12h14" />
          </svg>
        </button>

        <div className="h-px bg-[#30363D] mx-1 my-0.5"></div>

        {/* Center on Vehicle / GPS */}
        <button
          onClick={handleCenterVehicle}
          title={t.centerVehicleBtn}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-[#21262D] text-[#AEF5F0] flex items-center justify-center transition active:scale-95 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="7" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      </div>

      {/* Map Engine Badge (Bottom Right - Anchored directly at the bottom edge) */}
      <div className="absolute right-2 sm:right-3.5 bottom-2 sm:bottom-2.5 z-[990] flex items-center gap-1.5 pointer-events-auto select-none">
        <div className={`backdrop-blur-md text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-md select-none transition ${
          isLight
            ? 'bg-white/95 text-slate-800 border-slate-300 shadow-slate-900/10'
            : 'bg-[#161B22]/90 text-slate-300 border-[#30363D]'
        }`}>
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>OpenStreetMap</span>
          <span className={`${isLight ? 'text-slate-500' : 'text-slate-400'} hidden sm:inline`}>• Real Roads & Satellite</span>
        </div>
        {onSwitchEngine && (
          <button
            type="button"
            onClick={onSwitchEngine}
            title="Switch to Google Maps"
            className={`backdrop-blur-md text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-1 rounded-lg border shadow-md transition cursor-pointer flex items-center gap-1 font-medium select-none ${
              isLight
                ? 'bg-white/95 hover:bg-slate-100 text-teal-700 hover:text-teal-900 border-teal-300'
                : 'bg-[#161B22]/90 hover:bg-[#21262D] text-[#AEF5F0] hover:text-white border-[#AEF5F0]/40'
            }`}
          >
            <span>🗺️</span>
            <span className="hidden xs:inline">Google Maps</span>
          </button>
        )}
      </div>

      {/* Collapsible Map Legend (Bottom Left - Anchored directly at the bottom edge) */}
      <div className="absolute left-2 sm:left-3.5 bottom-2 sm:bottom-2.5 z-[990] pointer-events-auto">
        {isLegendOpen ? (
          <div className={`backdrop-blur-md border rounded-2xl p-3 shadow-2xl text-[11px] w-64 animate-fade-in space-y-2 select-none ${
            isLight
              ? 'bg-white/98 text-slate-800 border-slate-300 shadow-xl'
              : 'bg-[#161B22]/95 text-slate-300 border-[#30363D]'
          }`}>
            <div className={`flex items-center justify-between border-b pb-1.5 ${isLight ? 'border-slate-200' : 'border-[#30363D]'}`}>
              <div className={`font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{t.mapLegendTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLegendOpen(false)}
                className={`${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'} text-xs px-1 rounded cursor-pointer`}
                title={t.dismiss}
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#AEF5F0] border border-slate-800 shrink-0"></span>
                <span className="truncate">{t.legendVehicle}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white shrink-0"></span>
                <span className="truncate">{t.legendDestination}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 bg-[#AEF5F0] rounded shrink-0"></span>
                <span className="truncate">{t.legendActiveRoute}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-emerald-400 shrink-0"></span>
                <span className="truncate">{t.legendAlternative}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-500 font-bold shrink-0">⚠</span>
                <span className="truncate">{t.legendHazard}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-500 shrink-0"></span>
                <span className="truncate">{t.legendSensorNode}</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsLegendOpen(true)}
            title={t.mapLegendTitle}
            className={`h-7 px-2.5 rounded-lg backdrop-blur-md border text-[11px] font-medium flex items-center gap-1.5 shadow-lg transition cursor-pointer select-none ${
              isLight
                ? 'bg-white/95 border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-950'
                : 'bg-[#161B22]/90 border-[#30363D] hover:border-[#AEF5F0]/40 text-slate-300 hover:text-white'
            }`}
          >
            <span>ℹ️</span>
            <span className="hidden sm:inline">{activeLang === 'hi' ? 'संकेतिका' : 'Legend'}</span>
            <span className="text-[10px] text-slate-400">▴</span>
          </button>
        )}
      </div>
    </div>
  );
};
