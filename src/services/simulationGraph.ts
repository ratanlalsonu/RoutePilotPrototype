import {
  StateNode,
  RoadNode,
  RoadEdge,
  SimulationHazard,
  SimulationRoute,
} from '../types/simulationMap';

/**
 * EXACT 28 SELECTABLE INDIAN STATES
 * Pinned precisely to normalized percentage coordinates (0 - 100%) on the RoutePilot simulation map
 */
export const INDIAN_STATES_28: StateNode[] = [
  { name: 'Andhra Pradesh', x: 54.8, y: 73.5, color: '#3b82f6' },
  { name: 'Arunachal Pradesh', x: 88.5, y: 8.5, color: '#3b82f6' },
  { name: 'Assam', x: 80.2, y: 26.5, color: '#f43f5e' },
  { name: 'Bihar', x: 70.1, y: 37.5, color: '#3b82f6' },
  { name: 'Chhattisgarh', x: 47.2, y: 49.5, color: '#06b6d4' },
  { name: 'Goa', x: 12.8, y: 71.5, color: '#a855f7' },
  { name: 'Gujarat', x: 12.2, y: 45.5, color: '#3b82f6' },
  { name: 'Haryana', x: 33.6, y: 23.5, color: '#22c55e' },
  { name: 'Himachal Pradesh', x: 33.8, y: 5.0, color: '#f97316' },
  { name: 'Jharkhand', x: 62.0, y: 47.5, color: '#f97316' },
  { name: 'Karnataka', x: 28.7, y: 73.5, color: '#f97316' },
  { name: 'Kerala', x: 25.8, y: 87.5, color: '#3b82f6' },
  { name: 'Madhya Pradesh', x: 33.8, y: 43.5, color: '#a855f7' },
  { name: 'Maharashtra', x: 17.0, y: 59.0, color: '#22c55e' },
  { name: 'Manipur', x: 93.2, y: 37.5, color: '#a855f7' },
  { name: 'Meghalaya', x: 81.8, y: 40.0, color: '#a855f7' },
  { name: 'Mizoram', x: 93.0, y: 48.5, color: '#eab308' },
  { name: 'Nagaland', x: 92.5, y: 26.5, color: '#22c55e' },
  { name: 'Odisha', x: 59.0, y: 59.0, color: '#a855f7' },
  { name: 'Punjab', x: 25.5, y: 16.5, color: '#3b82f6' },
  { name: 'Rajasthan', x: 14.8, y: 29.5, color: '#ef4444' },
  { name: 'Sikkim', x: 71.8, y: 16.5, color: '#a855f7' },
  { name: 'Tamil Nadu', x: 43.8, y: 87.5, color: '#ef4444' },
  { name: 'Telangana', x: 42.1, y: 67.5, color: '#eab308' },
  { name: 'Tripura', x: 84.1, y: 49.5, color: '#ec4899' },
  { name: 'Uttar Pradesh', x: 55.4, y: 32.5, color: '#eab308' },
  { name: 'Uttarakhand', x: 52.0, y: 14.8, color: '#06b6d4' },
  { name: 'West Bengal', x: 77.2, y: 59.0, color: '#ef4444' },
];

/**
 * Delhi Reference Marker (display only, not selectable as a state)
 */
export const DELHI_REFERENCE: StateNode = {
  name: 'Delhi',
  x: 45.4,
  y: 26.2,
  color: '#ef4444',
  isReferenceOnly: true,
};

export const STATE_NODE_MAP: Record<string, StateNode> = {};
INDIAN_STATES_28.forEach((s) => {
  STATE_NODE_MAP[s.name] = s;
});
STATE_NODE_MAP[DELHI_REFERENCE.name] = DELHI_REFERENCE;

/**
 * -------------------------------------------------------------
 * 1. ROAD NETWORK AS GRAPH: NODES (States + Highway Junctions)
 * -------------------------------------------------------------
 * Normalized coordinates (0-100%) aligned directly over the map graphic.
 */
