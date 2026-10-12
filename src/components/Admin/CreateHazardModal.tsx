import React, { useState, useEffect, useRef } from 'react';
import { HazardType, HazardSeverity, HazardSource } from '../../types';
import { reverseGeocode, searchPlaces } from '../../services/geocodingService';
import { hardwareSimEngine, HardwareSimState } from '../../services/hardwareSimulationEngine';

interface CreateHazardModalProps {
  lat: number;
  lng: number;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: HazardType;
    severity: HazardSeverity;
    latitude: number;
    longitude: number;
    locationName: string;
    roadName: string;
    affectedRadius: number;
    description: string;
    source: HazardSource;
  }) => void;
  onPickOnMap?: () => void;
  onNavigateToSensors?: () => void;
  initialHazardType?: HazardType;
  hazardCategory?: 'ROAD' | 'BRIDGE';
}

export const CreateHazardModal: React.FC<CreateHazardModalProps> = ({
  lat,
  lng,
  isOpen,
  onClose,
  onSubmit,
  onPickOnMap,
  onNavigateToSensors,
  initialHazardType,
  hazardCategory,
}) => {
  const [category, setCategory] = useState<'ROAD' | 'BRIDGE'>(() => {
    if (hazardCategory) return hazardCategory;
    if (initialHazardType === 'Road Construction') return 'ROAD';
    return 'ROAD';
  });
  const [currentLat, setCurrentLat] = useState<number>(lat || 25.4585);
  const [currentLng, setCurrentLng] = useState<number>(lng || 78.5765);
  const [type, setType] = useState<HazardType>(() => {
    if (hazardCategory === 'ROAD' || initialHazardType === 'Road Construction') {
      return 'Road Construction';
    }
    const currentHazard = hardwareSimEngine.getSimulationHazardData();
    return currentHazard.isHazard ? currentHazard.type : 'Bridge Damage';
  });
  const [severity, setSeverity] = useState<HazardSeverity>('CRITICAL');
  const [locationName, setLocationName] = useState('');
  const [roadName, setRoadName] = useState('');
  const [affectedRadius, setAffectedRadius] = useState<number>(180);
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<HazardSource>('ADMIN');
  const [isLoadingGeocode, setIsLoadingGeocode] = useState(false);
  const [simState, setSimState] = useState<HardwareSimState>(hardwareSimEngine.getState());
  const [autoFilledFromSim, setAutoFilledFromSim] = useState(false);
  const [anomalyToast, setAnomalyToast] = useState<string | null>(null);

  // Quick place search inside modal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const searchDebounceRef = useRef<any>(null);

  const getBridgeHazardInfo = (hType: HazardType) => {
    switch (hType) {
      case 'High Water Level':
        return {
          englishName: 'High Water Level',
          hindiName: 'जल भराव / बाढ़',
          icon: '🌊',
          sensorName: 'HC-SR04 Ultrasonic Telemetry • Water Level Rise Warning',
          borderClass: 'border-blue-500/70 bg-gradient-to-r from-blue-950/80 via-blue-900/60 to-blue-950/80',
          badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          badgeText: 'WATER LEVEL',
        };
      case 'Structural Vibration':
        return {
          englishName: 'Structural Vibration',
          hindiName: 'पुल कंपन / दोलन',
          icon: '💥',
          sensorName: 'MPU-6050 Accelerometer • High Pier Oscillation Warning',
          borderClass: 'border-red-500/70 bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80',
          badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
          badgeText: 'VIBRATION',
        };
      case 'Excessive Tilt':
        return {
          englishName: 'Excessive Tilt',
          hindiName: 'पुल झुकाव',
          icon: '📐',
          sensorName: 'SW-520D Tilt Sensor • Deck Inclination Anomaly',
          borderClass: 'border-amber-500/70 bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-amber-950/80',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          badgeText: 'DECK TILT',
        };
      case 'Excessive Strain':
        return {
          englishName: 'Excessive Strain',
          hindiName: 'अत्यधिक तनाव / भार',
          icon: '⚖',
          sensorName: 'HX-711 24-bit ADC Load Cell • Structural Overload',
          borderClass: 'border-purple-500/70 bg-gradient-to-r from-purple-950/80 via-purple-900/60 to-purple-950/80',
          badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          badgeText: 'OVERLOAD',
        };
      case 'Excessive Displacement':
        return {
          englishName: 'Excessive Displacement',
          hindiName: 'संरचनात्मक विस्थापन',
          icon: '📏',
          sensorName: 'Displacement Sensor • Structural Joint Shift Warning',
          borderClass: 'border-rose-500/70 bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-rose-950/80',
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          badgeText: 'DISPLACEMENT',
        };
      case 'Bridge Damage':
      default:
        return {
          englishName: 'Bridge Damage',
          hindiName: 'संरचनात्मक क्षति',
          icon: '🌉',
          sensorName: 'ESP32 Compound Multi-Sensor Alert • Bridge Span Alert',
          borderClass: 'border-red-500/70 bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80',
          badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
          badgeText: 'STRUCTURAL',
        };
    }
  };

  const handleSwitchToRoad = () => {
    setCategory('ROAD');
    setType('Road Construction');
    setSeverity('WARNING');
    setAffectedRadius(200);
    setDescription('IoT Road Construction Beacon (ESP32 + SIM7600 + NEO-6M): Active road work zone and traffic diversion ahead.');
    setSource('LIVE_HARDWARE');
    setAutoFilledFromSim(true);
  };

  const handleSwitchToBridge = () => {
    setCategory('BRIDGE');
    const hazardData = hardwareSimEngine.getSimulationHazardData();
    if (hazardData.isHazard) {
      setType(hazardData.type);
      setSeverity(hazardData.severity);
      setAffectedRadius(hazardData.affectedRadius);
      setDescription(hazardData.description);
      setAutoFilledFromSim(true);
    } else {
      setType('Bridge Damage');
      setSeverity('CRITICAL');
      setAffectedRadius(180);
      setDescription('ESP32 IoT Bridge Sensor Telemetry: Structural Bridge Damage alert on span.');
      setAutoFilledFromSim(false);
    }
    setSource('LIVE_HARDWARE');
  };

  const fillFromSimulation = () => {
    const hazardData = hardwareSimEngine.getSimulationHazardData();
    if (hazardData.isHazard) {
      setCategory('BRIDGE');
      setType(hazardData.type);
      setSeverity(hazardData.severity);
      setAffectedRadius(hazardData.affectedRadius);
      setDescription(hazardData.description);
      setSource('LIVE_HARDWARE');
      setAutoFilledFromSim(true);
    } else {
      setAutoFilledFromSim(false);
    }
  };

  const handleInjectAnomaly = (preset: 'FLOOD_ALERT' | 'VIBRATION_SPIKE' | 'PIER_TILT' | 'STRUCTURAL_STRAIN' | 'DISPLACEMENT_ANOMALY') => {
    hardwareSimEngine.applyPreset(preset);
    const updatedData = hardwareSimEngine.getSimulationHazardData();
    setCategory('BRIDGE');
    setType(updatedData.type);
    setSeverity(updatedData.severity);
    setAffectedRadius(updatedData.affectedRadius);
    setDescription(updatedData.description);
    setSource('LIVE_HARDWARE');
    setAutoFilledFromSim(true);
    setAnomalyToast(`Injected ${updatedData.type} (${updatedData.severity}) into simulation & auto-filled!`);
    setTimeout(() => setAnomalyToast(null), 3000);
  };

  const handleResetSimToSafe = () => {
    hardwareSimEngine.applyPreset('SAFE');
    setAutoFilledFromSim(false);
    setType('Bridge Damage');
    setSeverity('WARNING');
    setSource('ADMIN');
    setDescription('Manual inspection report. Sensor hardware reset to safe baseline.');
    setAnomalyToast('Simulation reset to normal safe baseline.');
    setTimeout(() => setAnomalyToast(null), 3000);
  };

  // Subscribe to hardware simulation engine updates
  useEffect(() => {
    const unsub = hardwareSimEngine.subscribe((newSim) => {
      setSimState({ ...newSim });
      if (category === 'BRIDGE' && newSim.overallStatus !== 'SAFE') {
        const hazardData = hardwareSimEngine.getSimulationHazardData();
        if (hazardData.isHazard) {
          setType(hazardData.type);
          setSeverity(hazardData.severity);
          setAffectedRadius(hazardData.affectedRadius);
          setDescription(hazardData.description);
          setSource('LIVE_HARDWARE');
          setAutoFilledFromSim(true);
        }
      }
    });
    return () => unsub();
  }, [category]);

  // Sync coords and auto-fill when opened
  useEffect(() => {
    if (isOpen) {
      const activeCat: 'ROAD' | 'BRIDGE' = hazardCategory || (initialHazardType === 'Road Construction' ? 'ROAD' : 'BRIDGE');
      setCategory(activeCat);

      const targetLat = lat || 25.4585;
      const targetLng = lng || 78.5765;
      setCurrentLat(targetLat);
      setCurrentLng(targetLng);

      setIsLoadingGeocode(true);
      reverseGeocode(targetLat, targetLng)
        .then((res) => {
          if (res?.locationName) setLocationName(res.locationName);
          if (res?.roadName) setRoadName(res.roadName);
        })
        .finally(() => setIsLoadingGeocode(false));

      if (activeCat === 'ROAD') {
        setType('Road Construction');
        setSeverity('WARNING');
        setAffectedRadius(200);
        setDescription('IoT Road Construction Beacon (ESP32 + SIM7600 + NEO-6M): Active road work zone and traffic diversion ahead.');
        setSource('LIVE_HARDWARE');
        setAutoFilledFromSim(true);
      } else {
        const currentSim = hardwareSimEngine.getState();
        setSimState(currentSim);
        const hazardData = hardwareSimEngine.getSimulationHazardData();
        if (hazardData.isHazard) {
          setType(hazardData.type);
          setSeverity(hazardData.severity);
          setAffectedRadius(hazardData.affectedRadius);
          setDescription(hazardData.description);
          setSource('LIVE_HARDWARE');
          setAutoFilledFromSim(true);
        } else {
          const chosenType = (initialHazardType && initialHazardType !== 'Road Construction')
            ? initialHazardType
            : 'Bridge Damage';
          setType(chosenType);
          setSeverity('CRITICAL');
          setAffectedRadius(180);
          setDescription(`ESP32 IoT Bridge Sensor Telemetry: ${chosenType} alert reported on bridge span.`);
          setSource('LIVE_HARDWARE');
          setAutoFilledFromSim(false);
        }
      }
    }
  }, [isOpen, lat, lng, initialHazardType, hazardCategory]);

  const handlePlaceSearch = (query: string) => {
    setSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchingPlaces(false);
      return;
    }
    setIsSearchingPlaces(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(query);
        setSearchResults(results.slice(0, 4));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 250);
  };

  const handleSelectSearchResult = (result: any) => {
    setCurrentLat(result.lat);
    setCurrentLng(result.lng);
    setLocationName(result.name || result.displayName);
    setRoadName(result.roadName || result.name || 'Connecting Road');
    setDescription(`Hazard reported at ${result.name}`);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLat = parseFloat(Number(currentLat).toFixed(6)) || 25.4585;
    const finalLng = parseFloat(Number(currentLng).toFixed(6)) || 78.5765;
    const finalLoc = locationName.trim() || `Location (${finalLat.toFixed(4)}, ${finalLng.toFixed(4)})`;
    const finalRoad = roadName.trim() || 'Connecting Road';
    const finalDesc = description.trim() || `${type} reported at ${finalLoc}`;

    onSubmit({
      type,
      severity,
      latitude: finalLat,
      longitude: finalLng,
      locationName: finalLoc,
      roadName: finalRoad,
      affectedRadius: Number(affectedRadius) || 180,
      description: finalDesc,
      source,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-content">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border shadow shrink-0 ${
              category === 'ROAD'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
            }`}>
              {category === 'ROAD' ? '🚧' : '🌉'}
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {category === 'ROAD' ? 'Create Road Hazard (सड़क निर्माण)' : 'Create Bridge Hazard (पुल खतरा)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {category === 'ROAD'
                  ? 'ESP32 Work Zone Beacon • Dynamic traffic diversion ahead'
                  : 'IoT Bridge Sensor Telemetry • Real-time dynamic diversion'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#21262D] transition cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
          {/* CATEGORY SELECTOR TABS: Road vs Bridge */}
          <div className="bg-[#0D1117] p-1 rounded-xl border border-[#30363D] grid grid-cols-2 gap-1.5 shadow-sm">
            <button
              type="button"
              onClick={handleSwitchToRoad}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                category === 'ROAD'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-[#21262D]'
              }`}
            >
              <span>🚧</span>
              <span>Road Hazard (सड़क निर्माण)</span>
            </button>
            <button
              type="button"
              onClick={handleSwitchToBridge}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                category === 'BRIDGE'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-[#21262D]'
              }`}
            >
              <span>🌉</span>
              <span>Bridge Hazard (पुल सेंसर)</span>
            </button>
          </div>

          {/* Temporary Anomaly Toast Notification */}
          {anomalyToast && (
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 text-[11px] font-semibold flex items-center justify-between animate-fade-in shadow-lg">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span>{anomalyToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setAnomalyToast(null)}
                className="text-cyan-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* SENSOR NODE & IOT SIMULATION SYNC SECTION */}
          {category === 'ROAD' ? (
            <div className="rounded-xl overflow-hidden border-2 border-amber-500/80 shadow-2xl bg-gradient-to-br from-[#120e06] via-[#1a1307] to-[#0d0a04]">
              {/* Caution Barricade Top Strip */}
              <div
                className="h-2.5 w-full"
                style={{ background: 'repeating-linear-gradient(45deg, #000 0, #000 8px, #f59e0b 8px, #f59e0b 16px)' }}
              />

              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Mini Highway Diamond Sign */}
                    <div className="w-7 h-7 bg-amber-400 border-2 border-black rounded transform rotate-45 flex items-center justify-center shadow shrink-0">
                      <span className="transform -rotate-45 text-xs text-black font-black">🚧</span>
                    </div>
                    <div>
                      <div className="font-black text-xs text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                        <span>सावधानी: सड़क निर्माण कार्य प्रगति पर है</span>
                      </div>
                      <div className="text-[10px] text-amber-400/90 font-bold">
                        ROAD WORK AHEAD • IOT ALERT SYSTEM (ESP32 + SIM7600)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-black border border-black shadow">
                      WORK ZONE
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 bg-amber-950/80 border border-amber-500/40">
                      LIVE BEACON
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-amber-100/90 bg-amber-950/40 p-2 rounded-lg border border-amber-600/30 flex items-center justify-between">
                  <span>🚨 हाईवे चेतावनी: कार्य क्षेत्र में गति धीमी करें और सुरक्षित दूरी बनाए रखें।</span>
                  <span className="font-mono text-[10px] text-amber-300 shrink-0 ml-2">
                    GPS: {currentLat.toFixed(4)}°N, {currentLng.toFixed(4)}°E
                  </span>
                </div>
              </div>
            </div>
          ) : simState.overallStatus !== 'SAFE' || autoFilledFromSim ? (
            /* Active Simulation Hazard Auto-Filled Card */
            <div className="p-3 rounded-xl bg-gradient-to-r from-red-950/70 via-red-900/50 to-red-950/70 border border-red-500/60 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
                  <span className="font-bold text-xs text-red-200">
                    ⚡ Auto-Filled from Sensor Node Simulation
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                    {simState.overallStatus} SEVERITY
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30">
                    LIVE_HARDWARE
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-200 font-medium">
                {simState.activeTriggerReason || 'Threshold violation detected in ESP32 telemetry.'}
              </div>

              {/* Live Readings Snapshot */}
              <div className="bg-[#0D1117]/90 rounded-lg p-2 border border-red-900/40 text-[10px] font-mono text-slate-300 flex flex-wrap gap-x-3 gap-y-1 items-center">
                <span>Vib: <strong className="text-white">{simState.sensorValues.mpu6050.vibrationMmS.toFixed(2)} mm/s</strong></span>
                <span>Water: <strong className="text-white">+{simState.sensorValues.hcsr04.waterRiseCm.toFixed(1)} cm</strong></span>
                <span>Tilt: <strong className="text-white">{simState.sensorValues.tilt.angleDeg.toFixed(1)}°</strong></span>
                <span>Strain: <strong className="text-white">{simState.sensorValues.hx711.strainMicrostrain} µε</strong></span>
                <span className="ml-auto text-cyan-400">Packet #{simState.currentPacket?.packetNum || 100}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between pt-1 gap-2 text-[10px]">
                <span className="text-slate-400">Hazard type, severity, radius & description auto-filled</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={fillFromSimulation}
                    className="px-2 py-1 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 font-semibold cursor-pointer transition flex items-center gap-1"
                    title="Re-populate form with latest telemetry from Sensor Node simulation"
                  >
                    <span>🔄</span>
                    <span>Re-Sync</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSimToSafe}
                    className="px-2 py-1 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-slate-300 border border-[#30363D] font-medium cursor-pointer transition"
                    title="Reset simulation back to normal safe readings"
                  >
                    Reset Sim Safe
                  </button>
                  {onNavigateToSensors && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToSensors();
                      }}
                      className="px-2 py-1 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-500/30 font-medium cursor-pointer transition"
                      title="Switch to Sensor Nodes tab"
                    >
                      View Node →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Simulation SAFE State Card */
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#122320]/80 via-[#102a24]/60 to-[#122320]/80 border border-emerald-500/40 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="font-bold text-xs text-emerald-300">
                    🟢 Sensor Node Simulation: ALL NORMAL (No Active Hazard)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  STATUS SAFE
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Virtual hardware sensors in the <strong className="text-white">Sensor Node simulation</strong> are currently within safe limits. To generate and auto-fill hazard information from the simulation, inject a simulated anomaly below or adjust sliders in the Sensor Nodes tab. You can also file a manual road inspection report.
              </p>

              {/* Current Nominal Telemetry */}
              <div className="bg-[#0D1117]/90 rounded-lg p-2 border border-emerald-900/40 text-[10px] font-mono text-slate-300 flex flex-wrap gap-x-3 gap-y-1 items-center">
                <span>Vib: <strong className="text-emerald-400">{simState.sensorValues.mpu6050.vibrationMmS.toFixed(2)} mm/s</strong> (OK &lt; 1.8)</span>
                <span>Water: <strong className="text-emerald-400">+{simState.sensorValues.hcsr04.waterRiseCm.toFixed(1)} cm</strong> (OK &lt; 30)</span>
                <span>Tilt: <strong className="text-emerald-400">{simState.sensorValues.tilt.angleDeg.toFixed(1)}°</strong> (OK &lt; 1.5°)</span>
                <span>Strain: <strong className="text-emerald-400">{simState.sensorValues.hx711.strainMicrostrain} µε</strong> (OK &lt; 600)</span>
              </div>

              {/* Anomaly Injection Options */}
              <div className="pt-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-300">⚡ Inject Simulated Telemetry Anomaly (Instant Auto-Fill):</span>
                  {onNavigateToSensors && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToSensors();
                      }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold underline cursor-pointer"
                    >
                      Open Sensor Simulation Tab →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleInjectAnomaly('FLOOD_ALERT')}
                    className="p-1.5 rounded-lg bg-blue-950/50 hover:bg-blue-900/60 border border-blue-500/40 hover:border-blue-400 text-blue-200 text-[10px] font-semibold transition cursor-pointer flex flex-col items-center text-center gap-0.5"
                    title="Simulate flash flood wave exceeding safety threshold"
                  >
                    <span>🌊 Flood Alert</span>
                    <span className="text-[9px] text-blue-300 font-mono">+42cm Rise</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInjectAnomaly('VIBRATION_SPIKE')}
                    className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 hover:border-red-400 text-red-200 text-[10px] font-semibold transition cursor-pointer flex flex-col items-center text-center gap-0.5"
                    title="Simulate high structural vibration on bridge pier"
                  >
                    <span>💥 Vibration</span>
                    <span className="text-[9px] text-red-300 font-mono">2.85 mm/s</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInjectAnomaly('PIER_TILT')}
                    className="p-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 hover:border-amber-400 text-amber-200 text-[10px] font-semibold transition cursor-pointer flex flex-col items-center text-center gap-0.5"
                    title="Simulate deck inclination shift"
                  >
                    <span>📐 Deck Tilt</span>
                    <span className="text-[9px] text-amber-300 font-mono">2.4° Tilt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInjectAnomaly('STRUCTURAL_STRAIN')}
                    className="p-1.5 rounded-lg bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 hover:border-purple-400 text-purple-200 text-[10px] font-semibold transition cursor-pointer flex flex-col items-center text-center gap-0.5"
                    title="Simulate heavy load stress on bridge deck"
                  >
                    <span>⚖ Overload Strain</span>
                    <span className="text-[9px] text-purple-300 font-mono">780 µε / 98.4 kN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInjectAnomaly('DISPLACEMENT_ANOMALY')}
                    className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 hover:border-rose-400 text-rose-200 text-[10px] font-semibold transition cursor-pointer flex flex-col items-center text-center gap-0.5"
                    title="Simulate bridge pier & crack structural displacement"
                  >
                    <span>📏 Displacement</span>
                    <span className="text-[9px] text-rose-300 font-mono">34.5 mm Shift</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Place Search Autocomplete */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Search Place or Landmark (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handlePlaceSearch(e.target.value)}
                placeholder="Search Jhansi Fort, Civil Lines, Station, or Hospital..."
                className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#AEF5F0] text-xs"
              />
              {isSearchingPlaces && (
                <span className="absolute right-3 top-2.5 w-3.5 h-3.5 border-2 border-[#AEF5F0] border-t-transparent rounded-full animate-spin"></span>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl overflow-hidden divide-y divide-[#30363D]">
                {searchResults.map((r, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearchResult(r)}
                    className="p-2.5 hover:bg-[#21262D] cursor-pointer text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-[11px]">{r.name}</div>
                      <div className="text-[10px] text-slate-400">{r.roadName || r.displayName}</div>
                    </div>
                    <span className="text-[10px] font-mono text-[#AEF5F0]">{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coordinates inputs + Pick on Map */}
          <div className="bg-[#0D1117] p-3 rounded-xl border border-[#30363D] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Hazard Coordinates (GPS)</span>
              {onPickOnMap && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPickOnMap();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#AEF5F0]/15 hover:bg-[#AEF5F0] text-[#AEF5F0] hover:text-slate-950 border border-[#AEF5F0]/30 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Click anywhere on the map to pick point"
                >
                  <span>📍</span>
                  <span>Pick on Map</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={currentLat}
                  onChange={(e) => setCurrentLat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#161B22] border border-[#30363D] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#AEF5F0]"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={currentLng}
                  onChange={(e) => setCurrentLng(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#161B22] border border-[#30363D] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#AEF5F0]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Hazard Type Display - Fixed/Written, NO Dropdown Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Hazard Type (खतरे का प्रकार)
              </label>
              {category === 'ROAD' ? (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1">
                  <span>🚧</span>
                  <span>सड़क निर्माण • Fixed</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1">
                  <span>📡</span>
                  <span>ब्रिज सेंसर • Selected</span>
                </span>
              )}
            </div>

            {category === 'ROAD' ? (
              /* Road Hazard: strictly "Road Construction (सड़क निर्माण)" */
              <div className="w-full bg-gradient-to-r from-[#1f1606] via-[#291e0a] to-[#1f1606] border-2 border-amber-500/80 rounded-xl p-3 text-white flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0 shadow">
                    🚧
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-200 flex items-center gap-2">
                      <span>Road Construction</span>
                      <span className="text-xs text-amber-400 font-medium">(सड़क निर्माण)</span>
                    </div>
                    <div className="text-[10px] text-amber-300/80 font-medium mt-0.5">
                      कार्य क्षेत्र चेतावनी • IoT Work Zone Beacon (ESP32 + SIM7600)
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black shadow">
                    ROAD WORK
                  </span>
                </div>
              </div>
            ) : (
              /* Bridge Hazard: Displays whichever bridge anomaly/hazard type was selected */
              (() => {
                const info = getBridgeHazardInfo(type);
                return (
                  <div className={`w-full ${info.borderClass} rounded-xl p-3 text-white flex items-center justify-between shadow-lg border`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-xl shrink-0 shadow">
                        {info.icon}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{info.englishName}</span>
                          <span className="text-xs text-slate-300 font-medium">({info.hindiName})</span>
                        </div>
                        <div className="text-[10px] text-slate-300/90 font-medium mt-0.5">
                          {info.sensorName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${info.badgeClass}`}>
                        {info.badgeText}
                      </span>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Severity Level</label>
            <div className="grid grid-cols-4 gap-2">
              {(['SAFE', 'WARNING', 'CRITICAL', 'BLOCKED'] as HazardSeverity[]).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setSeverity(lvl)}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    severity === lvl
                      ? lvl === 'CRITICAL' || lvl === 'BLOCKED'
                        ? 'bg-red-600/30 border-red-500 text-red-300 shadow'
                        : lvl === 'WARNING'
                        ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow'
                        : 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow'
                      : 'bg-[#21262D] border-[#30363D] text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Location / Road Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Place / Landmark Name {isLoadingGeocode && <span className="text-[#AEF5F0] animate-pulse text-[10px]">(resolving...)</span>}
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Near Civil Lines Bridge"
                className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-[#AEF5F0] text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Road Name</label>
              <input
                type="text"
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                placeholder="e.g. Civil Lines Road"
                className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-[#AEF5F0] text-xs"
              />
            </div>
          </div>

          {/* Affected Radius */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">Affected Buffer Radius</label>
              <span className="font-mono text-xs font-bold text-amber-400">{affectedRadius} meters</span>
            </div>
            <input
              type="range"
              min="50"
              max="600"
              step="10"
              value={affectedRadius}
              onChange={(e) => setAffectedRadius(Number(e.target.value))}
              className="w-full accent-amber-500 bg-[#21262D] h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>50m (Point)</span>
              <span>180m (Standard)</span>
              <span>600m (Corridor)</span>
            </div>
          </div>

          {/* Source */}
          <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
            <span>Source:</span>
            {(['ADMIN', 'LIVE_HARDWARE', 'VIRTUAL_TEST'] as HazardSource[]).map((src) => (
              <label key={src} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="source"
                  value={src}
                  checked={source === src}
                  onChange={() => setSource(src)}
                  className="accent-[#AEF5F0]"
                />
                <span className={source === src ? 'text-white font-medium' : ''}>{src}</span>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#30363D] flex gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-300 font-semibold text-xs transition border border-[#30363D] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 py-2 px-3 rounded-xl text-white font-bold text-xs transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                category === 'ROAD'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
              }`}
            >
              <span>+ Create {category === 'ROAD' ? 'Road Hazard' : 'Bridge Hazard'}</span>
              <span className="font-normal opacity-90">({category === 'ROAD' ? 'Road Construction' : type})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
