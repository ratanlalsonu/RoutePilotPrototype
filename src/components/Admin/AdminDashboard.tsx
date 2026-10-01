import React, { useState } from 'react';
import { RoutePilotState, realtimeSync } from '../../services/realtimeSync';
import { RoutePilotMap } from '../Map/RoutePilotMap';
import { CreateHazardModal } from './CreateHazardModal';
import { SettingsModal } from '../Common/SettingsModal';
import { HazardType, HazardSeverity } from '../../types';
import { DashboardView } from './Tabs/DashboardView';
import { HazardsTab } from './Tabs/HazardsTab';
import { SensorsTab } from './Tabs/SensorsTab';
import { ActiveDriversTab } from './Tabs/ActiveDriversTab';
import { RoadStatusTab } from './Tabs/RoadStatusTab';
import { RouteEventsTab } from './Tabs/RouteEventsTab';
import { SystemLogsTab } from './Tabs/SystemLogsTab';
import { AnalyticsTab } from './Tabs/AnalyticsTab';

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

  const { hazards, sensorNodes, journey, routeEvents, roadStatuses, systemHealth } = state;

  const activeHazardsCount = hazards.filter((h) => h.status === 'ACTIVE').length;
  const onlineSensorsCount = sensorNodes.filter((s) => s.status === 'Online').length;
  const blockedRoadsCount = roadStatuses.filter((r) => r.status === 'Blocked').length;

  const handleMapClickForHazard = (lat: number, lng: number) => {
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
    realtimeSync.createHazard(data);
  };

  // Demo Shortcuts for testing and faculty evaluation
  const handleQuickHazardOnRoute = () => {
    realtimeSync.createHazard({
      type: 'Bridge Damage',
      severity: 'CRITICAL',
      latitude: 25.4585,
      longitude: 78.5765,
      locationName: 'Near Civil Lines Bridge',
      roadName: 'Civil Lines Road',
      affectedRadius: 220,
      description: 'Critical structural crack & pier displacement detected on bridge',
      source: 'ADMIN',
    });
  };

  const handleQuickHazardAwayFromRoute = () => {
    realtimeSync.createHazard({
      type: 'Road Construction',
      severity: 'WARNING',
      latitude: 25.4380,
      longitude: 78.5520,
      locationName: 'South Ring Bypass (Far Away)',
      roadName: 'Orchha Link Bypass',
      affectedRadius: 150,
      description: 'Scheduled resurfacing away from driver active corridor',
      source: 'ADMIN',
    });
  };

  const handleQuickSecondHazardAhead = () => {
    // Places second hazard ahead on Route B / Gwalior corridor to test repeated diversion!
    realtimeSync.createHazard({
      type: 'Road Blockage',
      severity: 'CRITICAL',
      latitude: 25.4642,
      longitude: 78.5728,
      locationName: 'North-West Gwalior Connector',
      roadName: 'Gwalior Arterial Rd',
      affectedRadius: 180,
      description: 'Overturned trailer blocking both lanes on diverted route',
      source: 'ADMIN',
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* Header matching screenshot Image 2 */}
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
              <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                Command Center
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
            className="px-4 py-1.5 rounded-lg text-xs font-bold transition bg-blue-600 text-white shadow-md shadow-blue-600/30"
          >
            Admin Mode
          </button>
          <button
            onClick={() => onSwitchMode('driver')}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            Driver Mode
          </button>
        </div>

        {/* Right Status Badges */}
        <div className="flex items-center gap-4 text-xs">
          <div className="hidden lg:flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>System Online</span>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Database Connected</span>
          </div>

          {/* Notification Icon */}
          <div className="relative">
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="p-2 rounded-lg bg-[#141e33] border border-slate-700/80 hover:bg-slate-700 text-slate-300 relative transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-[#0c1322]">
                {activeHazardsCount}
              </span>
            </button>
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

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar matching screenshot Image 2 */}
        <aside className="w-56 bg-[#0c1322] border-r border-slate-800/80 flex flex-col justify-between shrink-0 hidden md:flex">
          <nav className="p-3 space-y-1">
            {[
              { id: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
              { id: 'Live Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
              { id: 'Hazards', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
              { id: 'Sensor Nodes', icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0' },
              { id: 'Active Drivers', icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
              { id: 'Road Status', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
              { id: 'Route Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { id: 'System Logs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { id: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { id: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'Settings') {
                    setIsSettingsOpen(true);
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141e33]'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span>{item.id}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-800">
            <button
              onClick={() => realtimeSync.resetDemo()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Reset State / Logout</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#080d19]">
          {activeTab === 'Dashboard' && (
            <DashboardView
              state={state}
              onNavigateTab={(tab) => {
                if (tab === 'Settings') setIsSettingsOpen(true);
                else setActiveTab(tab);
              }}
              onOpenCreateHazard={() => {
                setActiveTab('Live Map');
                setIsCreatingHazard(true);
              }}
              isCreatingHazard={isCreatingHazard}
              onMapClickForHazard={handleMapClickForHazard}
              onQuickHazardOnRoute={handleQuickHazardOnRoute}
              onQuickHazardAwayFromRoute={handleQuickHazardAwayFromRoute}
              onQuickSecondHazardAhead={handleQuickSecondHazardAhead}
            />
          )}

          {activeTab === 'Live Map' && (
            <div className="flex-1 flex flex-col h-full bg-[#080d19] overflow-hidden min-h-[550px]">
              {/* Map Bar: Controls & Quick Actions */}
              <div className="px-4 py-3 border-b border-slate-800 bg-[#0d1424] flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold text-sm text-white">Full-Screen Interactive Map & Road Routing</span>
                  <span className="text-xs text-slate-400 hidden sm:inline">• Real Road Geometry</span>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <button
                    onClick={() => setIsCreatingHazard(!isCreatingHazard)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer ${
                      isCreatingHazard
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                    }`}
                  >
                    <span>+</span>
                    <span>{isCreatingHazard ? 'Click Map Point...' : 'Create Hazard Anywhere'}</span>
                  </button>

                  <button
                    onClick={handleQuickHazardOnRoute}
                    title="Creates Hazard on active route (triggers alert)"
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#162238] border border-slate-700 hover:border-red-500 text-slate-200 hover:text-white transition cursor-pointer"
                  >
                    ⚠ Hazard on Driver Route
                  </button>

                  <button
                    onClick={handleQuickHazardAwayFromRoute}
                    title="Creates hazard far away (proves rule 13: NO driver alert)"
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#162238] border border-slate-700 hover:border-slate-500 text-slate-300 transition cursor-pointer"
                  >
                    Hazard Away (No Alert)
                  </button>

                  <button
                    onClick={handleQuickSecondHazardAhead}
                    title="Creates second hazard ahead on diverted route (tests repeated diversion!)"
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#162238] border border-slate-700 hover:border-amber-500 text-amber-300 transition cursor-pointer"
                  >
                    ⚠ 2nd Hazard Ahead
                  </button>

                  <button
                    onClick={() => realtimeSync.resetDemo()}
                    title="Reset demo state"
                    className="p-1.5 rounded-xl bg-[#162238] border border-slate-700 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
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
                  onResolveHazard={(id) => realtimeSync.resolveHazard(id)}
                  onCommitRoute={(id) => realtimeSync.commitToAlternateRoute(id)}
                  theme={state.appSettings.mapTheme}
                  onToggleTheme={() => realtimeSync.toggleMapTheme()}
                />
              </div>
            </div>
          )}

          {activeTab === 'Hazards' && (
            <HazardsTab
              hazards={hazards}
              onCreateHazardClick={() => {
                setActiveTab('Live Map');
                setIsCreatingHazard(true);
              }}
            />
          )}

          {activeTab === 'Sensor Nodes' && (
            <SensorsTab
              sensors={sensorNodes}
              sensorMode={state.appSettings.sensorMode}
              esp32Endpoint={state.appSettings.esp32Endpoint}
            />
          )}

          {activeTab === 'Active Drivers' && (
            <ActiveDriversTab journey={journey} />
          )}

          {activeTab === 'Road Status' && (
            <RoadStatusTab roadStatuses={roadStatuses} hazards={hazards} />
          )}

          {activeTab === 'Route Events' && (
            <RouteEventsTab events={routeEvents} />
          )}

          {activeTab === 'System Logs' && (
            <SystemLogsTab systemHealth={systemHealth} />
          )}

          {activeTab === 'Analytics' && (
            <AnalyticsTab state={state} />
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
      />

      {/* Settings & API Key Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={state.appSettings}
      />
    </div>
  );
};
