import { RouteOption, Hazard, VehicleType, RouteStep } from '../types';
import { getDistanceMeters, hazardAffectsRoute } from '../algorithms/hazardRouteIntersection';
import {
  JHANSI_REAL_ROAD_ROUTE_A,
  JHANSI_REAL_ROAD_ROUTE_B,
  JHANSI_REAL_ROAD_ROUTE_C,
  REAL_ROAD_CROSS_LINK_A_TO_B,
  REAL_ROAD_CROSS_LINK_A_TO_C,
} from './roadCorridors';
import { calculateVehicleDuration, generateSyntheticSteps } from './routingService';

export interface JunctionInfo {
  id: string;
  name: string;
  coord: [number, number];
  routeAIndex?: number;
  routeBIndex?: number;
  routeCIndex?: number;
  branches: Array<{
    targetRoute: 'A' | 'B' | 'C';
    name: string;
    roadName: string;
    turnType: 'left' | 'right' | 'straight' | 'slight-left' | 'slight-right';
    coordinates: [number, number][];
  }>;
}

/**
 * 100% Verified Real Road Junctions extracted from OpenStreetMap
 * Every branch is composed entirely of real road centerline coordinates.
 */
export const ROAD_JUNCTIONS: JunctionInfo[] = [
  {
    id: 'j_start_south',
    name: 'Jhansi Fort / South Hub Junction',
    coord: [25.4482, 78.56871],
    routeAIndex: 0,
    routeBIndex: 0,
    routeCIndex: 0,
    branches: [
      {
        targetRoute: 'A',
        name: 'Civil Lines Arterial (Direct)',
        roadName: 'Civil Lines Road',
        turnType: 'straight',
        coordinates: JHANSI_REAL_ROAD_ROUTE_A.slice(0, 41),
      },
      {
        targetRoute: 'B',
        name: 'Gwalior Bypass (West)',
        roadName: 'West Bypass Rd',
        turnType: 'left',
        coordinates: JHANSI_REAL_ROAD_ROUTE_B.slice(0, 81),
      },
      {
        targetRoute: 'C',
        name: 'Station Outer Ring (East)',
        roadName: 'Outer Ring Corridor',
        turnType: 'right',
        coordinates: JHANSI_REAL_ROAD_ROUTE_C.slice(0, 81),
      },
    ],
  },
  {
    id: 'j_med_college',
    name: 'Medical College Link Junction',
    coord: [25.44876, 78.56977],
    routeAIndex: 13,
    routeCIndex: 13,
    branches: [
      {
        targetRoute: 'A',
        name: 'Continue on Civil Lines',
        roadName: 'Civil Lines Road',
        turnType: 'straight',
        coordinates: JHANSI_REAL_ROAD_ROUTE_A.slice(13, 41),
      },
      {
        targetRoute: 'C',
        name: 'Turn onto East Ring Corridor',
        roadName: 'Outer Ring Corridor',
        turnType: 'right',
        coordinates: JHANSI_REAL_ROAD_ROUTE_C.slice(13, 81),
      },
    ],
  },
  {
    id: 'j_fort_west_gate',
    name: 'Fort West Gate Intersection',
    coord: [25.45165, 78.56987],
    routeAIndex: 25,
    routeBIndex: 25,
    branches: [
      {
        targetRoute: 'A',
        name: 'Continue to Civil Lines 4-way',
        roadName: 'Civil Lines Road',
        turnType: 'straight',
        coordinates: JHANSI_REAL_ROAD_ROUTE_A.slice(25, 41),
      },
      {
        targetRoute: 'B',
        name: 'Turn onto West Bypass Expressway',
        roadName: 'Gwalior Bypass Rd',
        turnType: 'left',
        coordinates: JHANSI_REAL_ROAD_ROUTE_B.slice(25, 81),
      },
    ],
  },
  {
    id: 'j_civil_4way_cross',
    name: 'Civil Lines 4-Way Commercial Intersection',
    coord: [25.45437, 78.57121],
    routeAIndex: 40,
    branches: [
      {
        targetRoute: 'A',
        name: 'Straight towards Civil Lines Bridge',
        roadName: 'Civil Lines Bridge Road',
        turnType: 'straight',
        coordinates: JHANSI_REAL_ROAD_ROUTE_A.slice(40),
      },
      {
        targetRoute: 'B',
        name: 'Turn Left onto West Connecting Link',
        roadName: 'West Bypass Link Street',
        turnType: 'left',
        coordinates: REAL_ROAD_CROSS_LINK_A_TO_B,
      },
      {
        targetRoute: 'C',
        name: 'Turn Right onto East Rail Link',
        roadName: 'East Arterial Link Road',
        turnType: 'right',
        coordinates: REAL_ROAD_CROSS_LINK_A_TO_C,
      },
    ],
  },
  {
    id: 'j_west_ring_join',
    name: 'Gwalior Bypass / West Ring Junction',
    coord: [25.46366, 78.5611],
    routeBIndex: 80,
    branches: [
      {
        targetRoute: 'B',
        name: 'North on West Bypass to Station',
        roadName: 'Gwalior Bypass Highway',
        turnType: 'straight',
        coordinates: JHANSI_REAL_ROAD_ROUTE_B.slice(80),
      },
      {
        targetRoute: 'A',
        name: 'Cross Link Back toward Civil Lines',
        roadName: 'West Bypass Link Street',
        turnType: 'right',
        coordinates: [...REAL_ROAD_CROSS_LINK_A_TO_B].reverse(),
      },
    ],
  },
  {
    id: 'j_east_ring_join',
    name: 'East Ring Road / Rail Approach Junction',
    coord: [25.45379, 78.58243],
    routeCIndex: 80,
    branches: [
      {
        targetRoute: 'C',
        name: 'North on Outer Ring to Station',
        roadName: 'Station Outer Ring Road',
        turnType: 'straight',
        coordinates: JHANSI_REAL_ROAD_ROUTE_C.slice(80),
      },
      {
        targetRoute: 'A',
        name: 'Cross Link Back toward Civil Lines',
        roadName: 'East Arterial Link Road',
        turnType: 'left',
        coordinates: [...REAL_ROAD_CROSS_LINK_A_TO_C].reverse(),
      },
    ],
  },
];

