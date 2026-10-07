/**
 * Verification Test Suite for RoutePilot A* Pathfinding Algorithm
 *
 * Verifies all 7 core test scenarios specified in requirements:
 * TEST 1: Shortest route has HIGH traffic vs longer route with LOW traffic -> lower total-cost route selected.
 * TEST 2: Shortest route contains WARNING hazard vs safe alternative -> hazard penalty influences result.
 * TEST 3: Route contains CRITICAL hazard -> safe alternative is preferred.
 * TEST 4: Route is BLOCKED -> A* never uses it (cost is Infinity).
 * TEST 5: Bridge is incompatible with VAN -> VAN cannot use that bridge.
 * TEST 6: Hazard appears on active route -> road graph updates and A* recalculates from driver's current location.
 * TEST 7: Traffic condition changes while travelling -> route cost recalculated using updated traffic value.
 */

import {
  AStarRoadGraph,
  AStarRoadNode,
  AStarRoadEdge,
  AStarRouteResult,
} from '../types/aStarRouting';
import { runAStarPathfinding, calculateEdgeCost } from './aStarCore';
import { ROUTE_WEIGHTS } from './aStarConfig';

export interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  summary: string;
  expected: string;
  actual: string;
  details: {
    selectedRoute?: string;
    totalCost?: number;
    totalDistance?: number;
    costBreakdown?: any;
    traceStepsCount?: number;
    [key: string]: any;
  };
}

export interface FullTestSuiteSummary {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  timestamp: string;
  results: TestCaseResult[];
}

/**
 * Creates a standard test graph with 2-3 parallel corridors from Start (S) to Goal (G):
 * - Route 1 (Direct Corridor via Node A): direct, standard distance
 * - Route 2 (Bypass Corridor via Node B): alternate route, slightly longer
 * - Route 3 (Outer Highway via Node C): long bypass
 */
function createBaseTestGraph(): AStarRoadGraph {
  const nodes = new Map<string, AStarRoadNode>();
  const adjacency = new Map<string, AStarRoadEdge[]>();
  const edges = new Map<string, AStarRoadEdge>();

  const addNode = (id: string, name: string, lat: number, lng: number) => {
    const node: AStarRoadNode = { id, name, lat, lng };
    nodes.set(id, node);
    adjacency.set(id, []);
  };

  const addEdge = (edge: AStarRoadEdge) => {
    edges.set(edge.edgeId, edge);
    const adj = adjacency.get(edge.fromNode) || [];
    adj.push(edge);
    adjacency.set(edge.fromNode, adj);
  };

  // Node locations
  addNode('S', 'Start Station', 25.4484, 78.5685);
  addNode('A', 'Corridor A (Direct)', 25.4560, 78.5720);
  addNode('B', 'Corridor B (Bypass)', 25.4420, 78.5760);
  addNode('C', 'Corridor C (Outer)', 25.4380, 78.5820);
  addNode('G', 'Goal Destination', 25.4678, 78.5835);

  return { nodes, adjacency, edges };
}

/**
 * TEST 1:
 * Shortest route has HIGH traffic.
 * Longer route has LOW traffic.
 * Verify that the lower total-cost route can be selected.
 */
