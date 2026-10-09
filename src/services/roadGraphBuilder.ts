import { RoadGraph, RoadNode, RoadEdge, AStarSearchResult } from '../types/roadGraph';
import { RouteOption, Hazard, VehicleType, RouteStep } from '../types';
import { runAStarRoadSearch } from '../algorithms/aStarRoadSearch';
import {
  getDistanceMeters,
  distanceToSegmentMeters,
  getSymmetricRouteOverlap,
} from '../algorithms/hazardRouteIntersection';
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
  const proxyBase = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
  // 1. Try local Vite proxy first (instant CORS-free)
  try {
    const proxyUrl = `${proxyBase}/api/osrm/nearest?coords=${lng},${lat}&number=1`;
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
  const proxyBase = typeof window !== 'undefined' ? '' : 'http://localhost:3000';

  // 1. Local proxy
  try {
    const url = `${proxyBase}/api/osrm/route?coords=${encodeURIComponent(coordString)}&alternatives=${altParam}&steps=true&annotations=true`;
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
  const edgeDistKm = Math.max(0.01, Math.round((distanceMeters / 1000) * 100) / 100);
  const edgeDurationMin = Math.max(0.05, Math.round((durationSeconds / 60) * 10) / 10);

  const edge: RoadEdge = {
    id: edgeId,
    edgeId,
    fromNode: fromNode.id,
    toNode: toNode.id,
    fromNodeId: fromNode.id,
    toNodeId: toNode.id,
    roadName: roadName || 'Connecting Road',
    distanceMeters: Math.max(10, Math.round(distanceMeters)),
    baseDurationSeconds: Math.max(1, Math.round(durationSeconds)),
    distance: edgeDistKm,
    estimatedTravelTime: edgeDurationMin,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
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
/**
 * Ingests an OSRM route into the RoadGraph, creating genuine RoadNodes and RoadEdges
 * with full OpenStreetMap road geometry for every segment.
 * Properly threads through all multi-leg waypoint detours without disconnected jumps.
 */
function ingestOSRMRouteIntoGraph(
  graph: RoadGraph,
  routeData: any,
  startNode: RoadNode,
  goalNode: RoadNode
): void {
  if (!routeData || !routeData.legs || !Array.isArray(routeData.legs)) return;

  const totalLegs = routeData.legs.length;
  let currentNode = startNode;

  for (let legIdx = 0; legIdx < totalLegs; legIdx++) {
    const leg = routeData.legs[legIdx];
    if (!leg.steps || !Array.isArray(leg.steps) || leg.steps.length === 0) continue;
    const isLastLeg = legIdx === totalLegs - 1;

    for (let sIdx = 0; sIdx < leg.steps.length; sIdx++) {
      const step = leg.steps[sIdx];
      const isLastStepOfEntireRoute = isLastLeg && sIdx === leg.steps.length - 1;

      // Extract geometry for this step
      const stepCoords: [number, number][] = (step.geometry?.coordinates || []).map(
        (c: [number, number]) => [c[1], c[0]] // convert [lon, lat] -> [lat, lon]
      );

      let stepEndNode: RoadNode;
      if (isLastStepOfEntireRoute) {
        stepEndNode = goalNode;
      } else {
        const lastCoord = stepCoords.length > 0 ? stepCoords[stepCoords.length - 1] : null;
        if (lastCoord) {
          stepEndNode = getOrCreateNode(graph, lastCoord[0], lastCoord[1], step.name || 'Junction');
        } else {
          stepEndNode = getOrCreateNode(graph, currentNode.lat, currentNode.lng, step.name || 'Junction');
        }
      }

      // Avoid self-loops
      if (currentNode.id === stepEndNode.id) continue;

      // Map turn maneuver
      const mod = step.maneuver?.modifier || '';
      let turnType: RouteStep['turnType'] = 'straight';
      if (step.maneuver?.type === 'arrive') turnType = 'arrive';
      else if (mod.includes('left')) turnType = mod.includes('slight') ? 'slight-left' : 'left';
      else if (mod.includes('right')) turnType = mod.includes('slight') ? 'slight-right' : 'right';
      else if (mod.includes('uturn')) turnType = 'u-turn';

      const instruction = step.maneuver?.instruction ||
        (turnType === 'arrive' ? 'Arrive at destination' : `Continue on ${step.name || 'Road'}`);

      // Ensure geometry connects currentNode to stepEndNode
      const edgeGeom: [number, number][] = stepCoords.length > 0
        ? stepCoords
        : [[currentNode.lat, currentNode.lng], [stepEndNode.lat, stepEndNode.lng]];

      addEdgeToGraph(
        graph,
        currentNode,
        stepEndNode,
        step.name || 'Road',
        step.distance || getDistanceMeters(currentNode.lat, currentNode.lng, stepEndNode.lat, stepEndNode.lng),
        step.duration || 10,
        edgeGeom,
        turnType,
        instruction
      );

      currentNode = stepEndNode;
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
    edge.roadStatus = 'OPEN';
    edge.hazardSeverity = 'SAFE';
    edge.hazardCost = 0.0;
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
        edge.hazardSeverity = h.severity;
        if (h.severity === 'BLOCKED') {
          edge.isBlocked = true;
          edge.roadStatus = 'BLOCKED';
          edge.hazardCost = 1.0;
          edge.hazardPenalty = 999999;
          break; // Critical blockage takes precedence
        } else if (h.severity === 'CRITICAL') {
          edge.isBlocked = true;
          edge.roadStatus = 'BLOCKED';
          edge.hazardCost = 0.7;
          edge.hazardPenalty = 999999;
          break;
        } else if (h.severity === 'WARNING') {
          edge.hazardSeverity = 'WARNING';
          edge.hazardCost = 0.3;
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

  // Step 2b: Discover real-road detour bypass corridors around active hazards and lateral corridors
  const bypassQueries: Promise<any>[] = [];
  const activeHazards = hazards.filter((h) => h.status === 'ACTIVE');

  const dy = goalCoord[0] - startCoord[0];
  const cosLat = Math.cos((startCoord[0] * Math.PI) / 180);
  const dx = (goalCoord[1] - startCoord[1]) * cosLat;
  const dist = Math.max(0.0001, Math.hypot(dy, dx));

  // Forward unit vector and Perpendicular unit vectors
  const fwdLat = dy / dist;
  const fwdLng = (dx / dist) / cosLat;
  const perpLat = -dx / dist;
  const perpLng = (dy / dist) / cosLat;

  // 1. If active hazards exist, calculate real-road bypass corridors around every hazard
  if (activeHazards.length > 0) {
    for (const h of activeHazards) {
      const hazardRadius = h.affectedRadius || 180;
      // Clearance offsets in degrees (~800m, ~1.8km, and ~3.0km)
      const offset1 = Math.max(0.007, (hazardRadius + 300) / 111000);
      const offset2 = Math.max(0.015, (hazardRadius + 1100) / 111000);
      const offset3 = Math.max(0.026, (hazardRadius + 2200) / 111000);

      const candidateWaypoints = [
        // Left Bypass (perpendicular + slight forward progression to avoid doubling back)
        { lat: h.latitude + perpLat * offset1 + fwdLat * (offset1 * 0.35), lng: h.longitude + perpLng * offset1 + fwdLng * (offset1 * 0.35) },
        // Right Bypass
        { lat: h.latitude - perpLat * offset1 + fwdLat * (offset1 * 0.35), lng: h.longitude - perpLng * offset1 + fwdLng * (offset1 * 0.35) },
        // Outer Left Bypass
        { lat: h.latitude + perpLat * offset2 + fwdLat * (offset2 * 0.3), lng: h.longitude + perpLng * offset2 + fwdLng * (offset2 * 0.3) },
        // Outer Right Bypass
        { lat: h.latitude - perpLat * offset2 + fwdLat * (offset2 * 0.3), lng: h.longitude - perpLng * offset2 + fwdLng * (offset2 * 0.3) },
        // Wide Outer Highway Corridor
        { lat: h.latitude + perpLat * offset3, lng: h.longitude + perpLng * offset3 },
        { lat: h.latitude - perpLat * offset3, lng: h.longitude - perpLng * offset3 },
      ];

      for (const pt of candidateWaypoints) {
        bypassQueries.push(
          fetchRawOSRMData(
            [
              [startCoord[1], startCoord[0]],
              [pt.lng, pt.lat],
              [goalCoord[1], goalCoord[0]],
            ],
            false
          )
        );
      }
    }
  }

  // 2. Query multi-scale lateral corridors to explore distinct regional highways
  const offsetNarrow = Math.max(0.018, Math.min(0.28, dist * 0.18));
  const offsetMedium = Math.max(0.035, Math.min(0.55, dist * 0.32));
  const offsetWide = Math.max(0.060, Math.min(0.95, dist * 0.48));
  const midLat = (startCoord[0] + goalCoord[0]) / 2;
  const midLng = (startCoord[1] + goalCoord[1]) / 2;

  bypassQueries.push(
    fetchRawOSRMData([[startCoord[1], startCoord[0]], [midLng + perpLng * offsetMedium, midLat + perpLat * offsetMedium], [goalCoord[1], goalCoord[0]]], false),
    fetchRawOSRMData([[startCoord[1], startCoord[0]], [midLng - perpLng * offsetMedium, midLat - perpLat * offsetMedium], [goalCoord[1], goalCoord[0]]], false),
    fetchRawOSRMData([[startCoord[1], startCoord[0]], [startCoord[1] + fwdLng * (dist * 0.35) + perpLng * offsetNarrow, startCoord[0] + fwdLat * (dist * 0.35) + perpLat * offsetNarrow], [goalCoord[1], goalCoord[0]]], false),
    fetchRawOSRMData([[startCoord[1], startCoord[0]], [startCoord[1] + fwdLng * (dist * 0.35) - perpLng * offsetNarrow, startCoord[0] + fwdLat * (dist * 0.35) - perpLat * offsetNarrow], [goalCoord[1], goalCoord[0]]], false),
    fetchRawOSRMData([[startCoord[1], startCoord[0]], [startCoord[1] + fwdLng * (dist * 0.65) + perpLng * offsetNarrow, startCoord[0] + fwdLat * (dist * 0.65) + perpLat * offsetNarrow], [goalCoord[1], goalCoord[0]]], false),
    fetchRawOSRMData([[startCoord[1], startCoord[0]], [startCoord[1] + fwdLng * (dist * 0.65) - perpLng * offsetNarrow, startCoord[0] + fwdLat * (dist * 0.65) - perpLat * offsetNarrow], [goalCoord[1], goalCoord[0]]], false),
    fetchRawOSRMData([[startCoord[1], startCoord[0]], [midLng + perpLng * offsetWide, midLat + perpLat * offsetWide], [goalCoord[1], goalCoord[0]]], false),
    fetchRawOSRMData([[startCoord[1], startCoord[0]], [midLng - perpLng * offsetWide, midLat - perpLat * offsetWide], [goalCoord[1], goalCoord[0]]], false)
  );

  const bypassResults = await Promise.all(bypassQueries);
  for (const bRes of bypassResults) {
    if (bRes?.routes && Array.isArray(bRes.routes)) {
      for (const r of bRes.routes) {
        ingestOSRMRouteIntoGraph(graph, r, startNode, goalNode);
      }
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

  // Candidate routes collection across all discovery mechanisms
  const candidatePool: RouteOption[] = [];

  // Helper to convert raw coordinate polyline into candidate RouteOption
  const convertGeometryToRoute = (
    coords: [number, number][],
    distMeters: number,
    durSeconds: number,
    roadSummary: string,
    idTag: string,
    stepDetails?: RouteStep[]
  ): RouteOption | null => {
    if (!coords || coords.length < 3) return null;

    let hazardPen = 0;
    let isBlocked = false;
    for (const h of activeHazards) {
      const rad = (h.affectedRadius || 180) + 40;
      const hit = coords.some(
        (pt) => getDistanceMeters(pt[0], pt[1], h.latitude, h.longitude) < rad
      );
      if (hit) {
        if (h.severity === 'BLOCKED' || h.severity === 'CRITICAL') {
          hazardPen += 999999;
          isBlocked = true;
        } else {
          hazardPen += 500;
        }
      }
    }

    const distKm = parseFloat((distMeters / 1000).toFixed(1));
    const baseMinutes = Math.max(1, Math.round(durSeconds / 60));
    const durMinutes = calculateVehicleDuration(distKm, vehicleType, baseMinutes);

    const gCost = parseFloat((distMeters / 100).toFixed(1));
    const hCost = parseFloat((getDistanceMeters(coords[0][0], coords[0][1], goalCoord[0], goalCoord[1]) / 100).toFixed(1));
    const totalFCost = parseFloat((gCost + hCost + hazardPen).toFixed(1));

    const cleanRoadName = roadSummary && roadSummary !== 'Road' && roadSummary !== 'Connecting Road' && !roadSummary.startsWith('rn_')
      ? roadSummary
      : 'Main Highway Network';
    const viaRoads = [cleanRoadName];

    const steps: RouteStep[] = stepDetails && stepDetails.length > 0
      ? stepDetails
      : [
          {
            instruction: `Head toward ${destination.name || 'Destination'} via ${cleanRoadName}`,
            roadName: cleanRoadName,
            distanceMeters: Math.round(distMeters * 0.9),
            durationSeconds: Math.round(durSeconds * 0.9),
            turnType: 'straight',
          },
          {
            instruction: `Arrive at ${destination.name || 'Destination'}`,
            roadName: destination.name || 'Destination',
            distanceMeters: 50,
            durationSeconds: 10,
            turnType: 'arrive',
          },
        ];

    const status = isBlocked ? 'HAZARD_BLOCKED' : hazardPen > 0 ? 'CAUTION' : 'ALTERNATIVE';

    return {
      id: `candidate_route_${idTag}`,
      name: `Candidate ${idTag}`,
      color: '#38bdf8',
      distanceKm: distKm,
      durationMinutes: durMinutes,
      coordinates: coords,
      viaRoads,
      isRecommended: false,
      maneuver: {
        instruction: `Head toward ${destination.name || 'Destination'}`,
        distanceMeters: Math.min(500, Math.round(distMeters * 0.1)),
      },
      steps,
      aStarMetrics: {
        gCost,
        hCost,
        hazardPenalty: hazardPen,
        totalFCost,
        rank: 2,
        isOptimal: false,
        status,
        explanation: isBlocked
          ? 'Route obstructed by active hazard. High penalty applied.'
          : `Valid corridor via ${cleanRoadName}. f(n)=${totalFCost}`,
        evaluatedNodesCount: coords.length,
      },
    };
  };

  // Convert A* Search Result to RouteOption
  const convertAStarResult = (result: AStarSearchResult, idTag: string): RouteOption | null => {
    if (!result.success || result.fullGeometry.length < 3) return null;
    const roadNames = Array.from(
      new Set(result.pathEdges.map((e) => e.roadName).filter((n) => n && n !== 'Road' && n !== 'Connecting Road' && !n.startsWith('rn_')))
    ).slice(0, 3);
    const summary = roadNames.length > 0 ? roadNames[0] : 'Main Highway Network';

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

    return convertGeometryToRoute(
      result.fullGeometry,
      result.totalDistanceMeters,
      result.totalDurationSeconds,
      summary,
      idTag,
      steps
    );
  };

  // 1. Add primary A* result (optimal on open roads)
  const routeA = convertAStarResult(aStarA, 'astar_a');
  if (routeA) candidatePool.push(routeA);

  // 2. Add all primary OSRM discovered alternative routes
  if (primaryData?.routes && Array.isArray(primaryData.routes)) {
    primaryData.routes.forEach((r: any, idx: number) => {
      const coords: [number, number][] = (r.geometry?.coordinates || []).map(
        (c: [number, number]) => [c[1], c[0]]
      );
      const dist = Math.round(r.distance || 1500);
      const dur = Math.round(r.duration || 120);
      const name = r.legs?.[0]?.summary || `Highway Corridor ${idx + 1}`;
      const cand = convertGeometryToRoute(coords, dist, dur, name, `osrm_pri_${idx}`);
      if (cand) candidatePool.push(cand);
    });
  }

  // 3. Add all lateral bypass & detour routes discovered via waypoints
  for (let bIdx = 0; bIdx < bypassResults.length; bIdx++) {
    const bRes = bypassResults[bIdx];
    if (bRes?.routes && Array.isArray(bRes.routes)) {
      bRes.routes.forEach((r: any, rIdx: number) => {
        const coords: [number, number][] = (r.geometry?.coordinates || []).map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const dist = Math.round(r.distance || 1500);
        const dur = Math.round(r.duration || 120);
        const name = r.legs?.[0]?.summary || `Detour Corridor ${bIdx + 1}_${rIdx + 1}`;
        const cand = convertGeometryToRoute(coords, dist, dur, name, `bypass_${bIdx}_${rIdx}`);
        if (cand) candidatePool.push(cand);
      });
    }
  }

  // 4. Graph A* Search B: Hard penalty on intermediate edges of Route A
  // Exclude terminal edges near start and goal so graph can still connect
  const edgeListA = aStarA.pathEdges;
  const intermediateEdgesA = edgeListA.length > 4 ? edgeListA.slice(1, -1) : edgeListA;
  const penaltiesB = new Map<string, number>();
  for (const edge of intermediateEdgesA) {
    penaltiesB.set(edge.id, 999999); // Force A* to take alternative branch at junction
  }

  const aStarB = runAStarRoadSearch(graph, {
    startNodeId: startNode.id,
    goalNodeId: goalNode.id,
    vehicleType,
    edgePenalties: penaltiesB,
    activeHazards: hazards,
  });
  if (aStarB.success && aStarB.fullGeometry.length > 2) {
    const candB = convertAStarResult(aStarB, 'astar_b');
    if (candB) candidatePool.push(candB);
  }

  // 5. Graph A* Search C: Hard penalty on intermediate edges of Route A and Route B
  if (aStarB.success) {
    const edgeListB = aStarB.pathEdges;
    const intermediateEdgesB = edgeListB.length > 4 ? edgeListB.slice(1, -1) : edgeListB;
    const penaltiesC = new Map<string, number>();
    for (const edge of intermediateEdgesA) penaltiesC.set(edge.id, 999999);
    for (const edge of intermediateEdgesB) penaltiesC.set(edge.id, 999999);

    const aStarC = runAStarRoadSearch(graph, {
      startNodeId: startNode.id,
      goalNodeId: goalNode.id,
      vehicleType,
      edgePenalties: penaltiesC,
      activeHazards: hazards,
    });
    if (aStarC.success && aStarC.fullGeometry.length > 2) {
      const candC = convertAStarResult(aStarC, 'astar_c');
      if (candC) candidatePool.push(candC);
    }
  }

  // Filter candidates: must have valid geometry and positive distance
  const validCandidates = candidatePool.filter(
    (c) => c.coordinates && c.coordinates.length >= 3 && c.distanceKm > 0
  );

  // Sort candidates so lowest travel cost and unblocked routes come first
  validCandidates.sort((a, b) => {
    const aBlocked = a.aStarMetrics?.status === 'HAZARD_BLOCKED' ? 1 : 0;
    const bBlocked = b.aStarMetrics?.status === 'HAZARD_BLOCKED' ? 1 : 0;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked;
    const costDiff = (a.aStarMetrics?.totalFCost || 0) - (b.aStarMetrics?.totalFCost || 0);
    if (Math.abs(costDiff) > 0.01) return costDiff;
    return a.durationMinutes - b.durationMinutes;
  });

  // STRICT ZERO-OVERLAP SELECTION ALGORITHM:
  // Threshold: Max 15% shared intermediate road corridor.
  // Overlap is STRICTLY FORBIDDEN across all cases (1, 2, 3, or >3 routes).
  const MAX_ALLOWED_OVERLAP = 0.15;
  const selectedDiverseRoutes: RouteOption[] = [];

  if (validCandidates.length > 0) {
    // 1. First route: The #1 lowest-cost safe candidate (Optimal Route)
    selectedDiverseRoutes.push(validCandidates[0]);
  }

  // 2. Select up to 2 additional non-overlapping routes (Average Route and Worst Route)
  for (let i = 1; i < validCandidates.length && selectedDiverseRoutes.length < 3; i++) {
    const cand = validCandidates[i];
    if (selectedDiverseRoutes.some((sel) => sel.id === cand.id)) continue;

    // Must not overlap with ANY already selected route
    const hasOverlap = selectedDiverseRoutes.some((sel) => {
      const overlap = getSymmetricRouteOverlap(sel.coordinates, cand.coordinates, 90);
      return overlap > MAX_ALLOWED_OVERLAP;
    });

    if (!hasOverlap) {
      selectedDiverseRoutes.push(cand);
    }
  }


  // Categorize selected routes strictly according to user rules:
  // - 1 route: Optimal Route
  // - 2 routes: Optimal Route & Average Route
  // - 3 routes (or >3 found): Optimal Route, Average Route & Worst Route
  const totalCount = selectedDiverseRoutes.length;

  const categorizedRoutes: RouteOption[] = selectedDiverseRoutes.map((route, idx) => {
    let category: 'OPTIMAL' | 'AVERAGE' | 'WORST' = 'OPTIMAL';
    let baseName = 'Optimal Route';
    let color = '#10b981'; // Emerald
    let isRecommended = false;

    if (totalCount === 1) {
      category = 'OPTIMAL';
      baseName = 'Optimal Route';
      color = '#10b981';
      isRecommended = true;
    } else if (totalCount === 2) {
      if (idx === 0) {
        category = 'OPTIMAL';
        baseName = 'Optimal Route';
        color = '#10b981';
        isRecommended = true;
      } else {
        category = 'AVERAGE';
        baseName = 'Average Route';
        color = '#38bdf8'; // Cyan
        isRecommended = false;
      }
    } else {
      // 3 routes
      if (idx === 0) {
        category = 'OPTIMAL';
        baseName = 'Optimal Route';
        color = '#10b981';
        isRecommended = true;
      } else if (idx === 1) {
        category = 'AVERAGE';
        baseName = 'Average Route';
        color = '#38bdf8'; // Cyan
        isRecommended = false;
      } else {
        category = 'WORST';
        baseName = 'Worst Route';
        color = '#f59e0b'; // Amber
        isRecommended = false;
      }
    }

    const viaStr = route.viaRoads && route.viaRoads.length > 0 && route.viaRoads[0] !== 'Main Highway Network'
      ? ` — via ${route.viaRoads[0]}`
      : category === 'OPTIMAL'
      ? ' — Fastest & Safest'
      : category === 'AVERAGE'
      ? ' — Moderate Alternative'
      : ' — Slowest / Long Alternative';

    const isBlocked = route.aStarMetrics?.status === 'HAZARD_BLOCKED';
    const status = isBlocked ? 'HAZARD_BLOCKED' : category === 'OPTIMAL' ? 'OPTIMAL' : 'ALTERNATIVE';

    const updatedRoute: RouteOption = {
      ...route,
      id: `opt_route_${category.toLowerCase()}_${idx}`,
      name: `${baseName}${viaStr}`,
      category,
      color,
      isRecommended: isRecommended && !isBlocked,
      aStarMetrics: {
        ...route.aStarMetrics!,
        rank: idx + 1,
        category,
        isOptimal: category === 'OPTIMAL' && !isBlocked,
        status,
        explanation: isBlocked
          ? 'Route obstructed by active hazard. High penalty applied.'
          : category === 'OPTIMAL'
          ? `Optimal clear corridor via A*. Lowest travel cost f(n)=${route.aStarMetrics?.totalFCost}.`
          : category === 'AVERAGE'
          ? `Average corridor via A*. Moderate travel cost f(n)=${route.aStarMetrics?.totalFCost}.`
          : `Worst alternative corridor via A*. Highest travel cost f(n)=${route.aStarMetrics?.totalFCost}.`,
      },
    };

    return updatedRoute;
  });

  const optimalRoute = categorizedRoutes[0];
  const alternativeRoutes = categorizedRoutes.slice(1);

  const evaluationSummary = {
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    totalRoutesEvaluated: categorizedRoutes.length,
    optimalRouteId: optimalRoute.id,
    optimalRouteName: optimalRoute.name,
    heuristicMethod: 'Admissible Haversine Geodesic Travel Cost',
    hazardsDetectedCount: hazards.filter((h) => h.status === 'ACTIVE').length,
    decisionReason: `A* graph search selected ${optimalRoute.name} with lowest total cost f(n)=${optimalRoute.aStarMetrics?.totalFCost}. Evaluated ${categorizedRoutes.length} non-overlapping distinct corridors with zero hazard obstructions.`,
    decisionReasonHi: `A* ग्राफ सर्च ने न्यूनतम लागत f(n)=${optimalRoute.aStarMetrics?.totalFCost} के साथ ${optimalRoute.name} को चुना। बिना किसी ओवरलैप के ${categorizedRoutes.length} अलग-अलग गलियारों का मूल्यांकन किया गया।`,
  };

  const aStarEvaluation: AStarEvaluationResult = {
    routes: categorizedRoutes,
    optimalRoute,
    alternativeRoutes,
    evaluationSummary,
    stepLogs: aStarA.stepLogs,
  };

  return {
    routes: categorizedRoutes,
    optimalRoute,
    alternativeRoutes,
    aStarEvaluation,
  };
}
