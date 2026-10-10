import React from 'react';
import { STATE_NODE_MAP } from '../../services/simulationGraph';
import { SimulationRoute } from '../../types/simulationMap';
import { getHazardVisual } from '../../services/hazardVisuals';

interface HazardOverlayProps {
  route: SimulationRoute | null;
  hasHazard: boolean;
  onClearHazard?: () => void;
}

export const HazardOverlay: React.FC<HazardOverlayProps> = ({
  route,
  hasHazard,
  onClearHazard,
}) => {
  if (!hasHazard || !route?.blockedSegment) return null;

  const { from, to, hazardType } = route.blockedSegment;
  const visual = getHazardVisual(
    hazardType === 'flood' ? 'High Water Level' :
    hazardType === 'construction' ? 'Road Construction' :
    hazardType === 'accident' ? 'Accident' :
    hazardType === 'blockage' ? 'Road Blockage' : 'Bridge Damage'
  );
  const p1 = STATE_NODE_MAP[from];
  const p2 = STATE_NODE_MAP[to];

  // Calculate position: prefer midpoint of exact blocked polyline points
  let posX = (p1?.x ?? 50) + (p2?.x ?? 50) / 2;
  let posY = (p1?.y ?? 50) + (p2?.y ?? 50) / 2;

  if (route.blockedPoints && route.blockedPoints.length >= 2) {
    const midIdx = Math.floor(route.blockedPoints.length / 2);
    posX = route.blockedPoints[midIdx].x;
    posY = route.blockedPoints[midIdx].y;
  } else if (p1 && p2) {
    posX = (p1.x + p2.x) / 2;
    posY = (p1.y + p2.y) / 2;
  }

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-auto select-none"
      style={{
        left: `${posX}%`,
        top: `${posY}%`,
      }}
    >
      <div className="relative flex flex-col items-center group">
        {/* Pulsing hazard warning waves */}
        <div className={`w-10 h-10 rounded-full ${visual.pingClass} animate-ping absolute`} />
        <div className="w-14 h-14 rounded-full bg-red-500/20 animate-pulse absolute" />

        {/* Hazard Badge with specific Icon */}
        <div className={`relative px-2.5 py-1 rounded-md ${visual.bgClass} text-white border ${visual.badgeBorder} shadow-2xl flex items-center gap-1.5 font-bold text-[11px] animate-bounce whitespace-nowrap`}>
          <span className="text-sm">{visual.emoji}</span>
          <span>{visual.label.toUpperCase()}</span>
          {onClearHazard && (
            <button
              type="button"
              onClick={onClearHazard}
              className="ml-1 hover:bg-black/30 rounded px-1 text-[10px] text-white/90"
              title="Resolve Hazard"
            >
              ✕
            </button>
          )}
        </div>

        {/* Floating Tooltip / Segment Tag */}
        <div className="mt-1 px-2 py-0.5 rounded bg-black/90 text-red-300 text-[9px] font-mono border border-red-500/60 shadow whitespace-nowrap">
          BLOCKED ROAD: {from} ➔ {to}
        </div>
      </div>
    </div>
  );
};