export const ROAD_NODES: Record<string, RoadNode> = {
  // 28 State Nodes
  'AP': { id: 'AP', name: 'Andhra Pradesh', stateName: 'Andhra Pradesh', x: 54.8, y: 73.5, isState: true },
  'AR': { id: 'AR', name: 'Arunachal Pradesh', stateName: 'Arunachal Pradesh', x: 88.5, y: 8.5, isState: true },
  'AS': { id: 'AS', name: 'Assam', stateName: 'Assam', x: 80.2, y: 26.5, isState: true },
  'BR': { id: 'BR', name: 'Bihar', stateName: 'Bihar', x: 70.1, y: 37.5, isState: true },
  'CG': { id: 'CG', name: 'Chhattisgarh', stateName: 'Chhattisgarh', x: 47.2, y: 49.5, isState: true },
  'GA': { id: 'GA', name: 'Goa', stateName: 'Goa', x: 12.8, y: 71.5, isState: true },
  'GJ': { id: 'GJ', name: 'Gujarat', stateName: 'Gujarat', x: 12.2, y: 45.5, isState: true },
  'HR': { id: 'HR', name: 'Haryana', stateName: 'Haryana', x: 33.6, y: 23.5, isState: true },
  'HP': { id: 'HP', name: 'Himachal Pradesh', stateName: 'Himachal Pradesh', x: 33.8, y: 5.0, isState: true },
  'JH': { id: 'JH', name: 'Jharkhand', stateName: 'Jharkhand', x: 62.0, y: 47.5, isState: true },
  'KA': { id: 'KA', name: 'Karnataka', stateName: 'Karnataka', x: 28.7, y: 73.5, isState: true },
  'KL': { id: 'KL', name: 'Kerala', stateName: 'Kerala', x: 25.8, y: 87.5, isState: true },
  'MP': { id: 'MP', name: 'Madhya Pradesh', stateName: 'Madhya Pradesh', x: 33.8, y: 43.5, isState: true },
  'MH': { id: 'MH', name: 'Maharashtra', stateName: 'Maharashtra', x: 17.0, y: 59.0, isState: true },
  'MN': { id: 'MN', name: 'Manipur', stateName: 'Manipur', x: 93.2, y: 37.5, isState: true },
  'ML': { id: 'ML', name: 'Meghalaya', stateName: 'Meghalaya', x: 81.8, y: 40.0, isState: true },
  'MZ': { id: 'MZ', name: 'Mizoram', stateName: 'Mizoram', x: 93.0, y: 48.5, isState: true },
  'NL': { id: 'NL', name: 'Nagaland', stateName: 'Nagaland', x: 92.5, y: 26.5, isState: true },
  'OD': { id: 'OD', name: 'Odisha', stateName: 'Odisha', x: 59.0, y: 59.0, isState: true },
  'PB': { id: 'PB', name: 'Punjab', stateName: 'Punjab', x: 25.5, y: 16.5, isState: true },
  'RJ': { id: 'RJ', name: 'Rajasthan', stateName: 'Rajasthan', x: 14.8, y: 29.5, isState: true },
  'SK': { id: 'SK', name: 'Sikkim', stateName: 'Sikkim', x: 71.8, y: 16.5, isState: true },
  'TN': { id: 'TN', name: 'Tamil Nadu', stateName: 'Tamil Nadu', x: 43.8, y: 87.5, isState: true },
  'TG': { id: 'TG', name: 'Telangana', stateName: 'Telangana', x: 42.1, y: 67.5, isState: true },
  'TR': { id: 'TR', name: 'Tripura', stateName: 'Tripura', x: 84.1, y: 49.5, isState: true },
  'UP': { id: 'UP', name: 'Uttar Pradesh', stateName: 'Uttar Pradesh', x: 55.4, y: 32.5, isState: true },
  'UK': { id: 'UK', name: 'Uttarakhand', stateName: 'Uttarakhand', x: 52.0, y: 14.8, isState: true },
  'WB': { id: 'WB', name: 'West Bengal', stateName: 'West Bengal', x: 77.2, y: 59.0, isState: true },

  // Key Intersections & Highway Junctions connecting adjacent corridors
  'J1': { id: 'J1', name: 'Nagpur Central Interchange', x: 28.5, y: 53.0 },
  'J2': { id: 'J2', name: 'Raipur-Bhilai Junction', x: 52.0, y: 54.0 },
  'J3': { id: 'J3', name: 'Sambalpur East Interchange', x: 67.0, y: 58.5 },
  'J4': { id: 'J4', name: 'Hyderabad North Bypass', x: 36.5, y: 63.5 },
  'J5': { id: 'J5', name: 'Vijayawada Highway Hub', x: 49.0, y: 70.0 },
  'J6': { id: 'J6', name: 'Visakhapatnam Coastal Fork', x: 57.5, y: 66.0 },
  'J7': { id: 'J7', name: 'Jabalpur-Bhopal Interchange', x: 38.0, y: 46.5 },
  'J8': { id: 'J8', name: 'Ranchi-Dhanbad Fork', x: 68.0, y: 48.0 },
  'J9': { id: 'J9', name: 'Ahmedabad-Vadodara Interchange', x: 18.0, y: 48.5 },
  'J10': { id: 'J10', name: 'Jaipur Expressway Fork', x: 26.0, y: 28.0 },
  'J11': { id: 'J11', name: 'Delhi-NCR Peripheral Hub', x: 42.0, y: 24.5 },
  'J12': { id: 'J12', name: 'Lucknow-Kanpur Expressway Hub', x: 61.5, y: 35.0 },
  'J13': { id: 'J13', name: 'Patna-Ganga Bridge Junction', x: 74.0, y: 43.0 },
  'J14': { id: 'J14', name: 'Siliguri North-East Corridor Hub', x: 76.0, y: 22.0 },
  'J15': { id: 'J15', name: 'Guwahati Brahmaputra Fork', x: 84.5, y: 28.5 },
  'J16': { id: 'J16', name: 'Bangalore-Deccan Hub', x: 34.0, y: 79.5 },
  'J17': { id: 'J17', name: 'Madurai-Salem Interchange', x: 38.5, y: 88.0 },
  'J18': { id: 'J18', name: 'Ambala-Chandigarh Junction', x: 30.0, y: 15.0 },
};

