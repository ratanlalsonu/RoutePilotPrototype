import React, { useState, useEffect } from 'react';

interface EmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  driverId: string;
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  isOpen,
  onClose,
  lat,
  lng,
  driverId,
}) => {
  const [countdown, setCountdown] = useState(5);
  const [dispatched, setDispatched] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setDispatched(false);
      return;
    }

    if (countdown > 0 && !dispatched) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !dispatched) {
      setDispatched(true);
    }
  }, [isOpen, countdown, dispatched]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2600] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-modal-backdrop select-none">
      <div className="bg-[#161B22] border-2 border-red-500 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center animate-modal-content">
        {!dispatched ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-600/30 border-2 border-red-500 flex items-center justify-center mx-auto text-red-400 animate-pulse">
              <span className="text-2xl font-black">{countdown}</span>
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white uppercase tracking-wider">EMERGENCY SOS INITIATED</h3>
              <p className="text-xs text-red-300 mt-1">
                Dispatching highway emergency response & location coordinates in {countdown}s...
              </p>
            </div>

            <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-3 text-xs text-left space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Driver Call Sign:</span>
                <span className="text-white font-bold">{driverId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Live GPS:</span>
                <span className="text-cyan-400 font-bold">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Services Alerted:</span>
                <span className="text-amber-300">Highway Patrol (112), Ambulance, Towing</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-slate-200 font-bold text-xs cursor-pointer transition"
              >
                Cancel SOS
              </button>
              <button
                type="button"
                onClick={() => setDispatched(true)}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/40 cursor-pointer transition"
              >
                Dispatch Now
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-white">EMERGENCY UNITS DISPATCHED</h3>
              <p className="text-xs text-slate-300 mt-1">
                Highway Patrol Unit HP-09 & Medical Response dispatched to your exact GPS coordinates.
              </p>
            </div>

            <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-3 text-xs space-y-1 text-slate-300 text-left">
              <div><span className="text-slate-400">Estimated Arrival:</span> <span className="font-bold text-emerald-400">6 - 8 minutes</span></div>
              <div><span className="text-slate-400">Emergency Channel:</span> <span className="font-mono text-cyan-400">VHF 156.800 MHz (Ch 16)</span></div>
              <div><span className="text-slate-400">Status:</span> <span className="text-white font-bold">En Route with Siren & Beacon</span></div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#AEF5F0]/20 cursor-pointer transition"
            >
              Return to Navigation
            </button>
          </>
        )}
      </div>
    </div>
  );
};
