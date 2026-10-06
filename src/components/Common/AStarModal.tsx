import React from 'react';
import { AStarEvaluationResult } from '../../algorithms/aStarPathEvaluator';
import { VehicleType } from '../../types';

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
  if (!isOpen || !evaluationResult) return null;

  const { routes, optimalRoute, evaluationSummary, stepLogs } = evaluationResult;
  const isHi = language === 'hi';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#0D1117] border border-[#30363D] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#AEF5F0]/15 border border-[#AEF5F0]/40 flex items-center justify-center text-[#AEF5F0] text-lg font-bold">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isHi ? 'A* एल्गोरिथ्म रूट विश्लेषण' : 'A* Algorithm Path Decision Engine'}</span>
                <span className="text-[10px] font-semibold bg-[#AEF5F0]/20 text-[#AEF5F0] px-2 py-0.5 rounded-full border border-[#AEF5F0]/30">
                  {evaluationSummary.totalRoutesEvaluated} {isHi ? 'मार्ग विश्लेषित' : 'Paths Evaluated'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isHi
                  ? 'गणितीय सूत्र f(n) = g(n) + h(n) + HazardPenalty के आधार पर सर्वश्रेष्ठ मार्ग का चयन'
                  : 'Multi-objective heuristic evaluation: f(n) = g(n) + h(n) + HazardPenalty'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Formula Explanation Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-[#161B22] border border-cyan-500/30 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[#AEF5F0] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <span>📐</span>
                <span>{isHi ? 'A* मूल्यांकन सूत्र' : 'A* Cost Evaluation Function'}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Vehicle: {vehicleType.toUpperCase()}
              </span>
            </div>
            <div className="font-mono text-sm sm:text-base font-bold text-white bg-[#0D1117]/80 p-2.5 rounded-lg border border-[#30363D] text-center shadow-inner">
              f(n) = g(n) + h(n) + HazardPenalty(n)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-[11px] text-slate-300">
              <div className="bg-[#161B22]/70 p-2 rounded-lg border border-[#30363D]/60">
                <span className="font-bold text-cyan-400 font-mono block">g(n) = Traversal Cost</span>
                <span className="text-slate-400">
                  {isHi ? 'वास्तविक दूरी + समय + वाहन गुणांक' : 'Actual road distance + travel time + vehicle agility'}
                </span>
              </div>
              <div className="bg-[#161B22]/70 p-2 rounded-lg border border-[#30363D]/60">
                <span className="font-bold text-emerald-400 font-mono block">h(n) = Heuristic Cost</span>
                <span className="text-slate-400">
                  {isHi ? 'लक्ष्य तक सीधी हेवरसाइन दूरी' : 'Admissible Haversine straight-line distance to goal'}
                </span>
              </div>
              <div className="bg-[#161B22]/70 p-2 rounded-lg border border-[#30363D]/60">
                <span className="font-bold text-red-400 font-mono block">HazardPenalty</span>
                <span className="text-slate-400">
                  {isHi ? 'खतरा होने पर +9999 (ब्लॉक) या +180' : 'IoT / road hazard penalty (+9999 if blocked)'}
                </span>
              </div>
            </div>
          </div>

          {/* Decision Summary Callout */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex items-start gap-3">
            <span className="text-xl">🏆</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs text-emerald-400 uppercase tracking-wide">
                {isHi ? 'A* द्वारा चयनित सर्वोत्तम मार्ग' : 'A* Algorithm Optimal Selection'}
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {optimalRoute.name} • <span className="font-mono text-[#AEF5F0]">f(n) = {optimalRoute.aStarMetrics?.totalFCost}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {isHi ? evaluationSummary.decisionReasonHi : evaluationSummary.decisionReason}
              </p>
            </div>
          </div>

          {/* Paths Comparison Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[11px] text-white">
                {routes.length} {isHi ? 'मार्गों का तुलनात्मक स्कोरकार्ड' : 'Evaluated Paths Comparative Scorecard'}
              </span>
              <span>{isHi ? 'न्यूनतम f(n) = सर्वश्रेष्ठ' : 'Lowest f(n) = Winner'}</span>
            </div>

            <div className={`grid gap-3 ${routes.length === 1 ? 'grid-cols-1' : routes.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
              {routes.map((r, idx) => {
                const m = r.aStarMetrics;
                const isWinner = m?.isOptimal;
                const isBlocked = m?.status === 'HAZARD_BLOCKED';

                return (
                  <div
                    key={r.id}
                    className={`relative p-3.5 rounded-xl border transition flex flex-col justify-between overflow-hidden min-w-0 ${
                      isWinner
                        ? 'bg-[#161B22] border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50'
                        : isBlocked
                        ? 'bg-red-950/15 border-red-500/40'
                        : 'bg-[#161B22]/70 border-[#30363D]'
                    }`}
                  >
                    <div className="min-w-0 overflow-hidden">
                      {/* Top Rank Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: r.color }}
                        ></span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            isWinner
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                              : isBlocked
                              ? 'bg-red-500/20 text-red-300 border-red-500/50'
                              : 'bg-slate-800 text-slate-300 border-[#30363D]'
                          }`}
                        >
                          {isWinner
                            ? isHi
                              ? '★ सर्वोत्तम'
                              : '★ OPTIMAL'
                            : isBlocked
                            ? isHi
                              ? '⛔ अवरुद्ध'
                              : '⛔ BLOCKED'
                            : `Rank #${m?.rank || idx + 1}`}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-white truncate" title={r.name}>
                        {r.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5" title={r.viaRoads?.join(' • ') || 'Main Corridor'}>
                        {r.viaRoads?.join(' • ') || 'Main Corridor'}
                      </div>

                      {/* Travel Metrics */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#30363D] text-[11px] font-mono flex-wrap">
                        <span className="text-white font-bold">{r.distanceKm} km</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-400 font-bold">{r.durationMinutes} min</span>
                      </div>

                      {/* A* Math Details */}
                      <div className="mt-3 space-y-1.5 text-[10px] font-mono bg-[#0D1117]/80 p-2.5 rounded-lg border border-[#30363D]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">g(n) [Path Cost]:</span>
                          <span className="text-cyan-300 font-bold">{m?.gCost ?? '--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">h(n) [Heuristic]:</span>
                          <span className="text-emerald-300 font-bold">{m?.hCost ?? '--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hazard Penalty:</span>
                          <span className={m?.hazardPenalty ? 'text-red-400 font-bold' : 'text-slate-400'}>
                            +{m?.hazardPenalty ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-[#30363D] font-bold text-xs">
                          <span className="text-white">Total f(n):</span>
                          <span className={isWinner ? 'text-cyan-400' : isBlocked ? 'text-red-400' : 'text-slate-200'}>
                            {m?.totalFCost ?? '--'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed italic">
                        {m?.explanation}
                      </p>
                    </div>

                    {onSelectRoute && (
                      <button
                        onClick={() => {
                          onSelectRoute(r.id);
                          onClose();
                        }}
                        className={`w-full mt-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                          isWinner
                            ? 'bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold shadow-md shadow-[#AEF5F0]/20'
                            : 'bg-[#21262D] hover:bg-[#30363D] text-slate-200'
                        }`}
                      >
                        {isWinner ? (isHi ? 'यह मार्ग सक्रिय करें' : 'Activate Optimal') : (isHi ? 'यह मार्ग चुनें' : 'Choose This Route')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step-by-Step A* Evaluation Logs */}
          <div className="space-y-2 pt-2 border-t border-[#30363D]">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-300 block">
              {isHi ? 'A* खोज निष्पादन प्रक्रिया (चरण-दर-चरण)' : 'A* Algorithm Node Expansion Trace'}
            </span>

            <div className="space-y-1.5">
              {stepLogs.map((log) => (
                <div
                  key={log.step}
                  className="p-2.5 rounded-lg bg-[#161B22] border border-[#30363D] text-xs flex items-start gap-2.5"
                >
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                      log.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : log.status === 'danger'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : log.status === 'warning'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {log.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white text-xs">{log.title}</span>
                      <span className="font-mono text-[10px] text-cyan-400 bg-[#0D1117] px-2 py-0.5 rounded border border-[#30363D]">
                        {log.formula}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{log.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#161B22] border-t border-[#30363D] flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            {isHi ? 'रीयल-टाइम जीपीएस व आईओटी सेंसर डेटा से समन्वित' : 'Integrated with real-time GPS & IoT road sensors'}
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
