import React, { useState } from 'react';
import { AppSettings } from '../../types';
import { realtimeSync } from '../../services/realtimeSync';
import { getTranslation } from '../../services/i18n';
import { searchPlaces } from '../../services/geocodingService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings }) => {
  const getInitialKey = (key?: string, storageKey = 'routepilot_gmaps_api_key') => {
    if (key && key.trim().length > 0) return key.trim();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored.trim().length > 0) return stored.trim();
    }
    return '';
  };

  const [apiKey, setApiKey] = useState(getInitialKey(settings.googleMapsApiKey, 'routepilot_gmaps_api_key'));
  const [placesApiKey, setPlacesApiKey] = useState(getInitialKey(settings.placesApiKey, 'routepilot_places_api_key'));
  const [useDedicatedPlacesKey, setUseDedicatedPlacesKey] = useState(
    Boolean(
      (settings.placesApiKey && settings.placesApiKey.trim().length > 0) ||
      (typeof window !== 'undefined' && localStorage.getItem('routepilot_places_api_key'))
    )
  );
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>(settings.language || 'en');
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled ?? true);
  const [sensorMode, setSensorMode] = useState<'VIRTUAL' | 'HARDWARE'>(settings.sensorMode || 'HARDWARE');
  const [esp32Endpoint, setEsp32Endpoint] = useState(settings.esp32Endpoint || 'http://192.168.1.100:80/api/sensor');
  const [isSaved, setIsSaved] = useState(false);
  const [isPurged, setIsPurged] = useState(false);

  if (!isOpen) return null;

  const t = getTranslation(language);

  const handleLanguageClick = (lang: 'en' | 'hi') => {
    setLanguage(lang);
    realtimeSync.updateSettings({ language: lang });
  };

  const handleTestPlaceSearch = async () => {
    if (!testQuery.trim()) return;
    setIsTesting(true);
    setTestError(null);
    setTestResults(null);
    try {
      const activeKey = useDedicatedPlacesKey && placesApiKey.trim() ? placesApiKey.trim() : apiKey.trim();
      const results = await searchPlaces(testQuery.trim(), activeKey);
      setTestResults(results);
      if (results.length === 0) {
        setTestError('No results returned. Check API key permissions for Places API.');
      }
    } catch (err: any) {
      setTestError(err.message || 'Error executing place search');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalKey = apiKey.trim();
    realtimeSync.setApiKey(finalKey);
    const finalPlacesKey = useDedicatedPlacesKey ? placesApiKey.trim() : '';
    realtimeSync.setPlacesApiKey(finalPlacesKey);
    if (typeof window !== 'undefined') {
      if (finalKey) {
        localStorage.setItem('routepilot_gmaps_api_key', finalKey);
      } else {
        localStorage.removeItem('routepilot_gmaps_api_key');
      }
      if (useDedicatedPlacesKey && finalPlacesKey) {
        localStorage.setItem('routepilot_places_api_key', finalPlacesKey);
      } else {
        localStorage.removeItem('routepilot_places_api_key');
      }
    }
    realtimeSync.updateSettings({
      googleMapsApiKey: finalKey,
      placesApiKey: finalPlacesKey,
      useDedicatedPlacesKey,
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
    setIsPurged(true);
    setTimeout(() => {
      setIsPurged(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-content">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#AEF5F0]/15 border border-[#AEF5F0]/30 flex items-center justify-center text-[#AEF5F0]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{t.settingsTitle}</h3>
              <p className="text-xs text-slate-400">{t.settingsSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#21262D] transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* API Key Section */}
          <div className="bg-[#21262D] p-3.5 rounded-xl border border-[#30363D] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200">Google Maps Platform Integration</label>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#AEF5F0]/15 text-[#AEF5F0] border border-[#AEF5F0]/30">
                ● Google Maps Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Integrated with Google Maps JavaScript API (<code className="text-[#AEF5F0]">@vis.gl/react-google-maps</code>), AdvancedMarkerElement, Vector dark styling, and Hybrid Satellite.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Google Maps API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#161B22] border border-[#30363D] rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#AEF5F0]"
              />
            </div>
          </div>

          {/* Places API Key Section */}
          <div className="bg-[#21262D] p-3.5 rounded-xl border border-[#30363D] space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200">Google Places API (New) Real Place Search</label>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ● Places API Integrated & Active
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Powers instant real-world search for landmarks, cities, highway junctions, addresses, and hospitals across India and globally.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Google Places API Key</label>
              <input
                type="text"
                value={placesApiKey}
                onChange={(e) => setPlacesApiKey(e.target.value)}
                placeholder="AIzaSy... (Google Places API Key)"
                className="w-full bg-[#161B22] border border-[#30363D] rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#AEF5F0]"
              />
            </div>

            {/* Interactive Live Place Search Tester */}
            <div className="pt-2 border-t border-[#30363D]/60 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-300">
                Test Real Place Search
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="e.g. Jhansi Railway Station, Gwalior, Delhi..."
                  className="flex-1 bg-[#161B22] border border-[#30363D] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#AEF5F0]"
                />
                <button
                  type="button"
                  onClick={handleTestPlaceSearch}
                  disabled={isTesting}
                  className="px-3 py-1.5 bg-[#AEF5F0] hover:bg-[#8eede6] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? 'Testing...' : 'Test Search'}
                </button>
              </div>

              {testError && (
                <div className="text-[11px] text-amber-400 bg-amber-950/30 p-2 rounded-lg border border-amber-800/40">
                  {testError}
                </div>
              )}

              {testResults && testResults.length > 0 && (
                <div className="bg-[#161B22] rounded-lg p-2.5 border border-[#30363D] max-h-36 overflow-y-auto space-y-1.5">
                  <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-between">
                    <span>✓ Places API Active ({testResults.length} found)</span>
                  </div>
                  {testResults.slice(0, 3).map((res, i) => (
                    <div key={i} className="text-[11px] border-b border-[#30363D]/40 pb-1 last:border-0 last:pb-0">
                      <div className="font-semibold text-slate-200">{res.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{res.displayName}</div>
                      <div className="text-[9px] font-mono text-[#AEF5F0]">
                        GPS: {res.lat.toFixed(5)}, {res.lng.toFixed(5)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">{t.languageSelectLabel}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLanguageClick('en')}
                className={`py-2 px-3 rounded-xl border font-bold transition cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950 shadow-md shadow-[#AEF5F0]/20'
                    : 'bg-[#21262D] border-[#30363D] text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => handleLanguageClick('hi')}
                className={`py-2 px-3 rounded-xl border font-bold transition cursor-pointer ${
                  language === 'hi'
                    ? 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950 shadow-md shadow-[#AEF5F0]/20'
                    : 'bg-[#21262D] border-[#30363D] text-slate-400 hover:text-white'
                }`}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>

          {/* Voice Alerts Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#21262D] border border-[#30363D]">
            <div>
              <div className="font-semibold text-slate-200">{t.voiceAlertsLabel}</div>
              <div className="text-[10px] text-slate-400">{t.voiceAlertsSub}</div>
            </div>
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#AEF5F0] cursor-pointer"
            />
          </div>

          {/* Sensor Mode Selection */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">{t.sensorModeLabel}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSensorMode('HARDWARE')}
                className={`py-2 px-3 rounded-xl border font-bold transition cursor-pointer ${
                  sensorMode === 'HARDWARE'
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    : 'bg-[#21262D] border-[#30363D] text-slate-400 hover:text-white'
                }`}
              >
                {t.sensorModeHardware}
              </button>
              <button
                type="button"
                onClick={() => setSensorMode('VIRTUAL')}
                className={`py-2 px-3 rounded-xl border font-bold transition cursor-pointer ${
                  sensorMode === 'VIRTUAL'
                    ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                    : 'bg-[#21262D] border-[#30363D] text-slate-400 hover:text-white'
                }`}
              >
                {t.sensorModeVirtual}
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
                className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#AEF5F0]"
              />
            </div>
          )}

          {/* Clean Zero Dummy Baseline button */}
          <div className="pt-2 border-t border-[#30363D]">
            <button
              type="button"
              onClick={handlePurgeAllDummyData}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span>{isPurged ? t.purgeSuccess : t.purgeButton}</span>
            </button>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#30363D] flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-300 font-semibold transition border border-[#30363D] cursor-pointer"
            >
              {t.cancelButton}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold transition shadow-lg shadow-[#AEF5F0]/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaved ? <span>{t.savedSuccess}</span> : <span>{t.saveButton}</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
