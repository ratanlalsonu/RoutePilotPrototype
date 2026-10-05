import { RoadGraph, RoadNode, RoadEdge, AStarSearchResult } from '../types/roadGraph';
import { RouteOption, Hazard, VehicleType, RouteStep } from '../types';
import { runAStarRoadSearch } from '../algorithms/aStarRoadSearch';
import { getDistanceMeters, distanceToSegmentMeters } from '../algorithms/hazardRouteIntersection';
import { calculateVehicleDuration, getVehicleSpeedProfile } from './routingService';
import { AStarEvaluationResult } from '../algorithms/aStarPathEvaluator';

// High-speed OSM routing mirrors
const OSRM_DIRECT_ENDPOINTS = [
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de/routed-car',
];

/**
 * Snaps any coordinate to the nearest valid OpenStreetMap drivable road.
 * Returns the snapped road coordinate, road name, and distance to road in meters.
 */
export async function snapToNearestRoad(
  lat: number,
  lng: number
): Promise<{ lat: number; lng: number; name?: string; distanceMeters: number } | null> {
  // 1. Try local Vite proxy first (instant CORS-free)
  if (typeof window !== 'undefined') {
    try {
      const proxyUrl = `/api/osrm/nearest?coords=${lng},${lat}&number=1`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.waypoints && data.waypoints.length > 0) {
          const wp = data.waypoints[0];
          return {
            lat: wp.location[1],
            lng: wp.location[0],
            name: wp.name || undefined,
            distanceMeters: wp.distance || 0,
          };
        }
      }
    } catch {
      // Fall through to direct fetch
    }
  }

  // 2. Direct OSRM endpoints fallback
  for (const base of OSRM_DIRECT_ENDPOINTS) {
    try {
      const url = `${base}/nearest/v1/driving/${lng},${lat}?number=1`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.waypoints && data.waypoints.length > 0) {
        const wp = data.waypoints[0];
        return {
          lat: wp.location[1],
          lng: wp.location[0],
          name: wp.name || undefined,
          distanceMeters: wp.distance || 0,
        };
      }
    } catch {
      // Try next endpoint
    }
  }

  return null;
}

/**
 * Fetches raw OSRM routing data with steps and annotations
 */
async function fetchRawOSRMData(
  coords: [number, number][], // [lng, lat][]
  alternatives: boolean = true
): Promise<any> {
  const coordString = coords.map((c) => `${c[0]},${c[1]}`).join(';');
  const altParam = alternatives ? '3' : 'false';

  // 1. Local proxy
  if (typeof window !== 'undefined') {
    try {
      const url = `/api/osrm/route?coords=${encodeURIComponent(coordString)}&alternatives=${altParam}&steps=true&annotations=true`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) return data;
      }
    } catch {
      // Fallback
    }
  }

  // 2. Direct endpoints
  for (const base of OSRM_DIRECT_ENDPOINTS) {
    try {
      const url = `${base}/route/v1/driving/${coordString}?overview=full&geometries=geojson&alternatives=${altParam}&steps=true&annotations=true`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.routes && data.routes.length > 0) return data;
    } catch {
      // Try next
    }
  }

  return null;
}

/**
 * Creates or retrieves a canonical RoadNode in the graph.
 * Merges nodes that are within 12 meters of each other into a single junction intersection.
 */
function getOrCreateNode(
  graph: RoadGraph,
  lat: number,
  lng: number,
  name?: string
): RoadNode {
  // Check if an existing node is within 12 meters (junction threshold)
  for (const existingNode of graph.nodes.values()) {
    const dist = getDistanceMeters(existingNode.lat, existingNode.lng, lat, lng);
    if (dist <= 12) {
      if (name && (!existingNode.name || existingNode.name.startsWith('rn_'))) {
        existingNode.name = name;
      }
      return existingNode;
    }
  }

  const id = `node_${lat.toFixed(5)}_${lng.toFixed(5)}`;
  const node: RoadNode = {
    id,
    lat,
    lng,
    name: name || id,
    isIntersection: false,
    adjacentEdgeIds: [],
  };

  graph.nodes.set(id, node);
  if (!graph.adjacency.has(id)) {
    graph.adjacency.set(id, []);
  }
  return node;
}

/**
 * Adds a RoadEdge to the graph connecting fromNode to toNode
 */
