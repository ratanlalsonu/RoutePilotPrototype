import React, { useState, useEffect, useRef } from 'react';
import { HazardType, HazardSeverity, HazardSource } from '../../types';
import { reverseGeocode, searchPlaces } from '../../services/geocodingService';

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
}

// Curated key road & bridge corridors in the test region for instant 1-click filling
const QUICK_HOTSPOTS = [
  {
    label: '⚠ On Driver Route (Civil Lines Bridge)',
    type: 'Bridge Damage' as HazardType,
    severity: 'CRITICAL' as HazardSeverity,
    lat: 25.4585,
    lng: 78.5765,
    locationName: 'Near Civil Lines Bridge',
    roadName: 'Civil Lines Road',
    radius: 220,
    desc: 'Critical structural crack & pier displacement detected on bridge',
  },
  {
    label: '⚠ 2nd Hazard Ahead (Gwalior Connector)',
    type: 'Road Blockage' as HazardType,
    severity: 'CRITICAL' as HazardSeverity,
    lat: 25.4642,
    lng: 78.5728,
    locationName: 'North-West Gwalior Connector',
    roadName: 'Gwalior Arterial Rd',
    radius: 180,
    desc: 'Overturned trailer blocking both lanes on diverted route',
  },
  {
    label: 'Away from Route (Orchha Bypass)',
    type: 'Road Construction' as HazardType,
    severity: 'WARNING' as HazardSeverity,
    lat: 25.4380,
    lng: 78.5520,
    locationName: 'South Ring Bypass (Far Away)',
    roadName: 'Orchha Link Bypass',
    radius: 150,
    desc: 'Scheduled resurfacing away from driver active corridor',
  },
  {
    label: 'Railway Station Overbridge',
    type: 'High Water Level' as HazardType,
    severity: 'WARNING' as HazardSeverity,
    lat: 25.4484,
    lng: 78.5562,
    locationName: 'Jhansi Station Overbridge',
    roadName: 'Station Link Road',
    radius: 160,
    desc: 'Flash water accumulation under bridge pier after heavy rain',
  },
  {
    label: 'Shivpuri Highway Arterial',
    type: 'Accident' as HazardType,
    severity: 'BLOCKED' as HazardSeverity,
    lat: 25.4290,
    lng: 78.5380,
    locationName: 'Shivpuri Highway Crossing',
    roadName: 'Shivpuri Highway (NH-27)',
    radius: 250,
    desc: 'Multi-vehicle collision blocking arterial highway corridor',
  },
];

export const CreateHazardModal: React.FC<CreateHazardModalProps> = ({
  lat,
  lng,
  isOpen,
  onClose,
  onSubmit,
  onPickOnMap,
}) => {
  const [currentLat, setCurrentLat] = useState<number>(lat || 25.4585);
  const [currentLng, setCurrentLng] = useState<number>(lng || 78.5765);
  const [type, setType] = useState<HazardType>('Bridge Damage');
  const [severity, setSeverity] = useState<HazardSeverity>('CRITICAL');
  const [locationName, setLocationName] = useState('');
  const [roadName, setRoadName] = useState('');
  const [affectedRadius, setAffectedRadius] = useState<number>(180);
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<HazardSource>('ADMIN');
  const [isLoadingGeocode, setIsLoadingGeocode] = useState(false);

  // Quick place search inside modal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const searchDebounceRef = useRef<any>(null);

  // Sync coords when opened or lat/lng prop updates
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen, lat, lng]);

  const handleSelectHotspot = (spot: (typeof QUICK_HOTSPOTS)[0]) => {
    setCurrentLat(spot.lat);
    setCurrentLng(spot.lng);
    setType(spot.type);
    setSeverity(spot.severity);
    setLocationName(spot.locationName);
    setRoadName(spot.roadName);
    setAffectedRadius(spot.radius);
    setDescription(spot.desc);
  };

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
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">Create Infrastructure Hazard</h3>
              <p className="text-[11px] text-slate-400">Set coordinates, affected radius & trigger dynamic routing</p>
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
          {/* Quick Presets Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Quick Test Hotspots & Corridors:</span>
              <span className="text-[10px] text-cyan-400 font-mono">1-Click Auto-Fill</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_HOTSPOTS.map((spot, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectHotspot(spot)}
                  className="px-2 py-1 rounded-lg bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] hover:border-[#AEF5F0]/50 text-slate-300 hover:text-white text-[10px] font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <span>{spot.label}</span>
                </button>
              ))}
            </div>
          </div>

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

          {/* Hazard Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Hazard Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as HazardType)}
              className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#AEF5F0] transition cursor-pointer"
            >
              <option value="Bridge Damage">Bridge Damage (संरचनात्मक क्षति)</option>
              <option value="Road Blockage">Road Blockage (सड़क अवरोध)</option>
              <option value="Road Construction">Road Construction (सड़क निर्माण)</option>
              <option value="High Water Level">High Water Level (जल भराव)</option>
              <option value="Structural Vibration">Structural Vibration (पुल कंपन)</option>
              <option value="Excessive Tilt">Excessive Tilt (झुकाव)</option>
              <option value="Excessive Displacement">Excessive Displacement (विस्थापन)</option>
              <option value="Excessive Strain">Excessive Strain (तनाव)</option>
              <option value="Accident">Accident (दुर्घटना)</option>
              <option value="Other">Other (अन्य)</option>
            </select>
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

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Observations / Incident Log</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Structural movement detected on bridge pier; roadway restricted to single lane."
              rows={2}
              className="w-full bg-[#21262D] border border-[#30363D] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#AEF5F0] text-xs resize-none"
            />
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
              className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>+ Create Hazard</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
