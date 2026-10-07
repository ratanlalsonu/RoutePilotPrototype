/**
 * A* Pathfinding Core Algorithm Engine for RoutePilot
 *
 * Implements:
 * 1. Normalized Edge Cost Calculation:
 *    edgeCost = Wd * distanceNormalized + Wt * timeNormalized + Wc * trafficNormalized + Wh * hazardNormalized + Wr * restrictionCost
 * 2. Cumulative g(n) accumulated cost propagation
 * 3. Admissible heuristic h(n) based on straight-line Haversine distance
 * 4. Priority Queue (Min-Heap) open set management
 * 5. Full presentation trace step logs with step-by-step explanations
 * 6. Vehicle restriction validation (CAR, BIKE, VAN)
 */

import {
  AStarRoadGraph,
  AStarRoadNode,
  AStarRoadEdge,
  AStarRouteResult,
  AStarTraceStep,
  AStarExecutionOptions,
} from '../types/aStarRouting';
import {
  ROUTE_WEIGHTS,
  RouteWeights,
  TrafficLevel,
  TRAFFIC_LEVEL_COST,
  HAZARD_SEVERITY_COST,
  DEFAULT_NORMALIZATION_BOUNDS,
  normalizeVehicleType,
  StandardVehicleType,
} from './aStarConfig';
import { MinPriorityQueue } from './priorityQueue';
import { getDistanceMeters } from './hazardRouteIntersection';

export interface EdgeCostCalculationDetails {
  edgeCost: number;
  distanceNormalized: number;
  timeNormalized: number;
  trafficNormalized: number;
  hazardNormalized: number;
  restrictionCost: number;
  costBreakdown: {
    distanceCost: number;
    timeCost: number;
    trafficCost: number;
    hazardCost: number;
    restrictionCost: number;
  };
  isBlocked: boolean;
  vehicleAllowed: boolean;
  blockReason?: string;
}

/**
 * 3. VEHICLE RESTRICTION CHECK
 * Validates whether the selected vehicle is allowed on this edge.
 */
export function isVehicleAllowedOnEdge(
  edge: AStarRoadEdge,
  vehicleType: StandardVehicleType
): boolean {
  // If explicitly blocked road status
  if (edge.roadStatus === 'BLOCKED') {
    return false;
  }

  // If vehicle whitelist is defined on this edge
  if (edge.allowedVehicles && edge.allowedVehicles.length > 0) {
    return edge.allowedVehicles.includes(vehicleType);
  }

  // If boolean vehicleAllowed is explicitly false
  if (edge.vehicleAllowed === false) {
    return false;
  }

  // Edge-specific clearance or weight checks (e.g. VAN restricted on narrow/weak bridges)
  const roadLower = (edge.roadName || '').toLowerCase();
  if (vehicleType === 'VAN') {
    // Narrow bridge or historic bridge clearance restrictions
    if (roadLower.includes('narrow bridge') || roadLower.includes('pedestrian bridge') || roadLower.includes('light bridge')) {
      return false;
    }
  }

  return true;
}

/**
 * 2. NORMALIZE PARAMETERS & 4. EDGE COST CALCULATION
 *
 * calculateEdgeCost(edge, vehicleType, weights)
 *
 * edgeCost =
 *   Wd * distanceNormalized
 *   + Wt * timeNormalized
 *   + Wc * trafficNormalized
 *   + Wh * hazardNormalized
 *   + Wr * restrictionCost
 *
 * If edge.roadStatus === "BLOCKED" OR vehicle is not allowed:
 *   return Infinity (Do not allow A* to use that edge)
 */