// Map each state name directly to its road node ID
export const STATE_NAME_TO_NODE_ID: Record<string, string> = {
  'Andhra Pradesh': 'AP',
  'Arunachal Pradesh': 'AR',
  'Assam': 'AS',
  'Bihar': 'BR',
  'Chhattisgarh': 'CG',
  'Goa': 'GA',
  'Gujarat': 'GJ',
  'Haryana': 'HR',
  'Himachal Pradesh': 'HP',
  'Jharkhand': 'JH',
  'Karnataka': 'KA',
  'Kerala': 'KL',
  'Madhya Pradesh': 'MP',
  'Maharashtra': 'MH',
  'Manipur': 'MN',
  'Meghalaya': 'ML',
  'Mizoram': 'MZ',
  'Nagaland': 'NL',
  'Odisha': 'OD',
  'Punjab': 'PB',
  'Rajasthan': 'RJ',
  'Sikkim': 'SK',
  'Tamil Nadu': 'TN',
  'Telangana': 'TG',
  'Tripura': 'TR',
  'Uttar Pradesh': 'UP',
  'Uttarakhand': 'UK',
  'West Bengal': 'WB',
};

/**
 * Generates natural road polyline points with slight realistic curvature
 * so lines sit exactly along highways instead of sharp angled cuts.
 */
