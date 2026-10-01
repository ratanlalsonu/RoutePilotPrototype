import React, { useState } from 'react';
import { AppSettings } from '../../types';
import { realtimeSync } from '../../services/realtimeSync';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings }) => {
  const [apiKey, setApiKey] = useState(settings.googleMapsApiKey || '');
  const [language, setLanguage] = useState<'en' | 'hi'>(settings.language || 'en');
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled ?? true);
  const [sensorMode, setSensorMode] = useState<'VIRTUAL' | 'HARDWARE'>(settings.sensorMode || 'HARDWARE');
  const [esp32Endpoint, setEsp32Endpoint] = useState(settings.esp32Endpoint || 'http://192.168.1.100:80/api/sensor');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    realtimeSync.setApiKey(apiKey.trim());
    realtimeSync.updateSettings({
      googleMapsApiKey: apiKey.trim(),
      language,
      voiceEnabled,
      sensorMode,
      esp32Endpoint,
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  const handlePurgeAllDummyData = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    realtimeSync.resetDemo();
    alert('All dummy and cached data purged! System reset to 100% clean live baseline.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#131d33]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-base">RoutePilot System Configuration</h3>
              <p className="text-xs text-slate-400">API Integration, Live Sensors & Clean Baseline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* API Key Section */}
          <div className="bg-[#141e33] p-3.5 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200">Map &amp; Routing Engine</label>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ● OpenStreetMap + OSRM (Active)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              RoutePilot runs entirely on real interactive OpenStreetMap tiles, live OSRM road geometry routing, and Nominatim real-time search. No Google Maps billing or API keys required.
            </p>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Voice Navigation & UI Language</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`py-2 px-3 rounded-xl border font-bold transition ${
                  language === 'en'
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-[#141e33] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`py-2 px-3 rounded-xl border font-bold transition ${
                  language === 'hi'
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-[#141e33] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>

          {/* Voice Alerts Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#141e33] border border-slate-800">
            <div>
              <div className="font-semibold text-slate-200">Text-to-Speech Voice Alerts</div>
              <div className="text-[10px] text-slate-400">Spoken warnings when hazards are detected</div>
            </div>
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
              className="w-4 h-4 accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Sensor Mode Selection */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">IoT Infrastructure Sensor Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSensorMode('HARDWARE')}
                className={`py-2 px-3 rounded-xl border font-bold transition ${
                  sensorMode === 'HARDWARE'
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    : 'bg-[#141e33] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                External Hardware (ESP32)
              </button>
              <button
                type="button"
                onClick={() => setSensorMode('VIRTUAL')}
                className={`py-2 px-3 rounded-xl border font-bold transition ${
                  sensorMode === 'VIRTUAL'
                    ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                    : 'bg-[#141e33] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Virtual Test Mode
              </button>
            </div>
          </div>

          {/* ESP32 Endpoint */}
          {sensorMode === 'HARDWARE' && (
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">ESP32 REST / Telemetry Endpoint</label>
              <input
                type="text"
                value={esp32Endpoint}
                onChange={(e) => setEsp32Endpoint(e.target.value)}
                placeholder="http://192.168.1.100:80/api/sensor"
                className="w-full bg-[#141e33] border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Clean Zero Dummy Baseline button */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handlePurgeAllDummyData}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span>Purge Cache & Enforce Zero-Dummy State</span>
            </button>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaved ? <span>✓ Saved!</span> : <span>Save Configuration</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
