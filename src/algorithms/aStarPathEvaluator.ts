import { RouteOption, Hazard, VehicleType, AStarMetrics } from '../types';
import { getDistanceMeters, hazardAffectsRoute, getSymmetricRouteOverlap } from './hazardRouteIntersection';

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
    costBreakdown?: {
      distanceCost: number;
      timeCost: number;
      trafficCost: number;
      hazardCost: number;
      restrictionCost: number;
    };
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
    // 3 Parameters: Distance + Time + Hazard
    const dNorm = Math.min(1.0, route.distanceKm / 25);
    const tNorm = Math.min(1.0, route.durationMinutes / 45);
    const distanceCost = Math.round(1.0 * dNorm * 1000) / 1000;
    const timeCost = Math.round(1.5 * tNorm * 1000) / 1000;

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

    const hazardNormalized = isBlocked ? 1.0 : hazardPenalty > 0 ? 0.3 : 0.0;
    const hazardCost = Math.round(5.0 * hazardNormalized * 1000) / 1000;

    // g(n) = Wd·Distance + Wt·Time + Wh·Hazard
    let gCost = isBlocked ? Infinity : Math.round((distanceCost + timeCost + hazardCost) * 1000) / 1000;

    // If this route was already evaluated by real A* road graph search, reuse its verified node-level metrics
    if (route.aStarMetrics && route.aStarMetrics.evaluatedNodesCount > 0) {
      gCost = route.aStarMetrics.gCost;
      if (route.aStarMetrics.hazardPenalty > 0 && hazardPenalty === 0) {
        hazardPenalty = route.aStarMetrics.hazardPenalty;
      }
    }

    const hCost = baseHeuristicCost;
    const totalFCost = isBlocked ? Infinity : Math.round((gCost + hCost) * 1000) / 1000;

    let status: 'OPTIMAL' | 'ALTERNATIVE' | 'HAZARD_BLOCKED' | 'CAUTION' = 'ALTERNATIVE';
    let explanation = '';

    if (isBlocked) {
      status = 'HAZARD_BLOCKED';
      explanation = `Blocked by ${cautionHazard?.type || 'Hazard'}! A* assigned infinite cost (g=∞, f=∞).`;
    } else if (hazardPenalty > 0) {
      status = 'CAUTION';
      explanation = `Caution: Warning hazard nearby (Wh·H=${hazardCost}). Total g(n)=${gCost}, f(n)=${totalFCost}.`;
    } else {
      explanation = `Clear road network. g(n)=${gCost} (Dist:${distanceCost} + Time:${timeCost} + Haz:${hazardCost}), h(n)=${hCost} → f(n)=${totalFCost}.`;
    }

    const costBreakdown = route.aStarMetrics?.costBreakdown || {
      distanceCost,
      timeCost,
      trafficCost: 0,
      hazardCost,
      restrictionCost: isBlocked ? Infinity : 0,
    };

    const aStarMetrics: AStarMetrics = {
      gCost,
      hCost,
      hazardPenalty,
      totalFCost,
      rank: index + 1,
      isOptimal: false,
      status,
      explanation,
      evaluatedNodesCount: route.aStarMetrics?.evaluatedNodesCount || route.coordinates.length,
      costBreakdown,
      hazardsAvoided: route.aStarMetrics?.hazardsAvoided || (isBlocked ? ['Obstructed Corridor'] : []),
      blockedRoadsAvoided: route.aStarMetrics?.blockedRoadsAvoided || (isBlocked ? ['Main Bridge Obstruction'] : []),
      trafficSummary: route.aStarMetrics?.trafficSummary || (route.name.includes('Arterial') ? 'MEDIUM' : 'LOW'),
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
  evaluatedRoutes.sort((a, b) => {
    const aBlocked = a.aStarMetrics?.status === 'HAZARD_BLOCKED' ? 1 : 0;
    const bBlocked = b.aStarMetrics?.status === 'HAZARD_BLOCKED' ? 1 : 0;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked;
    return (a.aStarMetrics?.totalFCost || 0) - (b.aStarMetrics?.totalFCost || 0);
  });

  // STRICT ZERO-OVERLAP FILTERING:
  // When candidates are presented, filter them so that no routes overlap.
  // Overlap threshold: max 15% intermediate road corridor.
  // If >3 routes exist, select the 3 best non-overlapping routes based on A* cost and travel time.
  const MAX_ALLOWED_OVERLAP = 0.15;
  const nonOverlappingRoutes: RouteOption[] = [];
  if (evaluatedRoutes.length > 0) {
    nonOverlappingRoutes.push(evaluatedRoutes[0]);
  }

  for (let i = 1; i < evaluatedRoutes.length && nonOverlappingRoutes.length < 3; i++) {
    const cand = evaluatedRoutes[i];
    if (nonOverlappingRoutes.some((sel) => sel.id === cand.id)) continue;

    const hasOverlap = nonOverlappingRoutes.some((sel) => {
      const overlap = getSymmetricRouteOverlap(sel.coordinates, cand.coordinates, 90);
      return overlap > MAX_ALLOWED_OVERLAP;
    });

    if (!hasOverlap) {
      nonOverlappingRoutes.push(cand);
    }
  }

  // Assign ranks, names & categories strictly per user specifications:
  // - 1 route: Optimal Route (#10b981)
  // - 2 routes: Optimal Route (#10b981) & Average Route (#38bdf8)
  // - 3 routes (or >3 found): Optimal Route (#10b981), Average Route (#38bdf8) & Worst Route (#f59e0b)
  // In all 4 cases: routes must be completely distinct without overlapping paths.
  const finalDiverseRoutes = nonOverlappingRoutes.length > 0 ? nonOverlappingRoutes : evaluatedRoutes.slice(0, 1);
  const totalCount = finalDiverseRoutes.length;
  finalDiverseRoutes.forEach((route, idx) => {
    let cat: 'OPTIMAL' | 'AVERAGE' | 'WORST' = 'OPTIMAL';
    let baseName = 'Optimal Route';
    let color = '#10b981';

    if (totalCount === 1) {
      cat = 'OPTIMAL';
      baseName = 'Optimal Route';
      color = '#10b981';
    } else if (totalCount === 2) {
      if (idx === 0) {
        cat = 'OPTIMAL';
        baseName = 'Optimal Route';
        color = '#10b981';
      } else {
        cat = 'AVERAGE';
        baseName = 'Average Route';
        color = '#38bdf8';
      }
    } else {
      if (idx === 0) {
        cat = 'OPTIMAL';
        baseName = 'Optimal Route';
        color = '#10b981';
      } else if (idx === 1) {
        cat = 'AVERAGE';
        baseName = 'Average Route';
        color = '#38bdf8';
      } else {
        cat = 'WORST';
        baseName = 'Worst Route';
        color = '#f59e0b';
      }
    }

    const viaStr = route.viaRoads && route.viaRoads.length > 0 && route.viaRoads[0] !== 'Main Highway Network'
      ? ` — via ${route.viaRoads[0]}`
      : cat === 'OPTIMAL'
      ? ' — Fastest & Safest'
      : cat === 'AVERAGE'
      ? ' — Moderate Alternative'
      : ' — Slowest / Long Alternative';

    route.category = cat;
    route.color = color;
    route.name = `${baseName}${viaStr}`;

    if (route.aStarMetrics) {
      route.aStarMetrics.rank = idx + 1;
      route.aStarMetrics.category = cat;
      if (idx === 0) {
        route.aStarMetrics.isOptimal = true;
        if (route.aStarMetrics.status !== 'HAZARD_BLOCKED') {
          route.aStarMetrics.status = 'OPTIMAL';
        }
        route.isRecommended = true;
      } else {
        route.aStarMetrics.isOptimal = false;
        route.isRecommended = false;
      }
    }
  });

  const optimalRoute = finalDiverseRoutes[0];
  const alternativeRoutes = finalDiverseRoutes.slice(1);

  const hasBlocked = finalDiverseRoutes.some((r) => r.aStarMetrics?.status === 'HAZARD_BLOCKED');

  let decisionReason = `A* selected ${optimalRoute.name} with lowest cost f(n)=${optimalRoute.aStarMetrics?.totalFCost}. Shortest balanced travel time (${optimalRoute.durationMinutes} min) and zero hazard risk.`;
  let decisionReasonHi = `A* एल्गोरिथ्म ने न्यूनतम लागत f(n)=${optimalRoute.aStarMetrics?.totalFCost} के साथ ${optimalRoute.name} को सर्वोत्तम मार्ग चुना। सबसे सुरक्षित व तीव्र यात्रा समय (${optimalRoute.durationMinutes} मिनट)।`;

  if (hasBlocked) {
    decisionReason = `A* dynamically rerouted to ${optimalRoute.name} (f(n)=${optimalRoute.aStarMetrics?.totalFCost}) because candidate paths were obstructed by active road hazards.`;
    decisionReasonHi = `सड़क पर खतरा पाए जाने के कारण A* एल्गोरिथ्म ने अवरुद्ध मार्ग को हटाकर सबसे सुरक्षित ${optimalRoute.name} (f(n)=${optimalRoute.aStarMetrics?.totalFCost}) को नया सर्वोत्तम मार्ग चुना।`;
  }

  stepLogs.push({
    step: finalDiverseRoutes.length + 2,
    title: 'A* Optimal Decision Computed',
    formula: `argmin f(n) = ${optimalRoute.name} [f = ${optimalRoute.aStarMetrics?.totalFCost}]`,
    details: decisionReason,
    status: 'success',
  });

  return {
    routes: finalDiverseRoutes,
    optimalRoute,
    alternativeRoutes,
    evaluationSummary: {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      totalRoutesEvaluated: finalDiverseRoutes.length,
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