export function runTest1TrafficTradeoff(): TestCaseResult {
  const graph = createBaseTestGraph();

  // Edge S->A (Short direct corridor: 3.0 km, 6 min, but HIGH traffic)
  const edgeSA: AStarRoadEdge = {
    edgeId: 'E_S_A',
    fromNode: 'S',
    toNode: 'A',
    distance: 3.0,
    estimatedTravelTime: 12.0, // Congested
    trafficLevel: 'HIGH',
    trafficCost: 1.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Direct Arterial (Congested)',
  };

  // Edge A->G
  const edgeAG: AStarRoadEdge = {
    edgeId: 'E_A_G',
    fromNode: 'A',
    toNode: 'G',
    distance: 2.5,
    estimatedTravelTime: 10.0,
    trafficLevel: 'HIGH',
    trafficCost: 1.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Arterial North',
  };

  // Edge S->B (Longer bypass: 4.5 km, but LOW traffic & smooth 60 km/h flow)
  const edgeSB: AStarRoadEdge = {
    edgeId: 'E_S_B',
    fromNode: 'S',
    toNode: 'B',
    distance: 4.5,
    estimatedTravelTime: 5.5,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Ring Bypass South',
  };

  // Edge B->G
  const edgeBG: AStarRoadEdge = {
    edgeId: 'E_B_G',
    fromNode: 'B',
    toNode: 'G',
    distance: 3.5,
    estimatedTravelTime: 4.5,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Ring Bypass East',
  };

  const addEdge = (e: AStarRoadEdge) => {
    graph.edges.set(e.edgeId, e);
    const adj = graph.adjacency.get(e.fromNode) || [];
    adj.push(e);
    graph.adjacency.set(e.fromNode, adj);
  };

  addEdge(edgeSA);
  addEdge(edgeAG);
  addEdge(edgeSB);
  addEdge(edgeBG);

  const result = runAStarPathfinding(graph, {
    startNodeId: 'S',
    goalNodeId: 'G',
    vehicleType: 'CAR',
    weights: ROUTE_WEIGHTS,
  });

  const chosenVia = result.nodeSequence[1]; // S -> A or B -> G
  const passed = chosenVia === 'B';

  return {
    id: 'TEST_1',
    name: 'Traffic Level Tradeoff (HIGH vs LOW)',
    passed,
    summary: passed
      ? 'A* correctly chose longer bypass via Corridor B due to lower traffic cost accumulation.'
      : 'Failed: A* did not prefer the lower traffic route.',
    expected: 'Path via Node B (Bypass Corridor with LOW traffic)',
    actual: `Path via Node ${chosenVia} [${result.path.join(' → ')}] with total cost ${result.totalCost.toFixed(3)}`,
    details: {
      selectedRoute: result.path.join(' → '),
      totalCost: result.totalCost,
      totalDistance: result.totalDistance,
      estimatedTime: result.estimatedTime,
      trafficSummary: result.trafficSummary,
      costBreakdown: result.costBreakdown,
      traceStepsCount: result.trace.length,
    },
  };
}

/**
 * TEST 2:
 * Shortest route contains WARNING hazard.
 * Alternative route is safe.
 * Verify hazard penalty influences the result.
 */
export function runTest2WarningHazard(): TestCaseResult {
  const graph = createBaseTestGraph();

  const addEdge = (e: AStarRoadEdge) => {
    graph.edges.set(e.edgeId, e);
    const adj = graph.adjacency.get(e.fromNode) || [];
    adj.push(e);
    graph.adjacency.set(e.fromNode, adj);
  };

  // Direct corridor S->A->G has WARNING hazard
  addEdge({
    edgeId: 'E_S_A',
    fromNode: 'S',
    toNode: 'A',
    distance: 3.0,
    estimatedTravelTime: 4.5,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'WARNING',
    hazardCost: 0.3, // Warning penalty
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Bridge Underpass (WARNING: 35cm Water)',
  });

  addEdge({
    edgeId: 'E_A_G',
    fromNode: 'A',
    toNode: 'G',
    distance: 3.0,
    estimatedTravelTime: 4.5,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Main Link Road',
  });

  // Alternative corridor S->B->G is SAFE (only slightly longer)
  addEdge({
    edgeId: 'E_S_B',
    fromNode: 'S',
    toNode: 'B',
    distance: 3.4,
    estimatedTravelTime: 5.2,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Station Link Road (SAFE)',
  });

  addEdge({
    edgeId: 'E_B_G',
    fromNode: 'B',
    toNode: 'G',
    distance: 3.4,
    estimatedTravelTime: 5.2,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Outer Link Road (SAFE)',
  });

  const result = runAStarPathfinding(graph, {
    startNodeId: 'S',
    goalNodeId: 'G',
    vehicleType: 'CAR',
    weights: ROUTE_WEIGHTS,
  });

  const chosenVia = result.nodeSequence[1];
  const passed = chosenVia === 'B';

  return {
    id: 'TEST_2',
    name: 'Hazard Penalty Influence (WARNING vs SAFE)',
    passed,
    summary: passed
      ? 'A* correctly diverted away from WARNING hazard road segment to safe Corridor B.'
      : 'Failed: A* did not divert from WARNING hazard.',
    expected: 'Path via Node B (Safe Alternative)',
    actual: `Path via Node ${chosenVia} [${result.path.join(' → ')}]`,
    details: {
      selectedRoute: result.path.join(' → '),
      totalCost: result.totalCost,
      hazardsAvoided: result.hazardsAvoided,
      costBreakdown: result.costBreakdown,
    },
  };
}