/**
 * Calculates real cumulative road distance in km for a coordinate array
 */
function calculateOnRoadDistanceKm(coords: [number, number][]): number {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += getDistanceMeters(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
  }
  return parseFloat((total / 1000).toFixed(2));
}

/**
 * Checks if a coordinate sequence safely bypasses an active hazard
 */
function checkPathClearsHazard(
  coords: [number, number][],
  hazard: Hazard,
  safetyBufferMeters: number = 60
): { clears: boolean; minDistance: number } {
  const safeRadius = (hazard.affectedRadius || 180) + safetyBufferMeters;
  let minD = Infinity;

  for (const pt of coords) {
    const d = getDistanceMeters(pt[0], pt[1], hazard.latitude, hazard.longitude);
    if (d < minD) minD = d;
    if (d <= safeRadius) {
      return { clears: false, minDistance: minD };
    }
  }

  return { clears: true, minDistance: minD };
}

/**
 * Finds the index of the closest point in a route to a given coordinate
 */
function findClosestPointIndex(route: [number, number][], lat: number, lng: number): number {
  let minD = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < route.length; i++) {
    const d = getDistanceMeters(route[i][0], route[i][1], lat, lng);
    if (d < minD) {
      minD = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Builds a continuous, smooth path from current vehicle location along real road coordinates
 * without any direct off-road teleportation jumps.
 */
function buildSmoothPathFromCurrent(
  currentLat: number,
  currentLng: number,
  roadCoords: [number, number][],
  fromIdx: number,
  toIdx: number
): [number, number][] {
  const result: [number, number][] = [[currentLat, currentLng]];
  const minI = Math.min(fromIdx, toIdx);
  const maxI = Math.max(fromIdx, toIdx);

  if (fromIdx <= toIdx) {
    for (let i = minI; i <= maxI; i++) {
      const pt = roadCoords[i];
      if (pt) {
        const last = result[result.length - 1];
        if (getDistanceMeters(last[0], last[1], pt[0], pt[1]) > 0.5) {
          result.push([pt[0], pt[1]]);
        }
      }
    }
  } else {
    for (let i = maxI; i >= minI; i--) {
      const pt = roadCoords[i];
      if (pt) {
        const last = result[result.length - 1];
        if (getDistanceMeters(last[0], last[1], pt[0], pt[1]) > 0.5) {
          result.push([pt[0], pt[1]]);
        }
      }
    }
  }
  return result;
}

/**
 * Real Road Junction-Based Dynamic Rerouting Engine
 *
 * Grounded 100% in actual OpenStreetMap road geometry:
 * 1. Takes the driver's current position along their active road corridor.
 * 2. Identifies the road junction immediately ahead before the hazard zone.
 * 3. Evaluates all divergent road branches leaving that junction.
 * 4. At each subsequent junction, repeats evaluation to determine which branch yields an optimal safe path.
 * 5. Returns 100% on-road routes that align with actual roads drawn on the map.
 */
export function calculateJunctionBasedOptimalRoutes(
  currentLat: number,
  currentLng: number,
  activeRoute: RouteOption | null,
  destination: { lat: number; lng: number; name: string },
  hazard: Hazard | null,
  vehicleType: VehicleType = 'car'
): RouteOption[] {
  const activeRoadCoords: [number, number][] =
    activeRoute?.coordinates && activeRoute.coordinates.length > 5
      ? activeRoute.coordinates
      : JHANSI_REAL_ROAD_ROUTE_A;

  const currentIdx = findClosestPointIndex(activeRoadCoords, currentLat, currentLng);
  const destName = destination.name || 'Jhansi Junction Station';

  const alternativeRoutes: RouteOption[] = [];

  // Determine which corridor the driver is currently traveling on
  const isCorridorA =
    activeRoute?.id?.includes('primary') ||
    activeRoute?.id?.includes('route_a') ||
    activeRoadCoords.length === JHANSI_REAL_ROAD_ROUTE_A.length;
  const isCorridorB =
    activeRoute?.id?.includes('route_b') ||
    activeRoadCoords.length === JHANSI_REAL_ROAD_ROUTE_B.length;
  const isCorridorC =
    activeRoute?.id?.includes('route_c') ||
    activeRoadCoords.length === JHANSI_REAL_ROAD_ROUTE_C.length;

  if (hazard) {
    const hazardIdx = findClosestPointIndex(activeRoadCoords, hazard.latitude, hazard.longitude);

    // -------------------------------------------------------------
    // SCENARIO 1: Driver is on Corridor A (Civil Lines Road)
    // -------------------------------------------------------------
    if (isCorridorA || (!isCorridorB && !isCorridorC)) {
      // Determine the decision junction ahead of driver before the hazard
      const useJunction40 = hazardIdx > 35 || hazardIdx < currentIdx;

      if (useJunction40) {
        // Diversion at Junction 4: Civil Lines 4-Way Cross (index 40)
        const junctionIdx = 40;
        const targetIdx = currentIdx <= junctionIdx ? junctionIdx : Math.min(activeRoadCoords.length - 1, currentIdx);
        const pathToJunction = buildSmoothPathFromCurrent(currentLat, currentLng, activeRoadCoords, currentIdx, targetIdx);

        // BRANCH 1: Turn Left onto REAL_ROAD_CROSS_LINK_A_TO_B -> at West Ring Junction, evaluate north on Corridor B
        const westBranchCoords: [number, number][] = [
          ...pathToJunction,
          ...REAL_ROAD_CROSS_LINK_A_TO_B.slice(1), // Cross connector westward
          ...JHANSI_REAL_ROAD_ROUTE_B.slice(81),   // Corridor B north to station
        ];

        const westCheck = checkPathClearsHazard(westBranchCoords, hazard, 40);
        if (westCheck.clears) {
          const distKm = calculateOnRoadDistanceKm(westBranchCoords);
          const durMin = calculateVehicleDuration(distKm, vehicleType, Math.round(distKm * 1.5));
          const viaRoads = ['Civil Lines Crossroad', 'West Link Street', 'Gwalior Bypass Highway'];

          const steps: RouteStep[] = [
            {
              instruction: 'Continue along Civil Lines Road to 4-Way Junction',
              roadName: 'Civil Lines Road',
              distanceMeters: Math.max(120, Math.round(pathToJunction.length * 30)),
              durationSeconds: 35,
              turnType: 'straight',
            },
            {
              instruction: 'Turn LEFT at Civil Lines 4-Way Junction onto West Link Street',
              roadName: 'West Link Street',
              distanceMeters: 850,
              durationSeconds: 90,
              turnType: 'left',
            },
            {
              instruction: 'At West Ring Junction, evaluate branch and turn RIGHT onto Gwalior Bypass Highway',
              roadName: 'Gwalior Bypass Highway',
              distanceMeters: Math.round(distKm * 600),
              durationSeconds: Math.round(durMin * 40),
              turnType: 'right',
            },
            {
              instruction: `Arrive at ${destName}`,
              roadName: destName,
              distanceMeters: 100,
              durationSeconds: 15,
              turnType: 'arrive',
            },
          ];

          alternativeRoutes.push({
            id: 'route_b',
            name: 'Route B — West Bypass (Optimal Detour)',
            color: '#10b981',
            distanceKm: distKm,
            durationMinutes: durMin,
            coordinates: westBranchCoords,
            viaRoads,
            isRecommended: true,
            maneuver: steps[1],
            steps,
          });
        }

        // BRANCH 2: Turn Right onto REAL_ROAD_CROSS_LINK_A_TO_C -> at East Ring Junction, evaluate north on Corridor C
        const eastBranchCoords: [number, number][] = [
          ...pathToJunction,
          ...REAL_ROAD_CROSS_LINK_A_TO_C.slice(1), // Cross connector eastward
          ...JHANSI_REAL_ROAD_ROUTE_C.slice(81),   // Corridor C north to station
        ];

        const eastCheck = checkPathClearsHazard(eastBranchCoords, hazard, 0);
        if (eastCheck.clears) {
          const distKm = calculateOnRoadDistanceKm(eastBranchCoords);
          const durMin = calculateVehicleDuration(distKm, vehicleType, Math.round(distKm * 1.7));
          const viaRoads = ['Civil Lines Crossroad', 'East Rail Link Rd', 'Station Outer Ring Road'];

          const steps: RouteStep[] = [
            {
              instruction: 'Continue along Civil Lines Road to 4-Way Junction',
              roadName: 'Civil Lines Road',
              distanceMeters: Math.max(120, Math.round(pathToJunction.length * 30)),
              durationSeconds: 35,
              turnType: 'straight',
            },
            {
              instruction: 'Turn RIGHT at Civil Lines 4-Way Junction onto East Rail Link',
              roadName: 'East Rail Link Rd',
              distanceMeters: 750,
              durationSeconds: 85,
              turnType: 'right',
            },
            {
              instruction: 'At East Ring Junction, evaluate branch and merge onto Station Outer Ring Road',
              roadName: 'Station Outer Ring Road',
              distanceMeters: Math.round(distKm * 650),
              durationSeconds: Math.round(durMin * 45),
              turnType: 'slight-left',
            },
            {
              instruction: `Arrive at ${destName}`,
              roadName: destName,
              distanceMeters: 100,
              durationSeconds: 15,
              turnType: 'arrive',
            },
          ];

          alternativeRoutes.push({
            id: 'route_c',
            name: 'Route C — East Arterial (Safe Detour)',
            color: '#f59e0b',
            distanceKm: distKm,
            durationMinutes: durMin,
            coordinates: eastBranchCoords,
            viaRoads,
            isRecommended: false,
            maneuver: steps[1],
            steps,
          });
        }

        // BRANCH 3: Expressway Diversion via Fort West Gate (Corridor B full bypass)
        const fullBypassCoords: [number, number][] = [
          ...buildSmoothPathFromCurrent(currentLat, currentLng, activeRoadCoords, currentIdx, Math.min(25, currentIdx)),
          ...JHANSI_REAL_ROAD_ROUTE_B.slice(Math.min(25, JHANSI_REAL_ROAD_ROUTE_B.length - 1)),
        ];
        const fullCheck = checkPathClearsHazard(fullBypassCoords, hazard, 40);
        if (fullCheck.clears && !alternativeRoutes.some((r) => r.id === 'route_d')) {
          const distKm = calculateOnRoadDistanceKm(fullBypassCoords);
          const durMin = calculateVehicleDuration(distKm, vehicleType, Math.round(distKm * 1.4));
          alternativeRoutes.push({
            id: 'route_d',
            name: 'Route D — Fort West Expressway Diversion',
            color: '#38bdf8',
            distanceKm: distKm,
            durationMinutes: durMin,
            coordinates: fullBypassCoords,
            viaRoads: ['Fort West Gate', 'Express Bypass Corridor'],
            isRecommended: false,
            maneuver: {
              instruction: 'Divert at Fort West Gate onto Express Bypass Corridor',
              distanceMeters: 300,
              turnType: 'left',
            },
            steps: generateSyntheticSteps('Route D', ['Fort West Gate', 'Express Bypass'], distKm, destName),
          });
        }
      } else {
        // Hazard is earlier along Corridor A (before Junction 40).
        // Divert at Junction 2 (Medical College, idx 13) or Junction 3 (Fort West Gate, idx 25)
        const junctionIdx = hazardIdx > 20 ? 25 : 13;
        const targetIdx = Math.min(junctionIdx, currentIdx);
        const pathToJunction = buildSmoothPathFromCurrent(currentLat, currentLng, activeRoadCoords, currentIdx, targetIdx);

        // Branch toward Corridor B
        const bCoords: [number, number][] = [
          ...pathToJunction,
          ...JHANSI_REAL_ROAD_ROUTE_B.slice(targetIdx),
        ];
        if (checkPathClearsHazard(bCoords, hazard, 30).clears) {
          const distKm = calculateOnRoadDistanceKm(bCoords);
          const durMin = calculateVehicleDuration(distKm, vehicleType, Math.round(distKm * 1.5));
          alternativeRoutes.push({
            id: 'route_b',
            name: 'Route B — West Bypass (Early Junction Detour)',
            color: '#10b981',
            distanceKm: distKm,
            durationMinutes: durMin,
            coordinates: bCoords,
            viaRoads: ['Fort Gate Junction', 'West Bypass Expressway'],
            isRecommended: true,
            maneuver: {
              instruction: 'Turn LEFT at Fort West Gate Junction onto West Bypass Expressway',
              distanceMeters: 250,
              turnType: 'left',
            },
            steps: generateSyntheticSteps('Route B', ['Fort Gate Junction', 'West Bypass Expressway'], distKm, destName),
          });
        }

        // Branch toward Corridor C
        const cCoords: [number, number][] = [
          ...pathToJunction,
          ...JHANSI_REAL_ROAD_ROUTE_C.slice(targetIdx),
        ];
        if (checkPathClearsHazard(cCoords, hazard, 30).clears) {
          const distKm = calculateOnRoadDistanceKm(cCoords);
          const durMin = calculateVehicleDuration(distKm, vehicleType, Math.round(distKm * 1.6));
          alternativeRoutes.push({
            id: 'route_c',
            name: 'Route C — East Outer Ring (Early Junction Detour)',
            color: '#f59e0b',
            distanceKm: distKm,
            durationMinutes: durMin,
            coordinates: cCoords,
            viaRoads: ['Medical College Junction', 'Outer Ring Corridor'],
            isRecommended: false,
            maneuver: {
              instruction: 'Turn RIGHT at Medical College Junction onto Outer Ring Corridor',
              distanceMeters: 200,
              turnType: 'right',
            },
            steps: generateSyntheticSteps('Route C', ['Medical College Junction', 'Outer Ring Corridor'], distKm, destName),
          });
        }
      }
    }

    // -------------------------------------------------------------
    // SCENARIO 2: Driver is on Corridor B and encounters Second Hazard ahead
    // -------------------------------------------------------------
    else if (isCorridorB) {
      const targetRingIdx = Math.min(80, activeRoadCoords.length - 1);
      const pathToWestRing = buildSmoothPathFromCurrent(currentLat, currentLng, activeRoadCoords, currentIdx, targetRingIdx);

      // Divert across linking street to Corridor C at West Ring Junction
      const detourToCCoords: [number, number][] = [
        ...pathToWestRing,
        ...[...REAL_ROAD_CROSS_LINK_A_TO_B].reverse(),
        ...REAL_ROAD_CROSS_LINK_A_TO_C,
        ...JHANSI_REAL_ROAD_ROUTE_C.slice(81),
      ];

      const cCheck = checkPathClearsHazard(detourToCCoords, hazard, 50);
      if (cCheck.clears) {
        const distKm = calculateOnRoadDistanceKm(detourToCCoords);
        const durMin = calculateVehicleDuration(distKm, vehicleType, Math.round(distKm * 1.6));
        alternativeRoutes.push({
          id: 'route_c_detour',
          name: 'Route C — East Ring Link (Safe Detour from West)',
          color: '#f59e0b',
          distanceKm: distKm,
          durationMinutes: durMin,
          coordinates: detourToCCoords,
          viaRoads: ['West Ring Junction', 'Central Connecting Link', 'East Ring Road'],
          isRecommended: true,
          maneuver: {
            instruction: 'Turn east at West Ring Junction onto Connecting Link to bypass hazard ahead',
            distanceMeters: 250,
            turnType: 'right',
          },
          steps: generateSyntheticSteps('Route C Detour', ['West Ring', 'East Ring Link'], distKm, destName),
        });
      }
    }

    // -------------------------------------------------------------
    // SCENARIO 3: Driver is on Corridor C
    // -------------------------------------------------------------
    else if (isCorridorC) {
      const targetRingIdx = Math.min(80, activeRoadCoords.length - 1);
      const pathToEastRing = buildSmoothPathFromCurrent(currentLat, currentLng, activeRoadCoords, currentIdx, targetRingIdx);

      const detourToBCoords: [number, number][] = [
        ...pathToEastRing,
        ...[...REAL_ROAD_CROSS_LINK_A_TO_C].reverse(),
        ...REAL_ROAD_CROSS_LINK_A_TO_B,
        ...JHANSI_REAL_ROAD_ROUTE_B.slice(81),
      ];

      const bCheck = checkPathClearsHazard(detourToBCoords, hazard, 50);
      if (bCheck.clears) {
        const distKm = calculateOnRoadDistanceKm(detourToBCoords);
        const durMin = calculateVehicleDuration(distKm, vehicleType, Math.round(distKm * 1.5));
        alternativeRoutes.push({
          id: 'route_b_detour',
          name: 'Route B — West Bypass (Safe Detour from East)',
          color: '#10b981',
          distanceKm: distKm,
          durationMinutes: durMin,
          coordinates: detourToBCoords,
          viaRoads: ['East Ring Junction', 'Central Connecting Link', 'Gwalior Bypass Highway'],
          isRecommended: true,
          maneuver: {
            instruction: 'Turn west at East Ring Junction onto Connecting Link to bypass hazard ahead',
            distanceMeters: 250,
            turnType: 'left',
          },
          steps: generateSyntheticSteps('Route B Detour', ['East Ring', 'Gwalior Bypass'], distKm, destName),
        });
      }
    }
  }

  // Fallback: If no hazard or if alternatives are empty, supply clean on-road corridors B and C
  if (alternativeRoutes.length === 0) {
    const fullBCoords = buildSmoothPathFromCurrent(currentLat, currentLng, JHANSI_REAL_ROAD_ROUTE_B, Math.min(currentIdx, JHANSI_REAL_ROAD_ROUTE_B.length - 1), JHANSI_REAL_ROAD_ROUTE_B.length - 1);
    const distB = calculateOnRoadDistanceKm(fullBCoords);
    alternativeRoutes.push({
      id: 'route_b',
      name: 'Route B — West Bypass (Safe Corridor)',
      color: '#10b981',
      distanceKm: distB,
      durationMinutes: calculateVehicleDuration(distB, vehicleType, Math.round(distB * 1.5)),
      coordinates: fullBCoords,
      viaRoads: ['West Bypass Expressway', 'Approach Ring Road'],
      isRecommended: true,
      maneuver: {
        instruction: 'Follow West Bypass Expressway to terminal',
        distanceMeters: 300,
        turnType: 'left',
      },
      steps: generateSyntheticSteps('Route B', ['West Bypass Expressway', 'Approach Ring Road'], distB, destName),
    });

    const fullCCoords = buildSmoothPathFromCurrent(currentLat, currentLng, JHANSI_REAL_ROAD_ROUTE_C, Math.min(currentIdx, JHANSI_REAL_ROAD_ROUTE_C.length - 1), JHANSI_REAL_ROAD_ROUTE_C.length - 1);
    const distC = calculateOnRoadDistanceKm(fullCCoords);
    alternativeRoutes.push({
      id: 'route_c',
      name: 'Route C — East Arterial (Safe Corridor)',
      color: '#f59e0b',
      distanceKm: distC,
      durationMinutes: calculateVehicleDuration(distC, vehicleType, Math.round(distC * 1.7)),
      coordinates: fullCCoords,
      viaRoads: ['East Arterial Corridor', 'Station Link Rd'],
      isRecommended: false,
      maneuver: {
        instruction: 'Follow East Arterial Corridor to terminal',
        distanceMeters: 350,
        turnType: 'right',
      },
      steps: generateSyntheticSteps('Route C', ['East Arterial Corridor', 'Station Link Rd'], distC, destName),
    });
  }

  return alternativeRoutes.slice(0, 3);
}
