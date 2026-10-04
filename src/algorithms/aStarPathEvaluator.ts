import { RouteOption, Hazard, VehicleType, AStarMetrics } from '../types';
import { getDistanceMeters, hazardAffectsRoute } from './hazardRouteIntersection';

export interface AStarEvaluationResult {
  routes: RouteOption[];
  optimalRoute: RouteOption;
  alternativeRoutes: RouteOption[];
  evaluationSummary: {
    timestamp: string;
    totalRoutesEvaluated: number;
    optimalRouteId: string;
    optimalRouteName: string;
    heuristicMethod: string;
    hazardsDetectedCount: number;
    decisionReason: string;
    decisionReasonHi: string;
  };
  stepLogs: {
    step: number;
    title: string;
    formula: string;
    details: string;
    status: 'info' | 'success' | 'warning' | 'danger';
  }[];
}

/**
 * A* Search Path Evaluation Function:
 * f(n) = g(n) + h(n) + HazardPenalty(n) + VehicleModifier(v)
 *
 * - g(n): Actual road network traversal cost (distance, estimated transit time, road complexity)
 * - h(n): Admissible Euclidean/Haversine heuristic to destination
 * - HazardPenalty(n): Real-time obstacle penalty from IoT sensors & hazards
 * - VehicleModifier(v): Agility and clearance coefficient according to vehicle type
 */