/**
 * TEST 3:
 * A route contains CRITICAL hazard.
 * Verify that the safe alternative is preferred.
 */
export function runTest3CriticalHazard(): TestCaseResult {
  const graph = createBaseTestGraph();

  const addEdge = (e: AStarRoadEdge) => {
    graph.edges.set(e.edgeId, e);
    const adj = graph.adjacency.get(e.fromNode) || [];
    adj.push(e);
    graph.adjacency.set(e.fromNode, adj);
  };

  // Route 1 contains CRITICAL hazard on edge S->A
  addEdge({
    edgeId: 'E_S_A',
    fromNode: 'S',
    toNode: 'A',
    distance: 2.0,
    estimatedTravelTime: 3.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'CRITICAL',
    hazardCost: 0.7,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Main River Bridge (CRITICAL Structural Vibration)',
  });
  addEdge({
    edgeId: 'E_A_G',
    fromNode: 'A',
    toNode: 'G',
    distance: 2.0,
    estimatedTravelTime: 3.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Central Road',
  });

  // Route 2 is SAFE
  addEdge({
    edgeId: 'E_S_B',
    fromNode: 'S',
    toNode: 'B',
    distance: 4.0,
    estimatedTravelTime: 6.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Bypass Flyover (SAFE)',
  });
  addEdge({
    edgeId: 'E_B_G',
    fromNode: 'B',
    toNode: 'G',
    distance: 4.0,
    estimatedTravelTime: 6.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'North Highway (SAFE)',
  });

  const result = runAStarPathfinding(graph, {
    startNodeId: 'S',
    goalNodeId: 'G',
    vehicleType: 'CAR',
    weights: ROUTE_WEIGHTS,
  });

  const chosenVia = result.nodeSequence[1];
  const passed = chosenVia === 'B';

  return {
    id: 'TEST_3',
    name: 'Critical Hazard Avoidance (CRITICAL vs SAFE)',
    passed,
    summary: passed
      ? 'A* successfully avoided the CRITICAL bridge hazard and routed through safe bypass.'
      : 'Failed: A* did not prefer safe alternative over CRITICAL hazard.',
    expected: 'Path via Node B (Safe Alternative)',
    actual: `Path via Node ${chosenVia} [${result.path.join(' → ')}]`,
    details: {
      selectedRoute: result.path.join(' → '),
      totalCost: result.totalCost,
      hazardsAvoided: result.hazardsAvoided,
      costBreakdown: result.costBreakdown,
    },
  };
}

/**
 * TEST 4:
 * A route is BLOCKED.
 * Verify A* never uses it.
 */