export function calculateEdgeCost(
  edge: AStarRoadEdge,
  vehicleTypeInput: string = 'CAR',
  weights: RouteWeights = ROUTE_WEIGHTS,
  maxDistanceKm: number = DEFAULT_NORMALIZATION_BOUNDS.maxRelevantDistanceKm,
  maxTravelTimeMin: number = DEFAULT_NORMALIZATION_BOUNDS.maxRelevantTravelTimeMin
): EdgeCostCalculationDetails {
  const vehicle = normalizeVehicleType(vehicleTypeInput);

  // 1. Check road status
  if (edge.roadStatus === 'BLOCKED') {
    return {
      edgeCost: Infinity,
      distanceNormalized: 0,
      timeNormalized: 0,
      trafficNormalized: 1.0,
      hazardNormalized: 1.0,
      restrictionCost: Infinity,
      costBreakdown: {
        distanceCost: 0,
        timeCost: 0,
        trafficCost: 0,
        hazardCost: 0,
        restrictionCost: Infinity,
      },
      isBlocked: true,
      vehicleAllowed: true,
      blockReason: `Road segment is physically BLOCKED (${edge.roadName || edge.edgeId})`,
    };
  }

  // 2. Check vehicle permission
  const vehicleAllowed = isVehicleAllowedOnEdge(edge, vehicle);
  if (!vehicleAllowed) {
    return {
      edgeCost: Infinity,
      distanceNormalized: 0,
      timeNormalized: 0,
      trafficNormalized: 0,
      hazardNormalized: 0,
      restrictionCost: Infinity,
      costBreakdown: {
        distanceCost: 0,
        timeCost: 0,
        trafficCost: 0,
        hazardCost: 0,
        restrictionCost: Infinity,
      },
      isBlocked: false,
      vehicleAllowed: false,
      blockReason: `Vehicle ${vehicle} is not allowed on ${edge.roadName || edge.edgeId}`,
    };
  }

  // 3. Normalized parameters between 0.0 and 1.0
  const safeMaxDist = Math.max(0.1, maxDistanceKm);
  const safeMaxTime = Math.max(0.1, maxTravelTimeMin);

  // Distance normalized: edge.distance / maxRelevantDistance
  const distanceNormalized = Math.min(1.0, Math.max(0, edge.distance / safeMaxDist));

  // Time normalized: edge.estimatedTravelTime / maxRelevantTravelTime
  const timeNormalized = Math.min(1.0, Math.max(0, edge.estimatedTravelTime / safeMaxTime));

  // Traffic normalized: mapped from traffic level (LOW=0.0, MEDIUM=0.5, HIGH=1.0)
  const trafficNormalized =
    edge.trafficCost !== undefined && !isNaN(edge.trafficCost)
      ? Math.min(1.0, Math.max(0, edge.trafficCost))
      : TRAFFIC_LEVEL_COST[edge.trafficLevel] ?? 0.0;

  // Hazard normalized: mapped from hazard severity (SAFE=0.0, WARNING=0.3, CRITICAL=0.7, BLOCKED=1.0)
  const hazardNormalized =
    edge.hazardCost !== undefined && !isNaN(edge.hazardCost)
      ? Math.min(1.0, Math.max(0, edge.hazardCost))
      : HAZARD_SEVERITY_COST[edge.hazardSeverity] ?? 0.0;

  // Restriction cost: 0 since vehicle is allowed
  const restrictionCost = edge.restrictionCost || 0;

  // Edge cost formula
  const distanceCost = weights.distance * distanceNormalized;
  const timeCost = weights.time * timeNormalized;
  const trafficCost = weights.traffic * trafficNormalized;
  const hazardCost = weights.hazard * hazardNormalized;
  const restCost = weights.restriction * restrictionCost;

  const edgeCost = distanceCost + timeCost + trafficCost + hazardCost + restCost;

  return {
    edgeCost: Math.round(edgeCost * 1000) / 1000,
    distanceNormalized,
    timeNormalized,
    trafficNormalized,
    hazardNormalized,
    restrictionCost,
    costBreakdown: {
      distanceCost: Math.round(distanceCost * 1000) / 1000,
      timeCost: Math.round(timeCost * 1000) / 1000,
      trafficCost: Math.round(trafficCost * 1000) / 1000,
      hazardCost: Math.round(hazardCost * 1000) / 1000,
      restrictionCost: Math.round(restCost * 1000) / 1000,
    },
    isBlocked: false,
    vehicleAllowed: true,
  };
}

