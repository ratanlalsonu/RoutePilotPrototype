import React from 'react';

interface MapControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  return (
    <div className="absolute right-3 sm:right-4 top-16 sm:top-20 z-40 flex flex-col items-center bg-[#161B22]/95 backdrop-blur-xl border border-[#30363D] rounded-2xl shadow-2xl p-1 gap-1 select-none">
      {/* Zoom In */}
      <button
        type="button"
        onClick={onZoomIn}
        title="Zoom In (+)"
        disabled={zoomLevel >= 2.5}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:bg-[#21262D] disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95 cursor-pointer font-bold text-base"
        aria-label="Zoom in"
      >
        +
      </button>

      {/* Current Zoom Indicator */}
      <div className="text-[9px] font-mono text-[#AEF5F0] py-0.5 text-center">
        {Math.round(zoomLevel * 100)}%
      </div>

      {/* Zoom Out */}
      <button
        type="button"
        onClick={onZoomOut}
        title="Zoom Out (-)"
        disabled={zoomLevel <= 0.8}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:bg-[#21262D] disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95 cursor-pointer font-bold text-base"
        aria-label="Zoom out"
      >
        -
      </button>

      <div className="h-px w-5 bg-[#30363D] my-0.5" />

      {/* Reset View */}
      <button
        type="button"
        onClick={onResetView}
        title="Reset View"
        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-[#AEF5F0] hover:bg-[#21262D] transition active:scale-95 cursor-pointer"
        aria-label="Reset View"
      >
        <span className="text-xs">⟲</span>
      </button>
    </div>
  );
};
