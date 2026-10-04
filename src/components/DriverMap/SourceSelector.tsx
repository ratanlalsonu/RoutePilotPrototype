import React from 'react';
import { INDIAN_STATES_28 } from '../../services/simulationGraph';

interface SourceSelectorProps {
  value: string;
  onChange: (stateName: string) => void;
  disabledValue?: string;
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({
  value,
  onChange,
  disabledValue,
}) => {
  return (
    <div className="flex flex-col gap-1 min-w-[130px] sm:min-w-[150px]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
        <span>Source</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 bg-[#161B22]/95 border border-emerald-500/40 hover:border-emerald-400 focus:border-emerald-400 rounded-xl text-xs text-white outline-none cursor-pointer shadow backdrop-blur-md"
      >
        <option value="" disabled>
          [ Select State ]
        </option>
        {INDIAN_STATES_28.map((s) => (
          <option key={s.name} value={s.name} disabled={s.name === disabledValue}>
            {s.name} {s.name === disabledValue ? '(Destination)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
