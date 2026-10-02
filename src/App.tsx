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

  const handleSwitchMode = (mode: 'admin' | 'driver') => {
    setActiveMode(mode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#0D1117] text-slate-100 flex flex-col font-sans select-none">
      {activeMode === 'admin' ? (
        <AdminDashboard state={state} onSwitchMode={handleSwitchMode} />
      ) : (
        <DriverDashboard state={state} onSwitchMode={handleSwitchMode} />
      )}
    </div>
  );
}

export default App;
