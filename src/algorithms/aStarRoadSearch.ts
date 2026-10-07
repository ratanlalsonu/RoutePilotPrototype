import { RoadGraph, RoadNode, RoadEdge, AStarSearchParams, AStarSearchResult } from '../types/roadGraph';
import { MinPriorityQueue } from './priorityQueue';
import { getDistanceMeters } from './hazardRouteIntersection';
import { getVehicleSpeedProfile } from '../services/routingService';
import {
  ROUTE_WEIGHTS,
  RouteWeights,
  TRAFFIC_LEVEL_COST,
  HAZARD_SEVERITY_COST,
  DEFAULT_NORMALIZATION_BOUNDS,
  normalizeVehicleType,
} from './aStarConfig';

interface OpenSetNode {
  nodeId: string;
  fCost: number;
  gCost: number;
  hCost: number;
}

/**
 * 6. HEURISTIC h(n)
 * Calculates admissible heuristic h(n) from a road node to the goal node.
 * Uses straight-line distance via Haversine formula.
 * Strictly admissible: never overestimates actual road travel cost.
 * Does NOT include future traffic or future hazards inside h(n).
 */
export function calculateAdmissibleHeuristic(
  node: RoadNode,
  goalNode: RoadNode,
  weights: RouteWeights = ROUTE_WEIGHTS,
  maxRelevantDistanceKm: number = DEFAULT_NORMALIZATION_BOUNDS.maxRelevantDistanceKm
): number {
  const distMeters = getDistanceMeters(node.lat, node.lng, goalNode.lat, goalNode.lng);
  const distKm = distMeters / 1000;
  // Normalized straight line distance
  const normDist = Math.min(1.0, distKm / Math.max(0.1, maxRelevantDistanceKm));
  // Scaled by Wd so heuristic is strictly compatible with g(n) distance component
  const h = weights.distance * normDist;
  return Math.round(h * 1000) / 1000;
}

/**
 * 3. VEHICLE RESTRICTION & 4. EDGE COST
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
 * If edge is BLOCKED or vehicle is not allowed: returns Infinity.
 */
