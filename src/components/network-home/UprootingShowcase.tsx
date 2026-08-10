import { useState, useEffect, useRef } from 'react';
import {
  Trees, Ruler, Calendar, Package, MapPin, CheckCircle2, AlertCircle,
  XCircle, Heart, ShieldCheck, Sprout, CircleDollarSign, Tag, Images,
  FileText, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { UprootingVarietyEntry } from '@/types';
import { getPublicImageUrlByPath } from '@/services/opportunityService';
import { getPalmTreeImages, getVarietyIcon } from '@/lib/varietyDefaultImages';
import VarietyImageSlider from './VarietyImageSlider';

type Props = {
  varieties: UprootingVarietyEntry[];
  totalCount: number;
  operationType: string;
  location?: string | null;
};

const READINESS_META: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string; dot: string }> = {
  جاهز: { label: 'جاهزة للقلع', icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  'جاهزة للقلع': { label: 'جاهزة للقلع', icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  'مقلوعة وجاهزة للنقل': { label: 'مقلوعة وجاهزة للنقل', icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  'يحتاج تهيئة': { label: 'تحتاج تجهيز', icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  'تحتاج تجهيز': { label: 'تحتاج تجهيز', icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  'غير جاهز': { label: 'غير جاهزة', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  'غير جاهزة': { label: 'غير جاهزة', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  محجوز: { label: 'محجوزة', icon: XCircle, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-500' },
  'محجوزة': { label: 'محجوزة', icon: XCircle, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-500' },
};

const HEALTH_META: Record<string, { label: string; color: string; bg: string }> = {
  ممتازة: { label: 'ممتازة', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  جيدة: { label: 'جيدة', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  مقبولة: { label: 'مقبولة', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  'تحتاج عناية': { label: 'تحتاج عناية', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  'تم فحصها': { label: 'تم فحصها', color: 'text-siwar-700', bg: 'bg-siwar-50 border-siwar-100' },
};

const ROOT_META: Record<string, string> = {
  'جذور مكشوفة': 'جذور مكشوفة',
  'ملفوفة بالخيش': 'ملفوفة بالخيش',
  'داخل حاوية': 'داخل حاوية',
  'مجهزة للنقل': 'مجهزة للنقل',
  'أخرى': 'أخرى',
};

function getReadinessMeta(status: string | null | undefined) {
  if (!status) return null;
  return READINESS_META[status] ?? READINESS_META[status.toLowerCase().replace(/\s+/g, '_')] ?? null;
}

function getHealthMeta(status: string | null | undefined) {
  if (!status) return null;
  return HEALTH_META[status] ?? null;
}

function formatHeight(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}–${max} م`;
  if (min != null) return `${min} م فأكثر`;
  return `حتى ${max} م`;
}

function formatPriceDisplay(price: number | null, pricingType: string | null, count: number | null): string | null {
  if (pricingType === 'quote' || pricingType === 'طلب عرض سعر') return 'طلب عرض سعر';
  if (price == null || price === 0) return null;
  const formatted = price.toLocaleString('ar-EG');
  if (count != null && count > 1) return `${formatted} ريال للنقلة`;
  return `${formatted} ريال`;
}

export default function UprootingShowcase({ varieties, totalCount, operationType, location }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [resolvedImages, setResolvedImages] = useState<string[]>([]);
  const [mainImageIdx, setMainImageIdx] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = varieties[activeIdx];
  const isDemand = operationType === 'demand';

  const ratio = totalCount > 0 && active?.count != null
    ? Math.round((active.count / totalCount) * 100)
    : null;

  const readiness = getReadinessMeta(active?.readiness_status);
  const health = getHealthMeta(active?.health_status);
  const rootStatus = active?.root_status ? (ROOT_META[active.root_status] ?? active.root_status) : null;
  const heightStr = formatHeight(active?.min_height ?? null, active?.max_height ?? null);
  const priceStr = formatPriceDisplay(active?.price ?? null, active?.pricing_type ?? null, active?.count ?? null);
  const description = active?.description?.trim() || null;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setImgLoaded(false);
    setShowGallery(false);
    setMainImageIdx(0);
    async function resolve() {
      if (!active) return;
      const userImages = active.images ?? [];
      if (userImages.length > 0) {
        const urls = await Promise.all(
          userImages.map((p) => getPublicImageUrlByPath(p).catch(() => null)),
        );
        const valid = urls.filter((u): u is string => u != null);
        if (!cancelled) setResolvedImages(valid.length > 0 ? valid : getPalmTreeImages(active.variety_id));
      } else {
        if (!cancelled) setResolvedImages(getPalmTreeImages(active.variety_id));
      }
    }
    resolve();
    return () => { cancelled = true; };
  }, [active]);

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
  const mainImage = resolvedImages[mainImageIdx] ?? resolvedImages[0] ?? null;

  return (
    <div className="space-y-3">
      {/* ── Section header ── */}
      <div className="flex items-center gap-2">
        <Trees className="w-4 h-4 text-siwar-600" />
        <h3 className="text-sm font-bold text-gray-700">أصناف النقايل</h3>
        <span className="text-xs text-gray-400">
          ({varieties.length} صنف{totalCount > 0 ? ` · ${totalCount.toLocaleString('ar-EG')} نقلة` : ''})
        </span>
      </div>

      {/* ── Variety slider ── */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-2 fancy-scroll scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          {varieties.map((v, idx) => {
            const isActive = idx === activeIdx;
            const icon = getVarietyIcon(v.variety_id, v.variety_name);
            return (
              <button
                key={v.variety_id ?? v.variety_name ?? idx}
                ref={(el) => { iconRefs.current[idx] = el; }}
                onClick={() => switchVariety(idx)}
                className={`snap-center flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all duration-300 ${
                  isActive
                    ? 'bg-green-50 border-green-400 shadow-sm scale-105'
                    : 'bg-white border-gray-100 hover:border-green-200 hover:bg-green-50/30'
                }`}
              >
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden transition-all duration-300 ${
                  isActive ? 'bg-gradient-to-br from-green-100 to-green-200 shadow-inner' : 'bg-gray-50'
                }`}>
                  {icon}
                  {isActive && (
                    <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-bold whitespace-nowrap transition-colors ${
                  isActive ? 'text-green-700' : 'text-gray-500'
                }`}>
                  {v.variety_name ?? 'صنف'}
                </span>
                {v.count != null && (
                  <span className={`text-[9px] font-medium whitespace-nowrap ${
                    isActive ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {v.count.toLocaleString('ar-EG')} نقلة
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
                idx === activeIdx ? 'w-5 bg-green-500' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
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
                alt={active.variety_name ?? 'نقايل نخيل'}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-700 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

              {/* Nav arrows */}
              {resolvedImages.length > 1 && (
                <>
                  <button
                    onClick={() => setMainImageIdx((prev) => (prev - 1 + resolvedImages.length) % resolvedImages.length)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-colors z-10"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => setMainImageIdx((prev) => (prev + 1) % resolvedImages.length)}
                    className="absolute top-1/2 left-2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-colors z-10"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-700" />
                  </button>
                </>
              )}

              {/* Name + count at bottom */}
              <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between gap-2">
                <h4 className="text-white text-lg font-bold drop-shadow-lg leading-tight">
                  {active.variety_name ?? 'صنف'}
                </h4>
                {active.count != null && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-sm text-gray-700 shadow-sm">
                    {active.count.toLocaleString('ar-EG')} نقلة
                  </span>
                )}
              </div>

              {/* Image counter */}
              {resolvedImages.length > 1 && (
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium">
                  {mainImageIdx + 1} / {resolvedImages.length}
                </div>
              )}
            </div>
          )}

          {/* Body */}
          <div className="p-4 space-y-3.5">
            {/* Name (if no image) */}
            {!mainImage && (
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-lg">
                    {getVarietyIcon(active.variety_id, active.variety_name)}
                  </span>
                  <h4 className="text-base font-bold text-gray-800">{active.variety_name ?? 'نقايل نخيل'}</h4>
                </div>
                {active.count != null && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                    {active.count.toLocaleString('ar-EG')} نقلة
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {description && (
              <div className="relative rounded-xl bg-gradient-to-l from-green-50/80 to-siwar-50/40 border border-green-100/60 p-3.5 overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-100/20 rounded-full blur-2xl -translate-y-6 translate-x-4" />
                <div className="relative flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-green-600 mb-1">وصف الصنف</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <StatTile icon={Trees} label={isDemand ? 'العدد المطلوب' : 'عدد النقايل'} value={active.count != null ? active.count.toLocaleString('ar-EG') : null} />
              {ratio !== null && <StatTile icon={Package} label="نسبة العرض" value={`${ratio}%`} />}
              {heightStr && <StatTile icon={Ruler} label="نطاق الارتفاع" value={heightStr} />}
              {active.trunk_diameter != null && <StatTile icon={Ruler} label="قطر الجذع" value={`${active.trunk_diameter} سم`} />}
              {active.age_years != null && <StatTile icon={Sprout} label="العمر التقريبي" value={`${active.age_years} سنة`} />}
              {active.uprooting_date && <StatTile icon={Calendar} label="موعد الجاهزية" value={active.uprooting_date} />}
              {priceStr && <StatTile icon={CircleDollarSign} label="السعر" value={priceStr} />}
              {active.pricing_type === 'quote' && !priceStr && <StatTile icon={Tag} label="طريقة البيع" value="طلب عرض سعر" />}
              {location && <StatTile icon={MapPin} label="الموقع" value={location} />}
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
              {health && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${health.bg}`}>
                  <Heart className={`w-3.5 h-3.5 ${health.color}`} />
                  <span className={`text-xs font-bold ${health.color}`}>{health.label}</span>
                </div>
              )}
              {rootStatus && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-siwar-50 border-siwar-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-siwar-600" />
                  <span className="text-xs font-bold text-siwar-700">{rootStatus}</span>
                </div>
              )}
            </div>

            {/* Gallery */}
            {resolvedImages.length > 1 && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowGallery((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold border border-green-100 hover:bg-green-100 transition-colors w-full justify-center"
                >
                  <Images className="w-3.5 h-3.5" />
                  {showGallery ? 'إخفاء معرض الصور' : `عرض معرض الصور (${resolvedImages.length})`}
                </button>
                {showGallery && (
                  <div className="mt-2.5 animate-fade-in">
                    <VarietyImageSlider
                      images={resolvedImages}
                      alt={active.variety_name ?? 'نقايل نخيل'}
                    />
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

function StatTile({ icon: Icon, label, value }: { icon: typeof Trees; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50/80 border border-gray-100/80 hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm">
        <Icon className="w-4 h-4 text-green-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
        <p className="text-sm font-bold text-gray-800 truncate leading-tight">{value}</p>
      </div>
    </div>
  );
}
