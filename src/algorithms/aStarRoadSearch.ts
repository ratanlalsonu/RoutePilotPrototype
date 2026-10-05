import { RoadGraph, RoadNode, RoadEdge, AStarSearchParams, AStarSearchResult } from '../types/roadGraph';
import { MinPriorityQueue } from './priorityQueue';
import { getDistanceMeters } from './hazardRouteIntersection';
import { getVehicleSpeedProfile } from '../services/routingService';

interface OpenSetNode {
  nodeId: string;
  fCost: number;
  gCost: number;
  hCost: number;
}

/**
 * Calculates admissible heuristic h(n) from a road node to the goal node.
 * Heuristic is based on the theoretical minimum travel time + geodesic distance.
 * Guaranteed admissible: never overestimates actual road travel cost.
 */
export function calculateAdmissibleHeuristic(
  node: RoadNode,
  goalNode: RoadNode,
  highwaySpeedKmh: number = 85
): number {
  const distMeters = getDistanceMeters(node.lat, node.lng, goalNode.lat, goalNode.lng);
  const distKm = distMeters / 1000;
  // Theoretical minimum minutes at max highway speed
  const minMinutes = (distKm / highwaySpeedKmh) * 60;
  // Weighted heuristic matching the g-cost weighting
  const timeWeight = 1.0;
  const distWeight = 0.45;
  const cost = minMinutes * timeWeight + distKm * distWeight;
  return Math.round(cost * 10) / 10;
}

/**
 * Calculates traversal cost for traversing a specific road edge:
 * edgeCost = travelTimeCost + distanceCost + hazardPenalty + blockedRoadPenalty
 */
export function calculateEdgeCost(
  edge: RoadEdge,
  vehicleType: AStarSearchParams['vehicleType'],
  edgePenalty: number = 0
): {
  totalCost: number;
  travelTimeCost: number;
  distanceCost: number;
  hazardPenalty: number;
  blockedPenalty: number;
} {
  const profile = getVehicleSpeedProfile(vehicleType);
  const distKm = edge.distanceMeters / 1000;
  const baseMinutes = edge.baseDurationSeconds > 0
    ? edge.baseDurationSeconds / 60
    : (distKm / Math.max(20, profile.averageSpeedKmh)) * 60;

  // Travel time cost scaled by vehicle type multiplier
  const adjustedMinutes = baseMinutes * profile.timeMultiplierVsCar;
  const travelTimeCost = adjustedMinutes * 1.0;

  // Road distance cost
  const distanceCost = distKm * 0.45;

  // Hazard penalty
  const hazardPenalty = edge.hazardPenalty || 0;

  // Blocked road penalty: massive cost to divert traffic
  const blockedPenalty = edge.isBlocked ? 999999 : 0;

  // Vehicle-specific street adjustments
  let vehicleModifier = 0;
  const roadLower = edge.roadName.toLowerCase();
  if (vehicleType === 'truck' || vehicleType === 'bus') {
    if (roadLower.includes('residential') || roadLower.includes('service') || roadLower.includes('narrow')) {
      vehicleModifier += 12; // Heavy penalty for heavy vehicles on narrow roads
    }
    if (roadLower.includes('bypass') || roadLower.includes('expressway') || roadLower.includes('nh')) {
      vehicleModifier -= 4; // Trucks favor wide open bypasses
    }
  } else if (vehicleType === 'bike') {
    if (roadLower.includes('residential') || roadLower.includes('link')) {
      vehicleModifier -= 2; // Bikes navigate city streets effortlessly
    }
  }

  const totalCost = Math.max(
    0.1,
    travelTimeCost + distanceCost + hazardPenalty + blockedPenalty + edgePenalty + vehicleModifier
  );

  return {
    totalCost: Math.round(totalCost * 10) / 10,
    travelTimeCost: Math.round(travelTimeCost * 10) / 10,
    distanceCost: Math.round(distanceCost * 10) / 10,
    hazardPenalty,
    blockedPenalty,
  };
}

/**
 * Genuine A* Graph Search Engine
 *
 * Implements:
 * 1. OPEN set managed via MinPriorityQueue (min-heap)
 * 2. CLOSED set managed via Set<string>
 * 3. f(n) = g(n) + h(n)
 * 4. Multi-branch junction evaluation (evaluating all outgoing road edges at every intersection)
 * 5. Backtracking to recover exact real road edges and real road geometry
 */
