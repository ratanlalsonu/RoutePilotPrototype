import React, { useState, useEffect } from 'react';
import { StateNode } from '../../types/simulationMap';
import { INDIAN_STATES_28, DELHI_REFERENCE } from '../../services/simulationGraph';

interface StateNodesProps {
  sourceState: string;
  destinationState: string;
  activePath: string[];
  alternatePath?: string[];
  highlightedState: string | null;
  onSelectSource: (stateName: string) => void;
  onSelectDestination: (stateName: string) => void;
}

export const StateNodes: React.FC<StateNodesProps> = ({
  sourceState,
  destinationState,
  activePath,
  alternatePath = [],
  highlightedState,
  onSelectSource,
  onSelectDestination,
}) => {
  const [activePopupState, setActivePopupState] = useState<string | null>(null);

  // Auto-open popup when a state is searched/highlighted
  useEffect(() => {
    if (highlightedState) {
      setActivePopupState(highlightedState);
    }
  }, [highlightedState]);

  const handleNodeClick = (e: React.MouseEvent, stateName: string) => {
    e.stopPropagation();
    setActivePopupState((prev) => (prev === stateName ? null : stateName));
  };

  const handleClosePopup = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePopupState(null);
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      onClick={() => setActivePopupState(null)}
    >
      {/* 28 Selectable Indian States */}
      {INDIAN_STATES_28.map((state) => {
        const isSource = sourceState === state.name;
        const isDestination = destinationState === state.name;
        const isInActiveRoute = activePath.includes(state.name);
        const isInAlternateRoute = alternatePath.includes(state.name);
        const isHighlighted = highlightedState === state.name;
        const isPopupOpen = activePopupState === state.name;

        // Visual styles
        let pinColor = state.color || '#3b82f6';
        let badgeBg = 'bg-[#161B22]/90 border-[#30363D] text-slate-200';
        let glowClass = '';

        if (isSource) {
          pinColor = '#22c55e'; // GREEN
          badgeBg = 'bg-emerald-950/95 border-emerald-500 text-emerald-200 font-bold shadow-lg shadow-emerald-500/30';
          glowClass = 'ring-4 ring-emerald-400/50 scale-110';
        } else if (isDestination) {
          pinColor = '#ef4444'; // RED
          badgeBg = 'bg-red-950/95 border-red-500 text-red-200 font-bold shadow-lg shadow-red-500/30';
          glowClass = 'ring-4 ring-red-400/50 scale-110';
        } else if (isInActiveRoute) {
          pinColor = '#06b6d4'; // CYAN / BLUE
          badgeBg = 'bg-[#0E202B]/95 border-cyan-400 text-cyan-200 font-semibold shadow-md shadow-cyan-400/20';
        } else if (isInAlternateRoute) {
          pinColor = '#10b981'; // GREEN ALTERNATE
          badgeBg = 'bg-[#0E2A1D]/95 border-emerald-400 text-emerald-200 font-semibold shadow-md shadow-emerald-400/20';
        }

        return (
          <div
            key={state.name}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-transform duration-150 select-none group"
            style={{
              left: `${state.x}%`,
              top: `${state.y}%`,
              zIndex: isSource || isDestination || isPopupOpen ? 40 : isHighlighted ? 35 : 20,
            }}
          >
            {/* Clickable Pin Marker */}
            <button
              type="button"
              onClick={(e) => handleNodeClick(e, state.name)}
              className="relative flex flex-col items-center cursor-pointer focus:outline-none"
              title={`${state.name} - Click to select as Source or Destination`}
              aria-label={`State ${state.name}`}
            >
              {/* Highlight / Search Halo */}
              {(isHighlighted || isSource || isDestination) && (
                <div
                  className={`absolute -inset-2 rounded-full animate-ping opacity-60 pointer-events-none ${
                    isSource
                      ? 'bg-emerald-400'
                      : isDestination
                      ? 'bg-red-400'
                      : 'bg-cyan-400'
                  }`}
                />
              )}

              {/* Pin Icon with Glow & Hover Transition */}
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-125 ${glowClass}`}
                style={{ backgroundColor: pinColor }}
              >
                {isSource ? (
                  <span className="text-[10px] font-black text-slate-950">A</span>
                ) : isDestination ? (
                  <span className="text-[10px] font-black text-white">B</span>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-white/90 shadow-sm" />
                )}
              </div>

              {/* Label Badge below Marker */}
              <div
                className={`mt-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] whitespace-nowrap border backdrop-blur-md transition-all duration-200 group-hover:scale-105 ${badgeBg}`}
              >
                {isSource ? (
                  <span className="text-emerald-400 font-extrabold mr-1">START:</span>
                ) : isDestination ? (
                  <span className="text-red-400 font-extrabold mr-1">DESTINATION:</span>
                ) : null}
                <span>{state.name}</span>
              </div>
            </button>

            {/* Interactive Node Action Popup */}
            {isPopupOpen && (
              <div
                className="absolute left-1/2 -top-2 transform -translate-x-1/2 -translate-y-full z-50 min-w-[170px] bg-[#161B22]/98 backdrop-blur-xl border border-[#30363D] rounded-xl shadow-2xl p-2.5 text-xs text-slate-200 animate-modal-content pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#30363D]">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: pinColor }}
                    />
                    <span className="truncate max-w-[110px]">{state.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClosePopup}
                    className="text-slate-400 hover:text-white text-xs px-1 hover:bg-[#21262D] rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1.5">
                  {/* Set as Source */}
                  {isSource ? (
                    <div className="w-full py-1 px-2 rounded bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-bold text-center text-[11px] flex items-center justify-center gap-1">
                      <span>✓</span> Source Selected
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSource(state.name);
                        setActivePopupState(null);
                      }}
                      className="w-full py-1.5 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-center text-[11px] transition shadow cursor-pointer active:scale-95"
                    >
                      Set as Source
                    </button>
                  )}

                  {/* Set as Destination */}
                  {isDestination ? (
                    <div className="w-full py-1 px-2 rounded bg-red-950/70 border border-red-500/50 text-red-300 font-bold text-center text-[11px] flex items-center justify-center gap-1">
                      <span>✓</span> Destination Selected
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDestination(state.name);
                        setActivePopupState(null);
                      }}
                      className="w-full py-1.5 px-2 rounded bg-red-600 hover:bg-red-500 text-white font-semibold text-center text-[11px] transition shadow cursor-pointer active:scale-95"
                    >
                      Set as Destination
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Reference Node: Delhi (Visible on map, but clearly indicated as reference only) */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto select-none opacity-80 hover:opacity-100 transition"
        style={{
          left: `${DELHI_REFERENCE.x}%`,
          top: `${DELHI_REFERENCE.y}%`,
          zIndex: 15,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setActivePopupState(DELHI_REFERENCE.name);
        }}
      >
        <div className="flex flex-col items-center cursor-pointer">
          <div className="w-5 h-5 rounded-full bg-red-500/80 border border-white flex items-center justify-center shadow">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <div className="mt-0.5 px-1 py-0.2 rounded bg-slate-900/90 text-slate-300 text-[8px] font-mono border border-slate-700">
            Delhi (Ref)
          </div>
        </div>

        {activePopupState === DELHI_REFERENCE.name && (
          <div
            className="absolute left-1/2 -top-2 transform -translate-x-1/2 -translate-y-full z-50 min-w-[180px] bg-[#161B22]/98 border border-[#30363D] rounded-xl shadow-2xl p-2.5 text-xs text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-[#30363D] mb-1.5">
              <span className="font-bold text-white">Delhi (Reference Hub)</span>
              <button
                type="button"
                onClick={handleClosePopup}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              National Capital territory reference marker. Simulation routing connects the 28 Indian States.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
