import React, { useState } from 'react';
import { HazardType, HazardSeverity } from '../../types';
import { realtimeSync } from '../../services/realtimeSync';

interface ReportHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLat: number;
  currentLng: number;
}

export const ReportHazardModal: React.FC<ReportHazardModalProps> = ({
  isOpen,
  onClose,
  currentLat,
  currentLng,
}) => {
  const [hazardType, setHazardType] = useState<HazardType>('Road Blockage');
  const [severity, setSeverity] = useState<HazardSeverity>('CRITICAL');
  const [roadName, setRoadName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      realtimeSync.reportHazardFromDriver({
        type: hazardType,
        severity,
        roadName: roadName.trim() || undefined,
        description: description.trim() || `Driver reported ${hazardType.toLowerCase()} ahead`,
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setIsSubmitting(false);
        onClose();
      }, 1400);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Report Road Hazard</h3>
              <p className="text-[11px] text-slate-400">Instantly broadcast to RoutePilot & reroute traffic</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#21262D] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              ✓
            </div>
            <h4 className="font-bold text-white text-sm">Hazard Reported Successfully</h4>
            <p className="text-xs text-slate-400">Routes are dynamically adjusting to avoid this location.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Current Coordinates Banner */}
            <div className="bg-[#21262D] p-2.5 rounded-xl border border-[#30363D] flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Location Coordinates:</span>
              <span className="font-mono text-blue-400 text-xs font-semibold">
                {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
              </span>
            </div>

            {/* Hazard Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hazard Type</label>
              <select
                value={hazardType}
                onChange={(e) => setHazardType(e.target.value as HazardType)}
                className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Road Blockage">🚧 Road Blockage / Obstruction</option>
                <option value="High Water Level">🌊 High Water Level / Flooding</option>
                <option value="Bridge Damage">🌉 Bridge Damage / Structural Vibration</option>
                <option value="Accident">💥 Traffic Accident</option>
                <option value="Road Construction">🏗️ Road Construction / Repair</option>
                <option value="Structural Vibration">⚠️ Severe Pothole / Road Distress</option>
                <option value="Other">⚠️ Other Danger</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Severity Level</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'WARNING', label: 'Warning', color: 'border-amber-500 text-amber-300 bg-amber-500/10' },
                  { id: 'CRITICAL', label: 'Critical', color: 'border-red-500 text-red-300 bg-red-500/10' },
                  { id: 'BLOCKED', label: 'Blocked', color: 'border-red-700 text-red-200 bg-red-900/40' },
                ].map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setSeverity(s.id as HazardSeverity)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                      severity === s.id ? `${s.color} ring-1 ring-white/20` : 'bg-[#21262D] border-[#30363D] text-slate-400'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Road Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Road Name (Optional)</label>
              <input
                type="text"
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                placeholder="e.g. Civil Lines Road, Jhansi-Gwalior Bypass"
                className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Describe road condition, lane blockage, water depth, etc."
                className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#30363D] text-slate-300 hover:bg-[#21262D] text-xs font-semibold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? 'Transmitting...' : 'Transmit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