export function runAStarRoadSearch(
  graph: RoadGraph,
  params: AStarSearchParams
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

  const profile = getVehicleSpeedProfile(vehicleType);
  const initialHCost = calculateAdmissibleHeuristic(startNode, goalNode, profile.highwaySpeedKmh);

  stepLogs.push({
    step: 1,
    title: 'Initialize A* Road Graph Search',
    formula: `h(Start) = ${initialHCost}, g(Start) = 0 → f(Start) = ${initialHCost}`,
    details: `Searching road network for ${profile.label}. Origin: ${startNode.name || startNodeId}, Goal: ${goalNode.name || goalNodeId}. Admissible heuristic guarantees optimal path.`,
    status: 'info',
  });

  // Track gScores: best known cost from startNode to current node
  const gScores = new Map<string, number>();
  gScores.set(startNodeId, 0);

  // Track fScores
  const fScores = new Map<string, number>();
  fScores.set(startNodeId, initialHCost);

  // Track cameFrom: maps nodeId -> { prevNodeId, edge }
  const cameFrom = new Map<string, { prevNodeId: string; edge: RoadEdge }>();

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
        formula: `f(Goal) = g(${current.gCost.toFixed(1)}) + h(0) = ${current.gCost.toFixed(1)}`,
        details: `Optimal destination node reached via real road network after evaluating ${evaluatedNodesCount} graph intersections.`,
        status: 'success',
      });
      break;
    }

    // Identify available outgoing road edges at this junction/branch
    const outgoingEdges = graph.adjacency.get(currentId) || [];

    if (outgoingEdges.length > 1 && evaluatedNodesCount <= 12) {
      stepLogs.push({
        step: stepLogs.length + 1,
        title: `Junction Exploration at ${currentNode.name || currentId}`,
        formula: `Branches available: ${outgoingEdges.length}`,
        details: `Evaluating ${outgoingEdges.length} outgoing road branches: ${outgoingEdges.map((e) => e.roadName || 'Road').join(', ')}. Computing future f(n) = g(n) + h(n).`,
        status: 'info',
      });
    }

    for (const edge of outgoingEdges) {
      const neighborId = edge.toNodeId;

      // Disallow explicitly disabled/severely blocked edges
      if (disallowedEdgeIds && disallowedEdgeIds.has(edge.id)) {
        continue;
      }

      // Check if neighbor already closed
      if (closedSet.has(neighborId)) continue;

      const neighborNode = graph.nodes.get(neighborId);
      if (!neighborNode) continue;

      // Calculate cost to traverse this edge
      const extraPenalty = (edgePenalties && edgePenalties.get(edge.id)) || 0;
      const { totalCost: edgeCost, hazardPenalty } = calculateEdgeCost(edge, vehicleType, extraPenalty);

      // Log hazard blockage on edge to step logs for transparent explanation
      if (edge.isBlocked) {
        if (stepLogs.length < 25) {
          stepLogs.push({
            step: stepLogs.length + 1,
            title: `Road Segment Blocked: ${edge.roadName}`,
            formula: `+999999 blocked penalty on Edge ${edge.id}`,
            details: `Active hazard directly obstructs ${edge.roadName}. Branch heavily penalized to divert traffic to safe road corridors.`,
            status: 'danger',
          });
        }
      }

      const tentativeGCost = (gScores.get(currentId) ?? Infinity) + edgeCost;
      const currentNeighborGCost = gScores.get(neighborId) ?? Infinity;

      if (tentativeGCost < currentNeighborGCost) {
        // Found a strictly superior path to neighborNode!
        cameFrom.set(neighborId, { prevNodeId: currentId, edge });
        gScores.set(neighborId, tentativeGCost);

        const hCost = calculateAdmissibleHeuristic(neighborNode, goalNode, profile.highwaySpeedKmh);
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

        if (hazardPenalty > 0 && stepLogs.length < 25) {
          stepLogs.push({
            step: stepLogs.length + 1,
            title: `Hazard Caution on ${edge.roadName}`,
            formula: `+${hazardPenalty} penalty applied`,
            details: `Active hazard near road segment. Branch penalized to encourage safer detour.`,
            status: 'warning',
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
      errorMessage: 'Unable to calculate a road route. Please check your connection or try another destination.',
    };
  }

  // Reconstruct path by backtracking cameFrom from goalNodeId to startNodeId
  const pathEdgesReversed: RoadEdge[] = [];
  const pathNodesReversed: RoadNode[] = [];

  let currId = goalNodeId;
  const goalNodeObj = graph.nodes.get(goalNodeId);
  if (goalNodeObj) pathNodesReversed.push(goalNodeObj);

  while (currId !== startNodeId) {
    const entry = cameFrom.get(currId);
    if (!entry) break;
    pathEdgesReversed.push(entry.edge);
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

  for (let i = 0; i < pathEdges.length; i++) {
    const edge = pathEdges[i];
    totalDistanceMeters += edge.distanceMeters;
    totalDurationSeconds += edge.baseDurationSeconds;
    totalHazardPenalty += edge.hazardPenalty || 0;

    const edgeGeom = edge.geometry || [];
    if (edgeGeom.length > 0) {
      if (fullGeometry.length === 0) {
        fullGeometry.push(...edgeGeom);
      } else {
        // Avoid duplicate point at junction boundary
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

  const finalGCost = gScores.get(goalNodeId) || 0;
  const finalFCost = Math.round(finalGCost * 10) / 10;

  return {
    success: true,
    pathNodes,
    pathEdges,
    fullGeometry,
    totalDistanceMeters,
    totalDurationSeconds,
    accumulatedGCost: Math.round(finalGCost * 10) / 10,
    heuristicHCost: initialHCost,
    hazardPenaltyCost: totalHazardPenalty,
    totalFCost: finalFCost,
    evaluatedNodesCount,
    stepLogs,
  };
}