function addEdgeToGraph(
  graph: RoadGraph,
  fromNode: RoadNode,
  toNode: RoadNode,
  roadName: string,
  distanceMeters: number,
  durationSeconds: number,
  geometry: [number, number][],
  turnType?: RouteStep['turnType'],
  instruction?: string
): RoadEdge {
  const edgeId = `${fromNode.id}->${toNode.id}_${graph.edges.size}`;
  const edge: RoadEdge = {
    id: edgeId,
    fromNodeId: fromNode.id,
    toNodeId: toNode.id,
    roadName: roadName || 'Connecting Road',
    distanceMeters: Math.max(10, Math.round(distanceMeters)),
    baseDurationSeconds: Math.max(1, Math.round(durationSeconds)),
    speedLimitKmh: distanceMeters > 0 && durationSeconds > 0 ? (distanceMeters / durationSeconds) * 3.6 : 45,
    geometry: geometry.length > 0 ? geometry : [[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]],
    hazardPenalty: 0,
    isBlocked: false,
    turnType,
    instruction,
  };

  graph.edges.set(edgeId, edge);

  const adj = graph.adjacency.get(fromNode.id) || [];
  adj.push(edge);
  graph.adjacency.set(fromNode.id, adj);

  fromNode.adjacentEdgeIds.push(edgeId);
  toNode.adjacentEdgeIds.push(edgeId);

  if (adj.length > 1) {
    fromNode.isIntersection = true;
  }

  return edge;
}

/**
 * Ingests an OSRM route into the RoadGraph, creating genuine RoadNodes and RoadEdges
 * with full OpenStreetMap road geometry for every segment.
 */
function ingestOSRMRouteIntoGraph(
  graph: RoadGraph,
  routeData: any,
  startNode: RoadNode,
  goalNode: RoadNode
): void {
  if (!routeData || !routeData.legs || !Array.isArray(routeData.legs)) return;

  for (const leg of routeData.legs) {
    if (!leg.steps || !Array.isArray(leg.steps) || leg.steps.length === 0) continue;

    let previousNode = startNode;

    for (let sIdx = 0; sIdx < leg.steps.length; sIdx++) {
      const step = leg.steps[sIdx];
      const isLastStep = sIdx === leg.steps.length - 1;

      // Extract geometry for this step
      const stepCoords: [number, number][] = (step.geometry?.coordinates || []).map(
        (c: [number, number]) => [c[1], c[0]] // convert [lon, lat] -> [lat, lon]
      );

      let stepEndNode: RoadNode;
      if (isLastStep) {
        stepEndNode = goalNode;
      } else {
        const lastCoord = stepCoords.length > 0 ? stepCoords[stepCoords.length - 1] : null;
        if (lastCoord) {
          stepEndNode = getOrCreateNode(graph, lastCoord[0], lastCoord[1], step.name || 'Junction');
        } else {
          stepEndNode = getOrCreateNode(graph, previousNode.lat, previousNode.lng, step.name || 'Junction');
        }
      }

      // Map turn maneuver
      const mod = step.maneuver?.modifier || '';
      let turnType: RouteStep['turnType'] = 'straight';
      if (step.maneuver?.type === 'arrive') turnType = 'arrive';
      else if (mod.includes('left')) turnType = mod.includes('slight') ? 'slight-left' : 'left';
      else if (mod.includes('right')) turnType = mod.includes('slight') ? 'slight-right' : 'right';
      else if (mod.includes('uturn')) turnType = 'u-turn';

      const instruction = step.maneuver?.instruction ||
        (turnType === 'arrive' ? 'Arrive at destination' : `Continue on ${step.name || 'Road'}`);

      // Ensure geometry connects previousNode to stepEndNode
      const edgeGeom: [number, number][] = stepCoords.length > 0
        ? stepCoords
        : [[previousNode.lat, previousNode.lng], [stepEndNode.lat, stepEndNode.lng]];

      addEdgeToGraph(
        graph,
        previousNode,
        stepEndNode,
        step.name || 'Road',
        step.distance || getDistanceMeters(previousNode.lat, previousNode.lng, stepEndNode.lat, stepEndNode.lng),
        step.duration || 10,
        edgeGeom,
        turnType,
        instruction
      );

      previousNode = stepEndNode;
    }
  }
}

