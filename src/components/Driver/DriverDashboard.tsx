import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RoutePilotState, realtimeSync } from '../../services/realtimeSync';
import { RoutePilotMap } from '../Map/RoutePilotMap';
import { SettingsModal } from '../Common/SettingsModal';
import { ReportHazardModal } from './ReportHazardModal';
import { EmergencySosModal } from './EmergencySosModal';
import { AStarModal } from '../Common/AStarModal';
import { VehicleType, HazardType, HazardSeverity, RouteStep, RouteOption } from '../../types';
import { searchPlaces, reverseGeocode } from '../../services/geocodingService';
import { VoiceService } from '../../services/voiceService';
import { getVehicleSpeedProfile, formatDurationText } from '../../services/routingService';
import { getTranslation, translateText } from '../../services/i18n';
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
  const [isAStarModalOpen, setIsAStarModalOpen] = useState(false);
  const [showInlineAStarBreakdown, setShowInlineAStarBreakdown] = useState(false);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [isMapClearMode, setIsMapClearMode] = useState(false);
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

  // Gather all 3 candidate paths (or detours) for presentation
  const candidateRoutesList: RouteOption[] = useMemo(() => {
    if (state.aStarEvaluation && state.aStarEvaluation.routes && state.aStarEvaluation.routes.length > 0) {
      return state.aStarEvaluation.routes;
    }
    const list: RouteOption[] = [];
    if (journey.activeRoute) list.push(journey.activeRoute);
    if (journey.alternativeRoutes) {
      journey.alternativeRoutes.forEach((r) => {
        if (!list.some((existing) => existing.id === r.id)) list.push(r);
      });
    }
    return list;
  }, [state.aStarEvaluation, journey.activeRoute, journey.alternativeRoutes]);

  // Auto-acquire real live GPS on component mount so the driver's real position appears as Source
  useEffect(() => {
    let watchId: number | null = null;
    let isMounted = true;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsAcquiringGps(true);

      const handleSuccess = async (pos: GeolocationPosition) => {
        if (!isMounted) return;
        setIsAcquiringGps(false);
        const { latitude, longitude, heading, speed } = pos.coords;
        let placeName = 'Live Device Location';
        try {
          const rev = await reverseGeocode(latitude, longitude, state.appSettings.googleMapsApiKey);
          if (rev?.locationName) {
            placeName = rev.locationName;
          }
        } catch {}
        if (!isMounted) return;
        realtimeSync.updateDriverLocationFromGps(
          latitude,
          longitude,
          placeName,
          heading || undefined,
          speed || undefined
        );
      };

      const handleFallback = () => {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (err) => {
            if (!isMounted) return;
            setIsAcquiringGps(false);
            console.warn('GPS Notice (fallback):', err.message);
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 30000 }
        );
      };

      // Try high accuracy first (5s timeout)
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (err) => {
          console.warn('GPS High-Accuracy initial failed, trying standard accuracy:', err.message);
          handleFallback();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 5000 }
      );

      // Start continuous watchPosition so as driver moves or drives, source & current location stay live!
      try {
        watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            if (!isMounted) return;
            const { latitude, longitude, heading, speed } = pos.coords;
            realtimeSync.updateDriverLocationFromGps(
              latitude,
              longitude,
              undefined,
              heading || undefined,
              speed || undefined
            );
          },
          (err) => {
            console.warn('GPS watch error:', err.message);
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
      } catch (err) {
        console.warn('Failed to start watchPosition:', err);
      }
    }

    return () => {
      isMounted = false;
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Manual GPS acquisition
  const handleAcquireRealGps = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsAcquiringGps(true);

      const applyPos = async (pos: GeolocationPosition) => {
        setIsAcquiringGps(false);
        const { latitude, longitude, heading, speed } = pos.coords;
        let placeName = 'Live Device Location';
        try {
          const rev = await reverseGeocode(latitude, longitude, state.appSettings.googleMapsApiKey);
          if (rev?.locationName) {
            placeName = rev.locationName;
          }
        } catch {}
        realtimeSync.updateDriverLocationFromGps(
          latitude,
          longitude,
          placeName,
          heading || undefined,
          speed || undefined
        );
        VoiceService.speak(
          'Current location updated as source.',
          'वर्तमान स्थान को स्रोत के रूप में सेट किया गया।'
        );
      };

      navigator.geolocation.getCurrentPosition(
        applyPos,
        (err) => {
          // If high accuracy failed, try standard fallback
          navigator.geolocation.getCurrentPosition(
            applyPos,
            (err2) => {
              setIsAcquiringGps(false);
              console.warn(`GPS Notice: ${err2.message}. Ensure location permissions are allowed.`);
              setGpsNotice(
                language === 'hi'
                  ? 'कृपया ब्राउज़र में लोकेशन अनुमति (GPS) की अनुमति दें।'
                  : 'Please allow location permission in your browser.'
              );
              setTimeout(() => setGpsNotice(null), 5000);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
          );
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      console.warn('Geolocation API not supported in this browser.');
      setGpsNotice(
        language === 'hi'
          ? 'इस ब्राउज़र में जियोलोकेशन समर्थित नहीं है।'
          : 'Geolocation API not supported in this browser.'
      );
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
          const activePlacesKey = state.appSettings.placesApiKey || state.appSettings.googleMapsApiKey;
          const results = await searchPlaces(trimmed, activePlacesKey);
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

  const handleMapClickForDestination = async (lat: number, lng: number) => {
    if (journey.isNavigating) return;
    try {
      const geo = await reverseGeocode(lat, lng);
      const name = geo.locationName || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setSearchQuery(name);
      await realtimeSync.setDestination({
        name,
        lat,
        lng,
      });
    } catch {
      const name = `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setSearchQuery(name);
      await realtimeSync.setDestination({
        name,
        lat,
        lng,
      });
    }
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
    <div className={`flex flex-col h-full w-full max-w-full h-[100dvh] ${state.appSettings.appTheme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#0D1117] text-slate-100'} overflow-hidden font-sans select-none min-h-0`}>
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

          {/* Settings Icon */}
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
      <div className="flex-1 flex overflow-hidden relative min-h-0 w-full">
        {/* VIEW 1: HOME (Standard 3-Column Cockpit on Desktop, or Full Cockpit on Mobile) */}
        {activeBottomNav === 'Home' && (
          <div key="driver-tab-home" className="animate-tab-switch flex-1 flex w-full h-full min-h-0 overflow-hidden">
            {/* Left Column: Destination, Vehicle, Journey Controls */}
            <div className="w-full md:w-84 lg:w-88 bg-[#161B22] border-r border-[#30363D] flex flex-col justify-between shrink-0 overflow-y-auto z-10 p-4 space-y-4 min-h-0">
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

                {/* Mobile Hazard Alert Banner */}
                {journey.detectedHazard && journey.diversionState === 'HAZARD_DETECTED' && (
                  <div className="block lg:hidden bg-gradient-to-br from-red-950/95 to-[#161B22] border-2 border-red-500 rounded-xl p-3 shadow-xl animate-pulse">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-red-400 text-lg">⚠️</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold text-red-200 uppercase truncate">
                          {language === 'hi' ? 'सड़क पर आगे खतरा!' : 'HAZARD DETECTED AHEAD!'}
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium truncate">
                          {translateText(journey.detectedHazard.type, language)} • {journey.detectedHazard.locationName}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleOkFindAlternates();
                        setActiveBottomNav('Map');
                      }}
                      className="w-full mt-1.5 py-2.5 rounded-lg bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🔍</span>
                      <span>{language === 'hi' ? 'अन्य मार्ग खोजें' : 'Find Other Route'}</span>
                    </button>
                  </div>
                )}

                {/* Mobile Alternative Routes Selection List */}
                {journey.alternativeRoutes && journey.alternativeRoutes.length > 0 && (
                  <div className="block lg:hidden bg-[#21262D] border border-[#AEF5F0]/50 rounded-xl p-3 shadow-xl space-y-2">
                    <div className="flex items-center justify-between border-b border-[#30363D] pb-1.5">
                      <span className="text-xs font-bold text-[#AEF5F0]">
                        ⚡ {language === 'hi' ? 'उपलब्ध सर्वोत्तम मार्ग' : 'Optimal Routes Available'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        {journey.alternativeRoutes.length} {language === 'hi' ? 'मार्ग' : 'routes'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {journey.alternativeRoutes.map((alt) => (
                        <div
                          key={alt.id}
                          onClick={() => handleCommitRoute(alt.id)}
                          className="p-2 rounded-lg bg-[#161B22] border border-[#30363D] flex items-center justify-between text-xs cursor-pointer hover:border-[#AEF5F0] transition"
                          style={{ borderLeftWidth: '3px', borderLeftColor: alt.color }}
                        >
                          <div className="min-w-0 mr-2">
                            <div className="font-bold text-white text-xs truncate">{translateText(alt.name, language)}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {alt.distanceKm} km • {alt.durationMinutes} min
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCommitRoute(alt.id);
                            }}
                            className="px-2.5 py-1 rounded bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-[10px] cursor-pointer shrink-0"
                          >
                            {language === 'hi' ? 'यह मार्ग चुनें' : 'Select Route'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Destination Search & Autocomplete */}
                <div className="space-y-1.5 relative z-30">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <span>Destination Search</span>
                      <span className="text-[9px] font-bold bg-[#AEF5F0]/15 text-[#AEF5F0] border border-[#AEF5F0]/30 px-1.5 py-0.5 rounded">
                        Google Places Live
                      </span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => {
                        if (searchQuery.trim().length > 0) setShowSearchResults(true);
                      }}
                      placeholder="Search any city, landmark, station, or address..."
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
                    <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-[#30363D]/80">
                      {isSearching && (
                        <div className="p-3 text-center text-xs text-[#AEF5F0] flex items-center justify-center gap-2 bg-[#161B22]">
                          <span className="w-3.5 h-3.5 border-2 border-[#AEF5F0] border-t-transparent rounded-full animate-spin"></span>
                          <span>Searching Google Places in real time...</span>
                        </div>
                      )}

                      {searchResults.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectDestination(item)}
                          className="p-3 hover:bg-[#21262D] cursor-pointer transition flex items-start gap-2.5 text-xs group"
                        >
                          <span className="text-base mt-0.5 shrink-0 text-[#AEF5F0]">📍</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white group-hover:text-[#AEF5F0] truncate flex items-center gap-2">
                              <span>{item.name}</span>
                              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Real Place
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              {item.displayName || item.roadName}
                            </div>
                            <div className="text-[9px] font-mono text-cyan-400 mt-0.5 flex items-center gap-2">
                              <span>GPS: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}</span>
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
                            Try searching landmark names like "Taj Mahal", "Delhi", "Agra", "Kanpur", "Mumbai", or "Jhansi Fort".
                          </p>
                          <div className="flex flex-wrap justify-center gap-1 pt-1">
                            {['Taj Mahal', 'Delhi Airport', 'Kanpur Central', 'Jhansi Fort'].map((kw) => (
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
                <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-3 space-y-2.5 text-xs shadow-md">
                  {/* Source (Current Location) Item */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="relative flex items-center justify-center shrink-0 mt-1">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-sm"></span>
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping absolute opacity-75"></span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                            {language === 'hi' ? 'स्रोत: आपका वर्तमान स्थान' : 'Source: Your Current Location'}
                          </span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {language === 'hi' ? 'लाइव जीपीएस' : 'Live GPS'}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-100 text-xs mt-0.5 truncate" title={journey.origin.name}>
                          {journey.origin.name || (language === 'hi' ? 'वर्तमान स्थान (लाइव जीपीएस)' : 'Current Location (Live GPS)')}
                        </div>
                        <div className="text-[10px] font-mono text-cyan-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>📍 {journey.origin.lat.toFixed(5)}, {journey.origin.lng.toFixed(5)}</span>
                          <span className="text-slate-400 text-[9px]">• {language === 'hi' ? 'स्वचालित स्रोत' : 'Auto Source'}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1 leading-tight">
                          {language === 'hi'
                            ? '✓ आपका वर्तमान स्थान स्वचालित रूप से स्रोत (Source) चुना गया है। गंतव्य चुनते ही यहीं से नेविगेशन शुरू होगा।'
                            : '✓ Your current location is automatically active as Source. Any destination you search will calculate from here.'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAcquireRealGps}
                      title={language === 'hi' ? 'वर्तमान जीपीएस स्थान रिफ्रेश करें' : 'Refresh live GPS location'}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 border border-emerald-500/30 text-emerald-300 hover:text-slate-950 font-bold text-[10px] transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                    >
                      <svg className={`w-3 h-3 ${isAcquiringGps ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="7"/>
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                      </svg>
                      <span>{isAcquiringGps ? (language === 'hi' ? 'खोज रहे हैं...' : 'Locating...') : (language === 'hi' ? 'रिफ्रेश जीपीएस' : 'Refresh GPS')}</span>
                    </button>
                  </div>

                  {gpsNotice && (
                    <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded my-1 animate-fade-in flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{gpsNotice}</span>
                    </div>
                  )}

                  <div className="border-l-2 border-dashed border-[#30363D] ml-2 h-3.5"></div>

                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0 overflow-hidden">
                      <span className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shrink-0 mt-0.5 shadow-sm"></span>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">
                          {language === 'hi' ? 'गंतव्य (Destination)' : 'Destination'}
                        </div>
                        <div className={`font-bold text-xs truncate mt-0.5 ${journey.destination?.name ? 'text-[#AEF5F0]' : 'text-slate-400 italic'}`} title={journey.destination?.name || ''}>
                          {journey.destination?.name || (language === 'hi' ? 'ऊपर गंतव्य खोजें या मानचित्र पर टैप करें' : 'Search destination above or tap map')}
                        </div>
                      </div>
                    </div>
                    {journey.destination?.name && !journey.isNavigating && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          realtimeSync.setDestination({ name: '', lat: 0, lng: 0 });
                        }}
                        className="text-[10px] text-slate-400 hover:text-red-400 underline cursor-pointer shrink-0 py-1"
                      >
                        {t.changeDestinationBtn}
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
                    <div className="text-xs font-bold text-slate-200">{t.step1SearchSelect}</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {t.step1Desc}
                    </p>
                  </div>
                )}

                {/* STAGE 2: Destination IS selected -> Prompt Vehicle Type, Show 3 Candidate Paths & A* Optimal Evaluation */}
                {journey.destination?.name && (
                  <div key="stage-step2-routes" className="animate-section-smooth space-y-3">
                    {/* Vehicle Type Selection Bar - Only visible BEFORE journey navigation starts */}
                    {!journey.isNavigating && (
                      <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>🚗</span>
                              <span>{t.step2SelectVehicle}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {language === 'hi'
                                ? 'वाहन प्रकार चुनें — गति और सड़क प्रतिबंधों के आधार पर 3 मार्ग विश्लेषित होंगे'
                                : 'Select vehicle — 3 paths will be analyzed based on speed and road limits'}
                            </div>
                          </div>
                          {isCalculatingRoutes && (
                            <span className="w-4 h-4 border-2 border-[#AEF5F0] border-t-transparent rounded-full animate-spin"></span>
                          )}
                        </div>

                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { id: 'car', label: t.vehicleCar, icon: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z', speed: language === 'hi' ? '~54 किमी/घं' : '~54 km/h' },
                            { id: 'bike', label: t.vehicleBike, icon: 'M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L9 6H6m6 11.5l3.5-7 3.5 2', speed: language === 'hi' ? '~42 किमी/घं' : '~42 km/h' },
                            { id: 'van', label: t.vehicleVan, icon: 'M1 5h16v12H1zM17 9l4 2v6h-4', speed: language === 'hi' ? '~48 किमी/घं' : '~48 km/h' },
                            { id: 'bus', label: t.vehicleBus, icon: 'M4 3h16v16H4zM4 11h16', speed: language === 'hi' ? '~36 किमी/घं' : '~36 km/h' },
                            { id: 'truck', label: t.vehicleTruck, icon: 'M1 3h15v13H1zM16 8h4l3 3v5h-7z', speed: language === 'hi' ? '~32 किमी/घं' : '~32 km/h' },
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
                      </div>
                    )}

                    {/* Prominent Hazard Alert Box if hazard detected on active route */}
                    {journey.detectedHazard && (
                      <div className="bg-gradient-to-br from-red-950/80 via-[#1c0f18] to-[#161B22] border-2 border-red-500 rounded-xl p-3 shadow-2xl space-y-2 animate-section-smooth">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl animate-bounce">⚠️</span>
                          <div>
                            <div className="text-xs font-bold text-red-200 uppercase tracking-wide">
                              {language === 'hi' ? 'सड़क पर खतरा पाया गया!' : 'HAZARD DETECTED ON ROUTE'}
                            </div>
                            <div className="text-[11px] text-red-300">
                              {journey.detectedHazard.type} near {journey.detectedHazard.locationName}
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed bg-[#0D1117]/80 p-2 rounded border border-red-500/30">
                          {language === 'hi'
                            ? 'A* एल्गोरिथ्म ने अवरुद्ध मार्ग को +9999 दंड देकर खारिज किया और सुरक्षित बायपास का पुनर्मूल्यांकन कर नया सर्वोत्तम मार्ग चुना।'
                            : 'A* Algorithm applied +9999 penalty to the blocked corridor and dynamically rerouted to the safest optimal detour.'}
                        </p>
                      </div>
                    )}

                    {/* Step 3: 3 Candidate Paths Evaluated by A* Algorithm */}
                    {candidateRoutesList && candidateRoutesList.length > 0 && (
                      <div className="bg-[#21262D] border border-[#AEF5F0]/40 rounded-xl p-3 space-y-3 shadow-xl">
                        <div className="flex items-center justify-between border-b border-[#30363D] pb-2.5">
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>🗺️</span>
                              <span>
                                {language === 'hi'
                                  ? `A* एल्गोरिथ्म द्वारा ${candidateRoutesList.length} मार्गों का मूल्यांकन`
                                  : `${candidateRoutesList.length} Paths Evaluated by A* Algorithm`}
                              </span>
                            </div>
                            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                              {language === 'hi'
                                ? 'न्यूनतम लागत f(n) = g(n) + h(n) वाला मार्ग चुना गया'
                                : 'Optimal route selected via minimum f(n) cost'}
                            </div>
                          </div>

                          {/* How A* Works Interactive Button */}
                          <button
                            type="button"
                            onClick={() => setIsAStarModalOpen(true)}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                            title="Open A* Algorithm Decision Engine Breakdown"
                          >
                            <span>🧠</span>
                            <span>{language === 'hi' ? 'A* निर्णय तर्क देखें' : 'How A* Chose'}</span>
                          </button>
                        </div>

                        {/* Quick Inline A* Decision Explanation Banner */}
                        <div className="p-2.5 rounded-lg bg-[#161B22] border border-[#30363D] text-[11px] flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#AEF5F0] flex items-center gap-1">
                              <span>⚡</span>
                              <span>{language === 'hi' ? 'A* चयन तर्क (A* Decision Logic):' : 'A* Decision Logic:'}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowInlineAStarBreakdown(!showInlineAStarBreakdown)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-200 underline cursor-pointer"
                            >
                              {showInlineAStarBreakdown
                                ? (language === 'hi' ? 'संक्षिप्त करें ▲' : 'Collapse ▲')
                                : (language === 'hi' ? 'विस्तार से देखें ▼' : 'View Formula ▼')}
                            </button>
                          </div>
                          <p className="text-slate-300 text-[10px] leading-relaxed">
                            {language === 'hi'
                              ? state.aStarEvaluation?.evaluationSummary?.decisionReasonHi || 'A* ने न्यूनतम यात्रा समय और शून्य जोखिम के आधार पर सर्वोत्तम मार्ग चुना।'
                              : state.aStarEvaluation?.evaluationSummary?.decisionReason || 'A* selected optimal route with lowest travel time and zero hazard risk.'}
                          </p>

                          {/* Expandable Formula & Scorecard Table */}
                          {showInlineAStarBreakdown && (
                            <div className="pt-2 border-t border-[#30363D] space-y-2 animate-section-smooth">
                              <div className="bg-[#0D1117] p-2 rounded font-mono text-[10px] text-center border border-[#30363D] text-slate-200">
                                f(n) = g(n) [रोड लागत] + h(n) [सीधी दूरी] + HazardPenalty
                              </div>

                              <div
                                className="gap-1.5 text-[10px] text-center font-mono"
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: `repeat(${Math.max(1, candidateRoutesList.length)}, minmax(0, 1fr))`,
                                }}
                              >
                                {candidateRoutesList.map((r) => {
                                  const isOpt = r.aStarMetrics?.isOptimal;
                                  const isBlk = r.aStarMetrics?.status === 'HAZARD_BLOCKED';
                                  return (
                                    <div
                                      key={r.id}
                                      className={`p-1.5 rounded border ${
                                        isOpt
                                          ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300'
                                          : isBlk
                                          ? 'bg-red-950/40 border-red-500 text-red-300'
                                          : 'bg-[#161B22] border-[#30363D] text-slate-300'
                                      }`}
                                    >
                                      <div className="font-bold truncate text-[9px]">{r.name.split('—')[0]}</div>
                                      <div className="text-[11px] font-bold mt-0.5">f = {r.aStarMetrics?.totalFCost ?? '--'}</div>
                                      <div className="text-[8px] opacity-75">{r.distanceKm} km • {r.durationMinutes}m</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* List of 3 Candidate Routes with Full Information */}
                        <div className="space-y-2 overflow-hidden">
                          {candidateRoutesList.map((route, idx) => {
                            const isSelected = journey.activeRoute?.id === route.id;
                            const isOptimal = route.aStarMetrics?.isOptimal;
                            const isBlocked = route.aStarMetrics?.status === 'HAZARD_BLOCKED';
                            const cardBorder = isSelected
                              ? 'border-[#AEF5F0] ring-1 ring-[#AEF5F0]/60 bg-[#1c222b]'
                              : isBlocked
                              ? 'border-red-500/50 bg-red-950/15'
                              : 'border-[#30363D] bg-[#161B22] hover:border-[#AEF5F0]/60';

                            return (
                              <div
                                key={route.id}
                                onClick={() => handleSelectOptimalRoute(route.id)}
                                className={`p-2.5 rounded-xl border transition flex items-center justify-between group cursor-pointer overflow-hidden ${cardBorder}`}
                                style={{ borderLeftWidth: '5px', borderLeftColor: isBlocked ? '#ef4444' : route.color }}
                              >
                                <div className="flex-1 min-w-0 pr-2 overflow-hidden">
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0 overflow-hidden">
                                    <span className="font-bold text-xs text-white group-hover:text-[#AEF5F0] truncate max-w-full" title={translateText(route.name, language)}>
                                      {translateText(route.name, language)}
                                    </span>
                                    {isOptimal && (
                                      <span className="text-[8px] font-extrabold text-slate-950 bg-[#AEF5F0] px-1.5 py-0.5 rounded shadow-sm shadow-[#AEF5F0]/40 shrink-0">
                                        ⭐ {language === 'hi' ? 'A* सर्वोत्तम' : 'A* BEST'}
                                      </span>
                                    )}
                                    {isBlocked && (
                                      <span className="text-[8px] font-bold text-red-200 bg-red-600 px-1.5 py-0.5 rounded shrink-0">
                                        🛑 {language === 'hi' ? 'अवरुद्ध' : 'BLOCKED'}
                                      </span>
                                    )}
                                    {isSelected && !isOptimal && (
                                      <span className="text-[8px] font-bold text-cyan-300 bg-cyan-900/60 px-1.5 py-0.5 rounded border border-cyan-400/40 shrink-0">
                                        ✓ {language === 'hi' ? 'सक्रिय' : 'ACTIVE'}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[10px] text-slate-400 truncate mt-0.5 overflow-hidden" title={route.viaRoads?.join(' • ')}>
                                    {route.viaRoads?.join(' • ') || (language === 'hi' ? 'मुख्य गलियारा' : 'Main Corridor')}
                                  </div>

                                  <div className="text-xs font-mono font-bold text-white mt-1 flex items-center gap-1.5 flex-wrap overflow-hidden">
                                    <span className="text-cyan-400 shrink-0">{route.distanceKm} {language === 'hi' ? 'किमी' : 'km'}</span>
                                    <span className="text-slate-500 shrink-0">•</span>
                                    <span className="text-emerald-400 shrink-0">{route.durationMinutes} {language === 'hi' ? 'मिनट' : 'min'}</span>
                                    {route.aStarMetrics?.totalFCost !== undefined && (
                                      <>
                                        <span className="text-slate-500 shrink-0">•</span>
                                        <span className="text-amber-300 font-normal text-[10px] shrink-0">
                                          f(n)={route.aStarMetrics.totalFCost}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOptimalRoute(route.id);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer ml-1.5 ${
                                    isSelected
                                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                      : 'bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 shadow-md shadow-[#AEF5F0]/25'
                                  }`}
                                >
                                  {isSelected ? (language === 'hi' ? 'चयनित ✓' : 'Selected ✓') : (language === 'hi' ? 'चुनें' : 'Select')}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Active Navigation Telemetry & Drive Controls */}
                    {journey.activeRoute && (
                      <div className="bg-[#21262D] border border-[#AEF5F0]/50 rounded-xl p-3 space-y-2.5 shadow-lg">
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

                        {/* Navigation Controls */}
                        <div className="pt-2 border-t border-[#30363D]/60 flex gap-2">
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
                            <span>{journey.isNavigating ? (language === 'hi' ? 'नेविगेशन रोकें' : 'Pause Navigation') : (language === 'hi' ? 'नेविगेशन शुरू करें' : 'Start Navigation')}</span>
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
                      </div>
                    )}

                      {/* Simulation Controls & Speed Controller */}
                      <div className="bg-[#21262D] p-3 rounded-xl border border-[#30363D] space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <span className="text-sm">⚡</span>
                            <span>Vehicle Speed Control</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-[#AEF5F0] bg-[#AEF5F0]/10 px-2 py-0.5 rounded border border-[#AEF5F0]/30">
                            {journey.simulationSpeed || 1}x Speed
                          </span>
                        </div>

                        {/* Interactive Minus, Plus & Presets */}
                        <div className="flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = journey.simulationSpeed || 1;
                              const next = Math.max(0.25, parseFloat((cur - 0.5).toFixed(2)));
                              handleSpeedChange(next);
                            }}
                            title="Decrease Speed (-0.5x)"
                            className="flex-1 py-1.5 rounded-lg bg-[#161B22] hover:bg-[#30363D] active:scale-95 border border-[#30363D] text-slate-200 font-bold text-xs flex items-center justify-center transition cursor-pointer"
                          >
                            − Slower (-0.5x)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const cur = journey.simulationSpeed || 1;
                              const next = Math.min(10, parseFloat((cur + 0.5).toFixed(2)));
                              handleSpeedChange(next);
                            }}
                            title="Increase Speed (+0.5x)"
                            className="flex-1 py-1.5 rounded-lg bg-[#161B22] hover:bg-[#30363D] active:scale-95 border border-[#30363D] text-[#AEF5F0] font-bold text-xs flex items-center justify-center transition cursor-pointer"
                          >
                            + Faster (+0.5x)
                          </button>
                        </div>

                        {/* Granular Slider */}
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[10px] text-slate-400 font-mono">0.25x</span>
                          <input
                            type="range"
                            min="0.25"
                            max="8"
                            step="0.25"
                            value={journey.simulationSpeed || 1}
                            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                            className="flex-1 accent-[#AEF5F0] h-1.5 bg-[#161B22] rounded-lg cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">8x</span>
                        </div>

                        {/* Speed Preset Quick Pills */}
                        <div className="grid grid-cols-5 gap-1">
                          {[0.5, 1, 2, 4, 8].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => handleSpeedChange(spd)}
                              className={`py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                (journey.simulationSpeed || 1) === spd
                                  ? 'bg-[#AEF5F0] border-[#AEF5F0] text-slate-950 shadow-sm font-extrabold'
                                  : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:text-white'
                              }`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>

                        {/* Simulation Actions: Step & Report */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#30363D]/60">
                          <button
                            type="button"
                            onClick={handleAdvanceStep}
                            disabled={!journey.isNavigating}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                              journey.isNavigating
                                ? 'bg-[#AEF5F0]/15 border border-[#AEF5F0]/30 hover:bg-[#AEF5F0] text-[#AEF5F0] hover:text-slate-950'
                                : 'bg-[#161B22] text-slate-500 border border-[#30363D] cursor-not-allowed'
                            }`}
                          >
                            <span>Step Forward →</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsReportHazardOpen(true)}
                            className="py-1.5 px-2.5 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500 border border-amber-500/40 text-amber-300 hover:text-white transition cursor-pointer"
                          >
                            ⚠ Report Hazard
                          </button>
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

                        {/* Trip Progress Dial */}
                        <div className="w-16 h-16 rounded-full border-4 border-[#AEF5F0]/40 bg-[#AEF5F0]/10 flex flex-col items-center justify-center text-center">
                          <span className="text-sm font-extrabold text-white leading-none font-mono">
                            {journey.progressPercent}%
                          </span>
                          <span className="text-[8px] text-slate-400 uppercase mt-0.5">Done</span>
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
                language={language}
                onCommitRoute={handleCommitRoute}
                onSelectDestinationFromMap={handleMapClickForDestination}
                onResolveHazard={(id) => realtimeSync.resolveHazard(id)}
                theme={state.appSettings.mapTheme}
                onToggleTheme={() => realtimeSync.toggleMapTheme()}
                onChangeTheme={(t) => realtimeSync.setMapTheme(t)}
                onChangeSpeed={handleSpeedChange}
                onTogglePlayPause={() => realtimeSync.setSimulating(!journey.isSimulating)}
                isMapClearMode={isMapClearMode}
                onToggleClearMode={() => setIsMapClearMode(!isMapClearMode)}
              />

              {/* Top HUD Banner on Map */}
              {journey.isNavigating && currentManeuver && !isMapClearMode && (
                <div className="absolute top-4 left-4 z-[995] bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] rounded-2xl p-3 shadow-2xl flex items-center gap-3.5 max-w-md animate-fade-in pointer-events-auto">
                  <div className="w-11 h-11 rounded-xl bg-[#AEF5F0]/20 border border-[#AEF5F0] flex items-center justify-center shrink-0">
                    {getTurnIcon(currentManeuver.turnType)}
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-cyan-400 font-semibold uppercase">
                      {language === 'hi' ? `${currentManeuver.distanceMeters || 200} मी में` : `In ${currentManeuver.distanceMeters || 200} m`}
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
                    title={t.repeatVoiceBtn}
                    className="p-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-slate-300 hover:text-white cursor-pointer ml-auto shrink-0"
                  >
                    🔊
                  </button>
                </div>
              )}

              {/* TOP-RIGHT CORNER: Hazard Alert Popup with Find Other Route Button */}
              {journey.detectedHazard && journey.diversionState === 'HAZARD_DETECTED' && !isMapClearMode && (
                <div className="absolute top-4 right-4 z-[996] w-84 bg-gradient-to-br from-red-950/95 via-[#1c0f18]/95 to-[#161B22]/95 backdrop-blur-md border-2 border-red-500 rounded-2xl p-3.5 shadow-2xl shadow-red-950/60 pointer-events-auto animate-bounce-subtle">
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400 shrink-0 text-lg">
                      ⚠️
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-red-200 uppercase tracking-wide flex items-center justify-between">
                        <span>{t.hazardDetectedAheadTitle}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">
                          {journey.detectedHazard.severity}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-white truncate mt-0.5">
                        {translateText(journey.detectedHazard.type, language)}
                      </div>
                      <div className="text-[10px] text-slate-300 truncate">
                        📍 {journey.detectedHazard.locationName}
                      </div>
                    </div>
                  </div>

                  {/* Find Other Route Button */}
                  <button
                    type="button"
                    onClick={handleOkFindAlternates}
                    className="w-full mt-2 py-2.5 px-3 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#AEF5F0]/25 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 animate-pulse"
                  >
                    <span>🔍</span>
                    <span>{language === 'hi' ? 'अन्य मार्ग खोजें (Find Other Route)' : 'Find Other Route'}</span>
                  </button>
                </div>
              )}

              {/* TOP-RIGHT CORNER: Maximum 3 Detour Alternative Routes Available */}
              {journey.alternativeRoutes && journey.alternativeRoutes.length > 0 && journey.diversionState === 'ALTERNATIVES_DISPLAYED' && !isMapClearMode && (
                <div className="absolute top-4 right-4 z-[996] w-84 max-w-[calc(100vw-2rem)] bg-[#161B22]/95 backdrop-blur-md border border-[#AEF5F0]/60 rounded-2xl p-3 shadow-2xl space-y-2 pointer-events-auto animate-section-smooth overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#30363D] pb-1.5 min-w-0">
                    <span className="text-xs font-bold text-[#AEF5F0] truncate">
                      ⚡ {language === 'hi' ? 'सर्वोत्तम 3 मार्ग उपलब्ध' : 'Top 3 Routes Available'}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold shrink-0 ml-1.5">
                      {Math.min(3, (journey.activeRoute ? 1 : 0) + journey.alternativeRoutes.length)} {t.pathsLabel}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 break-words">
                    {language === 'hi' ? 'सुरक्षित बायपास के लिए पसंदीदा मार्ग चुनें:' : 'Select preferred route to bypass hazard:'}
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto overflow-x-hidden">
                    {[
                      ...(journey.activeRoute ? [{ ...journey.activeRoute, isCurrentActive: true }] : []),
                      ...journey.alternativeRoutes.map((alt) => ({ ...alt, isCurrentActive: false }))
                    ].slice(0, 3).map((routeOption) => (
                      <div
                        key={routeOption.id}
                        onClick={() => handleCommitRoute(routeOption.id)}
                        className={`p-2 rounded-xl border cursor-pointer transition flex items-center justify-between text-xs overflow-hidden ${
                          routeOption.isCurrentActive
                            ? 'bg-[#AEF5F0]/15 border-[#AEF5F0]'
                            : 'bg-[#21262D] hover:bg-[#30363D] border-[#30363D]'
                        }`}
                        style={{ borderLeftWidth: '3.5px', borderLeftColor: routeOption.color }}
                      >
                        <div className="flex-1 min-w-0 mr-2 overflow-hidden">
                          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                            <span className="font-bold text-white text-[11px] truncate max-w-full" title={translateText(routeOption.name, language)}>
                              {translateText(routeOption.name, language)}
                            </span>
                            {routeOption.isCurrentActive && (
                              <span className="text-[8px] bg-cyan-500/20 text-cyan-400 font-bold px-1 rounded shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                            {routeOption.distanceKm} km • {routeOption.durationMinutes} min
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommitRoute(routeOption.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-[10px] cursor-pointer shrink-0 ml-1.5"
                        >
                          {language === 'hi' ? 'चुनें' : 'Select'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Floating A* Decision Badge on Map */}
              {Boolean(journey.destination?.name && journey.activeRoute && state.aStarEvaluation) && !isMapClearMode && !(journey.detectedHazard && journey.diversionState === 'HAZARD_DETECTED') && !(journey.alternativeRoutes && journey.alternativeRoutes.length > 0 && journey.diversionState === 'ALTERNATIVES_DISPLAYED') && (
                <button
                  type="button"
                  onClick={() => setIsAStarModalOpen(true)}
                  className="absolute top-4 right-4 z-[995] bg-[#161B22]/95 hover:bg-[#21262D] backdrop-blur-md border border-[#AEF5F0]/50 text-white rounded-xl px-3 py-2 shadow-2xl flex items-center gap-2 cursor-pointer transition active:scale-95 pointer-events-auto"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#AEF5F0] animate-pulse"></span>
                  <span className="text-xs font-bold text-[#AEF5F0]">⚡ A* {language === 'hi' ? 'निर्णय तर्क' : 'Decision'}</span>
                  <span className="text-[10px] text-slate-300 font-mono">
                    [f={state.aStarEvaluation?.optimalRoute?.aStarMetrics?.totalFCost}]
                  </span>
                </button>
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
                      className="w-full py-3 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#AEF5F0]/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 animate-pulse"
                    >
                      <span>🔍</span>
                      <span>{language === 'hi' ? 'अन्य मार्ग खोजें' : 'Find Other Route'}</span>
                    </button>
                  </div>
                )}

                {/* 2. Alternative Routes Section */}
                {journey.alternativeRoutes && journey.alternativeRoutes.length > 0 && (
                  <div className="bg-[#21262D] border border-[#AEF5F0]/40 rounded-2xl p-4 shadow-lg space-y-3">
                    <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#AEF5F0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                        <span className="font-bold text-xs text-white">
                          ⚡ {language === 'hi' ? 'उपलब्ध सर्वोत्तम मार्ग' : 'Optimal Routes Available'}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                        {journey.alternativeRoutes.length} {language === 'hi' ? 'मार्ग' : 'routes'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      {language === 'hi'
                        ? 'खतरे से बचने के लिए नीचे दिए गए सर्वोत्तम मार्गों में से कोई एक चुनें:'
                        : 'Select one of the optimal routes below to safely bypass the hazard:'}
                    </div>

                    {/* List of alternative route options */}
                    <div className="space-y-2 overflow-hidden">
                      {journey.alternativeRoutes.map((alt) => (
                        <div
                          key={alt.id}
                          onClick={() => handleCommitRoute(alt.id)}
                          className="p-3 rounded-xl border border-[#30363D] bg-[#161B22] hover:border-[#AEF5F0] cursor-pointer transition flex items-center justify-between group overflow-hidden"
                          style={{ borderLeftWidth: '4px', borderLeftColor: alt.color }}
                        >
                          <div className="flex-1 min-w-0 mr-2 overflow-hidden">
                            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                              <span className="font-bold text-xs text-white group-hover:text-[#AEF5F0] truncate max-w-full" title={translateText(alt.name, language)}>
                                {translateText(alt.name, language)}
                              </span>
                              {alt.isRecommended && (
                                <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.2 rounded border border-emerald-500/30 shrink-0">
                                  ⭐ {language === 'hi' ? 'अनुशंसित' : 'Recommended'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-300 font-mono mt-0.5 truncate">
                              {alt.distanceKm} km • {alt.durationMinutes} min
                            </div>
                            {alt.viaRoads && (
                              <div className="text-[9px] text-slate-400 truncate mt-0.5 overflow-hidden" title={alt.viaRoads.join(', ')}>
                                Via {alt.viaRoads.join(', ')}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCommitRoute(alt.id);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 transition cursor-pointer shrink-0 shadow-sm active:scale-95 ml-1.5"
                          >
                            {language === 'hi' ? 'यह मार्ग चुनें' : 'Select Route'}
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

        {/* VIEW 2: MAP (Fullscreen Immersive Navigation View with Coordinated Non-Overlapping HUD) */}
        {activeBottomNav === 'Map' && (
          <div key="driver-tab-map" className="animate-tab-switch flex-1 relative w-full h-full min-h-0 overflow-hidden">
            <RoutePilotMap
              mode="driver"
              hazards={hazards}
              sensorNodes={sensorNodes}
              journey={journey}
              language={language}
              onCommitRoute={handleCommitRoute}
              onSelectDestinationFromMap={handleMapClickForDestination}
              onResolveHazard={(id) => realtimeSync.resolveHazard(id)}
              theme={state.appSettings.mapTheme}
              onToggleTheme={() => realtimeSync.toggleMapTheme()}
              onChangeTheme={(t) => realtimeSync.setMapTheme(t)}
              onChangeSpeed={handleSpeedChange}
              onTogglePlayPause={() => realtimeSync.setSimulating(!journey.isSimulating)}
              isMapClearMode={isMapClearMode}
              onToggleClearMode={() => setIsMapClearMode(!isMapClearMode)}
            />

            {/* When Map Clear Mode is ACTIVE: Minimal prompt pill to restore HUD */}
            {isMapClearMode ? (
              <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-[995] animate-fade-in pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setIsMapClearMode(false)}
                  className="px-3 py-1.5 rounded-full bg-[#161B22]/95 backdrop-blur-md border border-[#AEF5F0]/60 text-white font-bold text-xs shadow-2xl flex items-center gap-2 cursor-pointer hover:bg-[#21262D] transition active:scale-95"
                >
                  <span>👁️</span>
                  <span>{t.showHudToggle}</span>
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                    • {t.mapClearNotice}
                  </span>
                </button>
              </div>
            ) : (
              <>
                {/* TOP-LEFT OVERLAY STACK (Search / Maneuver — Auto-adjusts when right-side hazard popup is active) */}
                <div className={`absolute top-3 left-3 z-[995] flex flex-col gap-2 pointer-events-auto transition-all ${
                  (journey.detectedHazard && journey.diversionState === 'HAZARD_DETECTED') || (journey.alternativeRoutes && journey.alternativeRoutes.length > 0 && journey.diversionState === 'ALTERNATIVES_DISPLAYED')
                    ? 'hidden sm:flex sm:w-72 md:w-80 max-w-xs'
                    : 'right-14 sm:right-auto sm:w-80 md:w-92 max-w-md'
                }`}>
                  {/* Top Primary Card: Search (Planning) OR Maneuver (Driving) + Clean Map Button */}
                  <div className="flex items-start gap-1.5 w-full min-w-0">
                    {!journey.isNavigating ? (
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="relative shadow-2xl">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={() => {
                              if (searchQuery.trim().length > 0) setShowSearchResults(true);
                            }}
                            placeholder={t.searchMapPlaceholder}
                            className="w-full h-9 bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] rounded-xl pl-8 pr-7 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#AEF5F0] shadow-xl"
                          />
                          <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                          {isSearching ? (
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#AEF5F0] border-t-transparent rounded-full animate-spin"></div>
                          ) : searchQuery ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setSearchResults([]);
                                setShowSearchResults(false);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1 rounded cursor-pointer"
                            >
                              ✕
                            </button>
                          ) : null}
                        </div>

                        {showSearchResults && (
                          <div className="bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-[#30363D]/80 animate-fade-in">
                            {isSearching && (
                              <div className="p-2 text-center text-xs text-[#AEF5F0] flex items-center justify-center gap-2">
                                <span className="w-3 h-3 border-2 border-[#AEF5F0] border-t-transparent rounded-full animate-spin"></span>
                                <span>{t.searchingLocationsLive}</span>
                              </div>
                            )}
                            {searchResults.map((item, idx) => (
                              <div
                                key={idx}
                                onClick={() => handleSelectDestination(item)}
                                className="p-2 hover:bg-[#21262D] cursor-pointer transition flex items-start gap-2 text-xs group"
                              >
                                <span className="text-sm mt-0.5 shrink-0 text-[#AEF5F0]">📍</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-white group-hover:text-[#AEF5F0] truncate flex items-center gap-1.5">
                                    <span>{item.name}</span>
                                    <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      {t.realPlaceBadge}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                    {item.displayName || item.roadName}
                                  </div>
                                  <div className="text-[9px] font-mono text-cyan-400 mt-0.5">
                                    GPS: {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold text-[#AEF5F0] opacity-0 group-hover:opacity-100 transition shrink-0 self-center">
                                  {t.selectPlaceBtn}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : currentManeuver ? (
                      <div className="flex-1 bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] rounded-2xl p-2.5 shadow-xl flex items-center gap-2.5 animate-fade-in min-w-0 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-[#AEF5F0]/20 border border-[#AEF5F0] flex items-center justify-center shrink-0">
                          {getTurnIcon(currentManeuver.turnType)}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="text-[10px] font-mono text-cyan-400 font-semibold uppercase truncate">
                            {language === 'hi' ? `${currentManeuver.distanceMeters || 200} मी में` : `In ${currentManeuver.distanceMeters || 200} m`}
                          </div>
                          <div className="text-xs font-bold text-white truncate" title={currentManeuver.instruction}>
                            {currentManeuver.instruction}
                          </div>
                          {currentManeuver.roadName && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5" title={currentManeuver.roadName}>
                              {currentManeuver.roadName}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleTestVoice}
                          title={t.repeatVoiceBtn}
                          className="p-1.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-slate-200 cursor-pointer shrink-0"
                        >
                          🔊
                        </button>
                      </div>
                    ) : null}

                    {/* Clean Map Mode Toggle Button - Matched in dimensions and alignment with Search Bar */}
                    <button
                      type="button"
                      onClick={() => setIsMapClearMode(true)}
                      title={t.cleanMapToggle}
                      className="h-9 w-9 rounded-xl bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] hover:border-[#AEF5F0]/50 text-slate-300 hover:text-white transition cursor-pointer shadow-xl shrink-0 flex items-center justify-center active:scale-95"
                    >
                      <span className="text-sm select-none leading-none">👁️</span>
                    </button>
                  </div>

                  {/* Floating A* Decision Pill (Stacked directly below Maneuver card without collision) */}
                  {Boolean(journey.destination?.name && journey.activeRoute && state.aStarEvaluation) && (
                    <button
                      type="button"
                      onClick={() => setIsAStarModalOpen(true)}
                      className="w-auto self-start bg-[#161B22]/95 hover:bg-[#21262D] backdrop-blur-md border border-[#AEF5F0]/50 text-white rounded-xl px-2.5 py-1 shadow-xl flex items-center gap-2 cursor-pointer transition active:scale-95"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-[#AEF5F0] animate-pulse shrink-0"></span>
                        <span className="text-[11px] font-bold text-[#AEF5F0] truncate">⚡ A* {language === 'hi' ? 'निर्णय' : 'Decision'}</span>
                      </div>
                      <span className="text-[10px] text-slate-300 font-mono shrink-0 ml-1">
                        [f={state.aStarEvaluation?.optimalRoute?.aStarMetrics?.totalFCost}]
                      </span>
                    </button>
                  )}

                </div>

                {/* RIGHT SIDE TOP CORNER — HAZARD ALERT POPUP & FIND OTHER ROUTE */}
                {journey.detectedHazard && journey.diversionState === 'HAZARD_DETECTED' && !isMapClearMode && (
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[996] w-[280px] sm:w-[320px] max-w-[calc(100vw-24px)] bg-gradient-to-br from-red-950/95 via-[#1c0f18]/95 to-[#161B22]/95 backdrop-blur-md border-2 border-red-500 rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-red-950/60 pointer-events-auto animate-bounce-subtle">
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400 shrink-0 text-base">
                        ⚠️
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-red-200 uppercase tracking-wide flex items-center justify-between">
                          <span>{t.hazardDetectedAheadTitle}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">
                            {journey.detectedHazard.severity}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-white truncate mt-0.5">
                          {translateText(journey.detectedHazard.type, language)}
                        </div>
                        <div className="text-[10px] text-slate-300 truncate">
                          📍 {journey.detectedHazard.locationName}
                        </div>
                      </div>
                    </div>

                    {/* Find Other Route Button in Right Side Top Corner */}
                    <button
                      type="button"
                      onClick={handleOkFindAlternates}
                      className="w-full mt-1.5 py-2.5 px-3 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-extrabold text-xs shadow-lg shadow-[#AEF5F0]/25 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 animate-pulse"
                    >
                      <span>🔍</span>
                      <span>{language === 'hi' ? 'अन्य मार्ग खोजें (Find Other Route)' : 'Find Other Route'}</span>
                    </button>
                  </div>
                )}

                {/* RIGHT SIDE TOP CORNER — MAXIMUM 3 ALTERNATIVE DETOUR ROUTES AVAILABLE */}
                {journey.alternativeRoutes && journey.alternativeRoutes.length > 0 && journey.diversionState === 'ALTERNATIVES_DISPLAYED' && !isMapClearMode && (
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[996] w-[280px] sm:w-[320px] max-w-[calc(100vw-24px)] bg-[#161B22]/95 backdrop-blur-md border border-[#AEF5F0]/60 rounded-2xl p-3 shadow-2xl space-y-2 pointer-events-auto animate-section-smooth overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#30363D] pb-1.5 min-w-0">
                      <span className="text-xs font-bold text-[#AEF5F0] truncate">
                        ⚡ {language === 'hi' ? 'सर्वोत्तम 3 मार्ग उपलब्ध' : 'Top 3 Routes Available'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold shrink-0 ml-1.5">
                        {Math.min(3, (journey.activeRoute ? 1 : 0) + journey.alternativeRoutes.length)} {t.pathsLabel}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 break-words">
                      {language === 'hi'
                        ? 'खतरे से बचने के लिए नीचे से अपना पसंदीदा मार्ग चुनें:'
                        : 'Choose preferred route to safely bypass hazard:'}
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto overflow-x-hidden">
                      {[
                        ...(journey.activeRoute ? [{ ...journey.activeRoute, isCurrentActive: true }] : []),
                        ...journey.alternativeRoutes.map((alt) => ({ ...alt, isCurrentActive: false }))
                      ].slice(0, 3).map((routeOption) => (
                        <div
                          key={routeOption.id}
                          onClick={() => handleCommitRoute(routeOption.id)}
                          className={`p-2 rounded-xl border cursor-pointer transition flex items-center justify-between text-xs overflow-hidden ${
                            routeOption.isCurrentActive
                              ? 'bg-[#AEF5F0]/15 border-[#AEF5F0]'
                              : 'bg-[#21262D] hover:bg-[#30363D] border-[#30363D]'
                          }`}
                          style={{ borderLeftWidth: '3.5px', borderLeftColor: routeOption.color }}
                        >
                          <div className="flex-1 min-w-0 mr-2 overflow-hidden">
                            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                              <span className="font-bold text-white text-[11px] truncate max-w-full" title={translateText(routeOption.name, language)}>
                                {translateText(routeOption.name, language)}
                              </span>
                              {routeOption.isCurrentActive && (
                                <span className="text-[8px] bg-cyan-500/20 text-cyan-400 font-bold px-1 rounded shrink-0">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                              {routeOption.distanceKm} km • {routeOption.durationMinutes} min
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCommitRoute(routeOption.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-[10px] cursor-pointer shrink-0 ml-1.5"
                          >
                            {language === 'hi' ? 'चुनें' : 'Select'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ZONE 3: BOTTOM-CENTER — Streamlined Cockpit Drive Bar (Current Speed Dial Removed, Speed Multiplier + Actions Retained) */}
                <div className="absolute bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-[995] bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] rounded-2xl shadow-2xl px-3 py-1.5 sm:py-2 flex items-center justify-center gap-2.5 sm:gap-3.5 select-none max-w-[calc(100vw-24px)] pointer-events-auto whitespace-nowrap flex-nowrap shrink-0">
                  {/* Speed Increase & Decrease Multiplier Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = journey.simulationSpeed || 1;
                        handleSpeedChange(Math.max(0.25, parseFloat((cur - 0.5).toFixed(2))));
                      }}
                      title={t.slowerBtn}
                      className="w-7 h-7 rounded-lg bg-[#21262D] hover:bg-[#30363D] active:scale-95 text-slate-200 font-bold text-sm flex items-center justify-center border border-[#30363D] cursor-pointer shrink-0"
                    >
                      −
                    </button>
                    <span className="font-mono text-xs font-bold text-[#AEF5F0] px-1.5 min-w-[32px] text-center select-none shrink-0">
                      {journey.simulationSpeed || 1}x
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = journey.simulationSpeed || 1;
                        handleSpeedChange(Math.min(10, parseFloat((cur + 0.5).toFixed(2))));
                      }}
                      title={t.fasterBtn}
                      className="w-7 h-7 rounded-lg bg-[#21262D] hover:bg-[#30363D] active:scale-95 text-[#AEF5F0] font-bold text-sm flex items-center justify-center border border-[#30363D] cursor-pointer shrink-0"
                    >
                      +
                    </button>
                  </div>

                  <div className="h-5 w-px bg-[#30363D] shrink-0"></div>

                  {/* Primary Navigation & Trip Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={toggleNavigation}
                      disabled={!journey.destination?.name}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap ${
                        !journey.destination?.name
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : journey.isNavigating
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                          : 'bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 shadow-md shadow-[#AEF5F0]/30'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        {journey.isNavigating ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        )}
                      </svg>
                      <span>{journey.isNavigating ? t.pauseNavigationBtn : t.startNavigationBtn}</span>
                    </button>

                    {journey.isNavigating && (
                      <>
                        <button
                          onClick={handleAdvanceStep}
                          className="px-2 py-1.5 rounded-xl bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-slate-200 text-xs font-semibold cursor-pointer active:scale-95 hidden sm:inline-flex shrink-0 whitespace-nowrap"
                          title={t.stepForwardBtn}
                        >
                          {t.stepForwardBtn}
                        </button>
                        <button
                          onClick={handleStopNavigation}
                          title={t.stopTripBtn}
                          className="px-2.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white text-xs font-bold transition cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                        >
                          ✕ {t.stopTripBtn}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* VIEW 3: ROUTE (Turn-by-Turn Maneuvers & Alternatives List) */}
        {activeBottomNav === 'Route' && (
          <div key="driver-tab-route" className="animate-tab-switch flex-1 w-full h-full min-h-0 bg-[#0D1117] p-4 sm:p-6 overflow-y-auto space-y-5 max-w-4xl mx-auto">
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
                    <div className="min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between gap-1.5 min-w-0">
                        <span className="font-bold text-xs text-white truncate" title={r.name}>{r.name}</span>
                        {r.isRecommended && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold shrink-0">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 truncate" title={r.viaRoads?.join(', ') || 'Corridor'}>Via {r.viaRoads?.[0] || 'Corridor'}</div>
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-[#30363D] text-xs font-mono">
                        <div className="min-w-0 overflow-hidden">
                          <span className="text-[10px] text-slate-400 block font-sans">Distance</span>
                          <span className="text-white font-bold truncate block">{r.distanceKm} km</span>
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <span className="text-[10px] text-slate-400 block font-sans">Duration</span>
                          <span className="text-emerald-400 font-bold truncate block">{r.durationMinutes} min</span>
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
          <div key="driver-tab-alerts" className="animate-tab-switch flex-1 w-full h-full min-h-0 bg-[#0D1117] p-4 sm:p-6 overflow-y-auto space-y-5 max-w-4xl mx-auto">
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
                  onClick={() => {
                    handleOkFindAlternates();
                    setActiveBottomNav('Map');
                  }}
                  className="w-full py-3 rounded-xl bg-[#AEF5F0] hover:bg-[#8eebe5] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#AEF5F0]/25 cursor-pointer transition flex items-center justify-center gap-2 animate-pulse active:scale-98"
                >
                  <span>🔍</span>
                  <span>{language === 'hi' ? 'अन्य मार्ग खोजें' : 'Find Other Route'}</span>
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
          <div key="driver-tab-more" className="animate-tab-switch flex-1 w-full h-full min-h-0 bg-[#0D1117] p-4 sm:p-6 overflow-y-auto space-y-5 max-w-4xl mx-auto">
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
                  <span className="font-bold text-cyan-400">Google Maps Online</span>
                </div>
                <div className="bg-[#21262D] p-2.5 rounded-xl border border-[#30363D]">
                  <span className="text-[10px] text-slate-400 block">Map Tiles</span>
                  <span className="font-bold text-white">{state.appSettings.mapTheme === 'satellite' ? 'Google Hybrid' : 'Google Roadmap'}</span>
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
      <nav className="min-h-[58px] sm:min-h-[64px] bg-[#161B22] border-t border-[#30363D] px-1 sm:px-4 flex items-center justify-around z-40 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1 shadow-[0_-4px_16px_rgba(0,0,0,0.5)]">
        {[
          { id: 'Home', label: t.navHome, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { id: 'Map', label: t.navMap, icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
          { id: 'Route', label: t.navRoute, icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          { id: 'Alerts', label: t.navAlerts, icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', badge: journey.detectedHazard ? 1 : hazards.filter(h => h.status === 'ACTIVE').length },
          { id: 'More', label: t.navMore, icon: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveBottomNav(tab.id as any)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 sm:px-2 rounded-xl transition-colors duration-150 relative cursor-pointer touch-manipulation select-none ${
              activeBottomNav === tab.id
                ? 'text-[#AEF5F0] font-bold bg-[#AEF5F0]/10 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5">{tab.label}</span>
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

      {/* A* Algorithm Path Decision Engine Modal */}
      <AStarModal
        isOpen={isAStarModalOpen}
        onClose={() => setIsAStarModalOpen(false)}
        evaluationResult={state.aStarEvaluation}
        language={language}
        vehicleType={journey.vehicleType}
        onSelectRoute={(routeId) => handleSelectOptimalRoute(routeId)}
      />
    </div>
  );
};
