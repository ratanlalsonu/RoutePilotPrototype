import React, { useState } from 'react';
import { RoutePilotState, realtimeSync } from '../../services/realtimeSync';
import { RoutePilotMap } from '../Map/RoutePilotMap';
import { CreateHazardModal } from './CreateHazardModal';
import { SettingsModal } from '../Common/SettingsModal';
import { AStarAlgorithmTab } from './Tabs/AStarAlgorithmTab';
import { HazardType, HazardSeverity } from '../../types';
import { hardwareSimEngine } from '../../services/hardwareSimulationEngine';
import { roadConstructionEngine } from '../../services/roadConstructionEngine';
import { DashboardView } from './Tabs/DashboardView';
import { HazardsTab } from './Tabs/HazardsTab';
import { SensorsTab } from './Tabs/SensorsTab';
import { ActiveDriversTab } from './Tabs/ActiveDriversTab';
import { RoadStatusTab } from './Tabs/RoadStatusTab';
import { RouteEventsTab } from './Tabs/RouteEventsTab';
import { SystemLogsTab } from './Tabs/SystemLogsTab';
import { AnalyticsTab } from './Tabs/AnalyticsTab';
import { getTranslation } from '../../services/i18n';
import { NotificationCenterDropdown } from '../Common/NotificationCenterDropdown';

