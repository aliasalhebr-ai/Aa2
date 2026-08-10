import { ChevronLeft } from 'lucide-react';
import type { OpportunityDetailViewModel } from '@/types';

type Props = {
  vm: OpportunityDetailViewModel;
  onClose: () => void;
};

export default function OpportunityDetailHeader({ vm, onClose }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
      <button
        onClick={onClose}
        className="tap-scale p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
        aria-label="رجوع"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {vm.sectorLabel && (
            <span className="text-[10px] text-gray-400">{vm.sectorLabel}</span>
          )}
          {vm.subSectorLabel && (
            <>
              <span className="text-[10px] text-gray-300">/</span>
              <span className="text-[10px] text-gray-400">{vm.subSectorLabel}</span>
            </>
          )}
        </div>
        <p className="text-xs font-bold text-gray-800 truncate">{vm.title}</p>
      </div>
      <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-1 rounded ${vm.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
        {vm.statusLabel}
      </span>
    </div>
  );
}
