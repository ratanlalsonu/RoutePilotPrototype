import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RoutePilotState, realtimeSync } from '../../services/realtimeSync';
import { RoutePilotMap } from '../Map/RoutePilotMap';
import { SettingsModal } from '../Common/SettingsModal';
import { ReportHazardModal } from './ReportHazardModal';
import { EmergencySosModal } from './EmergencySosModal';
import { VehicleType, HazardType, HazardSeverity, RouteStep } from '../../types';
import { searchPlaces, reverseGeocode } from '../../services/geocodingService';
import { VoiceService } from '../../services/voiceService';
import { getVehicleSpeedProfile, formatDurationText } from '../../services/routingService';
import { getTranslation } from '../../services/i18n';
import { NotificationCenterDropdown } from '../Common/NotificationCenterDropdown';

interface DriverDashboardProps {
  state: RoutePilotState;
  onSwitchMode: (mode: 'admin' | 'driver') => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ state, onSwitchMode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);
  const searchDebounceRef = useRef<any>(null);
  const [activeBottomNav, setActiveBottomNav] = useState<'Home' | 'Map' | 'Route' | 'Alerts' | 'More'>('Home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportHazardOpen, setIsReportHazardOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi'>(state.appSettings.language || 'en');
  const [voiceEnabled, setVoiceEnabled] = useState(state.appSettings.voiceEnabled ?? true);
  const [voiceTestFeedback, setVoiceTestFeedback] = useState<string | null>(null);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const t = getTranslation(language);

  // Sync internal language state whenever appSettings.language updates
  useEffect(() => {
    if (state.appSettings.language && state.appSettings.language !== language) {
      setLanguage(state.appSettings.language);
    }
  }, [state.appSettings.language]);

  const { journey, hazards, sensorNodes } = state;

  // Auto-acquire real live GPS on component mount so the driver's real position appears as Source
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsAcquiringGps(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setIsAcquiringGps(false);
          const { latitude, longitude } = pos.coords;
          let placeName = 'Live Device Location';
          try {
            const rev = await reverseGeocode(latitude, longitude, state.appSettings.googleMapsApiKey);
            if (rev?.locationName) {
              placeName = rev.locationName;
            }
          } catch {}
          realtimeSync.updateDriverLocationFromGps(latitude, longitude, placeName);
        },
        (err) => {
          setIsAcquiringGps(false);
          console.warn('GPS notice:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Manual GPS acquisition
  const handleAcquireRealGps = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsAcquiringGps(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setIsAcquiringGps(false);
          const { latitude, longitude } = pos.coords;
          let placeName = 'Live Device Location';
          try {
            const rev = await reverseGeocode(latitude, longitude, state.appSettings.googleMapsApiKey);
            if (rev?.locationName) {
              placeName = rev.locationName;
            }
          } catch {}
          realtimeSync.updateDriverLocationFromGps(latitude, longitude, placeName);
          VoiceService.speak('GPS location acquired.', 'जीपीएस स्थान प्राप्त किया गया।');
        },
        (err) => {
          setIsAcquiringGps(false);
          console.warn(`GPS Notice: ${err.message}. Ensure location permissions are allowed.`);
          setGpsNotice(`GPS Notice: ${err.message}`);
          setTimeout(() => setGpsNotice(null), 4000);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      console.warn('Geolocation API not supported in this browser.');
      setGpsNotice('Geolocation API not supported in this browser.');
      setTimeout(() => setGpsNotice(null), 4000);
    }
  };

  // Search places with instant local response + debounced live geocoding
  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length > 0) {
      setShowSearchResults(true);
      setIsSearching(true);

      // Debounce network requests by 200ms
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const results = await searchPlaces(trimmed, state.appSettings.googleMapsApiKey);
          setSearchResults(results);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 200);
    } else {
      setShowSearchResults(false);
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  // Select destination
  const handleSelectDestination = async (dest: { name: string; lat: number; lng: number }) => {
    setSearchQuery(dest.name);
    setShowSearchResults(false);
    await realtimeSync.setDestination({
      name: dest.name,
      lat: dest.lat,
      lng: dest.lng,
    });
  };

  const handleVehicleSelect = async (type: VehicleType) => {
    setIsCalculatingRoutes(true);
    try {
      await realtimeSync.generateAndDisplayOptimalRoutes(type);
    } finally {
      setIsCalculatingRoutes(false);
    }
  };

  const handleSelectOptimalRoute = (routeId: string) => {
    realtimeSync.selectOptimalRoute(routeId);
  };

  const handleCommitRoute = (routeId: string) => {
    realtimeSync.selectOptimalRoute(routeId);
  };

  const toggleNavigation = () => {
    const nextState = !journey.isNavigating;
    realtimeSync.setNavigating(nextState);
    if (nextState && typeof window !== 'undefined' && window.innerWidth < 768) {
      setActiveBottomNav('Map');
    }
  };

  const handleStopNavigation = () => {
    realtimeSync.stopNavigation();
  };

  const handleAdvanceStep = () => {
    realtimeSync.advanceVehicle(1);
  };

  const handleOkFindAlternates = () => {
    realtimeSync.handleDriverConfirmFindAlternates();
  };

  const handleSpeedChange = (speed: number) => {
    realtimeSync.setSimulationSpeed(speed);
  };

  const handleToggleLanguage = (lang: 'en' | 'hi') => {
    setLanguage(lang);
    realtimeSync.updateSettings({ language: lang });
    VoiceService.setLanguage(lang);
  };

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    realtimeSync.updateSettings({ voiceEnabled: next });
    VoiceService.setEnabled(next);
  };

  const handleTestVoice = () => {
    setVoiceTestFeedback('Speaking test guidance...');
    VoiceService.speak(
      'RoutePilot voice navigation active. Drive safely.',
      'रूटपायलट ध्वनि मार्गदर्शन सक्रिय है। सुरक्षित यात्रा करें।'
    );
    setTimeout(() => setVoiceTestFeedback(null), 3000);
  };

  // Calculate current maneuver for HUD based on route steps & vehicle pointIndex
  const currentManeuver: RouteStep | null = useMemo(() => {
    if (!journey.activeRoute) return null;
    const steps = journey.activeRoute.steps;
    if (steps && steps.length > 0) {
      const totalPoints = journey.activeRoute.coordinates.length || 1;
      const progressFraction = journey.currentLocation.pointIndex / Math.max(1, totalPoints - 1);
      const stepIndex = Math.min(steps.length - 1, Math.floor(progressFraction * steps.length));
      return steps[stepIndex];
    }
    const defaultManeuver = journey.activeRoute.maneuver;
    return {
      instruction: defaultManeuver?.instruction || `Continue to ${journey.destination.name || 'Destination'}`,
      roadName: journey.activeRoute.viaRoads?.[0] || 'Main Corridor',
      distanceMeters: defaultManeuver?.distanceMeters || Math.round(journey.remainingDistanceKm * 1000),
      durationSeconds: Math.round(journey.remainingDurationMinutes * 60),
      turnType: 'straight',
    };
  }, [journey.activeRoute, journey.currentLocation.pointIndex, journey.remainingDistanceKm, journey.remainingDurationMinutes, journey.destination.name]);

  // Turn icon helper
  const getTurnIcon = (type?: string) => {
    switch (type) {
      case 'left':
      case 'slight-left':
        return (
          <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        );
      case 'right':
      case 'slight-right':
        return (
          <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        );
      case 'u-turn':
        return (
          <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4m0 0l4-4m-4 4h10.5a5.5 5.5 0 015.5 5.5v2" />
          </svg>
        );
      case 'arrive':
        return (
          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-[#AEF5F0]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0D1117] text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <header className="h-14 border-b border-[#30363D] bg-[#161B22] px-1 sm:px-4 flex items-center justify-between z-30 shrink-0 gap-1 sm:gap-3">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Logo */}
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[#AEF5F0] flex items-center justify-center text-slate-950 font-bold shadow-md shadow-[#AEF5F0]/25 shrink-0">
            <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-extrabold text-xs sm:text-base tracking-tight text-white inline shrink-0">RoutePilot</span>
            <span className="hidden md:inline-flex text-[10px] font-mono uppercase bg-[#AEF5F0]/15 text-[#AEF5F0] px-1.5 py-0.5 rounded border border-[#AEF5F0]/30">
              {t.driverNav}
            </span>
          </div>
        </div>

        {/* Center Mode Switch */}
        <div className="flex items-center bg-[#0D1117] p-0.5 sm:p-1 rounded-xl border border-[#30363D] shrink-0">
          <button
            onClick={() => onSwitchMode('admin')}
            className="px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition text-slate-400 hover:text-white hover:bg-[#21262D] cursor-pointer"
          >
            <span className="hidden sm:inline">{t.adminMode}</span>
            <span className="sm:hidden">{language === 'hi' ? 'एडमिन' : 'Admin'}</span>
          </button>
          <button
            onClick={() => onSwitchMode('driver')}
            className="px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition bg-[#AEF5F0] text-slate-950 shadow-md shadow-[#AEF5F0]/30 cursor-pointer"
          >
            <span className="hidden sm:inline">{t.driverMode}</span>
            <span className="sm:hidden">{language === 'hi' ? 'ड्राइवर' : 'Driver'}</span>
          </button>
        </div>

        {/* Right Status Badges & Controls - NEVER HIDDEN ON MOBILE */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-xs shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{t.gpsConnected}</span>
          </div>

          {/* Quick SOS Header Button */}
          <button
            onClick={() => setIsSosOpen(true)}
            className="p-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-400 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
            title="Emergency SOS Roadside Assistance"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
            <span className="hidden sm:inline">{t.emergencySos}</span>
            <span className="sm:hidden font-bold text-[10px]">SOS</span>
          </button>

          {/* Quick Language Toggle */}
          <button
            type="button"
            onClick={() => realtimeSync.toggleLanguage()}
            title={language === 'hi' ? 'Switch to English' : 'हिन्दी में बदलें'}
            className="flex items-center gap-0.5 sm:gap-1 p-1 sm:px-2 sm:py-1.5 rounded-lg border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] hover:border-[#AEF5F0]/40 text-slate-200 text-xs font-bold transition cursor-pointer shrink-0"
          >
            <span className="text-xs">🌐</span>
            <span className="hidden sm:inline text-[11px] font-medium">{language === 'hi' ? 'EN' : 'हिन्दी'}</span>
          </button>

          {/* Notification Icon & Dropdown Center */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setNotificationOpen(!notificationOpen)}
              title={t.notifications}
              className={`p-1 sm:p-2 rounded-lg border relative transition cursor-pointer flex items-center justify-center shrink-0 ${
                notificationOpen
                  ? 'bg-[#30363D] border-[#AEF5F0] text-white shadow-md shadow-[#AEF5F0]/20'
                  : 'bg-[#21262D] border-[#30363D] hover:bg-[#30363D] text-slate-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {hazards.filter((h) => h.status === 'ACTIVE').length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-red-500 text-white text-[8px] sm:text-[9px] font-bold flex items-center justify-center border-2 border-[#161B22] animate-pulse">
                  {hazards.filter((h) => h.status === 'ACTIVE').length}
                </span>
              )}
            </button>

            {/* Notification Center Dropdown */}
            <NotificationCenterDropdown
              isOpen={notificationOpen}
              onClose={() => setNotificationOpen(false)}
              hazards={hazards}
              routeEvents={state.routeEvents}
              language={language}
              onNavigateTab={(tab) => {
                if (tab === 'Hazards' || tab === 'Route Events') {
                  setActiveBottomNav('Alerts');
                }
                setNotificationOpen(false);
              }}
            />
          </div>

          {/* Map Satellite Mode Toggle - ALWAYS VISIBLE NEXT TO BELL */}
          <button
            type="button"
            onClick={() => realtimeSync.toggleMapTheme()}
            title={`Map Mode: ${state.appSettings.mapTheme === 'satellite' ? 'Satellite Mode' : 'Standard Map'} (Click to switch)`}
            className={`p-1 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center justify-center shrink-0 ${
              state.appSettings.mapTheme === 'satellite'
                ? 'bg-[#AEF5F0] text-slate-950 font-bold border-[#AEF5F0] shadow-md shadow-[#AEF5F0]/30'
                : 'bg-[#21262D] border-[#30363D] hover:bg-[#30363D] text-slate-200'
            }`}
          >
            <span>🛰️</span>
            <span className="hidden md:inline ml-0.5">{state.appSettings.mapTheme === 'satellite' ? 'Satellite' : 'Standard'}</span>
          </button>

          {/* Settings Icon - ALWAYS VISIBLE NEXT TO SATELLITE */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title={t.settings}
            className="p-1 sm:p-2 rounded-lg bg-[#21262D] border border-[#30363D] hover:bg-[#30363D] text-slate-300 transition cursor-pointer flex items-center justify-center shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIEW 1: HOME (Standard 3-Column Cockpit on Desktop, or Full Cockpit on Mobile) */}
        {activeBottomNav === 'Home' && (
          <div key="driver-tab-home" className="animate-tab-switch flex-1 flex w-full h-full overflow-hidden">
            {/* Left Column: Destination, Vehicle, Journey Controls */}
            <div className="w-full md:w-84 lg:w-88 bg-[#161B22] border-r border-[#30363D] flex flex-col justify-between shrink-0 overflow-y-auto z-10 p-4 space-y-4">
              <div className="space-y-4">
                {/* Mobile Quick Map View Button */}
                <div className="block md:hidden bg-[#21262D] border border-[#AEF5F0]/40 rounded-xl p-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🗺️</span>
                      <div>
                        <div className="text-xs font-bold text-white">Interactive Live Map</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {journey.activeRoute ? journey.activeRoute.name : 'View roads & GPS'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveBottomNav('Map')}
                      className="px-2.5 py-1 rounded-lg bg-[#AEF5F0] text-slate-950 font-bold text-xs shadow cursor-pointer shrink-0"
                    >
                      View Map →
                    </button>
                  </div>
                </div>

                {/* Destination Search & Autocomplete */}
                <div className="space-y-2 relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => {
                        if (searchQuery.trim().length > 0) setShowSearchResults(true);
                      }}
                      placeholder={t.searchPlaceholder}
                      className="w-full bg-[#21262D] border border-[#30363D] rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#AEF5F0] shadow-inner"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    {isSearching ? (
                      <div className="absolute right-3 top-3 w-3.5 h-3.5 border-2 border-[#AEF5F0] border-t-transparent rounded-full animate-spin"></div>
                    ) : searchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                          setShowSearchResults(false);
                        }}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs p-0.5 rounded cursor-pointer"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>

                  {/* Floating Autocomplete Dropdown */}
                  {showSearchResults && (
                    <div className="absolute top-11 left-0 right-0 z-50 bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-[#30363D]">
                      {isSearching && searchResults.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-[#AEF5F0] border-t-transparent rounded-full animate-spin"></span>
                          <span>Searching live locations...</span>
                        </div>
                      )}

                      {searchResults.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectDestination(item)}
                          className="p-3 hover:bg-[#21262D] cursor-pointer transition flex items-start gap-2.5 text-xs group"
                        >
                          <span className="text-base mt-0.5 shrink-0">📍</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white group-hover:text-[#AEF5F0] truncate">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              {item.displayName || item.roadName}
                            </div>
                            <div className="text-[9px] font-mono text-cyan-400 mt-0.5">
                              {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-[#AEF5F0] opacity-0 group-hover:opacity-100 transition shrink-0 self-center">
                            Select →
                          </span>
                        </div>
                      ))}

                      {!isSearching && searchResults.length === 0 && searchQuery.trim().length > 0 && (
                        <div className="p-4 text-center space-y-2">
                          <p className="text-xs text-slate-300 font-medium">
                            No exact place found for "{searchQuery}"
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Try searching landmark names like "Medical College", "Jhansi Fort", "Station", "Elite", "Gwalior", or "Delhi".
                          </p>
                          <div className="flex flex-wrap justify-center gap-1 pt-1">
                            {['Medical College', 'Railway Station', 'Jhansi Fort', 'Elite Crossing'].map((kw) => (
                              <button
                                key={kw}
                                type="button"
                                onClick={() => handleSearch(kw)}
                                className="px-2 py-0.5 bg-[#21262D] hover:bg-[#AEF5F0]/20 text-[#AEF5F0] rounded text-[10px] cursor-pointer border border-[#30363D]"
                              >
                                {kw}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Origin & Destination Display */}
                <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-3 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-[#AEF5F0] border-2 border-white shrink-0 mt-0.5"></span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Source / Start Location</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded border border-emerald-500/30">
                            Live GPS
                          </span>
                        </div>
                        <div className="font-medium text-slate-200 mt-0.5">{journey.origin.name}</div>
                        <div className="text-[9px] font-mono text-cyan-400">
                          {journey.origin.lat.toFixed(4)}, {journey.origin.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAcquireRealGps}
                      title="Locate via device GPS"
                      className="px-2 py-1 rounded bg-[#AEF5F0]/15 hover:bg-[#AEF5F0] border border-[#AEF5F0]/30 text-[#AEF5F0] hover:text-slate-950 font-bold text-[10px] transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <svg className={`w-3 h-3 ${isAcquiringGps ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
                      <span>{isAcquiringGps ? 'Locating...' : 'Refresh GPS'}</span>
                    </button>
                  </div>

                  {gpsNotice && (
                    <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded my-1">
                      {gpsNotice}
                    </div>
                  )}

                  <div className="border-l-2 border-dashed border-[#30363D] ml-1.5 h-3"></div>

                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 truncate">
                      <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shrink-0 mt-0.5"></span>
                      <div className="truncate">
                        <div className="text-[10px] text-slate-400">Destination</div>
                        <div className={`font-bold text-xs truncate ${journey.destination?.name ? 'text-[#AEF5F0]' : 'text-slate-400 italic'}`}>
                          {journey.destination?.name || 'Search destination above'}
                        </div>
                      </div>
                    </div>
                    {journey.destination?.name && !journey.isNavigating && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          realtimeSync.setDestination({ name: '', lat: 0, lng: 0 });
                        }}
                        className="text-[10px] text-slate-400 hover:text-red-400 underline cursor-pointer shrink-0"
                      >
                        Change
                      </button>
                    )}
                  </div>
                </div>

                {/* STAGE 1: Destination NOT yet selected -> Ask to search destination. DO NOT ask vehicle type yet! */}
                {!journey.destination?.name && (
                  <div key="stage-step1" className="animate-section-smooth bg-[#21262D]/60 border border-dashed border-[#30363D] rounded-xl p-3.5 text-center space-y-1.5">
                    <div className="w-8 h-8 rounded-full bg-[#AEF5F0]/15 text-[#AEF5F0] flex items-center justify-center mx-auto text-sm">
                      🔍
                    </div>
                    <div className="text-xs font-bold text-slate-200">Step 1: Search & Select Destination</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Search your destination in the box above. Vehicle type and optimal routes will be calculated once destination is chosen.
                    </p>
                  </div>
                )}

                {/* STAGE 2: Destination IS selected, but route not yet active -> Prompt Vehicle Type & Show Optimal Routes */}
                {journey.destination?.name && !journey.activeRoute && (
                  <div key="stage-step2" className="animate-section-smooth space-y-3">
                    {/* Vehicle Selection */}
                    <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>🚗</span>
                            <span>Step 2: Select Vehicle Type</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Calculates real transit speeds & optimal paths
                          </div>
                        </div>
                        {isCalculatingRoutes && (
                          <span className="w-4 h-4 border-2 border-[#AEF5F0] border-t-transparent rounded-full animate-spin"></span>
                        )}
                      </div>

                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { id: 'car', label: 'Car', icon: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z', speed: '~54 km/h' },
                          { id: 'bike', label: 'Bike', icon: 'M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L9 6H6m6 11.5l3.5-7 3.5 2', speed: '~42 km/h' },
                          { id: 'van', label: 'Van', icon: 'M1 5h16v12H1zM17 9l4 2v6h-4', speed: '~48 km/h' },
                          { id: 'bus', label: 'Bus', icon: 'M4 3h16v16H4zM4 11h16', speed: '~36 km/h' },
                          { id: 'truck', label: 'Truck', icon: 'M1 3h15v13H1zM16 8h4l3 3v5h-7z', speed: '~32 km/h' },
                        ].map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleVehicleSelect(v.id as VehicleType)}
                            className={`py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 border transition cursor-pointer ${
                              journey.vehicleType === v.id
                                ? 'bg-[#AEF5F0]/20 border-[#AEF5F0] text-[#AEF5F0] shadow-md shadow-[#AEF5F0]/20 font-bold'
                                : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={v.icon}/></svg>
                            <span className="text-[10px] font-semibold">{v.label}</span>
                            <span className="text-[8px] text-slate-500">{v.speed}</span>
                          </button>
                        ))}
                      </div>

                      {journey.alternativeRoutes.length === 0 && !isCalculatingRoutes && (
                        <button
                          type="button"
                          onClick={() => handleVehicleSelect(journey.vehicleType || 'car')}
                          className="w-full py-2.5 rounded-lg bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-[#AEF5F0]/25"
                        >
                          <span>🔍 Find Optimal Routes for {journey.vehicleType.toUpperCase()}</span>
                        </button>
                      )}
                    </div>

                    {/* Step 3: Optimal Routes Choice */}
                    {journey.alternativeRoutes && journey.alternativeRoutes.length > 0 && (
                      <div key="stage-step3-routes" className="animate-section-smooth bg-[#21262D] border border-[#AEF5F0]/40 rounded-xl p-3 space-y-2.5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>🗺️</span>
                              <span>Step 3: Choose an Optimal Route</span>
                            </div>
                            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                              {journey.alternativeRoutes.length} optimal paths calculated
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400">
                          Select one route below. <span className="text-slate-200 font-semibold">Other optimal routes will disappear</span> once selected.
                        </p>

                        <div className="space-y-2">
                          {journey.alternativeRoutes.map((alt) => (
                            <div
                              key={alt.id}
                              onClick={() => handleSelectOptimalRoute(alt.id)}
                              className="p-2.5 rounded-xl border border-[#30363D] bg-[#161B22] hover:border-[#AEF5F0] hover:bg-[#1c222b] cursor-pointer transition flex items-center justify-between group"
                              style={{ borderLeftWidth: '4px', borderLeftColor: alt.color }}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-white group-hover:text-[#AEF5F0] truncate">
                                    {alt.name}
                                  </span>
                                  {alt.isRecommended && (
                                    <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded shrink-0">
                                      Fastest
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {alt.viaRoads?.join(' • ') || 'Main Arterial Corridor'}
                                </div>
                                <div className="text-xs font-mono font-bold text-white mt-1 flex items-center gap-2">
                                  <span className="text-cyan-400">{alt.distanceKm} km</span>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-emerald-400">{alt.durationMinutes} min</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOptimalRoute(alt.id);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 shrink-0 shadow-md shadow-[#AEF5F0]/25 transition cursor-pointer"
                              >
                                Select Route →
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STAGE 3: Route IS Chosen -> Show Active Route Telemetry, Navigation, and Drive Controls */}
                {journey.activeRoute && journey.alternativeRoutes.length === 0 && (
                  <div key="stage-step4-active" className="animate-section-smooth space-y-3">
                    {/* Chosen Route Info Banner */}
                    <div className="bg-[#21262D] border border-[#AEF5F0]/50 rounded-xl p-3 space-y-2 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#AEF5F0] animate-pulse"></span>
                          <span className="font-bold text-xs text-white truncate max-w-[170px]">
                            {journey.activeRoute.name}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold bg-[#AEF5F0]/15 text-[#AEF5F0] px-1.5 py-0.5 rounded border border-[#AEF5F0]/30 uppercase">
                          {journey.vehicleType}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#30363D] text-xs font-mono">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-sans">Distance</span>
                          <span className="font-bold text-white">{journey.remainingDistanceKm} km</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-sans">Est. Time</span>
                          <span className="font-bold text-emerald-400">{journey.remainingDurationMinutes} min</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-sans">ETA</span>
                          <span className="font-bold text-cyan-400">{journey.eta}</span>
                        </div>
                      </div>

                      {!journey.isNavigating && (
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Other routes hidden</span>
                          <button
                            type="button"
                            onClick={() => realtimeSync.showOptimalRoutesAgain()}
                            className="text-[10px] text-[#AEF5F0] hover:text-white font-semibold underline cursor-pointer"
                          >
                            ⇄ Compare Other Routes
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Primary Navigation Controls */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={toggleNavigation}
                          className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer active:scale-98 ${
                            journey.isNavigating
                              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                              : 'bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 shadow-md shadow-[#AEF5F0]/25'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            {journey.isNavigating ? (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            )}
                          </svg>
                          <span>{journey.isNavigating ? 'Pause Navigation' : 'Start Navigation'}</span>
                        </button>

                        {journey.isNavigating && (
                          <button
                            onClick={handleStopNavigation}
                            title="Cancel & Reset Trip"
                            className="px-3 py-3 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white text-xs font-bold transition cursor-pointer"
                          >
                            Stop
                          </button>
                        )}
                      </div>

                      {/* Simulation Controls & Speed Multiplexer */}
                      <div className="bg-[#21262D] p-2.5 rounded-xl border border-[#30363D] space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-emerald-400">DRIVE SIMULATION</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 4].map((spd) => (
                              <button
                                key={spd}
                                onClick={() => handleSpeedChange(spd)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition ${
                                  (journey.simulationSpeed || 1) === spd
                                    ? 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950 font-bold'
                                    : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:text-white'
                                }`}
                              >
                                {spd}x
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={handleAdvanceStep}
                            disabled={!journey.isNavigating}
                            className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                              journey.isNavigating
                                ? 'bg-[#AEF5F0]/15 border border-[#AEF5F0]/30 hover:bg-[#AEF5F0] text-[#AEF5F0] hover:text-slate-950'
                                : 'bg-[#161B22] text-slate-500 border border-[#30363D] cursor-not-allowed'
                            }`}
                          >
                            <span>Step Forward →</span>
                          </button>
                          <button
                            onClick={() => setIsReportHazardOpen(true)}
                            className="py-1 px-2.5 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500 border border-amber-500/40 text-amber-300 hover:text-white transition cursor-pointer"
                          >
                            ⚠ Report Hazard
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Current Journey Stats Card & Speedometer */}
                    <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-3">
                      <div className="text-xs font-semibold text-white mb-2 flex items-center justify-between">
                        <span>Live Telemetry</span>
                        <span className="text-[10px] text-cyan-400 font-mono">
                          {journey.progressPercent}% Completed
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="text-slate-400">Distance Left:</span>
                            <span className="font-mono font-bold text-white">
                              {journey.remainingDistanceKm} km
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="text-slate-400">Est. Time:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {journey.remainingDurationMinutes} min
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="text-slate-400">ETA:</span>
                            <span className="font-mono font-bold text-cyan-400">
                              {journey.eta}
                            </span>
                          </div>
                        </div>

                        {/* Speed Gauge */}
                        <div className="w-16 h-16 rounded-full border-4 border-[#AEF5F0]/40 bg-[#AEF5F0]/10 flex flex-col items-center justify-center text-center">
                          <span className="text-base font-extrabold text-white leading-none">
                            {journey.isNavigating ? journey.currentSpeedKmh : 0}
                          </span>
                          <span className="text-[8px] text-slate-400 uppercase">km/h</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2.5">
                        <div className="w-full bg-[#161B22] h-1.5 rounded-full overflow-hidden border border-[#30363D]">
                          <div
                            className="bg-[#AEF5F0] h-full rounded-full transition-all duration-300 shadow"
                            style={{ width: `${journey.progressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Route Status Card */}
                <div
                  onClick={() => setActiveBottomNav('Route')}
                  className="bg-[#21262D] border border-[#30363D] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-slate-500 transition"
                >
                  <div>
                    <div className="text-[10px] text-slate-400">Active Corridor</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${
                        journey.activeRoute ? (journey.activeRouteId === 'route_b' ? 'bg-emerald-400' : 'bg-[#AEF5F0]') : 'bg-slate-500'
                      }`}></span>
                      <span className="text-xs font-bold text-white truncate max-w-[200px]">
                        {journey.activeRoute ? journey.activeRoute.name : 'Standby / Awaiting Destination'}
                      </span>
                    </div>
                  </div>
                  <span className="text-slate-400 text-xs">View Turn Details ›</span>
                </div>
              </div>
            </div>

            {/* Center: Interactive Map with Top HUD and Overlays */}
            <div className="flex-1 relative h-full hidden md:block">
              <RoutePilotMap
                mode="driver"
                hazards={hazards}
                sensorNodes={sensorNodes}
                journey={journey}
                onCommitRoute={handleCommitRoute}
                theme={state.appSettings.mapTheme}
                onToggleTheme={() => realtimeSync.toggleMapTheme()}
                onChangeTheme={(t) => realtimeSync.setMapTheme(t)}
              />

              {/* Top HUD Banner on Map */}
              {journey.isNavigating && currentManeuver && (
                <div className="absolute top-4 left-4 z-[995] bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] rounded-2xl p-3 shadow-2xl flex items-center gap-3.5 max-w-md animate-fade-in">
                  <div className="w-11 h-11 rounded-xl bg-[#AEF5F0]/20 border border-[#AEF5F0] flex items-center justify-center shrink-0">
                    {getTurnIcon(currentManeuver.turnType)}
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-cyan-400 font-semibold uppercase">
                      In {currentManeuver.distanceMeters || 200} m
                    </div>
                    <div className="text-xs font-bold text-white leading-snug">
                      {currentManeuver.instruction}
                    </div>
                    {currentManeuver.roadName && (
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {currentManeuver.roadName}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleTestVoice}
                    title="Repeat voice maneuver"
                    className="p-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-slate-300 hover:text-white cursor-pointer ml-auto shrink-0"
                  >
                    🔊
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Hazards, Alternatives, Live Trip Status */}
            <div className="w-88 bg-[#161B22] border-l border-[#30363D] flex flex-col justify-between shrink-0 p-4 space-y-4 overflow-y-auto z-10 hidden lg:flex">
              <div className="space-y-4">
                {/* 1. Prominent Hazard Alert Box */}
                {journey.detectedHazard && journey.diversionState === 'HAZARD_DETECTED' && (
                  <div className="bg-gradient-to-br from-red-950/80 via-[#1c0f18] to-[#161B22] border-2 border-red-500 rounded-2xl p-4 shadow-2xl shadow-red-950/50 animate-section-smooth transition-all duration-300">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400 shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-red-200 tracking-wide uppercase">HAZARD DETECTED AHEAD</h4>
                        <p className="text-xs text-red-300 font-medium">
                          {journey.detectedHazard.type} ahead on your route
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-red-500/20 mb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Severity</span>
                        <span className="font-bold text-red-400 uppercase">{journey.detectedHazard.severity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Type</span>
                        <span className="font-medium text-slate-200">{journey.detectedHazard.type}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block">Location</span>
                        <span className="font-semibold text-slate-200">{journey.detectedHazard.locationName}</span>
                      </div>
                    </div>

                    {/* OK - Find Alternate Routes Action */}
                    <button
                      onClick={handleOkFindAlternates}
                      className="w-full py-3 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#AEF5F0]/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                    >
                      <span>OK – Find Alternate Routes</span>
                    </button>
                  </div>
                )}

                {/* 2. Alternative Routes Section */}
                {journey.alternativeRoutes && journey.alternativeRoutes.length > 0 && (
                  <div className="bg-[#21262D] border border-[#30363D] rounded-2xl p-4 shadow-lg space-y-3">
                    <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                        <span className="font-bold text-xs text-white">Alternative Routes</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        {journey.alternativeRoutes.length} available
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      Routes are displayed on the map. Select below or move onto a route to commit.
                    </div>

                    {/* List of alternative route options */}
                    <div className="space-y-2">
                      {journey.alternativeRoutes.map((alt) => (
                        <div
                          key={alt.id}
                          onClick={() => handleCommitRoute(alt.id)}
                          className="p-2.5 rounded-xl border border-[#30363D] bg-[#161B22] hover:border-slate-500 cursor-pointer transition flex items-center justify-between"
                          style={{ borderLeftWidth: '4px', borderLeftColor: alt.color }}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white">{alt.name}</span>
                              {alt.isRecommended && (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                              {alt.distanceKm} km • {alt.durationMinutes} min
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCommitRoute(alt.id);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#21262D] hover:bg-[#AEF5F0] text-slate-200 hover:text-slate-950 font-bold border border-[#30363D] transition cursor-pointer"
                          >
                            Follow Route
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Live Trip Status Progress Card */}
                <div className="bg-[#21262D] border border-[#30363D] rounded-2xl p-4 shadow-lg space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <svg className="w-4 h-4 text-[#AEF5F0]" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/></svg>
                    <span>Trip Summary</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Journey Progress</span>
                      <span className="font-mono text-[#AEF5F0] font-bold">{journey.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-[#161B22] h-2 rounded-full overflow-hidden border border-[#30363D]">
                      <div
                        className="bg-[#AEF5F0] h-full rounded-full transition-all duration-500 shadow-md shadow-[#AEF5F0]/50"
                        style={{ width: `${journey.progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#30363D]">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Distance Left</span>
                      <span className="font-mono font-bold text-white">{journey.remainingDistanceKm} km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">ETA</span>
                      <span className="font-mono font-bold text-white">{journey.eta}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Driver Action Buttons */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setIsReportHazardOpen(true)}
                    className="p-2.5 rounded-xl bg-[#21262D] hover:bg-amber-600/20 border border-[#30363D] hover:border-amber-500 text-amber-300 font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>⚠</span>
                    <span>Report Hazard</span>
                  </button>
                  <button
                    onClick={() => setIsSosOpen(true)}
                    className="p-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>🚨</span>
                    <span>Emergency SOS</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-2.5 text-center text-[10px] text-slate-400">
                Intelligent Multi-Route Dynamic Diversion Active
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: MAP (Fullscreen Immersive Navigation View with Top HUD) */}
        {activeBottomNav === 'Map' && (
          <div key="driver-tab-map" className="animate-tab-switch flex-1 relative w-full h-full">
            <RoutePilotMap
              mode="driver"
              hazards={hazards}
              sensorNodes={sensorNodes}
              journey={journey}
              onCommitRoute={handleCommitRoute}
              theme={state.appSettings.mapTheme}
              onToggleTheme={() => realtimeSync.toggleMapTheme()}
              onChangeTheme={(t) => realtimeSync.setMapTheme(t)}
            />

            {/* Turn-by-Turn Maneuver HUD Banner */}
            {journey.isNavigating && currentManeuver && (
              <div className="absolute top-4 left-4 right-16 sm:right-auto z-[995] bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] rounded-2xl p-3 shadow-2xl flex items-center gap-3.5 max-w-md animate-fade-in">
                <div className="w-12 h-12 rounded-xl bg-[#AEF5F0]/20 border border-[#AEF5F0] flex items-center justify-center shrink-0">
                  {getTurnIcon(currentManeuver.turnType)}
                </div>
                <div className="truncate">
                  <div className="text-[11px] font-mono text-cyan-400 font-semibold uppercase">
                    In {currentManeuver.distanceMeters || 250} m
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    {currentManeuver.instruction}
                  </div>
                  {currentManeuver.roadName && (
                    <div className="text-[10px] text-slate-400 truncate">
                      {currentManeuver.roadName}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleTestVoice}
                  title="Repeat Voice Announcement"
                  className="p-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-slate-200 cursor-pointer ml-auto shrink-0"
                >
                  🔊
                </button>
              </div>
            )}

            {/* Speedometer HUD Overlay (Bottom Left) */}
            <div className="absolute bottom-20 left-4 z-[995] bg-[#161B22]/90 backdrop-blur-md border border-[#30363D] rounded-2xl p-3 shadow-2xl flex items-center gap-3">
              <div className="w-14 h-14 rounded-full border-4 border-[#AEF5F0] bg-[#AEF5F0]/15 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-extrabold text-white leading-none">
                  {journey.isNavigating ? journey.currentSpeedKmh : 0}
                </span>
                <span className="text-[8px] text-slate-400 uppercase">km/h</span>
              </div>
              <div className="text-xs">
                <div className="text-[10px] text-slate-400">Speed Limit</div>
                <div className="w-7 h-7 rounded-full border-2 border-red-500 text-red-400 font-bold flex items-center justify-center text-[10px]">
                  50
                </div>
              </div>
            </div>

            {/* Floating Hazard Alert Overlay on Map */}
            {journey.detectedHazard && journey.diversionState === 'HAZARD_DETECTED' && (
              <div className="absolute top-20 left-4 right-4 sm:left-auto sm:right-4 z-[1000] max-w-sm bg-gradient-to-br from-red-950/90 to-[#161B22] border-2 border-red-500 rounded-2xl p-4 shadow-2xl animate-section-smooth transition-all duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <div className="font-bold text-white text-xs uppercase tracking-wide">
                    Hazard Detected: {journey.detectedHazard.type}
                  </div>
                </div>
                <p className="text-[11px] text-slate-300 mb-3">
                  Located near {journey.detectedHazard.locationName}. Rerouting suggested.
                </p>
                <button
                  onClick={handleOkFindAlternates}
                  className="w-full py-2.5 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#AEF5F0]/25 cursor-pointer"
                >
                  OK – Find Alternate Routes
                </button>
              </div>
            )}

            {/* Floating Alternate Routes Selector on Map */}
            {journey.alternativeRoutes && journey.alternativeRoutes.length > 0 && (
              <div className="absolute top-20 right-4 z-[1000] max-w-xs bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] rounded-2xl p-3 shadow-2xl space-y-2">
                <div className="text-xs font-bold text-white flex items-center justify-between border-b border-[#30363D] pb-1.5">
                  <span>Available Alternates</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">{journey.alternativeRoutes.length} paths</span>
                </div>
                <div className="space-y-1.5">
                  {journey.alternativeRoutes.map((alt) => (
                    <div
                      key={alt.id}
                      onClick={() => handleCommitRoute(alt.id)}
                      className="p-2 rounded-xl bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] cursor-pointer flex items-center justify-between text-xs"
                      style={{ borderLeftWidth: '3px', borderLeftColor: alt.color }}
                    >
                      <div>
                        <div className="font-bold text-white text-[11px]">{alt.name}</div>
                        <div className="text-[10px] text-slate-400">{alt.distanceKm} km • {alt.durationMinutes} min</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCommitRoute(alt.id); }}
                        className="px-2 py-0.5 rounded bg-[#AEF5F0] text-slate-950 font-bold text-[10px] cursor-pointer"
                      >
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Floating Navigation Controls */}
            <div className="absolute bottom-20 right-4 z-[995] flex items-center gap-2 bg-[#161B22]/90 backdrop-blur-md p-2 rounded-2xl border border-[#30363D] shadow-2xl">
              <button
                onClick={toggleNavigation}
                disabled={!journey.destination?.name}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  !journey.destination?.name
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : journey.isNavigating
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950'
                }`}
              >
                <span>{journey.isNavigating ? '⏸ Pause' : '▶ Start'}</span>
              </button>
              <button
                onClick={handleAdvanceStep}
                disabled={!journey.isNavigating}
                className="px-3 py-2 rounded-xl bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-slate-200 text-xs font-semibold cursor-pointer"
                title="Simulate step forward"
              >
                Step →
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: ROUTE (Turn-by-Turn Maneuvers & Alternatives List) */}
        {activeBottomNav === 'Route' && (
          <div key="driver-tab-route" className="animate-tab-switch flex-1 w-full h-full bg-[#0D1117] p-4 sm:p-6 overflow-y-auto space-y-5 max-w-4xl mx-auto">
            {/* Header Card */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-[#AEF5F0] uppercase tracking-wide">Active Navigation Route</div>
                <h2 className="text-lg font-extrabold text-white mt-1">
                  {journey.activeRoute ? journey.activeRoute.name : 'No Active Route Selected'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Origin: <span className="text-slate-200 font-semibold">{journey.origin.name}</span> → Destination:{' '}
                  <span className="text-[#AEF5F0] font-semibold">{journey.destination.name || 'Not set'}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-[#21262D] px-3.5 py-2 rounded-xl border border-[#30363D] text-center">
                  <div className="text-[10px] text-slate-400">Total Distance</div>
                  <div className="text-sm font-bold text-white font-mono">{journey.totalDistanceKm} km</div>
                </div>
                <div className="bg-[#21262D] px-3.5 py-2 rounded-xl border border-[#30363D] text-center">
                  <div className="text-[10px] text-slate-400">ETA</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">{journey.eta}</div>
                </div>
              </div>
            </div>

            {/* Turn-by-Turn Step List */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🧭</span>
                  <span>Turn-by-Turn Driving Directions</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {journey.activeRoute?.steps?.length || 4} steps
                </span>
              </div>

              <div className="space-y-3">
                {(journey.activeRoute?.steps || []).map((step, idx) => {
                  const totalSteps = journey.activeRoute?.steps?.length || 1;
                  const currentStepIdx = Math.min(
                    totalSteps - 1,
                    Math.floor((journey.currentLocation.pointIndex / Math.max(1, (journey.activeRoute?.coordinates.length || 1) - 1)) * totalSteps)
                  );
                  const isCurrent = currentStepIdx === idx && journey.isNavigating;
                  const isPast = currentStepIdx > idx && journey.isNavigating;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition flex items-center gap-3.5 ${
                        isCurrent
                          ? 'bg-[#AEF5F0]/15 border-[#AEF5F0] shadow-md ring-1 ring-[#AEF5F0]/40'
                          : isPast
                          ? 'bg-[#161B22] border-[#21262D] opacity-60'
                          : 'bg-[#21262D] border-[#30363D]'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isCurrent
                          ? 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950 font-bold'
                          : 'bg-[#161B22] border-[#30363D] text-slate-300'
                      }`}>
                        {getTurnIcon(step.turnType)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{step.instruction}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-[#AEF5F0] text-slate-950 px-1.5 py-0.2 rounded font-bold uppercase animate-pulse">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{step.roadName}</div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-bold text-slate-200">
                          {step.distanceMeters} m
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ~{Math.round(step.durationSeconds / 60) || 1} min
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(!journey.activeRoute || !journey.activeRoute.steps || journey.activeRoute.steps.length === 0) && (
                  <div className="text-center py-6 text-slate-400 text-xs italic">
                    Select a destination on the Cockpit or Map tab to generate turn-by-turn maneuvers.
                  </div>
                )}
              </div>
            </div>

            {/* Alternative Routes Comparison Section */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Alternative Route Comparison</h3>
                  <p className="text-xs text-slate-400">Compare bypass paths avoiding road hazards</p>
                </div>
                <button
                  onClick={handleOkFindAlternates}
                  className="px-3 py-1.5 rounded-lg bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 text-xs font-bold transition cursor-pointer"
                >
                  Recalculate
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(journey.alternativeRoutes.length > 0 ? journey.alternativeRoutes : [
                  { id: 'route_b', name: 'Route B (West Bypass)', color: '#10b981', distanceKm: 5.4, durationMinutes: 14, isRecommended: true, viaRoads: ['Gwalior Bypass Rd'] },
                  { id: 'route_c', name: 'Route C (Outer Highway)', color: '#f59e0b', distanceKm: 6.8, durationMinutes: 17, isRecommended: false, viaRoads: ['Station Outer Bypass'] },
                  { id: 'route_d', name: 'Route D (Cantonment East)', color: '#a855f7', distanceKm: 6.1, durationMinutes: 16, isRecommended: false, viaRoads: ['Cantonment Arterial'] },
                ]).map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-[#30363D] bg-[#21262D] space-y-3 flex flex-col justify-between"
                    style={{ borderTopWidth: '4px', borderTopColor: r.color }}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{r.name}</span>
                        {r.isRecommended && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">Via {r.viaRoads?.[0] || 'Corridor'}</div>
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-[#30363D] text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Distance</span>
                          <span className="text-white font-bold">{r.distanceKm} km</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Duration</span>
                          <span className="text-emerald-400 font-bold">{r.durationMinutes} min</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCommitRoute(r.id)}
                      className="w-full py-2 rounded-lg bg-[#161B22] hover:bg-[#AEF5F0] border border-[#30363D] text-slate-200 hover:text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      Follow This Route
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: ALERTS (Hazard Center & Report Hazard) */}
        {activeBottomNav === 'Alerts' && (
          <div key="driver-tab-alerts" className="animate-tab-switch flex-1 w-full h-full bg-[#0D1117] p-4 sm:p-6 overflow-y-auto space-y-5 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-xl">
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>🚨</span>
                  <span>Road & Bridge Hazard Center</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live detection, structural sensor alerts, and driver crowd-sourced reports
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestVoice}
                  className="px-3 py-2 rounded-xl bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  🔊 Test Audio Warning
                </button>
                <button
                  onClick={() => setIsReportHazardOpen(true)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>+</span>
                  <span>Report Hazard</span>
                </button>
              </div>
            </div>

            {/* Active Urgent Route Hazard Banner */}
            {journey.detectedHazard && (
              <div className="bg-gradient-to-r from-red-950/80 via-[#211116] to-[#161B22] border-2 border-red-500 rounded-2xl p-5 shadow-2xl animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
                      !
                    </div>
                    <div>
                      <div className="text-xs font-bold text-red-200 uppercase tracking-wide">
                        URGENT HAZARD BLOCKING YOUR ROUTE
                      </div>
                      <div className="text-base font-extrabold text-white">{journey.detectedHazard.type}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-bold uppercase">
                    {journey.detectedHazard.severity}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300 py-2 border-y border-red-500/30">
                  <div><span className="text-slate-400">Road:</span> {journey.detectedHazard.roadName}</div>
                  <div><span className="text-slate-400">Location:</span> {journey.detectedHazard.locationName}</div>
                  <div><span className="text-slate-400">Affected Zone:</span> {journey.detectedHazard.affectedRadius}m radius</div>
                </div>

                <button
                  onClick={handleOkFindAlternates}
                  className="w-full py-3 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#AEF5F0]/25 cursor-pointer transition"
                >
                  OK – Find Alternate Routes Now
                </button>
              </div>
            )}

            {/* List of Active City Hazards */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
                <h3 className="text-sm font-bold text-white">All Active Network Hazards ({hazards.length})</h3>
                <span className="text-xs text-slate-400">Updated in real-time</span>
              </div>

              {hazards.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto text-xl">
                    ✓
                  </div>
                  <div className="font-bold text-white text-sm">All Clear — No Active Road Hazards</div>
                  <p className="text-xs text-slate-400">
                    Roads are clear. Trigger a virtual sensor event or report a hazard to simulate an alert.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {hazards.map((h) => {
                    const isCrit = h.severity === 'CRITICAL' || h.severity === 'BLOCKED';
                    return (
                      <div
                        key={h.hazardId}
                        className="p-3.5 rounded-xl border border-[#30363D] bg-[#21262D] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-bold ${
                            isCrit ? 'bg-red-600/30 border border-red-500 text-red-400' : 'bg-amber-600/30 border border-amber-500 text-amber-400'
                          }`}>
                            ⚠
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white">{h.type}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isCrit ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {h.severity}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 mt-0.5">{h.locationName} • {h.roadName}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{h.description}</div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 text-xs">
                          <div className="text-[10px] text-slate-400">Reported: {h.createdAt}</div>
                          <div className="text-[10px] text-[#AEF5F0] font-mono mt-0.5">Source: {h.source}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 5: MORE (Driver Profile, Audio, Simulation & SOS) */}
        {activeBottomNav === 'More' && (
          <div key="driver-tab-more" className="animate-tab-switch flex-1 w-full h-full bg-[#0D1117] p-4 sm:p-6 overflow-y-auto space-y-5 max-w-4xl mx-auto">
            {/* Driver Profile Card */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#AEF5F0] flex items-center justify-center text-slate-950 text-xl font-bold shadow-lg shadow-[#AEF5F0]/25">
                  D1
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white">{journey.driverName || 'Driver 01'}</h2>
                    <span className="text-[10px] font-mono bg-[#AEF5F0]/15 text-[#AEF5F0] px-2 py-0.5 rounded border border-[#AEF5F0]/30 font-bold">
                      {journey.driverId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Vehicle: UP-93-BK-4029 ({journey.vehicleType.toUpperCase()})</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-[#21262D] px-3.5 py-2 rounded-xl border border-[#30363D] text-center">
                  <div className="text-[10px] text-slate-400">Driver Rating</div>
                  <div className="text-sm font-bold text-amber-400 font-mono">4.9 ★</div>
                </div>
                <div className="bg-[#21262D] px-3.5 py-2 rounded-xl border border-[#30363D] text-center">
                  <div className="text-[10px] text-slate-400">Safety Score</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">98%</div>
                </div>
              </div>
            </div>

            {/* Audio Voice Guidance Settings */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🔊</span>
                    <span>Voice Navigation Guidance</span>
                  </h3>
                  <p className="text-xs text-slate-400">Spoken hazard warnings and turn maneuvers</p>
                </div>

                <button
                  onClick={handleToggleVoice}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    voiceEnabled
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                      : 'bg-[#21262D] border-[#30363D] text-slate-400'
                  }`}
                >
                  {voiceEnabled ? 'Voice: Enabled' : 'Voice: Muted'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Language Switcher */}
                <div className="bg-[#21262D] p-3.5 rounded-xl border border-[#30363D] space-y-2">
                  <div className="text-slate-300 font-semibold">Speech Language</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleLanguage('en')}
                      className={`flex-1 py-2 rounded-lg font-bold border transition cursor-pointer ${
                        language === 'en'
                          ? 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950'
                          : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:text-white'
                      }`}
                    >
                      English (US)
                    </button>
                    <button
                      onClick={() => handleToggleLanguage('hi')}
                      className={`flex-1 py-2 rounded-lg font-bold border transition cursor-pointer ${
                        language === 'hi'
                          ? 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950'
                          : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:text-white'
                      }`}
                    >
                      हिन्दी (Hindi)
                    </button>
                  </div>
                </div>

                {/* Test Voice Guidance */}
                <div className="bg-[#21262D] p-3.5 rounded-xl border border-[#30363D] space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-slate-300 font-semibold">Audio Output Test</div>
                    <div className="text-[11px] text-slate-400">Test voice synthesizers in current language</div>
                  </div>
                  <button
                    onClick={handleTestVoice}
                    className="w-full py-2 rounded-lg bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#AEF5F0]/20"
                  >
                    <span>▶</span>
                    <span>{voiceTestFeedback || 'Play Test Voice Sample'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Emergency SOS & Safety Assistance */}
            <div className="bg-[#161B22] border border-red-500/40 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-red-500 text-xl">🚨</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Emergency Roadside Assistance</h3>
                    <p className="text-xs text-slate-400">Highway Patrol (112), Ambulance, Breakdown Support</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                In case of accident, bridge failure, severe breakdown, or road danger, trigger emergency dispatch immediately. Your live coordinates will be transmitted to emergency responders.
              </p>

              <button
                onClick={() => setIsSosOpen(true)}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition cursor-pointer"
              >
                Initiate Emergency SOS Assistance
              </button>
            </div>

            {/* System Health & Hardware Telemetry */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
                <h3 className="text-sm font-bold text-white">System Hardware & Telemetry</h3>
                <span className="text-xs text-emerald-400 font-semibold">All Systems Normal</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-[#21262D] p-2.5 rounded-xl border border-[#30363D]">
                  <span className="text-[10px] text-slate-400 block">ESP32 Bridge</span>
                  <span className="font-bold text-white">{state.appSettings.esp32Connected ? 'Connected' : 'Simulation Mode'}</span>
                </div>
                <div className="bg-[#21262D] p-2.5 rounded-xl border border-[#30363D]">
                  <span className="text-[10px] text-slate-400 block">Sensor Nodes</span>
                  <span className="font-bold text-emerald-400">{sensorNodes.length} Online</span>
                </div>
                <div className="bg-[#21262D] p-2.5 rounded-xl border border-[#30363D]">
                  <span className="text-[10px] text-slate-400 block">Routing Engine</span>
                  <span className="font-bold text-cyan-400">OSRM Online</span>
                </div>
                <div className="bg-[#21262D] p-2.5 rounded-xl border border-[#30363D]">
                  <span className="text-[10px] text-slate-400 block">Map Tiles</span>
                  <span className="font-bold text-white">{state.appSettings.mapTheme === 'satellite' ? 'Satellite' : 'OpenStreetMap'}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex-1 py-2.5 rounded-xl bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-slate-200 text-xs font-semibold cursor-pointer transition"
                >
                  Configure API Keys
                </button>
                <button
                  onClick={() => realtimeSync.resetDemo()}
                  className="py-2.5 px-4 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white text-xs font-bold cursor-pointer transition"
                >
                  Reset Trip Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Driver Bottom Navigation Bar */}
      <nav className="h-16 bg-[#161B22] border-t border-[#30363D] px-4 flex items-center justify-around z-30 shrink-0">
        {[
          { id: 'Home', label: t.navHome, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { id: 'Map', label: t.navMap, icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
          { id: 'Route', label: t.navRoute, icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          { id: 'Alerts', label: t.navAlerts, icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', badge: journey.detectedHazard ? 1 : hazards.filter(h => h.status === 'ACTIVE').length },
          { id: 'More', label: t.navMore, icon: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveBottomNav(tab.id as any)}
            className={`flex flex-col items-center gap-1 transition-colors duration-150 relative cursor-pointer px-3 py-1 rounded-xl ${
              activeBottomNav === tab.id
                ? 'text-[#AEF5F0] font-bold bg-[#AEF5F0]/10 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Arrival / Journey Completed Dialog */}
      {journey.status === 'ARRIVED' && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#161B22] border border-emerald-500/50 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">JOURNEY COMPLETED</h3>
              <p className="text-xs text-slate-300 mt-1">
                Safely reached <span className="text-emerald-400 font-bold">{journey.destination.name}</span>
              </p>
            </div>

            <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-4 grid grid-cols-2 gap-3 text-xs text-left">
              <div>
                <span className="text-slate-400 block text-[10px]">Distance Travelled</span>
                <span className="font-mono text-white font-bold">{journey.totalDistanceKm} km</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Journey Duration</span>
                <span className="font-mono text-white font-bold">{journey.remainingDurationMinutes || 18} min</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Hazards Encountered</span>
                <span className="font-mono text-amber-400 font-bold">{journey.hazardsEncounteredCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Route Diversions</span>
                <span className="font-mono text-emerald-400 font-bold">{journey.diversionCount}</span>
              </div>
            </div>

            <button
              onClick={() => realtimeSync.resetDemo()}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              Start New Journey / Reset Demo
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={state.appSettings}
      />

      {/* Report Hazard Modal */}
      <ReportHazardModal
        isOpen={isReportHazardOpen}
        onClose={() => setIsReportHazardOpen(false)}
        currentLat={journey.currentLocation.lat}
        currentLng={journey.currentLocation.lng}
      />

      {/* Emergency SOS Modal */}
      <EmergencySosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        lat={journey.currentLocation.lat}
        lng={journey.currentLocation.lng}
        driverId={journey.driverId}
      />
    </div>
  );
};
