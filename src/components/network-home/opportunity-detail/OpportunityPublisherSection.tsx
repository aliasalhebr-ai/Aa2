import { BadgeCheck, MapPin, Building2 } from 'lucide-react';
import type { PublisherSummary } from '@/types';

type Props = {
  publisher: PublisherSummary;
};

export default function OpportunityPublisherSection({ publisher }: Props) {
  return (
    <div className="px-4 py-3">
      <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
        {/* Logo / avatar */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-siwar-100 to-siwar-200 flex items-center justify-center flex-shrink-0">
          {publisher.logo ? (
            <img src={publisher.logo} alt={publisher.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <span className="text-sm font-bold text-siwar-700">{publisher.name.charAt(0)}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-gray-800 truncate">{publisher.name}</p>
            {publisher.verified && (
              <BadgeCheck className="w-3.5 h-3.5 text-siwar-600 flex-shrink-0" fill="currentColor" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {publisher.entityType && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <Building2 className="w-2.5 h-2.5" />
                {publisher.entityType}
              </span>
            )}
            {publisher.city && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <MapPin className="w-2.5 h-2.5" />
                {publisher.city}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