interface AdminDashboardProps {
  state: RoutePilotState;
  onSwitchMode: (mode: 'admin' | 'driver') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onSwitchMode }) => {
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [isCreatingHazard, setIsCreatingHazard] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
  const [sensorSubMode, setSensorSubMode] = useState<'ROAD_CONSTRUCTION' | 'BRIDGE_SENSORS'>('ROAD_CONSTRUCTION');
  const [roadConstructionStatus, setRoadConstructionStatus] = useState<'ACTIVE' | 'COMPLETED'>(() => {
    return roadConstructionEngine.getConstructionStatus();
  });
  const [isSensorSubMenuOpen, setIsSensorSubMenuOpen] = useState(true);

  const lang = state.appSettings.language || 'en';
  const t = getTranslation(lang);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const { hazards, sensorNodes, journey, routeEvents, roadStatuses, systemHealth } = state;

  const activeHazardsCount = hazards.filter((h) => h.status === 'ACTIVE').length;
  const onlineSensorsCount = sensorNodes.filter((s) => s.status === 'Online').length;
  const blockedRoadsCount = roadStatuses.filter((r) => r.status === 'Blocked').length;

  const handleMapClickForHazard = (lat: number, lng: number) => {
    // 1. Road Construction Simulation mode
    if (sensorSubMode === 'ROAD_CONSTRUCTION') {
      if (roadConstructionStatus === 'COMPLETED') {
        // User requested: "jab road construction completed ho to map par kahi bhi click kare to click na ho"
        showToast(
          lang === 'hi'
            ? 'ℹ️ रोड कंस्ट्रक्शन कार्य पूरा (Completed) है! मैप पर खतरा लगाने के लिए सिमुलेशन में स्टेटस "Active" करें।'
            : 'ℹ️ Road Construction is marked COMPLETED! Set status to "Active" in simulation to place hazard.'
        );
        return; // Block placement: click na ho!
      }

      // When Road Construction is ACTIVE:
      // "jab road contruction active ho to map par kahi bhi clicl karke hazard laga paye"
      setClickedCoords({ lat, lng });
      // Update road construction engine GPS & telemetry coordinates to clicked point without prematurely creating a hazard
      roadConstructionEngine.setCoordinates(
        lat,
        lng,
        `Work Zone (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
        'Active Road Corridor'
      );
      setIsModalOpen(true);
      setIsCreatingHazard(false);
      return;
    }

    // 2. Bridge Sensors mode (Untouched, preserved 100%)
    const simState = hardwareSimEngine.getState();
    if (simState.overallStatus === 'SAFE') {
      showToast(
        lang === 'hi'
          ? '⚠️ सिमुलेशन में कोई खतरा नहीं है! मैप पर खतरा लगाने के लिए पहले "सेंसर नोड्स" में एनोमली ट्रिगर करें।'
          : '⚠️ No hazard in simulation! Please trigger an anomaly in Sensor Nodes simulation before placing on map.'
      );
      return;
    }
    setClickedCoords({ lat, lng });
    setIsModalOpen(true);
    setIsCreatingHazard(false);
  };

  const handleCreateHazardSubmit = (data: {
    type: HazardType;
    severity: HazardSeverity;
    latitude: number;
    longitude: number;
    locationName: string;
    roadName: string;
    affectedRadius: number;
    description: string;
    source: any;
  }) => {
    const created = realtimeSync.createHazard(data);
    showToast(`Hazard ${created.hazardId} (${data.type}) created successfully!`);
  };

  // Demo Shortcuts for testing and faculty evaluation
  const handleQuickHazardOnRoute = () => {
    const j = realtimeSync.getState().journey;
    let lat = 25.4585;
    let lng = 78.5765;
    let locationName = 'Civil Lines Corridor';
    let roadName = 'Civil Lines Road';

    if (j.activeRoute && j.activeRoute.coordinates.length > 4) {
      const pIdx = j.currentLocation?.pointIndex || 0;
      const targetIdx = Math.min(
        j.activeRoute.coordinates.length - 2,
        Math.max(1, pIdx + Math.max(2, Math.floor((j.activeRoute.coordinates.length - pIdx) * 0.45)))
      );
      lat = j.activeRoute.coordinates[targetIdx][0];
      lng = j.activeRoute.coordinates[targetIdx][1];
      roadName = j.activeRoute.viaRoads[0] || 'Active Road Corridor';
      locationName = `Ahead on ${roadName}`;
    }

    if (sensorSubMode === 'ROAD_CONSTRUCTION') {
      // 🚧 ROAD CONSTRUCTION MODE
      roadConstructionEngine.setCoordinates(lat, lng, `Construction Zone: ${locationName}`, roadName);

      const created = realtimeSync.createHazard({
        type: 'Road Construction',
        severity: 'WARNING',
        latitude: lat,
        longitude: lng,
        locationName: `Work Zone (${roadName})`,
        roadName,
        affectedRadius: 220,
        description: '[IoT Road Construction Beacon (ESP32 + SIM7600)]: Active road reconstruction & lane barricade on driver active route.',
        source: 'LIVE_HARDWARE',
      });
      showToast(
        lang === 'hi'
          ? `🚧 रोड कंस्ट्रक्शन का खतरा (${created.hazardId}) ड्राइवर रूट पर लगाया गया!`
          : `🚧 Road Construction Hazard (${created.hazardId}) placed directly on Driver Route!`
      );
    } else {
      // 🌉 BRIDGE MODE
      const simData = hardwareSimEngine.getSimulationHazardData();
      const hazardType = simData.isHazard ? simData.type : 'Bridge Damage';
      const hazardSeverity = simData.isHazard ? simData.severity : 'CRITICAL';
      const hazardRadius = simData.isHazard ? simData.affectedRadius : 220;
      const hazardDesc = simData.isHazard
        ? `Active Bridge Sensor Telemetry: ${simData.description}`
        : 'Critical bridge structural defect & deck anomaly detected on active route segment';
      const hazardSource = simData.isHazard ? 'LIVE_HARDWARE' : 'ADMIN';

      const created = realtimeSync.createHazard({
        type: hazardType,
        severity: hazardSeverity,
        latitude: lat,
        longitude: lng,
        locationName: `Bridge Span: ${locationName}`,
        roadName,
        affectedRadius: hazardRadius,
        description: hazardDesc,
        source: hazardSource,
      });
      showToast(
        lang === 'hi'
          ? `🌉 ब्रिज का खतरा (${hazardType}) ड्राइवर रूट पर लगाया गया!`
          : `🌉 Bridge Structural Hazard (${hazardType}) placed directly on Driver Route!`
      );
    }
  };

  const handleQuickHazardAwayFromRoute = () => {
    const j = realtimeSync.getState().journey;
    let lat = 25.4380;
    let lng = 78.5520;
    let locationName = 'Divergent Perimeter Road (Away)';
    let roadName = 'Outer Link Bypass';

    if (j.activeRoute && j.activeRoute.coordinates.length > 2) {
      const mid = j.activeRoute.coordinates[Math.floor(j.activeRoute.coordinates.length / 2)];
      lat = mid[0] + 0.035; // ~3.8 km away
      lng = mid[1] + 0.035;
      locationName = 'Perimeter Area (Away from Route)';
    }

    if (sensorSubMode === 'ROAD_CONSTRUCTION') {
      // 🚧 ROAD CONSTRUCTION MODE
      roadConstructionEngine.setCoordinates(lat, lng, `Remote Work Zone: ${locationName}`, roadName);

      realtimeSync.createHazard({
        type: 'Road Construction',
        severity: 'WARNING',
        latitude: lat,
        longitude: lng,
        locationName,
        roadName,
        affectedRadius: 150,
        description: '[IoT Road Work Zone]: Scheduled pavement resurfacing away from driver active corridor (no alert expected)',
        source: 'LIVE_HARDWARE',
      });
      showToast(
        lang === 'hi'
          ? '🚧 रोड कंस्ट्रक्शन का खतरा रूट से दूर लगाया गया (कोई अलर्ट नहीं, जैसा अपेक्षित था)।'
          : '🚧 Road Construction hazard placed away from driver corridor (no alert as expected).'
      );
    } else {
      // 🌉 BRIDGE MODE
      realtimeSync.createHazard({
        type: 'Bridge Damage',
        severity: 'CRITICAL',
        latitude: lat,
        longitude: lng,
        locationName: `Remote Bridge Overpass (${locationName})`,
        roadName,
        affectedRadius: 180,
        description: 'Bridge structural pier defect on remote bypass away from driver route (no alert expected)',
        source: 'LIVE_HARDWARE',
      });
      showToast(
        lang === 'hi'
          ? '🌉 ब्रिज का खतरा रूट से दूर लगाया गया (कोई अलर्ट नहीं, जैसा अपेक्षित था)।'
          : '🌉 Bridge Structural hazard placed away from driver corridor (no alert as expected).'
      );
    }
  };

  const handleQuickSecondHazardAhead = () => {
    const j = realtimeSync.getState().journey;
    let lat = 25.4642;
    let lng = 78.5728;
    let locationName = 'Forward Route Segment';
    let roadName = 'Forward Arterial Rd';

    if (j.activeRoute && j.activeRoute.coordinates.length > 4) {
      const pIdx = j.currentLocation?.pointIndex || 0;
      const targetIdx = Math.min(
        j.activeRoute.coordinates.length - 1,
        Math.max(1, pIdx + Math.max(3, Math.floor((j.activeRoute.coordinates.length - pIdx) * 0.75)))
      );
      lat = j.activeRoute.coordinates[targetIdx][0];
      lng = j.activeRoute.coordinates[targetIdx][1];
      roadName = j.activeRoute.viaRoads[1] || j.activeRoute.viaRoads[0] || 'Forward Corridor';
      locationName = `Farther ahead on ${roadName}`;
    }

    if (sensorSubMode === 'ROAD_CONSTRUCTION') {
      // 🚧 ROAD CONSTRUCTION MODE
      roadConstructionEngine.setCoordinates(lat, lng, `2nd Work Zone: ${locationName}`, roadName);

      realtimeSync.createHazard({
        type: 'Road Construction',
        severity: 'WARNING',
        latitude: lat,
        longitude: lng,
        locationName: `2nd Road Work Zone (${roadName})`,
        roadName,
        affectedRadius: 200,
        description: '[IoT Road Construction Beacon]: 2nd Work Zone ahead on diverted corridor testing dynamic multi-diversion!',
        source: 'LIVE_HARDWARE',
      });
      showToast(
        lang === 'hi'
          ? '🚧 दूसरा रोड कंस्ट्रक्शन खतरा आगे डायवर्टेड रूट पर लगाया गया (मल्टी-डायवर्जन टेस्ट)!'
          : '🚧 2nd Road Construction Hazard placed ahead on route to test dynamic multi-diversion!'
      );
    } else {
      // 🌉 BRIDGE MODE
      realtimeSync.createHazard({
        type: 'Bridge Damage',
        severity: 'CRITICAL',
        latitude: lat,
        longitude: lng,
        locationName: `2nd Bridge Structure (${roadName})`,
        roadName,
        affectedRadius: 200,
        description: '2nd Critical bridge pier vibration anomaly ahead on diverted route testing multi-diversion!',
        source: 'LIVE_HARDWARE',
      });
      showToast(
        lang === 'hi'
          ? '🌉 दूसरा ब्रिज खतरा आगे डायवर्टेड रूट पर लगाया गया (मल्टी-डायवर्जन टेस्ट)!'
          : '🌉 2nd Bridge Hazard placed ahead on route to test dynamic multi-diversion!'
      );
    }
  };

  return (
    <div className={`flex flex-col h-full w-full max-w-full h-[100dvh] ${state.appSettings.appTheme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#0D1117] text-slate-100'} overflow-hidden font-sans min-h-0`}>
      {/* Header matching screenshot Image 2 */}
      <header className="h-14 border-b border-[#30363D] bg-[#161B22] px-1 sm:px-4 flex items-center justify-between z-20 shrink-0 gap-1 sm:gap-3">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Three-line icon to open and close sidebar (Only 3 lines) */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            className="p-1 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#21262D] transition cursor-pointer flex items-center justify-center shrink-0"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[#AEF5F0] flex items-center justify-center text-slate-950 shadow-md shadow-[#AEF5F0]/25 shrink-0">
            <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-extrabold text-xs sm:text-base tracking-tight text-white inline shrink-0">RoutePilot</span>
            <span className="hidden md:inline-flex text-[10px] font-mono uppercase bg-[#AEF5F0]/15 text-[#AEF5F0] px-1.5 py-0.5 rounded border border-[#AEF5F0]/30">
              {t.commandCenter}
            </span>
          </div>
        </div>

        {/* Center Mode Switch */}
        <div className="flex items-center bg-[#0D1117] p-0.5 sm:p-1 rounded-xl border border-[#30363D] shrink-0">
          <button
            onClick={() => onSwitchMode('admin')}
            className="px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition bg-[#AEF5F0] text-slate-950 shadow-md shadow-[#AEF5F0]/30 cursor-pointer"
          >
            <span className="hidden sm:inline">{t.adminMode}</span>
            <span className="sm:hidden">{lang === 'hi' ? 'एडमिन' : 'Admin'}</span>
          </button>
          <button
            onClick={() => onSwitchMode('driver')}
            className="px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition text-slate-400 hover:text-white hover:bg-[#21262D] cursor-pointer"
          >
            <span className="hidden sm:inline">{t.driverMode}</span>
            <span className="sm:hidden">{lang === 'hi' ? 'ड्राइवर' : 'Driver'}</span>
          </button>
        </div>

        {/* Right Status Badges & Controls - NEVER HIDDEN */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-xs shrink-0">
          <div className="hidden lg:flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{t.systemOnline}</span>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{t.databaseConnected}</span>
          </div>

          {/* Quick Language Toggle */}
          <button
            type="button"
            onClick={() => realtimeSync.toggleLanguage()}
            title={lang === 'hi' ? 'Switch to English' : 'हिन्दी में बदलें'}
            className="flex items-center gap-0.5 sm:gap-1 p-1 sm:px-2 sm:py-1.5 rounded-lg border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] hover:border-[#AEF5F0]/40 text-slate-200 text-xs font-bold transition cursor-pointer shrink-0"
          >
            <span className="text-xs">🌐</span>
            <span className="hidden sm:inline text-[11px] font-semibold">{lang === 'hi' ? 'EN' : 'हिन्दी'}</span>
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
              {activeHazardsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-red-500 text-white text-[8px] sm:text-[9px] font-bold flex items-center justify-center border-2 border-[#161B22] animate-pulse">
                  {activeHazardsCount}
                </span>
              )}
            </button>

            {/* Notification Center Dropdown */}
            <NotificationCenterDropdown
              isOpen={notificationOpen}
              onClose={() => setNotificationOpen(false)}
              hazards={hazards}
              routeEvents={routeEvents}
              language={lang}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                setNotificationOpen(false);
              }}
            />
          </div>

          <div className="text-right hidden xl:block">
            <div className="font-mono text-xs font-semibold text-slate-200">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] text-slate-400">
              {new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
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

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* Mobile Backdrop for sidebar drawer */}
        <div
          className={`fixed inset-0 top-14 z-30 bg-black/60 backdrop-blur-xs md:hidden transition-opacity duration-300 ease-out ${
            isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Left Sidebar (Desktop in-flow smooth collapse/expand, Mobile slide-over drawer) */}
        <aside
          className={`fixed md:static top-14 bottom-0 left-0 z-40 md:z-10 bg-[#161B22] border-r border-[#30363D] flex flex-col justify-between shrink-0 shadow-2xl md:shadow-none overflow-hidden will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:transition-[width,opacity] md:duration-300 md:ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isSidebarOpen
              ? 'translate-x-0 w-64 md:w-56 opacity-100 pointer-events-auto'
              : '-translate-x-full md:translate-x-0 w-64 md:w-0 md:opacity-0 md:border-r-transparent pointer-events-none'
          }`}
        >
          <div className="w-64 md:w-56 flex flex-col justify-between h-full shrink-0">
            <nav className="p-3 space-y-1 overflow-y-auto">
              {[
                { id: 'Dashboard', label: t.tabDashboard, icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                { id: 'Live Map', label: t.tabLiveMap, icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
                { id: 'Hazards', label: t.tabHazards, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
                { id: 'Sensor Nodes', label: t.tabSensors, icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0' },
                { id: 'Active Drivers', label: t.tabDrivers, icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
                { id: 'Road Status', label: t.tabRoadStatus, icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
                { id: 'A* Algorithm', label: t.tabAlgorithm, icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { id: 'Route Events', label: t.tabRouteEvents, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { id: 'System Logs', label: t.tabSystemLogs, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { id: 'Analytics', label: t.tabAnalytics, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { id: 'Settings', label: t.tabSettings, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
              ].map((item) => {
                if (item.id === 'Sensor Nodes') {
                  const isSensorsActive = activeTab === 'Sensor Nodes';
                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={() => {
                          setActiveTab('Sensor Nodes');
                          setIsSensorSubMenuOpen(true);
                          if (typeof window !== 'undefined' && window.innerWidth < 768) {
                            setIsSidebarOpen(false);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                          isSensorsActive
                            ? 'bg-[#AEF5F0] text-slate-950 font-bold shadow-md shadow-[#AEF5F0]/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-[#21262D]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                          </svg>
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[10px] opacity-75">{isSensorsActive || isSensorSubMenuOpen ? '▾' : '▸'}</span>
                      </button>

                      {/* TWO OPTIONS: ROAD MODE or BRIDGE MODE */}
                      {(isSensorsActive || isSensorSubMenuOpen) && (
                        <div className="pl-6 pr-1 py-1 space-y-1 bg-[#0D1117]/80 rounded-xl border border-[#30363D] animate-fadeIn">
                          <button
                            onClick={() => {
                              setActiveTab('Sensor Nodes');
                              setSensorSubMode('ROAD_CONSTRUCTION');
                              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                setIsSidebarOpen(false);
                              }
                            }}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                              isSensorsActive && sensorSubMode === 'ROAD_CONSTRUCTION'
                                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-[#21262D]'
                            }`}
                          >
                            <span>🚧</span>
                            <span>Road Mode</span>
                            {isSensorsActive && sensorSubMode === 'ROAD_CONSTRUCTION' && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('Sensor Nodes');
                              setSensorSubMode('BRIDGE_SENSORS');
                              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                setIsSidebarOpen(false);
                              }
                            }}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                              isSensorsActive && sensorSubMode === 'BRIDGE_SENSORS'
                                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-[#21262D]'
                            }`}
                          >
                            <span>🌉</span>
                            <span>Bridge Mode</span>
                            {isSensorsActive && sensorSubMode === 'BRIDGE_SENSORS' && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'Settings') {
                        setIsSettingsOpen(true);
                      } else {
                        setActiveTab(item.id);
                      }
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                      activeTab === item.id
                        ? 'bg-[#AEF5F0] text-slate-950 font-bold shadow-md shadow-[#AEF5F0]/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#21262D]'
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-[#30363D] dark:border-[#30363D]">
              <button
                onClick={() => {
                  realtimeSync.resetAdminActivity();
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
                className="btn-reset-demo w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                title={lang === 'hi' ? 'केवल एडमिन गतिविधि रीसेट करें (खतरे और सेंसर)' : 'Reset Admin Activity Only (Hazards & Sensors)'}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{lang === 'hi' ? 'एडमिन रीसेट' : 'Reset Admin'}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className={`flex-1 flex flex-col ${activeTab === 'Sensor Nodes' || activeTab === 'Live Map' ? 'overflow-hidden h-full' : 'overflow-y-auto'} bg-[#0D1117] transition-all duration-300 ease-in-out min-w-0`}>
          {activeTab === 'Dashboard' && (
            <div key="tab-dashboard" className="animate-tab-switch flex-1 flex flex-col">
              <DashboardView
                state={state}
                onNavigateTab={(tab) => {
                  if (tab === 'Settings') setIsSettingsOpen(true);
                  else if (tab === 'Road Construction') {
                    setActiveTab('Sensor Nodes');
                    setSensorSubMode('ROAD_CONSTRUCTION');
                  } else setActiveTab(tab);
                }}
                onOpenCreateHazard={() => {
                  setActiveTab('Live Map');
                  setIsCreatingHazard(true);
                }}
                onOpenCreateHazardModal={() => {
                  if (!clickedCoords) setClickedCoords({ lat: 25.4585, lng: 78.5765 });
                  setIsModalOpen(true);
                }}
                onCancelCreateHazard={() => setIsCreatingHazard(false)}
                isCreatingHazard={isCreatingHazard}
                onMapClickForHazard={handleMapClickForHazard}
                onQuickHazardOnRoute={handleQuickHazardOnRoute}
                onQuickHazardAwayFromRoute={handleQuickHazardAwayFromRoute}
                onQuickSecondHazardAhead={handleQuickSecondHazardAhead}
                sensorSubMode={sensorSubMode}
                onSensorSubModeChange={setSensorSubMode}
                roadConstructionStatus={roadConstructionStatus}
              />
            </div>
          )}

          {activeTab === 'Live Map' && (
            <div key="tab-live-map" className="animate-tab-switch flex-1 flex flex-col h-full bg-[#0D1117] overflow-hidden min-h-[550px]">
              {/* Map Bar: Controls & Quick Actions */}
              <div className="px-4 py-3 border-b border-[#30363D] bg-[#161B22] flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold text-sm text-white">Full-Screen Interactive Map & Road Routing</span>
                  <span className="text-xs text-slate-400 hidden sm:inline">• Real Road Geometry</span>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  {/* Mode Selector: Left: Bridge Mode | Right: Construction Mode */}
                  <div className="flex items-center bg-[#0D1117] p-0.5 rounded-xl border border-[#30363D]">
                    <button
                      type="button"
                      onClick={() => setSensorSubMode('BRIDGE_SENSORS')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        sensorSubMode === 'BRIDGE_SENSORS'
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 font-extrabold'
                          : 'text-slate-400 hover:text-white hover:bg-[#21262D]'
                      }`}
                      title="Select Bridge Mode: Place Bridge Structural & Sensor Hazards"
                    >
                      <span>🌉</span>
                      <span>Bridge Mode</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSensorSubMode('ROAD_CONSTRUCTION')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        sensorSubMode === 'ROAD_CONSTRUCTION'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md shadow-orange-500/25 font-extrabold'
                          : 'text-slate-400 hover:text-white hover:bg-[#21262D]'
                      }`}
                      title="Select Construction Mode: Place Road Construction Hazards"
                    >
                      <span>🚧</span>
                      <span>Construction Mode</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsCreatingHazard(!isCreatingHazard)}
                    title={
                      sensorSubMode === 'ROAD_CONSTRUCTION'
                        ? (lang === 'hi' ? 'रोड कंस्ट्रक्शन खतरा लगाने के लिए मैप पर क्लिक करें' : 'Pick on Map: Place Road Construction Hazard')
                        : (lang === 'hi' ? 'ब्रिज खतरा लगाने के लिए मैप पर क्लिक करें' : 'Pick on Map: Place Bridge Hazard')
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                      isCreatingHazard
                        ? 'bg-red-600 text-white border-red-500 animate-pulse'
                        : 'bg-[#21262D] border-[#30363D] hover:border-[#AEF5F0]/50 text-slate-200 hover:text-white'
                    }`}
                  >
                    <span>📍</span>
                    <span>{isCreatingHazard ? 'Click Map Point...' : 'Pick on Map'}</span>
                  </button>

                  <button
                    onClick={handleQuickHazardOnRoute}
                    title={
                      sensorSubMode === 'ROAD_CONSTRUCTION'
                        ? (lang === 'hi' ? 'ड्राइवर रूट पर रोड कंस्ट्रक्शन का खतरा बनाएं (अलर्ट ट्रिगर होगा)' : 'Creates Road Construction Hazard on active route (triggers alert)')
                        : (lang === 'hi' ? 'ड्राइवर रूट पर ब्रिज का खतरा बनाएं (अलर्ट ट्रिगर होगा)' : 'Creates Bridge Structural Hazard on active route (triggers alert)')
                    }
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#21262D] border border-[#30363D] hover:border-red-500 text-slate-200 hover:text-white transition cursor-pointer"
                  >
                    ⚠ Hazard on Driver Route
                  </button>

                  <button
                    onClick={handleQuickHazardAwayFromRoute}
                    title={
                      sensorSubMode === 'ROAD_CONSTRUCTION'
                        ? (lang === 'hi' ? 'दूर रोड कंस्ट्रक्शन खतरा बनाएं (कोई ड्राइवर अलर्ट नहीं)' : 'Creates Road Construction hazard away from route (no driver alert)')
                        : (lang === 'hi' ? 'दूर ब्रिज खतरा बनाएं (कोई ड्राइवर अलर्ट नहीं)' : 'Creates Bridge hazard far away (no driver alert)')
                    }
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#21262D] border border-[#30363D] hover:border-slate-500 text-slate-300 transition cursor-pointer"
                  >
                    Hazard Away (No Alert)
                  </button>

                  <button
                    onClick={handleQuickSecondHazardAhead}
                    title={
                      sensorSubMode === 'ROAD_CONSTRUCTION'
                        ? (lang === 'hi' ? 'डायवर्टेड रूट पर दूसरा रोड कंस्ट्रक्शन खतरा बनाएं (मल्टी-डायवर्जन टेस्ट)' : 'Creates 2nd Road Construction hazard ahead on diverted route (tests multi-diversion)')
                        : (lang === 'hi' ? 'डायवर्टेड रूट पर दूसरा ब्रिज खतरा बनाएं (मल्टी-डायवर्जन टेस्ट)' : 'Creates 2nd Bridge hazard ahead on diverted route (tests multi-diversion)')
                    }
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#21262D] border border-[#30363D] hover:border-amber-500 text-amber-300 transition cursor-pointer"
                  >
                    ⚠ 2nd Hazard Ahead
                  </button>

                  <button
                    onClick={() => realtimeSync.resetAdminActivity()}
                    title={lang === 'hi' ? 'केवल एडमिन गतिविधि रीसेट करें (खतरे और सेंसर)' : 'Reset Admin Activity Only (Hazards & Sensors)'}
                    className="p-1.5 rounded-xl bg-[#21262D] border border-[#30363D] hover:bg-[#30363D] text-slate-300 transition cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                </div>
              </div>

              {/* Map Canvas */}
              <div className="flex-1 relative w-full h-full min-h-[500px]">
                <RoutePilotMap
                  mode="admin"
                  hazards={hazards}
                  sensorNodes={sensorNodes}
                  journey={journey}
                  isCreatingHazard={isCreatingHazard}
                  onMapClickForHazard={handleMapClickForHazard}
                  onCancelCreateHazard={() => setIsCreatingHazard(false)}
                  onResolveHazard={(id) => {
                    realtimeSync.resolveHazard(id);
                    showToast(`Hazard ${id} resolved.`);
                  }}
                  onCommitRoute={(id) => realtimeSync.commitToAlternateRoute(id)}
                  theme={state.appSettings.mapTheme}
                  appTheme={state.appSettings.appTheme}
                  onToggleTheme={() => realtimeSync.toggleMapTheme()}
                  onChangeTheme={(t) => realtimeSync.setMapTheme(t)}
                  sensorSubMode={sensorSubMode}
                  roadConstructionStatus={roadConstructionStatus}
                />
              </div>
            </div>
          )}

          {activeTab === 'Hazards' && (
            <div key="tab-hazards" className="animate-tab-switch flex-1 flex flex-col">
              <HazardsTab
                hazards={hazards}
                onCreateHazardClick={() => {
                  setActiveTab('Live Map');
                  setIsCreatingHazard(true);
                }}
                onOpenCreateHazardModal={() => {
                  if (!clickedCoords) setClickedCoords({ lat: 25.4585, lng: 78.5765 });
                  setIsModalOpen(true);
                }}
                onQuickHazardOnRoute={handleQuickHazardOnRoute}
                onQuickHazardAwayFromRoute={handleQuickHazardAwayFromRoute}
                onQuickSecondHazardAhead={handleQuickSecondHazardAhead}
              />
            </div>
          )}

          {activeTab === 'Sensor Nodes' && (
            <div key="tab-sensors" className="animate-tab-switch flex-1 flex flex-col h-full min-h-0 overflow-hidden">
              <SensorsTab
                sensors={sensorNodes}
                sensorMode={state.appSettings.sensorMode}
                esp32Endpoint={state.appSettings.esp32Endpoint}
                onNavigateToMap={() => setActiveTab('Live Map')}
                initialDevice={sensorSubMode}
                onDeviceChange={setSensorSubMode}
                roadConstructionStatus={roadConstructionStatus}
                onRoadConstructionStatusChange={(st) => {
                  setRoadConstructionStatus(st);
                  roadConstructionEngine.setConstructionStatus(st);
                }}
                onPickOnMap={() => {
                  setActiveTab('Live Map');
                  setIsCreatingHazard(true);
                }}
              />
            </div>
          )}

          {activeTab === 'Active Drivers' && (
            <div key="tab-drivers" className="animate-tab-switch flex-1 flex flex-col">
              <ActiveDriversTab journey={journey} />
            </div>
          )}

          {activeTab === 'Road Status' && (
            <div key="tab-roads" className="animate-tab-switch flex-1 flex flex-col">
              <RoadStatusTab roadStatuses={roadStatuses} hazards={hazards} />
            </div>
          )}

          {activeTab === 'A* Algorithm' && (
            <div key="tab-astar" className="animate-tab-switch flex-1 flex flex-col">
              <AStarAlgorithmTab journey={journey} hazards={hazards} appTheme={state.appSettings.appTheme} language={lang} />
            </div>
          )}

          {activeTab === 'Route Events' && (
            <div key="tab-events" className="animate-tab-switch flex-1 flex flex-col">
              <RouteEventsTab events={routeEvents} />
            </div>
          )}

          {activeTab === 'System Logs' && (
            <div key="tab-logs" className="animate-tab-switch flex-1 flex flex-col">
              <SystemLogsTab systemHealth={systemHealth} />
            </div>
          )}

          {activeTab === 'Analytics' && (
            <div key="tab-analytics" className="animate-tab-switch flex-1 flex flex-col">
              <AnalyticsTab state={state} />
            </div>
          )}
        </main>
      </div>

      {/* Create Hazard Modal */}
      <CreateHazardModal
        lat={clickedCoords ? clickedCoords.lat : 25.4585}
        lng={clickedCoords ? clickedCoords.lng : 78.5765}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateHazardSubmit}
        onPickOnMap={() => {
          setActiveTab('Live Map');
          setIsCreatingHazard(true);
        }}
        onNavigateToSensors={() => {
          setIsModalOpen(false);
          setActiveTab('Sensor Nodes');
        }}
        initialHazardType={
          sensorSubMode === 'ROAD_CONSTRUCTION'
            ? 'Road Construction'
            : hardwareSimEngine.getSimulationHazardData().isHazard
            ? hardwareSimEngine.getSimulationHazardData().type
            : 'Bridge Damage'
        }
        hazardCategory={sensorSubMode === 'ROAD_CONSTRUCTION' ? 'ROAD' : 'BRIDGE'}
      />

      {/* Settings & API Key Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={state.appSettings}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-[3000] bg-[#161B22]/95 border border-[#AEF5F0]/60 text-white px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fade-in pointer-events-none">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
