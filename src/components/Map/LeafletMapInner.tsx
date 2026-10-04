import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { Hazard, SensorNode, VehicleType, Journey } from '../../types';
import { realtimeSync } from '../../services/realtimeSync';
import { getTranslation, translateText } from '../../services/i18n';

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
  onSelectDestinationFromMap?: (lat: number, lng: number) => void;
  onResolveHazard?: (hazardId: string) => void;
  onCommitRoute?: (routeId: string) => void;
  theme?: 'standard' | 'satellite';
  onToggleTheme?: () => void;
  onChangeTheme?: (theme: 'standard' | 'satellite') => void;
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

  const activeLang = language || realtimeSync.getState().appSettings.language || 'en';
  const t = getTranslation(activeLang);

  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>(() => {
    if (theme === 'satellite') return 'satellite';
    if (theme === 'standard') return 'standard';
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('routepilot_map_theme');
      if (saved === 'satellite') return 'satellite';
    }
    return 'standard';
  });

  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // High-frequency vehicle location
  const [vehiclePos, setVehiclePos] = useState({
    lat: journey.currentLocation.lat,
    lng: journey.currentLocation.lng,
    heading: journey.currentLocation.heading || 0,
  });

  // Vehicle Icon SVG generator
  const getVehicleSvg = (type: VehicleType) => {
    switch (type) {
      case 'bike':
        return `<svg class="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L9 6H6m6 11.5l3.5-7 3.5 2"/></svg>`;
      case 'van':
        return `<svg class="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="5" width="16" height="12" rx="2"/><path d="M17 9l4 2v6h-4M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>`;
      case 'bus':
        return `<svg class="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M8 15h.01M16 15h.01M6 19v2M18 19v2"/></svg>`;
      case 'truck':
        return `<svg class="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm13 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>`;
      default: // car
        return `<svg class="w-5 h-5 text-slate-950" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>`;
    }
  };

  // Sync theme
  useEffect(() => {
    if (theme === 'satellite' || theme === 'standard') {
      setMapStyle(theme);
    }
  }, [theme]);

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

  // Smooth base layer switching between Standard and Satellite
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
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 50);
  }, [mapStyle]);

  // Click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (isCreatingHazard && onMapClickForHazard) {
        onMapClickForHazard(lat, lng);
      } else if (mode === 'driver' && !journey.isNavigating && onSelectDestinationFromMap) {
        onSelectDestinationFromMap(lat, lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isCreatingHazard, onMapClickForHazard, mode, journey.isNavigating, onSelectDestinationFromMap]);

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

    // 1. Origin Marker
    if (journey.origin && journey.origin.lat) {
      const originIcon = L.divIcon({
        className: 'origin-marker-container',
        html: `
          <div class="flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
            <div class="w-7 h-7 rounded-full bg-[#AEF5F0] border-2 border-slate-900 flex items-center justify-center shadow-md">
              <div class="w-2.5 h-2.5 rounded-full bg-slate-900"></div>
            </div>
            <div class="px-2 py-0.5 mt-1 bg-[#161B22]/95 text-[#AEF5F0] text-[10px] font-semibold rounded border border-[#AEF5F0]/40 shadow whitespace-nowrap">
              ${journey.origin.name}
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
            <div class="px-2 py-0.5 mt-1 bg-[#161B22]/95 text-red-300 text-[11px] font-bold rounded border border-red-500/40 shadow-lg whitespace-nowrap">
              ${journey.destination.name}
            </div>
          </div>
        `,
        iconSize: [34, 46],
        iconAnchor: [17, 23],
      });
      L.marker([journey.destination.lat, journey.destination.lng], { icon: destIcon }).addTo(routesLayer);
    }

    // 3. Active Route Polylines (Highlighted Neon Cyan Path from Source to Destination)
    if (journey.activeRoute && journey.activeRoute.coordinates.length > 1) {
      const coords: [number, number][] = journey.activeRoute.coordinates.map(([lat, lng]) => [lat, lng]);

      // Outer Glow Halo
      L.polyline(coords, {
        color: '#00f2fe',
        weight: 14,
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routesLayer);

      // Core Highlight Path
      L.polyline(coords, {
        color: journey.activeRoute.color || '#AEF5F0',
        weight: 6,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routesLayer);

      // Directional Flow Centerline
      L.polyline(coords, {
        color: '#ffffff',
        weight: 2,
        opacity: 0.85,
        dashArray: '10, 15',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routesLayer);
    }

    // 4. Alternative Routes Polylines + Badges
    if (journey.alternativeRoutes && journey.alternativeRoutes.length > 0) {
      journey.alternativeRoutes.forEach((altRoute) => {
        if (!altRoute.coordinates || altRoute.coordinates.length < 2) return;
        const coords: [number, number][] = altRoute.coordinates.map(([lat, lng]) => [lat, lng]);

        // Glow
        L.polyline(coords, {
          color: altRoute.color,
          weight: 10,
          opacity: 0.25,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routesLayer);

        // Dashed alternative route line
        L.polyline(coords, {
          color: altRoute.color,
          weight: 5,
          opacity: 0.95,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routesLayer);

        // Midpoint badge
        const midIdx = Math.floor(coords.length / 2);
        const midPt = coords[midIdx];
        if (midPt) {
          const badgeIcon = L.divIcon({
            className: 'alt-route-badge-container',
            html: `
              <div
                class="px-2.5 py-1 rounded-md text-xs font-bold border shadow-xl flex items-center gap-1.5 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap active:scale-95 transition"
                style="background-color: #161B22; border-color: ${altRoute.color}; color: ${altRoute.color};"
              >
                <span class="w-2 h-2 rounded-full" style="background-color: ${altRoute.color};"></span>
                <span>${translateText(altRoute.name, activeLang)}</span>
                <span class="text-slate-300 font-normal">
                  • ${altRoute.distanceKm} ${activeLang === 'hi' ? 'किमी' : 'km'} • ${altRoute.durationMinutes} ${activeLang === 'hi' ? 'मिनट' : 'min'}
                </span>
              </div>
            `,
            iconSize: [160, 30],
            iconAnchor: [80, 15],
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

    if (allCoords.length >= 2 && !journey.isNavigating) {
      try {
        const bounds = L.latLngBounds(allCoords);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      } catch {}
    }
  }, [journey.activeRoute, journey.alternativeRoutes, journey.origin, journey.destination, activeLang, onCommitRoute]);

  // Render Hazards
  useEffect(() => {
    const map = mapRef.current;
    const hazardsLayer = hazardsLayerRef.current;
    if (!map || !hazardsLayer) return;

    hazardsLayer.clearLayers();

    hazards.forEach((hazard) => {
      if (hazard.status !== 'ACTIVE') return;
      const isCritical = hazard.severity === 'CRITICAL' || hazard.severity === 'BLOCKED';
      const color = isCritical ? '#ef4444' : '#f59e0b';
      const borderColor = isCritical ? '#dc2626' : '#d97706';

      // Circle
      L.circle([hazard.latitude, hazard.longitude], {
        radius: hazard.affectedRadius || 180,
        fillColor: color,
        fillOpacity: 0.22,
        color: borderColor,
        weight: 1.5,
      }).addTo(hazardsLayer);

      // Warning Marker
      const hazardIcon = L.divIcon({
        className: 'hazard-marker-container',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer -translate-x-1/2 -translate-y-1/2">
            <div class="w-10 h-10 rounded-full ${isCritical ? 'bg-red-500/40' : 'bg-amber-500/40'} animate-ping absolute"></div>
            <div class="w-9 h-9 rounded-full ${isCritical ? 'bg-red-600' : 'bg-amber-500'} border-2 border-white flex items-center justify-center shadow-2xl text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div class="px-2 py-0.5 mt-1 bg-[#161B22]/95 border ${isCritical ? 'border-red-500/60 text-red-200' : 'border-amber-500/60 text-amber-200'} text-[11px] font-bold rounded shadow-lg whitespace-nowrap">
              ${translateText(hazard.type, activeLang)}
            </div>
          </div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 25],
      });

      const marker = L.marker([hazard.latitude, hazard.longitude], { icon: hazardIcon }).addTo(hazardsLayer);

      // Info Popup
      const popupHtml = `
        <div style="font-family: 'Inter', sans-serif; min-width: 220px; padding: 4px; color: #0f172a;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="font-size: 13px; color: #0f172a;">${translateText(hazard.type, activeLang)}</strong>
            <span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background-color: ${isCritical ? '#fee2e2; color: #b91c1c;' : '#fef3c7; color: #b45309;'}">
              ${hazard.severity}
            </span>
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: #334155; margin-bottom: 8px;">
            <div><strong>${activeLang === 'hi' ? 'स्थान:' : 'Location:'}</strong> ${hazard.locationName || hazard.roadName || ''}</div>
            <div><strong>${activeLang === 'hi' ? 'प्रभाव त्रिज्या:' : 'Radius:'}</strong> ${hazard.affectedRadius || 180}m</div>
            <div><strong>${activeLang === 'hi' ? 'विवरण:' : 'Details:'}</strong> ${hazard.description}</div>
          </div>
          ${onResolveHazard ? `
            <button id="resolve-btn-${hazard.hazardId}" style="width: 100%; padding: 6px; background-color: #10b981; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
              ${t.resolveHazardBtn || 'Resolve Hazard'}
            </button>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`resolve-btn-${hazard.hazardId}`);
        if (btn && onResolveHazard) {
          btn.onclick = () => {
            onResolveHazard(hazard.hazardId);
            map.closePopup();
          };
        }
      });
    });
  }, [hazards, activeLang, onResolveHazard, t]);

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

      const sensorPopup = `
        <div style="font-family: 'Inter', sans-serif; min-width: 190px; padding: 4px; color: #0f172a;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px;">
            <strong style="font-size: 12px; color: #0f172a;">${node.id} (${node.name})</strong>
            <span style="font-size: 9px; font-weight: bold; padding: 2px 4px; border-radius: 4px; background-color: ${isOnline ? '#d1fae5; color: #047857;' : '#fee2e2; color: #b91c1c;'}">
              ${node.status}
            </span>
          </div>
          <div style="font-size: 11px; line-height: 1.4; color: #334155;">
            <div><strong>${activeLang === 'hi' ? 'स्थान:' : 'Location:'}</strong> ${node.location}</div>
            <div><strong>${activeLang === 'hi' ? 'बैटरी:' : 'Battery:'}</strong> ${node.battery}%</div>
            ${node.lastReading?.vibrationMmS !== undefined ? `<div><strong>${activeLang === 'hi' ? 'कंपन:' : 'Vibration:'}</strong> ${node.lastReading.vibrationMmS} mm/s</div>` : ''}
            ${node.lastReading?.waterLevelM !== undefined ? `<div><strong>${activeLang === 'hi' ? 'जल स्तर:' : 'Water Level:'}</strong> ${node.lastReading.waterLevelM} m</div>` : ''}
            ${node.lastReading?.tiltDegrees !== undefined ? `<div><strong>${activeLang === 'hi' ? 'झुकाव:' : 'Tilt:'}</strong> ${node.lastReading.tiltDegrees}°</div>` : ''}
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
        const vehicleIcon = L.divIcon({
          className: 'vehicle-marker-wrapper',
          html: `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="width: 44px; height: 44px;">
              <div class="vehicle-rotator relative flex items-center justify-center transition-transform duration-75 ease-linear" style="transform: rotate(${loc.heading}deg);">
                <div class="absolute -top-6 w-12 h-8 bg-gradient-to-t from-[#AEF5F0]/50 to-transparent rounded-full filter blur-xs pointer-events-none"></div>
                <div class="w-10 h-10 rounded-full bg-[#AEF5F0]/30 animate-ping absolute"></div>
                <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#AEF5F0] to-[#5eead4] border-2 border-slate-900 text-slate-950 flex items-center justify-center shadow-2xl vehicle-marker-glow font-bold">
                  ${getVehicleSvg(journey.vehicleType)}
                </div>
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
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

      // Smooth camera follow when navigating
      if (journey.isNavigating && mapRef.current) {
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
      try {
        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.remove();
          vehicleMarkerRef.current = null;
        }
      } catch {
        // Defensive ignore
      }
    };
  }, [journey.isNavigating, journey.vehicleType]);

  // Fit bounds when active route is initialized
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !journey.activeRoute || journey.activeRoute.coordinates.length < 2 || journey.isNavigating) return;

    const latLngs: L.LatLngExpression[] = journey.activeRoute.coordinates.map(([lat, lng]) => [lat, lng]);
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [journey.activeRoute, journey.isNavigating]);

  // UI Handlers
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleCenterVehicle = () => {
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
    <div className="relative w-full h-full bg-[#0D1117] overflow-hidden select-none">
      {/* Leaflet Map DOM Canvas */}
      <div ref={containerRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />

      {/* Hazard creation banner when placing hazard */}
      {isCreatingHazard && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-600/90 backdrop-blur-md text-white px-5 py-2 rounded-full border border-red-400 shadow-2xl flex items-center gap-2.5 animate-bounce pointer-events-none">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
          <span className="text-xs font-bold uppercase tracking-wider">
            {t.clickMapPointText || 'Click ANYWHERE on Map to place hazard'}
          </span>
        </div>
      )}

      {/* Vertical Map Utility Dock (Right Side Center) */}
      <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-[990] flex flex-col bg-[#161B22]/95 backdrop-blur-md rounded-2xl border border-[#30363D] shadow-2xl p-1 gap-1">
        {/* Satellite Mode Toggle */}
        <button
          onClick={toggleMapStyle}
          title={mapStyle === 'satellite' ? t.satelliteActiveBadge : t.satelliteModeTitle}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer relative group ${
            mapStyle === 'satellite'
              ? 'bg-[#AEF5F0] text-slate-950 font-bold shadow-md shadow-[#AEF5F0]/30'
              : 'hover:bg-[#21262D] text-slate-200 hover:text-white'
          }`}
          aria-label="Toggle Satellite Mode"
        >
          <span className="text-sm select-none">🛰️</span>
          <span className="pointer-events-none absolute right-full mr-2 hidden group-hover:flex items-center px-2 py-1 rounded bg-[#0D1117] text-white text-[10px] whitespace-nowrap border border-[#30363D] shadow-xl z-50">
            {mapStyle === 'satellite' ? t.satelliteActiveBadge : t.satelliteModeTitle}
          </span>
        </button>

        <div className="h-px bg-[#30363D] mx-1 my-0.5"></div>

        {/* Zoom In (+) */}
        <button
          onClick={handleZoomIn}
          title={t.zoomInBtn}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-[#21262D] text-slate-200 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        {/* Zoom Out (-) */}
        <button
          onClick={handleZoomOut}
          title={t.zoomOutBtn}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-[#21262D] text-slate-200 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
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

      {/* Map Engine Badge (Bottom Right) */}
      <div className="absolute right-3 sm:right-4 bottom-2.5 sm:bottom-3 z-[990] flex items-center gap-1.5">
        <div className="bg-[#161B22]/90 backdrop-blur-md text-[9px] sm:text-[10px] text-slate-300 px-2.5 py-1 rounded-lg border border-[#30363D] flex items-center gap-1.5 shadow-md select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-white">OpenStreetMap</span>
          <span className="text-slate-400 hidden sm:inline">• Real Roads & Satellite</span>
        </div>
      </div>

      {/* Collapsible Map Legend (Bottom Left) */}
      <div className="absolute left-3 sm:left-4 bottom-2.5 sm:bottom-3 z-[990]">
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
