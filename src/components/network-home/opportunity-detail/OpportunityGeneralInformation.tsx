import { MapPin, Clock, Calendar } from 'lucide-react';
import type { OpportunityDetailViewModel } from '@/types';
import type { OpportunityFormat } from '@/lib/opportunityFormatResolver';

type Props = {
  vm: OpportunityDetailViewModel;
  format: OpportunityFormat;
};

export default function OpportunityGeneralInformation({ vm, format }: Props) {
  return (
    <div className="px-4 pt-3 pb-2">
      <h1 className="text-lg font-bold text-gray-900 leading-snug">{vm.title}</h1>

      {vm.fullDescription && (
        <p className="text-sm text-gray-500 leading-relaxed mt-1.5 line-clamp-2">{vm.fullDescription}</p>
      )}

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${vm.opportunityTypePresentation.style.bg} ${vm.opportunityTypePresentation.style.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${vm.opportunityTypePresentation.style.dot}`} />
          {vm.opportunityTypeLabel}
        </span>

        {vm.sectorLabel && (
          <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-1 rounded">{vm.sectorLabel}</span>
        )}

        {vm.subSectorLabel && (
          <span className="text-[11px] text-siwar-600 bg-siwar-50 px-2 py-1 rounded">{vm.subSectorLabel}</span>
        )}

        <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded">{format.label}</span>
      </div>

      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {vm.location && (
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <MapPin className="w-3 h-3" />
            {vm.location}
          </span>
        )}
        {vm.opportunityTimingLabel && (
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Clock className="w-3 h-3" />
            {vm.opportunityTimingLabel}
          </span>
        )}
        {vm.createdAt && (
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Calendar className="w-3 h-3" />
            {new Date(vm.createdAt).toLocaleDateString('ar-SA')}
          </span>
        )}
      </div>
    </div>
  );
}
