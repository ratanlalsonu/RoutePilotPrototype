import React, { useState, useEffect } from 'react';
import { HazardType, HazardSeverity, HazardSource } from '../../types';
import { reverseGeocode } from '../../services/geocodingService';

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
}

export const CreateHazardModal: React.FC<CreateHazardModalProps> = ({
  lat,
  lng,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<HazardType>('Bridge Damage');
  const [severity, setSeverity] = useState<HazardSeverity>('CRITICAL');
  const [locationName, setLocationName] = useState('');
  const [roadName, setRoadName] = useState('');
  const [affectedRadius, setAffectedRadius] = useState<number>(180);
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<HazardSource>('ADMIN');
  const [isLoadingGeocode, setIsLoadingGeocode] = useState(false);

  useEffect(() => {
    if (isOpen && lat && lng) {
      setIsLoadingGeocode(true);
      reverseGeocode(lat, lng)
        .then((res) => {
          setLocationName(res.locationName);
          setRoadName(res.roadName);
        })
        .finally(() => setIsLoadingGeocode(false));
    }
  }, [isOpen, lat, lng]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type,
      severity,
      latitude: lat,
      longitude: lng,
      locationName: locationName || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      roadName: roadName || 'Connecting Road',
      affectedRadius: Number(affectedRadius) || 180,
      description: description || `${type} reported at ${locationName}`,
      source,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Create Infrastructure Hazard</h3>
              <p className="text-xs text-slate-400">Specify hazard coordinates, severity & affected buffer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#21262D] transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
          {/* Coordinates readout */}
          <div className="bg-[#0D1117] p-3 rounded-xl border border-[#30363D] flex items-center justify-between text-xs">
            <span className="text-slate-400">Clicked Location:</span>
            <span className="font-mono text-blue-400 font-semibold">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </span>
          </div>

          {/* Hazard Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hazard Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as HazardType)}
              className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="Bridge Damage">Bridge Damage</option>
              <option value="Road Blockage">Road Blockage</option>
              <option value="Road Construction">Road Construction</option>
              <option value="High Water Level">High Water Level</option>
              <option value="Structural Vibration">Structural Vibration</option>
              <option value="Excessive Tilt">Excessive Tilt</option>
              <option value="Excessive Displacement">Excessive Displacement</option>
              <option value="Excessive Strain">Excessive Strain</option>
              <option value="Accident">Accident</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Severity Level</label>
            <div className="grid grid-cols-4 gap-2">
              {(['SAFE', 'WARNING', 'CRITICAL', 'BLOCKED'] as HazardSeverity[]).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setSeverity(lvl)}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Place / Landmark Name {isLoadingGeocode && <span className="text-blue-400 animate-pulse text-[10px]">(resolving...)</span>}
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Near Civil Lines Bridge"
                required
                className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Road Name</label>
              <input
                type="text"
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                placeholder="e.g. Civil Lines Road"
                required
                className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Affected Radius */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Affected Radius (meters)</label>
              <span className="font-mono text-xs font-bold text-amber-400">{affectedRadius} m</span>
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
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>50m (Point)</span>
              <span>180m (Standard)</span>
              <span>600m (Corridor)</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description & Observations</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bridge pier sensor shows excessive vibration; northbound lane closed."
              rows={2}
              className="w-full bg-[#21262D] border border-[#30363D] rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 text-xs resize-none"
            />
          </div>

          {/* Source */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Source:</span>
            {(['ADMIN', 'LIVE_HARDWARE', 'VIRTUAL_TEST'] as HazardSource[]).map((src) => (
              <label key={src} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="source"
                  value={src}
                  checked={source === src}
                  onChange={() => setSource(src)}
                  className="accent-blue-500"
                />
                <span className={source === src ? 'text-white font-medium' : ''}>{src}</span>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#30363D] flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-300 font-semibold text-xs transition border border-[#30363D] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Create Hazard</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
