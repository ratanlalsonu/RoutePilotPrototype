import { StateNode, RouteSegment, SimulationHazard, SimulationRoute } from '../types/simulationMap';

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
 * Delhi is displayed as a reference/location marker on the map,
 * but it is NOT included in the 28-state selection list.
 */
export const DELHI_REFERENCE: StateNode = {
  name: 'Delhi',
  x: 45.4,
  y: 26.2,
  color: '#ef4444',
  isReferenceOnly: true,
};

/**
 * All Nodes mapped by state name for fast coordinate retrieval
 */
export const STATE_NODE_MAP: Record<string, StateNode> = {};
INDIAN_STATES_28.forEach((s) => {
  STATE_NODE_MAP[s.name] = s;
});
STATE_NODE_MAP[DELHI_REFERENCE.name] = DELHI_REFERENCE;

/**
 * Predefined Route Network Graph between Indian States
 * High-speed national highway corridors connecting adjacent nodes
 */
export const SIMULATION_EDGES: RouteSegment[] = [
  // Primary Central-Eastern Corridor (Maharashtra -> Chhattisgarh -> Odisha -> West Bengal)
  { from: 'Maharashtra', to: 'Chhattisgarh', distance: 550 },
  { from: 'Chhattisgarh', to: 'Odisha', distance: 450 },
  { from: 'Odisha', to: 'West Bengal', distance: 420 },

  // Southern Alternate Corridor (Maharashtra -> Telangana -> Andhra Pradesh -> Odisha -> West Bengal)
  { from: 'Maharashtra', to: 'Telangana', distance: 580 },
  { from: 'Telangana', to: 'Andhra Pradesh', distance: 320 },
  { from: 'Andhra Pradesh', to: 'Odisha', distance: 620 },
  { from: 'Telangana', to: 'Chhattisgarh', distance: 440 },

  // South India
  { from: 'Maharashtra', to: 'Karnataka', distance: 480 },
  { from: 'Maharashtra', to: 'Goa', distance: 390 },
  { from: 'Goa', to: 'Karnataka', distance: 250 },
  { from: 'Karnataka', to: 'Kerala', distance: 370 },
  { from: 'Kerala', to: 'Tamil Nadu', distance: 320 },
  { from: 'Karnataka', to: 'Tamil Nadu', distance: 350 },
  { from: 'Karnataka', to: 'Telangana', distance: 530 },
  { from: 'Karnataka', to: 'Andhra Pradesh', distance: 490 },
  { from: 'Tamil Nadu', to: 'Andhra Pradesh', distance: 430 },

  // Central & Northern Corridors
  { from: 'Maharashtra', to: 'Madhya Pradesh', distance: 590 },
  { from: 'Maharashtra', to: 'Gujarat', distance: 490 },
  { from: 'Gujarat', to: 'Rajasthan', distance: 530 },
  { from: 'Gujarat', to: 'Madhya Pradesh', distance: 460 },
  { from: 'Rajasthan', to: 'Madhya Pradesh', distance: 510 },
  { from: 'Rajasthan', to: 'Haryana', distance: 380 },
  { from: 'Haryana', to: 'Punjab', distance: 240 },
  { from: 'Punjab', to: 'Himachal Pradesh', distance: 220 },
  { from: 'Himachal Pradesh', to: 'Uttarakhand', distance: 260 },
  { from: 'Uttarakhand', to: 'Uttar Pradesh', distance: 360 },
  { from: 'Haryana', to: 'Uttar Pradesh', distance: 210 },
  { from: 'Madhya Pradesh', to: 'Uttar Pradesh', distance: 480 },
  { from: 'Madhya Pradesh', to: 'Chhattisgarh', distance: 520 },

  // Eastern Corridors
  { from: 'Uttar Pradesh', to: 'Bihar', distance: 460 },
  { from: 'Bihar', to: 'Jharkhand', distance: 280 },
  { from: 'Jharkhand', to: 'West Bengal', distance: 330 },
  { from: 'Jharkhand', to: 'Odisha', distance: 360 },
  { from: 'Chhattisgarh', to: 'Jharkhand', distance: 420 },
  { from: 'Bihar', to: 'West Bengal', distance: 410 },
  { from: 'Bihar', to: 'Sikkim', distance: 340 },
  { from: 'Sikkim', to: 'West Bengal', distance: 110 },

  // North-Eastern Corridors
  { from: 'West Bengal', to: 'Assam', distance: 520 },
  { from: 'Sikkim', to: 'Assam', distance: 490 },
  { from: 'Assam', to: 'Meghalaya', distance: 100 },
  { from: 'Meghalaya', to: 'West Bengal', distance: 460 },
  { from: 'Assam', to: 'Arunachal Pradesh', distance: 310 },
  { from: 'Assam', to: 'Nagaland', distance: 230 },
  { from: 'Nagaland', to: 'Manipur', distance: 210 },
  { from: 'Manipur', to: 'Mizoram', distance: 240 },
  { from: 'Mizoram', to: 'Tripura', distance: 220 },
  { from: 'Tripura', to: 'Meghalaya', distance: 280 },
  { from: 'Assam', to: 'Tripura', distance: 330 },
];