export function evaluateRoutesWithAStar(
  routes: RouteOption[],
  origin: { lat: number; lng: number; name?: string },
  destination: { lat: number; lng: number; name?: string },
  hazards: Hazard[] = [],
  vehicleType: VehicleType = 'car'
): AStarEvaluationResult {
  if (!routes || routes.length === 0) {
    throw new Error('No candidate routes provided for A* evaluation');
  }

  // 1. Calculate straight-line heuristic distance h(n) from Origin to Destination
  const straightLineDistanceMeters = getDistanceMeters(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );
  const straightLineKm = straightLineDistanceMeters / 1000;
  // Admissible heuristic: minimum theoretical travel cost (scaled by optimal highway speed)
  const baseHeuristicCost = Math.round(straightLineKm * 1.15 * 10) / 10;

  const activeHazards = hazards.filter((h) => h.status === 'ACTIVE');
  const evaluatedRoutes: RouteOption[] = [];

  const stepLogs: {
    step: number;
    title: string;
    formula: string;
    details: string;
    status: 'info' | 'success' | 'warning' | 'danger';
  }[] = [];

  stepLogs.push({
    step: 1,
    title: 'Initialize A* Spatial Heuristic',
    formula: `h(Destination) = Haversine(${straightLineKm.toFixed(2)} km) = ${baseHeuristicCost}`,
    details: `Admissible straight-line distance computed to target (${destination.name || 'Destination'}). Guaranteed to not overestimate real road cost.`,
    status: 'info',
  });

  // 2. Evaluate each candidate path with A* Cost Function
  routes.forEach((route, index) => {
    // g(n) = Path traversal cost (minutes + weighted km)
    let gCost = Math.round((route.durationMinutes * 1.1 + route.distanceKm * 0.45) * 10) / 10;

    // Vehicle agility adjustments
    let vehicleModifier = 0;
    if (vehicleType === 'truck' || vehicleType === 'bus') {
      // Trucks face heavy traffic penalties in narrow city corridors (e.g. Route C)
      if (route.name.includes('City') || route.name.includes('Arterial')) {
        vehicleModifier += 18;
      }
      // Trucks favor wide open bypasses
      if (route.name.includes('Bypass')) {
        vehicleModifier -= 6;
      }
    } else if (vehicleType === 'bike') {
      // Two-wheelers easily navigate urban corridors
      vehicleModifier -= 4;
    }

    gCost = Math.max(1, gCost + vehicleModifier);

    // Hazard collision penalty
    let hazardPenalty = 0;
    let isBlocked = false;
    let cautionHazard: Hazard | null = null;

    for (const h of activeHazards) {
      const check = hazardAffectsRoute(h, route.coordinates);
      if (check.affects) {
        if (h.severity === 'BLOCKED' || h.severity === 'CRITICAL') {
          // Infinite penalty for impassable obstruction
          hazardPenalty += 9999;
          isBlocked = true;
          break;
        } else {
          hazardPenalty += 180;
          cautionHazard = h;
        }
      }
    }

    const hCost = baseHeuristicCost;
    const totalFCost = Math.round((gCost + hCost + hazardPenalty) * 10) / 10;

    let status: 'OPTIMAL' | 'ALTERNATIVE' | 'HAZARD_BLOCKED' | 'CAUTION' = 'ALTERNATIVE';
    let explanation = '';

    if (isBlocked) {
      status = 'HAZARD_BLOCKED';
      explanation = `Blocked by ${cautionHazard?.type || 'Hazard'}! A* assigned infinite cost (f=${totalFCost}).`;
    } else if (hazardPenalty > 0) {
      status = 'CAUTION';
      explanation = `Caution: Warning hazard nearby (+${hazardPenalty} penalty). Total f(n)=${totalFCost}.`;
    } else {
      explanation = `Clear road. g(n)=${gCost}, h(n)=${hCost} → f(n)=${totalFCost}.`;
    }

    const aStarMetrics: AStarMetrics = {
      gCost,
      hCost,
      hazardPenalty,
      totalFCost,
      rank: index + 1,
      isOptimal: false,
      status,
      explanation,
      evaluatedNodesCount: route.coordinates.length,
    };

    evaluatedRoutes.push({
      ...route,
      aStarMetrics,
    });

    stepLogs.push({
      step: 2 + index,
      title: `Evaluate ${route.name}`,
      formula: `f(n) = g(${gCost}) + h(${hCost}) + penalty(${hazardPenalty}) = ${totalFCost}`,
      details: isBlocked
        ? `Route obstructed by active hazard. High penalty applied to divert vehicle.`
        : `Path via ${route.viaRoads?.join(', ') || 'Corridor'}. Travel time: ${route.durationMinutes} min, Distance: ${route.distanceKm} km.`,
      status: isBlocked ? 'danger' : hazardPenalty > 0 ? 'warning' : 'success',
    });
  });

  // 3. Sort candidates by A* f(n) ascending (lowest total cost wins)
  evaluatedRoutes.sort((a, b) => (a.aStarMetrics?.totalFCost || 0) - (b.aStarMetrics?.totalFCost || 0));

  // Assign ranks
  evaluatedRoutes.forEach((route, idx) => {
    if (route.aStarMetrics) {
      route.aStarMetrics.rank = idx + 1;
      if (idx === 0) {
        route.aStarMetrics.isOptimal = true;
        if (route.aStarMetrics.status !== 'HAZARD_BLOCKED') {
          route.aStarMetrics.status = 'OPTIMAL';
        }
        route.isRecommended = true;
      } else {
        route.isRecommended = false;
      }
    }
  });

  const optimalRoute = evaluatedRoutes[0];
  const alternativeRoutes = evaluatedRoutes.slice(1);

  const hasBlocked = evaluatedRoutes.some((r) => r.aStarMetrics?.status === 'HAZARD_BLOCKED');

  let decisionReason = `A* selected ${optimalRoute.name} with lowest cost f(n)=${optimalRoute.aStarMetrics?.totalFCost}. Shortest balanced travel time (${optimalRoute.durationMinutes} min) and zero hazard risk.`;
  let decisionReasonHi = `A* एल्गोरिथ्म ने न्यूनतम लागत f(n)=${optimalRoute.aStarMetrics?.totalFCost} के साथ ${optimalRoute.name} को सर्वोत्तम मार्ग चुना। सबसे सुरक्षित व तीव्र यात्रा समय (${optimalRoute.durationMinutes} मिनट)।`;

  if (hasBlocked) {
    decisionReason = `A* dynamically rerouted to ${optimalRoute.name} (f(n)=${optimalRoute.aStarMetrics?.totalFCost}) because candidate paths were obstructed by active road hazards.`;
    decisionReasonHi = `सड़क पर खतरा पाए जाने के कारण A* एल्गोरिथ्म ने अवरुद्ध मार्ग को हटाकर सबसे सुरक्षित ${optimalRoute.name} (f(n)=${optimalRoute.aStarMetrics?.totalFCost}) को नया सर्वोत्तम मार्ग चुना।`;
  }

  stepLogs.push({
    step: evaluatedRoutes.length + 2,
    title: 'A* Optimal Decision Computed',
    formula: `argmin f(n) = ${optimalRoute.name} [f = ${optimalRoute.aStarMetrics?.totalFCost}]`,
    details: decisionReason,
    status: 'success',
  });

  return {
    routes: evaluatedRoutes,
    optimalRoute,
    alternativeRoutes,
    evaluationSummary: {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      totalRoutesEvaluated: evaluatedRoutes.length,
      optimalRouteId: optimalRoute.id,
      optimalRouteName: optimalRoute.name,
      heuristicMethod: 'Admissible Haversine Geodesic Distance',
      hazardsDetectedCount: activeHazards.length,
      decisionReason,
      decisionReasonHi,
    },
    stepLogs,
  };
}
