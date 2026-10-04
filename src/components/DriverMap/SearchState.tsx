import React, { useState, useRef, useEffect } from 'react';
import { INDIAN_STATES_28 } from '../../services/simulationGraph';
import { StateNode } from '../../types/simulationMap';

interface SearchStateProps {
  onSelectState: (stateName: string) => void;
  onSetSource: (stateName: string) => void;
  onSetDestination: (stateName: string) => void;
  sourceState: string;
  destinationState: string;
}

export const SearchState: React.FC<SearchStateProps> = ({
  onSelectState,
  onSetSource,
  onSetDestination,
  sourceState,
  destinationState,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter 28 states case-insensitively
  const filteredStates = query.trim()
    ? INDIAN_STATES_28.filter((s) =>
        s.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChooseState = (state: StateNode) => {
    onSelectState(state.name);
    setQuery(state.name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative flex items-center">
        <span className="absolute left-3 text-slate-400 text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search state..."
          className="w-full pl-9 pr-8 py-2 bg-[#161B22]/95 border border-[#30363D] hover:border-[#AEF5F0]/50 focus:border-[#AEF5F0] focus:ring-1 focus:ring-[#AEF5F0] rounded-xl text-xs text-white placeholder-slate-400 transition shadow-lg outline-none backdrop-blur-md"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 text-slate-400 hover:text-white text-xs p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && filteredStates.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl z-50 p-1 divide-y divide-[#21262D]">
          {filteredStates.map((state) => {
            const isSource = sourceState === state.name;
            const isDestination = destinationState === state.name;

            return (
              <div
                key={state.name}
                className="p-2 hover:bg-[#21262D] rounded-lg transition flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => handleChooseState(state)}
                  className="flex-1 text-left flex items-center gap-2 text-xs text-slate-200 hover:text-white"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: state.color || '#3b82f6' }}
                  />
                  <span className="font-medium">{state.name}</span>
                </button>

                {/* Quick Source / Destination actions right in search */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSetSource(state.name);
                      setIsOpen(false);
                    }}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition ${
                      isSource
                        ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                        : 'bg-[#21262D] hover:bg-emerald-600 text-slate-300 hover:text-white'
                    }`}
                    title="Set as Source"
                  >
                    Start
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSetDestination(state.name);
                      setIsOpen(false);
                    }}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition ${
                      isDestination
                        ? 'bg-red-950 border border-red-500 text-red-300'
                        : 'bg-[#21262D] hover:bg-red-600 text-slate-300 hover:text-white'
                    }`}
                    title="Set as Destination"
                  >
                    Dest
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