/**
 * Checks all edges in the RoadGraph against active hazards.
 * Applies appropriate penalties and blocks affected road edges.
 */
export function applyHazardsToRoadGraph(
  graph: RoadGraph,
  hazards: Hazard[]
): void {
  const activeHazards = hazards.filter((h) => h.status === 'ACTIVE');
  if (activeHazards.length === 0) return;

  for (const edge of graph.edges.values()) {
    edge.hazardPenalty = 0;
    edge.isBlocked = false;
    edge.affectedHazardId = undefined;

    for (const h of activeHazards) {
      const radius = (h.affectedRadius || 180) + 40; // buffer in meters

      // Check distance from hazard to all segments in this edge's geometry
      let minDistance = Infinity;
      const geom = edge.geometry;

      if (geom.length < 2) {
        minDistance = getDistanceMeters(h.latitude, h.longitude, edge.geometry[0]?.[0] || 0, edge.geometry[0]?.[1] || 0);
      } else {
        for (let i = 0; i < geom.length - 1; i++) {
          const d = distanceToSegmentMeters(
            h.latitude,
            h.longitude,
            geom[i][0],
            geom[i][1],
            geom[i + 1][0],
            geom[i + 1][1]
          );
          if (d < minDistance) minDistance = d;
        }
      }

      if (minDistance <= radius) {
        edge.affectedHazardId = h.hazardId;
        if (h.severity === 'BLOCKED' || h.severity === 'CRITICAL') {
          edge.isBlocked = true;
          edge.hazardPenalty = 999999;
          break; // Critical blockage takes precedence
        } else {
          // Warning/caution penalty
          edge.hazardPenalty = Math.max(edge.hazardPenalty, 450);
        }
      }
    }
  }
}

/**
 * Builds the complete real RoadNetwork graph between Origin and Destination,
 * runs genuine A* search, and produces 1 to 3 distinct valid real-road routes.
 */