function createHighwayCurve(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  bendFactor = 0.04,
  steps = 5
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Midpoint with slight perpendicular bend
  const midX = (p1.x + p2.x) / 2 - dy * bendFactor;
  const midY = (p1.y + p2.y) / 2 + dx * bendFactor;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * p1.x + 2 * mt * t * midX + t * t * p2.x;
    const y = mt * mt * p1.y + 2 * mt * t * midY + t * t * p2.y;
    pts.push({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) });
  }
  return pts;
}

/**
 * -------------------------------------------------------------
 * 2. ROAD NETWORK AS GRAPH: EDGES (Visible Highway Segments)
 * -------------------------------------------------------------
 * Each road segment contains:
 * - id, from, to
 * - distance
 * - points: actual polyline sequence following visible road in background
 * - blocked, hazard status
 */
function buildEdge(
  id: string,
  fromId: string,
  toId: string,
  distance: number,
  bend = 0.04,
  steps = 5
): RoadEdge {
  const nodeA = ROAD_NODES[fromId];
  const nodeB = ROAD_NODES[toId];
  if (!nodeA || !nodeB) {
    throw new Error(`Invalid edge nodes: ${fromId} -> ${toId}`);
  }
  return {
    id,
    from: fromId,
    to: toId,
    distance,
    points: createHighwayCurve(nodeA, nodeB, bend, steps),
    blocked: false,
    hazard: false,
    roadType: 'national_highway',
    speedPenalty: 1.0,
  };
}

