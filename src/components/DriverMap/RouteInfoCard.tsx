import React from 'react';
import { SimulationRoute } from '../../types/simulationMap';

interface RouteInfoCardProps {
  route: SimulationRoute | null;
  hasHazard: boolean;
  isCalculating: boolean;
  onClearRoute?: () => void;
}

export const RouteInfoCard: React.FC<RouteInfoCardProps> = ({
  route,
  hasHazard,
  isCalculating,
  onClearRoute,
}) => {
  if (isCalculating) {
    return (
      <div className="bg-[#161B22]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3 shadow-2xl text-xs text-slate-200 animate-pulse flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <span className="font-semibold text-cyan-300">Calculating safest route...</span>
      </div>
    );
  }

  if (!route) return null;

  return (
    <div className="bg-[#161B22]/95 backdrop-blur-xl border border-[#30363D] hover:border-slate-600 rounded-2xl p-3 shadow-2xl text-xs text-slate-200 max-w-sm w-full transition-all select-none animate-fade-in overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#30363D]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-white tracking-wide uppercase text-[11px]">
            Best Route Simulation
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400">
            {route.totalDistanceKm} km
          </span>
          {onClearRoute && (
            <button
              type="button"
              onClick={onClearRoute}
              className="text-slate-400 hover:text-white text-xs px-1 hover:bg-[#21262D] rounded"
              title="Clear Route"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Source & Destination Badges */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <div className="bg-[#0E1726]/80 p-2 rounded-xl border border-emerald-500/30">
          <div className="text-[9px] uppercase font-bold text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>SOURCE</span>
          </div>
          <div className="font-semibold text-white truncate text-[11px] mt-0.5">
            {route.source}
          </div>
        </div>

        <div className="bg-[#1E1116]/80 p-2 rounded-xl border border-red-500/30">
          <div className="text-[9px] uppercase font-bold text-red-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>DESTINATION</span>
          </div>
          <div className="font-semibold text-white truncate text-[11px] mt-0.5">
            {route.destination}
          </div>
        </div>
      </div>

      {/* Route Path Breadcrumbs */}
      <div className="space-y-1 mb-2.5">
        <div className="text-[9px] uppercase font-bold text-slate-400">
          {hasHazard ? 'ORIGINAL (BLOCKED SEGMENT)' : 'ACTIVE CORRIDOR'}
        </div>
        <div className="p-2 rounded-xl bg-[#0D1117] border border-[#21262D] text-[11px] font-medium text-slate-300 flex flex-wrap items-center gap-1">
          {route.path.map((state, idx) => {
            const nextState = route.path[idx + 1];
            const isHazardSegment =
              hasHazard &&
              route.blockedSegment &&
              ((route.blockedSegment.from === state && route.blockedSegment.to === nextState) ||
                (route.blockedSegment.to === state && route.blockedSegment.from === nextState));

            return (
              <React.Fragment key={state}>
                <span
                  className={
                    idx === 0
                      ? 'text-emerald-400 font-bold'
                      : idx === route.path.length - 1
                      ? 'text-red-400 font-bold'
                      : 'text-cyan-300'
                  }
                >
                  {state}
                </span>
                {idx < route.path.length - 1 && (
                  <span
                    className={
                      isHazardSegment
                        ? 'text-red-500 font-bold px-0.5 animate-pulse'
                        : 'text-slate-500'
                    }
                  >
                    {isHazardSegment ? '⚡➔ [HAZARD] ➔' : '➔'}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Alternate Safe Route (If Hazard Active) */}
      {hasHazard && route.alternatePath && (
        <div className="space-y-1 mb-2.5 animate-fade-in">
          <div className="text-[9px] uppercase font-bold text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>SAFE ALTERNATE DIVERSION</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-[11px] font-semibold text-emerald-200 flex flex-wrap items-center gap-1 shadow-inner">
            {route.alternatePath.map((state, idx) => (
              <React.Fragment key={state}>
                <span>{state}</span>
                {idx < route.alternatePath!.length - 1 && (
                  <span className="text-emerald-400 font-bold">➔</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* STATUS Banner */}
      <div className="pt-2 border-t border-[#30363D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase font-bold text-slate-400">STATUS:</span>
          {hasHazard ? (
            <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-500/50 font-bold text-[10px] flex items-center gap-1">
              <span>⚠</span> Hazard Detected Ahead
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold text-[10px] flex items-center gap-1">
              <span>✓</span> Safe Route
            </span>
          )}
        </div>
        {hasHazard && (
          <span className="text-[10px] text-emerald-400 font-semibold">
            Alternate Active
          </span>
        )}
      </div>
    </div>
  );
};
