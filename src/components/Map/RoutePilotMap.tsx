import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Hazard, SensorNode, RouteOption, VehicleType, Journey } from '../../types';

interface RoutePilotMapProps {
  mode: 'admin' | 'driver';
  hazards: Hazard[];
  sensorNodes: SensorNode[];
  journey: Journey;
  isCreatingHazard?: boolean;
  onMapClickForHazard?: (lat: number, lng: number) => void;
  onResolveHazard?: (hazardId: string) => void;
  onCommitRoute?: (routeId: string) => void;
  theme?: 'standard' | 'satellite';
  onToggleTheme?: () => void;
  onChangeTheme?: (theme: 'standard' | 'satellite') => void;
}

export const RoutePilotMap: React.FC<RoutePilotMapProps> = ({
  mode,
  hazards,
  sensorNodes,
  journey,
  isCreatingHazard,
  onMapClickForHazard,
  onResolveHazard,
  onCommitRoute,
  theme,
  onToggleTheme,
  onChangeTheme,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>(() => {
    if (theme === 'satellite') return 'satellite';
    if (theme === 'standard') return 'standard';
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('routepilot_map_theme');
      if (saved === 'satellite') return 'satellite';
    }
    return 'standard';
  });

  // Keep state synced if theme prop updates
  useEffect(() => {
    if (theme === 'satellite' || theme === 'standard') {
      setMapStyle(theme);
    }
  }, [theme]);

  // Switch between Standard OpenStreetMap and Satellite Mode layers
  useEffect(() => {
    if (mapContainerRef.current) {
      mapContainerRef.current.classList.remove('leaflet-dark-mode');
    }
    const map = mapRef.current;
    if (map && osmLayerRef.current && satelliteLayerRef.current) {
      if (mapStyle === 'satellite') {
        if (map.hasLayer(osmLayerRef.current)) {
          map.removeLayer(osmLayerRef.current);
        }
        if (!map.hasLayer(satelliteLayerRef.current)) {
          satelliteLayerRef.current.addTo(map);
        }
      } else {
        if (map.hasLayer(satelliteLayerRef.current)) {
          map.removeLayer(satelliteLayerRef.current);
        }
        if (!map.hasLayer(osmLayerRef.current)) {
          osmLayerRef.current.addTo(map);
        }
      }
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('routepilot_map_theme', mapStyle);
      } catch {}
    }
  }, [mapStyle]);

  // Layers refs
  const activeRouteLayerRef = useRef<L.Polyline | null>(null);
  const activeRouteGlowRef = useRef<L.Polyline | null>(null);
  const altRoutesGroupRef = useRef<L.FeatureGroup | null>(null);
  const hazardsGroupRef = useRef<L.FeatureGroup | null>(null);
  const sensorsGroupRef = useRef<L.FeatureGroup | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Leaflet Map with Standard OpenStreetMap & Satellite Hybrid Layers
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapContainerRef.current.classList.remove('leaflet-dark-mode');

    // Center on Jhansi, Uttar Pradesh
    const map = L.map(mapContainerRef.current, {
      center: [25.4570, 78.5750],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // 1. Standard OpenStreetMap tile layer
    const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      zIndex: 1,
    });

    // 2. High-Resolution Satellite Imagery + Hybrid Road & Place Labels
    const satImagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        zIndex: 1,
      }
    );
    const satRoads = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        opacity: 0.85,
        zIndex: 2,
      }
    );
    const satLabels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        opacity: 0.95,
        zIndex: 3,
      }
    );
    const satelliteGroup = L.layerGroup([satImagery, satRoads, satLabels]);

    osmLayerRef.current = osmLayer;
    satelliteLayerRef.current = satelliteGroup;

    const initialStyle =
      theme === 'satellite' ||
      (!theme && typeof window !== 'undefined' && localStorage.getItem('routepilot_map_theme') === 'satellite')
        ? 'satellite'
        : 'standard';

    if (initialStyle === 'satellite') {
      satelliteGroup.addTo(map);
    } else {
      osmLayer.addTo(map);
    }

    // Feature groups
    altRoutesGroupRef.current = L.featureGroup().addTo(map);
    hazardsGroupRef.current = L.featureGroup().addTo(map);
    sensorsGroupRef.current = L.featureGroup().addTo(map);

    mapRef.current = map;

    // Seamless auto-resize observer to prevent any jarring when layout changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize({ pan: false });
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    // Ensure Leaflet size is immediately calibrated after initial mount & tab animations
    const t1 = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ pan: false });
      }
    }, 60);

    const t2 = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ pan: false });
      }
    }, 250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle Map Tile Layer Switch
  const toggleMapStyle = () => {
    const nextStyle = mapStyle === 'satellite' ? 'standard' : 'satellite';
    setMapStyle(nextStyle);
    if (onChangeTheme) {
      onChangeTheme(nextStyle);
    } else if (onToggleTheme) {
      onToggleTheme();
    }
  };

  // Map Click Listener for Creating Hazard anywhere
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isCreatingHazard && onMapClickForHazard) {
        const { lat, lng } = e.latlng;
        // Temporary marker
        if (tempMarkerRef.current) {
          tempMarkerRef.current.remove();
        }
        const tempIcon = L.divIcon({
          className: 'custom-temp-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-8 h-8 rounded-full bg-red-600/50 animate-ping absolute"></div>
              <div class="w-7 h-7 rounded-full bg-red-500 border-2 border-white flex items-center justify-center shadow-lg text-white font-bold text-xs">
                +
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        tempMarkerRef.current = L.marker([lat, lng], { icon: tempIcon }).addTo(map);

        onMapClickForHazard(lat, lng);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isCreatingHazard, onMapClickForHazard]);

  // Clean up temp marker when creation mode is cancelled
  useEffect(() => {
    if (!isCreatingHazard && tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }
  }, [isCreatingHazard]);

  // Render Origin & Destination Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Origin Marker
    if (journey.origin) {
      if (!originMarkerRef.current) {
        const originIcon = L.divIcon({
          className: 'origin-marker',
          html: `
            <div class="flex flex-col items-center">
              <div class="w-7 h-7 rounded-full bg-[#AEF5F0] border-2 border-slate-900 flex items-center justify-center shadow-md">
                <div class="w-2.5 h-2.5 rounded-full bg-slate-900"></div>
              </div>
              <div class="px-2 py-0.5 mt-1 bg-[#161B22]/95 text-[#AEF5F0] text-[10px] font-semibold rounded border border-[#AEF5F0]/40 shadow whitespace-nowrap">
                ${journey.origin.name}
              </div>
            </div>
          `,
          iconSize: [30, 48],
          iconAnchor: [15, 14],
        });
        originMarkerRef.current = L.marker([journey.origin.lat, journey.origin.lng], {
          icon: originIcon,
        }).addTo(map);
      } else {
        originMarkerRef.current.setLatLng([journey.origin.lat, journey.origin.lng]);
      }
    }

    // Destination Marker (only rendered when real destination is selected)
    if (journey.destination && journey.destination.name && journey.destination.lat !== 0) {
      if (!destMarkerRef.current) {
        const destIcon = L.divIcon({
          className: 'destination-marker',
          html: `
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-xl text-white">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              </div>
              <div class="px-2 py-0.5 mt-1 bg-[#161B22]/95 text-red-300 text-[11px] font-bold rounded border border-red-500/40 shadow-lg whitespace-nowrap">
                ${journey.destination.name}
              </div>
            </div>
          `,
          iconSize: [32, 54],
          iconAnchor: [16, 16],
        });
        destMarkerRef.current = L.marker([journey.destination.lat, journey.destination.lng], {
          icon: destIcon,
        }).addTo(map);
      } else {
        destMarkerRef.current.setLatLng([journey.destination.lat, journey.destination.lng]);
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
  }, [journey.origin, journey.destination]);

  // Render Active Route
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeRouteLayerRef.current) {
      activeRouteLayerRef.current.remove();
      activeRouteLayerRef.current = null;
    }
    if (activeRouteGlowRef.current) {
      activeRouteGlowRef.current.remove();
      activeRouteGlowRef.current = null;
    }

    if (journey.activeRoute && journey.activeRoute.coordinates.length > 1) {
      const latlngs = journey.activeRoute.coordinates.map((c) => [c[0], c[1]] as [number, number]);

      // Route Glow casing
      activeRouteGlowRef.current = L.polyline(latlngs, {
        color: '#AEF5F0',
        weight: 12,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Active Route main line
      activeRouteLayerRef.current = L.polyline(latlngs, {
        color: journey.activeRoute.color || '#AEF5F0',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Auto fit bounds to make chosen route clearly visible
      if (latlngs.length > 0 && !journey.isNavigating) {
        try {
          const bounds = L.latLngBounds(latlngs);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
        } catch {}
      }
    }
  }, [journey.activeRoute, journey.isNavigating]);

  // Render Alternative Routes
  useEffect(() => {
    const map = mapRef.current;
    const group = altRoutesGroupRef.current;
    if (!group || !map) return;

    group.clearLayers();

    if (journey.alternativeRoutes && journey.alternativeRoutes.length > 0) {
      journey.alternativeRoutes.forEach((route) => {
        if (!route.coordinates || route.coordinates.length < 2) return;

        const latlngs = route.coordinates.map((c) => [c[0], c[1]] as [number, number]);

        // Alternative route casing
        const glow = L.polyline(latlngs, {
          color: route.color,
          weight: 10,
          opacity: 0.25,
          lineCap: 'round',
        });
        group.addLayer(glow);

        // Alternative route line
        const polyline = L.polyline(latlngs, {
          color: route.color,
          weight: 5,
          dashArray: '8, 8',
          opacity: 0.95,
        });
        group.addLayer(polyline);

        // Midpoint Route Label badge on the map
        const midIndex = Math.floor(route.coordinates.length / 2);
        const midPoint = route.coordinates[midIndex];

        const labelIcon = L.divIcon({
          className: 'alt-route-label',
          html: `
            <div class="px-2.5 py-1 rounded-md text-xs font-bold border shadow-xl flex items-center gap-1.5 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
                 style="background-color: #161B22; border-color: ${route.color}; color: ${route.color};">
              <span class="w-2 h-2 rounded-full" style="background-color: ${route.color};"></span>
              <span>${route.name}</span>
              <span class="text-slate-300 font-normal">• ${route.distanceKm} km • ${route.durationMinutes} min</span>
            </div>
          `,
          iconSize: [160, 28],
        });

        const labelMarker = L.marker([midPoint[0], midPoint[1]], { icon: labelIcon });
        if (onCommitRoute) {
          labelMarker.on('click', () => onCommitRoute(route.id));
        }
        group.addLayer(labelMarker);
      });

      // Auto fit bounds over all optimal routes
      try {
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
        }
      } catch {}
    }
  }, [journey.alternativeRoutes, onCommitRoute]);

  // Render Vehicle Marker (Single vehicle for current journey!)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const loc = journey.currentLocation;
    const vType = journey.vehicleType;

    // Vehicle icon SVG depending on type
    const getVehicleSvg = (type: VehicleType) => {
      switch (type) {
        case 'bike':
          return `<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L9 6H6m6 11.5l3.5-7 3.5 2"/></svg>`;
        case 'van':
          return `<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="5" width="16" height="12" rx="2"/><path d="M17 9l4 2v6h-4M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>`;
        case 'bus':
          return `<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M8 15h.01M16 15h.01M6 19v2M18 19v2"/></svg>`;
        case 'truck':
          return `<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm13 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>`;
        default: // car
          return `<svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>`;
      }
    };

    const vehicleHtml = `
      <div class="relative flex items-center justify-center" style="transform: rotate(${loc.heading || 0}deg);">
        <!-- Directional beam -->
        <div class="absolute -top-6 w-12 h-8 bg-gradient-to-t from-[#AEF5F0]/50 to-transparent rounded-full filter blur-xs pointer-events-none"></div>
        <!-- Outer pulse ring -->
        <div class="w-10 h-10 rounded-full bg-[#AEF5F0]/30 animate-ping absolute"></div>
        <!-- Inner vehicle badge -->
        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#AEF5F0] to-[#5eead4] border-2 border-slate-900 text-slate-950 flex items-center justify-center shadow-2xl vehicle-marker-glow font-bold">
          ${getVehicleSvg(vType)}
        </div>
      </div>
    `;

    const vehicleIcon = L.divIcon({
      className: 'driver-vehicle-marker',
      html: vehicleHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: vehicleIcon }).addTo(map);
    } else {
      vehicleMarkerRef.current.setLatLng([loc.lat, loc.lng]);
      vehicleMarkerRef.current.setIcon(vehicleIcon);
    }
  }, [journey.currentLocation, journey.vehicleType]);

  // Render Hazards
  useEffect(() => {
    const group = hazardsGroupRef.current;
    if (!group) return;

    group.clearLayers();

    hazards.forEach((hazard) => {
      if (hazard.status !== 'ACTIVE') return;

      const isCritical = hazard.severity === 'CRITICAL' || hazard.severity === 'BLOCKED';
      const color = isCritical ? '#ef4444' : '#f59e0b';
      const bgColor = isCritical ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)';
      const borderColor = isCritical ? '#dc2626' : '#d97706';

      // 1. Affected area radius circle
      const radiusCircle = L.circle([hazard.latitude, hazard.longitude], {
        radius: hazard.affectedRadius || 180,
        color: borderColor,
        fillColor: color,
        fillOpacity: 0.22,
        weight: 1.5,
        dashArray: '4, 4',
      });
      group.addLayer(radiusCircle);

      // 2. Exact Hazard Center Marker
      const hazardIcon = L.divIcon({
        className: 'hazard-marker-pin',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer">
            <div class="w-10 h-10 rounded-full ${isCritical ? 'bg-red-500/40' : 'bg-amber-500/40'} animate-ping absolute"></div>
            <div class="w-9 h-9 rounded-full ${isCritical ? 'bg-red-600' : 'bg-amber-500'} border-2 border-white flex items-center justify-center shadow-2xl text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="px-2 py-0.5 mt-1 bg-[#161B22]/95 border ${isCritical ? 'border-red-500/60 text-red-200' : 'border-amber-500/60 text-amber-200'} text-[11px] font-bold rounded shadow-lg whitespace-nowrap">
              ${hazard.type}
            </div>
          </div>
        `,
        iconSize: [36, 50],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([hazard.latitude, hazard.longitude], { icon: hazardIcon });

      // Popup with full details & resolve button
      const popupContent = `
        <div class="p-2 text-slate-100 min-w-[220px]">
          <div class="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5 mb-2">
            <div class="font-bold text-sm text-white">${hazard.type}</div>
            <span class="px-1.5 py-0.5 text-[10px] font-bold rounded ${
              isCritical ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }">${hazard.severity}</span>
          </div>
          <div class="text-xs text-slate-300 space-y-1 mb-3">
            <div><span class="text-slate-400">Location:</span> ${hazard.locationName}</div>
            <div><span class="text-slate-400">Road:</span> ${hazard.roadName}</div>
            <div><span class="text-slate-400">Radius:</span> ${hazard.affectedRadius} meters</div>
            <div><span class="text-slate-400">Reported:</span> ${hazard.createdAt} (${hazard.source})</div>
            <div class="text-[11px] italic text-slate-400 mt-1">${hazard.description}</div>
          </div>
          ${
            mode === 'admin' && onResolveHazard
              ? `<button id="btn-resolve-${hazard.hazardId}" class="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition cursor-pointer">
                  ✓ Resolve Hazard
                </button>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-resolve-${hazard.hazardId}`);
        if (btn && onResolveHazard) {
          btn.onclick = () => {
            onResolveHazard(hazard.hazardId);
            mapRef.current?.closePopup();
          };
        }
      });

      group.addLayer(marker);
    });
  }, [hazards, mode, onResolveHazard]);

  // Render Sensor Nodes
  useEffect(() => {
    const group = sensorsGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // Only display sensor nodes in Admin mode or if relevant
    sensorNodes.forEach((node) => {
      const isOnline = node.status === 'Online';

      const sensorIcon = L.divIcon({
        className: 'sensor-marker-pin',
        html: `
          <div class="relative flex flex-col items-center">
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
        iconSize: [24, 38],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([node.lat, node.lng], { icon: sensorIcon });
      marker.bindPopup(`
        <div class="p-2 text-slate-100 min-w-[190px]">
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-1 mb-1.5">
            <span class="font-bold text-xs text-white">${node.id} (${node.name})</span>
            <span class="px-1.5 py-0.5 text-[9px] font-bold rounded ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}">
              ${node.status}
            </span>
          </div>
          <div class="text-[11px] text-slate-300 space-y-0.5">
            <div><span class="text-slate-400">Location:</span> ${node.location}</div>
            <div><span class="text-slate-400">Battery:</span> ${node.battery}%</div>
            ${node.lastReading?.vibrationMmS !== undefined ? `<div><span class="text-slate-400">Vibration:</span> ${node.lastReading.vibrationMmS} mm/s</div>` : ''}
            ${node.lastReading?.waterLevelM !== undefined ? `<div><span class="text-slate-400">Water Level:</span> ${node.lastReading.waterLevelM} m</div>` : ''}
            ${node.lastReading?.tiltDegrees !== undefined ? `<div><span class="text-slate-400">Tilt:</span> ${node.lastReading.tiltDegrees}°</div>` : ''}
          </div>
        </div>
      `);

      group.addLayer(marker);
    });
  }, [sensorNodes]);

  const handleCenterVehicle = () => {
    if (mapRef.current && journey.currentLocation) {
      mapRef.current.setView([journey.currentLocation.lat, journey.currentLocation.lng], 15, {
        animate: true,
      });
    }
  };

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  return (
    <div className="relative w-full h-full bg-[#0D1117] overflow-hidden select-none">
      {/* Map DOM Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${isCreatingHazard ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      />

      {/* Crosshair creation prompt banner when Admin is placing a hazard */}
      {isCreatingHazard && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-600/90 backdrop-blur-md text-white px-5 py-2 rounded-full border border-red-400 shadow-2xl flex items-center gap-2.5 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
          <span className="text-xs font-bold uppercase tracking-wider">
            Click ANYWHERE on the map to place hazard
          </span>
        </div>
      )}

      {/* Map Controls (Right Side) */}
      <div className={`absolute right-3 sm:right-4 ${mode === 'driver' ? 'bottom-16 sm:bottom-24' : 'bottom-9 sm:bottom-11'} z-[990] flex flex-col gap-1.5 sm:gap-2`}>
        {/* Satellite Mode Option directly above Plus (+) button */}
        <button
          onClick={toggleMapStyle}
          title={mapStyle === 'satellite' ? 'Satellite Mode Active (Click to switch to Standard Map)' : 'Switch to Satellite Mode'}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer relative group ${
            mapStyle === 'satellite'
              ? 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950 font-bold shadow-md shadow-[#AEF5F0]/30'
              : 'bg-[#161B22]/90 border-[#30363D] hover:bg-[#21262D] text-slate-200 hover:text-white'
          }`}
          aria-label="Toggle Satellite Mode"
        >
          <span className="text-sm select-none">🛰️</span>
          <span className="pointer-events-none absolute right-full mr-2 hidden group-hover:flex items-center px-2 py-1 rounded bg-[#0D1117] text-white text-[11px] whitespace-nowrap border border-[#30363D] shadow-xl z-50">
            {mapStyle === 'satellite' ? 'Satellite: Active' : 'Satellite Mode'}
          </span>
        </button>

        {/* Zoom In (+) */}
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#161B22]/90 border border-[#30363D] hover:bg-[#21262D] text-slate-200 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        </button>

        {/* Zoom Out (-) */}
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#161B22]/90 border border-[#30363D] hover:bg-[#21262D] text-slate-200 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>
        </button>

        {/* Center on Driver */}
        <button
          onClick={handleCenterVehicle}
          title="Center on Driver"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#161B22]/90 border border-[#30363D] hover:bg-[#21262D] text-[#AEF5F0] flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
        </button>
      </div>

      {/* Visible Map Attribution */}
      <div className="absolute right-3 sm:right-4 bottom-2 sm:bottom-2.5 z-[990] bg-[#161B22]/90 backdrop-blur-xs text-[9px] sm:text-[11px] text-slate-300 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg border border-[#30363D] flex items-center gap-1 sm:gap-1.5 shadow-lg select-none">
        {mapStyle === 'satellite' ? (
          <>
            <span>🛰️ Satellite © Esri • ©</span>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#AEF5F0] font-semibold hover:underline"
            >
              OpenStreetMap
            </a>
          </>
        ) : (
          <>
            <span>©</span>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#AEF5F0] font-semibold hover:underline"
            >
              OpenStreetMap
            </a>
            <span className="hidden sm:inline">contributors</span>
          </>
        )}
      </div>

      {/* Map Legend Overlay (Bottom Left) matching screenshot */}
      <div className="hidden sm:block absolute left-4 bottom-4 z-[990] bg-[#161B22]/90 backdrop-blur-md border border-[#30363D] rounded-xl p-3 shadow-2xl text-[11px] text-slate-300">
        <div className="font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#AEF5F0]"></span>
          <span>Map Legend</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#AEF5F0] border border-white"></span>
            <span>Current Vehicle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white"></span>
            <span>Destination</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 bg-[#AEF5F0] rounded"></span>
            <span>Active Route</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-emerald-400"></span>
            <span>Alternative Route</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-bold">⚠</span>
            <span>Hazard Marker</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-400"></span>
            <span>Sensor Node</span>
          </div>
        </div>
      </div>
    </div>
  );
};