export const ROAD_EDGES: RoadEdge[] = [
  // Maharashtra Central & East Corridors
  buildEdge('MH-J1', 'MH', 'J1', 280, 0.03),
  buildEdge('J1-CG', 'J1', 'CG', 270, -0.02),
  buildEdge('CG-J2', 'CG', 'J2', 120, 0.02),
  buildEdge('J2-J3', 'J2', 'J3', 240, -0.04), // PRIMARY HAZARD CANDIDATE (Chhattisgarh -> Odisha corridor)
  buildEdge('J3-OD', 'J3', 'OD', 160, 0.03),
  buildEdge('OD-WB', 'OD', 'WB', 340, 0.05),

  // Southern Alternate Corridors (Maharashtra -> Telangana -> Andhra Pradesh -> Odisha -> West Bengal)
  buildEdge('MH-J4', 'MH', 'J4', 310, 0.04),
  buildEdge('J4-TG', 'J4', 'TG', 170, -0.03),
  buildEdge('TG-J5', 'TG', 'J5', 210, 0.04),
  buildEdge('J5-AP', 'J5', 'AP', 110, -0.02),
  buildEdge('AP-J6', 'AP', 'J6', 190, 0.03),
  buildEdge('J6-OD', 'J6', 'OD', 290, -0.03),
  buildEdge('TG-J2', 'TG', 'J2', 320, 0.02), // Cross connector TG -> J2

  // South India Corridors
  buildEdge('MH-GA', 'MH', 'GA', 290, 0.06),
  buildEdge('MH-KA', 'MH', 'KA', 340, -0.03),
  buildEdge('GA-KA', 'GA', 'KA', 190, 0.02),
  buildEdge('KA-J16', 'KA', 'J16', 180, 0.02),
  buildEdge('J16-KL', 'J16', 'KL', 260, 0.04),
  buildEdge('KL-J17', 'KL', 'J17', 210, -0.03),
  buildEdge('J17-TN', 'J17', 'TN', 180, 0.02),
  buildEdge('TN-AP', 'TN', 'AP', 360, 0.05),
  buildEdge('KA-TG', 'KA', 'TG', 390, 0.03),

  // Western & Central Corridors
  buildEdge('MH-J9', 'MH', 'J9', 280, 0.04),
  buildEdge('J9-GJ', 'J9', 'GJ', 150, -0.02),
  buildEdge('GJ-RJ', 'GJ', 'RJ', 360, 0.05),
  buildEdge('GJ-MP', 'GJ', 'MP', 320, -0.03),
  buildEdge('RJ-J10', 'RJ', 'J10', 210, 0.03),
  buildEdge('J10-MP', 'J10', 'MP', 310, 0.04),
  buildEdge('J10-HR', 'J10', 'HR', 220, -0.02),
  buildEdge('HR-PB', 'HR', 'PB', 190, 0.02),
  buildEdge('PB-J18', 'PB', 'J18', 110, 0.02),
  buildEdge('J18-HP', 'J18', 'HP', 160, 0.04),
  buildEdge('HP-UK', 'HP', 'UK', 220, -0.03),
  buildEdge('UK-UP', 'UK', 'UP', 260, 0.02),
  buildEdge('HR-J11', 'HR', 'J11', 110, 0.02),
  buildEdge('J11-UP', 'J11', 'UP', 210, -0.02),
  buildEdge('MP-J7', 'MP', 'J7', 150, 0.02),
  buildEdge('J7-UP', 'J7', 'UP', 340, 0.03),
  buildEdge('J7-CG', 'J7', 'CG', 260, -0.02),
  buildEdge('J1-J7', 'J1', 'J7', 220, 0.01),

  // Northern & Eastern Corridors
  buildEdge('UP-J12', 'UP', 'J12', 140, 0.02),
  buildEdge('J12-BR', 'J12', 'BR', 290, 0.03),
  buildEdge('BR-J13', 'BR', 'J13', 120, -0.02),
  buildEdge('J13-JH', 'J13', 'JH', 190, 0.04),
  buildEdge('JH-J8', 'JH', 'J8', 110, 0.01),
  buildEdge('J8-WB', 'J8', 'WB', 240, 0.03),
  buildEdge('J8-OD', 'J8', 'OD', 260, -0.03),
  buildEdge('CG-JH', 'CG', 'JH', 310, 0.04),
  buildEdge('BR-WB', 'BR', 'WB', 320, 0.05),
  buildEdge('BR-SK', 'BR', 'SK', 280, -0.03),
  buildEdge('SK-J14', 'SK', 'J14', 120, 0.02),
  buildEdge('J14-WB', 'J14', 'WB', 280, 0.03),

  // North-Eastern Corridors
  buildEdge('J14-AS', 'J14', 'AS', 220, 0.04),
  buildEdge('AS-J15', 'AS', 'J15', 90, 0.01),
  buildEdge('J15-ML', 'J15', 'ML', 110, 0.03),
  buildEdge('ML-WB', 'ML', 'WB', 380, 0.05),
  buildEdge('AS-AR', 'AS', 'AR', 270, -0.03),
  buildEdge('AS-NL', 'AS', 'NL', 190, 0.02),
  buildEdge('NL-MN', 'NL', 'MN', 180, 0.03),
  buildEdge('MN-MZ', 'MN', 'MZ', 210, -0.02),
  buildEdge('MZ-TR', 'MZ', 'TR', 190, 0.03),
  buildEdge('TR-AS', 'TR', 'AS', 260, 0.04),
];

/**
 * Pre-indexed Adjacency List for fast bidirectional traversal
 */
export interface OutgoingBranch {
  toNodeId: string;
  edge: RoadEdge;
}

export const GRAPH_ADJACENCY: Record<string, OutgoingBranch[]> = {};

// Initialize graph
Object.keys(ROAD_NODES).forEach((nodeId) => {
  GRAPH_ADJACENCY[nodeId] = [];
});

ROAD_EDGES.forEach((edge) => {
  if (GRAPH_ADJACENCY[edge.from]) {
    GRAPH_ADJACENCY[edge.from].push({ toNodeId: edge.to, edge });
  }
  if (GRAPH_ADJACENCY[edge.to]) {
    GRAPH_ADJACENCY[edge.to].push({ toNodeId: edge.from, edge });
  }
});

