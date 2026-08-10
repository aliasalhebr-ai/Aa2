import { X } from 'lucide-react';
import type { DiscoveryFilters, DiscoveryFilterChip } from '@/types/discovery';

type Props = {
  filters: DiscoveryFilters;
  chips: DiscoveryFilterChip[];
  onRemove: (filterKey: keyof DiscoveryFilters) => void;
  onClearAll: () => void;
};

export default function ActiveFilterChips({ filters, chips, onRemove, onClearAll }: Props) {
  if (chips.length === 0) return null;

  return (
    <div className="px-3 sm:px-4 py-1.5">
      <div className="no-scrollbar touch-scroll overflow-x-auto">
        <div className="flex gap-2 items-center" style={{ width: 'max-content' }}>
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => onRemove(chip.filterKey)}
              className="tap-scale flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-siwar-50 border border-siwar-200 text-xs font-medium text-siwar-700 hover:bg-siwar-100 transition-all flex-shrink-0"
            >
              <span className="text-siwar-500">{chip.label}:</span>
              <span>{chip.valueLabel}</span>
              <X className="w-3 h-3 text-siwar-400" />
            </button>
          ))}
          <button
            onClick={onClearAll}
            className="tap-scale flex items-center px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-medium text-red-600 hover:bg-red-100 transition-all flex-shrink-0"
          >
            مسح الكل
          </button>
        </div>
      </div>
    </div>
  );
}
