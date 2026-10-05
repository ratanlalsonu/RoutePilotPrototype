import React, { useMemo } from 'react';
import { ROAD_EDGES, ROAD_NODES } from '../../services/simulationGraph';
import { SimulationRoute } from '../../types/simulationMap';

interface RouteOverlayProps {
  route: SimulationRoute | null;
  isAnimating: boolean;
  hasHazard: boolean;
}

/**
 * Converts array of normalized coordinate points {x, y} into an SVG path 'd' string
 */
function pointsToSvgPath(pts?: Array<{ x: number; y: number }>): string {
  if (!pts || pts.length < 2) return '';
  return pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
}

export const RouteOverlay: React.FC<RouteOverlayProps> = ({
  route,
  isAnimating,
  hasHazard,
}) => {
  // 1. All Predefined Existing Roads in the Map Graph (Gray network)
  const allRoadPaths = useMemo(() => {
    return ROAD_EDGES.map((edge) => ({
      id: edge.id,
      pathStr: pointsToSvgPath(edge.points),
    }));
  }, []);

  // 2. Active Optimal Route Points
  const activePathString = useMemo(() => {
    if (!route || !route.allPoints || route.allPoints.length < 2) return '';
    return pointsToSvgPath(route.allPoints);
  }, [route?.allPoints]);

  // 3. Blocked Segment Points (RED)
  const blockedPathString = useMemo(() => {
    if (!hasHazard || !route?.blockedPoints || route.blockedPoints.length < 2) return '';
    return pointsToSvgPath(route.blockedPoints);
  }, [hasHazard, route?.blockedPoints]);

  // 4. Alternate Safe Route Points (GREEN)
  const alternatePathString = useMemo(() => {
    if (!hasHazard || !route?.alternatePoints || route.alternatePoints.length < 2) return '';
    return pointsToSvgPath(route.alternatePoints);
  }, [hasHazard, route?.alternatePoints]);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none z-15"
    >
      <defs>
        {/* Cyan Directional Arrow Marker */}
        <marker
          id="cyan-arrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#00f0ff" />
        </marker>

        {/* Green Directional Arrow Marker */}
        <marker
          id="green-arrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
        </marker>

        {/* Red Hazard Arrow Marker */}
        <marker
          id="red-arrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
        </marker>

        {/* Gradients */}
        <linearGradient id="cyan-glow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#00f0ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
        </linearGradient>

        <linearGradient id="green-glow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* ============================================================== */}
      {/* LAYER 1: ALL PREDEFINED ROAD EDGES (Visible Gray Network)       */}
      {/* ============================================================== */}
      <g id="predefined-road-network">
        {allRoadPaths.map((road) => (
          <path
            key={road.id}
            d={road.pathStr}
            fill="none"
            stroke="#2b3748"
            strokeWidth="0.45"
            strokeOpacity="0.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Junction Interchange Dots (only non-state junctions) */}
        {Object.values(ROAD_NODES)
          .filter((n) => !n.isState)
          .map((j) => (
            <circle
              key={j.id}
              cx={j.x}
              cy={j.y}
              r="0.4"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="0.2"
              opacity="0.8"
            />
          ))}
      </g>

      {/* ============================================================== */}
      {/* LAYER 2: PRIMARY OPTIMAL ROUTE (Cyan/Blue Dotted Animated Line) */}
      {/* ============================================================== */}
      {activePathString && (
        <g id="optimal-route-layer">
          {/* Subtle glow corridor */}
          <path
            d={activePathString}
            fill="none"
            stroke={hasHazard ? '#475569' : '#0284c7'}
            strokeWidth="1.6"
            strokeOpacity={hasHazard ? 0.3 : 0.45}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="filter blur-[1px]"
          />

          {/* Bright Cyan/Blue Dotted Animated Line directly on top of road */}
          <path
            d={activePathString}
            fill="none"
            stroke={hasHazard ? '#64748b' : '#00f0ff'}
            strokeWidth="0.8"
            strokeOpacity={hasHazard ? 0.4 : 1}
            strokeDasharray="1.2 0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={!hasHazard ? 'animate-route-flow' : ''}
            markerEnd={!hasHazard ? 'url(#cyan-arrow)' : undefined}
          />
        </g>
      )}

      {/* ============================================================== */}
      {/* LAYER 3: BLOCKED HAZARD ROAD SECTION (Bright RED)              */}
      {/* ============================================================== */}
      {hasHazard && blockedPathString && (
        <g id="blocked-hazard-layer">
          {/* Pulsing red halo underlay */}
          <path
            d={blockedPathString}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.2"
            strokeOpacity="0.45"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse"
          />

          {/* Bright red dashed blocked road */}
          <path
            d={blockedPathString}
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.1"
            strokeDasharray="0.8 0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd="url(#red-arrow)"
          />
        </g>
      )}

      {/* ============================================================== */}
      {/* LAYER 4: ALTERNATE OPTIMAL ROUTE (Bright GREEN Dotted Animated)*/}
      {/* ============================================================== */}
      {hasHazard && alternatePathString && (
        <g id="alternate-safe-route-layer">
          {/* Green radiant glow underlay */}
          <path
            d={alternatePathString}
            fill="none"
            stroke="#059669"
            strokeWidth="1.8"
            strokeOpacity="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="filter blur-[1px]"
          />

          {/* Bright Green Dotted Animated Line directly on top of road */}
          <path
            d={alternatePathString}
            fill="none"
            stroke="#10b981"
            strokeWidth="0.85"
            strokeDasharray="1.2 0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-route-flow"
            markerEnd="url(#green-arrow)"
          />
        </g>
      )}
    </svg>
  );
};
