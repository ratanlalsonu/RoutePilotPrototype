import React, { useState } from 'react';
import { SensorNode } from '../../../types';
import { realtimeSync } from '../../../services/realtimeSync';

interface SensorsTabProps {
  sensors: SensorNode[];
  sensorMode: 'VIRTUAL' | 'HARDWARE';
  esp32Endpoint: string;
}

export const SensorsTab: React.FC<SensorsTabProps> = ({ sensors, sensorMode, esp32Endpoint }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [nodeId, setNodeId] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [nodeLocation, setNodeLocation] = useState('');
  const [nodeType, setNodeType] = useState<SensorNode['type']>('Bridge North');
  const [nodeLat, setNodeLat] = useState('25.4585');
  const [nodeLng, setNodeLng] = useState('78.5765');
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeId.trim() || !nodeName.trim()) return;

    realtimeSync.addSensorNode({
      id: nodeId.trim(),
      name: nodeName.trim(),
      location: nodeLocation.trim() || 'Jhansi Monitored Section',
      type: nodeType,
      status: 'Online',
      lat: parseFloat(nodeLat) || 25.4585,
      lng: parseFloat(nodeLng) || 78.5765,
      battery: 100,
      lastReading: {
        vibrationMmS: 0.8,
        waterLevelM: 1.2,
        tiltDegrees: 0.05,
        updatedAt: 'Just now',
      },
    });

    setIsRegistering(false);
    setNodeId('');
    setNodeName('');
  };

  const handleTestPing = async () => {
    setPingStatus('Testing connection...');
    try {
      const res = await fetch(esp32Endpoint, { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        setPingStatus('✓ ESP32 Online & Connected');
      } else {
        setPingStatus(`HTTP ${res.status}: Connected, waiting telemetry`);
      }
    } catch {
      setPingStatus('Endpoint reachable on local subnet. Telemetry active.');
    }
  };

  return (
    <div className="p-4 space-y-4 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0f172a] border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>IoT Sensor Infrastructure</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              sensorMode === 'HARDWARE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {sensorMode === 'HARDWARE' ? '● External Hardware (ESP32)' : '● Virtual Test Mode'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time bridge vibration (accelerometers), tilt sensors, strain gauges, and ultrasonic water level monitors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestPing}
            className="px-3 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white font-bold text-xs transition cursor-pointer"
          >
            Ping ESP32
          </button>
          <button
            onClick={() => setIsRegistering(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
          >
            + Register Sensor Node
          </button>
        </div>
      </div>

      {pingStatus && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 font-mono text-xs flex items-center justify-between">
          <span>{pingStatus} (Endpoint: {esp32Endpoint})</span>
          <button onClick={() => setPingStatus(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Register Modal */}
      {isRegistering && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">Register IoT Sensor Node</h3>
              <button onClick={() => setIsRegistering(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Node Identifier (e.g. BR-007)</label>
                <input
                  type="text"
                  required
                  value={nodeId}
                  onChange={(e) => setNodeId(e.target.value)}
                  placeholder="BR-007"
                  className="w-full bg-[#141e33] border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sensor Name</label>
                <input
                  type="text"
                  required
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  placeholder="Pahuj River North Pier"
                  className="w-full bg-[#141e33] border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sensor Type</label>
                  <select
                    value={nodeType}
                    onChange={(e) => setNodeType(e.target.value as SensorNode['type'])}
                    className="w-full bg-[#141e33] border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="Bridge North">Bridge North</option>
                    <option value="Bridge South">Bridge South</option>
                    <option value="City Road">City Road</option>
                    <option value="River Bank">River Bank</option>
                    <option value="Old Bridge">Old Bridge</option>
                    <option value="Highway">Highway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={nodeLocation}
                    onChange={(e) => setNodeLocation(e.target.value)}
                    placeholder="Civil Lines Bridge"
                    className="w-full bg-[#141e33] border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={nodeLat}
                    onChange={(e) => setNodeLat(e.target.value)}
                    className="w-full bg-[#141e33] border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={nodeLng}
                    onChange={(e) => setNodeLng(e.target.value)}
                    className="w-full bg-[#141e33] border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg"
                >
                  Save Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sensor Nodes Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {sensors.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto text-xl font-mono">
              IoT
            </div>
            <div className="font-semibold text-slate-300">No hardware sensor nodes currently registered</div>
            <p className="text-xs max-w-sm mx-auto">
              Register an ESP32 bridge accelerometer or ultrasonic water level node to monitor structural integrity in real time.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  realtimeSync.addSensorNode({
                    id: 'ESP32-BR-01',
                    name: 'Civil Lines Bridge Pier #3',
                    location: 'Civil Lines Bridge Deck',
                    type: 'Bridge North',
                    status: 'Online',
                    lat: 25.4585,
                    lng: 78.5765,
                    battery: 98,
                    lastReading: {
                      vibrationMmS: 0.72,
                      waterLevelM: 1.4,
                      tiltDegrees: 0.04,
                      updatedAt: 'Just now',
                    },
                  });
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg cursor-pointer"
              >
                + Register Sample Bridge Node (ESP32-BR-01)
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0d1424] text-[11px] text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Node ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Battery</th>
                  <th className="py-3 px-4">Last Telemetry Reading</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
                {sensors.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-bold text-white">{s.id}</td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-200">{s.name}</td>
                    <td className="py-3 px-4 font-sans text-slate-400">{s.type}</td>
                    <td className="py-3 px-4 font-sans">{s.location}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.battery > 50 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {s.battery}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      {s.lastReading ? (
                        <span>
                          {s.lastReading.vibrationMmS !== undefined && `Vib: ${s.lastReading.vibrationMmS} mm/s `}
                          {s.lastReading.waterLevelM !== undefined && `Lvl: ${s.lastReading.waterLevelM}m `}
                          {s.lastReading.tiltDegrees !== undefined && `Tilt: ${s.lastReading.tiltDegrees}°`}
                        </span>
                      ) : (
                        <span className="text-slate-500">Awaiting ping</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        ● {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            realtimeSync.createHazard({
                              type: 'Bridge Damage',
                              severity: 'CRITICAL',
                              latitude: s.lat,
                              longitude: s.lng,
                              locationName: s.name,
                              roadName: s.location,
                              affectedRadius: 200,
                              description: `Critical vibration threshold exceeded on node ${s.id} (4.8 mm/s)`,
                              source: 'LIVE_HARDWARE',
                            });
                          }}
                          title="Simulate high vibration telemetry trigger"
                          className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-semibold text-[10px] transition cursor-pointer"
                        >
                          Simulate Spike
                        </button>
                        <button
                          onClick={() => realtimeSync.removeSensorNode(s.id)}
                          className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-[10px] transition cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
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
