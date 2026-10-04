import React from 'react';
import { STATE_NODE_MAP } from '../../services/simulationGraph';
import { SimulationRoute } from '../../types/simulationMap';

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
  const p1 = STATE_NODE_MAP[from];
  const p2 = STATE_NODE_MAP[to];

  if (!p1 || !p2) return null;

  // Midpoint between the two states for the warning marker
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-auto select-none"
      style={{
        left: `${midX}%`,
        top: `${midY}%`,
      }}
    >
      <div className="relative flex flex-col items-center group">
        {/* Pulsing hazard warning waves */}
        <div className="w-10 h-10 rounded-full bg-red-600/40 animate-ping absolute" />
        <div className="w-14 h-14 rounded-full bg-red-500/20 animate-pulse absolute" />

        {/* Hazard Badge with ⚠ Icon */}
        <div className="relative px-2.5 py-1 rounded-md bg-red-600 text-white border border-red-300 shadow-2xl flex items-center gap-1.5 font-bold text-[11px] animate-bounce whitespace-nowrap">
          <span className="text-amber-300 text-sm">⚠</span>
          <span>{hazardType.toUpperCase()} HAZARD</span>
          {onClearHazard && (
            <button
              type="button"
              onClick={onClearHazard}
              className="ml-1 hover:bg-red-700 rounded px-1 text-[10px] text-white/90"
              title="Resolve Hazard"
            >
              ✕
            </button>
          )}
        </div>

        {/* Floating Tooltip / Segment Tag */}
        <div className="mt-1 px-2 py-0.5 rounded bg-black/90 text-red-300 text-[9px] font-mono border border-red-500/60 shadow whitespace-nowrap">
          BLOCKED: {from} ➔ {to}
        </div>
      </div>
    </div>
  );
};
