import React, { useState } from 'react';
import { AStarEvaluationResult } from '../../algorithms/aStarPathEvaluator';
import { VehicleType } from '../../types';
import {
  ROUTE_WEIGHTS,
  TRAFFIC_LEVEL_COST,
  HAZARD_SEVERITY_COST,
  VIRTUAL_TRAFFIC_DISCLAIMER,
} from '../../algorithms/aStarConfig';
import { runAllAStarTests, FullTestSuiteSummary } from '../../algorithms/aStarTestSuite';

interface AStarModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationResult: AStarEvaluationResult | null;
  language?: 'en' | 'hi';
  vehicleType?: VehicleType;
  onSelectRoute?: (routeId: string) => void;
}

export const AStarModal: React.FC<AStarModalProps> = ({
  isOpen,
  onClose,
  evaluationResult,
  language = 'en',
  vehicleType = 'car',
  onSelectRoute,
}) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'trace' | 'tests'>('analysis');
  const [testResults, setTestResults] = useState<FullTestSuiteSummary | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  if (!isOpen || !evaluationResult) return null;

  const { routes, optimalRoute, evaluationSummary, stepLogs } = evaluationResult;
  const isHi = language === 'hi';
  const vUpper = (vehicleType || 'car').toUpperCase();

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const res = runAllAStarTests();
      setTestResults(res);
      setIsRunningTests(false);
    }, 150);
  };

  const optimalMetrics = optimalRoute.aStarMetrics;
  const breakdown = optimalMetrics?.costBreakdown || {
    distanceCost: Math.round(1.0 * Math.min(1.0, optimalRoute.distanceKm / 25) * 1000) / 1000,
    timeCost: Math.round(1.5 * Math.min(1.0, optimalRoute.durationMinutes / 45) * 1000) / 1000,
    trafficCost: 0,
    hazardCost: 0,
    restrictionCost: 0,
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-[#0D1117] border border-[#30363D] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#AEF5F0]/15 border border-[#AEF5F0]/40 flex items-center justify-center text-[#AEF5F0] text-lg font-bold shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>{isHi ? 'A* पाथफाइंडिंग रूट विश्लेषण' : 'RoutePilot A* Pathfinding Engine'}</span>
                <span className="text-[10px] font-mono bg-[#AEF5F0]/20 text-[#AEF5F0] px-2 py-0.5 rounded-full border border-[#AEF5F0]/30">
                  Vehicle: {vUpper}
                </span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {evaluationSummary.totalRoutesEvaluated} {isHi ? 'मार्ग विश्लेषित' : 'Corridors Evaluated'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate">
                g(n) = Wd·Dist + Wt·Time + Wc·Traffic + Wh·Hazard + Wr·Restriction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer text-sm font-bold shrink-0 ml-2"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 pt-2 bg-[#161B22]/70 border-b border-[#30363D] text-xs gap-2">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3 py-2 font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
              activeTab === 'analysis'
                ? 'border-[#AEF5F0] text-[#AEF5F0] bg-[#0D1117]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 {isHi ? 'रूट विश्लेषण व कॉस्ट ब्रेकडाउन' : 'Route Analysis & Scorecard'}
          </button>
          <button
            onClick={() => setActiveTab('trace')}
            className={`px-3 py-2 font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
              activeTab === 'trace'
                ? 'border-[#AEF5F0] text-[#AEF5F0] bg-[#0D1117]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🎓 {isHi ? 'A* प्रस्तुति ट्रेस (स्टेप-बाय-स्टेप)' : 'College Presentation Trace'}
          </button>
          <button
            onClick={() => {
              setActiveTab('tests');
              if (!testResults) handleRunTests();
            }}
            className={`px-3 py-2 font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
              activeTab === 'tests'
                ? 'border-[#AEF5F0] text-[#AEF5F0] bg-[#0D1117]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🧪 {isHi ? 'सत्यापन परीक्षण सूट (7 टेस्ट)' : 'Verification Test Suite (7 Tests)'}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'analysis' && (
            <>
              {/* Formula Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-[#161B22] border border-cyan-500/30 text-xs">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <span className="font-bold text-[#AEF5F0] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <span>📐</span>
                    <span>{isHi ? 'A* संचित लागत सूत्र g(n) और f(n)' : 'A* Accumulated Cost Formula'}</span>
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-950/50 px-2 py-0.5 rounded border border-amber-600/40">
                    {VIRTUAL_TRAFFIC_DISCLAIMER}
                  </span>
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-white bg-[#0D1117]/85 p-2.5 rounded-lg border border-[#30363D] text-center shadow-inner">
                  g(n) = Wd·Distance + Wt·Time + Wc·Traffic + Wh·Hazard + Wr·Restriction
                </div>
                <div className="text-center font-mono text-xs text-cyan-300 mt-1">
                  f(n) = g(n) + h(n) &nbsp;|&nbsp; h(n) = Haversine Straight-Line Distance to Goal
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 text-[10px] text-slate-300 font-mono">
                  <div className="bg-[#161B22]/80 p-1.5 rounded border border-[#30363D]">
                    <span className="text-cyan-400 block font-bold">Wd = {ROUTE_WEIGHTS.distance}</span>
                    <span className="text-slate-400 text-[9px]">Distance Weight</span>
                  </div>
                  <div className="bg-[#161B22]/80 p-1.5 rounded border border-[#30363D]">
                    <span className="text-emerald-400 block font-bold">Wt = {ROUTE_WEIGHTS.time}</span>
                    <span className="text-slate-400 text-[9px]">Time Weight</span>
                  </div>
                  <div className="bg-[#161B22]/80 p-1.5 rounded border border-[#30363D]">
                    <span className="text-amber-400 block font-bold">Wc = {ROUTE_WEIGHTS.traffic}</span>
                    <span className="text-slate-400 text-[9px]">Traffic Weight</span>
                  </div>
                  <div className="bg-[#161B22]/80 p-1.5 rounded border border-[#30363D]">
                    <span className="text-red-400 block font-bold">Wh = {ROUTE_WEIGHTS.hazard}</span>
                    <span className="text-slate-400 text-[9px]">Safety Priority</span>
                  </div>
                  <div className="bg-[#161B22]/80 p-1.5 rounded border border-[#30363D]">
                    <span className="text-purple-400 block font-bold">Wr = {ROUTE_WEIGHTS.restriction}</span>
                    <span className="text-slate-400 text-[9px]">Restriction Blocker</span>
                  </div>
                </div>
              </div>

              {/* SECTION 15: ROUTE ANALYSIS METRICS GRID */}
              <div className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] space-y-3">
                <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
                  <span className="font-bold text-white text-xs uppercase tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>{isHi ? 'सक्रिय इष्टतम मार्ग विश्लेषण' : 'Optimal Active Route Analysis'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-[#AEF5F0] bg-[#0D1117] px-2.5 py-0.5 rounded border border-[#30363D]">
                    {optimalRoute.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 bg-[#0D1117] rounded-lg border border-[#30363D]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Algorithm</span>
                    <span className="font-bold text-white font-mono text-sm">A* Search</span>
                  </div>
                  <div className="p-2.5 bg-[#0D1117] rounded-lg border border-[#30363D]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Vehicle Type</span>
                    <span className="font-bold text-[#AEF5F0] font-mono text-sm">{vUpper}</span>
                  </div>
                  <div className="p-2.5 bg-[#0D1117] rounded-lg border border-[#30363D]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Distance</span>
                    <span className="font-bold text-white font-mono text-sm">{optimalRoute.distanceKm} km</span>
                  </div>
                  <div className="p-2.5 bg-[#0D1117] rounded-lg border border-[#30363D]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Time</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">{optimalRoute.durationMinutes} min</span>
                  </div>
                  <div className="p-2.5 bg-[#0D1117] rounded-lg border border-[#30363D]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Traffic Condition</span>
                    <span className="font-bold text-amber-300 font-mono text-sm">
                      {optimalMetrics?.trafficSummary || (optimalRoute.name.includes('Arterial') ? 'MEDIUM' : 'LOW')}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#0D1117] rounded-lg border border-[#30363D]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Hazard Status</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">
                      {optimalMetrics?.status === 'HAZARD_BLOCKED' ? 'BLOCKED' : optimalMetrics?.hazardPenalty ? 'CAUTION' : 'SAFE'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#0D1117] rounded-lg border border-[#30363D]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Route Cost</span>
                    <span className="font-bold text-cyan-300 font-mono text-sm">
                      f = {optimalMetrics?.totalFCost ?? optimalRoute.durationMinutes}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#0D1117] rounded-lg border border-[#30363D]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Nodes Evaluated</span>
                    <span className="font-bold text-white font-mono text-sm">{optimalMetrics?.evaluatedNodesCount || 12}</span>
                  </div>
                </div>

                {/* Hazards and Blocked Roads Avoided */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                      🛡️ Hazards Avoided: {optimalMetrics?.hazardsAvoided?.length || 0}
                    </span>
                    <span className="text-slate-300 font-medium">
                      {optimalMetrics?.hazardsAvoided && optimalMetrics.hazardsAvoided.length > 0
                        ? optimalMetrics.hazardsAvoided.join(', ')
                        : 'No active hazards in vicinity of chosen corridor'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-red-950/20 border border-red-500/30 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-red-400 block mb-1">
                      ⛔ Blocked Roads Avoided: {optimalMetrics?.blockedRoadsAvoided?.length || 0}
                    </span>
                    <span className="text-slate-300 font-medium">
                      {optimalMetrics?.blockedRoadsAvoided && optimalMetrics.blockedRoadsAvoided.length > 0
                        ? optimalMetrics.blockedRoadsAvoided.join(', ')
                        : 'All chosen road corridors are OPEN and clear'}
                    </span>
                  </div>
                </div>

                {/* SECTION 15: COST BREAKDOWN BARS */}
                <div className="pt-2 border-t border-[#30363D]">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-white uppercase text-[11px]">
                      {isHi ? 'लागत घटक ब्रेकडाउन (Cost Breakdown)' : 'Multi-Objective Cost Breakdown'}
                    </span>
                    <span className="font-mono text-slate-400 text-[10px]">
                      Wd·D + Wt·T + Wc·C + Wh·H + Wr·R
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
                    <div className="p-2 bg-[#0D1117] rounded border border-cyan-500/30">
                      <span className="text-cyan-400 block text-[10px]">Distance Cost</span>
                      <span className="font-bold text-white">{breakdown.distanceCost.toFixed(3)}</span>
                    </div>
                    <div className="p-2 bg-[#0D1117] rounded border border-emerald-500/30">
                      <span className="text-emerald-400 block text-[10px]">Time Cost</span>
                      <span className="font-bold text-white">{breakdown.timeCost.toFixed(3)}</span>
                    </div>
                    <div className="p-2 bg-[#0D1117] rounded border border-amber-500/30">
                      <span className="text-amber-400 block text-[10px]">Traffic Cost</span>
                      <span className="font-bold text-white">{breakdown.trafficCost.toFixed(3)}</span>
                    </div>
                    <div className="p-2 bg-[#0D1117] rounded border border-red-500/30">
                      <span className="text-red-400 block text-[10px]">Hazard Cost</span>
                      <span className="font-bold text-white">{breakdown.hazardCost.toFixed(3)}</span>
                    </div>
                    <div className="p-2 bg-[#0D1117] rounded border border-purple-500/30">
                      <span className="text-purple-400 block text-[10px]">Restriction Cost</span>
                      <span className="font-bold text-white">{breakdown.restrictionCost === Infinity ? '∞' : breakdown.restrictionCost.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Candidate Paths Scorecard */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-white">
                    {routes.length} {isHi ? 'मार्गों का स्कोरकार्ड' : 'Candidate Corridors Scorecard'}
                  </span>
                  <span>{isHi ? 'न्यूनतम f(n) = विजयी' : 'Lowest Total f(n) Wins'}</span>
                </div>

                <div className={`grid gap-3 ${routes.length === 1 ? 'grid-cols-1' : routes.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
                  {routes.map((r, idx) => {
                    const m = r.aStarMetrics;
                    const isWinner = m?.isOptimal;
                    const isBlocked = m?.status === 'HAZARD_BLOCKED';

                    return (
                      <div
                        key={r.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between transition ${
                          isWinner
                            ? 'bg-[#161B22] border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50'
                            : isBlocked
                            ? 'bg-red-950/15 border-red-500/40'
                            : 'bg-[#161B22]/70 border-[#30363D]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                isWinner
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                                  : isBlocked
                                  ? 'bg-red-500/20 text-red-300 border-red-500/50'
                                  : 'bg-slate-800 text-slate-300 border-[#30363D]'
                              }`}
                            >
                              {isWinner ? '★ OPTIMAL' : isBlocked ? '⛔ BLOCKED' : `Rank #${m?.rank || idx + 1}`}
                            </span>
                          </div>

                          <div className="font-bold text-xs text-white truncate">{r.name}</div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {r.viaRoads?.join(' • ') || 'Main Corridor'}
                          </div>

                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#30363D] text-[11px] font-mono">
                            <span className="text-white font-bold">{r.distanceKm} km</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-emerald-400 font-bold">{r.durationMinutes} min</span>
                          </div>

                          <div className="mt-2.5 space-y-1 text-[10px] font-mono bg-[#0D1117] p-2 rounded border border-[#30363D]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">g(n) Accumulated:</span>
                              <span className="text-cyan-300 font-bold">{m?.gCost ?? '--'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">h(n) Heuristic:</span>
                              <span className="text-emerald-300 font-bold">{m?.hCost ?? '--'}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-[#30363D] font-bold text-xs">
                              <span className="text-white">Total f(n):</span>
                              <span className={isWinner ? 'text-cyan-400' : isBlocked ? 'text-red-400' : 'text-slate-200'}>
                                {m?.totalFCost ?? '--'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {onSelectRoute && (
                          <button
                            onClick={() => {
                              onSelectRoute(r.id);
                              onClose();
                            }}
                            className={`w-full mt-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              isWinner
                                ? 'bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 shadow-md shadow-[#AEF5F0]/20'
                                : 'bg-[#21262D] hover:bg-[#30363D] text-slate-200'
                            }`}
                          >
                            {isWinner ? (isHi ? 'यह मार्ग सक्रिय करें' : 'Activate Optimal') : (isHi ? 'यह मार्ग चुनें' : 'Select Corridor')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'trace' && (
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-blue-950/40 to-[#161B22] border border-cyan-500/30 rounded-xl text-xs flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-bold text-white block">🎓 College Presentation: Step-by-Step A* Trace</span>
                  <span className="text-slate-400 text-[11px]">
                    Shows exact node selection order, cumulative g(n), straight-line h(n), and f(n) = g(n) + h(n).
                  </span>
                </div>
                <span className="font-mono text-cyan-300 text-[11px] bg-[#0D1117] px-2.5 py-1 rounded border border-[#30363D]">
                  {stepLogs.length} Search Steps Logged
                </span>
              </div>

              <div className="space-y-2">
                {stepLogs.map((log) => (
                  <div
                    key={log.step}
                    className="p-3 rounded-xl bg-[#161B22] border border-[#30363D] text-xs flex items-start gap-3"
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        log.status === 'success'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : log.status === 'danger'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : log.status === 'warning'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      #{log.step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <span className="font-bold text-white text-xs">{log.title}</span>
                        <span className="font-mono text-[11px] text-cyan-400 bg-[#0D1117] px-2 py-0.5 rounded border border-[#30363D]">
                          {log.formula}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 leading-relaxed">{log.details}</div>
                      {(log as any).costBreakdown && (
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono bg-[#0D1117] p-2 rounded border border-[#30363D]/60">
                          <span className="text-slate-400">Dist: <strong className="text-white">{(log as any).costBreakdown.distanceCost?.toFixed(3)}</strong></span>
                          <span className="text-slate-400">Time: <strong className="text-emerald-400">{(log as any).costBreakdown.timeCost?.toFixed(3)}</strong></span>
                          <span className="text-slate-400">Traffic: <strong className="text-amber-400">{(log as any).costBreakdown.trafficCost?.toFixed(3)}</strong></span>
                          <span className="text-slate-400">Hazard: <strong className="text-red-400">{(log as any).costBreakdown.hazardCost?.toFixed(3)}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-[#161B22] border border-emerald-500/40 rounded-xl flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-bold text-white block text-xs">
                    🧪 Automated Algorithm Verification Test Suite (TEST 1 to TEST 7)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Proves that traffic, hazards, vehicle restrictions, dynamic rerouting, and cumulative g(n) are all strictly respected.
                  </span>
                </div>
                <button
                  onClick={handleRunTests}
                  disabled={isRunningTests}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
                >
                  {isRunningTests ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      <span>Running Tests...</span>
                    </>
                  ) : (
                    <>
                      <span>▶ Re-run 7 Tests</span>
                    </>
                  )}
                </button>
              </div>

              {testResults && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-[#161B22] border border-[#30363D] flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">
                      Results: <strong className="text-emerald-400">{testResults.passedTests}/{testResults.totalTests} PASSED</strong>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Verified at: {new Date(testResults.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {testResults.results.map((t) => (
                      <div
                        key={t.id}
                        className={`p-3 rounded-xl border text-xs ${
                          t.passed
                            ? 'bg-[#161B22] border-emerald-500/40'
                            : 'bg-red-950/20 border-red-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                t.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {t.id}
                            </span>
                            <span className="font-bold text-white text-xs">{t.name}</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                              t.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {t.passed ? '✓ PASSED' : '✕ FAILED'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">{t.summary}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono bg-[#0D1117] p-2 rounded border border-[#30363D]">
                          <div>
                            <span className="text-slate-400 block font-sans text-[9px] uppercase">Expected:</span>
                            <span className="text-emerald-300">{t.expected}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-sans text-[9px] uppercase">Actual:</span>
                            <span className="text-cyan-300">{t.actual}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#161B22] border-t border-[#30363D] flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            {isHi ? 'A* एल्गोरिथ्म - सुरक्षा व सटीकता प्राथमिकता' : 'RoutePilot Intelligent Navigation • Safety Priority'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-white font-semibold transition cursor-pointer"
          >
            {isHi ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
