import React, { useState } from 'react';
import { SimulationRoute } from '../../types/simulationMap';
import { VIRTUAL_TRAFFIC_DISCLAIMER } from '../../algorithms/aStarConfig';

interface RouteInfoCardProps {
  route: SimulationRoute | null;
  hasHazard: boolean;
  isCalculating: boolean;
  onClearRoute?: () => void;
  vehicleType?: string;
}

export const RouteInfoCard: React.FC<RouteInfoCardProps> = ({
  route,
  hasHazard,
  isCalculating,
  onClearRoute,
  vehicleType = 'CAR',
}) => {
  const [showAnalysis, setShowAnalysis] = useState(true);

  if (isCalculating) {
    return (
      <div className="bg-[#161B22]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3 shadow-2xl text-xs text-slate-200 animate-pulse flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <span className="font-semibold text-cyan-300">Calculating safest route with A* algorithm...</span>
      </div>
    );
  }

  if (!route) return null;

  // Normalized cost estimates for analysis display
  const normDistCost = Math.round(1.0 * Math.min(1.0, route.totalDistanceKm / 1500) * 1000) / 1000;
  const normTimeCost = Math.round(1.5 * Math.min(1.0, route.estimatedMinutes / 1200) * 1000) / 1000;
  const normTrafficCost = 0.0;
  const normHazardCost = hasHazard ? 5.0 * 1.0 : 0.0;
  const normRestCost = 0.0;
  const totalRouteCost = Math.round((normDistCost + normTimeCost + normTrafficCost + normHazardCost) * 1000) / 1000;

  return (
    <div className="bg-[#161B22]/95 backdrop-blur-xl border border-[#30363D] hover:border-slate-600 rounded-2xl p-3 shadow-2xl text-xs text-slate-200 max-w-sm w-full transition-all select-none animate-fade-in overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#30363D]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-white tracking-wide uppercase text-[11px]">
            A* Optimal Path Navigation
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
              className="text-slate-400 hover:text-white text-xs px-1 hover:bg-[#21262D] rounded cursor-pointer"
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

      {/* SECTION 15: ROUTE ANALYSIS TOGGLE & CARD */}
      <div className="mt-2 pt-2 border-t border-[#30363D]">
        <div
          onClick={() => setShowAnalysis(!showAnalysis)}
          className="flex items-center justify-between cursor-pointer py-1 text-slate-300 hover:text-white"
        >
          <span className="font-bold text-[10px] uppercase tracking-wider text-cyan-300 flex items-center gap-1">
            <span>📊</span> Route Analysis (A*)
          </span>
          <span className="text-[9px] text-slate-400">{showAnalysis ? '▲ Hide' : '▼ View'}</span>
        </div>

        {showAnalysis && (
          <div className="mt-2 space-y-2 bg-[#0D1117] p-2.5 rounded-xl border border-[#30363D] animate-fade-in text-[10px]">
            <div className="grid grid-cols-2 gap-1.5 font-mono">
              <div>
                <span className="text-slate-400 block text-[9px]">Algorithm:</span>
                <span className="font-bold text-white">A* Pathfinding</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Vehicle:</span>
                <span className="font-bold text-[#AEF5F0]">{vehicleType.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Distance:</span>
                <span className="font-bold text-white">{route.totalDistanceKm} km</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Estimated Time:</span>
                <span className="font-bold text-emerald-400">{Math.round(route.estimatedMinutes)} min</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Traffic Condition:</span>
                <span className="font-bold text-amber-300">LOW</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Hazard Status:</span>
                <span className={`font-bold ${hasHazard ? 'text-red-400' : 'text-emerald-400'}`}>
                  {hasHazard ? 'BLOCKED' : 'SAFE'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Total Route Cost:</span>
                <span className="font-bold text-cyan-300">f = {totalRouteCost}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Nodes Evaluated:</span>
                <span className="font-bold text-white">{route.nodeIds?.length || route.path.length}</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-[#21262D] text-[9px] text-slate-400">
              <span className="text-emerald-400 font-semibold block">
                🛡️ Hazards Avoided: {hasHazard ? '1 Blocked Bridge' : '0 (Clear Path)'}
              </span>
              <span className="text-slate-400 block mt-0.5">
                ⛔ Blocked Roads Avoided: {hasHazard ? route.blockedSegment?.from + ' → ' + route.blockedSegment?.to : 'None'}
              </span>
            </div>

            {/* Cost Breakdown */}
            <div className="pt-1.5 border-t border-[#21262D]">
              <div className="text-[9px] font-bold uppercase text-slate-300 mb-1">Cost Breakdown:</div>
              <div className="grid grid-cols-5 gap-1 font-mono text-[9px] text-center">
                <div className="bg-[#161B22] p-1 rounded">
                  <span className="text-cyan-400 block">Dist</span>
                  <span className="text-white font-bold">{normDistCost}</span>
                </div>
                <div className="bg-[#161B22] p-1 rounded">
                  <span className="text-emerald-400 block">Time</span>
                  <span className="text-white font-bold">{normTimeCost}</span>
                </div>
                <div className="bg-[#161B22] p-1 rounded">
                  <span className="text-amber-400 block">Traf</span>
                  <span className="text-white font-bold">{normTrafficCost}</span>
                </div>
                <div className="bg-[#161B22] p-1 rounded">
                  <span className="text-red-400 block">Haz</span>
                  <span className="text-white font-bold">{normHazardCost}</span>
                </div>
                <div className="bg-[#161B22] p-1 rounded">
                  <span className="text-purple-400 block">Rest</span>
                  <span className="text-white font-bold">{normRestCost}</span>
                </div>
              </div>
            </div>

            <div className="text-[8.5px] text-slate-500 italic text-center">
              {VIRTUAL_TRAFFIC_DISCLAIMER}
            </div>
          </div>
        )}
      </div>

      {/* STATUS Banner */}
      <div className="pt-2 mt-2 border-t border-[#30363D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase font-bold text-slate-400">STATUS:</span>
          {hasHazard ? (
            <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-500/50 font-bold text-[10px] flex items-center gap-1">
              <span>⚠</span> Hazard Detected Ahead
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold text-[10px] flex items-center gap-1">
              <span>✓</span> Safe Route Active
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