/**
 * -------------------------------------------------------------
 * 4. ROAD COST CALCULATION
 * -------------------------------------------------------------
 * normal road: cost = distance
 * hazardous road: cost = distance + very large penalty (5000)
 * blocked road: cost = Infinity (edge cannot be traversed)
 */
export function calculateEdgeCost(
  edge: RoadEdge,
  activeHazards: SimulationHazard[] = []
): number {
  if (edge.blocked) return Infinity;

  // Check if hazard applies to this edge
  const fromNode = ROAD_NODES[edge.from]?.stateName || edge.from;
  const toNode = ROAD_NODES[edge.to]?.stateName || edge.to;

  for (const h of activeHazards) {
    if (!h.active) continue;
    if (
      (h.from === fromNode && h.to === toNode) ||
      (h.from === toNode && h.to === fromNode) ||
      (h.edgeId && h.edgeId === edge.id) ||
      // Also match if hazard is on the state-corridor segment (e.g. Chhattisgarh -> Odisha)
      (edge.id === 'J2-J3' &&
        ((h.from === 'Chhattisgarh' && h.to === 'Odisha') ||
          (h.from === 'Odisha' && h.to === 'Chhattisgarh')))
    ) {
      if (edge.blocked) return Infinity;
      return edge.distance + 8000; // very large penalty
    }
  }

  return edge.distance * (edge.speedPenalty || 1.0);
}

/**
 * -------------------------------------------------------------
 * 3. A* SEARCH ALGORITHM: f(n) = g(n) + h(n)
 * -------------------------------------------------------------
 * g(n) = accumulated route cost from source
 * h(n) = Euclidean distance heuristic to destination
 * Evaluates all valid outgoing branches at each junction globally.
 */
export function aStarSearch(
  startNodeId: string,
  targetNodeId: string,
  activeHazards: SimulationHazard[] = [],
  blockedEdgeIds: Set<string> = new Set()
): {
  nodeIds: string[];
  edges: RoadEdge[];
  allPoints: Array<{ x: number; y: number }>;
  totalDistanceKm: number;
} | null {
  const startNode = ROAD_NODES[startNodeId];
  const targetNode = ROAD_NODES[targetNodeId];
  if (!startNode || !targetNode) return null;

  if (startNodeId === targetNodeId) {
    return {
      nodeIds: [startNodeId],
      edges: [],
      allPoints: [{ x: startNode.x, y: startNode.y }],
      totalDistanceKm: 0,
    };
  }

  // Heuristic: Euclidean distance scaled to approximate km (approx 25 km per percentage unit)
  const heuristic = (nodeId: string): number => {
    const n = ROAD_NODES[nodeId];
    if (!n) return 0;
    const dx = n.x - targetNode.x;
    const dy = n.y - targetNode.y;
    return Math.hypot(dx, dy) * 24;
  };

  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  const cameFrom: Record<string, { prevNodeId: string; edge: RoadEdge } | null> = {};
  const openSet = new Set<string>([startNodeId]);
  const closedSet = new Set<string>();

  Object.keys(ROAD_NODES).forEach((id) => {
    gScore[id] = Infinity;
    fScore[id] = Infinity;
    cameFrom[id] = null;
  });

  gScore[startNodeId] = 0;
  fScore[startNodeId] = heuristic(startNodeId);

  while (openSet.size > 0) {
    // Pick node with lowest fScore
    let currentId: string | null = null;
    let lowestF = Infinity;

    for (const id of openSet) {
      if (fScore[id] < lowestF) {
        lowestF = fScore[id];
        currentId = id;
      }
    }

    if (!currentId || fScore[currentId] === Infinity) break;
    if (currentId === targetNodeId) {
      // Reconstruct path
      const nodeIds: string[] = [];
      const edges: RoadEdge[] = [];
      let curr = targetNodeId;
      nodeIds.unshift(curr);

      while (curr !== startNodeId) {
        const step = cameFrom[curr];
        if (!step) break;
        edges.unshift(step.edge);
        curr = step.prevNodeId;
        nodeIds.unshift(curr);
      }

      // Concatenate actual polyline points from edges
      const allPoints: Array<{ x: number; y: number }> = [];
      edges.forEach((edge, idx) => {
        const fromId = nodeIds[idx];
        const isForward = edge.from === fromId;
        const pts = isForward ? edge.points : [...edge.points].reverse();

        pts.forEach((pt, pIdx) => {
          // Avoid duplicate consecutive point
          if (allPoints.length > 0 && pIdx === 0) return;
          allPoints.push(pt);
        });
      });

      const totalDist = edges.reduce((sum, e) => sum + e.distance, 0);

      return {
        nodeIds,
        edges,
        allPoints,
        totalDistanceKm: totalDist,
      };
    }

    openSet.delete(currentId);
    closedSet.add(currentId);

    // Evaluate all outgoing branches from current junction
    const branches = GRAPH_ADJACENCY[currentId] || [];
    for (const branch of branches) {
      const neighborId = branch.toNodeId;
      if (closedSet.has(neighborId)) continue;

      const edge = branch.edge;

      // 1. Ignore blocked edges
      if (edge.blocked || blockedEdgeIds.has(edge.id)) continue;

      // 2. Calculate edge cost
      const edgeCost = calculateEdgeCost(edge, activeHazards);
      if (edgeCost === Infinity) continue;

      // 3. Tentative gScore
      const tentativeG = gScore[currentId] + edgeCost;
      if (tentativeG < gScore[neighborId]) {
        cameFrom[neighborId] = { prevNodeId: currentId, edge };
        gScore[neighborId] = tentativeG;
        fScore[neighborId] = tentativeG + heuristic(neighborId);
        openSet.add(neighborId);
      }
    }
  }

  return null;
}

