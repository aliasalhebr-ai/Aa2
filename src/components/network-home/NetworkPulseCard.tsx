import { useState, useEffect, memo } from 'react';
import {
  Bookmark, Clock, ArrowLeft, Share2,
} from 'lucide-react';
import type { OpportunityCardViewModel, CardIndicator } from '@/types';
import { timeAgo } from '@/lib/cardFormatters';
import { getPublicOpportunityImageUrl, getPublicImageUrlByPath } from '@/services/opportunityService';

type Props = {
  viewModel: OpportunityCardViewModel;
  imageUrl: string | null;
  imageCount?: number;
  onViewDetails: (vm: OpportunityCardViewModel) => void;
  onSave: (vm: OpportunityCardViewModel) => void;
  onShare?: (vm: OpportunityCardViewModel) => void;
  onCompanyClick?: (vm: OpportunityCardViewModel) => void;
};

const FALLBACK_IMAGE = '/card-fallback.webp';

function NetworkPulseCardInner({
  viewModel: vm,
  imageUrl,
  imageCount,
  onViewDetails,
  onSave,
  onShare,
}: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    setImgLoaded(false);
    let cancelled = false;

    async function resolve() {
      if (imageUrl && /^https?:\/\//.test(imageUrl)) {
        if (!cancelled) setResolvedUrl(imageUrl);
        return;
      }
      if (imageUrl) {
        const url = vm.templateVersion >= 2
          ? await getPublicOpportunityImageUrl(vm.id, 0)
          : await getPublicImageUrlByPath(imageUrl);
        if (!cancelled && url) setResolvedUrl(url);
        return;
      }
      if (!cancelled) setResolvedUrl(null);
    }

    resolve();
    return () => { cancelled = true; };
  }, [imageUrl, vm.id, vm.templateVersion]);

  const displayImage = resolvedUrl ?? FALLBACK_IMAGE;

  const isDemand = vm.opportunityType === 'demand' || vm.opportunityType === 'احتياج';
  const isPartnership = vm.opportunityType === 'partnership';

  const badgeBg = isDemand
    ? '#1a3a6e'
    : isPartnership
    ? '#5b21b6'
    : '#1b5e35';

  const accentColor = isDemand ? '#1a3a6e' : '#1b5e35';

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved((v) => !v);
    onSave(vm);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(vm);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onViewDetails(vm);
    }
  };

  const indicators = vm.indicators.slice(0, 3);
  const hasDescription = vm.descriptionPreview && vm.descriptionPreview.trim().length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onViewDetails(vm)}
      onKeyDown={handleKeyDown}
      className="group relative w-full text-right bg-white rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.99] spring-in flex cursor-pointer"
      style={{
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: '1px solid #e8ece9',
        minHeight: '280px',
      }}
    >
      {/* ── IMAGE — RIGHT side ── */}
      <div
        className="relative flex-shrink-0 self-stretch overflow-hidden bg-gray-100"
        style={{ width: '38%' }}
      >
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}
        <img
          src={displayImage}
          alt={vm.title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.04] ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {imageCount != null && imageCount > 0 && (
          <div
            className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-white text-[10px] font-bold"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          >
            {imageCount} صور
          </div>
        )}
      </div>

      {/* ── CONTENT — LEFT side ── */}
      <div className="flex-1 min-w-0 flex flex-col justify-between p-3.5" style={{ gap: '10px' }}>

        {/* Top section: badge + time + title + chips */}
        <div className="flex flex-col" style={{ gap: '10px' }}>

          {/* Row 1: Type badge + time */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-md text-white text-xs font-bold flex-shrink-0"
              style={{ background: badgeBg }}
            >
              {vm.opportunityTypeLabel}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-normal">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span className="whitespace-nowrap">{timeAgo(vm.publishedAt)}</span>
            </div>
          </div>

          {/* Row 2: Title */}
          <h3
            className="text-gray-900 font-black line-clamp-2 leading-snug"
            style={{ fontSize: '16px', lineHeight: '1.35' }}
          >
            {vm.title}
          </h3>

          {/* Row 3: Branch + variety chips */}
          <div className="flex flex-wrap gap-1.5">
            {vm.sectorLabel && (
              <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                {vm.sectorLabel}
              </span>
            )}
            {vm.subSectorLabel && (
              <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full text-white font-medium"
                style={{ background: accentColor }}
              >
                {vm.subSectorLabel}
              </span>
            )}
          </div>

          {/* Row 4: Indicators — ad-like inline chips */}
          {indicators.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 pt-0.5">
              {indicators.map((ind: CardIndicator, i: number) => (
                <div key={ind.key} className="flex items-center gap-1">
                  {i > 0 && <span className="text-gray-300 text-xs font-bold">•</span>}
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 font-normal leading-none">{ind.label}</span>
                    <span className="text-xs font-bold text-gray-800 leading-tight">{ind.formattedValue}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Row 5: Description */}
          {hasDescription && (
            <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
              {vm.descriptionPreview}
            </p>
          )}
        </div>

        {/* Footer — always at bottom, consistent spacing */}
        <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${saved ? 'text-siwar-700' : 'text-gray-400'}`}
              aria-label="حفظ"
            >
              <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleShare}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
              aria-label="مشاركة"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          <span
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 group-hover:bg-gray-50"
            style={{ border: '1.5px solid #ccc', color: '#333' }}
          >
            عرض التفاصيل
            <ArrowLeft className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

const NetworkPulseCard = memo(NetworkPulseCardInner);
export default NetworkPulseCard;