/**
 * Graph Adjacency List for bidirectional routing
 */
interface Neighbor {
  state: string;
  distance: number;
}

const ADJACENCY_LIST: Record<string, Neighbor[]> = {};

// Initialize graph
INDIAN_STATES_28.forEach((s) => {
  ADJACENCY_LIST[s.name] = [];
});

SIMULATION_EDGES.forEach((edge) => {
  if (ADJACENCY_LIST[edge.from] && ADJACENCY_LIST[edge.to]) {
    ADJACENCY_LIST[edge.from].push({ state: edge.to, distance: edge.distance });
    ADJACENCY_LIST[edge.to].push({ state: edge.from, distance: edge.distance });
  }
});

/**
 * Checks if a route segment between stateA and stateB is blocked by an active hazard
 */
export function isSegmentHazardous(
  stateA: string,
  stateB: string,
  activeHazards: SimulationHazard[]
): SimulationHazard | null {
  for (const h of activeHazards) {
    if (!h.active) continue;
    if (
      (h.from === stateA && h.to === stateB) ||
      (h.from === stateB && h.to === stateA)
    ) {
      return h;
    }
  }
  return null;
}

/**
 * Shortest Path Solver (Dijkstra algorithm)
 * Internal computation invisible to the user (displayed only as "Best Route")
 */
export function findShortestPath(
  source: string,
  destination: string,
  activeHazards: SimulationHazard[] = [],
  avoidHazards: boolean = true
): { path: string[]; totalDistance: number } | null {
  if (!STATE_NODE_MAP[source] || !STATE_NODE_MAP[destination]) return null;
  if (source === destination) return { path: [source], totalDistance: 0 };

  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  INDIAN_STATES_28.forEach((s) => {
    distances[s.name] = Infinity;
    previous[s.name] = null;
    unvisited.add(s.name);
  });

  distances[source] = 0;

  while (unvisited.size > 0) {
    // Pick unvisited node with lowest distance
    let current: string | null = null;
    let lowestDist = Infinity;

    for (const node of unvisited) {
      if (distances[node] < lowestDist) {
        lowestDist = distances[node];
        current = node;
      }
    }

    if (!current || distances[current] === Infinity) break;
    if (current === destination) break;

    unvisited.delete(current);

    const neighbors = ADJACENCY_LIST[current] || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.state)) continue;

      // Check if blocked by hazard
      if (avoidHazards) {
        const hazard = isSegmentHazardous(current, neighbor.state, activeHazards);
        if (hazard) {
          continue; // Segment is blocked, bypass
        }
      }

      const alt = distances[current] + neighbor.distance;
      if (alt < distances[neighbor.state]) {
        distances[neighbor.state] = alt;
        previous[neighbor.state] = current;
      }
    }
  }

  // Reconstruct path
  if (!previous[destination] && source !== destination) {
    return null;
  }

  const path: string[] = [];
  let curr: string | null = destination;
  while (curr) {
    path.unshift(curr);
    curr = previous[curr];
  }

  return {
    path,
    totalDistance: distances[destination],
  };
}

/**
 * Calculates complete simulation route with hazard evaluation and automatic alternate route calculation
 */
export function calculateSimulationRoute(
  source: string,
  destination: string,
  activeHazards: SimulationHazard[] = []
): SimulationRoute | null {
  // 1. Calculate original best route (ignoring hazards or evaluating baseline)
  const baseline = findShortestPath(source, destination, [], false);
  if (!baseline || baseline.path.length < 2) return null;

  // 2. Check if any segment in baseline has a hazard
  let blockedSeg: { from: string; to: string; hazardType: string } | undefined = undefined;
  const segments: SimulationRoute['segments'] = [];

  for (let i = 0; i < baseline.path.length - 1; i++) {
    const from = baseline.path[i];
    const to = baseline.path[i + 1];
    const edge = SIMULATION_EDGES.find(
      (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from)
    );
    const dist = edge ? edge.distance : 400;
    const hazard = isSegmentHazardous(from, to, activeHazards);

    if (hazard && !blockedSeg) {
      blockedSeg = {
        from,
        to,
        hazardType: hazard.type,
      };
      segments.push({ from, to, distance: dist, isBlocked: true });
    } else {
      segments.push({ from, to, distance: dist, isBlocked: false });
    }
  }

  // 3. If there is a blocked segment, calculate alternate route
  let alternatePath: string[] | undefined = undefined;
  let alternateDistanceKm: number | undefined = undefined;

  if (blockedSeg) {
    const altResult = findShortestPath(source, destination, activeHazards, true);
    if (altResult) {
      alternatePath = altResult.path;
      alternateDistanceKm = altResult.totalDistance;
    }
  }

  const totalDist = baseline.totalDistance;
  const estMins = Math.round((totalDist / 70) * 60); // approx 70 km/h avg highway speed

  return {
    source,
    destination,
    path: baseline.path,
    totalDistanceKm: totalDist,
    estimatedMinutes: estMins,
    segments,
    isSafe: !blockedSeg,
    blockedSegment: blockedSeg,
    alternatePath,
    alternateDistanceKm,
  };
}
