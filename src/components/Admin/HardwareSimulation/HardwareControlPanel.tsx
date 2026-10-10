import React, { useState } from 'react';
import { HardwareSimState, hardwareSimEngine } from '../../../services/hardwareSimulationEngine';
import { PIN_MAPPINGS } from '../../../services/circuitPinMapping';
import { HardwareComponentId } from '../../../types/hardwareSimulation';

interface HardwareControlPanelProps {
  simState: HardwareSimState;
  activeDrawer: 'CONTROLS' | 'THRESHOLDS' | 'LOGS' | 'PINS' | null;
  onCloseDrawer: () => void;
  selectedComponent: HardwareComponentId | null;
  onSelectComponent: (comp: HardwareComponentId | null) => void;
}

export const HardwareControlPanel: React.FC<HardwareControlPanelProps> = ({
  simState,
  activeDrawer,
  onCloseDrawer,
  selectedComponent,
  onSelectComponent,
}) => {
  const { sensorValues, thresholds, logs, mode } = simState;

  // Local state for thresholds form
  const [vibeThreshold, setVibeThreshold] = useState(thresholds.vibrationMmS);
  const [tiltThreshold, setTiltThreshold] = useState(thresholds.tiltAngleDeg);
  const [waterThreshold, setWaterThreshold] = useState(thresholds.waterLevelM);
  const [strainThreshold, setStrainThreshold] = useState(thresholds.strainMicrostrain);

  if (!activeDrawer && !selectedComponent) return null;

  return (
    <div className="absolute right-4 top-14 bottom-4 w-96 max-w-[90vw] bg-[#161B22]/95 border border-[#30363D] rounded-2xl shadow-2xl backdrop-blur-md flex flex-col z-40 overflow-hidden text-xs animate-slideInRight">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#30363D] flex items-center justify-between bg-[#21262D]/60 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#AEF5F0]"></span>
          <h3 className="font-bold text-white text-sm">
            {selectedComponent
              ? `Component: ${selectedComponent.toUpperCase()}`
              : activeDrawer === 'CONTROLS'
              ? 'Sensor Telemetry Controls'
              : activeDrawer === 'THRESHOLDS'
              ? 'Hazard Threshold Config'
              : activeDrawer === 'LOGS'
              ? 'Hardware Event Logs'
              : 'Pin Mappings & Wiring'}
          </h3>
        </div>
        <button
          onClick={() => {
            onCloseDrawer();
            onSelectComponent(null);
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#30363D] transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* COMPONENT SPECIFIC INSPECTOR */}
        {selectedComponent && (
          <div className="space-y-4">
            <div className="p-3 bg-[#0D1117] border border-[#30363D] rounded-xl space-y-2">
              <div className="font-bold text-white flex items-center justify-between">
                <span>{selectedComponent.toUpperCase()} Inspection</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#21262D] text-[#AEF5F0]">
                  {mode === 'VIRTUAL' ? 'Virtual Node' : 'External ESP32'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {selectedComponent === 'esp32' && 'Central MCU running FreeRTOS, reading ADC/I2C/SPI sensors and dispatching telemetry frames over LoRa.'}
                {selectedComponent === 'mpu6050' && 'Triple-axis MEMS accelerometer & angular rate sensor monitoring bridge pier structural vibration.'}
                {selectedComponent === 'tilt' && 'SW-520D rolling ball tilt sensor detecting angular deflection and pier settlement.'}
                {selectedComponent === 'hx711' && 'Precision 24-bit analog-to-digital converter paired with structural strain gauge beam.'}
                {selectedComponent === 'hcsr04' && 'Ultrasonic transceiver measuring bridge river clearance and underpass flood inundation.'}
                {selectedComponent === 'water_level' && 'Parallel conductive trace immersion probe providing high-resolution flood depth sensing.'}
                {selectedComponent === 'gps' && 'u-blox NEO-6M GNSS module pinpointing geographical coordinates of the bridge structure.'}
                {selectedComponent === 'lora' && 'Semtech SX1278 transceiver broadcasting 433MHz telemetry packets over 5km+ to Gateway.'}
                {selectedComponent === 'battery_regulator' && '18650 Li-Ion energy pack coupled with high-efficiency buck step-down regulator.'}
                {selectedComponent === 'gateway' && 'Elevated receiver station collecting radio frames and piping telemetry to server.'}
                {selectedComponent === 'backend' && 'RoutePilot analytics engine assessing safety thresholds and issuing automated diversions.'}
              </p>
            </div>

            {/* Component Pins */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-200 text-xs">Pin Connections</h4>
              <div className="space-y-1 font-mono text-[11px]">
                {PIN_MAPPINGS.filter((p) => p.component === selectedComponent).map((p, idx) => (
                  <div key={`${p.component}-${p.pin}-${idx}`} className="p-2 bg-[#0D1117] border border-[#30363D] rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[#AEF5F0] font-bold">{p.pin}</span>
                      <span className="text-slate-400 text-[10px] ml-2">({p.signalType})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-semibold">ESP32 {p.esp32Pin || 'N/A'}</span>
                      <span className="text-slate-400 text-[10px] ml-1">[{p.voltage}]</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SENSOR TELEMETRY CONTROLS & SLIDERS */}
        {(activeDrawer === 'CONTROLS' || !selectedComponent) && (
          <div className="space-y-4">
            {mode === 'HARDWARE' ? (
              <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 space-y-2">
                <div className="font-bold">External Hardware Mode Active</div>
                <p className="text-[11px] text-slate-300">
                  Virtual sliders are locked. Telemetry is read strictly from connected physical ESP32 endpoints.
                </p>
              </div>
            ) : (
              <>
                {/* 1. MPU6050 Controls */}
                <div className="p-3 bg-[#0D1117] border border-[#30363D] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-400">1. MPU6050 (Vibration)</span>
                    <button
                      onClick={() => hardwareSimEngine.toggleSensorEnabled('mpu6050')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        sensorValues.mpu6050.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {sensorValues.mpu6050.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-300 text-[11px] mb-1">
                      <span>Vibration: {sensorValues.mpu6050.vibrationMmS.toFixed(2)} mm/s</span>
                      <span className="text-slate-500">Threshold: {thresholds.vibrationMmS} mm/s</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="4.5"
                      step="0.05"
                      disabled={!sensorValues.mpu6050.enabled}
                      value={sensorValues.mpu6050.vibrationMmS}
                      onChange={(e) => hardwareSimEngine.updateSensorValue('mpu6050', { vibrationMmS: parseFloat(e.target.value) })}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. SW-520D Tilt Controls */}
                <div className="p-3 bg-[#0D1117] border border-[#30363D] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-400">2. SW-520D (Tilt Incline)</span>
                    <button
                      onClick={() => hardwareSimEngine.toggleSensorEnabled('tilt')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        sensorValues.tilt.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {sensorValues.tilt.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-300 text-[11px] mb-1">
                      <span>Angle: {sensorValues.tilt.angleDeg.toFixed(1)}°</span>
                      <span className="text-slate-500">Trigger: &gt; {thresholds.tiltAngleDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="5.0"
                      step="0.1"
                      disabled={!sensorValues.tilt.enabled}
                      value={sensorValues.tilt.angleDeg}
                      onChange={(e) => hardwareSimEngine.updateSensorValue('tilt', { angleDeg: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 3. Load Cell + HX711 Controls */}
                <div className="p-3 bg-[#0D1117] border border-[#30363D] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-green-400">3. HX711 (Strain Gauge)</span>
                    <button
                      onClick={() => hardwareSimEngine.toggleSensorEnabled('hx711')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        sensorValues.hx711.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {sensorValues.hx711.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-300 text-[11px] mb-1">
                      <span>Strain: {sensorValues.hx711.strainMicrostrain} µε ({sensorValues.hx711.loadWeightKn.toFixed(1)} kN)</span>
                      <span className="text-slate-500">Limit: {thresholds.strainMicrostrain} µε</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="950"
                      step="25"
                      disabled={!sensorValues.hx711.enabled}
                      value={sensorValues.hx711.strainMicrostrain}
                      onChange={(e) => {
                        const sVal = parseInt(e.target.value);
                        hardwareSimEngine.updateSensorValue('hx711', {
                          strainMicrostrain: sVal,
                          loadWeightKn: +(sVal * 0.125).toFixed(1),
                        });
                      }}
                      className="w-full accent-green-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 4. HC-SR04 Ultrasonic Controls */}
                <div className="p-3 bg-[#0D1117] border border-[#30363D] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-yellow-400">4. HC-SR04 (Ultrasonic Flood)</span>
                    <button
                      onClick={() => hardwareSimEngine.toggleSensorEnabled('hcsr04')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        sensorValues.hcsr04.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {sensorValues.hcsr04.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-300 text-[11px] mb-1">
                      <span>Flood Rise: +{sensorValues.hcsr04.waterRiseCm.toFixed(0)} cm</span>
                      <span className="text-slate-500">Limit: {(thresholds.waterLevelM * 100).toFixed(0)} cm</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="1"
                      disabled={!sensorValues.hcsr04.enabled}
                      value={sensorValues.hcsr04.waterRiseCm}
                      onChange={(e) => {
                        const rise = parseFloat(e.target.value);
                        hardwareSimEngine.updateSensorValue('hcsr04', {
                          waterRiseCm: rise,
                          distanceCm: Math.max(10, 200 - rise),
                        });
                      }}
                      className="w-full accent-yellow-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-300 text-[11px] mb-1">
                      <span>Pier Displacement: {(sensorValues.hcsr04.displacementMm ?? 1.2).toFixed(1)} mm</span>
                      <span className="text-slate-500">Limit: {thresholds.displacementMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="0.5"
                      disabled={!sensorValues.hcsr04.enabled}
                      value={sensorValues.hcsr04.displacementMm ?? 1.2}
                      onChange={(e) => {
                        const disp = parseFloat(e.target.value);
                        hardwareSimEngine.updateSensorValue('hcsr04', {
                          displacementMm: disp,
                        });
                      }}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 5. Water Level Sensor Controls */}
                <div className="p-3 bg-[#0D1117] border border-[#30363D] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-400">5. Water Level (Trace Depth)</span>
                    <button
                      onClick={() => hardwareSimEngine.toggleSensorEnabled('waterLevel')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        sensorValues.waterLevel.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {sensorValues.waterLevel.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-300 text-[11px] mb-1">
                      <span>Immersion: {sensorValues.waterLevel.immersionPercent}% ({sensorValues.waterLevel.depthMm.toFixed(1)} mm)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      disabled={!sensorValues.waterLevel.enabled}
                      value={sensorValues.waterLevel.immersionPercent}
                      onChange={(e) => {
                        const pct = parseInt(e.target.value);
                        hardwareSimEngine.updateSensorValue('waterLevel', {
                          immersionPercent: pct,
                          depthMm: +(pct * 0.4).toFixed(1),
                        });
                      }}
                      className="w-full accent-red-500 cursor-pointer"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* THRESHOLDS CONFIG */}
        {activeDrawer === 'THRESHOLDS' && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-400">
              Configure trigger thresholds. When a sensor breaches these values, a live RoutePilot hazard is generated and traffic is diverted.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">MPU6050 Vibration Limit (mm/s)</label>
                <input
                  type="number"
                  step="0.1"
                  value={vibeThreshold}
                  onChange={(e) => setVibeThreshold(parseFloat(e.target.value) || 1.8)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tilt Angle Limit (Degrees)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tiltThreshold}
                  onChange={(e) => setTiltThreshold(parseFloat(e.target.value) || 1.5)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Flood Water Level Limit (Meters)</label>
                <input
                  type="number"
                  step="0.05"
                  value={waterThreshold}
                  onChange={(e) => setWaterThreshold(parseFloat(e.target.value) || 0.30)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">HX711 Strain Limit (Microstrain µε)</label>
                <input
                  type="number"
                  step="50"
                  value={strainThreshold}
                  onChange={(e) => setStrainThreshold(parseInt(e.target.value) || 600)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <button
                onClick={() => {
                  hardwareSimEngine.updateThresholds({
                    vibrationMmS: vibeThreshold,
                    tiltAngleDeg: tiltThreshold,
                    waterLevelM: waterThreshold,
                    strainMicrostrain: strainThreshold,
                  });
                  onCloseDrawer();
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition cursor-pointer"
              >
                Save Thresholds
              </button>
            </div>
          </div>
        )}

        {/* LOGS DRAWER */}
        {activeDrawer === 'LOGS' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-[#30363D]">
              <span>Hardware Telemetry Stream</span>
              <span>{logs.length} entries</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              {logs.map((l) => (
                <div key={l.id} className="p-2 bg-[#0D1117] border border-[#21262D] rounded-lg">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span>{l.timestamp}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      l.level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                      l.level === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                      l.level === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-slate-700/40 text-slate-300'
                    }`}>
                      [{l.module}]
                    </span>
                  </div>
                  <p className="text-slate-300">{l.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PIN MAPPINGS LIST */}
        {activeDrawer === 'PINS' && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400">
              Verified collision-free GPIO allocation for ESP32 DevKit V1:
            </p>
            <div className="space-y-1.5 font-mono text-[11px]">
              {PIN_MAPPINGS.map((p, idx) => (
                <div key={idx} className="p-2 bg-[#0D1117] border border-[#30363D] rounded-lg">
                  <div className="flex justify-between items-center text-white font-bold">
                    <span>{p.component.toUpperCase()} • {p.pin}</span>
                    <span className="text-[#AEF5F0]">ESP32 {p.esp32Pin}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>{p.signalType} ({p.voltage})</span>
                    <span>{p.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