export function runTest4BlockedRoad(): TestCaseResult {
  const graph = createBaseTestGraph();

  const addEdge = (e: AStarRoadEdge) => {
    graph.edges.set(e.edgeId, e);
    const adj = graph.adjacency.get(e.fromNode) || [];
    adj.push(e);
    graph.adjacency.set(e.fromNode, adj);
  };

  // Route 1 is BLOCKED: roadStatus = "BLOCKED"
  addEdge({
    edgeId: 'E_S_A',
    fromNode: 'S',
    toNode: 'A',
    distance: 1.5,
    estimatedTravelTime: 2.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'BLOCKED',
    hazardCost: 1.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'BLOCKED',
    roadName: 'Collapsed Overpass (BLOCKED)',
  });
  addEdge({
    edgeId: 'E_A_G',
    fromNode: 'A',
    toNode: 'G',
    distance: 1.5,
    estimatedTravelTime: 2.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Sector Road',
  });

  // Route 2 is OPEN
  addEdge({
    edgeId: 'E_S_B',
    fromNode: 'S',
    toNode: 'B',
    distance: 5.0,
    estimatedTravelTime: 7.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Outer Ring Bypass (OPEN)',
  });
  addEdge({
    edgeId: 'E_B_G',
    fromNode: 'B',
    toNode: 'G',
    distance: 5.0,
    estimatedTravelTime: 7.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Ring Highway (OPEN)',
  });

  // Verify calculateEdgeCost directly returns Infinity for blocked edge
  const blockedCostDetails = calculateEdgeCost(graph.edges.get('E_S_A')!, 'CAR', ROUTE_WEIGHTS);
  const costIsInfinity = blockedCostDetails.edgeCost === Infinity;

  const result = runAStarPathfinding(graph, {
    startNodeId: 'S',
    goalNodeId: 'G',
    vehicleType: 'CAR',
    weights: ROUTE_WEIGHTS,
  });

  const pathIncludesBlockedEdge = result.pathEdges.some((e) => e.edgeId === 'E_S_A');
  const passed = costIsInfinity && !pathIncludesBlockedEdge && result.nodeSequence[1] === 'B';

  return {
    id: 'TEST_4',
    name: 'Blocked Road Zero-Tolerance (cost = Infinity)',
    passed,
    summary: passed
      ? 'A* strictly rejected the BLOCKED edge with Infinity cost and navigated through Corridor B.'
      : 'Failed: Blocked edge was expanded by A*.',
    expected: 'Edge cost = Infinity, Path via Node B',
    actual: `Blocked Edge Cost = ${blockedCostDetails.edgeCost}, Path: ${result.path.join(' → ')}`,
    details: {
      blockedEdgeCost: blockedCostDetails.edgeCost,
      blockedRoadsAvoided: result.blockedRoadsAvoided,
      selectedRoute: result.path.join(' → '),
    },
  };
}

/**
 * TEST 5:
 * A bridge is incompatible with VAN.
 * Verify VAN cannot use that bridge, while CAR can.
 */
export function runTest5VehicleRestriction(): TestCaseResult {
  const graph = createBaseTestGraph();

  const addEdge = (e: AStarRoadEdge) => {
    graph.edges.set(e.edgeId, e);
    const adj = graph.adjacency.get(e.fromNode) || [];
    adj.push(e);
    graph.adjacency.set(e.fromNode, adj);
  };

  // Historic bridge on Corridor A: CAR and BIKE allowed, VAN not allowed
  addEdge({
    edgeId: 'E_S_A',
    fromNode: 'S',
    toNode: 'A',
    distance: 2.0,
    estimatedTravelTime: 3.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    allowedVehicles: ['CAR', 'BIKE'], // VAN excluded
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Historic Narrow Arch Bridge',
  });
  addEdge({
    edgeId: 'E_A_G',
    fromNode: 'A',
    toNode: 'G',
    distance: 2.0,
    estimatedTravelTime: 3.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'North Avenue',
  });

  // Heavy vehicle bypass Corridor B: CAR, BIKE, and VAN allowed
  addEdge({
    edgeId: 'E_S_B',
    fromNode: 'S',
    toNode: 'B',
    distance: 4.5,
    estimatedTravelTime: 6.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    allowedVehicles: ['CAR', 'BIKE', 'VAN', 'BUS', 'TRUCK'],
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Commercial Freight Bypass',
  });
  addEdge({
    edgeId: 'E_B_G',
    fromNode: 'B',
    toNode: 'G',
    distance: 4.5,
    estimatedTravelTime: 6.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    allowedVehicles: ['CAR', 'BIKE', 'VAN', 'BUS', 'TRUCK'],
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Commercial Highway',
  });

  // Run 1: VAN
  const resultVan = runAStarPathfinding(graph, {
    startNodeId: 'S',
    goalNodeId: 'G',
    vehicleType: 'VAN',
    weights: ROUTE_WEIGHTS,
  });

  // Run 2: CAR
  const resultCar = runAStarPathfinding(graph, {
    startNodeId: 'S',
    goalNodeId: 'G',
    vehicleType: 'CAR',
    weights: ROUTE_WEIGHTS,
  });

  const vanChoseB = resultVan.nodeSequence[1] === 'B';
  const carChoseA = resultCar.nodeSequence[1] === 'A';
  const passed = vanChoseB && carChoseA;

  return {
    id: 'TEST_5',
    name: 'Vehicle Restriction Enforcement (VAN vs CAR)',
    passed,
    summary: passed
      ? 'VAN was prohibited from the narrow bridge and routed via Bypass B; CAR was permitted on the bridge via A.'
      : 'Failed: Vehicle restriction was not properly enforced.',
    expected: 'VAN routes via B (Bypass); CAR routes via A (Bridge)',
    actual: `VAN: ${resultVan.path.join(' → ')}, CAR: ${resultCar.path.join(' → ')}`,
    details: {
      vanRoute: resultVan.path.join(' → '),
      vanCost: resultVan.totalCost,
      carRoute: resultCar.path.join(' → '),
      carCost: resultCar.totalCost,
    },
  };
}

