import React, { useState } from 'react';
import { RouteEvent } from '../../../types';
import { realtimeSync } from '../../../services/realtimeSync';

interface RouteEventsTabProps {
  events: RouteEvent[];
}

export const RouteEventsTab: React.FC<RouteEventsTabProps> = ({ events }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.event.toLowerCase().includes(q) ||
      e.driver.toLowerCase().includes(q) ||
      (e.details && e.details.toLowerCase().includes(q))
    );
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `routepilot_events_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-4 space-y-4 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#161B22] border border-[#30363D] p-4 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>Route Events &amp; Audit Log Stream</span>
            <span className="px-2 py-0.5 rounded-full bg-[#AEF5F0]/15 text-[#AEF5F0] border border-[#AEF5F0]/30 text-xs font-mono font-bold">
              {events.length} Records
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time event stream logging driver movements, sensor triggers, hazard discoveries, and multi-route dynamic bypasses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-300 font-semibold text-xs border border-[#30363D] transition cursor-pointer"
          >
            Export JSON
          </button>
          <button
            onClick={() => realtimeSync.clearRouteEvents()}
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-xs border border-rose-500/30 transition cursor-pointer"
          >
            Clear Log Stream
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-2xl">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter events by driver, hazard, or description..."
          className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#AEF5F0]"
        />
      </div>

      {/* Events List */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden shadow-xl">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300">No events logged</div>
            <p className="text-xs">Events appear here as navigation and sensor events occur.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#30363D] font-sans">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="p-3.5 hover:bg-[#21262D]/60 transition flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-[11px] text-slate-400 shrink-0 mt-0.5">{ev.time}</span>
                  <div>
                    <div className="font-bold text-white text-xs">{ev.event}</div>
                    {ev.details && <div className="text-slate-400 text-[11px] mt-0.5">{ev.details}</div>}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 pl-11 sm:pl-0">
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#21262D] text-slate-300 border border-[#30363D]">
                    {ev.driver}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    ev.status === 'Success'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : ev.status === 'Triggered' || ev.status === 'Warning'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-[#AEF5F0]/15 text-[#AEF5F0]'
                  }`}>
                    {ev.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
