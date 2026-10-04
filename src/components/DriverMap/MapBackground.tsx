import React, { useState } from 'react';

interface MapBackgroundProps {
  zoomLevel: number;
  panOffset: { x: number; y: number };
  children: React.ReactNode;
}

export const MapBackground: React.FC<MapBackgroundProps> = ({
  zoomLevel,
  panOffset,
  children,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0e14] flex items-center justify-center select-none">
      {/* Transform Wrapper for Smooth Zoom & Pan */}
      <div
        className="relative w-full max-w-[1920px] aspect-[16/9] transition-transform duration-200 ease-out origin-center shrink-0"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
        }}
      >
        {/* Fallback stylized terrain grid if image is loading */}
        <div
          className={`absolute inset-0 bg-gradient-to-b from-[#0D1520] via-[#0E1A1B] to-[#0A1215] transition-opacity duration-500 ${
            imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <div className="w-8 h-8 rounded-full border-2 border-[#AEF5F0]/30 border-t-[#AEF5F0] animate-spin mb-2" />
            <span>Loading RoutePilot Simulation Terrain...</span>
          </div>
        </div>

        {/* RoutePilot Map Background Image */}
        <img
          src="/routepilot_map.jpg"
          alt="RoutePilot Simulation Map"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none rounded-sm shadow-2xl filter brightness-[0.97] contrast-[1.03]"
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            // Fallback to asset path if root fails
            const target = e.currentTarget;
            if (target.src !== window.location.origin + '/src/assets/images/routepilot_map.jpg') {
              target.src = '/src/assets/images/routepilot_map.jpg';
            }
          }}
        />

        {/* Subtle vignette border around map to blend seamlessly into dark app frame */}
        <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-slate-800/40 rounded-sm" />

        {/* Interactive Children Layer (StateNodes, RouteOverlay, HazardOverlay) */}
        <div className="absolute inset-0 z-10">{children}</div>
      </div>
    </div>
  );
};
