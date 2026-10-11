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

        {hazardType === 'construction' ? (
          <div className="relative flex flex-col items-center animate-bounce">
            {/* Top Amber Caution Strobe */}
            <div className="relative flex items-center justify-center mb-1">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 animate-ping absolute opacity-80 pointer-events-none"></span>
              <span className="w-3 h-3 rounded-full bg-amber-300 border-2 border-black shadow-[0_0_12px_#f59e0b] animate-pulse"></span>
            </div>

            {/* Highway Warning Diamond Sign */}
            <div
              className="relative w-12 h-12 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border-[2.5px] border-black rounded-lg shadow-2xl flex items-center justify-center transform rotate-45 transition-transform"
              style={{ boxShadow: '0 4px 16px rgba(245,158,11,0.9), 0 0 0 1.5px #ffffff' }}
            >
              <div className="w-10 h-10 border border-black/80 rounded flex items-center justify-center">
                <div className="transform -rotate-45 flex items-center justify-center text-black">
                  <span dangerouslySetInnerHTML={{ __html: visual.svgHtml }} />
                </div>
              </div>
            </div>

            {/* Barricade Stripes */}
            <div
              className="w-16 h-2.5 mt-1 rounded-[2px] border border-black shadow-sm overflow-hidden"
              style={{ background: 'repeating-linear-gradient(45deg, #09090b, #09090b 4px, #f59e0b 4px, #f59e0b 8px)' }}
            />

            {/* Highway Signboard Badge */}
            <div className="px-2.5 py-1 mt-0.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-black border-2 border-black font-black text-[11px] rounded shadow-xl flex items-center gap-1.5 whitespace-nowrap tracking-tight uppercase">
              <span className="text-sm">🚧</span>
              <span>कार्य प्रगति पर है</span>
              <span className="text-[9px] bg-black text-amber-300 px-1 py-0.5 rounded font-extrabold tracking-wider">ROAD WORK</span>
              {onClearHazard && (
                <button
                  type="button"
                  onClick={onClearHazard}
                  className="ml-1 hover:bg-black/30 rounded px-1 text-[10px] text-black font-extrabold"
                  title="Resolve Hazard"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Standard Hazard Badge */
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
        )}

        {/* Floating Tooltip / Segment Tag */}
        <div className="mt-1 px-2 py-0.5 rounded bg-black/90 text-amber-300 text-[9px] font-mono border border-amber-500/60 shadow whitespace-nowrap">
          {hazardType === 'construction' ? '🚧 ROAD UNDER CONSTRUCTION: ' : 'BLOCKED ROAD: '}{from} ➔ {to}
        </div>
      </div>
    </div>
  );
};
