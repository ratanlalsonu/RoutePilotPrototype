import React from 'react';
import { RoadStatusItem, Hazard } from '../../../types';
import { realtimeSync } from '../../../services/realtimeSync';

interface RoadStatusTabProps {
  roadStatuses: RoadStatusItem[];
  hazards: Hazard[];
}

const MONITORED_CORRIDORS = [
  'Civil Lines Bridge Road',
  'Gwalior Road',
  'Sadar Bazar Arterial',
  'Orchha Highway',
  'Pahuj River Embankment',
  'Kanpur Road (NH27)',
  'Station Link Road',
];

export const RoadStatusTab: React.FC<RoadStatusTabProps> = ({ roadStatuses, hazards }) => {
  const getRoadInfo = (roadName: string) => {
    const statusItem = roadStatuses.find((r) => r.roadName.toLowerCase() === roadName.toLowerCase());
    const hazard = hazards.find((h) => h.status === 'ACTIVE' && h.roadName.toLowerCase() === roadName.toLowerCase());

    const status = statusItem ? statusItem.status : hazard ? (hazard.severity === 'BLOCKED' ? 'Blocked' : 'Restricted') : 'Open';
    return { status, hazard };
  };

  const handleToggleStatus = (roadName: string, newStatus: RoadStatusItem['status']) => {
    realtimeSync.toggleRoadStatus(roadName, newStatus);
  };

  return (
    <div className="p-4 space-y-4 text-xs">
      {/* Header */}
      <div className="bg-[#161B22] border border-[#30363D] p-4 rounded-2xl shadow-lg">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <span>Corridor Traffic &amp; Road Restriction Manager</span>
          <span className="px-2 py-0.5 rounded-full bg-[#AEF5F0]/15 text-[#AEF5F0] border border-[#AEF5F0]/30 text-xs font-mono font-bold">
            {MONITORED_CORRIDORS.length} Tracked Corridors
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time lane access states. When hazards are detected on bridge deck segments or arterial roads, restrictions propagate automatically to navigation routing algorithms.
        </p>
      </div>

      {/* Roads Table */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden shadow-xl">
        {/* Mobile Card Feed for small screens */}
        <div className="block md:hidden divide-y divide-[#30363D]">
          {MONITORED_CORRIDORS.map((road) => {
            const { status, hazard } = getRoadInfo(road);
            return (
              <div key={road} className="p-3.5 space-y-2 hover:bg-[#21262D]/40 transition">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{road}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    status === 'Blocked'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : status === 'Restricted'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : status === 'Warning'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    ● {status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-300">
                  {hazard ? (
                    <div>
                      <span className="font-semibold text-white">{hazard.type}</span>
                      <span className="text-slate-400 text-[10px] block">{hazard.locationName}</span>
                      <span className="text-amber-400 font-bold text-[10px] block mt-0.5">Severity: {hazard.severity}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500">Normal Traffic Flow</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#21262D]">
                  <button
                    onClick={() => handleToggleStatus(road, 'Open')}
                    className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleToggleStatus(road, 'Restricted')}
                    className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                  >
                    Restrict
                  </button>
                  <button
                    onClick={() => handleToggleStatus(road, 'Blocked')}
                    className="px-2.5 py-1 rounded bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                  >
                    Block
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop / Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#30363D] bg-[#0D1117] text-[11px] text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4">Road / Bridge Corridor</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Active Incident</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4 text-right">Manual Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D] font-sans text-slate-300">
              {MONITORED_CORRIDORS.map((road) => {
                const { status, hazard } = getRoadInfo(road);
                return (
                  <tr key={road} className="hover:bg-[#21262D]/60 transition">
                    <td className="py-3 px-4 font-bold text-white">{road}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        status === 'Blocked'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : status === 'Restricted'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : status === 'Warning'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        ● {status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {hazard ? (
                        <div>
                          <span className="font-semibold text-white">{hazard.type}</span>
                          <span className="text-slate-400 text-[10px] block">{hazard.locationName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Normal Traffic Flow</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {hazard ? (
                        <span className="text-amber-400 font-bold">{hazard.severity}</span>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(road, 'Open')}
                          className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleToggleStatus(road, 'Restricted')}
                          className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                        >
                          Restrict
                        </button>
                        <button
                          onClick={() => handleToggleStatus(road, 'Blocked')}
                          className="px-2 py-1 rounded bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                        >
                          Block
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
