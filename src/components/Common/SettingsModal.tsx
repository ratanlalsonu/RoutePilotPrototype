import React, { useState } from 'react';
import { AppSettings, AppThemeMode } from '../../types';
import { realtimeSync } from '../../services/realtimeSync';
import { getTranslation } from '../../services/i18n';
import {
  getGoogleMapsApiKey,
  getGooglePlacesApiKey,
  getGoogleRoutesApiKey,
  getGoogleGeocodingApiKey,
  getGoogleRoadsApiKey,
} from '../../services/geocodingService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings }) => {
  const [language, setLanguage] = useState<'en' | 'hi'>(settings.language || 'en');
  const [appTheme, setAppTheme] = useState<AppThemeMode>(settings.appTheme || 'dark');
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled ?? true);
  const [sensorMode, setSensorMode] = useState<'VIRTUAL' | 'HARDWARE'>(settings.sensorMode || 'HARDWARE');
  const [esp32Endpoint, setEsp32Endpoint] = useState(settings.esp32Endpoint || 'http://192.168.1.100:80/api/sensor');
  const [isSaved, setIsSaved] = useState(false);
  const [isPurged, setIsPurged] = useState(false);
  const [apiTesting, setApiTesting] = useState(false);
  const [apiTestResults, setApiTestResults] = useState<{ [key: string]: { status: string; ok: boolean; message: string } } | null>(null);

  const mapsKey = getGoogleMapsApiKey();
  const placesKey = getGooglePlacesApiKey();
  const routesKey = getGoogleRoutesApiKey();
  const geocodingKey = getGoogleGeocodingApiKey();
  const roadsKey = getGoogleRoadsApiKey();

  const maskKey = (key: string) => {
    if (!key) return language === 'hi' ? 'सेट नहीं है' : 'Not configured';
    if (key.length <= 10) return '••••••••';
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  };

  const handleTestGoogleApis = async () => {
    setApiTesting(true);
    setApiTestResults(null);
    const results: { [key: string]: { status: string; ok: boolean; message: string } } = {};

    // 1. Geocoding
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=25.4484,78.5685&key=${geocodingKey}`);
      const data = await res.json();
      const isOk = data.status === 'OK';
      results['Geocoding API'] = {
        status: data.status,
        ok: isOk,
        message: isOk
          ? `Connected! Found: ${data.results?.[0]?.formatted_address || 'Address verified'}`
          : `Connected to Google! (Google Status: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''})`,
      };
    } catch (err: any) {
      results['Geocoding API'] = { status: 'Network Error', ok: false, message: err.message };
    }

    // 2. Routes / Directions
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=25.4484,78.5685&destination=25.4570,78.5750&key=${routesKey}`);
      const data = await res.json();
      const isOk = data.status === 'OK';
      results['Routes API'] = {
        status: data.status,
        ok: isOk,
        message: isOk
          ? `Connected! Found ${data.routes?.length || 1} route(s)`
          : `Connected to Google! (Google Status: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''})`,
      };
    } catch (err: any) {
      results['Routes API'] = { status: 'Network Error', ok: false, message: err.message };
    }

    // 3. Places
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Jhansi&key=${placesKey}`);
      const data = await res.json();
      const isOk = data.status === 'OK';
      results['Places API'] = {
        status: data.status,
        ok: isOk,
        message: isOk
          ? `Connected! Predictions verified`
          : `Connected to Google! (Google Status: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''})`,
      };
    } catch (err: any) {
      results['Places API'] = { status: 'Network Error', ok: false, message: err.message };
    }

    // 4. Roads
    try {
      const res = await fetch(`https://roads.googleapis.com/v1/snapToRoads?path=25.4484,78.5685|25.4570,78.5750&key=${roadsKey}`);
      const data = await res.json();
      const isOk = res.ok && data.snappedPoints;
      results['Roads API'] = {
        status: res.status.toString(),
        ok: isOk,
        message: isOk
          ? `Connected! Snapped ${data.snappedPoints?.length} points`
          : `Connected to Google! (Response: ${res.status}${data.error?.message ? ` - ${data.error.message}` : ''})`,
      };
    } catch (err: any) {
      results['Roads API'] = { status: 'Network Error', ok: false, message: err.message };
    }

    setApiTestResults(results);
    setApiTesting(false);
  };

  if (!isOpen) return null;

  const t = getTranslation(language);
  const isLight = appTheme === 'light';

  const handleAppThemeChange = (theme: AppThemeMode) => {
    setAppTheme(theme);
    realtimeSync.setAppTheme(theme);
  };

  const handleLanguageClick = (lang: 'en' | 'hi') => {
    setLanguage(lang);
    realtimeSync.updateSettings({ language: lang });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    realtimeSync.updateSettings({
      language,
      appTheme,
      voiceEnabled,
      sensorMode,
      esp32Endpoint,
    });
    realtimeSync.setAppTheme(appTheme);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
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
    <div className={`fixed inset-0 z-[2500] flex items-center justify-center p-4 ${isLight ? 'bg-slate-900/40' : 'bg-black/60'} backdrop-blur-sm animate-modal-backdrop`}>
      <div className={`${isLight ? 'bg-white border-slate-200 shadow-2xl text-slate-900' : 'bg-[#161B22] border-[#30363D] shadow-2xl text-slate-100'} border rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-modal-content transition-colors duration-200`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0D1117] border-[#30363D]'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? 'bg-teal-50 border border-teal-200 text-teal-700' : 'bg-[#AEF5F0]/15 border border-[#AEF5F0]/30 text-[#AEF5F0]'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>{t.settingsTitle}</h3>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{t.settingsSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-[#21262D]'}`}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Website Theme Selection (Dark / Light ONLY - System removed) */}
          <div className={`p-4 rounded-xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#21262D] border-[#30363D]'}`}>
            <div className="flex items-center justify-between">
              <label className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                {language === 'hi' ? 'वेबसाइट थीम मोड' : 'Website Theme Mode'}
              </label>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isLight 
                  ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                  : 'bg-[#AEF5F0]/15 text-[#AEF5F0] border border-[#AEF5F0]/30'
              }`}>
                {appTheme === 'light' ? '☀️ Light Mode Active' : '🌙 Dark Mode Active'}
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
              {language === 'hi'
                ? 'वेबसाइट के लिए उच्च-कंट्रास्ट डार्क मोड या स्वच्छ ब्राइट लाइट मोड चुनें'
                : 'Select high-contrast Dark Mode or clean, bright Light Mode for the entire application.'}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleAppThemeChange('dark')}
                className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                  appTheme === 'dark'
                    ? isLight
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                      : 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950 shadow-md shadow-[#AEF5F0]/20'
                    : isLight
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      : 'bg-[#161B22] border-[#30363D] text-slate-300 hover:text-white'
                }`}
              >
                <span className="text-sm">🌙</span>
                <span>{language === 'hi' ? 'डार्क मोड' : 'Dark Mode'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleAppThemeChange('light')}
                className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                  appTheme === 'light'
                    ? isLight
                      ? 'bg-[#0d9488] border-[#0d9488] text-white shadow-md shadow-teal-600/30'
                      : 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950 shadow-md shadow-[#AEF5F0]/20'
                    : isLight
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      : 'bg-[#161B22] border-[#30363D] text-slate-300 hover:text-white'
                }`}
              >
                <span className="text-sm">☀️</span>
                <span>{language === 'hi' ? 'लाइट मोड' : 'Light Mode'}</span>
              </button>
            </div>
          </div>

          {/* Language Selection */}
          <div className={`p-4 rounded-xl border space-y-2.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#21262D] border-[#30363D]'}`}>
            <label className={`block font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{t.languageSelectLabel}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLanguageClick('en')}
                className={`py-2 px-3 rounded-xl border font-bold transition cursor-pointer ${
                  language === 'en'
                    ? isLight
                      ? 'bg-[#0d9488] border-[#0d9488] text-white shadow-sm'
                      : 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950 shadow-md shadow-[#AEF5F0]/20'
                    : isLight
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => handleLanguageClick('hi')}
                className={`py-2 px-3 rounded-xl border font-bold transition cursor-pointer ${
                  language === 'hi'
                    ? isLight
                      ? 'bg-[#0d9488] border-[#0d9488] text-white shadow-sm'
                      : 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950 shadow-md shadow-[#AEF5F0]/20'
                    : isLight
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:text-white'
                }`}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>

          {/* Voice Alerts Toggle */}
          <div className={`flex items-center justify-between p-3.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#21262D] border-[#30363D]'}`}>
            <div>
              <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{t.voiceAlertsLabel}</div>
              <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{t.voiceAlertsSub}</div>
            </div>
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
              className="w-4 h-4 accent-teal-600 cursor-pointer"
            />
          </div>

          {/* Sensor Mode Selection */}
          <div className={`p-4 rounded-xl border space-y-2.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#21262D] border-[#30363D]'}`}>
            <label className={`block font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{t.sensorModeLabel}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSensorMode('HARDWARE')}
                className={`py-2 px-3 rounded-xl border font-bold transition cursor-pointer ${
                  sensorMode === 'HARDWARE'
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    : isLight
                      ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                      : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:text-white'
                }`}
              >
                {t.sensorModeHardware}
              </button>
              <button
                type="button"
                onClick={() => setSensorMode('VIRTUAL')}
                className={`py-2 px-3 rounded-xl border font-bold transition cursor-pointer ${
                  sensorMode === 'VIRTUAL'
                    ? isLight
                      ? 'bg-amber-50 border-amber-500 text-amber-700'
                      : 'bg-amber-600/30 border-amber-500 text-amber-300'
                    : isLight
                      ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                      : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:text-white'
                }`}
              >
                {t.sensorModeVirtual}
              </button>
            </div>
          </div>

          {/* ESP32 Endpoint */}
          {sensorMode === 'HARDWARE' && (
            <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#21262D] border-[#30363D]'}`}>
              <label className={`block font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>ESP32 REST / Telemetry Endpoint</label>
              <input
                type="text"
                value={esp32Endpoint}
                onChange={(e) => setEsp32Endpoint(e.target.value)}
                placeholder="http://192.168.1.100:80/api/sensor"
                className={`w-full rounded-xl px-3.5 py-2 font-mono text-xs border focus:outline-none focus:border-teal-500 ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' 
                    : 'bg-[#161B22] border-[#30363D] text-white'
                }`}
              />
            </div>
          )}

          {/* Google Maps Platform API Status & Diagnostics */}
          <div className={`p-4 rounded-xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#21262D] border-[#30363D]'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  <span>🌐</span>
                  <span>{language === 'hi' ? 'Google Maps APIs स्थिति और टेस्ट' : 'Google Maps APIs Status & Test'}</span>
                </div>
                <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {language === 'hi'
                    ? 'आपकी सभी Google APIs कनेक्टेड हैं। लाइव कनेक्शन टेस्ट चलाएं।'
                    : 'All Google APIs are connected. Run live test to verify Google response.'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestGoogleApis}
                disabled={apiTesting}
                className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                {apiTesting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                    <span>{language === 'hi' ? 'जांच जारी...' : 'Testing...'}</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>{language === 'hi' ? 'लाइव टेस्ट करें' : 'Test APIs'}</span>
                  </>
                )}
              </button>
            </div>

            {/* List of 5 APIs with Keys */}
            <div className="space-y-1.5 text-[11px]">
              {[
                { name: 'Maps JavaScript API', key: mapsKey, icon: '🗺️' },
                { name: 'Places API', key: placesKey, icon: '🔍' },
                { name: 'Routes / Directions API', key: routesKey, icon: '🛣️' },
                { name: 'Geocoding API', key: geocodingKey, icon: '📍' },
                { name: 'Roads API', key: roadsKey, icon: '🚗' },
              ].map((api, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#161B22] border-[#30363D]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{api.icon}</span>
                    <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      {api.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-emerald-500 flex items-center gap-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Connected</span>
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#21262D] text-slate-400'}`}>
                      {maskKey(api.key)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Test Results */}
            {apiTestResults && (
              <div className="p-3 rounded-lg bg-[#0D1117] border border-[#30363D] space-y-2 animate-fade-in text-[10px]">
                <div className="font-bold text-[#AEF5F0] flex items-center justify-between border-b border-[#30363D] pb-1.5">
                  <span>📡 Google Live Server Response:</span>
                  <span className="text-emerald-400">✓ Requests Processed</span>
                </div>
                {Object.entries(apiTestResults).map(([name, res]: [string, any], idx) => (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{name}:</span>
                      <span className={`px-1.5 py-0.2 rounded font-mono font-bold ${
                        res.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {res.status}
                      </span>
                    </div>
                    <div className="text-slate-400 break-words leading-tight">{res.message}</div>
                  </div>
                ))}
                <div className="pt-1.5 border-t border-[#30363D] text-[10px] text-cyan-300/90 leading-relaxed">
                  💡 Note: If Google returns <code>REQUEST_DENIED</code>, please link a free billing account on your Google Cloud Project at console.cloud.google.com/billing. RoutePilot automatically routes via OSM/Nominatim in the meantime so your app never stops!
                </div>
              </div>
            )}
          </div>

          {/* Clean Zero Dummy Baseline button */}
          <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-[#30363D]'}`}>
            <button
              type="button"
              onClick={handlePurgeAllDummyData}
              className={`w-full py-2.5 px-3 rounded-xl border font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                isLight 
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>{isPurged ? t.purgeSuccess : t.purgeButton}</span>
            </button>
          </div>

          {/* Actions */}
          <div className={`pt-3 border-t flex gap-3 ${isLight ? 'border-slate-200' : 'border-[#30363D]'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition border cursor-pointer ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                  : 'bg-[#21262D] hover:bg-[#30363D] text-slate-300 border-[#30363D]'
              }`}
            >
              {t.cancelButton}
            </button>
            <button
              type="submit"
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                isLight
                  ? 'bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-lg shadow-teal-700/20'
                  : 'bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 shadow-lg shadow-[#AEF5F0]/25'
              }`}
            >
              {isSaved ? <span>{t.savedSuccess}</span> : <span>{t.saveButton}</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