/**
 * 6. HEURISTIC h(n)
 *
 * Straight-line distance between currentNode and goalNode.
 * Uses Haversine formula if lat/lng are available.
 * Scaled to be admissible and strictly in the same unit as Wd * distanceNormalized.
 *
 * IMPORTANT:
 * - Does NOT include actual future traffic or future hazards inside h(n).
 * - Kept strictly separate from g(n).
 * - h(Goal) = 0.
 */
export function calculateHeuristic(
  currentNode: AStarRoadNode,
  goalNode: AStarRoadNode,
  weights: RouteWeights = ROUTE_WEIGHTS,
  maxDistanceKm: number = DEFAULT_NORMALIZATION_BOUNDS.maxRelevantDistanceKm
): number {
  if (currentNode.id === goalNode.id) return 0;

  let straightLineKm = 0;

  if (
    typeof currentNode.lat === 'number' &&
    typeof currentNode.lng === 'number' &&
    typeof goalNode.lat === 'number' &&
    typeof goalNode.lng === 'number' &&
    (currentNode.lat !== 0 || currentNode.lng !== 0)
  ) {
    const meters = getDistanceMeters(
      currentNode.lat,
      currentNode.lng,
      goalNode.lat,
      goalNode.lng
    );
    straightLineKm = meters / 1000;
  } else if (typeof currentNode.x === 'number' && typeof goalNode.x === 'number') {
    // Canvas percentage plane distance approximation
    const dx = (goalNode.x || 0) - (currentNode.x || 0);
    const dy = (goalNode.y || 0) - (currentNode.y || 0);
    straightLineKm = Math.hypot(dx, dy) * 0.25; // Map percentage scale
  }

  // Normalized straight-line heuristic
  const safeMaxDist = Math.max(0.1, maxDistanceKm);
  const normalizedDist = Math.min(1.0, straightLineKm / safeMaxDist);

  // Admissible heuristic scaled by distance weight Wd
  const h = weights.distance * normalizedDist;
  return Math.round(h * 1000) / 1000;
}

interface OpenQueueEntry {
  nodeId: string;
  fScore: number;
}

/**
 * 7. REAL A* PATHFINDING ALGORITHM
 *
 * - Open Set / Priority Queue
 * - gScore Map (cumulative g(n))
 * - fScore Map (f(n) = g(n) + h(n))
 * - cameFrom Map
 * - Closed / visited set
 * - Adjacency list traversal
 */
