/**
 * Road Junction Router
 *
 * Replaced legacy hardcoded Jhansi junctions with the genuine OpenStreetMap
 * road-network graph search engine.
 */
import { RouteOption, Hazard, VehicleType } from '../types';
import { calculateAlternativeRoutes } from './routingService';

export interface JunctionBranch {
  id: string;
  name: string;
  roadName: string;
  turnType: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right';
  coordinates: [number, number][];
}

export interface JunctionInfo {
  id: string;
  name: string;
  coord: [number, number];
  branches: JunctionBranch[];
}

/**
 * Calculates genuine on-road alternative routes via real road network junctions.
 * Fully dynamic and supports arbitrary locations.
 */
export async function calculateJunctionBasedOptimalRoutes(
  currentLat: number,
  currentLng: number,
  activeRoute: RouteOption | null,
  destination: { lat: number; lng: number; name: string },
  hazard: Hazard | null,
  vehicleType: VehicleType = 'car'
): Promise<RouteOption[]> {
  return calculateAlternativeRoutes(
    currentLat,
    currentLng,
    destination,
    hazard,
    vehicleType,
    activeRoute
  );
}
