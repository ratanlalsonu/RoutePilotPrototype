import React, { useMemo } from 'react';
import { STATE_NODE_MAP } from '../../services/simulationGraph';
import { SimulationRoute } from '../../types/simulationMap';

interface RouteOverlayProps {
  route: SimulationRoute | null;
  isAnimating: boolean;
  hasHazard: boolean;
}

/**
 * Generates smooth curved SVG path string between a sequence of state nodes
 */
function createCurvedPathString(path: string[]): string {
  if (path.length < 2) return '';

  const points = path
    .map((name) => STATE_NODE_MAP[name])
    .filter(Boolean)
    .map((node) => ({ x: node.x, y: node.y }));

  if (points.length < 2) return '';

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // Compute midpoint and perpendicular curvature offset for a smooth isometric highway curve
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Subtle natural bend
    const curveAmount = 0.08;
    const cx = midX - dy * curveAmount;
    const cy = midY + dx * curveAmount;

    d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)}, ${p2.x} ${p2.y}`;
  }

  return d;
}

/**
 * Creates individual segment curved path
 */
function createSegmentCurve(fromName: string, toName: string): string {
  const p1 = STATE_NODE_MAP[fromName];
  const p2 = STATE_NODE_MAP[toName];
  if (!p1 || !p2) return '';

  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const curveAmount = 0.08;
  const cx = midX - dy * curveAmount;
  const cy = midY + dx * curveAmount;

  return `M ${p1.x} ${p1.y} Q ${cx.toFixed(2)} ${cy.toFixed(2)}, ${p2.x} ${p2.y}`;
}

export const RouteOverlay: React.FC<RouteOverlayProps> = ({
  route,
  isAnimating,
  hasHazard,
}) => {
  if (!route || route.path.length < 2) return null;

  // Primary active route curve
  const activePathString = useMemo(() => {
    return createCurvedPathString(route.path);
  }, [route.path]);

  // Alternate route curve (if hazard active)
  const alternatePathString = useMemo(() => {
    if (!hasHazard || !route.alternatePath || route.alternatePath.length < 2) return '';
    return createCurvedPathString(route.alternatePath);
  }, [hasHazard, route.alternatePath]);

  // Blocked hazard segment
  const blockedSegmentString = useMemo(() => {
    if (!hasHazard || !route.blockedSegment) return '';
    return createSegmentCurve(route.blockedSegment.from, route.blockedSegment.to);
  }, [hasHazard, route.blockedSegment]);

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
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
        </marker>

        {/* Green Directional Arrow Marker */}
        <marker
          id="green-arrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="5"
          markerHeight="5"
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
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
        </marker>

        {/* Linear gradients for radiant neon highway glow */}
        <linearGradient id="cyan-glow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
        </linearGradient>

        <linearGradient id="emerald-glow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* 1. Base Active Route (Underlay glow) */}
      {activePathString && (
        <>
          <path
            d={activePathString}
            fill="none"
            stroke={hasHazard ? '#64748b' : 'url(#cyan-glow-gradient)'}
            strokeWidth="1.8"
            strokeOpacity={hasHazard ? 0.35 : 0.45}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="filter blur-[1px]"
          />

          {/* Sharp highway route line with animation */}
          <path
            d={activePathString}
            fill="none"
            stroke={hasHazard ? '#94a3b8' : '#06b6d4'}
            strokeWidth="0.8"
            strokeOpacity={hasHazard ? 0.5 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={isAnimating ? '200' : 'none'}
            strokeDashoffset={isAnimating ? '200' : '0'}
            className={isAnimating ? 'animate-route-draw' : ''}
            markerEnd={!hasHazard ? 'url(#cyan-arrow)' : undefined}
          />
        </>
      )}

      {/* 2. Blocked Hazard Segment (RED dashed line) */}
      {hasHazard && blockedSegmentString && (
        <>
          {/* Pulsing red underlay */}
          <path
            d={blockedSegmentString}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.2"
            strokeOpacity="0.5"
            strokeLinecap="round"
            className="animate-pulse"
          />
          {/* Dashed blocked warning segment */}
          <path
            d={blockedSegmentString}
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.1"
            strokeDasharray="1.5 1"
            strokeLinecap="round"
            markerEnd="url(#red-arrow)"
          />
        </>
      )}

      {/* 3. Alternate Safe Route (GREEN glowing line) */}
      {hasHazard && alternatePathString && (
        <>
          <path
            d={alternatePathString}
            fill="none"
            stroke="url(#emerald-glow-gradient)"
            strokeWidth="2.2"
            strokeOpacity="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="filter blur-[1px]"
          />
          <path
            d={alternatePathString}
            fill="none"
            stroke="#10b981"
            strokeWidth="0.95"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="200"
            strokeDashoffset="0"
            className="animate-route-draw"
            markerEnd="url(#green-arrow)"
          />
        </>
      )}
    </svg>
  );
};
