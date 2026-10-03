import React, { useState, useEffect } from 'react';
import { realtimeSync, RoutePilotState } from './services/realtimeSync';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { DriverDashboard } from './components/Driver/DriverDashboard';

export function App() {
  const [state, setState] = useState<RoutePilotState>(realtimeSync.getState());
  const [activeMode, setActiveMode] = useState<'admin' | 'driver'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const m = urlParams.get('mode');
      if (m === 'admin' || m === 'driver') return m;
    }
    return 'admin';
  });

  useEffect(() => {
    const unsubscribe = realtimeSync.subscribe((newState) => {
      setState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && (e.state.mode === 'admin' || e.state.mode === 'driver')) {
        setActiveMode(e.state.mode);
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const m = urlParams.get('mode');
        if (m === 'admin' || m === 'driver') {
          setActiveMode(m);
        } else {
          setActiveMode('admin');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSwitchMode = (mode: 'admin' | 'driver') => {
    if (mode === activeMode) return;
    setActiveMode(mode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', mode);
      window.history.pushState({ mode }, '', url.toString());
    }
  };

  return (
    <div className="w-full h-full h-[100dvh] bg-[#0D1117] text-slate-100 flex flex-col font-sans select-none overflow-hidden min-h-0">
      {activeMode === 'admin' ? (
        <div key="mode-admin" className="animate-tab-switch flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden">
          <AdminDashboard state={state} onSwitchMode={handleSwitchMode} />
        </div>
      ) : (
        <div key="mode-driver" className="animate-tab-switch flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden">
          <DriverDashboard state={state} onSwitchMode={handleSwitchMode} />
        </div>
      )}
    </div>
  );
}

export default App;
