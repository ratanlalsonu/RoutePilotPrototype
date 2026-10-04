import React from 'react';
import { INDIAN_STATES_28 } from '../../services/simulationGraph';

interface DestinationSelectorProps {
  value: string;
  onChange: (stateName: string) => void;
  disabledValue?: string;
}

export const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  value,
  onChange,
  disabledValue,
}) => {
  return (
    <div className="flex flex-col gap-1 min-w-[130px] sm:min-w-[150px]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
        <span>Destination</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 bg-[#161B22]/95 border border-red-500/40 hover:border-red-400 focus:border-red-400 rounded-xl text-xs text-white outline-none cursor-pointer shadow backdrop-blur-md"
      >
        <option value="" disabled>
          [ Select State ]
        </option>
        {INDIAN_STATES_28.map((s) => (
          <option key={s.name} value={s.name} disabled={s.name === disabledValue}>
            {s.name} {s.name === disabledValue ? '(Source)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
