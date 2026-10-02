import React, { useState } from 'react';
import { Hazard, HazardSeverity } from '../../../types';
import { realtimeSync } from '../../../services/realtimeSync';

interface HazardsTabProps {
  hazards: Hazard[];
  onCreateHazardClick: () => void;
}

export const HazardsTab: React.FC<HazardsTabProps> = ({ hazards, onCreateHazardClick }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHazards = hazards.filter((h) => {
    if (filterSeverity !== 'ALL' && h.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && h.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        h.type.toLowerCase().includes(q) ||
        h.roadName.toLowerCase().includes(q) ||
        h.locationName.toLowerCase().includes(q) ||
        h.hazardId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityBadge = (sev: HazardSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'BLOCKED':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="p-4 space-y-4 text-xs">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#161B22] border border-[#30363D] p-4 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>Hazard Incident Management</span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-mono font-bold">
              {hazards.filter((h) => h.status === 'ACTIVE').length} Active
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor, create, or resolve real-time road and bridge obstacles affecting transportation corridors.
          </p>
        </div>

        <button
          onClick={onCreateHazardClick}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition cursor-pointer"
        >
          <span>+ Create Hazard Anywhere</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-semibold">Severity:</span>
          {['ALL', 'CRITICAL', 'WARNING', 'BLOCKED'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                filterSeverity === sev
                  ? 'bg-[#66ffff] text-slate-950 shadow-md shadow-[#66ffff]/20'
                  : 'bg-[#21262D] text-slate-400 hover:text-white border border-[#30363D]'
              }`}
            >
              {sev}
            </button>
          ))}

          <span className="text-slate-400 font-semibold ml-2">Status:</span>
          {['ALL', 'ACTIVE', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#66ffff] text-slate-950 shadow-md shadow-[#66ffff]/20'
                  : 'bg-[#21262D] text-slate-400 hover:text-white border border-[#30363D]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by road, location, or ID..."
            className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Hazards Table */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden shadow-xl">
        {filteredHazards.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#21262D] text-slate-500 flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <div className="font-semibold text-slate-300">No hazards match current criteria</div>
            <p className="text-xs max-w-sm mx-auto">
              All monitored corridors are currently open and safe, or no active incidents match your filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#30363D] bg-[#0D1117] text-[11px] text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Hazard ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Road &amp; Location</th>
                  <th className="py-3 px-4">Radius</th>
                  <th className="py-3 px-4">Coordinates</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D] font-mono text-slate-300">
                {filteredHazards.map((h) => (
                  <tr key={h.hazardId} className="hover:bg-[#21262D]/60 transition">
                    <td className="py-3 px-4 font-bold text-white">{h.hazardId}</td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-200">{h.type}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(h.severity)}`}>
                        {h.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-white">{h.roadName}</div>
                      <div className="text-[10px] text-slate-400">{h.locationName}</div>
                    </td>
                    <td className="py-3 px-4">{h.affectedRadius}m</td>
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 font-sans text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-[#21262D] border border-[#30363D] text-slate-300">
                        {h.source}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        ● {h.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {h.status === 'ACTIVE' ? (
                        <button
                          onClick={() => realtimeSync.resolveHazard(h.hazardId)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-[11px] transition cursor-pointer"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