/**
 * -------------------------------------------------------------
 * 12. STATE SELECTION & FULL ROUTE CALCULATION
 * -------------------------------------------------------------
 * Converts source & destination state names to road network nodes,
 * runs internal A* search on the road network, detects hazards,
 * and calculates optimal alternate route if any segment is blocked.
 */
export function calculateSimulationRoute(
  sourceStateName: string,
  destinationStateName: string,
  activeHazards: SimulationHazard[] = []
): SimulationRoute | null {
  const sourceNodeId = STATE_NAME_TO_NODE_ID[sourceStateName];
  const destNodeId = STATE_NAME_TO_NODE_ID[destinationStateName];

  if (!sourceNodeId || !destNodeId) return null;

  // 1. Calculate baseline route with A* (ignoring current hazard blocks)
  const baseline = aStarSearch(sourceNodeId, destNodeId, []);
  if (!baseline || baseline.nodeIds.length < 2) return null;

  // 2. Identify state path names
  const statePath: string[] = baseline.nodeIds
    .map((id) => ROAD_NODES[id]?.stateName || ROAD_NODES[id]?.name)
    .filter((name, idx, arr) => name && arr.indexOf(name) === idx);

  // 3. Check if active hazards intersect any edge on baseline route
  let blockedEdge: RoadEdge | undefined = undefined;
  let blockedSegment: SimulationRoute['blockedSegment'] = undefined;
  const blockedEdgeIds = new Set<string>();

  for (const edge of baseline.edges) {
    const fromName = ROAD_NODES[edge.from]?.stateName || edge.from;
    const toName = ROAD_NODES[edge.to]?.stateName || edge.to;

    for (const h of activeHazards) {
      if (!h.active) continue;
      const isAffected =
        (h.from === fromName && h.to === toName) ||
        (h.from === toNode && h.to === fromName) ||
        (h.edgeId && h.edgeId === edge.id) ||
        // Prompt specific segment: Chhattisgarh <-> Odisha corridor (J2-J3)
        (edge.id === 'J2-J3' &&
          ((h.from === 'Chhattisgarh' && h.to === 'Odisha') ||
            (h.from === 'Odisha' && h.to === 'Chhattisgarh')));

      if (isAffected && !blockedEdge) {
        blockedEdge = edge;
        blockedEdgeIds.add(edge.id);
        blockedSegment = {
          from: fromName,
          to: toName,
          edgeId: edge.id,
          hazardType: h.type || 'bridge',
        };
        break;
      }
    }
    if (blockedEdge) break;
  }

  // 4. If a segment is blocked, calculate alternate optimal route with A*
  let alternatePath: string[] | undefined = undefined;
  let alternateNodeIds: string[] | undefined = undefined;
  let alternateEdges: RoadEdge[] | undefined = undefined;
  let alternatePoints: Array<{ x: number; y: number }> | undefined = undefined;
  let alternateDistanceKm: number | undefined = undefined;

  if (blockedEdge) {
    const altResult = aStarSearch(sourceNodeId, destNodeId, activeHazards, blockedEdgeIds);
    if (altResult) {
      alternateNodeIds = altResult.nodeIds;
      alternateEdges = altResult.edges;
      alternatePoints = altResult.allPoints;
      alternateDistanceKm = altResult.totalDistanceKm;
      alternatePath = altResult.nodeIds
        .map((id) => ROAD_NODES[id]?.stateName || ROAD_NODES[id]?.name)
        .filter((name, idx, arr) => name && arr.indexOf(name) === idx);
    }
  }

  const segments = baseline.edges.map((e) => ({
    from: ROAD_NODES[e.from]?.stateName || e.from,
    to: ROAD_NODES[e.to]?.stateName || e.to,
    distance: e.distance,
    isBlocked: blockedEdge ? e.id === blockedEdge.id : false,
  }));

  const totalDist = baseline.totalDistanceKm;
  const estMins = Math.round((totalDist / 70) * 60);

  return {
    source: sourceStateName,
    destination: destinationStateName,
    sourceNodeId,
    destinationNodeId: destNodeId,
    path: statePath,
    nodeIds: baseline.nodeIds,
    edges: baseline.edges,
    allPoints: baseline.allPoints,
    totalDistanceKm: totalDist,
    estimatedMinutes: estMins,
    segments,
    isSafe: !blockedEdge,
    blockedSegment,
    blockedEdge,
    blockedPoints: blockedEdge ? blockedEdge.points : undefined,
    alternatePath,
    alternateNodeIds,
    alternateEdges,
    alternatePoints,
    alternateDistanceKm,
  };
}

