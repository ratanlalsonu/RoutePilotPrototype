// Source: Google Maps Platform Code Assist
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Polyline,
  Circle,
  useMap,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { Hazard, SensorNode, RouteOption, VehicleType, Journey } from '../../types';
import { realtimeSync } from '../../services/realtimeSync';
import { getTranslation, translateText } from '../../services/i18n';
import { getVehicleTopDownSvg, getVehicleDimensions } from '../../services/vehicleModels';
import { LeafletMapInner } from './LeafletMapInner';

interface RoutePilotMapProps {
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
  onToggleTheme?: () => void;
  onChangeTheme?: (theme: 'standard' | 'dark' | 'satellite') => void;
  onChangeSpeed?: (speed: number) => void;
  onTogglePlayPause?: () => void;
  isMapClearMode?: boolean;
  onToggleClearMode?: () => void;
  onSwitchEngine?: () => void;
  googleMapsApiKey?: string;
}

// Sleek dark vector map styles matching RoutePilot Command Center (#0D1117)
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#161b22' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b949e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c9d1d9' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8b949e' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#30363d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#21262d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#38444d' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f242c' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#aef5f0' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#090d16' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
];

/**
 * Inner Map Controller that has access to `useMap()` hook
 */
const GoogleMapInner: React.FC<RoutePilotMapProps> = ({
  mode,
  hazards,
  sensorNodes,
  journey,
  language,
  isCreatingHazard,
  onMapClickForHazard,
  onSelectDestinationFromMap,
  onResolveHazard,
  onCommitRoute,
  theme,
  onToggleTheme,
  onChangeTheme,
  onChangeSpeed,
  onTogglePlayPause,
  isMapClearMode,
  onToggleClearMode,
  onSwitchEngine,
}) => {
  const map = useMap();
  const activeLang = language || realtimeSync.getState().appSettings.language || 'en';
  const t = getTranslation(activeLang);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<SensorNode | null>(null);
  const [tempMarkerPos, setTempMarkerPos] = useState<{ lat: number; lng: number } | null>(null);

  const [mapStyle, setMapStyle] = useState<'standard' | 'dark' | 'satellite'>(() => {
    if (theme === 'satellite' || theme === 'dark' || theme === 'standard') return theme;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('routepilot_map_theme');
      if (saved === 'satellite' || saved === 'dark' || saved === 'standard') return saved as any;
    }
    return 'standard';
  });

  // Collapsible legend state (default collapsed for crystal clear map visibility)
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // User map exploration / free-pan state (prevents vehicle follow from snapping map while user drags)
  const isUserPanningRef = useRef<boolean>(false);
  const [isUserPanning, setIsUserPanning] = useState<boolean>(false);
  const panResumeTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;
    const onUserTouchOrDrag = () => {
      isUserPanningRef.current = true;
      setIsUserPanning(true);
      if (panResumeTimerRef.current) {
        clearTimeout(panResumeTimerRef.current);
        panResumeTimerRef.current = null;
      }
    };

    const dragStartListener = map.addListener('dragstart', onUserTouchOrDrag);
    const dragListener = map.addListener('drag', onUserTouchOrDrag);

    const div = map.getDiv();
    const handlePointerMove = (e: PointerEvent) => {
      if (e.buttons > 0) onUserTouchOrDrag();
    };

    if (div) {
      div.addEventListener('pointerdown', onUserTouchOrDrag, { passive: true });
      div.addEventListener('pointermove', handlePointerMove, { passive: true });
      div.addEventListener('touchstart', onUserTouchOrDrag, { passive: true });
      div.addEventListener('touchmove', onUserTouchOrDrag, { passive: true });
      div.addEventListener('mousedown', onUserTouchOrDrag, { passive: true });
      div.addEventListener('wheel', onUserTouchOrDrag, { passive: true });
    }

    return () => {
      if (typeof google !== 'undefined' && google.maps && google.maps.event) {
        google.maps.event.removeListener(dragStartListener);
        google.maps.event.removeListener(dragListener);
      }
      if (div) {
        div.removeEventListener('pointerdown', onUserTouchOrDrag);
        div.removeEventListener('pointermove', handlePointerMove);
        div.removeEventListener('touchstart', onUserTouchOrDrag);
        div.removeEventListener('touchmove', onUserTouchOrDrag);
        div.removeEventListener('mousedown', onUserTouchOrDrag);
        div.removeEventListener('wheel', onUserTouchOrDrag);
      }
      if (panResumeTimerRef.current) clearTimeout(panResumeTimerRef.current);
    };
  }, [map]);

  useEffect(() => {
    if (theme === 'satellite' || theme === 'dark' || theme === 'standard') {
      setMapStyle(theme);
    }
  }, [theme]);

  // Sync Google Map type (Roadmap vs Hybrid Satellite) and dark vs light styling
  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapStyle === 'satellite' ? 'hybrid' : 'roadmap');
    if (mapStyle === 'dark') {
      map.setOptions({ styles: DARK_MAP_STYLES });
    } else {
      map.setOptions({ styles: [] });
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_map_theme', mapStyle);
      } catch {}
    }
  }, [map, mapStyle]);

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

  // Live Vehicle Position state (updated at 60fps/120fps via high-frequency subscriber)
  const [vehiclePos, setVehiclePos] = useState<{ lat: number; lng: number; heading: number }>({
    lat: journey.currentLocation.lat,
    lng: journey.currentLocation.lng,
    heading: journey.currentLocation.heading || 0,
  });

  // Subscribe to high-frequency vehicle movement for continuous gliding
  useEffect(() => {
    const unsubscribe = realtimeSync.subscribeVehiclePosition((currentLoc) => {
      setVehiclePos({
        lat: currentLoc.lat,
        lng: currentLoc.lng,
        heading: currentLoc.heading || 0,
      });

      // Smooth camera follow without choppy map.panTo animation - ONLY in driver mode when not panning
      if (mode === 'driver' && journey.isNavigating && map && !isUserPanningRef.current) {
        const bounds = map.getBounds();
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          const padLat = (ne.lat() - sw.lat()) * 0.16;
          const padLng = (ne.lng() - sw.lng()) * 0.16;

          const safeMinLat = sw.lat() + padLat;
          const safeMaxLat = ne.lat() - padLat;
          const safeMinLng = sw.lng() + padLng;
          const safeMaxLng = ne.lng() - padLng;

          if (
            currentLoc.lat < safeMinLat ||
            currentLoc.lat > safeMaxLat ||
            currentLoc.lng < safeMinLng ||
            currentLoc.lng > safeMaxLng
          ) {
            map.panTo({ lat: currentLoc.lat, lng: currentLoc.lng });
          }
        }
      }
    });

    return () => unsubscribe();
  }, [map, mode, journey.isNavigating]);

  // Auto-center map on driver's live current location when idle or freshly acquired
  useEffect(() => {
    if (!map || journey.isNavigating || journey.activeRoute || isUserPanningRef.current) return;
    if (journey.currentLocation && journey.currentLocation.lat && journey.currentLocation.lng) {
      map.panTo({ lat: journey.currentLocation.lat, lng: journey.currentLocation.lng });
    }
  }, [map, journey.currentLocation?.lat, journey.currentLocation?.lng, journey.isNavigating, journey.activeRoute]);

  // Fit bounds when active route is selected
  useEffect(() => {
    if (!map || !journey.activeRoute || journey.activeRoute.coordinates.length < 2 || journey.isNavigating || isUserPanningRef.current) return;
    const bounds = new google.maps.LatLngBounds();
    journey.activeRoute.coordinates.forEach(([lat, lng]) => {
      bounds.extend({ lat, lng });
    });
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [map, journey.activeRoute?.id, journey.isNavigating]);

  // Fit bounds when alternative routes are presented
  useEffect(() => {
    if (!map || !journey.alternativeRoutes || journey.alternativeRoutes.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    journey.alternativeRoutes.forEach((route) => {
      route.coordinates.forEach(([lat, lng]) => {
        bounds.extend({ lat, lng });
      });
    });
    map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });
  }, [map, journey.alternativeRoutes]);

  // Clear temp hazard marker if creation is cancelled
  useEffect(() => {
    if (!isCreatingHazard) {
      setTempMarkerPos(null);
    }
  }, [isCreatingHazard]);

  // Map Click Listener
  const handleMapClick = (e: MapMouseEvent) => {
    if (!e.detail.latLng) return;
    const { lat, lng } = e.detail.latLng;

    if (isCreatingHazard && onMapClickForHazard) {
      setTempMarkerPos({ lat, lng });
      onMapClickForHazard(lat, lng);
    } else if (mode === 'driver' && !journey.isNavigating && onSelectDestinationFromMap) {
      onSelectDestinationFromMap(lat, lng);
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

  const handleZoomIn = () => {
    if (map) map.setZoom((map.getZoom() || 14) + 1);
  };

  const handleZoomOut = () => {
    if (map) map.setZoom((map.getZoom() || 14) - 1);
  };

  const handleCenterVehicle = () => {
    isUserPanningRef.current = false;
    setIsUserPanning(false);
    if (panResumeTimerRef.current) clearTimeout(panResumeTimerRef.current);
    if (map && vehiclePos) {
      map.setCenter({ lat: vehiclePos.lat, lng: vehiclePos.lng });
      map.setZoom(16);
    }
  };

  // Convert Route coordinates to LatLngLiteral
  const activeRoutePath = useMemo(() => {
    if (!journey.activeRoute || journey.activeRoute.coordinates.length < 2) return [];
    return journey.activeRoute.coordinates.map(([lat, lng]) => ({ lat, lng }));
  }, [journey.activeRoute]);

  // Check if vehicle is at or extremely close to the origin location
  const isVehicleAtOrigin = useMemo(() => {
    if (!journey.origin || !vehiclePos) return false;
    return Math.hypot(vehiclePos.lat - journey.origin.lat, vehiclePos.lng - journey.origin.lng) < 0.0006;
  }, [journey.origin, vehiclePos]);

  return (
    <div className="relative w-full h-full bg-[#0D1117] overflow-hidden select-none">
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={{ lat: 25.4570, lng: 78.5750 }}
        defaultZoom={14}
        gestureHandling="greedy"
        disableDefaultUI={true}
        mapTypeId={mapStyle === 'satellite' ? 'hybrid' : 'roadmap'}
        styles={mapStyle === 'dark' ? (DARK_MAP_STYLES as any) : undefined}
        onClick={handleMapClick}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      >
        {/* Origin Marker - Only show standalone pin when vehicle has moved away from origin to prevent overlap */}
        {journey.origin && !isVehicleAtOrigin && (
          <AdvancedMarker
            position={{ lat: journey.origin.lat, lng: journey.origin.lng }}
            title={journey.origin.name}
          >
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-[#AEF5F0] border-2 border-slate-900 flex items-center justify-center shadow-md">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900"></div>
              </div>
              <div className="px-2 py-0.5 mt-1 bg-[#161B22]/95 text-[#AEF5F0] text-[10px] font-semibold rounded border border-[#AEF5F0]/40 shadow whitespace-nowrap flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{mode === 'driver' ? `${activeLang === 'hi' ? 'स्रोत: ' : 'Source: '}${journey.origin.name}` : journey.origin.name}</span>
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* Destination Marker */}
        {journey.destination && journey.destination.name && journey.destination.lat !== 0 && (
          <AdvancedMarker
            position={{ lat: journey.destination.lat, lng: journey.destination.lng }}
            title={journey.destination.name}
          >
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-xl text-white">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              <div className="px-2 py-0.5 mt-1 bg-[#161B22]/95 text-red-300 text-[11px] font-bold rounded border border-red-500/40 shadow-lg whitespace-nowrap">
                {journey.destination.name}
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* Active Route Polylines (Dotted Point Road Path) */}
        {activeRoutePath.length > 1 && (
          <>
            {/* Base road casing underlay */}
            <Polyline
              path={activeRoutePath}
              strokeColor={journey.activeRoute?.color || '#AEF5F0'}
              strokeOpacity={0.35}
              strokeWeight={4}
            />
            {/* Road Dotted Points */}
            <Polyline
              path={activeRoutePath}
              strokeColor={journey.activeRoute?.color || '#AEF5F0'}
              strokeOpacity={0}
              icons={[
                {
                  icon: {
                    path: typeof google !== 'undefined' && google.maps && google.maps.SymbolPath ? google.maps.SymbolPath.CIRCLE : 'M 0,0 m -4,0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0',
                    scale: 4,
                    fillColor: journey.activeRoute?.color || '#AEF5F0',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 1.5,
                  },
                  offset: '0',
                  repeat: '18px',
                },
              ]}
            />
          </>
        )}

        {/* Alternative Routes Polylines (Dotted Point Paths) */}
        {journey.alternativeRoutes &&
          journey.alternativeRoutes.map((route) => {
            if (!route.coordinates || route.coordinates.length < 2) return null;
            const path = route.coordinates.map(([lat, lng]) => ({ lat, lng }));
            const midIndex = Math.floor(route.coordinates.length / 2);
            const midPt = route.coordinates[midIndex];
            const isBlocked = route.aStarMetrics?.status === 'HAZARD_BLOCKED';
            const dotColor = isBlocked ? '#ef4444' : route.color;
            const aStarScore = route.aStarMetrics?.totalFCost;
            const isOptimal = route.aStarMetrics?.isOptimal;

            return (
              <React.Fragment key={route.id}>
                {/* Corridor trace */}
                <Polyline
                  path={path}
                  strokeColor={dotColor}
                  strokeOpacity={0.3}
                  strokeWeight={3}
                />
                {/* Dotted points along road */}
                <Polyline
                  path={path}
                  strokeColor={dotColor}
                  strokeOpacity={0}
                  icons={[
                    {
                      icon: {
                        path: typeof google !== 'undefined' && google.maps && google.maps.SymbolPath ? google.maps.SymbolPath.CIRCLE : 'M 0,0 m -3.5,0 a 3.5,3.5 0 1,0 7,0 a 3.5,3.5 0 1,0 -7,0',
                        scale: 3.5,
                        fillColor: dotColor,
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 1,
                      },
                      offset: '0',
                      repeat: '18px',
                    },
                  ]}
                />
                {/* Clickable Route Commitment Badge */}
                <AdvancedMarker
                  position={{ lat: midPt[0], lng: midPt[1] }}
                  onClick={() => onCommitRoute && onCommitRoute(route.id)}
                  title={`Click to select ${route.name}`}
                >
                  <div
                    className="px-2.5 py-1 rounded-md text-xs font-bold border shadow-xl flex items-center gap-1.5 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap active:scale-95 transition"
                    style={{
                      backgroundColor: '#161B22',
                      borderColor: dotColor,
                      color: dotColor,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }}></span>
                    <span>{translateText(route.name, activeLang)}</span>
                    {isBlocked && <span className="text-red-400 font-mono text-[10px] bg-red-950/60 px-1 py-0.2 rounded border border-red-500/40">🛑 {activeLang === 'hi' ? 'अवरुद्ध' : 'BLOCKED'}</span>}
                    {isOptimal && <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-500/40">⭐ A* {activeLang === 'hi' ? 'सर्वोत्तम' : 'Best'}</span>}
                    <span className="text-slate-300 font-normal">
                      • {route.distanceKm} {activeLang === 'hi' ? 'किमी' : 'km'} • {route.durationMinutes} {activeLang === 'hi' ? 'मिनट' : 'min'}
                      {aStarScore ? <span className="text-cyan-400 font-mono ml-1">[f={aStarScore}]</span> : null}
                    </span>
                  </div>
                </AdvancedMarker>
              </React.Fragment>
            );
          })}

        {/* Live Vehicle Marker */}
        {(() => {
          const dims = getVehicleDimensions(journey.vehicleType);
          const vehicleSvg = getVehicleTopDownSvg(journey.vehicleType);
          return (
            <AdvancedMarker
              position={{ lat: vehiclePos.lat, lng: vehiclePos.lng }}
              title={`Vehicle (${journey.vehicleType})`}
            >
              <div
                className="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width: `${dims.width}px`, height: `${dims.height}px` }}
              >
                <div
                  className="vehicle-rotator relative flex items-center justify-center transition-transform duration-75 ease-linear pointer-events-none"
                  style={{
                    transform: `rotate(${vehiclePos.heading}deg)`,
                    width: `${dims.width}px`,
                    height: `${dims.height}px`,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* Front Headlight beam illumination on asphalt */}
                  <div className="absolute -top-6 w-14 h-12 bg-gradient-to-t from-yellow-200/40 via-yellow-100/15 to-transparent rounded-full filter blur-xs pointer-events-none"></div>
                  {/* Real Top-down Vehicle Sprite */}
                  <div
                    className="w-full h-full flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: vehicleSvg }}
                  />
                </div>
              </div>
            </AdvancedMarker>
          );
        })()}

        {/* Hazard Radius Circles and Markers */}
        {hazards.map((hazard) => {
          if (hazard.status !== 'ACTIVE') return null;
          const isCritical = hazard.severity === 'CRITICAL' || hazard.severity === 'BLOCKED';
          const color = isCritical ? '#ef4444' : '#f59e0b';
          const borderColor = isCritical ? '#dc2626' : '#d97706';

          return (
            <React.Fragment key={hazard.hazardId}>
              {/* Affected radius circle */}
              <Circle
                center={{ lat: hazard.latitude, lng: hazard.longitude }}
                radius={hazard.affectedRadius || 180}
                fillColor={color}
                fillOpacity={0.22}
                strokeColor={borderColor}
                strokeWeight={1.5}
              />
              {/* Hazard Center Marker */}
              <AdvancedMarker
                position={{ lat: hazard.latitude, lng: hazard.longitude }}
                onClick={() => setSelectedHazard(hazard)}
                title={`${hazard.type} - Click for details`}
              >
                <div className="relative flex flex-col items-center cursor-pointer">
                  <div
                    className={`w-10 h-10 rounded-full ${isCritical ? 'bg-red-500/40' : 'bg-amber-500/40'} animate-ping absolute`}
                  ></div>
                  <div
                    className={`w-9 h-9 rounded-full ${isCritical ? 'bg-red-600' : 'bg-amber-500'} border-2 border-white flex items-center justify-center shadow-2xl text-white`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div
                    className={`px-2 py-0.5 mt-1 bg-[#161B22]/95 border ${isCritical ? 'border-red-500/60 text-red-200' : 'border-amber-500/60 text-amber-200'} text-[11px] font-bold rounded shadow-lg whitespace-nowrap`}
                  >
                    {translateText(hazard.type, activeLang)}
                  </div>
                </div>
              </AdvancedMarker>
            </React.Fragment>
          );
        })}

        {/* Hazard Detail InfoWindow */}
        {selectedHazard && (
          <InfoWindow
            position={{ lat: selectedHazard.latitude, lng: selectedHazard.longitude }}
            onCloseClick={() => setSelectedHazard(null)}
          >
            <div className="p-2.5 text-white min-w-[240px]">
              <div className="flex items-center justify-between gap-2 border-b border-[#30363D] pb-2 mb-2.5">
                <div className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  {translateText(selectedHazard.type, activeLang)}
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded tracking-wider shadow-sm uppercase ${
                    selectedHazard.severity === 'CRITICAL' || selectedHazard.severity === 'BLOCKED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  }`}
                >
                  {translateText(selectedHazard.severity, activeLang)}
                </span>
              </div>
              <div className="text-xs text-slate-200 space-y-1.5 mb-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-400 shrink-0">{activeLang === 'hi' ? 'स्थान:' : 'Location:'}</span>
                  <span className="text-right text-slate-100 font-medium">{selectedHazard.locationName}</span>
                </div>
                {selectedHazard.roadName && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-400 shrink-0">{activeLang === 'hi' ? 'सड़क:' : 'Road:'}</span>
                    <span className="text-right text-slate-100 font-medium">{selectedHazard.roadName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-400 shrink-0">{activeLang === 'hi' ? 'प्रभावित क्षेत्र:' : 'Radius:'}</span>
                  <span className="text-slate-100 font-medium">{selectedHazard.affectedRadius} {activeLang === 'hi' ? 'मीटर' : 'meters'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-400 shrink-0">{activeLang === 'hi' ? 'दर्ज समय:' : 'Reported:'}</span>
                  <span className="text-slate-200 text-[11px]">{selectedHazard.createdAt} ({translateText(selectedHazard.source, activeLang)})</span>
                </div>
                {selectedHazard.description && (
                  <div className="text-[11px] text-slate-300 bg-[#0D1117]/80 rounded p-2 border border-[#30363D]/60 mt-1 italic leading-relaxed">
                    {selectedHazard.description}
                  </div>
                )}
              </div>
              {mode === 'admin' && onResolveHazard && (
                <button
                  onClick={() => {
                    onResolveHazard(selectedHazard.hazardId);
                    setSelectedHazard(null);
                  }}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {t.resolveHazardBtn}
                </button>
              )}
            </div>
          </InfoWindow>
        )}

        {/* Sensor Nodes Markers */}
        {sensorNodes.map((node) => {
          const isOnline = node.status === 'Online';
          return (
            <AdvancedMarker
              key={node.id}
              position={{ lat: node.lat, lng: node.lng }}
              onClick={() => setSelectedSensor(node)}
              title={`${node.id} (${node.name})`}
            >
              <div className="relative flex flex-col items-center cursor-pointer">
                {isOnline && <div className="w-6 h-6 rounded-full bg-emerald-500/30 animate-ping absolute"></div>}
                <div
                  className={`w-6 h-6 rounded-full ${isOnline ? 'bg-emerald-600' : 'bg-slate-700'} border border-slate-300 flex items-center justify-center shadow text-white`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
                  </svg>
                </div>
                <div className="px-1 py-0.5 mt-0.5 bg-[#161B22]/95 text-[9px] font-mono text-emerald-300 rounded border border-emerald-500/30 whitespace-nowrap">
                  {node.id}
                </div>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Sensor Detail InfoWindow */}
        {selectedSensor && (
          <InfoWindow
            position={{ lat: selectedSensor.lat, lng: selectedSensor.lng }}
            onCloseClick={() => setSelectedSensor(null)}
          >
            <div className="p-2.5 text-white min-w-[210px]">
              <div className="flex items-center justify-between border-b border-[#30363D] pb-1.5 mb-2">
                <span className="font-bold text-xs text-white">
                  {selectedSensor.id} ({selectedSensor.name})
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${selectedSensor.status === 'Online' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}
                >
                  {selectedSensor.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">{activeLang === 'hi' ? 'स्थान:' : 'Location:'}</span>
                  <span className="text-slate-100 font-medium">{selectedSensor.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">{activeLang === 'hi' ? 'बैटरी:' : 'Battery:'}</span>
                  <span className="text-emerald-400 font-mono font-bold">{selectedSensor.battery}%</span>
                </div>
                {selectedSensor.lastReading?.vibrationMmS !== undefined && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">{activeLang === 'hi' ? 'कंपन:' : 'Vibration:'}</span>
                    <span className="text-slate-100 font-mono">{selectedSensor.lastReading.vibrationMmS} mm/s</span>
                  </div>
                )}
                {selectedSensor.lastReading?.waterLevelM !== undefined && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">{activeLang === 'hi' ? 'जल स्तर:' : 'Water Level:'}</span>
                    <span className="text-slate-100 font-mono">{selectedSensor.lastReading.waterLevelM} m</span>
                  </div>
                )}
                {selectedSensor.lastReading?.tiltDegrees !== undefined && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">{activeLang === 'hi' ? 'झुकाव:' : 'Tilt:'}</span>
                    <span className="text-slate-100 font-mono">{selectedSensor.lastReading.tiltDegrees}°</span>
                  </div>
                )}
              </div>
            </div>
          </InfoWindow>
        )}

        {/* Temporary Hazard Placement Marker */}
        {tempMarkerPos && (
          <AdvancedMarker position={tempMarkerPos}>
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-red-600/50 animate-ping absolute"></div>
              <div className="w-7 h-7 rounded-full bg-red-500 border-2 border-white flex items-center justify-center shadow-lg text-white font-bold text-xs">
                +
              </div>
            </div>
          </AdvancedMarker>
        )}
      </Map>

      {/* Crosshair creation prompt banner when Admin is placing a hazard */}
      {isCreatingHazard && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-600/90 backdrop-blur-md text-white px-5 py-2 rounded-full border border-red-400 shadow-2xl flex items-center gap-2.5 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
          <span className="text-xs font-bold uppercase tracking-wider">
            {t.clickMapPointText}
          </span>
        </div>
      )}

      {/* Floating Re-center button when driver is exploring the map (positioned above cockpit bar) */}
      {mode === 'driver' && isUserPanning && (
        <div className="absolute bottom-28 sm:bottom-20 left-1/2 -translate-x-1/2 z-[996] pointer-events-auto">
          <button
            type="button"
            onClick={handleCenterVehicle}
            className="px-3.5 py-2 rounded-full bg-[#161B22]/95 hover:bg-[#21262D] text-[#AEF5F0] hover:text-white border border-[#AEF5F0]/60 shadow-2xl backdrop-blur-md text-xs font-bold flex items-center gap-2 transition transform active:scale-95 cursor-pointer animate-fade-in whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-[#AEF5F0] animate-ping"></span>
            <span>{activeLang === 'hi' ? '🎯 वाहन पर केंद्रित करें' : '🎯 Re-center on Vehicle'}</span>
          </button>
        </div>
      )}

      {/* Vertical Map Utility Dock (Right Side Center) - Always Clean & Non-Overlapping */}
      <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-[990] flex flex-col bg-white/95 dark:bg-[#161B22]/95 backdrop-blur-md rounded-2xl border border-slate-300 dark:border-[#30363D] shadow-2xl p-1 gap-1">
        {/* Clean Map Mode Toggle (Hides floating cards for unobstructed road clarity) */}
        {onToggleClearMode && (
          <>
            <button
              onClick={onToggleClearMode}
              title={isMapClearMode ? t.showHudToggle : t.cleanMapToggle}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer relative group ${
                isMapClearMode
                  ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/30'
                  : 'hover:bg-slate-100 dark:hover:bg-[#21262D] text-slate-700 dark:text-slate-200'
              }`}
              aria-label="Toggle Clean Map View"
            >
              <span className="text-sm select-none">{isMapClearMode ? '👁️' : '🗺️'}</span>
              <span className="pointer-events-none absolute right-full mr-2 hidden group-hover:flex items-center px-2 py-1 rounded bg-slate-900 text-white text-[10px] whitespace-nowrap border border-slate-700 shadow-xl z-50">
                {isMapClearMode ? t.showHudToggle : t.cleanMapToggle}
              </span>
            </button>
            <div className="h-px bg-slate-200 dark:bg-[#30363D] mx-1 my-0.5"></div>
          </>
        )}

        {/* Map View Modes: Light Map (directly above Satellite), Satellite Mode, Dark Map */}
        <div className="flex flex-col gap-1">
          {/* Light Mode Map Button - Directly above Satellite Mode */}
          <button
            onClick={() => handleSelectMapStyle('standard')}
            title={activeLang === 'hi' ? 'दिन का लाइट मैप (स्वच्छ सड़क मैप)' : 'Light Map (Clean Daytime Streets)'}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer relative group ${
              mapStyle === 'standard'
                ? 'bg-[#0d9488] text-white font-bold shadow-md shadow-teal-600/30'
                : 'hover:bg-slate-100 dark:hover:bg-[#21262D] text-slate-700 dark:text-slate-200'
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
            title={
              mapStyle === 'satellite'
                ? t.satelliteActiveBadge
                : t.satelliteModeTitle
            }
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer relative group ${
              mapStyle === 'satellite'
                ? 'bg-[#0d9488] text-white font-bold shadow-md shadow-teal-600/30'
                : 'hover:bg-slate-100 dark:hover:bg-[#21262D] text-slate-700 dark:text-slate-200'
            }`}
            aria-label="Satellite Map Mode"
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
                : 'hover:bg-slate-100 dark:hover:bg-[#21262D] text-slate-700 dark:text-slate-200'
            }`}
            aria-label="Dark Map Mode"
          >
            <span className="text-sm select-none">🌙</span>
            <span className="pointer-events-none absolute right-full mr-2 hidden group-hover:flex items-center px-2 py-1 rounded bg-slate-900 text-white text-[10px] whitespace-nowrap border border-slate-700 shadow-xl z-50">
              {activeLang === 'hi' ? 'डार्क मैप (रात)' : 'Dark Map (Night)'}
            </span>
          </button>
        </div>

        <div className="h-px bg-slate-200 dark:bg-[#30363D] mx-1 my-0.5"></div>

        {/* Zoom In (+) */}
        <button
          onClick={handleZoomIn}
          title={t.zoomInBtn}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-[#21262D] text-slate-700 dark:text-slate-200 flex items-center justify-center transition active:scale-95 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        {/* Zoom Out (-) */}
        <button
          onClick={handleZoomOut}
          title={t.zoomOutBtn}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-[#21262D] text-slate-700 dark:text-slate-200 flex items-center justify-center transition active:scale-95 cursor-pointer"
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

      {/* Visible Google Maps Attribution & Engine Switcher (Bottom Right) */}
      <div className="absolute right-3 sm:right-4 bottom-20 sm:bottom-3 z-[990] flex items-center gap-1.5 select-none">
        <div className="bg-[#161B22]/90 backdrop-blur-md text-[9px] sm:text-[10px] text-slate-300 px-2 sm:px-2.5 py-1 rounded-lg border border-[#30363D] flex items-center gap-1 shadow-md">
          <span>🗺️</span>
          <span className="text-[#AEF5F0] font-medium">Google Maps</span>
        </div>
        {onSwitchEngine && (
          <button
            onClick={onSwitchEngine}
            title="Switch to OpenStreetMap Real Roads"
            className="bg-[#161B22]/90 hover:bg-[#21262D] text-[9px] sm:text-[10px] text-slate-300 hover:text-white px-2 py-1 rounded-lg border border-[#30363D] shadow-md transition cursor-pointer"
          >
            OpenStreetMap
          </button>
        )}
      </div>

      {/* Collapsible Map Legend (Bottom Left) - Unobtrusive & Never Blocks Road View */}
      <div className="absolute left-3 sm:left-4 bottom-20 sm:bottom-3 z-[990]">
        {isLegendOpen ? (
          <div className="bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] rounded-2xl p-3 shadow-2xl text-[11px] text-slate-300 w-64 animate-fade-in space-y-2">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-1.5">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#AEF5F0]"></span>
                <span>{t.mapLegendTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLegendOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-1 rounded cursor-pointer"
                title={t.dismiss}
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#AEF5F0] border border-white shrink-0"></span>
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
                <span className="text-red-400 font-bold shrink-0">⚠</span>
                <span className="truncate">{t.legendHazard}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-400 shrink-0"></span>
                <span className="truncate">{t.legendSensorNode}</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsLegendOpen(true)}
            title={t.mapLegendTitle}
            className="h-7 px-2.5 rounded-lg bg-[#161B22]/90 backdrop-blur-md border border-[#30363D] hover:border-[#AEF5F0]/40 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 shadow-lg transition cursor-pointer select-none"
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

interface GoogleMapContainerProps extends RoutePilotMapProps {
  apiKey: string;
  onFallbackToOsm: () => void;
  onSwitchToOsm: () => void;
}

const GoogleMapContainer: React.FC<GoogleMapContainerProps> = ({
  apiKey,
  onFallbackToOsm,
  onSwitchToOsm,
  ...restProps
}) => {
  const [loadFailed, setLoadFailed] = useState(false);

  if (loadFailed) {
    return <LeafletMapInner {...restProps} onSwitchEngine={undefined} />;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['places', 'geometry', 'routes']}
      onError={(err) => {
        console.warn('[RoutePilot] Google Maps initialization error, falling back to OSM:', err);
        setLoadFailed(true);
        onFallbackToOsm();
      }}
    >
      <GoogleMapInner {...restProps} onSwitchEngine={onSwitchToOsm} />
    </APIProvider>
  );
};

/**
 * Main Export: Dual-Engine RoutePilot Map
 * - Native Google Maps with AdvancedMarkerElement, Satellite & Dark styles
 * - Instant toggle to High-Fidelity OpenStreetMap engine
 * - Seamless automatic fallback if offline or API quota reached
 */
export const RoutePilotMap: React.FC<RoutePilotMapProps> = (props) => {
  const envMapsKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const activeKey = (
    props.googleMapsApiKey ||
    realtimeSync.getState().appSettings.googleMapsApiKey ||
    envMapsKey
  ).trim();

  const [engine, setEngine] = useState<'google' | 'osm'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('routepilot_map_engine');
      if (saved === 'osm') return 'osm';
      if (saved === 'google') return 'google';
    }
    return activeKey ? 'google' : 'osm';
  });

  const handleSwitchToOsm = () => {
    setEngine('osm');
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_map_engine', 'osm');
      } catch {}
    }
    if (props.onSwitchEngine) props.onSwitchEngine();
  };

  const handleSwitchToGoogle = () => {
    setEngine('google');
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_map_engine', 'google');
      } catch {}
    }
    if (props.onSwitchEngine) props.onSwitchEngine();
  };

  if (engine === 'google' && activeKey) {
    return (
      <div className="relative w-full h-full">
        <GoogleMapContainer
          {...props}
          apiKey={activeKey}
          onSwitchToOsm={handleSwitchToOsm}
          onFallbackToOsm={handleSwitchToOsm}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <LeafletMapInner
        {...props}
        onSwitchEngine={activeKey ? handleSwitchToGoogle : undefined}
      />
    </div>
  );
};
