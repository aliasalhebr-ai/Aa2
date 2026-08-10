import type { OpportunityCardViewModel, Company } from '@/types';
import { getScoreLabel, getScoreColor } from '@/types/matching';
import NetworkPulseCard from '@/components/network-home/NetworkPulseCard';

type Props = {
  viewModel: OpportunityCardViewModel;
  imageUrl: string | null;
  score: number;
  reasons: string[];
  onViewDetails: (vm: OpportunityCardViewModel) => void;
  onSave: (vm: OpportunityCardViewModel) => void;
  onCompanyClick: (vm: OpportunityCardViewModel) => void;
};

export default function MatchedOpportunityCard({
  viewModel,
  imageUrl,
  score,
  reasons,
  onViewDetails,
  onSave,
  onCompanyClick,
}: Props) {
  const label = getScoreLabel(score);
  const colorClass = getScoreColor(score);

  return (
    <div className="relative">
      {/* Match badge bar — sits above the card, doesn't alter the card itself */}
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colorClass} text-white text-[11px] font-bold shadow-sm`}>
          <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
          {label} — {score}%
        </div>
        {reasons.length > 0 && (
          <span className="text-[11px] text-gray-500 font-medium truncate">
            {reasons.slice(0, 2).join(' · ')}
          </span>
        )}
      </div>

      {/* The standard card — unmodified */}
      <NetworkPulseCard
        viewModel={viewModel}
        imageUrl={imageUrl}
        onViewDetails={onViewDetails}
        onSave={onSave}
        onCompanyClick={onCompanyClick}
      />
    </div>
  );
}
