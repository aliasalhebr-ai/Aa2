import { useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  images: string[];
  alt: string;
};

export default function VarietyImageSlider({ images, alt }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = dir === 'left' ? -120 : 120;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <>
      <div className="relative pt-1">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto fancy-scroll snap-x snap-mandatory pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setLightboxIndex(idx)}
              className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 snap-center group cursor-pointer"
            >
              <img
                src={url}
                alt={`${alt} - ${idx + 1}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
            </button>
          ))}
        </div>

        {images.length > 3 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); scroll('right'); }}
              className="absolute top-1/2 -translate-y-1/2 right-0 w-7 h-7 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
              aria-label="السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); scroll('left'); }}
              className="absolute top-1/2 -translate-y-1/2 left-0 w-7 h-7 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
              aria-label="التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center animate-fade-in"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-6 h-6" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev === null ? 0 : (prev + 1) % images.length
                  );
                }}
                className="absolute left-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                aria-label="التالي"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev === null ? 0 : (prev - 1 + images.length) % images.length
                  );
                }}
                className="absolute right-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                aria-label="السابق"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          <img
            src={images[lightboxIndex]}
            alt={`${alt} - ${lightboxIndex + 1}`}
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    idx === lightboxIndex ? 'bg-white w-6' : 'bg-white/40'
                  }`}
                  aria-label={`صورة ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
