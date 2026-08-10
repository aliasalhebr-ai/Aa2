import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { getPublicImageUrlByPath } from '@/services/opportunityService';

type Props = {
  itemImages: string[];
  itemCoverImage: string | null;
  fallbackImage: string | null;
};

const LOCAL_FALLBACK = '/card-fallback.webp';

export default function SelectedItemGallery({ itemImages, itemCoverImage, fallbackImage }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolvedUrls, setResolvedUrls] = useState<Record<number, string>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reset index when images change (item switched)
  useEffect(() => {
    setCurrentIndex(0);
  }, [itemImages.join(','), itemCoverImage]);

  const imageSources: string[] = [
    ...(itemCoverImage ? [itemCoverImage] : []),
    ...itemImages,
  ];
  const uniqueSources = [...new Set(imageSources.filter(Boolean))];
  const displayImages = uniqueSources.length > 0 ? uniqueSources : [fallbackImage ?? LOCAL_FALLBACK];

  // Resolve storage paths to public URLs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const newUrls: Record<number, string> = {};
      for (let i = 0; i < displayImages.length; i++) {
        if (cancelled) return;
        const src = displayImages[i];
        if (!src) continue;
        if (/^https?:\/\//.test(src)) {
          newUrls[i] = src;
        } else {
          const url = await getPublicImageUrlByPath(src);
          if (!cancelled && url) newUrls[i] = url;
        }
      }
      if (!cancelled) setResolvedUrls(newUrls);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayImages.join(',')]);

  const getDisplayUrl = (idx: number): string => {
    if (resolvedUrls[idx]) return resolvedUrls[idx];
    const src = displayImages[idx];
    if (src && /^https?:\/\//.test(src)) return src;
    return LOCAL_FALLBACK;
  };

  const canPrev = currentIndex > 0;
  const canNext = currentIndex < displayImages.length - 1;

  return (
    <>
      <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden flex-shrink-0">
        <img
          src={getDisplayUrl(currentIndex)}
          alt="صورة العنصر"
          loading="lazy"
          className="w-full h-full object-cover transition-opacity duration-300"
          onClick={() => displayImages.length > 1 && setLightboxOpen(true)}
        />

        {displayImages.length > 1 && (
          <>
            <button
              onClick={() => canPrev && setCurrentIndex(currentIndex - 1)}
              disabled={!canPrev}
              className="absolute top-1/2 right-2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm disabled:opacity-30 transition-opacity active:scale-90"
              aria-label="السابق"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => canNext && setCurrentIndex(currentIndex + 1)}
              disabled={!canNext}
              className="absolute top-1/2 left-2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm disabled:opacity-30 transition-opacity active:scale-90"
              aria-label="التالي"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>

            {/* Image counter badge */}
            <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full tabular-nums">
              {currentIndex + 1} / {displayImages.length}
            </div>

            {/* Expand button */}
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90 transition-transform"
              aria-label="تكبير"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails strip */}
      {displayImages.length > 1 && (
        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto bg-white" style={{ scrollbarWidth: 'none' }}>
          {displayImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                i === currentIndex
                  ? 'border-siwar-500 scale-105'
                  : 'border-transparent opacity-60'
              }`}
              aria-label={`صورة ${i + 1}`}
            >
              <img
                src={getDisplayUrl(i)}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white"
            onClick={() => setLightboxOpen(false)}
            aria-label="إغلاق"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={getDisplayUrl(currentIndex)}
            alt="صورة مكبرة"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {canPrev && (
            <button
              className="absolute top-1/2 right-4 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white active:scale-90"
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(currentIndex - 1); }}
              aria-label="السابق"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          {canNext && (
            <button
              className="absolute top-1/2 left-4 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white active:scale-90"
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(currentIndex + 1); }}
              aria-label="التالي"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
