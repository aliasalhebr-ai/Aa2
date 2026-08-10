import { ChevronLeft } from 'lucide-react';
import type { Sector } from '@/types';

type Props = {
  sector: Sector | null;
  onViewAll: () => void;
};

export default function NetworkPulseHeader({ sector, onViewAll }: Props) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-2">
      <h3 className="text-base font-black text-gray-900">فرص متاحة الآن</h3>
      <button
        onClick={onViewAll}
        className="tap-scale flex items-center gap-1 text-sm font-bold text-siwar-600 hover:text-siwar-700 transition-colors"
      >
        عرض الكل
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  );
}
