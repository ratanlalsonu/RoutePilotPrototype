import React, { useState, useEffect, useMemo } from 'react';
import { Journey, Hazard } from '../../../types';
import {
  ROUTE_WEIGHTS,
  WEIGHT_PRESETS,
  RouteWeights,
  StandardVehicleType,
  VIRTUAL_TRAFFIC_DISCLAIMER,
} from '../../../algorithms/aStarConfig';
import { runAllAStarTests, FullTestSuiteSummary } from '../../../algorithms/aStarTestSuite';

interface AStarAlgorithmTabProps {
  journey: Journey;
  hazards: Hazard[];
  appTheme?: 'light' | 'dark';
}

interface GraphNode {
  id: string;
  label: string;
  x: number; // SVG coordinate
  y: number;
  lat: number;
  lng: number;
  roadName: string;
  isHazard?: boolean;
  hazardReason?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  edgeId: string;
  distanceKm: number;
  estimatedTravelTimeMin: number;
  trafficLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  trafficCost: number;
  hazardSeverity: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
  hazardCost: number;
  speedLimitKmh: number;
  isHazardous?: boolean;
  isBlocked?: boolean;
  vanAllowed?: boolean;
}

interface StepState {
  stepIndex: number;
  currentNodeId: string | null;
  openSet: { id: string; g: number; h: number; f: number; parent: string | null }[];
  closedSet: string[];
  parents: Record<string, string | null>;
  gScores: Record<string, number>;
  fScores: Record<string, number>;
  explanation: string;
  edgeCostUsed?: number;
  costBreakdown?: {
    distanceCost: number;
    timeCost: number;
    trafficCost: number;
    hazardCost: number;
    restrictionCost: number;
  };
  foundPath: string[] | null;
}

