import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  INDIA_PLACE_NODES,
  INDIA_JUNCTIONS,
  INDIA_ROAD_SEGMENTS,
  IndiaPlaceNode,
  IndiaRoadSegment,
  findOptimalIndiaRoute,
  findMultipleIndiaRoutes,
  GraphRouteResult,
  POPULAR_ROUTE_PRESETS,
} from '../../services/indiaMapGraph';
import { Hazard, VehicleType, Journey } from '../../types';
import { realtimeSync } from '../../services/realtimeSync';
import { VoiceService } from '../../services/voiceService';

interface DirectGraphicMapProps {
  mode?: 'admin' | 'driver';
  hazards?: Hazard[];
  journey?: Journey;
  language?: 'en' | 'hi';
  onSwitchEngine?: () => void;
}

export const DirectGraphicMap: React.FC<DirectGraphicMapProps> = ({
  mode = 'driver',
  hazards = [],
  journey,
  language = 'en',
  onSwitchEngine,
}) => {
  // Source and Destination Node IDs
  const [sourceNodeId, setSourceNodeId] = useState<string>('DL'); // Default: Delhi
  const [destNodeId, setDestNodeId] = useState<string>('WB'); // Default: West Bengal

  // Selection modal/popover when a node is clicked on map
  const [selectedPinNode, setSelectedPinNode] = useState<IndiaPlaceNode | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Active blocked segments (by hazard)
  const [blockedRoadIds, setBlockedRoadIds] = useState<string[]>([]);
  const [hazardNotice, setHazardNotice] = useState<string | null>(null);

  // Active Vehicle simulation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0); // 0 to 1
  const [simSpeed, setSimSpeed] = useState<number>(2); // 1x, 2x, 5x
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const animFrameRef = useRef<number | null>(null);

  // Map Zoom & Pan transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate Optimal and Alternative Routes
  const routeData = useMemo(() => {
    if (!sourceNodeId || !destNodeId || sourceNodeId === destNodeId) {
      return { optimalRoute: null, alternatives: [] };
    }
    return findMultipleIndiaRoutes(sourceNodeId, destNodeId, blockedRoadIds);
  }, [sourceNodeId, destNodeId, blockedRoadIds]);

  const optimalRoute = routeData.optimalRoute;
  const alternativeRoutes = routeData.alternatives;

  const sourceNode = useMemo(() => INDIA_PLACE_NODES.find((n) => n.id === sourceNodeId), [sourceNodeId]);
  const destNode = useMemo(() => INDIA_PLACE_NODES.find((n) => n.id === destNodeId), [destNodeId]);

  // Sync with global Journey if available
  useEffect(() => {
    if (journey?.origin?.name) {
      const matchSrc = INDIA_PLACE_NODES.find(
        (n) => n.name.toLowerCase().includes(journey.origin.name.toLowerCase()) || journey.origin.name.toLowerCase().includes(n.name.toLowerCase())
      );
      if (matchSrc) setSourceNodeId(matchSrc.id);
    }
    if (journey?.destination?.name) {
      const matchDst = INDIA_PLACE_NODES.find(
        (n) => n.name.toLowerCase().includes(journey.destination.name.toLowerCase()) || journey.destination.name.toLowerCase().includes(n.name.toLowerCase())
      );
      if (matchDst) setDestNodeId(matchDst.id);
    }
  }, [journey?.origin?.name, journey?.destination?.name]);

  // Sync external hazards into blocked roads
  useEffect(() => {
    if (!hazards || hazards.length === 0) return;
    const blocked: string[] = [];
    hazards.forEach((h) => {
      if (h.status === 'ACTIVE') {
        // Match hazard road name or location to road segments
        const matched = INDIA_ROAD_SEGMENTS.find(
          (r) =>
            r.name.toLowerCase().includes(h.roadName.toLowerCase()) ||
            h.roadName.toLowerCase().includes(r.name.toLowerCase()) ||
            h.locationName.toLowerCase().includes(r.from.toLowerCase()) ||
            h.locationName.toLowerCase().includes(r.to.toLowerCase())
        );
        if (matched && !blocked.includes(matched.id)) {
          blocked.push(matched.id);
        }
      }
    });
    if (blocked.length > 0) {
      setBlockedRoadIds(blocked);
    }
  }, [hazards]);

  // Check if active route intersects a newly blocked road
  useEffect(() => {
    if (!optimalRoute) return;
    const hasIntersection = optimalRoute.segments.some((seg) => blockedRoadIds.includes(seg.id));
    if (hasIntersection) {
      setHazardNotice(
        language === 'hi'
          ? '⚠ चेतावनी: सक्रिय मार्ग पर सड़क अवरुद्ध है! बुद्धिमान मोड़ (Diversion) सक्रिय किया गया।'
          : '⚠ Hazard Alert: Road block detected on current route! Smart diversion activated.'
      );
      VoiceService.notifyHazardDetected('Road Blockage', 'Interstate Corridor');
      setTimeout(() => setHazardNotice(null), 6000);
    }
  }, [blockedRoadIds, optimalRoute, language]);

  // Vehicle position along optimal route path
  const currentVehiclePoint = useMemo(() => {
    if (!optimalRoute || optimalRoute.allPoints.length < 2) return null;
    const pts = optimalRoute.allPoints;
    const totalSegments = pts.length - 1;
    const floatIdx = animProgress * totalSegments;
    const idx = Math.min(Math.floor(floatIdx), totalSegments - 1);
    const frac = floatIdx - idx;

    const p1 = pts[idx];
    const p2 = pts[idx + 1] || pts[idx];

    const curX = p1[0] + (p2[0] - p1[0]) * frac;
    const curY = p1[1] + (p2[1] - p1[1]) * frac;

    // Angle of heading in degrees
    const angleRad = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    const headingDeg = (angleRad * 180) / Math.PI;

    return { x: curX, y: curY, heading: headingDeg };
  }, [optimalRoute, animProgress]);

  // Navigation simulation loop
  useEffect(() => {
    if (!isNavigating || !optimalRoute) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const totalDurationMs = Math.max(8000 / simSpeed, 3000);

    const step = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      setAnimProgress((prev) => {
        const next = prev + dt / totalDurationMs;
        if (next >= 1) {
          setIsNavigating(false);
          VoiceService.speak(
            `You have arrived at ${destNode?.name || 'Destination'}.`,
            `आप ${destNode?.hindiName || 'गंतव्य'} पहुंच गए हैं।`
          );
          return 1;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isNavigating, optimalRoute, simSpeed, destNode]);

  // Handlers
  const handleSetSource = (nodeId: string) => {
    setSourceNodeId(nodeId);
    setSelectedPinNode(null);
    setAnimProgress(0);
    setIsNavigating(false);
  };

  const handleSetDestination = (nodeId: string) => {
    setDestNodeId(nodeId);
    setSelectedPinNode(null);
    setAnimProgress(0);
    setIsNavigating(false);
  };

  const handleSwapSourceDest = () => {
    const temp = sourceNodeId;
    setSourceNodeId(destNodeId);
    setDestNodeId(temp);
    setAnimProgress(0);
    setIsNavigating(false);
  };

  const handleApplyPreset = (preset: (typeof POPULAR_ROUTE_PRESETS)[0]) => {
    setSourceNodeId(preset.source);
    setDestNodeId(preset.destination);
    setAnimProgress(0);
    setIsNavigating(false);
  };

  // Toggle road hazard for testing dynamic diversion
  const handleToggleRoadHazard = (roadId: string) => {
    setBlockedRoadIds((prev) => {
      if (prev.includes(roadId)) {
        return prev.filter((id) => id !== roadId);
      } else {
        return [...prev, roadId];
      }
    });
  };

  // Pan and Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.75), 3.5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Touch handlers for mobile pan/pinch
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    }
  };

  // Convert waypoints array into smooth SVG path string
  const getSvgPathString = (pts: [number, number][]) => {
    if (!pts || pts.length === 0) return '';
    return pts.reduce((acc, [x, y], idx) => {
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#090d14] overflow-hidden select-none flex flex-col font-sans"
    >
      {/* TOP FLOATING ROUTE CONTROLLER & METRICS BAR */}
      <div className="absolute top-2 left-2 right-2 sm:left-4 sm:right-4 z-40 flex flex-col gap-2 max-w-4xl mx-auto pointer-events-none">
        {/* Main Source & Destination Selector Card */}
        <div className="pointer-events-auto bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] shadow-2xl rounded-2xl p-2.5 sm:p-3 text-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Source & Destination Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            {/* SOURCE INPUT */}
            <div className="flex-1 min-w-0 relative">
              <label className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{language === 'hi' ? 'स्रोत (Source)' : 'Source'}</span>
              </label>
              <select
                value={sourceNodeId}
                onChange={(e) => handleSetSource(e.target.value)}
                className="w-full bg-[#0D1117] border border-emerald-500/40 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-emerald-300 focus:outline-none focus:border-emerald-400 cursor-pointer truncate"
              >
                {INDIA_PLACE_NODES.map((node) => (
                  <option key={node.id} value={node.id} className="bg-[#161B22] text-slate-100">
                    {node.name} ({node.code})
                  </option>
                ))}
              </select>
            </div>

            {/* SWAP BUTTON */}
            <button
              onClick={handleSwapSourceDest}
              title="Swap Source and Destination"
              className="mt-3.5 w-8 h-8 rounded-xl bg-[#21262D] hover:bg-[#30363D] active:scale-95 text-slate-200 hover:text-white border border-[#30363D] flex items-center justify-center transition shrink-0 cursor-pointer shadow-md"
            >
              ⇄
            </button>

            {/* DESTINATION INPUT */}
            <div className="flex-1 min-w-0 relative">
              <label className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                <span>{language === 'hi' ? 'गंतव्य (Destination)' : 'Destination'}</span>
              </label>
              <select
                value={destNodeId}
                onChange={(e) => handleSetDestination(e.target.value)}
                className="w-full bg-[#0D1117] border border-red-500/40 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-red-300 focus:outline-none focus:border-red-400 cursor-pointer truncate"
              >
                {INDIA_PLACE_NODES.map((node) => (
                  <option key={node.id} value={node.id} className="bg-[#161B22] text-slate-100">
                    {node.name} ({node.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SIMULATION & NAVIGATION ACTION BUTTONS */}
          <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#30363D]">
            {/* Navigation Trigger */}
            <button
              onClick={() => {
                if (isNavigating) {
                  setIsNavigating(false);
                } else {
                  if (animProgress >= 1) setAnimProgress(0);
                  setIsNavigating(true);
                  VoiceService.speak(
                    `Starting journey from ${sourceNode?.name} to ${destNode?.name}.`,
                    `${sourceNode?.hindiName} से ${destNode?.hindiName} की यात्रा शुरू हो रही है।`
                  );
                }
              }}
              disabled={!optimalRoute}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg cursor-pointer ${
                isNavigating
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold'
              }`}
            >
              <span>{isNavigating ? '⏸ Pause' : animProgress > 0 && animProgress < 1 ? '▶ Resume' : '🚀 Drive Route'}</span>
            </button>

            {/* Reset Simulation */}
            {animProgress > 0 && (
              <button
                onClick={() => {
                  setIsNavigating(false);
                  setAnimProgress(0);
                }}
                title="Reset Vehicle"
                className="p-2 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-300 hover:text-white border border-[#30363D] text-xs cursor-pointer"
              >
                ↺
              </button>
            )}

            {/* Speed Multiplier */}
            <div className="hidden sm:flex items-center bg-[#0D1117] rounded-xl border border-[#30363D] p-0.5 text-[11px] font-mono">
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                    simSpeed === spd ? 'bg-[#AEF5F0] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* QUICK ROUTE METRICS BADGE */}
        {optimalRoute && (
          <div className="pointer-events-auto bg-[#161B22]/90 backdrop-blur-md border border-[#30363D] rounded-xl px-3 py-1.5 text-xs text-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-[#AEF5F0] flex items-center gap-1">
                <span>🛣️</span>
                <span>{optimalRoute.totalDistanceKm} km</span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-semibold">
                ⏱ {Math.floor(optimalRoute.totalDurationMinutes / 60)}h {optimalRoute.totalDurationMinutes % 60}m
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-mono text-[11px]">
                {optimalRoute.nodes.map((n) => n.name).join(' ➔ ')}
              </span>
            </div>

            {/* A* Optimal Badge */}
            <div className="flex items-center gap-1.5">
              <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>⭐</span>
                <span>{language === 'hi' ? 'A* सर्वोत्तम मार्ग' : 'A* Optimal Route'}</span>
              </span>
              {blockedRoadIds.length > 0 && (
                <span className="bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  🛡️ {blockedRoadIds.length} {language === 'hi' ? 'अवरोध बाईपास' : 'Hazard Bypassed'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* HAZARD DIVERSION ALERT BANNER */}
        {hazardNotice && (
          <div className="pointer-events-auto bg-amber-950/95 border-2 border-amber-500 text-amber-200 px-4 py-2 rounded-xl shadow-2xl flex items-center justify-between gap-2 animate-bounce">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-lg">⚠</span>
              <span>{hazardNotice}</span>
            </div>
            <button
              onClick={() => setHazardNotice(null)}
              className="text-amber-400 hover:text-white text-xs px-2 py-0.5 rounded bg-amber-900/60"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* QUICK PRESET CHIPS BAR (BOTTOM-CENTER) */}
      <div className="absolute bottom-4 left-3 right-3 sm:left-6 sm:right-6 z-30 pointer-events-none flex items-center justify-center">
        <div className="pointer-events-auto bg-[#161B22]/90 backdrop-blur-md border border-[#30363D] shadow-2xl rounded-2xl px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto max-w-full">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-1 hidden md:inline shrink-0">
            {language === 'hi' ? 'लोकप्रिय मार्ग:' : 'Popular Routes:'}
          </span>
          {POPULAR_ROUTE_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handleApplyPreset(p)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition shrink-0 cursor-pointer border ${
                sourceNodeId === p.source && destNodeId === p.destination
                  ? 'bg-[#AEF5F0] text-slate-950 border-[#AEF5F0] font-bold shadow'
                  : 'bg-[#0D1117] hover:bg-[#21262D] text-slate-300 border-[#30363D]'
              }`}
            >
              {language === 'hi' ? p.hindi : p.name}
            </button>
          ))}
          {blockedRoadIds.length > 0 && (
            <button
              onClick={() => setBlockedRoadIds([])}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 transition shrink-0 cursor-pointer"
            >
              ✕ {language === 'hi' ? 'अवरोध हटाएं' : 'Clear Hazards'}
            </button>
          )}
        </div>
      </div>

      {/* MAP CANVAS VIEWPORT (WITH SMOOTH PAN & PINCH ZOOM) */}
      <div
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* TRANSFORM WRAPPER FOR SEAMLESS PAN & ZOOM */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-out origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* 16:9 CONTAINER MATCHING NATIVE 1376 x 768 GRAPHIC */}
          <div className="relative w-[1376px] h-[768px] shrink-0 shadow-2xl rounded-2xl overflow-hidden border border-[#30363D]">
            {/* 1. EXACT USER MAP IMAGE AS BASE GRAPHIC */}
            <img
              src="/routepilot_map.jpg"
              alt="India Road & Bridge Hazard Detection Map"
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
              draggable={false}
            />

            {/* 2. SVG VECTOR OVERLAY FOR OPTIMAL ROUTE & HAZARD HIGHLIGHTS */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 1376 768"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Neon Cyan Glow for Optimal Route */}
                <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Red Pulse Glow for Blocked Hazard Road */}
                <filter id="hazardGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* A. RENDER ALL HIGHWAY CORRIDORS (Subtle underlay so user can click to block/inspect) */}
              {INDIA_ROAD_SEGMENTS.map((road) => {
                const isBlocked = blockedRoadIds.includes(road.id);
                const isOptimal = optimalRoute?.segments.some((s) => s.id === road.id);
                const pathD = getSvgPathString(road.waypoints);

                if (isBlocked) {
                  return (
                    <g key={road.id} className="animate-pulse">
                      {/* Red Hazard Block Corridor */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="10"
                        strokeOpacity="0.8"
                        strokeLinecap="round"
                        filter="url(#hazardGlow)"
                      />
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="3"
                        strokeDasharray="6 6"
                        strokeLinecap="round"
                      />
                    </g>
                  );
                }

                if (!isOptimal) {
                  // Muted subtle ambient corridor
                  return (
                    <path
                      key={road.id}
                      d={pathD}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeOpacity="0.15"
                      strokeLinecap="round"
                    />
                  );
                }

                return null;
              })}

              {/* B. ALTERNATIVE ROUTES (Muted dashed lines) */}
              {alternativeRoutes.map((alt, aIdx) => {
                const altPathD = getSvgPathString(alt.allPoints);
                return (
                  <g key={`alt-${aIdx}`}>
                    <path
                      d={altPathD}
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="6"
                      strokeOpacity="0.4"
                      strokeLinecap="round"
                    />
                    <path
                      d={altPathD}
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="3"
                      strokeDasharray="8 6"
                      strokeOpacity="0.75"
                    />
                  </g>
                );
              })}

              {/* C. THE OPTIMAL ROUTE DIRECTLY OVER THE ROADS IN THE GRAPHIC! */}
              {optimalRoute && (
                <g>
                  {/* Outer vibrant neon casing */}
                  <path
                    d={getSvgPathString(optimalRoute.allPoints)}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="12"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#routeGlow)"
                  />
                  {/* Core energetic Highway Ribbon */}
                  <path
                    d={getSvgPathString(optimalRoute.allPoints)}
                    fill="none"
                    stroke="#AEF5F0"
                    strokeWidth="6"
                    strokeOpacity="0.95"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Flowing animated highway dashes */}
                  <path
                    d={getSvgPathString(optimalRoute.allPoints)}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeDasharray="10 14"
                    strokeLinecap="round"
                    className="hazard-pulse-circle"
                  />
                </g>
              )}

              {/* D. LIVE ANIMATED VEHICLE ON ROUTE */}
              {currentVehiclePoint && (
                <g
                  transform={`translate(${currentVehiclePoint.x}, ${currentVehiclePoint.y}) rotate(${currentVehiclePoint.heading})`}
                >
                  {/* Forward Headlight Beam */}
                  <polygon
                    points="0,0 40,-16 40,16"
                    fill="url(#routeGlow)"
                    fillOpacity="0.3"
                  />
                  {/* Vehicle Body Circle */}
                  <circle r="12" fill="#AEF5F0" stroke="#0f172a" strokeWidth="2.5" />
                  {/* Direction pointer */}
                  <polygon points="6,0 -4,-5 -4,5" fill="#0f172a" />
                </g>
              )}

              {/* E. HAZARD WARNING ICONS ON BLOCKED ROADS */}
              {blockedRoadIds.map((roadId) => {
                const road = INDIA_ROAD_SEGMENTS.find((r) => r.id === roadId);
                if (!road || road.waypoints.length === 0) return null;
                const midPt = road.waypoints[Math.floor(road.waypoints.length / 2)];
                return (
                  <g key={`hazard-icon-${roadId}`} transform={`translate(${midPt[0]}, ${midPt[1]})`}>
                    <circle r="16" fill="#ef4444" fillOpacity="0.9" stroke="#ffffff" strokeWidth="2" />
                    <text
                      textAnchor="middle"
                      dy="5"
                      fill="#ffffff"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      ⚠
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* 3. INTERACTIVE NODE PINS & LABELS OVER EACH PLACE */}
            {INDIA_PLACE_NODES.map((node) => {
              const isSource = node.id === sourceNodeId;
              const isDest = node.id === destNodeId;
              const isRouteWaypoint =
                optimalRoute?.nodeIds.includes(node.id) && !isSource && !isDest;

              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPinNode(node);
                  }}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                  }}
                  className="absolute z-20 -translate-x-1/2 -translate-y-full cursor-pointer group"
                >
                  {/* PULSING ACTIVE HIGHLIGHTS */}
                  {isSource && (
                    <div className="absolute -inset-2.5 rounded-full bg-emerald-400/40 animate-ping pointer-events-none"></div>
                  )}
                  {isDest && (
                    <div className="absolute -inset-2.5 rounded-full bg-red-400/40 animate-ping pointer-events-none"></div>
                  )}

                  {/* CUSTOM FLOATING PIN BADGE */}
                  <div
                    className={`relative flex items-center gap-1 px-2 py-0.5 rounded-full border shadow-xl transition transform group-hover:scale-110 active:scale-95 ${
                      isSource
                        ? 'bg-emerald-500 border-white text-slate-950 font-extrabold shadow-emerald-500/50'
                        : isDest
                        ? 'bg-red-600 border-white text-white font-extrabold shadow-red-600/50'
                        : isRouteWaypoint
                        ? 'bg-[#161B22]/95 border-[#AEF5F0] text-[#AEF5F0] font-bold shadow-cyan-500/30'
                        : 'bg-[#161B22]/90 hover:bg-[#21262D] border-[#30363D] text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/60"
                      style={{ backgroundColor: node.pinColor }}
                    ></span>
                    <span className="text-[11px] whitespace-nowrap">
                      {isSource ? `🟢 ${node.name}` : isDest ? `🏁 ${node.name}` : node.name}
                    </span>
                  </div>

                  {/* PIN NEEDLE POINTER */}
                  <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-white mx-auto"></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* NODE CLICK ACTION POPOVER / MODAL */}
      {selectedPinNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl p-5 max-w-sm w-full text-slate-100 animate-modal-content space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-4 h-4 rounded-full border border-white"
                  style={{ backgroundColor: selectedPinNode.pinColor }}
                ></span>
                <div>
                  <h3 className="font-extrabold text-base text-white">{selectedPinNode.name}</h3>
                  <p className="text-xs text-slate-400">{selectedPinNode.hindiName} • {selectedPinNode.region} India</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPinNode(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#21262D]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {language === 'hi'
                ? `इस स्थान को अपनी यात्रा का स्रोत (प्रस्थान) या गंतव्य निर्धारित करें:`
                : `Set this place as your trip origin (source) or final destination:`}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSetSource(selectedPinNode.id)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
              >
                <span>🟢</span>
                <span>{language === 'hi' ? 'स्रोत बनाएं' : 'Set as Source'}</span>
              </button>
              <button
                onClick={() => handleSetDestination(selectedPinNode.id)}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
              >
                <span>🏁</span>
                <span>{language === 'hi' ? 'गंतव्य बनाएं' : 'Set Destination'}</span>
              </button>
            </div>

            {/* Test Hazard Simulation Toggle for Admin */}
            {mode === 'admin' && (
              <div className="pt-2 border-t border-[#30363D]">
                <p className="text-[11px] font-semibold text-amber-400 mb-1.5">
                  🛠 Admin: Simulate Corridor Block / Hazard
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto text-[11px]">
                  {INDIA_ROAD_SEGMENTS.filter(
                    (r) => r.from === selectedPinNode.id || r.to === selectedPinNode.id
                  ).map((road) => {
                    const isBlocked = blockedRoadIds.includes(road.id);
                    return (
                      <button
                        key={road.id}
                        onClick={() => handleToggleRoadHazard(road.id)}
                        className={`w-full py-1 px-2 rounded-lg text-left transition flex items-center justify-between ${
                          isBlocked
                            ? 'bg-red-950 text-red-300 border border-red-500/50'
                            : 'bg-[#0D1117] text-slate-300 hover:bg-[#21262D]'
                        }`}
                      >
                        <span className="truncate">{road.name}</span>
                        <span className="font-bold">{isBlocked ? '🛑 Blocked' : 'Open'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAP UTILITY CONTROLS (RIGHT DOCK) */}
      <div className="absolute right-3 sm:right-4 bottom-16 z-30 flex flex-col bg-[#161B22]/90 backdrop-blur-md rounded-2xl border border-[#30363D] shadow-2xl p-1 gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.25, 3.5))}
          title="Zoom In"
          className="w-8 h-8 rounded-xl hover:bg-[#21262D] text-slate-200 hover:text-white flex items-center justify-center text-sm font-bold transition active:scale-95 cursor-pointer"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
          title="Zoom Out"
          className="w-8 h-8 rounded-xl hover:bg-[#21262D] text-slate-200 hover:text-white flex items-center justify-center text-sm font-bold transition active:scale-95 cursor-pointer"
        >
          -
        </button>
        <div className="h-px bg-[#30363D] mx-1 my-0.5"></div>
        <button
          onClick={handleResetView}
          title="Reset View"
          className="w-8 h-8 rounded-xl hover:bg-[#21262D] text-[#AEF5F0] flex items-center justify-center text-xs transition active:scale-95 cursor-pointer"
        >
          🎯
        </button>
      </div>

      {/* FOOTER ENGINE SWITCHER & COPYRIGHT BADGE */}
      <div className="absolute left-3 bottom-2.5 z-30 flex items-center gap-2 text-[10px] text-slate-400 select-none">
        <div className="bg-[#161B22]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#30363D] flex items-center gap-1.5 shadow">
          <span>🇮🇳</span>
          <span className="font-semibold text-slate-200">RoutePilot India Road Network</span>
        </div>
        {onSwitchEngine && (
          <button
            onClick={onSwitchEngine}
            className="bg-[#161B22]/90 hover:bg-[#21262D] px-2 py-1 rounded-lg border border-[#30363D] text-slate-300 hover:text-white transition cursor-pointer"
          >
            OpenStreetMap
          </button>
        )}
      </div>
    </div>
  );
};
