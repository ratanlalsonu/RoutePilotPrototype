import React from 'react';
import { Journey, VehicleType } from '../../../types';
import { realtimeSync } from '../../../services/realtimeSync';

interface ActiveDriversTabProps {
  journey: Journey;
}

export const ActiveDriversTab: React.FC<ActiveDriversTabProps> = ({ journey }) => {
  return (
    <div className="p-4 space-y-4 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0f172a] border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>Fleet &amp; Driver Telemetry Management</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              journey.status === 'ON_ROUTE'
                ? 'bg-blue-500/20 text-blue-400'
                : journey.status === 'DIVERTED'
                ? 'bg-purple-500/20 text-purple-400'
                : journey.status === 'ARRIVED'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-700/50 text-slate-400'
            }`}>
              ● {journey.status === 'IDLE' ? 'Standby (Awaiting Destination)' : journey.status}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time coordinates, heading, speed, vehicle profile, and dynamic reroute history for connected navigation clients.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {journey.isNavigating && (
            <button
              onClick={() => realtimeSync.advanceVehicle(1)}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg cursor-pointer"
            >
              Step Forward (Demo GPS) →
            </button>
          )}
        </div>
      </div>

      {/* Driver Detail Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            </div>
            <div>
              <div className="text-base font-bold text-white">{journey.driverName}</div>
              <div className="text-slate-400 font-mono text-[11px]">ID: {journey.driverId}</div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Vehicle Type:</span>
              <span className="font-semibold text-white capitalize">{journey.vehicleType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Journey Status:</span>
              <span className="font-mono text-emerald-400 font-bold">{journey.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Diversion State:</span>
              <span className="font-mono text-purple-300">{journey.diversionState}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reroute Count:</span>
              <span className="font-mono text-cyan-400 font-bold">{journey.diversionCount}</span>
            </div>
          </div>

          {/* Vehicle Switcher */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1.5">Change Vehicle Profile</label>
            <div className="grid grid-cols-5 gap-1">
              {(['car', 'bike', 'van', 'bus', 'truck'] as VehicleType[]).map((v) => (
                <button
                  key={v}
                  onClick={() => realtimeSync.setVehicleType(v)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition capitalize cursor-pointer ${
                    journey.vehicleType === v
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#141e33] text-slate-400 hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Route & Telemetry Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 md:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold text-white text-sm">Active Navigation Corridor</h3>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Speed:</span>
              <span className="font-mono text-emerald-400 text-sm font-extrabold">{journey.currentSpeedKmh} km/h</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
            <div className="bg-[#141e33] p-3 rounded-xl border border-slate-700/60 space-y-1">
              <div className="text-[10px] text-slate-400">Current Position</div>
              <div className="font-mono text-white text-xs">
                Lat: {journey.currentLocation.lat.toFixed(5)}, Lng: {journey.currentLocation.lng.toFixed(5)}
              </div>
              <div className="text-[10px] text-slate-400 pt-1">
                Heading: {journey.currentLocation.heading}° | Polyline Waypoint: #{journey.currentLocation.pointIndex}
              </div>
            </div>

            <div className="bg-[#141e33] p-3 rounded-xl border border-slate-700/60 space-y-1">
              <div className="text-[10px] text-slate-400">Active Destination</div>
              <div className="font-bold text-blue-300 text-xs truncate">
                {journey.destination?.name || 'Awaiting Selection by Driver'}
              </div>
              <div className="text-[10px] text-slate-400 pt-1">
                {journey.activeRoute ? `Route: ${journey.activeRoute.name}` : 'Route polyline not calculated'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div className="bg-[#141e33] p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Remaining Dist</div>
              <div className="text-base font-extrabold font-mono text-white">
                {journey.activeRoute ? `${journey.remainingDistanceKm} km` : '--'}
              </div>
            </div>
            <div className="bg-[#141e33] p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Est. Duration</div>
              <div className="text-base font-extrabold font-mono text-white">
                {journey.activeRoute ? `${journey.remainingDurationMinutes} min` : '--'}
              </div>
            </div>
            <div className="bg-[#141e33] p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Est. Arrival</div>
              <div className="text-base font-extrabold font-mono text-emerald-400">
                {journey.activeRoute ? journey.eta : '--:--'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
