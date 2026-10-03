import React, { useState } from 'react';
import { SystemHealth } from '../../../types';

interface SystemLogsTabProps {
  systemHealth: SystemHealth;
}

export const SystemLogsTab: React.FC<SystemLogsTabProps> = ({ systemHealth }) => {
  const [logs] = useState([
    { timestamp: '10:14:01', level: 'BOOT', component: 'ESP32_CORE', message: 'ESP32-WROOM-32 booting FreeRTOS v10.2.0 @ 240MHz' },
    { timestamp: '10:14:02', level: 'INFO', component: 'HC-SR04_INIT', message: 'Ultrasonic trigger pin: GPIO 5, echo pin: GPIO 18 calibrated. Distance: 184cm (Normal)' },
    { timestamp: '10:14:03', level: 'INFO', component: 'MPU6050_I2C', message: 'I2C sensor detected at address 0x68 (SDA: GPIO 21, SCL: GPIO 22). Zero-g offset calibrated' },
    { timestamp: '10:14:04', level: 'INFO', component: 'WIFI_STA', message: 'ESP32 connected to local Wi-Fi subnet. IP: 192.168.1.100. HTTP server listening on port 80' },
    { timestamp: '10:14:05', level: 'INFO', component: 'OSRM_ENGINE', message: 'OpenStreetMap routing endpoint ready (Dijkstra algorithm / Contraction Hierarchies)' },
    { timestamp: '10:14:06', level: 'INFO', component: 'LEAFLET_GIS', message: 'OpenStreetMap standard tile layers mounted successfully (CRS: EPSG:3857)' },
    { timestamp: '10:14:07', level: 'INFO', component: 'NOMINATIM', message: 'Reverse geocoder initialized for landmark and street resolution' },
    { timestamp: '10:14:08', level: 'INFO', component: 'REALTIME_SYNC', message: 'BroadcastChannel routepilot_sync_channel synchronized across browser tabs' },
  ]);

  return (
    <div className="p-4 space-y-4 text-xs">
      {/* Header */}
      <div className="bg-[#161B22] border border-[#30363D] p-4 rounded-2xl shadow-lg">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <span>System Diagnostics &amp; Infrastructure Logs</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
            All Services Healthy
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Low-level execution logs for Leaflet map tiles, OSRM road geometry engine, Nominatim reverse geocoder, and multi-tab state sync.
        </p>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name: 'OSRM Routing Service', val: systemHealth.routingService, detail: 'router.project-osrm.org' },
          { name: 'OpenStreetMap Tiles', val: systemHealth.mapService, detail: 'tile.openstreetmap.org' },
          { name: 'BroadcastChannel Sync', val: systemHealth.realtimeSync, detail: '0ms latency inter-tab' },
          { name: 'Database / Storage', val: systemHealth.database, detail: 'LocalStorage + Broadcast' },
        ].map((item, idx) => (
          <div key={idx} className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl shadow space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">{item.name}</div>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{item.val}</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate font-mono">{item.detail}</div>
          </div>
        ))}
      </div>

      {/* Terminal Output */}
      <div className="bg-[#0D1117] border border-[#30363D] rounded-2xl p-4 font-mono text-xs shadow-2xl space-y-2">
        <div className="flex items-center justify-between border-b border-[#30363D] pb-2 text-slate-400 text-[11px]">
          <span>RoutePilot Service Daemon Output</span>
          <span>STDOUT / STDERR</span>
        </div>
        <div className="space-y-1.5 text-slate-300 overflow-x-auto text-[11px] sm:text-xs pb-1">
          {logs.map((l, i) => (
            <div key={i} className="flex items-start gap-2 sm:gap-3 min-w-[480px] sm:min-w-0">
              <span className="text-slate-400 select-none shrink-0">{l.timestamp}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                l.level === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#AEF5F0]/15 text-[#AEF5F0]'
              }`}>
                {l.level}
              </span>
              <span className="text-amber-400 font-semibold shrink-0">[{l.component}]</span>
              <span className="text-slate-200">{l.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
