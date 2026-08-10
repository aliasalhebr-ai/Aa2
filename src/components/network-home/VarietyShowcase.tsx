import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar, Trees, Percent, Package, Ruler, CheckCircle2, AlertCircle,
  XCircle, Images, FileText, Award, Droplets, Sprout, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { VarietyEntry } from '@/types';
import { getPublicImageUrlByPath } from '@/services/opportunityService';
import { getDefaultVarietyImages, getVarietyIcon } from '@/lib/varietyDefaultImages';
import VarietyImageSlider from './VarietyImageSlider';

type Props = {
  varieties: VarietyEntry[];
  totalPalms: number;
  saleModel?: string;
};

const READINESS_META: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string; dot: string }> = {
  جاهز: { label: 'جاهز للجني', icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  يحتاج_تهيئة: { label: 'يحتاج تهيئة', icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  غير_جاهز: { label: 'غير جاهز', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
};

const QUALITY_META: Record<string, { label: string; color: string; bg: string }> = {
  extra: { label: 'فاخر', color: 'text-amber-700', bg: 'bg-gradient-to-l from-amber-50 to-amber-100/50 border-amber-200' },
  grade_a: { label: 'درجة أولى', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  grade_b: { label: 'درجة ثانية', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  standard: { label: 'عادي', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
};

const IRRIGATION_META: Record<string, string> = {
  drip: 'تنقيط', bubbler: 'فقاعات', flood: 'غمر', well: 'بئر', mixed: 'مختلط',
};

function getReadinessMeta(status: string | undefined) {
  if (!status) return null;
  return READINESS_META[status] ?? READINESS_META[status.toLowerCase().replace(/\s+/g, '_')] ?? null;
}

function formatUnit(unit: string | undefined): string {
  if (!unit) return '';
  const map: Record<string, string> = { ton: 'طن', kilo: 'كيلو', kg: 'كيلو', piece: 'قطعة', box: 'صندوق', crate: 'قفص' };
  return map[unit.toLowerCase()] ?? unit;
}

export default function VarietyShowcase({ varieties, totalPalms, saleModel }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [resolvedImages, setResolvedImages] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = varieties[activeIdx];
  const isFullHarvest = saleModel === 'full_harvest' || saleModel === 'whole_farm';

  const ratio = useMemo(() => {
    if (!totalPalms || totalPalms === 0) return null;
    return Math.round(((active?.palm_count ?? 0) / totalPalms) * 100);
  }, [active?.palm_count, totalPalms]);

  const readiness = getReadinessMeta(active?.readiness_status ?? undefined);
  const quality = active?.quality_grade ? QUALITY_META[active.quality_grade] : null;
  const irrigation = active?.irrigation_source ? IRRIGATION_META[active.irrigation_source] : null;
  const description = active?.description?.trim() || null;
  const isLongDesc = (description?.length ?? 0) > 160;

  // Resolve images for active variety
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setImgLoaded(false);
    setShowGallery(false);
    setExpanded(false);
    async function resolve() {
      if (!active) return;
      const userImages = active.images ?? [];
      if (userImages.length > 0) {
        const urls = await Promise.all(
          userImages.filter((p): p is string => p != null).map((p) => getPublicImageUrlByPath(p).catch(() => null)),
        );
        const valid = urls.filter((u): u is string => u != null);
        if (!cancelled) setResolvedImages(valid.length > 0 ? valid : getDefaultVarietyImages(active.variety_id));
      } else {
        if (!cancelled) setResolvedImages(getDefaultVarietyImages(active.variety_id));
      }
    }
    resolve();
    return () => { cancelled = true; };
  }, [active]);

  // Scroll active icon into view within the slider only (not parent containers)
  useEffect(() => {
    const container = scrollRef.current;
    const el = iconRefs.current[activeIdx];
    if (!container || !el) return;
    const target = el.offsetLeft - (container.clientWidth - el.clientWidth) / 2;
    container.scrollTo({ left: target, behavior: 'smooth' });
  }, [activeIdx]);

  const switchVariety = (idx: number) => {
    if (idx === activeIdx) return;
    setIsAnimating(true);
    setActiveIdx(idx);
    setTimeout(() => setIsAnimating(false), 50);
  };

  const goPrev = () => switchVariety((activeIdx - 1 + varieties.length) % varieties.length);
  const goNext = () => switchVariety((activeIdx + 1) % varieties.length);

  if (!active) return null;
  const mainImage = resolvedImages[0] ?? null;

  return (
    <div className="space-y-3">
      {/* ── Section header ── */}
      <div className="flex items-center gap-2">
        <Trees className="w-4 h-4 text-siwar-600" />
        <h3 className="text-sm font-bold text-gray-700">{isFullHarvest ? 'أصناف المزرعة' : 'الأصناف'}</h3>
        <span className="text-xs text-gray-400">
          ({varieties.length} صنف{isFullHarvest && totalPalms > 0 ? ` · ${totalPalms.toLocaleString('ar-EG')} نخلة` : ''})
        </span>
      </div>

      {/* ── Icon slider ── */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-2 fancy-scroll scroll-smooth snap-x snap-mandatory"
        >
          {varieties.map((v, idx) => {
            const isActive = idx === activeIdx;
            const icon = getVarietyIcon(v.variety_id, v.variety_name);
            return (
              <button
                key={v.variety_id ?? v.variety_name ?? idx}
                ref={(el) => { iconRefs.current[idx] = el; }}
                onClick={() => switchVariety(idx)}
                className={`snap-center flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all duration-300 ${
                  isActive
                    ? 'bg-siwar-50 border-siwar-300 shadow-sm scale-105'
                    : 'bg-white border-gray-100 hover:border-siwar-200 hover:bg-siwar-50/30'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
                  isActive ? 'bg-gradient-to-br from-siwar-100 to-siwar-200 shadow-inner' : 'bg-gray-50'
                }`}>
                  {icon}
                </div>
                <span className={`text-[11px] font-bold whitespace-nowrap transition-colors ${
                  isActive ? 'text-siwar-700' : 'text-gray-500'
                }`}>
                  {v.variety_name ?? 'صنف'}
                </span>
                {v.palm_count != null && isFullHarvest && (
                  <span className={`text-[9px] font-medium whitespace-nowrap ${
                    isActive ? 'text-siwar-500' : 'text-gray-400'
                  }`}>
                    {v.palm_count.toLocaleString('ar-EG')} نخلة
                  </span>
                )}
                {v.expected_production && !isFullHarvest && (
                  <span className={`text-[9px] font-medium whitespace-nowrap ${
                    isActive ? 'text-siwar-500' : 'text-gray-400'
                  }`}>
                    {v.expected_production} {formatUnit(v.production_unit ?? undefined)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Edge fade indicators */}
        <div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      </div>

      {/* ── Dots indicator ── */}
      {varieties.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {varieties.map((_, idx) => (
            <button
              key={idx}
              onClick={() => switchVariety(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIdx ? 'w-5 bg-siwar-500' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Detail card ── */}
      <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
        <div className="rounded-2xl border border-gray-200/80 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
          {/* Hero image */}
          {mainImage && (
            <div className="relative h-48 sm:h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
              {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
              <img
                src={mainImage}
                alt={active.variety_name ?? 'صنف نخيل'}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-700 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

              {/* Nav arrows */}
              {varieties.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute top-1/2 right-2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-colors z-10"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute top-1/2 left-2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-colors z-10"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-700" />
                  </button>
                </>
              )}

              {/* Name + quality */}
              <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between gap-2">
                <h4 className="text-white text-lg font-bold drop-shadow-lg leading-tight">
                  {active.variety_name ?? 'صنف'}
                </h4>
                {quality && (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${quality.bg} backdrop-blur-sm flex items-center gap-1 shadow-sm`}>
                    <Award className="w-3 h-3" />
                    {quality.label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="p-4 space-y-3.5">
            {/* Name (if no image) */}
            {!mainImage && (
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-siwar-50 flex items-center justify-center text-lg">
                    {getVarietyIcon(active.variety_id, active.variety_name)}
                  </span>
                  <h4 className="text-base font-bold text-gray-800">{active.variety_name ?? 'صنف نخيل'}</h4>
                </div>
                {quality && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${quality.bg} flex items-center gap-1`}>
                    <Award className="w-3 h-3" />
                    {quality.label}
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {description && (
              <div className="relative rounded-xl bg-gradient-to-l from-siwar-50/80 to-amber-50/40 border border-siwar-100/60 p-3.5 overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-siwar-100/20 rounded-full blur-2xl -translate-y-6 translate-x-4" />
                <div className="relative flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-siwar-100 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-siwar-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-siwar-600 mb-1">وصف الصنف</p>
                    <p className={`text-xs text-gray-700 leading-relaxed ${!expanded && isLongDesc ? 'line-clamp-3' : ''}`}>
                      {description}
                    </p>
                    {isLongDesc && (
                      <button
                        onClick={() => setExpanded((v) => !v)}
                        className="text-[11px] font-bold text-siwar-600 hover:text-siwar-700 mt-1.5 transition-colors"
                      >
                        {expanded ? 'عرض أقل' : 'قراءة المزيد'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              {isFullHarvest && (
                <StatTile icon={Trees} label="عدد النخيل" value={(active.palm_count ?? 0).toLocaleString('ar-EG')} />
              )}
              {ratio !== null && isFullHarvest && <StatTile icon={Percent} label="نسبة المزرعة" value={`${ratio}%`} />}
              {active.expected_production && (
                <StatTile icon={Package} label={isFullHarvest ? 'الإنتاج المتوقع' : 'الكمية'} value={`${active.expected_production} ${formatUnit(active.production_unit ?? undefined)}`} />
              )}
              {active.harvest_date && (
                <StatTile icon={Calendar} label="موعد الجني" value={active.harvest_date} />
              )}
              {active.age_years != null && (
                <StatTile icon={Sprout} label="عمر النخيل" value={`${active.age_years} سنة`} />
              )}
              {irrigation && (
                <StatTile icon={Droplets} label="مصدر الري" value={irrigation} />
              )}
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {readiness && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${readiness.bg}`}>
                  <span className={`w-2 h-2 rounded-full ${readiness.dot} animate-pulse`} />
                  <readiness.icon className={`w-3.5 h-3.5 ${readiness.color}`} />
                  <span className={`text-xs font-bold ${readiness.color}`}>{readiness.label}</span>
                </div>
              )}
              {isFullHarvest && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-siwar-50 border-siwar-200">
                  <Ruler className="w-3.5 h-3.5 text-siwar-600" />
                  <span className="text-xs font-bold text-siwar-700">مشمول في بيع المزرعة كاملًا</span>
                </div>
              )}
            </div>

            {/* Gallery toggle */}
            {resolvedImages.length > 1 && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowGallery((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-siwar-50 text-siwar-700 text-xs font-bold border border-siwar-100 hover:bg-siwar-100 transition-colors w-full justify-center"
                >
                  <Images className="w-3.5 h-3.5" />
                  {showGallery ? 'إخفاء معرض الصور' : `عرض معرض الصور (${resolvedImages.length})`}
                </button>
                {showGallery && (
                  <div className="mt-2.5 animate-fade-in">
                    <VarietyImageSlider images={resolvedImages} alt={active.variety_name ?? 'صنف نخيل'} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Trees; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50/80 border border-gray-100/80 hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm">
        <Icon className="w-4 h-4 text-siwar-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
        <p className="text-sm font-bold text-gray-800 truncate leading-tight">{value}</p>
      </div>
    </div>
  );
}
