import React, { useState, useEffect, useCallback } from 'react';
import { MapBackground } from './MapBackground';
import { StateNodes } from './StateNodes';
import { RouteOverlay } from './RouteOverlay';
import { HazardOverlay } from './HazardOverlay';
import { SearchState } from './SearchState';
import { SourceSelector } from './SourceSelector';
import { DestinationSelector } from './DestinationSelector';
import { MapControls } from './MapControls';
import { RouteInfoCard } from './RouteInfoCard';
import {
  calculateSimulationRoute,
  findShortestPath,
  INDIAN_STATES_28,
} from '../../services/simulationGraph';
import { SimulationHazard, SimulationRoute } from '../../types/simulationMap';
import { realtimeSync } from '../../services/realtimeSync';

interface DriverMapProps {
  onRouteSelected?: (route: SimulationRoute) => void;
  externalHazards?: any[];
}

export const DriverMap: React.FC<DriverMapProps> = ({
  onRouteSelected,
  externalHazards,
}) => {
  // Source & Destination state
  const [sourceState, setSourceState] = useState<string>('Maharashtra');
  const [destinationState, setDestinationState] = useState<string>('West Bengal');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightedState, setHighlightedState] = useState<string | null>(null);

  // Active Route & Animation states
  const [calculatedRoute, setCalculatedRoute] = useState<SimulationRoute | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isAnimatingRoute, setIsAnimatingRoute] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Hazard Simulation State
  const [activeHazards, setActiveHazards] = useState<SimulationHazard[]>([]);
  const [hasSimulatedHazard, setHasSimulatedHazard] = useState<boolean>(false);

  // Zoom & Pan controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-dismiss transient notices
  const showNotice = useCallback((msg: string, durationMs = 4000) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice((current) => (current === msg ? null : current));
    }, durationMs);
  }, []);

  // Validate and calculate route
  const handleFindRoute = useCallback(() => {
    setErrorMessage(null);

    if (!sourceState || !destinationState) {
      setErrorMessage('Please select both a Source and a Destination state.');
      return;
    }

    if (sourceState === destinationState) {
      setErrorMessage('Source and destination cannot be the same.');
      return;
    }

    setIsCalculating(true);
    setStatusNotice('Calculating safest route...');

    setTimeout(() => {
      const route = calculateSimulationRoute(sourceState, destinationState, activeHazards);
      setIsCalculating(false);

      if (route) {
        setCalculatedRoute(route);
        setIsAnimatingRoute(true);
        setStatusNotice(`Route Found: ${route.path.join(' ➔ ')}`);

        if (onRouteSelected) {
          onRouteSelected(route);
        }

        setTimeout(() => {
          setIsAnimatingRoute(false);
        }, 1500);
      } else {
        setErrorMessage('No viable route found between selected states.');
      }
    }, 600);
  }, [sourceState, destinationState, activeHazards, onRouteSelected]);

  // Simulate Hazard on active route
  const handleSimulateHazard = useCallback(() => {
    if (!calculatedRoute || calculatedRoute.path.length < 2) {
      // If no route calculated yet, generate one first
      handleFindRoute();
      return;
    }

    // Default target segment: Chhattisgarh -> Odisha (as in prompt requirement)
    // Or choose a middle segment from the active path
    let hazardFrom = 'Chhattisgarh';
    let hazardTo = 'Odisha';

    // Verify if Chhattisgarh -> Odisha is in the path
    let segmentFound = false;
    for (let i = 0; i < calculatedRoute.path.length - 1; i++) {
      const u = calculatedRoute.path[i];
      const v = calculatedRoute.path[i + 1];
      if (
        (u === 'Chhattisgarh' && v === 'Odisha') ||
        (u === 'Odisha' && v === 'Chhattisgarh')
      ) {
        segmentFound = true;
        break;
      }
    }

    // If not on Maharashtra -> West Bengal, pick any middle segment from active route
    if (!segmentFound && calculatedRoute.path.length >= 2) {
      const midIdx = Math.floor(calculatedRoute.path.length / 2) - 1;
      hazardFrom = calculatedRoute.path[midIdx];
      hazardTo = calculatedRoute.path[midIdx + 1];
    }

    const newHazard: SimulationHazard = {
      id: `sim-hazard-${Date.now()}`,
      from: hazardFrom,
      to: hazardTo,
      type: 'bridge',
      severity: 'high',
      active: true,
      description: `Bridge damage detected between ${hazardFrom} and ${hazardTo}`,
    };

    const updatedHazards = [newHazard];
    setActiveHazards(updatedHazards);
    setHasSimulatedHazard(true);

    // Recompute route with hazard to activate the alternate safe path
    const updatedRoute = calculateSimulationRoute(sourceState, destinationState, updatedHazards);
    if (updatedRoute) {
      setCalculatedRoute(updatedRoute);
    }

    // Notify user with the exact prompt required message
    showNotice('⚠ Hazard detected. Alternate safe route selected.', 6000);

    // Sync with realtimeSync so Admin dashboard hazards reflect the simulation
    try {
      realtimeSync.createHazard({
        latitude: 21.2787,
        longitude: 81.8661,
        roadName: `NH Corridor (${hazardFrom} — ${hazardTo})`,
        locationName: `${hazardFrom} ➔ ${hazardTo} Highway`,
        affectedRadius: 250,
        type: 'Bridge Damage',
        severity: 'CRITICAL',
        description: 'Bridge hazard detected on route segment. Traffic diversion active.',
        source: 'ADMIN',
      });
    } catch {
      // non-fatal
    }
  }, [calculatedRoute, handleFindRoute, sourceState, destinationState, showNotice]);

  // Clear simulated hazard
  const handleClearHazard = useCallback(() => {
    setActiveHazards([]);
    setHasSimulatedHazard(false);
    const refreshedRoute = calculateSimulationRoute(sourceState, destinationState, []);
    setCalculatedRoute(refreshedRoute);
    showNotice('Hazard resolved. Primary route restored.', 4000);
  }, [sourceState, destinationState, showNotice]);

  // Handle source selection
  const handleSetSource = useCallback(
    (name: string) => {
      setErrorMessage(null);
      if (name === destinationState) {
        setErrorMessage('Source and destination cannot be the same.');
        return;
      }
      setSourceState(name);
      setHighlightedState(name);
    },
    [destinationState]
  );

  // Handle destination selection
  const handleSetDestination = useCallback(
    (name: string) => {
      setErrorMessage(null);
      if (name === sourceState) {
        setErrorMessage('Source and destination cannot be the same.');
        return;
      }
      setDestinationState(name);
      setHighlightedState(name);
    },
    [sourceState]
  );

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.8, +(z - 0.25).toFixed(2)));
  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setHighlightedState(null);
  };

  return (
    <div className="relative w-full h-full bg-[#0D1117] overflow-hidden select-none flex flex-col">
      {/* Top Floating Control Bar - Ultra Compact (Occupies minimal vertical space) */}
      <header className="absolute top-2 left-2 right-2 sm:left-4 sm:right-4 z-30 pointer-events-none flex flex-wrap items-center justify-between gap-2">
        {/* Left: Search & Source/Destination Selector Pills */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 bg-[#161B22]/90 backdrop-blur-xl border border-[#30363D] p-2 rounded-2xl shadow-2xl">
          {/* 1. Search State */}
          <SearchState
            onSelectState={(name) => setHighlightedState(name)}
            onSetSource={handleSetSource}
            onSetDestination={handleSetDestination}
            sourceState={sourceState}
            destinationState={destinationState}
          />

          <div className="h-6 w-px bg-[#30363D] hidden md:block" />

          {/* 2. Source Selector */}
          <SourceSelector
            value={sourceState}
            onChange={handleSetSource}
            disabledValue={destinationState}
          />

          {/* 3. Destination Selector */}
          <DestinationSelector
            value={destinationState}
            onChange={handleSetDestination}
            disabledValue={sourceState}
          />

          {/* 4. Action Buttons */}
          <div className="flex items-center gap-1.5 pt-1 sm:pt-0">
            {/* FIND ROUTE BUTTON */}
            <button
              type="button"
              onClick={handleFindRoute}
              disabled={isCalculating}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              {isCalculating ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Finding...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>FIND ROUTE</span>
                </>
              )}
            </button>

            {/* SIMULATE HAZARD BUTTON */}
            <button
              type="button"
              onClick={hasSimulatedHazard ? handleClearHazard : handleSimulateHazard}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-lg ${
                hasSimulatedHazard
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/25'
              }`}
            >
              <span>{hasSimulatedHazard ? '✓' : '⚠'}</span>
              <span>{hasSimulatedHazard ? 'CLEAR HAZARD' : 'SIMULATE HAZARD'}</span>
            </button>
          </div>
        </div>

        {/* Right: Simulation Map Tag */}
        <div className="pointer-events-auto hidden lg:flex items-center gap-2 bg-[#161B22]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#30363D] text-[11px] text-slate-300 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#AEF5F0] animate-pulse" />
          <span className="font-semibold text-white">RoutePilot Simulation Map</span>
          <span className="text-[10px] text-[#AEF5F0] font-mono px-1.5 py-0.2 rounded bg-cyan-950/70 border border-cyan-500/30">
            28 States Network
          </span>
        </div>
      </header>

      {/* Error or Alert Banner */}
      {errorMessage && (
        <div className="absolute top-18 left-1/2 transform -translate-x-1/2 z-40 bg-red-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-2xl border border-red-400 flex items-center gap-2 animate-bounce select-none">
          <span>⚠</span>
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-2 hover:bg-red-700 rounded px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status Notice Banner (e.g. "Hazard detected ahead" / "Alternate safe route selected") */}
      {statusNotice && (
        <div className="absolute top-18 left-1/2 transform -translate-x-1/2 z-40 bg-[#161B22]/95 backdrop-blur-xl text-white px-4 py-2 rounded-2xl text-xs font-semibold shadow-2xl border border-cyan-400/50 flex items-center gap-2 animate-modal-content select-none">
          {statusNotice.includes('Hazard') ? (
            <span className="text-amber-400 text-sm">⚠</span>
          ) : (
            <span className="text-cyan-400 text-sm">✦</span>
          )}
          <span>{statusNotice}</span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Interactive Map (Occupies 85-90% of screen) */}
      <div className="relative flex-1 w-full h-full min-h-0 flex items-center justify-center">
        <MapBackground zoomLevel={zoomLevel} panOffset={panOffset}>
          {/* Dynamic SVG Route Overlay */}
          <RouteOverlay
            route={calculatedRoute}
            isAnimating={isAnimatingRoute}
            hasHazard={hasSimulatedHazard}
          />

          {/* Interactive State Nodes (28 States + Delhi reference) */}
          <StateNodes
            sourceState={sourceState}
            destinationState={destinationState}
            activePath={calculatedRoute?.path || []}
            alternatePath={calculatedRoute?.alternatePath || []}
            highlightedState={highlightedState}
            onSelectSource={handleSetSource}
            onSelectDestination={handleSetDestination}
          />

          {/* Hazard Marker & Banner Overlay */}
          <HazardOverlay
            route={calculatedRoute}
            hasHazard={hasSimulatedHazard}
            onClearHazard={handleClearHazard}
          />
        </MapBackground>

        {/* Small Floating Map Controls (+ / - / Reset) on Right */}
        <MapControls
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
        />

        {/* Compact Route Information Card at Bottom Left */}
        {calculatedRoute && (
          <div className="absolute left-3 sm:left-4 bottom-3 sm:bottom-4 z-30 max-w-sm w-full">
            <RouteInfoCard
              route={calculatedRoute}
              hasHazard={hasSimulatedHazard}
              isCalculating={isCalculating}
              onClearRoute={() => setCalculatedRoute(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