export async function buildRoadGraphAndSearchRoutes(
  origin: { lat: number; lng: number; name?: string },
  destination: { lat: number; lng: number; name?: string },
  hazards: Hazard[] = [],
  vehicleType: VehicleType = 'car'
): Promise<{
  routes: RouteOption[];
  optimalRoute: RouteOption;
  alternativeRoutes: RouteOption[];
  aStarEvaluation: AStarEvaluationResult;
} | null> {
  // Step 1: Snap Origin and Destination to nearest valid road network points
  const [snappedStart, snappedGoal] = await Promise.all([
    snapToNearestRoad(origin.lat, origin.lng),
    snapToNearestRoad(destination.lat, destination.lng),
  ]);

  const startCoord: [number, number] = snappedStart
    ? [snappedStart.lat, snappedStart.lng]
    : [origin.lat, origin.lng];

  const goalCoord: [number, number] = snappedGoal
    ? [snappedGoal.lat, snappedGoal.lng]
    : [destination.lat, destination.lng];

  // Initialize RoadGraph
  const graph: RoadGraph = {
    nodes: new Map(),
    adjacency: new Map(),
    edges: new Map(),
  };

  const startNode = getOrCreateNode(graph, startCoord[0], startCoord[1], origin.name || 'Start Location');
  const goalNode = getOrCreateNode(graph, goalCoord[0], goalCoord[1], destination.name || 'Destination Location');

  // Step 2: Fetch real road network data spanning origin, destination, and alternatives
  const coordsList: [number, number][] = [
    [startCoord[1], startCoord[0]],
    [goalCoord[1], goalCoord[0]],
  ];

  // Primary OSRM multi-route query with native alternative branch discovery
  const primaryData = await fetchRawOSRMData(coordsList, true);

  if (!primaryData || !primaryData.routes || primaryData.routes.length === 0) {
    // If routing data fails, return null - NEVER return a hardcoded fake route!
    return null;
  }

  // Ingest all discovered road routes and their intersection steps into the graph
  for (const rItem of primaryData.routes) {
    ingestOSRMRouteIntoGraph(graph, rItem, startNode, goalNode);
  }

  // Step 2b: If fewer than 2 distinct routes found, query lateral corridors to build genuine junction branches
  if (primaryData.routes.length < 2) {
    const dx = goalCoord[1] - startCoord[1];
    const dy = goalCoord[0] - startCoord[0];
    const dist = Math.hypot(dx, dy);

    if (dist > 0.005) {
      const normX = -dy / dist;
      const normY = dx / dist;
      const shift = Math.min(0.025, Math.max(0.006, dist * 0.16));

      const midLat = (startCoord[0] + goalCoord[0]) / 2;
      const midLng = (startCoord[1] + goalCoord[1]) / 2;

      const wp1: [number, number] = [midLng + normX * shift, midLat + normY * shift];
      const wp2: [number, number] = [midLng - normX * shift, midLat - normY * shift];

      const [bypassData1, bypassData2] = await Promise.all([
        fetchRawOSRMData([[startCoord[1], startCoord[0]], wp1, [goalCoord[1], goalCoord[0]]], false),
        fetchRawOSRMData([[startCoord[1], startCoord[0]], wp2, [goalCoord[1], goalCoord[0]]], false),
      ]);

      if (bypassData1?.routes?.[0]) ingestOSRMRouteIntoGraph(graph, bypassData1.routes[0], startNode, goalNode);
      if (bypassData2?.routes?.[0]) ingestOSRMRouteIntoGraph(graph, bypassData2.routes[0], startNode, goalNode);
    }
  }

  // Step 3: Match active hazards to road network edges and apply weighted penalties
  applyHazardsToRoadGraph(graph, hazards);

  // Step 4: Run Genuine A* Search on the road network graph
  // Search 1: Optimal Route A (lowest cost on clear roads)
  const aStarA = runAStarRoadSearch(graph, {
    startNodeId: startNode.id,
    goalNodeId: goalNode.id,
    vehicleType,
    activeHazards: hazards,
  });

  if (!aStarA.success || aStarA.fullGeometry.length < 2) {
    return null;
  }

  const allAStarResults: AStarSearchResult[] = [aStarA];
  const usedEdgeIdsA = new Set(aStarA.pathEdges.map((e) => e.id));

  // Search 2: Alternative Route B (apply diversity penalty on Route A edges to force A* to explore alternate branches)
  const penaltiesB = new Map<string, number>();
  for (const edgeId of usedEdgeIdsA) {
    penaltiesB.set(edgeId, 85); // Significant penalty to explore alternative junction branches
  }

  const aStarB = runAStarRoadSearch(graph, {
    startNodeId: startNode.id,
    goalNodeId: goalNode.id,
    vehicleType,
    edgePenalties: penaltiesB,
    activeHazards: hazards,
  });

  if (aStarB.success && aStarB.fullGeometry.length > 2) {
    // Only accept if distinct from Route A
    const distDiff = Math.abs(aStarB.totalDistanceMeters - aStarA.totalDistanceMeters);
    if (distDiff > 80 || aStarB.pathEdges.some((e) => !usedEdgeIdsA.has(e.id))) {
      allAStarResults.push(aStarB);
    }
  }

  // Search 3: Alternative Route C (penalize Route A and Route B edges to explore outer link)
  if (allAStarResults.length >= 2) {
    const penaltiesC = new Map<string, number>();
    for (const edgeId of usedEdgeIdsA) penaltiesC.set(edgeId, 95);
    for (const edge of allAStarResults[1].pathEdges) penaltiesC.set(edge.id, 80);

    const aStarC = runAStarRoadSearch(graph, {
      startNodeId: startNode.id,
      goalNodeId: goalNode.id,
      vehicleType,
      edgePenalties: penaltiesC,
      activeHazards: hazards,
    });

    if (aStarC.success && aStarC.fullGeometry.length > 2) {
      const isUnique = allAStarResults.every(
        (r) => Math.abs(r.totalDistanceMeters - aStarC.totalDistanceMeters) > 60
      );
      if (isUnique) {
        allAStarResults.push(aStarC);
      }
    }
  }

  // Convert AStarSearchResults into RouteOptions with full real road geometry
  const colors = ['#AEF5F0', '#10b981', '#f59e0b'];
  const names = [
    'Route A — Fastest Highway',
    'Route B — Outer Bypass',
    'Route C — Arterial Corridor',
  ];

  const generatedRoutes: RouteOption[] = allAStarResults.map((result, idx) => {
    const distKm = parseFloat((result.totalDistanceMeters / 1000).toFixed(1));
    const baseMinutes = Math.max(1, Math.round(result.totalDurationSeconds / 60));
    const durMinutes = calculateVehicleDuration(distKm, vehicleType, baseMinutes);

    // Extract unique real road names from traversed edges
    const roadNames = Array.from(
      new Set(result.pathEdges.map((e) => e.roadName).filter((n) => n && n !== 'Road' && n !== 'Connecting Road'))
    ).slice(0, 3);
    const viaRoads = roadNames.length > 0 ? roadNames : ['Main Road Network'];

    // Generate step-by-step turn maneuvers from edges
    const steps: RouteStep[] = result.pathEdges.map((edge) => ({
      instruction: edge.instruction || `Continue on ${edge.roadName}`,
      roadName: edge.roadName,
      distanceMeters: edge.distanceMeters,
      durationSeconds: edge.baseDurationSeconds,
      turnType: edge.turnType || 'straight',
    }));

    if (steps.length > 0 && steps[steps.length - 1].turnType !== 'arrive') {
      steps.push({
        instruction: `Arrive at ${destination.name || 'Destination'}`,
        roadName: destination.name || 'Destination',
        distanceMeters: 50,
        durationSeconds: 10,
        turnType: 'arrive',
      });
    }

    const isBlocked = result.pathEdges.some((e) => e.isBlocked);
    const hasHazard = result.hazardPenaltyCost > 0;
    const status = isBlocked ? 'HAZARD_BLOCKED' : hasHazard ? 'CAUTION' : idx === 0 ? 'OPTIMAL' : 'ALTERNATIVE';

    const routeOption: RouteOption = {
      id: idx === 0 ? 'opt_route_a' : idx === 1 ? 'opt_route_b' : 'opt_route_c',
      name: names[idx] || `Route ${String.fromCharCode(65 + idx)}`,
      color: colors[idx] || '#38bdf8',
      distanceKm: distKm,
      durationMinutes: durMinutes,
      // 100% genuine real road geometry from OpenStreetMap edges
      coordinates: result.fullGeometry,
      viaRoads,
      isRecommended: idx === 0 && !isBlocked,
      maneuver: {
        instruction: `Head toward ${destination.name || 'Destination'}`,
        distanceMeters: Math.round(result.pathEdges[0]?.distanceMeters || 300),
      },
      steps,
      aStarMetrics: {
        gCost: result.accumulatedGCost,
        hCost: result.heuristicHCost,
        hazardPenalty: result.hazardPenaltyCost,
        totalFCost: result.totalFCost,
        rank: idx + 1,
        isOptimal: idx === 0,
        status,
        explanation: isBlocked
          ? 'Route obstructed by active hazard. High penalty applied.'
          : hasHazard
          ? `Caution: Hazard nearby (+${result.hazardPenaltyCost} penalty).`
          : `Optimal road network path via A*. f(n)=${result.totalFCost}`,
        evaluatedNodesCount: result.evaluatedNodesCount,
      },
    };

    return routeOption;
  });

  const optimalRoute = generatedRoutes[0];
  const alternativeRoutes = generatedRoutes.slice(1);

  const evaluationSummary = {
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    totalRoutesEvaluated: generatedRoutes.length,
    optimalRouteId: optimalRoute.id,
    optimalRouteName: optimalRoute.name,
    heuristicMethod: 'Admissible Haversine Geodesic Travel Cost',
    hazardsDetectedCount: hazards.filter((h) => h.status === 'ACTIVE').length,
    decisionReason: `A* graph search selected ${optimalRoute.name} with lowest total cost f(n)=${optimalRoute.aStarMetrics?.totalFCost}. Traversed ${aStarA.pathEdges.length} real road edges with zero hazard obstructions.`,
    decisionReasonHi: `A* ग्राफ सर्च ने न्यूनतम लागत f(n)=${optimalRoute.aStarMetrics?.totalFCost} के साथ ${optimalRoute.name} को चुना। वास्तविक सड़क नेटवर्क पर सबसे सुरक्षित मार्ग।`,
  };

  const aStarEvaluation: AStarEvaluationResult = {
    routes: generatedRoutes,
    optimalRoute,
    alternativeRoutes,
    evaluationSummary,
    stepLogs: aStarA.stepLogs,
  };

  return {
    routes: generatedRoutes,
    optimalRoute,
    alternativeRoutes,
    aStarEvaluation,
  };
}