/**
 * Backward compatibility helper
 */
export function findShortestPath(
  source: string,
  destination: string,
  activeHazards: SimulationHazard[] = [],
  avoidHazards = true
): { path: string[]; totalDistance: number } | null {
  const srcId = STATE_NAME_TO_NODE_ID[source] || source;
  const dstId = STATE_NAME_TO_NODE_ID[destination] || destination;
  const blockedIds = new Set<string>();

  if (avoidHazards && activeHazards.length > 0) {
    // If avoiding hazards, block any matching edges
    for (const h of activeHazards) {
      if (!h.active) continue;
      ROAD_EDGES.forEach((e) => {
        const fromName = ROAD_NODES[e.from]?.stateName || e.from;
        const toName = ROAD_NODES[e.to]?.stateName || e.to;
        if (
          (h.from === fromName && h.to === toName) ||
          (h.from === toName && h.to === fromName) ||
          (e.id === 'J2-J3' && h.from === 'Chhattisgarh' && h.to === 'Odisha')
        ) {
          blockedIds.add(e.id);
        }
      });
    }
  }

  const res = aStarSearch(srcId, dstId, activeHazards, blockedIds);
  if (!res) return null;

  const path = res.nodeIds
    .map((id) => ROAD_NODES[id]?.stateName || ROAD_NODES[id]?.name)
    .filter((n, idx, arr) => n && arr.indexOf(n) === idx);

  return {
    path,
    totalDistance: res.totalDistanceKm,
  };
}