/**
 * TEST 6:
 * A hazard appears on the currently active route.
 * Verify the road graph updates and A* recalculates from the driver's CURRENT LOCATION to SAME DESTINATION.
 */
export function runTest6DynamicHazardReroute(): TestCaseResult {
  const graph = createBaseTestGraph();

  const addEdge = (e: AStarRoadEdge) => {
    graph.edges.set(e.edgeId, e);
    const adj = graph.adjacency.get(e.fromNode) || [];
    adj.push(e);
    graph.adjacency.set(e.fromNode, adj);
  };

  // Intermediate node where vehicle is currently located
  const nodeDriver: AStarRoadNode = {
    id: 'LOC_DRIVER',
    name: 'Current Vehicle Position (Midpoint)',
    lat: 25.4520,
    lng: 78.5700,
  };
  graph.nodes.set(nodeDriver.id, nodeDriver);
  graph.adjacency.set(nodeDriver.id, []);

  // Road forward from driver: directly ahead is Main Road (E_DRV_A)
  addEdge({
    edgeId: 'E_DRV_A',
    fromNode: 'LOC_DRIVER',
    toNode: 'A',
    distance: 1.5,
    estimatedTravelTime: 2.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Main Forward Corridor',
  });

  addEdge({
    edgeId: 'E_A_G',
    fromNode: 'A',
    toNode: 'G',
    distance: 2.0,
    estimatedTravelTime: 3.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Main Link Road',
  });

  // Divergent branch from current location to Bypass B
  addEdge({
    edgeId: 'E_DRV_B',
    fromNode: 'LOC_DRIVER',
    toNode: 'B',
    distance: 2.0,
    estimatedTravelTime: 2.8,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Lateral Diversion Link',
  });

  addEdge({
    edgeId: 'E_B_G',
    fromNode: 'B',
    toNode: 'G',
    distance: 3.0,
    estimatedTravelTime: 4.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Bypass Road',
  });

  // Step 1: Initial state before hazard -> vehicle plans route forward via A
  const initialResult = runAStarPathfinding(graph, {
    startNodeId: 'LOC_DRIVER',
    goalNodeId: 'G',
    vehicleType: 'CAR',
  });
  const initialChoseA = initialResult.nodeSequence[1] === 'A';

  // Step 2: DYNAMIC HAZARD DETECTED on active segment E_DRV_A!
  // Road graph updates edge attribute:
  const edgeDrvA = graph.edges.get('E_DRV_A')!;
  edgeDrvA.hazardSeverity = 'CRITICAL';
  edgeDrvA.hazardCost = 0.7;
  edgeDrvA.roadStatus = 'BLOCKED'; // Bridge collapsed/blocked

  // Step 3: Re-run A* from CURRENT LOCATION (LOC_DRIVER) to SAME DESTINATION (G)
  const rerouteResult = runAStarPathfinding(graph, {
    startNodeId: 'LOC_DRIVER',
    goalNodeId: 'G',
    vehicleType: 'CAR',
  });

  const rerouteChoseB = rerouteResult.nodeSequence[1] === 'B';
  const passed = initialChoseA && rerouteChoseB;

  return {
    id: 'TEST_6',
    name: 'Dynamic Hazard Graph Update & Live Recalculation',
    passed,
    summary: passed
      ? 'When a hazard blocked the active forward road, graph updated and A* dynamically rerouted from current vehicle position to Corridor B.'
      : 'Failed: Dynamic rerouting did not recalculate from current location.',
    expected: 'Initial: via Node A → Hazard Detected → Reroute from Current Location: via Node B',
    actual: `Initial: ${initialResult.path.join(' → ')} | Post-Hazard: ${rerouteResult.path.join(' → ')}`,
    details: {
      initialPath: initialResult.path.join(' → '),
      reroutePath: rerouteResult.path.join(' → '),
      hazardsAvoided: rerouteResult.hazardsAvoided,
      blockedRoadsAvoided: rerouteResult.blockedRoadsAvoided,
    },
  };
}