export function runAStarPathfinding(
  graph: AStarRoadGraph,
  options: AStarExecutionOptions
): AStarRouteResult {
  const {
    startNodeId,
    goalNodeId,
    vehicleType = 'CAR',
    weights = ROUTE_WEIGHTS,
    edgePenalties,
    disallowedEdgeIds,
  } = options;

  const normVehicle = normalizeVehicleType(vehicleType);
  const startNode = graph.nodes.get(startNodeId);
  const goalNode = graph.nodes.get(goalNodeId);

  // Calculate dynamic normalization bounds based on graph topology if possible
  let maxEdgeDist = 0;
  let maxEdgeTime = 0;
  for (const edge of graph.edges.values()) {
    if (edge.distance > maxEdgeDist) maxEdgeDist = edge.distance;
    if (edge.estimatedTravelTime > maxEdgeTime) maxEdgeTime = edge.estimatedTravelTime;
  }
  const maxDistanceKm = options.maxDistanceKm || Math.max(DEFAULT_NORMALIZATION_BOUNDS.maxRelevantDistanceKm, maxEdgeDist * 2.5);
  const maxTravelTimeMin = options.maxTravelTimeMin || Math.max(DEFAULT_NORMALIZATION_BOUNDS.maxRelevantTravelTimeMin, maxEdgeTime * 2.5);

  const trace: AStarTraceStep[] = [];

  if (!startNode || !goalNode) {
    return {
      algorithm: 'A*',
      source: startNodeId,
      destination: goalNodeId,
      vehicleType: normVehicle,
      path: [],
      nodeSequence: [],
      pathEdges: [],
      fullGeometry: [],
      totalDistance: 0,
      estimatedTime: 0,
      totalCost: Infinity,
      nodesEvaluated: 0,
      hazardsAvoided: [],
      blockedRoadsAvoided: [],
      trafficSummary: 'LOW',
      costBreakdown: { distanceCost: 0, timeCost: 0, trafficCost: 0, hazardCost: 0, restrictionCost: 0 },
      trace: [],
      success: false,
      weightsUsed: weights,
      errorMessage: `Could not resolve start node (${startNodeId}) or goal node (${goalNodeId}) in road graph.`,
    };
  }

  // 5. CUMULATIVE g(n) TRACKING
  // gScore[n] is the total accumulated cost from startNode to node n
  const gScores = new Map<string, number>();
  gScores.set(startNodeId, 0);

  // fScores[n] = g(n) + h(n)
  const fScores = new Map<string, number>();
  const initialH = calculateHeuristic(startNode, goalNode, weights, maxDistanceKm);
  fScores.set(startNodeId, initialH);

  // cameFrom[neighbor] = { prevNodeId, edge, edgeCostDetails }
  const cameFrom = new Map<
    string,
    {
      prevNodeId: string;
      edge: AStarRoadEdge;
      edgeCostDetails: EdgeCostCalculationDetails;
    }
  >();

  // OPEN SET using MinPriorityQueue ordered by f(n)
  const openQueue = new MinPriorityQueue<OpenQueueEntry>();
  openQueue.enqueue({ nodeId: startNodeId, fScore: initialH }, initialH);

  // CLOSED SET
  const closedSet = new Set<string>();

  let nodesEvaluated = 0;
  let destinationReached = false;
  let stepCounter = 1;

  // Trace step 1: Start node initialization
  trace.push({
    step: stepCounter++,
    nodeId: startNode.id,
    nodeName: startNode.name,
    g: 0,
    h: initialH,
    f: initialH,
    previousNodeId: null,
    previousNodeName: null,
    edgeCost: 0,
    explanation: `Search initialized at ${startNode.name}. g(Start) = 0, h(Start) = ${initialH.toFixed(2)}, f = ${initialH.toFixed(2)}.`,
  });

  const maxIterations = 5000;

  while (!openQueue.isEmpty() && nodesEvaluated < maxIterations) {
    // 1. Select the node with minimum f(n)
    const currentEntry = openQueue.dequeue();
    if (!currentEntry) break;

    const currentId = currentEntry.nodeId;

    // Skip if already evaluated with lower cost
    if (closedSet.has(currentId)) continue;
    closedSet.add(currentId);
    nodesEvaluated++;

    const currentNode = graph.nodes.get(currentId);
    if (!currentNode) continue;

    const currentG = gScores.get(currentId) ?? 0;
    const currentH = calculateHeuristic(currentNode, goalNode, weights, maxDistanceKm);
    const currentF = currentG + currentH;

    // Record step trace when expanding node (if not the initial start step)
    if (currentId !== startNodeId) {
      const parentInfo = cameFrom.get(currentId);
      const prevNode = parentInfo ? graph.nodes.get(parentInfo.prevNodeId) : null;
      trace.push({
        step: stepCounter++,
        nodeId: currentNode.id,
        nodeName: currentNode.name,
        g: Math.round(currentG * 1000) / 1000,
        h: Math.round(currentH * 1000) / 1000,
        f: Math.round(currentF * 1000) / 1000,
        previousNodeId: parentInfo?.prevNodeId || null,
        previousNodeName: prevNode?.name || null,
        edgeCost: parentInfo?.edgeCostDetails.edgeCost || 0,
        edgeId: parentInfo?.edge.edgeId,
        explanation: `Node ${currentNode.name} selected from Open Set with lowest f(n) = ${currentF.toFixed(3)} [g=${currentG.toFixed(3)}, h=${currentH.toFixed(3)}].`,
        costBreakdown: parentInfo?.edgeCostDetails.costBreakdown,
      });
    }

    // 3. If it is the destination, reconstruct the path
    if (currentId === goalNodeId) {
      destinationReached = true;
      break;
    }

    // 4. Otherwise examine all neighboring road segments
    const outgoingEdges = graph.adjacency.get(currentId) || [];

    for (const edge of outgoingEdges) {
      const neighborId = edge.toNode;

      // Disallow explicitly disabled edges
      if (disallowedEdgeIds && disallowedEdgeIds.has(edge.edgeId)) {
        continue;
      }

      // If neighbor already closed, optimal gScore is finalized
      if (closedSet.has(neighborId)) continue;

      const neighborNode = graph.nodes.get(neighborId);
      if (!neighborNode) continue;

      // 5. Calculate edge cost: calculateEdgeCost(edge, vehicleType, weights)
      const costDetails = calculateEdgeCost(
        edge,
        normVehicle,
        weights,
        maxDistanceKm,
        maxTravelTimeMin
      );

      // If road is BLOCKED or vehicle is not allowed: edgeCost is Infinity
      if (costDetails.edgeCost === Infinity || !isFinite(costDetails.edgeCost)) {
        continue; // Do NOT allow A* to use this edge
      }

      // Add optional edge penalty for alternative route branch generation
      const extraPenalty = (edgePenalties && edgePenalties.get(edge.edgeId)) || 0;
      const effectiveEdgeCost = costDetails.edgeCost + extraPenalty;

      // 6. Cumulative g(n): tentativeG = g[currentNode] + calculateEdgeCost(currentEdge)
      const tentativeG = currentG + effectiveEdgeCost;
      const currentNeighborG = gScores.get(neighborId) ?? Infinity;

      // 7. Update the neighbor if tentativeG is strictly smaller
      if (tentativeG < currentNeighborG) {
        gScores.set(neighborId, tentativeG);
        cameFrom.set(neighborId, {
          prevNodeId: currentId,
          edge,
          edgeCostDetails: costDetails,
        });

        // 8. Calculate h(neighbor)
        const hNeighbor = calculateHeuristic(
          neighborNode,
          goalNode,
          weights,
          maxDistanceKm
        );

        // 9. Calculate f(neighbor) = tentativeG + h(neighbor)
        const fNeighbor = tentativeG + hNeighbor;
        fScores.set(neighborId, fNeighbor);

        openQueue.enqueue(
          {
            nodeId: neighborId,
            fScore: fNeighbor,
          },
          fNeighbor
        );
      }
    }
  }

  if (!destinationReached) {
    return {
      algorithm: 'A*',
      source: startNode.name,
      destination: goalNode.name,
      vehicleType: normVehicle,
      path: [],
      nodeSequence: [],
      pathEdges: [],
      fullGeometry: [],
      totalDistance: 0,
      estimatedTime: 0,
      totalCost: Infinity,
      nodesEvaluated,
      hazardsAvoided: [],
      blockedRoadsAvoided: [],
      trafficSummary: 'LOW',
      costBreakdown: { distanceCost: 0, timeCost: 0, trafficCost: 0, hazardCost: 0, restrictionCost: 0 },
      trace,
      success: false,
      weightsUsed: weights,
      errorMessage: `No feasible path found for ${normVehicle} from ${startNode.name} to ${goalNode.name}. All available road corridors may be blocked or restricted.`,
    };
  }

  // Reconstruct path by backtracking cameFrom from goal to start
  const pathEdgesReversed: AStarRoadEdge[] = [];
  const nodeSequenceReversed: string[] = [goalNodeId];
  const pathNamesReversed: string[] = [goalNode.name];

  let currId = goalNodeId;
  const aggregatedBreakdown = {
    distanceCost: 0,
    timeCost: 0,
    trafficCost: 0,
    hazardCost: 0,
    restrictionCost: 0,
  };

  while (currId !== startNodeId) {
    const parentInfo = cameFrom.get(currId);
    if (!parentInfo) break;

    pathEdgesReversed.push(parentInfo.edge);
    const cb = parentInfo.edgeCostDetails.costBreakdown;
    aggregatedBreakdown.distanceCost += cb.distanceCost;
    aggregatedBreakdown.timeCost += cb.timeCost;
    aggregatedBreakdown.trafficCost += cb.trafficCost;
    aggregatedBreakdown.hazardCost += cb.hazardCost;
    aggregatedBreakdown.restrictionCost += cb.restrictionCost;

    currId = parentInfo.prevNodeId;
    nodeSequenceReversed.push(currId);
    const prevNodeObj = graph.nodes.get(currId);
    if (prevNodeObj) pathNamesReversed.push(prevNodeObj.name);
  }

  const pathEdges = pathEdgesReversed.reverse();
  const nodeSequence = nodeSequenceReversed.reverse();
  const pathNames = pathNamesReversed.reverse();

  // Calculate total physical metrics along the chosen path
  let totalDistance = 0;
  let estimatedTime = 0;
  const fullGeometry: [number, number][] = [];
  const trafficCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };

  for (const edge of pathEdges) {
    totalDistance += edge.distance;
    estimatedTime += edge.estimatedTravelTime;
    trafficCounts[edge.trafficLevel] = (trafficCounts[edge.trafficLevel] || 0) + 1;

    // Concatenate real road geometry if available
    if (edge.geometry && edge.geometry.length > 0) {
      if (fullGeometry.length === 0) {
        fullGeometry.push(...edge.geometry);
      } else {
        const last = fullGeometry[fullGeometry.length - 1];
        const first = edge.geometry[0];
        if (Math.abs(last[0] - first[0]) < 1e-6 && Math.abs(last[1] - first[1]) < 1e-6) {
          fullGeometry.push(...edge.geometry.slice(1));
        } else {
          fullGeometry.push(...edge.geometry);
        }
      }
    }
  }

  // Identify traffic summary along path
  let trafficSummary: TrafficLevel = 'LOW';
  if (trafficCounts.HIGH > 0) trafficSummary = 'HIGH';
  else if (trafficCounts.MEDIUM > 0) trafficSummary = 'MEDIUM';

  // Identify hazards and blocked roads avoided by this optimal path
  const chosenEdgeIds = new Set(pathEdges.map((e) => e.edgeId));
  const hazardsAvoided: string[] = [];
  const blockedRoadsAvoided: string[] = [];

  for (const edge of graph.edges.values()) {
    if (!chosenEdgeIds.has(edge.edgeId)) {
      if (edge.roadStatus === 'BLOCKED') {
        const label = `${edge.roadName || edge.edgeId} (Blocked)`;
        if (!blockedRoadsAvoided.includes(label)) blockedRoadsAvoided.push(label);
      } else if (edge.hazardSeverity === 'CRITICAL' || edge.hazardSeverity === 'WARNING') {
        const label = `${edge.roadName || edge.edgeId} (${edge.hazardSeverity})`;
        if (!hazardsAvoided.includes(label)) hazardsAvoided.push(label);
      }
    }
  }

  const totalCost = Math.round((gScores.get(goalNodeId) || 0) * 1000) / 1000;

  return {
    algorithm: 'A*',
    source: startNode.name,
    destination: goalNode.name,
    vehicleType: normVehicle,
    path: pathNames,
    nodeSequence,
    pathEdges,
    fullGeometry,
    totalDistance: Math.round(totalDistance * 10) / 10,
    estimatedTime: Math.round(estimatedTime * 10) / 10,
    totalCost,
    nodesEvaluated,
    hazardsAvoided,
    blockedRoadsAvoided,
    trafficSummary,
    costBreakdown: {
      distanceCost: Math.round(aggregatedBreakdown.distanceCost * 1000) / 1000,
      timeCost: Math.round(aggregatedBreakdown.timeCost * 1000) / 1000,
      trafficCost: Math.round(aggregatedBreakdown.trafficCost * 1000) / 1000,
      hazardCost: Math.round(aggregatedBreakdown.hazardCost * 1000) / 1000,
      restrictionCost: Math.round(aggregatedBreakdown.restrictionCost * 1000) / 1000,
    },
    trace,
    success: true,
    weightsUsed: weights,
  };
}