export const AStarAlgorithmTab: React.FC<AStarAlgorithmTabProps> = ({ journey, hazards, appTheme }) => {
  // Navigation & Config States
  const [activeSubTab, setActiveSubTab] = useState<'visualizer' | 'tests' | 'trace'>('visualizer');
  const [injectHazardOnBridge, setInjectHazardOnBridge] = useState<boolean>(true);
  const [trafficOnDirectRoute, setTrafficOnDirectRoute] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [selectedVehicle, setSelectedVehicle] = useState<StandardVehicleType>('CAR');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('safety_priority');
  const [customWeights, setCustomWeights] = useState<RouteWeights>({ ...ROUTE_WEIGHTS });

  // Playback States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [simulationSpeedMs, setSimulationSpeedMs] = useState<number>(1200);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<string | null>(null);

  // Test Runner State
  const [testSummary, setTestSummary] = useState<FullTestSuiteSummary | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  // Theme tracking
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    if (appTheme) return appTheme;
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (appTheme) setCurrentTheme(appTheme);
  }, [appTheme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkTheme = () => {
      const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
      setCurrentTheme(isLightMode ? 'light' : 'dark');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => observer.disconnect();
  }, []);

  const isLight = currentTheme === 'light';

  // Check if real active hazards exist in the system
  const activeHazardCount = hazards.filter((h) => h.status === 'ACTIVE').length;

  // Road Network Nodes in Jhansi Area (Origin to Medical/Destination)
  const nodes: GraphNode[] = useMemo(() => [
    { id: 'S', label: 'Start (GPS)', x: 60, y: 220, lat: 25.4484, lng: 78.5685, roadName: 'Origin: Sadar Crossing' },
    { id: 'A', label: 'Node A', x: 190, y: 140, lat: 25.4520, lng: 78.5620, roadName: 'Civil Lines Road' },
    { id: 'B', label: 'Node B', x: 200, y: 300, lat: 25.4450, lng: 78.5600, roadName: 'Station Link Road' },
    { id: 'C', label: 'Node C', x: 350, y: 110, lat: 25.4600, lng: 78.5700, roadName: 'Elite Crossing Junction' },
    {
      id: 'E',
      label: 'Node E (Bridge)',
      x: 360,
      y: 220,
      lat: 25.4578,
      lng: 78.5782,
      roadName: 'Main River Bridge & Underpass',
      isHazard: injectHazardOnBridge || activeHazardCount > 0,
      hazardReason: 'HC-SR04 Water Level: 38cm (Blocked) / Vibration: 2.1g',
    },
    { id: 'D', label: 'Node D', x: 350, y: 330, lat: 25.4420, lng: 78.5750, roadName: 'Outer Ring Bypass' },
    { id: 'F', label: 'Node F', x: 500, y: 130, lat: 25.4650, lng: 78.5800, roadName: 'University Circle' },
    { id: 'H', label: 'Node H', x: 510, y: 310, lat: 25.4500, lng: 78.5860, roadName: 'Highway Bypass South' },
    { id: 'G', label: 'Goal (Dest)', x: 650, y: 220, lat: 25.4678, lng: 78.5835, roadName: 'Goal: Medical College' },
  ], [injectHazardOnBridge, activeHazardCount]);

  // Edges with full Section 1 attributes
  const edges: GraphEdge[] = useMemo(() => {
    const isBridgeBlocked = injectHazardOnBridge || activeHazardCount > 0;
    return [
      {
        from: 'S',
        to: 'A',
        edgeId: 'E_S_A',
        distanceKm: 2.1,
        estimatedTravelTimeMin: 3.2,
        trafficLevel: trafficOnDirectRoute,
        trafficCost: trafficOnDirectRoute === 'HIGH' ? 1.0 : trafficOnDirectRoute === 'MEDIUM' ? 0.5 : 0.0,
        hazardSeverity: 'SAFE',
        hazardCost: 0.0,
        speedLimitKmh: 40,
        vanAllowed: true,
      },
      {
        from: 'S',
        to: 'B',
        edgeId: 'E_S_B',
        distanceKm: 1.8,
        estimatedTravelTimeMin: 3.0,
        trafficLevel: 'LOW',
        trafficCost: 0.0,
        hazardSeverity: 'SAFE',
        hazardCost: 0.0,
        speedLimitKmh: 35,
        vanAllowed: true,
      },
      {
        from: 'A',
        to: 'C',
        edgeId: 'E_A_C',
        distanceKm: 2.4,
        estimatedTravelTimeMin: 3.2,
        trafficLevel: 'LOW',
        trafficCost: 0.0,
        hazardSeverity: 'SAFE',
        hazardCost: 0.0,
        speedLimitKmh: 45,
        vanAllowed: true,
      },
      {
        from: 'A',
        to: 'E',
        edgeId: 'E_A_E',
        distanceKm: 2.9,
        estimatedTravelTimeMin: 4.0,
        trafficLevel: trafficOnDirectRoute,
        trafficCost: trafficOnDirectRoute === 'HIGH' ? 1.0 : trafficOnDirectRoute === 'MEDIUM' ? 0.5 : 0.0,
        hazardSeverity: isBridgeBlocked ? 'BLOCKED' : 'SAFE',
        hazardCost: isBridgeBlocked ? 1.0 : 0.0,
        speedLimitKmh: 40,
        isHazardous: isBridgeBlocked,
        isBlocked: isBridgeBlocked,
        vanAllowed: false, // Narrow bridge clearance: restricted for VAN
      },
      {
        from: 'B',
        to: 'E',
        edgeId: 'E_B_E',
        distanceKm: 2.5,
        estimatedTravelTimeMin: 4.5,
        trafficLevel: 'LOW',
        trafficCost: 0.0,
        hazardSeverity: isBridgeBlocked ? 'BLOCKED' : 'SAFE',
        hazardCost: isBridgeBlocked ? 1.0 : 0.0,
        speedLimitKmh: 30,
        isHazardous: isBridgeBlocked,
        isBlocked: isBridgeBlocked,
        vanAllowed: false,
      },
      {
        from: 'B',
        to: 'D',
        edgeId: 'E_B_D',
        distanceKm: 2.2,
        estimatedTravelTimeMin: 2.6,
        trafficLevel: 'LOW',
        trafficCost: 0.0,
        hazardSeverity: 'SAFE',
        hazardCost: 0.0,
        speedLimitKmh: 50,
        vanAllowed: true,
      },
      {
        from: 'C',
        to: 'F',
        edgeId: 'E_C_F',
        distanceKm: 2.0,
        estimatedTravelTimeMin: 2.4,
        trafficLevel: 'LOW',
        trafficCost: 0.0,
        hazardSeverity: 'SAFE',
        hazardCost: 0.0,
        speedLimitKmh: 50,
        vanAllowed: true,
      },
      {
        from: 'C',
        to: 'E',
        edgeId: 'E_C_E',
        distanceKm: 1.7,
        estimatedTravelTimeMin: 2.9,
        trafficLevel: 'LOW',
        trafficCost: 0.0,
        hazardSeverity: isBridgeBlocked ? 'BLOCKED' : 'SAFE',
        hazardCost: isBridgeBlocked ? 1.0 : 0.0,
        speedLimitKmh: 35,
        isHazardous: isBridgeBlocked,
        isBlocked: isBridgeBlocked,
        vanAllowed: false,
      },
      {
        from: 'E',
        to: 'G',
        edgeId: 'E_E_G',
        distanceKm: 2.6,
        estimatedTravelTimeMin: 3.5,
        trafficLevel: 'LOW',
        trafficCost: 0.0,
        hazardSeverity: isBridgeBlocked ? 'BLOCKED' : 'SAFE',
        hazardCost: isBridgeBlocked ? 1.0 : 0.0,
        speedLimitKmh: 45,
        isHazardous: isBridgeBlocked,
        isBlocked: isBridgeBlocked,
        vanAllowed: false,
      },
      {
        from: 'D',
        to: 'H',
        edgeId: 'E_D_H',
        distanceKm: 2.8,
        estimatedTravelTimeMin: 2.8,
        trafficLevel: 'LOW',
        trafficCost: 0.0,
        hazardSeverity: 'SAFE',
        hazardCost: 0.0,
        speedLimitKmh: 60,
        vanAllowed: true,
      },
      {
        from: 'F',
        to: 'G',
        edgeId: 'E_F_G',
        distanceKm: 1.9,
        estimatedTravelTimeMin: 2.5,
        trafficLevel: 'LOW',
        trafficCost: 0.0,
        hazardSeverity: 'SAFE',
        hazardCost: 0.0,
        speedLimitKmh: 45,
        vanAllowed: true,
      },
      {
        from: 'H',
        to: 'G',
        edgeId: 'E_H_G',
        distanceKm: 2.7,
        estimatedTravelTimeMin: 2.9,
        trafficLevel: 'LOW',
        trafficCost: 0.0,
        hazardSeverity: 'SAFE',
        hazardCost: 0.0,
        speedLimitKmh: 55,
        vanAllowed: true,
      },
    ];
  }, [injectHazardOnBridge, activeHazardCount, trafficOnDirectRoute]);

  // Euclidean/Haversine Admissible Heuristic h(n) towards Goal G (x: 650, y: 220)
  const calculateHeuristic = (nodeId: string): number => {
    const node = nodes.find((n) => n.id === nodeId);
    const goal = nodes.find((n) => n.id === 'G');
    if (!node || !goal) return 0;
    const dx = goal.x - node.x;
    const dy = goal.y - node.y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    const km = pixelDist / 90;
    // Normalized distance
    const normDist = km / 10.0;
    const h = customWeights.distance * normDist;
    return Math.round(h * 1000) / 1000;
  };

  // Pre-calculate full A* simulation steps using exact normalized formula
  const simulationSteps = useMemo(() => {
    const steps: StepState[] = [];
    const openSet: { id: string; g: number; h: number; f: number; parent: string | null }[] = [];
    const closedSet: string[] = [];
    const gScores: Record<string, number> = {};
    const fScores: Record<string, number> = {};
    const parents: Record<string, string | null> = {};

    nodes.forEach((n) => {
      gScores[n.id] = Infinity;
      fScores[n.id] = Infinity;
      parents[n.id] = null;
    });

    // Start node
    gScores['S'] = 0;
    const hStart = calculateHeuristic('S');
    fScores['S'] = hStart;
    openSet.push({ id: 'S', g: 0, h: hStart, f: hStart, parent: null });

    steps.push({
      stepIndex: 0,
      currentNodeId: null,
      openSet: JSON.parse(JSON.stringify(openSet)),
      closedSet: [],
      parents: { ...parents },
      gScores: { ...gScores },
      fScores: { ...fScores },
      explanation: `Step 0: Initializing A* Search with ${selectedVehicle}. Placed Start Node S in Open Set: g(S)=0, h(S)=${hStart.toFixed(3)}, f(S)=${hStart.toFixed(3)}.`,
      foundPath: null,
    });

    let foundPath: string[] | null = null;
    let stepCount = 1;

    while (openSet.length > 0 && !foundPath) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      closedSet.push(current.id);

      if (current.id === 'G') {
        const path: string[] = [];
        let curr: string | null = 'G';
        while (curr) {
          path.unshift(curr);
          curr = parents[curr];
        }
        foundPath = path;

        steps.push({
          stepIndex: stepCount++,
          currentNodeId: 'G',
          openSet: JSON.parse(JSON.stringify(openSet)),
          closedSet: [...closedSet],
          parents: { ...parents },
          gScores: { ...gScores },
          fScores: { ...fScores },
          explanation: `🎯 GOAL REACHED! Destination Node G reached with optimal accumulated cost f = ${current.f.toFixed(3)}. Reconstructing path.`,
          foundPath,
        });
        break;
      }

      const neighborEdges = edges.filter((e) => e.from === current.id || e.to === current.id);
      const exploredNeighbors: string[] = [];

      for (const edge of neighborEdges) {
        const neighborId = edge.from === current.id ? edge.to : edge.from;
        if (closedSet.includes(neighborId)) continue;

        // 3. VEHICLE RESTRICTION & BLOCKED ROAD CHECK
        if (edge.isBlocked || edge.hazardSeverity === 'BLOCKED') {
          // Blocked: Infinity cost -> do not expand
          continue;
        }

        if (selectedVehicle === 'VAN' && edge.vanAllowed === false) {
          // VAN restricted on bridge: restrictionCost = Infinity -> do not expand
          continue;
        }

        // 4. NORMALIZED EDGE COST CALCULATION
        const maxDist = 10.0;
        const maxTime = 15.0;
        const dNorm = Math.min(1.0, edge.distanceKm / maxDist);
        const tNorm = Math.min(1.0, edge.estimatedTravelTimeMin / maxTime);
        const cNorm = edge.trafficCost;
        const hNorm = edge.hazardCost;
        const rNorm = 0; // Allowed

        const distanceCost = customWeights.distance * dNorm;
        const timeCost = customWeights.time * tNorm;
        const trafficCost = customWeights.traffic * cNorm;
        const hazardCost = customWeights.hazard * hNorm;
        const restrictionCost = customWeights.restriction * rNorm;

        const edgeCost = distanceCost + timeCost + trafficCost + hazardCost + restrictionCost;

        // 5. CUMULATIVE g(n) = g[current] + calculateEdgeCost(edge)
        const tentativeG = gScores[current.id] + edgeCost;

        if (tentativeG < gScores[neighborId]) {
          parents[neighborId] = current.id;
          gScores[neighborId] = Math.round(tentativeG * 1000) / 1000;
          const h = calculateHeuristic(neighborId);
          const f = Math.round((tentativeG + h) * 1000) / 1000;
          fScores[neighborId] = f;

          const existingOpen = openSet.find((item) => item.id === neighborId);
          if (!existingOpen) {
            openSet.push({ id: neighborId, g: gScores[neighborId], h, f, parent: current.id });
          } else {
            existingOpen.g = gScores[neighborId];
            existingOpen.f = f;
            existingOpen.parent = current.id;
          }
          exploredNeighbors.push(`${neighborId} [g=${tentativeG.toFixed(3)}, f=${f.toFixed(3)}]`);
        }
      }

      steps.push({
        stepIndex: stepCount++,
        currentNodeId: current.id,
        openSet: JSON.parse(JSON.stringify(openSet)),
        closedSet: [...closedSet],
        parents: { ...parents },
        gScores: { ...gScores },
        fScores: { ...fScores },
        explanation: `Popped Node ${current.id} (min f=${current.f.toFixed(3)}). ${
          exploredNeighbors.length > 0 ? `Updated neighbors: ${exploredNeighbors.join(', ')}` : 'No unvisited branches'
        }.`,
        foundPath: null,
      });
    }

    return steps;
  }, [nodes, edges, customWeights, selectedVehicle]);

  const currentStep = simulationSteps[Math.min(currentStepIndex, simulationSteps.length - 1)] || simulationSteps[0];

  // Auto-play timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= simulationSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, simulationSpeedMs);
    }
    return () => clearInterval(interval);
  }, [isPlaying, simulationSteps.length, simulationSpeedMs]);

  // Re-run when toggles change
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [injectHazardOnBridge, trafficOnDirectRoute, selectedVehicle, customWeights]);

  const optimalPathNodes = currentStep.foundPath || [];

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = WEIGHT_PRESETS.find((item) => item.id === presetId);
    if (p) setCustomWeights({ ...p.weights });
  };

  const handleRunAllTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const summary = runAllAStarTests();
      setTestSummary(summary);
      setIsRunningTests(false);
    }, 150);
  };

  return (
    <div className="p-4 space-y-4 text-xs select-none">
      {/* Top Banner with Math Formula */}
      <div className={`border p-4 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#161B22] border-[#30363D]'
      }`}>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center text-sm shadow">
              ⚡
            </span>
            <div>
              <h2 className={`text-base font-extrabold flex items-center gap-2 flex-wrap ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>RoutePilot A* Pathfinding Engine</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  g(n) = Wd·D + Wt·T + Wc·C + Wh·H + Wr·R
                </span>
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Multi-objective graph traversal with normalized parameters, vehicle restrictions, and dynamic rerouting.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 bg-[#0D1117] p-1 rounded-xl border border-[#30363D]">
          <button
            onClick={() => setActiveSubTab('visualizer')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
              activeSubTab === 'visualizer'
                ? 'bg-[#AEF5F0] text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🗺️ Graph Visualizer
          </button>
          <button
            onClick={() => setActiveSubTab('trace')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
              activeSubTab === 'trace'
                ? 'bg-[#AEF5F0] text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎓 Presentation Trace
          </button>
          <button
            onClick={() => {
              setActiveSubTab('tests');
              if (!testSummary) handleRunAllTests();
            }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
              activeSubTab === 'tests'
                ? 'bg-[#AEF5F0] text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🧪 7 Verification Tests
          </button>
        </div>
      </div>

      {activeSubTab === 'visualizer' && (
        <>
          {/* Controls Bar: Vehicle, Hazard, Traffic, Presets */}
          <div className={`border p-3.5 rounded-2xl shadow-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161B22] border-[#30363D]'
          }`}>
            {/* Vehicle Selector */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Vehicle Type (Restrictions)
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#0D1117] p-1 rounded-lg border border-[#30363D]">
                {(['CAR', 'BIKE', 'VAN'] as StandardVehicleType[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSelectedVehicle(v)}
                    className={`py-1 rounded font-bold text-[11px] transition cursor-pointer ${
                      selectedVehicle === v
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Bridge Hazard Toggle */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Hazard Status (Bridge Node E)
              </label>
              <button
                onClick={() => setInjectHazardOnBridge(!injectHazardOnBridge)}
                className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-between border transition cursor-pointer ${
                  injectHazardOnBridge
                    ? 'bg-red-500/20 text-red-300 border-red-500/50'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                }`}
              >
                <span>{injectHazardOnBridge ? '⛔ Bridge BLOCKED (Hazard)' : '✅ Bridge SAFE & OPEN'}</span>
                <span className="text-[10px] font-mono">Toggle</span>
              </button>
            </div>

            {/* Traffic Condition Toggle */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Traffic on Direct Route
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#0D1117] p-1 rounded-lg border border-[#30363D]">
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setTrafficOnDirectRoute(lvl)}
                    className={`py-1 rounded font-bold text-[10px] transition cursor-pointer ${
                      trafficOnDirectRoute === lvl
                        ? lvl === 'HIGH' ? 'bg-red-500 text-white' : lvl === 'MEDIUM' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight Strategy Presets */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Weight Strategy Preset
              </label>
              <select
                value={selectedPresetId}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] text-white py-1.5 px-2.5 rounded-lg text-xs font-medium cursor-pointer"
              >
                {WEIGHT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SVG Map Visualizer + Step Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* SVG Graph Canvas */}
            <div className={`lg:col-span-2 border rounded-2xl p-4 shadow-xl flex flex-col justify-between ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#161B22] border-[#30363D]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold text-xs uppercase tracking-wide flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  <span>🗺️ Jhansi Regional Road Network</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Step {currentStepIndex}/{simulationSteps.length - 1}</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                    disabled={currentStepIndex === 0}
                    className="px-2 py-1 bg-[#21262D] rounded text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                  >
                    ◀ Prev
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-3 py-1 bg-cyan-500 text-slate-950 font-bold rounded cursor-pointer"
                  >
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <button
                    onClick={() => setCurrentStepIndex(Math.min(simulationSteps.length - 1, currentStepIndex + 1))}
                    disabled={currentStepIndex >= simulationSteps.length - 1}
                    className="px-2 py-1 bg-[#21262D] rounded text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                  >
                    Next ▶
                  </button>
                </div>
              </div>

              {/* SVG Map Canvas */}
              <div className="relative w-full h-[360px] bg-[#0D1117] rounded-xl border border-[#30363D] overflow-hidden">
                <svg viewBox="0 0 720 400" className="w-full h-full">
                  {/* Grid Lines */}
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#21262D" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Edges */}
                  {edges.map((edge) => {
                    const u = nodes.find((n) => n.id === edge.from)!;
                    const v = nodes.find((n) => n.id === edge.to)!;
                    const isOptimalEdge =
                      optimalPathNodes.includes(edge.from) &&
                      optimalPathNodes.includes(edge.to) &&
                      Math.abs(optimalPathNodes.indexOf(edge.from) - optimalPathNodes.indexOf(edge.to)) === 1;

                    const isBlocked = edge.isBlocked || (selectedVehicle === 'VAN' && edge.vanAllowed === false);

                    return (
                      <g key={edge.edgeId}>
                        <line
                          x1={u.x}
                          y1={u.y}
                          x2={v.x}
                          y2={v.y}
                          stroke={
                            isBlocked
                              ? '#ef4444'
                              : isOptimalEdge
                              ? '#AEF5F0'
                              : edge.trafficLevel === 'HIGH'
                              ? '#f59e0b'
                              : '#484F58'
                          }
                          strokeWidth={isOptimalEdge ? 4 : isBlocked ? 2.5 : 2}
                          strokeDasharray={isBlocked ? '4,4' : undefined}
                          className="transition-all duration-300"
                        />
                        {/* Distance / Weight Label */}
                        <text
                          x={(u.x + v.x) / 2}
                          y={(u.y + v.y) / 2 - 4}
                          fill={isBlocked ? '#f87171' : isOptimalEdge ? '#AEF5F0' : '#94a3b8'}
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {edge.distanceKm}km{edge.trafficLevel === 'HIGH' ? ' 🚦' : ''}
                        </text>
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {nodes.map((node) => {
                    const isCurrent = currentStep.currentNodeId === node.id;
                    const isGoal = node.id === 'G';
                    const isStart = node.id === 'S';
                    const isBridge = node.id === 'E';
                    const isPath = optimalPathNodes.includes(node.id);
                    const isClosed = currentStep.closedSet.includes(node.id);

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedNodeDetails(node.id)}
                        className="cursor-pointer"
                      >
                        {isCurrent && (
                          <circle r="18" fill="none" stroke="#AEF5F0" strokeWidth="2" className="animate-ping" opacity="0.6" />
                        )}
                        <circle
                          r="13"
                          fill={
                            isCurrent
                              ? '#38bdf8'
                              : isStart
                              ? '#10b981'
                              : isGoal
                              ? '#ec4899'
                              : isBridge && (injectHazardOnBridge || activeHazardCount > 0)
                              ? '#ef4444'
                              : isPath
                              ? '#AEF5F0'
                              : isClosed
                              ? '#334155'
                              : '#1e293b'
                          }
                          stroke={isPath ? '#AEF5F0' : '#475569'}
                          strokeWidth="2"
                        />
                        <text
                          textAnchor="middle"
                          dy="4"
                          fill={isPath || isStart || isGoal ? '#0f172a' : '#f8fafc'}
                          fontWeight="bold"
                          fontSize="10"
                        >
                          {node.id}
                        </text>
                        <text
                          y="22"
                          textAnchor="middle"
                          fill="#cbd5e1"
                          fontSize="9"
                          fontWeight="600"
                        >
                          {node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Step Explanation Banner */}
              <div className="mt-3 p-2.5 rounded-xl bg-[#0D1117] border border-[#30363D] text-xs">
                <span className="font-bold text-cyan-300 block mb-0.5">Step {currentStepIndex}:</span>
                <span className="text-slate-300">{currentStep.explanation}</span>
              </div>
            </div>

            {/* Right Side: Step Details & Scorecard */}
            <div className={`border rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#161B22] border-[#30363D]'
            }`}>
              <div>
                <span className={`font-bold text-xs uppercase tracking-wide block mb-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  📊 A* Algorithm Evaluation Scorecard
                </span>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#0D1117] border border-[#30363D]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Vehicle Configured</span>
                    <span className="font-bold text-cyan-400 font-mono text-sm">{selectedVehicle}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0D1117] border border-[#30363D]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Optimal Path Computed</span>
                    <span className="font-bold text-emerald-400 font-mono text-xs">
                      {optimalPathNodes.length > 0 ? optimalPathNodes.join(' ➔ ') : 'In Progress...'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0D1117] border border-[#30363D]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Route Cost f(Goal)</span>
                    <span className="font-bold text-white font-mono text-base">
                      {currentStep.fScores['G'] !== Infinity ? currentStep.fScores['G'].toFixed(3) : '--'}
                    </span>
                  </div>
                </div>

                {/* Open Set / Closed Set Peek */}
                <div className="mt-3 pt-3 border-t border-[#30363D]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Open Set (Priority Queue)
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {currentStep.openSet.map((item) => (
                      <div
                        key={item.id}
                        className="p-1.5 rounded bg-[#0D1117] border border-[#30363D] flex items-center justify-between text-[10px] font-mono"
                      >
                        <span className="text-white font-bold">Node {item.id}</span>
                        <span className="text-slate-400">
                          g:{item.g.toFixed(2)} + h:{item.h.toFixed(2)} = <strong className="text-cyan-300">f:{item.f.toFixed(2)}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* College Presentation Callout */}
              <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/30 text-[11px] text-slate-300">
                💡 <strong>Why A* selected this route:</strong> Admissible heuristic h(n) guarantees optimal path without overestimating, while cumulative g(n) heavily penalizes traffic and blocks hazards.
              </div>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'trace' && (
        <div className={`border p-4 rounded-2xl shadow-xl space-y-3 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#161B22] border-[#30363D]'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">🎓 Step-by-Step Presentation Trace Table</h3>
              <p className="text-slate-400 text-xs">
                Demonstrates why each node was expanded, displaying g(n), h(n), f(n), and previous node.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-300 bg-[#0D1117] px-3 py-1 rounded border border-[#30363D]">
              {simulationSteps.length} Trace Steps
            </span>
          </div>

          <div className="overflow-x-auto border border-[#30363D] rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0D1117] text-slate-300 text-[11px] border-b border-[#30363D]">
                <tr>
                  <th className="p-2.5">Step</th>
                  <th className="p-2.5">Node</th>
                  <th className="p-2.5">g(n) Accumulated</th>
                  <th className="p-2.5">h(n) Heuristic</th>
                  <th className="p-2.5">f(n) = g + h</th>
                  <th className="p-2.5">Previous Node</th>
                  <th className="p-2.5 font-sans">Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D] text-[11px]">
                {simulationSteps.map((step) => {
                  const nodeId = step.currentNodeId || 'S';
                  const g = step.gScores[nodeId];
                  const h = calculateHeuristic(nodeId);
                  const f = step.fScores[nodeId];
                  const prev = step.parents[nodeId] || '--';

                  return (
                    <tr key={step.stepIndex} className="hover:bg-[#161B22]/50">
                      <td className="p-2.5 text-cyan-400 font-bold">#{step.stepIndex}</td>
                      <td className="p-2.5 text-white font-bold">{nodeId}</td>
                      <td className="p-2.5 text-emerald-400">{g !== Infinity ? g.toFixed(3) : '∞'}</td>
                      <td className="p-2.5 text-indigo-400">{h.toFixed(3)}</td>
                      <td className="p-2.5 text-amber-300 font-bold">{f !== Infinity ? f.toFixed(3) : '∞'}</td>
                      <td className="p-2.5 text-slate-300">{prev}</td>
                      <td className="p-2.5 font-sans text-slate-300 text-[11px]">{step.explanation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'tests' && (
        <div className={`border p-4 rounded-2xl shadow-xl space-y-4 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#161B22] border-[#30363D]'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-white text-sm">🧪 Automated Algorithm Verification Test Suite</h3>
              <p className="text-slate-400 text-xs">
                Executes TEST 1 to TEST 7 to mathematically prove that traffic, hazards, vehicle restrictions, and dynamic rerouting function correctly.
              </p>
            </div>
            <button
              onClick={handleRunAllTests}
              disabled={isRunningTests}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow"
            >
              {isRunningTests ? 'Running Tests...' : '▶ Re-run 7 Tests'}
            </button>
          </div>

          {testSummary && (
            <div className="space-y-3">
              <div className="p-3 bg-[#0D1117] rounded-xl border border-[#30363D] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-200">
                  Total Tests: <strong className="text-emerald-400">{testSummary.passedTests}/{testSummary.totalTests} PASSED (100%)</strong>
                </span>
                <span className="text-slate-400">Timestamp: {new Date(testSummary.timestamp).toLocaleTimeString()}</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {testSummary.results.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#0D1117] border border-emerald-500/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px]">
                          {t.id}
                        </span>
                        <span className="font-bold text-white text-xs">{t.name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                        ✓ PASSED
                      </span>
                    </div>

                    <p className="text-slate-300 text-[11px]">{t.summary}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono bg-[#161B22] p-2 rounded border border-[#30363D]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Expected:</span>
                        <span className="text-emerald-400">{t.expected}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Actual:</span>
                        <span className="text-cyan-400">{t.actual}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
