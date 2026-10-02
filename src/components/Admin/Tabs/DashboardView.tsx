import React from 'react';
import { RoutePilotState, realtimeSync } from '../../../services/realtimeSync';
import { RoutePilotMap } from '../../Map/RoutePilotMap';

interface DashboardViewProps {
  state: RoutePilotState;
  onNavigateTab: (tab: string) => void;
  onOpenCreateHazard: () => void;
  isCreatingHazard: boolean;
  onMapClickForHazard: (lat: number, lng: number) => void;
  onQuickHazardOnRoute: () => void;
  onQuickHazardAwayFromRoute: () => void;
  onQuickSecondHazardAhead: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  onNavigateTab,
  onOpenCreateHazard,
  isCreatingHazard,
  onMapClickForHazard,
  onQuickHazardOnRoute,
  onQuickHazardAwayFromRoute,
  onQuickSecondHazardAhead,
}) => {
  const { hazards, sensorNodes, journey, routeEvents, roadStatuses, systemHealth } = state;
  const activeHazardsCount = hazards.filter((h) => h.status === 'ACTIVE').length;
  const onlineSensorsCount = sensorNodes.filter((s) => s.status === 'Online').length;
  const blockedRoadsCount = roadStatuses.filter((r) => r.status === 'Blocked').length;

  return (
    <>
      {/* Top 4 KPI Cards matching screenshot Image 2 */}
      <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Active Hazards */}
        <div
          onClick={() => onNavigateTab('Hazards')}
          className="bg-[#161B22] border border-red-500/30 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-red-500/60 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Hazards</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">{activeHazardsCount}</span>
                <span className="text-xs text-red-400 font-bold flex items-center">
                  ▲ {activeHazardsCount > 0 ? `+${activeHazardsCount}` : '0'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-red-400/90 flex items-center gap-1 group-hover:translate-x-1 transition">
            <span>View Details</span>
            <span>→</span>
          </div>
        </div>

        {/* Card 2: Active Drivers */}
        <div
          onClick={() => onNavigateTab('Active Drivers')}
          className="bg-[#161B22] border border-blue-500/30 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-blue-500/60 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Drivers</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">1</span>
                <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded">
                  {journey.status === 'IDLE' ? 'Standby' : journey.status}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-blue-400/90 flex items-center gap-1 group-hover:translate-x-1 transition">
            <span>Live Tracking</span>
            <span>→</span>
          </div>
        </div>

        {/* Card 3: Online Sensor Nodes */}
        <div
          onClick={() => onNavigateTab('Sensor Nodes')}
          className="bg-[#161B22] border border-emerald-500/30 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-emerald-500/60 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Online Sensor Nodes</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">
                  {onlineSensorsCount} <span className="text-slate-500 text-lg font-normal">/ {sensorNodes.length}</span>
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-emerald-400/90 flex items-center gap-1 group-hover:translate-x-1 transition">
            <span>View Nodes</span>
            <span>→</span>
          </div>
        </div>

        {/* Card 4: Blocked Roads */}
        <div
          onClick={() => onNavigateTab('Road Status')}
          className="bg-[#161B22] border border-amber-500/30 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-amber-500/60 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Blocked Roads</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">{blockedRoadsCount}</span>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                  {blockedRoadsCount > 0 ? 'Traffic Restricted' : 'Corridors Normal'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-amber-400/90 flex items-center gap-1 group-hover:translate-x-1 transition">
            <span>View Roads</span>
            <span>→</span>
          </div>
        </div>
      </div>

      {/* Central Workspace: Live Map + Right Monitoring Panels */}
      <div className="px-4 pb-4 grid grid-cols-1 xl:grid-cols-4 gap-4 flex-1 min-h-[460px]">
        {/* Map Column (3 cols on XL) */}
        <div className="xl:col-span-3 flex flex-col bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden shadow-xl min-h-[440px]">
          {/* Map Bar: Controls & Quick Actions */}
          <div className="px-4 py-3 border-b border-[#30363D] bg-[#161B22] flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Live Map — Real Time Monitoring</span>
              <span className="text-xs text-slate-400 hidden sm:inline">• OpenStreetMap Real Roads</span>
            </div>

            {/* Demonstration & Hazard Creation Controls */}
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={onOpenCreateHazard}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer ${
                  isCreatingHazard
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                }`}
              >
                <span>+</span>
                <span>{isCreatingHazard ? 'Click Map Point...' : 'Create Hazard Anywhere'}</span>
              </button>

              <button
                onClick={onQuickHazardOnRoute}
                title="Creates Hazard on active route (triggers alert)"
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#21262D] border border-[#30363D] hover:border-red-500 text-slate-200 hover:text-white transition cursor-pointer"
              >
                ⚠ Hazard on Driver Route
              </button>

              <button
                onClick={onQuickHazardAwayFromRoute}
                title="Creates hazard far away (proves rule 13: NO driver alert)"
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#21262D] border border-[#30363D] hover:border-slate-500 text-slate-300 transition cursor-pointer"
              >
                Hazard Away (No Alert)
              </button>

              <button
                onClick={onQuickSecondHazardAhead}
                title="Creates second hazard ahead on diverted route (tests repeated diversion!)"
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#21262D] border border-[#30363D] hover:border-amber-500 text-amber-300 transition cursor-pointer"
              >
                ⚠ 2nd Hazard Ahead
              </button>

              <button
                onClick={() => realtimeSync.resetDemo()}
                title="Reset demo state"
                className="p-1.5 rounded-xl bg-[#21262D] border border-[#30363D] hover:bg-[#30363D] text-slate-300 transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>
          </div>

          {/* Map Canvas */}
          <div className="flex-1 relative min-h-[380px]">
            <RoutePilotMap
              mode="admin"
              hazards={hazards}
              sensorNodes={sensorNodes}
              journey={journey}
              isCreatingHazard={isCreatingHazard}
              onMapClickForHazard={onMapClickForHazard}
              onResolveHazard={(id) => realtimeSync.resolveHazard(id)}
              onCommitRoute={(id) => realtimeSync.commitToAlternateRoute(id)}
              theme={state.appSettings.mapTheme}
              onToggleTheme={() => realtimeSync.toggleMapTheme()}
              onChangeTheme={(t) => realtimeSync.setMapTheme(t)}
            />
          </div>
        </div>

        {/* Right Monitoring Panels (matching screenshot Image 2) */}
        <div className="flex flex-col gap-3">
          {/* Panel 1: Active Drivers */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-3.5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                <span className="font-bold text-xs text-white">Active Drivers</span>
              </div>
              <span
                onClick={() => onNavigateTab('Active Drivers')}
                className="text-[10px] text-blue-400 font-semibold cursor-pointer hover:underline"
              >
                View All
              </span>
            </div>

            <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" /></svg>
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">{journey.driverId}</div>
                    <div className="text-[10px] text-slate-400 capitalize">Vehicle: {journey.vehicleType}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  journey.status === 'DIVERTED'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : journey.status === 'ARRIVED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : journey.status === 'ON_ROUTE'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                }`}>
                  ● {journey.status === 'DIVERTED' ? 'Diverted' : journey.status === 'ARRIVED' ? 'Arrived' : journey.status === 'ON_ROUTE' ? 'On Route' : 'Standby'}
                </span>
              </div>

              <div className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-[#30363D]">
                <div className="flex justify-between">
                  <span className="text-slate-400">From:</span>
                  <span className="text-slate-200 font-medium">{journey.origin.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">To:</span>
                  <span className="text-blue-300 font-semibold">{journey.destination?.name || 'Awaiting Selection'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Distance:</span>
                  <span className="font-mono text-slate-200">
                    {journey.activeRoute ? `${journey.remainingDistanceKm} km left` : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ETA:</span>
                  <span className="font-mono text-slate-200">
                    {journey.activeRoute ? `${journey.eta} (${journey.remainingDurationMinutes} min)` : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Speed:</span>
                  <span className="font-mono text-cyan-400 font-bold">{journey.currentSpeedKmh} km/h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Sensor Nodes */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-3.5 shadow-lg flex-1">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-2 mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0"/></svg>
                <span className="font-bold text-xs text-white">Sensor Nodes</span>
              </div>
              <span
                onClick={() => onNavigateTab('Sensor Nodes')}
                className="text-[10px] text-blue-400 font-semibold cursor-pointer hover:underline"
              >
                View All
              </span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-44">
              {sensorNodes.length === 0 ? (
                <div className="p-3 text-center text-slate-500 text-[11px]">No active hardware nodes</div>
              ) : (
                sensorNodes.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-xl bg-[#21262D] border border-[#30363D] text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></span>
                      <div>
                        <span className="font-mono font-bold text-slate-200 text-[11px]">{s.id}</span>
                        <span className="text-slate-400 ml-1.5 text-[10px]">{s.name}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'Online'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel 3: Road Status */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-3.5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-2 mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <span className="font-bold text-xs text-white">Road Status</span>
              </div>
              <span
                onClick={() => onNavigateTab('Road Status')}
                className="text-[10px] text-blue-400 font-semibold cursor-pointer hover:underline"
              >
                View All
              </span>
            </div>

            <div className="space-y-1.5">
              {roadStatuses.length === 0 ? (
                <div className="p-2 text-center text-slate-500 text-[11px]">All corridors open &amp; normal</div>
              ) : (
                roadStatuses.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-[#21262D] border border-[#30363D] text-xs">
                    <span className="text-slate-300 font-medium text-[11px] truncate max-w-[130px]">{r.roadName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === 'Blocked'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : r.status === 'Restricted'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : r.status === 'Warning'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3 Panels matching screenshot Image 2 */}
      <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bottom 1: Recent Hazards Table */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#30363D] pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold">⚠</span>
              <span className="font-bold text-xs text-white">Recent Hazards</span>
            </div>
            <span
              onClick={() => onNavigateTab('Hazards')}
              className="text-[10px] text-blue-400 font-semibold cursor-pointer hover:underline"
            >
              View All
            </span>
          </div>

          <div className="overflow-x-auto">
            {hazards.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">No active hazards registered</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-[#30363D] text-[10px] uppercase">
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Location</th>
                    <th className="pb-2 font-semibold">Severity</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]">
                  {hazards.slice(0, 4).map((h) => (
                    <tr key={h.hazardId} className="hover:bg-[#21262D]">
                      <td className="py-2 font-medium text-slate-200">{h.type}</td>
                      <td className="py-2 text-slate-400 truncate max-w-[110px]">{h.locationName}</td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          h.severity === 'CRITICAL' || h.severity === 'BLOCKED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {h.severity}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`text-[10px] font-semibold ${h.status === 'ACTIVE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="py-2 text-slate-400 font-mono text-[10px]">{h.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bottom 2: Recent Route Events */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#30363D] pb-2 mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span className="font-bold text-xs text-white">Recent Route Events</span>
            </div>
            <span
              onClick={() => onNavigateTab('Route Events')}
              className="text-[10px] text-blue-400 font-semibold cursor-pointer hover:underline"
            >
              View All
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
            {routeEvents.slice(0, 5).map((ev) => (
              <div key={ev.id} className="p-2 rounded-xl bg-[#21262D] border border-[#30363D] flex items-center justify-between text-xs">
                <div className="flex items-start gap-2 truncate">
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">{ev.time}</span>
                  <div className="truncate">
                    <div className="font-medium text-slate-200 text-[11px] truncate">{ev.event}</div>
                    <div className="text-[10px] text-slate-400">Driver: {ev.driver}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ml-2 ${
                  ev.status === 'Success'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : ev.status === 'Triggered'
                    ? 'bg-red-500/20 text-red-400'
                    : ev.status === 'In Progress'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom 3: System Status */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#30363D] pb-2 mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span className="font-bold text-xs text-white">System Status</span>
            </div>
            <span
              onClick={() => onNavigateTab('System Logs')}
              className="text-[10px] text-blue-400 font-semibold cursor-pointer hover:underline"
            >
              View All
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {[
              { name: 'OSRM Routing Service', status: systemHealth.routingService },
              { name: 'OpenStreetMap Tiles', status: systemHealth.mapService },
              { name: 'Database & Sync', status: systemHealth.database },
              { name: 'Real-time Sync', status: systemHealth.realtimeSync },
              { name: 'Sensor Network', status: `${onlineSensorsCount} / ${sensorNodes.length} Online` },
              { name: 'API Server', status: systemHealth.apiServer },
            ].map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#21262D]">
                <span className="text-slate-300 text-[11px]">{s.name}</span>
                <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