export function calculateEdgeCost(
  edge: RoadEdge,
  vehicleType: AStarSearchParams['vehicleType'],
  edgePenalty: number = 0,
  weights: RouteWeights = ROUTE_WEIGHTS,
  maxDistanceKm: number = DEFAULT_NORMALIZATION_BOUNDS.maxRelevantDistanceKm,
  maxTravelTimeMin: number = DEFAULT_NORMALIZATION_BOUNDS.maxRelevantTravelTimeMin
): {
  totalCost: number;
  distanceCost: number;
  timeCost: number;
  trafficCost: number;
  hazardCost: number;
  restrictionCost: number;
  hazardPenalty: number;
  blockedPenalty: number;
  isBlocked: boolean;
  vehicleAllowed: boolean;
} {
  const normVehicle = normalizeVehicleType(vehicleType);

  // 1. Check blocked status
  if (edge.isBlocked || edge.roadStatus === 'BLOCKED') {
    return {
      totalCost: Infinity,
      distanceCost: 0,
      timeCost: 0,
      trafficCost: 0,
      hazardCost: 0,
      restrictionCost: Infinity,
      hazardPenalty: 999999,
      blockedPenalty: Infinity,
      isBlocked: true,
      vehicleAllowed: true,
    };
  }

  // 2. Check vehicle restriction
  let vehicleAllowed = edge.vehicleAllowed !== false;
  if (edge.allowedVehicles && edge.allowedVehicles.length > 0) {
    vehicleAllowed = edge.allowedVehicles.includes(vehicleType);
  }

  const roadLower = (edge.roadName || '').toLowerCase();
  if (normVehicle === 'VAN') {
    if (roadLower.includes('narrow bridge') || roadLower.includes('pedestrian bridge') || roadLower.includes('light bridge')) {
      vehicleAllowed = false;
    }
  }

  if (!vehicleAllowed) {
    return {
      totalCost: Infinity,
      distanceCost: 0,
      timeCost: 0,
      trafficCost: 0,
      hazardCost: 0,
      restrictionCost: Infinity,
      hazardPenalty: 0,
      blockedPenalty: Infinity,
      isBlocked: false,
      vehicleAllowed: false,
    };
  }

  // 3. Normalized parameters
  const distKm = edge.distanceMeters / 1000;
  const profile = getVehicleSpeedProfile(vehicleType);
  const baseMinutes =
    edge.baseDurationSeconds > 0
      ? edge.baseDurationSeconds / 60
      : (distKm / Math.max(20, profile.averageSpeedKmh)) * 60;
  const estimatedTimeMin = baseMinutes * profile.timeMultiplierVsCar;

  // Normalized values (0.0 to 1.0)
  const distanceNormalized = Math.min(1.0, Math.max(0, distKm / Math.max(0.1, maxDistanceKm)));
  const timeNormalized = Math.min(1.0, Math.max(0, estimatedTimeMin / Math.max(0.1, maxTravelTimeMin)));

  // Traffic normalized
  let trafficNormalized = 0.0;
  if (edge.trafficCost !== undefined) {
    trafficNormalized = edge.trafficCost;
  } else if (edge.trafficLevel) {
    trafficNormalized = TRAFFIC_LEVEL_COST[edge.trafficLevel] ?? 0.0;
  } else {
    // Default low unless corridor is crowded
    trafficNormalized = roadLower.includes('arterial') || roadLower.includes('central') ? 0.5 : 0.0;
  }

  // Hazard normalized
  let hazardNormalized = 0.0;
  if (edge.hazardCost !== undefined) {
    hazardNormalized = edge.hazardCost;
  } else if (edge.hazardSeverity) {
    hazardNormalized = HAZARD_SEVERITY_COST[edge.hazardSeverity] ?? 0.0;
  } else if (edge.hazardPenalty && edge.hazardPenalty > 0) {
    hazardNormalized = edge.hazardPenalty >= 9999 ? 1.0 : edge.hazardPenalty >= 400 ? 0.3 : 0.1;
  }

  // Restriction cost: 0 since allowed
  const restrictionCost = edge.restrictionCost || 0;

  // Calculated components
  const distanceCost = weights.distance * distanceNormalized;
  const timeCost = weights.time * timeNormalized;
  const trafficCost = weights.traffic * trafficNormalized;
  const hazardCost = weights.hazard * hazardNormalized;
  const restCost = weights.restriction * restrictionCost;

  const totalCost = Math.max(
    0.01,
    distanceCost + timeCost + trafficCost + hazardCost + restCost + edgePenalty
  );

  return {
    totalCost: Math.round(totalCost * 1000) / 1000,
    distanceCost: Math.round(distanceCost * 1000) / 1000,
    timeCost: Math.round(timeCost * 1000) / 1000,
    trafficCost: Math.round(trafficCost * 1000) / 1000,
    hazardCost: Math.round(hazardCost * 1000) / 1000,
    restrictionCost: Math.round(restCost * 1000) / 1000,
    hazardPenalty: edge.hazardPenalty || 0,
    blockedPenalty: 0,
    isBlocked: false,
    vehicleAllowed: true,
  };
}

/**
 * 7. GENUINE A* GRAPH SEARCH ENGINE
 *
 * Implements:
 * 1. OPEN set managed via MinPriorityQueue (min-heap) ordered by f(n)
 * 2. CLOSED set managed via Set<string>
 * 3. f(n) = g(n) + h(n)
 * 4. Multi-branch junction evaluation at every intersection
 * 5. Backtracking to reconstruct exact road edges and real road geometry
 */
