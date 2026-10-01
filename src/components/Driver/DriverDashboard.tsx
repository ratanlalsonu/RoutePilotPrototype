import React, { useState } from 'react';
import { RoutePilotState, realtimeSync } from '../../services/realtimeSync';
import { RoutePilotMap } from '../Map/RoutePilotMap';
import { SettingsModal } from '../Common/SettingsModal';
import { VehicleType } from '../../types';
import { searchPlaces } from '../../services/geocodingService';

interface DriverDashboardProps {
  state: RoutePilotState;
  onSwitchMode: (mode: 'admin' | 'driver') => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ state, onSwitchMode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeBottomNav, setActiveBottomNav] = useState('Home');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);

  const { journey, hazards, sensorNodes } = state;

  const handleAcquireRealGps = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsAcquiringGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsAcquiringGps(false);
          const { latitude, longitude } = pos.coords;
          realtimeSync.updateDriverLocationFromGps(latitude, longitude, 'Live Device GPS');
        },
        (err) => {
          setIsAcquiringGps(false);
          alert(`GPS Notice: ${err.message}. Ensure location permissions are allowed.`);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      alert('Geolocation API not supported in this browser.');
    }
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length > 1) {
      const results = await searchPlaces(val, state.appSettings.googleMapsApiKey);
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSelectDestination = (dest: any) => {
    realtimeSync.setDestination({
      name: dest.name,
      lat: dest.lat,
      lng: dest.lng,
    });
    setSearchQuery(dest.name);
    setShowSearchResults(false);
  };

  const handleVehicleSelect = (type: VehicleType) => {
    realtimeSync.setVehicleType(type);
  };

  const toggleNavigation = () => {
    realtimeSync.setNavigating(!journey.isNavigating);
  };

  const handleAdvanceStep = () => {
    realtimeSync.advanceVehicle(1);
  };

  const handleOkFindAlternates = () => {
    realtimeSync.handleDriverConfirmFindAlternates();
  };

  const handleCommitRoute = (routeId: string) => {
    realtimeSync.commitToAlternateRoute(routeId);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* Header matching screenshot Image 1 */}
      <header className="h-14 border-b border-slate-800/80 bg-[#0c1322] px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">RoutePilot</span>
              <span className="text-[10px] font-mono uppercase bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30">
                Driver Navigation
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-sm hidden sm:block">
              Real-Time Road & Bridge Hazard Detection with Intelligent Route Diversion System
            </p>
          </div>
        </div>

        {/* Center Mode Switch */}
        <div className="flex items-center bg-[#080d19] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onSwitchMode('admin')}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            Admin Mode
          </button>
          <button
            onClick={() => onSwitchMode('driver')}
            className="px-4 py-1.5 rounded-lg text-xs font-bold transition bg-blue-600 text-white shadow-md shadow-blue-600/30"
          >
            Driver Mode
          </button>
        </div>

        {/* Right Status */}
        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>GPS: Connected</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0"/></svg>
            <span>Online</span>
          </div>

          <div className="text-right hidden sm:block">
            <div className="font-mono text-xs font-semibold text-slate-200">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] text-slate-400">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>

          {/* Map Dark Mode Toggle */}
          <button
            onClick={() => realtimeSync.toggleMapTheme()}
            title={`Map Theme: ${state.appSettings.mapTheme === 'dark' ? 'Dark Mode' : 'Standard OSM'} (Click to toggle)`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141e33] border border-slate-700/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            <span>{state.appSettings.mapTheme === 'dark' ? '🌙 Dark Map' : '☀️ Light Map'}</span>
          </button>

          {/* Settings Icon */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="RoutePilot Settings & API Key"
            className="p-2 rounded-lg bg-[#141e33] border border-slate-700/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Driver Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Info Panel matching screenshot Image 1 */}
        <div className="w-80 bg-[#0c1322] border-r border-slate-800/80 flex flex-col justify-between shrink-0 overflow-y-auto z-10 hidden md:flex">
          <div className="p-4 space-y-4">
            {/* Navigation Card Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                </div>
                <span className="font-bold text-sm text-white">Navigation</span>
              </div>
              <span className="text-slate-400 text-xs">● Active</span>
            </div>

            {/* Destination Search */}
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search destination..."
                  className="w-full bg-[#131d33] border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </div>

              {/* Autocomplete Dropdown */}
              {showSearchResults && (
                <div className="absolute top-12 left-0 right-0 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectDestination(item)}
                      className="p-2.5 hover:bg-slate-800/80 cursor-pointer border-b border-slate-800/60 last:border-none text-xs"
                    >
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.displayName}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Origin & Destination Display */}
            <div className="bg-[#11192e] border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shrink-0 mt-0.5"></span>
                  <div>
                    <div className="text-[10px] text-slate-400">Current Location</div>
                    <div className="font-medium text-slate-200">{journey.origin.name}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAcquireRealGps}
                  title="Locate via device GPS"
                  className="px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <svg className={`w-3 h-3 ${isAcquiringGps ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
                  <span>{isAcquiringGps ? 'Locating...' : 'Real GPS'}</span>
                </button>
              </div>

              <div className="border-l-2 border-dashed border-slate-700 ml-1.5 h-3"></div>

              <div className="flex items-start gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shrink-0 mt-0.5"></span>
                <div className="truncate">
                  <div className="text-[10px] text-slate-400">Destination</div>
                  <div className={`font-bold text-xs truncate ${journey.destination?.name ? 'text-blue-300' : 'text-slate-400 italic'}`}>
                    {journey.destination?.name || 'Not set — Type search above'}
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Selection */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">Vehicle Type</div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: 'car', label: 'Car', icon: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z' },
                  { id: 'bike', label: 'Bike', icon: 'M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L9 6H6m6 11.5l3.5-7 3.5 2' },
                  { id: 'van', label: 'Van', icon: 'M1 5h16v12H1zM17 9l4 2v6h-4' },
                  { id: 'bus', label: 'Bus', icon: 'M4 3h16v16H4zM4 11h16' },
                  { id: 'truck', label: 'Truck', icon: 'M1 3h15v13H1zM16 8h4l3 3v5h-7z' },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleVehicleSelect(v.id as VehicleType)}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 border transition cursor-pointer ${
                      journey.vehicleType === v.id
                        ? 'bg-blue-600/30 border-blue-500 text-blue-400 shadow-md shadow-blue-500/20'
                        : 'bg-[#11192e] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={v.icon}/></svg>
                    <span className="text-[10px] font-semibold">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Navigation / Demo Controls */}
            <div className="space-y-2">
              <button
                onClick={toggleNavigation}
                disabled={!journey.destination?.name}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                  !journey.destination?.name
                    ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-70'
                    : journey.isNavigating
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  {journey.isNavigating ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  )}
                </svg>
                <span>
                  {!journey.destination?.name
                    ? 'Select Destination Above'
                    : journey.isNavigating
                    ? 'Pause Navigation'
                    : 'Start Navigation'}
                </span>
              </button>

              {/* Demo GPS step simulator button */}
              <div className="bg-[#11192e] p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-emerald-400">DEMO GPS — SIMULATED LOCATION</span>
                  <button
                    onClick={handleAdvanceStep}
                    disabled={!journey.isNavigating}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                      journey.isNavigating
                        ? 'bg-blue-600/40 border border-blue-500/50 hover:bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    Step Forward →
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  Vehicle progresses naturally along real road geometry.
                </div>
              </div>
            </div>

            {/* Current Journey Stats Card */}
            <div className="bg-[#11192e] border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-semibold text-white mb-2">Current Journey</div>
              <div className="flex items-center justify-between">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-slate-400">Distance:</span>
                    <span className="font-mono font-bold text-white">
                      {journey.activeRoute ? `${journey.remainingDistanceKm} km` : '--'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-slate-400">ETA:</span>
                    <span className="font-mono font-bold text-white">
                      {journey.activeRoute ? journey.eta : '--:--'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-slate-400">Est. Time:</span>
                    <span className="font-mono font-bold text-white">
                      {journey.activeRoute ? `${journey.remainingDurationMinutes} min` : '--'}
                    </span>
                  </div>
                </div>

                {/* Speed Gauge matching screenshot */}
                <div className="w-16 h-16 rounded-full border-4 border-blue-500/40 bg-blue-500/10 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-extrabold text-white leading-none">
                    {journey.isNavigating ? journey.currentSpeedKmh : 0}
                  </span>
                  <span className="text-[8px] text-slate-400 uppercase">km/h</span>
                </div>
              </div>
            </div>

            {/* Route Status Card */}
            <div className="bg-[#11192e] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400">Route Status</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${
                    journey.activeRoute ? (journey.activeRouteId === 'route_b' ? 'bg-emerald-400' : 'bg-blue-400') : 'bg-slate-500'
                  }`}></span>
                  <span className="text-xs font-bold text-white">
                    {journey.activeRoute ? journey.activeRoute.name : 'Standby / Awaiting Destination'}
                  </span>
                </div>
              </div>
              <span className="text-slate-500">›</span>
            </div>
          </div>

          <div className="p-3 border-t border-slate-800/80 text-[10px] text-slate-500 text-center">
            RoutePilot • B.Tech Project Prototype
          </div>
        </div>

        {/* Center Map View */}
        <div className="flex-1 relative h-full">
          <RoutePilotMap
            mode="driver"
            hazards={hazards}
            sensorNodes={sensorNodes}
            journey={journey}
            onCommitRoute={handleCommitRoute}
            theme={state.appSettings.mapTheme}
            onToggleTheme={() => realtimeSync.toggleMapTheme()}
          />
        </div>

        {/* Right Panel: Hazard Alert & Route Alternatives matching screenshot Image 1 */}
        <div className="w-88 bg-[#0c1322] border-l border-slate-800/80 flex flex-col justify-between shrink-0 p-4 space-y-4 overflow-y-auto z-10 hidden lg:flex">
          <div className="space-y-4">
            {/* 1. Prominent Hazard Alert Box matching screenshot Image 1 */}
            {journey.detectedHazard && journey.diversionState === 'HAZARD_DETECTED' && (
              <div className="bg-gradient-to-br from-red-950/60 to-[#120a12] border-2 border-red-500/80 rounded-2xl p-4 shadow-2xl animate-pulse">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-red-200 tracking-wide uppercase">HAZARD DETECTED</h4>
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

                {/* THE CORE BUTTON: OK - Find Alternate Routes */}
                <button
                  onClick={handleOkFindAlternates}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/40 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>OK – Find Alternate Routes</span>
                </button>
              </div>
            )}

            {/* 2. Alternative Routes Section matching screenshot Image 1 */}
            {journey.alternativeRoutes && journey.alternativeRoutes.length > 0 && (
              <div className="bg-[#11192e] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                    <span className="font-bold text-xs text-white">Alternative Routes</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {journey.alternativeRoutes.length} available
                  </span>
                </div>

                <div className="text-[10px] text-slate-400">
                  Routes are displayed directly on the map. Entering a route commits it automatically.
                </div>

                {/* List of alternative route options */}
                <div className="space-y-2">
                  {journey.alternativeRoutes.map((alt) => (
                    <div
                      key={alt.id}
                      onClick={() => handleCommitRoute(alt.id)}
                      className="p-2.5 rounded-xl border border-slate-700/80 bg-[#162238] hover:border-slate-500 cursor-pointer transition flex items-center justify-between"
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

                      {/* Guide/Commit action tag */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCommitRoute(alt.id);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700 transition"
                      >
                        Follow Route
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Live Trip Status Progress Card matching screenshot Image 1 */}
            <div className="bg-[#11192e] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/></svg>
                <span>Live Trip Status</span>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Journey Progress</span>
                  <span className="font-mono text-blue-400 font-bold">{journey.progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500 shadow-md shadow-blue-500/50"
                    style={{ width: `${journey.progressPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
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
          </div>

          <div className="bg-[#11192e] border border-slate-800 rounded-xl p-2.5 text-center text-[10px] text-slate-400">
            Intelligent Multi-Route Dynamic Diversion Active
          </div>
        </div>
      </div>

      {/* Driver Bottom Navigation Bar matching screenshot Image 1 */}
      <nav className="h-16 bg-[#0c1322] border-t border-slate-800/80 px-4 flex items-center justify-around z-20 shrink-0">
        {[
          { id: 'Home', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { id: 'Map', label: 'Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
          { id: 'Route', label: 'Route', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          { id: 'Alerts', label: 'Alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', badge: journey.detectedHazard ? 1 : 0 },
          { id: 'More', label: 'More', icon: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveBottomNav(tab.id)}
            className={`flex flex-col items-center gap-1 transition relative cursor-pointer ${
              activeBottomNav === tab.id ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
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
          <div className="bg-[#0f172a] border border-emerald-500/50 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl space-y-4">
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

            <div className="bg-[#141e33] border border-slate-700 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs text-left">
              <div>
                <span className="text-slate-400 block text-[10px]">Distance Travelled</span>
                <span className="font-mono text-white font-bold">{journey.totalDistanceKm} km</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Journey Duration</span>
                <span className="font-mono text-white font-bold">18 min</span>
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

      {/* Settings & API Key Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={state.appSettings}
      />
    </div>
  );
};