/**
 * TEST 7:
 * Traffic condition changes while travelling.
 * Verify route cost can be recalculated using the updated traffic value.
 */
export function runTest7DynamicTrafficUpdate(): TestCaseResult {
  const graph = createBaseTestGraph();

  const addEdge = (e: AStarRoadEdge) => {
    graph.edges.set(e.edgeId, e);
    const adj = graph.adjacency.get(e.fromNode) || [];
    adj.push(e);
    graph.adjacency.set(e.fromNode, adj);
  };

  // Segment S->A starts with LOW traffic
  addEdge({
    edgeId: 'E_S_A',
    fromNode: 'S',
    toNode: 'A',
    distance: 3.0,
    estimatedTravelTime: 4.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Main Expressway',
  });
  addEdge({
    edgeId: 'E_A_G',
    fromNode: 'A',
    toNode: 'G',
    distance: 3.0,
    estimatedTravelTime: 4.0,
    trafficLevel: 'LOW',
    trafficCost: 0.0,
    hazardSeverity: 'SAFE',
    hazardCost: 0.0,
    vehicleAllowed: true,
    restrictionCost: 0,
    roadStatus: 'OPEN',
    roadName: 'Expressway North',
  });

  // Calculate baseline cost
  const beforeResult = runAStarPathfinding(graph, {
    startNodeId: 'S',
    goalNodeId: 'G',
    vehicleType: 'CAR',
  });

  // Step 2: Traffic condition changes on the edge while travelling:
  const edgeSA = graph.edges.get('E_S_A')!;
  edgeSA.trafficLevel = 'HIGH';
  edgeSA.trafficCost = 1.0;
  edgeSA.estimatedTravelTime = 14.0; // Slowdown from 4 min to 14 min

  // Step 3: Recalculate cost
  const afterResult = runAStarPathfinding(graph, {
    startNodeId: 'S',
    goalNodeId: 'G',
    vehicleType: 'CAR',
  });

  const costIncreased = afterResult.totalCost > beforeResult.totalCost;
  const trafficCostCaptured = afterResult.costBreakdown.trafficCost > beforeResult.costBreakdown.trafficCost;
  const passed = costIncreased && trafficCostCaptured;

  return {
    id: 'TEST_7',
    name: 'Dynamic Traffic Change & Route Cost Recalculation',
    passed,
    summary: passed
      ? `Traffic change correctly increased accumulated route cost from ${beforeResult.totalCost.toFixed(3)} to ${afterResult.totalCost.toFixed(3)}.`
      : 'Failed: Route cost did not adjust to updated traffic value.',
    expected: 'Total cost and traffic cost increase when traffic changes to HIGH',
    actual: `Initial Cost: ${beforeResult.totalCost.toFixed(3)} → Updated Cost: ${afterResult.totalCost.toFixed(3)} (Traffic Cost: +${(afterResult.costBreakdown.trafficCost - beforeResult.costBreakdown.trafficCost).toFixed(3)})`,
    details: {
      initialCost: beforeResult.totalCost,
      updatedCost: afterResult.totalCost,
      initialBreakdown: beforeResult.costBreakdown,
      updatedBreakdown: afterResult.costBreakdown,
    },
  };
}

/**
 * Runs all 7 tests and returns a consolidated summary report
 */
export function runAllAStarTests(): FullTestSuiteSummary {
  const results = [
    runTest1TrafficTradeoff(),
    runTest2WarningHazard(),
    runTest3CriticalHazard(),
    runTest4BlockedRoad(),
    runTest5VehicleRestriction(),
    runTest6DynamicHazardReroute(),
    runTest7DynamicTrafficUpdate(),
  ];

  const passedTests = results.filter((r) => r.passed).length;

  return {
    allPassed: passedTests === results.length,
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    timestamp: new Date().toISOString(),
    results,
  };
}