export function runAStarRoadSearch(
  graph: RoadGraph,
  params: AStarSearchParams,
  weights: RouteWeights = ROUTE_WEIGHTS
): AStarSearchResult {
  const { startNodeId, goalNodeId, vehicleType, edgePenalties, disallowedEdgeIds } = params;

  const startNode = graph.nodes.get(startNodeId);
  const goalNode = graph.nodes.get(goalNodeId);

  const stepLogs: AStarSearchResult['stepLogs'] = [];

  if (!startNode || !goalNode) {
    return {
      success: false,
      pathNodes: [],
      pathEdges: [],
      fullGeometry: [],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      accumulatedGCost: 0,
      heuristicHCost: 0,
      hazardPenaltyCost: 0,
      totalFCost: 0,
      evaluatedNodesCount: 0,
      stepLogs: [
        {
          step: 1,
          title: 'Initialization Failed',
          formula: 'Node lookup error',
          details: `Start node (${startNodeId}) or Goal node (${goalNodeId}) not found in road graph.`,
          status: 'danger',
        },
      ],
      errorMessage: 'Start or Destination road node could not be resolved on the road graph.',
    };
  }

  // Determine dynamic normalization bounds across graph edges
  let maxEdgeDistKm = 0;
  let maxEdgeTimeMin = 0;
  for (const edge of graph.edges.values()) {
    const dKm = edge.distanceMeters / 1000;
    const tMin = edge.baseDurationSeconds / 60;
    if (dKm > maxEdgeDistKm) maxEdgeDistKm = dKm;
    if (tMin > maxEdgeTimeMin) maxEdgeTimeMin = tMin;
  }
  const maxDistanceKm = Math.max(DEFAULT_NORMALIZATION_BOUNDS.maxRelevantDistanceKm, maxEdgeDistKm * 2.5);
  const maxTravelTimeMin = Math.max(DEFAULT_NORMALIZATION_BOUNDS.maxRelevantTravelTimeMin, maxEdgeTimeMin * 2.5);

  const initialHCost = calculateAdmissibleHeuristic(startNode, goalNode, weights, maxDistanceKm);

  stepLogs.push({
    step: 1,
    title: 'Initialize A* Road Graph Search',
    formula: `f(Start) = g(0.00) + h(${initialHCost.toFixed(2)}) = ${initialHCost.toFixed(2)}`,
    details: `Searching road network for ${vehicleType.toUpperCase()} using formula: g(n) = Wd·Dist + Wt·Time + Wc·Traffic + Wh·Hazard + Wr·Restriction.`,
    status: 'info',
  });

  // Track gScores: best known cumulative cost from startNode to current node
  const gScores = new Map<string, number>();
  gScores.set(startNodeId, 0);

  // Track fScores
  const fScores = new Map<string, number>();
  fScores.set(startNodeId, initialHCost);

  // Track cameFrom: maps nodeId -> { prevNodeId, edge, costDetails }
  const cameFrom = new Map<string, { prevNodeId: string; edge: RoadEdge; costDetails: any }>();

  // OPEN set: MinPriorityQueue ordered by f(n)
  const openQueue = new MinPriorityQueue<OpenSetNode>();
  openQueue.enqueue(
    {
      nodeId: startNodeId,
      fCost: initialHCost,
      gCost: 0,
      hCost: initialHCost,
    },
    initialHCost
  );

  // CLOSED set: nodes already expanded with finalized optimal gScore
  const closedSet = new Set<string>();

  let evaluatedNodesCount = 0;
  let reachedGoal = false;
  const maxIterations = 8000; // Safeguard against graph loops

  while (!openQueue.isEmpty() && evaluatedNodesCount < maxIterations) {
    const current = openQueue.dequeue();
    if (!current) break;

    const currentId = current.nodeId;

    // If already in CLOSED set with a better score, skip
    if (closedSet.has(currentId)) continue;
    closedSet.add(currentId);
    evaluatedNodesCount++;

    const currentNode = graph.nodes.get(currentId);
    if (!currentNode) continue;

    // Check if reached goal
    if (currentId === goalNodeId) {
      reachedGoal = true;
      stepLogs.push({
        step: stepLogs.length + 1,
        title: 'Goal Destination Reached',
        formula: `f(Goal) = g(${current.gCost.toFixed(3)}) + h(0) = ${current.gCost.toFixed(3)}`,
        details: `Optimal destination reached via road network after evaluating ${evaluatedNodesCount} intersections.`,
        status: 'success',
      });
      break;
    }

    // Identify available outgoing road edges at this junction/branch
    const outgoingEdges = graph.adjacency.get(currentId) || [];

    for (const edge of outgoingEdges) {
      const neighborId = edge.toNodeId;

      // Disallow explicitly disabled edges
      if (disallowedEdgeIds && disallowedEdgeIds.has(edge.id)) {
        continue;
      }

      // Check if neighbor already closed
      if (closedSet.has(neighborId)) continue;

      const neighborNode = graph.nodes.get(neighborId);
      if (!neighborNode) continue;

      // Calculate cost to traverse this edge
      const extraPenalty = (edgePenalties && edgePenalties.get(edge.id)) || 0;
      const costDetails = calculateEdgeCost(
        edge,
        vehicleType,
        extraPenalty,
        weights,
        maxDistanceKm,
        maxTravelTimeMin
      );

      // If blocked or vehicle not allowed, skip completely
      if (costDetails.totalCost === Infinity || !isFinite(costDetails.totalCost)) {
        if (edge.isBlocked && stepLogs.length < 25) {
          stepLogs.push({
            step: stepLogs.length + 1,
            title: `Road Segment Blocked: ${edge.roadName}`,
            formula: `Edge cost = Infinity on ${edge.id}`,
            details: `Active hazard directly obstructs ${edge.roadName}. Segment omitted from A* exploration.`,
            status: 'danger',
          });
        }
        continue;
      }

      const edgeCost = costDetails.totalCost;
      const tentativeGCost = (gScores.get(currentId) ?? Infinity) + edgeCost;
      const currentNeighborGCost = gScores.get(neighborId) ?? Infinity;

      if (tentativeGCost < currentNeighborGCost) {
        // Found a superior path to neighborNode!
        cameFrom.set(neighborId, { prevNodeId: currentId, edge, costDetails });
        gScores.set(neighborId, tentativeGCost);

        const hCost = calculateAdmissibleHeuristic(neighborNode, goalNode, weights, maxDistanceKm);
        const fCost = tentativeGCost + hCost;
        fScores.set(neighborId, fCost);

        openQueue.enqueue(
          {
            nodeId: neighborId,
            fCost,
            gCost: tentativeGCost,
            hCost,
          },
          fCost
        );

        if (costDetails.hazardCost > 0 && stepLogs.length < 25) {
          stepLogs.push({
            step: stepLogs.length + 1,
            title: `Hazard Caution on ${edge.roadName}`,
            formula: `Hazard component Wh·H = ${costDetails.hazardCost.toFixed(3)}`,
            details: `Active caution near road segment. Evaluated with elevated cost to encourage safer detour.`,
            status: 'warning',
            costBreakdown: {
              distanceCost: costDetails.distanceCost,
              timeCost: costDetails.timeCost,
              trafficCost: costDetails.trafficCost,
              hazardCost: costDetails.hazardCost,
              restrictionCost: costDetails.restrictionCost,
            },
          });
        }
      }
    }
  }

  if (!reachedGoal) {
    return {
      success: false,
      pathNodes: [],
      pathEdges: [],
      fullGeometry: [],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      accumulatedGCost: 0,
      heuristicHCost: initialHCost,
      hazardPenaltyCost: 0,
      totalFCost: 0,
      evaluatedNodesCount,
      stepLogs,
      errorMessage: 'Unable to calculate a feasible road route. All available road corridors may be blocked or restricted.',
    };
  }

  // Reconstruct path by backtracking cameFrom from goalNodeId to startNodeId
  const pathEdgesReversed: RoadEdge[] = [];
  const pathNodesReversed: RoadNode[] = [];

  let currId = goalNodeId;
  const goalNodeObj = graph.nodes.get(goalNodeId);
  if (goalNodeObj) pathNodesReversed.push(goalNodeObj);

  const accumulatedBreakdown = {
    distanceCost: 0,
    timeCost: 0,
    trafficCost: 0,
    hazardCost: 0,
    restrictionCost: 0,
  };

  while (currId !== startNodeId) {
    const entry = cameFrom.get(currId);
    if (!entry) break;
    pathEdgesReversed.push(entry.edge);
    if (entry.costDetails) {
      accumulatedBreakdown.distanceCost += entry.costDetails.distanceCost;
      accumulatedBreakdown.timeCost += entry.costDetails.timeCost;
      accumulatedBreakdown.trafficCost += entry.costDetails.trafficCost;
      accumulatedBreakdown.hazardCost += entry.costDetails.hazardCost;
      accumulatedBreakdown.restrictionCost += entry.costDetails.restrictionCost;
    }
    currId = entry.prevNodeId;
    const prevNodeObj = graph.nodes.get(currId);
    if (prevNodeObj) pathNodesReversed.push(prevNodeObj);
  }

  const pathEdges = pathEdgesReversed.reverse();
  const pathNodes = pathNodesReversed.reverse();

  // Concatenate dense road coordinates from each real road edge
  const fullGeometry: [number, number][] = [];
  let totalDistanceMeters = 0;
  let totalDurationSeconds = 0;
  let totalHazardPenalty = 0;
  const trafficCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };

  for (let i = 0; i < pathEdges.length; i++) {
    const edge = pathEdges[i];
    totalDistanceMeters += edge.distanceMeters;
    totalDurationSeconds += edge.baseDurationSeconds;
    totalHazardPenalty += edge.hazardPenalty || 0;

    const tLvl = edge.trafficLevel || 'LOW';
    trafficCounts[tLvl] = (trafficCounts[tLvl] || 0) + 1;

    const edgeGeom = edge.geometry || [];
    if (edgeGeom.length > 0) {
      if (fullGeometry.length === 0) {
        fullGeometry.push(...edgeGeom);
      } else {
        const last = fullGeometry[fullGeometry.length - 1];
        const first = edgeGeom[0];
        if (Math.abs(last[0] - first[0]) < 1e-6 && Math.abs(last[1] - first[1]) < 1e-6) {
          fullGeometry.push(...edgeGeom.slice(1));
        } else {
          fullGeometry.push(...edgeGeom);
        }
      }
    }
  }

  let trafficSummary: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (trafficCounts.HIGH > 0) trafficSummary = 'HIGH';
  else if (trafficCounts.MEDIUM > 0) trafficSummary = 'MEDIUM';

  // Identify hazards and blocked roads avoided by this path
  const chosenEdgeIds = new Set(pathEdges.map((e) => e.id));
  const hazardsAvoided: string[] = [];
  const blockedRoadsAvoided: string[] = [];

  for (const edge of graph.edges.values()) {
    if (!chosenEdgeIds.has(edge.id)) {
      if (edge.isBlocked || edge.roadStatus === 'BLOCKED') {
        const lbl = `${edge.roadName || edge.id} (Blocked)`;
        if (!blockedRoadsAvoided.includes(lbl)) blockedRoadsAvoided.push(lbl);
      } else if (edge.hazardSeverity === 'CRITICAL' || edge.hazardSeverity === 'WARNING' || (edge.hazardPenalty || 0) > 0) {
        const lbl = `${edge.roadName || edge.id} (${edge.hazardSeverity || 'Caution'})`;
        if (!hazardsAvoided.includes(lbl)) hazardsAvoided.push(lbl);
      }
    }
  }

  const finalGCost = gScores.get(goalNodeId) || 0;
  const finalFCost = Math.round(finalGCost * 1000) / 1000;

  return {
    success: true,
    pathNodes,
    pathEdges,
    fullGeometry,
    totalDistanceMeters,
    totalDurationSeconds,
    accumulatedGCost: Math.round(finalGCost * 1000) / 1000,
    heuristicHCost: initialHCost,
    hazardPenaltyCost: totalHazardPenalty,
    totalFCost: finalFCost,
    evaluatedNodesCount,
    costBreakdown: {
      distanceCost: Math.round(accumulatedBreakdown.distanceCost * 1000) / 1000,
      timeCost: Math.round(accumulatedBreakdown.timeCost * 1000) / 1000,
      trafficCost: Math.round(accumulatedBreakdown.trafficCost * 1000) / 1000,
      hazardCost: Math.round(accumulatedBreakdown.hazardCost * 1000) / 1000,
      restrictionCost: Math.round(accumulatedBreakdown.restrictionCost * 1000) / 1000,
    },
    hazardsAvoided,
    blockedRoadsAvoided,
    trafficSummary,
    stepLogs,
  };
}
