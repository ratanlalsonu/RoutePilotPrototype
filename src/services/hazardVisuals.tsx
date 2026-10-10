import React from 'react';
import { HazardType, HazardSeverity, Hazard } from '../types';

export interface HazardVisualConfig {
  type: HazardType | string;
  label: string;
  emoji: string;
  accentColor: string; // e.g. #0284c7 for Water
  bgClass: string;     // Tailwind bg class for badge / indicator
  pingClass: string;   // Tailwind ping ring class
  badgeBorder: string;
  badgeText: string;
  shortCode: string;
  svgHtml: string;
}

/**
 * Returns customized visual assets, color palette, and SVG icon for any hazard type.
 */
export function getHazardVisual(type: HazardType | string, severity?: HazardSeverity): HazardVisualConfig {
  const isCritical = severity === 'CRITICAL' || severity === 'BLOCKED';

  switch (type) {
    case 'High Water Level':
      return {
        type,
        label: 'High Water / Flood',
        emoji: '🌊',
        accentColor: '#0284c7', // vibrant ocean/flood blue
        bgClass: isCritical ? 'bg-gradient-to-br from-cyan-600 to-blue-700' : 'bg-gradient-to-br from-cyan-500 to-blue-600',
        pingClass: 'bg-cyan-500/50',
        badgeBorder: 'border-cyan-400/80',
        badgeText: 'text-cyan-200',
        shortCode: 'FLOOD',
        svgHtml: `
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <!-- Water Drop -->
            <path d="M12 2.5c-2.5 3.2-4.5 5.8-4.5 8.5a4.5 4.5 0 0 0 9 0c0-2.7-2-5.3-4.5-8.5z" fill="rgba(255,255,255,0.25)" stroke-width="1.8"/>
            <!-- Wave 1 -->
            <path d="M2 17.5c2-1 4.5-1 6.5 0s4.5 1 6.5 0 4.5-1 6.5 0" stroke-width="2.2"/>
            <!-- Wave 2 -->
            <path d="M2 21c2-1 4.5-1 6.5 0s4.5 1 6.5 0 4.5-1 6.5 0" stroke-width="2.2"/>
          </svg>
        `,
      };

    case 'Bridge Damage':
      return {
        type,
        label: 'Bridge Damage',
        emoji: '🌉',
        accentColor: '#dc2626',
        bgClass: isCritical ? 'bg-gradient-to-br from-red-600 to-rose-700' : 'bg-gradient-to-br from-amber-600 to-orange-700',
        pingClass: 'bg-red-500/50',
        badgeBorder: 'border-red-400/80',
        badgeText: 'text-red-200',
        shortCode: 'BRIDGE',
        svgHtml: `
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <!-- Bridge broken deck -->
            <path d="M2 10.5h6l1.5 2-1 2 2-1" stroke-width="2"/>
            <path d="M14.5 13l2-1-1 2 1.5-2H22" stroke-width="2"/>
            <!-- Piers -->
            <path d="M4 11v9M20 11v9M8.5 14.5v5.5M15.5 14.5v5.5" stroke-width="1.8"/>
            <!-- Crack fissure bolt in deck -->
            <path d="M12 3l-2 4.5h3.5l-2 4.5" stroke="#fef08a" stroke-width="2.4"/>
            <!-- Water reflection line -->
            <path d="M2 21c3-0.8 6 0.8 10 0s7-0.8 10 0" stroke-width="1.5" stroke-dasharray="2 2"/>
          </svg>
        `,
      };

    case 'Road Blockage':
      return {
        type,
        label: 'Road Blockage',
        emoji: '🚧',
        accentColor: '#dc2626',
        bgClass: 'bg-gradient-to-br from-red-600 to-red-800',
        pingClass: 'bg-red-600/50',
        badgeBorder: 'border-red-500/80',
        badgeText: 'text-red-200',
        shortCode: 'BLOCKED',
        svgHtml: `
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <!-- Barrier board -->
            <rect x="2.5" y="6" width="19" height="7.5" rx="1.5" fill="rgba(255,255,255,0.2)" stroke-width="2"/>
            <!-- Diagonal stripes -->
            <path d="M6.5 6l-3.5 7.5M11.5 6l-4 7.5M16.5 6l-4 7.5M21 6l-3.5 7.5" stroke-width="1.8"/>
            <!-- Stand legs -->
            <path d="M5.5 13.5v7.5M18.5 13.5v7.5M3 21h5M16 21h5" stroke-width="2"/>
          </svg>
        `,
      };

    case 'Road Construction':
      return {
        type,
        label: 'Road Construction',
        emoji: '🏗️',
        accentColor: '#ea580c',
        bgClass: 'bg-gradient-to-br from-orange-500 to-amber-600',
        pingClass: 'bg-orange-500/50',
        badgeBorder: 'border-orange-400/80',
        badgeText: 'text-orange-200',
        shortCode: 'WORK',
        svgHtml: `
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <!-- Traffic Cone -->
            <path d="M10 2.5h4l4.5 15.5H5.5L10 2.5z" fill="rgba(255,255,255,0.2)" stroke-width="2"/>
            <!-- Reflective stripes -->
            <path d="M8.2 13h7.6M9.4 8h5.2" stroke-width="2.4" stroke="#ffffff"/>
            <!-- Pedestal base -->
            <rect x="2.5" y="18" width="19" height="3.5" rx="1" fill="rgba(255,255,255,0.4)" stroke-width="2"/>
          </svg>
        `,
      };

    case 'Accident':
      return {
        type,
        label: 'Accident',
        emoji: '💥',
        accentColor: '#e11d48',
        bgClass: 'bg-gradient-to-br from-rose-600 to-red-700',
        pingClass: 'bg-rose-500/50',
        badgeBorder: 'border-rose-400/80',
        badgeText: 'text-rose-200',
        shortCode: 'CRASH',
        svgHtml: `
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <!-- Impact Explosion Burst -->
            <path d="M12 2l2 4.5 4.5-2-2 4.5 4.5 2-4.5 2 2 4.5-4.5-2-2 4.5-2-4.5-4.5 2 2-4.5-4.5-2 4.5-2-2-4.5 4.5 2L12 2z" fill="#fef08a" stroke="#ffffff" stroke-width="1.6"/>
            <!-- Crash Exclamation -->
            <path d="M12 7.5v4.5M12 14.5h.01" stroke="#dc2626" stroke-width="2.8"/>
          </svg>
        `,
      };

    case 'Structural Vibration':
      return {
        type,
        label: 'Structural Vibration',
        emoji: '📳',
        accentColor: '#9333ea',
        bgClass: 'bg-gradient-to-br from-purple-600 to-fuchsia-700',
        pingClass: 'bg-purple-500/50',
        badgeBorder: 'border-purple-400/80',
        badgeText: 'text-purple-200',
        shortCode: 'VIB',
        svgHtml: `
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <!-- Vibration Waveform -->
            <path d="M2 12h3.5l2-6 2.5 13 3-17 3 19 2.5-11 1.5 5H22" stroke-width="2.2"/>
            <circle cx="12" cy="12" r="2" fill="#fef08a" stroke="none"/>
          </svg>
        `,
      };

    case 'Excessive Tilt':
      return {
        type,
        label: 'Excessive Tilt',
        emoji: '📐',
        accentColor: '#d97706',
        bgClass: 'bg-gradient-to-br from-amber-500 to-yellow-600',
        pingClass: 'bg-amber-500/50',
        badgeBorder: 'border-amber-400/80',
        badgeText: 'text-amber-200',
        shortCode: 'TILT',
        svgHtml: `
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <!-- Base ground -->
            <path d="M2 20h20" stroke-width="2.2"/>
            <!-- Leaning column -->
            <path d="M8 20L15 4h4.5L12.5 20H8z" fill="rgba(255,255,255,0.25)" stroke-width="2"/>
            <!-- Tilt degree curve and arrow -->
            <path d="M6 11a7 7 0 0 1 5.5-6m0 0l-2 2m2-2L9.5 3.5" stroke="#fef08a" stroke-width="2.2"/>
          </svg>
        `,
      };

    case 'Excessive Displacement':
      return {
        type,
        label: 'Excessive Displacement',
        emoji: '↔️',
        accentColor: '#c026d3',
        bgClass: 'bg-gradient-to-br from-fuchsia-600 to-pink-700',
        pingClass: 'bg-fuchsia-500/50',
        badgeBorder: 'border-fuchsia-400/80',
        badgeText: 'text-fuchsia-200',
        shortCode: 'SHIFT',
        svgHtml: `
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <!-- Opposing expansion arrows -->
            <path d="M17 7l4 4-4 4M7 17l-4-4 4-4" stroke-width="2.2"/>
            <path d="M21 11H13M3 13h8" stroke-width="2.2"/>
            <!-- Center separation crack -->
            <path d="M12 3v18" stroke="#fef08a" stroke-dasharray="2 3" stroke-width="2.5"/>
          </svg>
        `,
      };

    case 'Excessive Strain':
      return {
        type,
        label: 'Excessive Strain',
        emoji: '⚡',
        accentColor: '#ea580c',
        bgClass: 'bg-gradient-to-br from-red-600 to-orange-700',
        pingClass: 'bg-red-500/50',
        badgeBorder: 'border-red-400/80',
        badgeText: 'text-red-200',
        shortCode: 'STRAIN',
        svgHtml: `
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <!-- Pressure gauge dial arc -->
            <path d="M4 17a9 9 0 1 1 16 0" stroke-width="2.2"/>
            <!-- Tension needle -->
            <path d="M12 14l5.5-6.5" stroke="#fef08a" stroke-width="2.6"/>
            <circle cx="12" cy="14" r="2.5" fill="currentColor"/>
            <!-- High strain tick mark warning -->
            <path d="M17.5 8.5l2-2" stroke="#ffffff" stroke-width="2.8"/>
          </svg>
        `,
      };

    case 'Other':
    default:
      return {
        type: type || 'Hazard',
        label: typeof type === 'string' && type ? type : 'Hazard Alert',
        emoji: '⚠️',
        accentColor: isCritical ? '#ef4444' : '#f59e0b',
        bgClass: isCritical ? 'bg-gradient-to-br from-red-600 to-rose-700' : 'bg-gradient-to-br from-amber-500 to-orange-600',
        pingClass: isCritical ? 'bg-red-500/50' : 'bg-amber-500/50',
        badgeBorder: isCritical ? 'border-red-500/80' : 'border-amber-500/80',
        badgeText: isCritical ? 'text-red-200' : 'text-amber-200',
        shortCode: 'ALERT',
        svgHtml: `
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        `,
      };
  }
}

/**
 * React Icon Component for rendering the custom hazard icon in JSX.
 */
export const HazardIconComponent: React.FC<{
  type: HazardType | string;
  severity?: HazardSeverity;
  className?: string;
}> = ({ type, severity, className = 'w-5 h-5' }) => {
  const visual = getHazardVisual(type, severity);
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: visual.svgHtml }}
    />
  );
};
