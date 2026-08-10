import { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Trees, Percent, Package, Ruler, CheckCircle2, AlertCircle,
  XCircle, Images, FileText, Award, Droplets, Sprout, MapPin,
} from 'lucide-react';
import type { VarietyEntry } from '@/types';
import { getPublicImageUrlByPath } from '@/services/opportunityService';
import { getDefaultVarietyImages } from '@/lib/varietyDefaultImages';
import VarietyImageSlider from './VarietyImageSlider';

type Props = {
  variety: VarietyEntry;
  totalPalms: number;
  saleModel?: string;
  index?: number;
};

const READINESS_META: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string; dot: string }> = {
  جاهز: { label: 'جاهز للجني', icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  يحتاج_تهيئة: { label: 'يحتاج تهيئة', icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  غير_جاهز: { label: 'غير جاهز', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
};

const QUALITY_META: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  extra: { label: 'فاخر', color: 'text-amber-700', bg: 'bg-gradient-to-l from-amber-50 to-amber-100/50 border-amber-200', ring: 'ring-amber-200' },
  grade_a: { label: 'درجة أولى', color: 'text-green-700', bg: 'bg-green-50 border-green-200', ring: 'ring-green-200' },
  grade_b: { label: 'درجة ثانية', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', ring: 'ring-blue-200' },
  standard: { label: 'عادي', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', ring: 'ring-gray-200' },
};

const IRRIGATION_META: Record<string, { label: string; icon: string }> = {
  drip: { label: 'تنقيط', icon: '💧' },
  bubbler: { label: 'فقاعات', icon: '⛲' },
  flood: { label: 'غمر', icon: '🌊' },
  well: { label: 'بئر', icon: '🚰' },
  mixed: { label: 'مختلط', icon: '🔀' },
};

function getReadinessMeta(status: string | undefined) {
  if (!status) return null;
  return READINESS_META[status] ?? READINESS_META[status.toLowerCase().replace(/\s+/g, '_')] ?? null;
}

function formatUnit(unit: string | undefined): string {
  if (!unit) return '';
  const map: Record<string, string> = {
    ton: 'طن', kilo: 'كيلو', kg: 'كيلو', piece: 'قطعة', box: 'صندوق', crate: 'قفص',
  };
  return map[unit.toLowerCase()] ?? unit;
}

export default function VarietyDetailCard({ variety, totalPalms, saleModel, index = 0 }: Props) {
  const [resolvedImages, setResolvedImages] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setImgLoaded(false);
    async function resolve() {
      const userImages = variety.images ?? [];
      if (userImages.length > 0) {
        const urls = await Promise.all(
          userImages.filter((p): p is string => p != null).map((p) => getPublicImageUrlByPath(p).catch(() => null)),
        );
        const valid = urls.filter((u): u is string => u != null);
        if (!cancelled) setResolvedImages(valid.length > 0 ? valid : getDefaultVarietyImages(variety.variety_id));
      } else {
        if (!cancelled) setResolvedImages(getDefaultVarietyImages(variety.variety_id));
      }
    }
    resolve();
    return () => { cancelled = true; };
  }, [variety.images, variety.variety_id]);

  const ratio = useMemo(() => {
    if (!totalPalms || totalPalms === 0) return null;
    return Math.round(((variety.palm_count ?? 0) / totalPalms) * 100);
  }, [variety.palm_count, totalPalms]);

  const readiness = getReadinessMeta(variety.readiness_status ?? undefined);
  const quality = variety.quality_grade ? QUALITY_META[variety.quality_grade] : null;
  const mainImage = resolvedImages[0] ?? null;
  const isFullHarvest = saleModel === 'full_harvest' || saleModel === 'whole_farm';
  const description = variety.description?.trim() || null;
  const isLongDesc = (description?.length ?? 0) > 160;
  const irrigation = variety.irrigation_source ? IRRIGATION_META[variety.irrigation_source] : null;

  return (
    <div
      className="group rounded-2xl border border-gray-200/80 overflow-hidden bg-white shadow-sm hover:shadow-xl hover:border-siwar-200 transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* ── Hero image ── */}
      {mainImage && (
        <div className="relative h-48 sm:h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
          <img
            src={mainImage}
            alt={variety.variety_name ?? 'صنف نخيل'}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-700 ${imgLoaded ? 'opacity-100 scale-100 group-hover:scale-110' : 'opacity-0 scale-105'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

          {/* Variety number badge */}
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center">
            <span className="text-xs font-bold text-gray-700">{index + 1}</span>
          </div>

          {/* Ratio badge */}
          {ratio !== null && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center gap-1">
              <Percent className="w-3 h-3 text-siwar-500" />
              <span className="text-xs font-bold text-gray-700">{ratio}%</span>
            </div>
          )}

          {/* Name + quality at bottom */}
          <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between gap-2">
            <h4 className="text-white text-lg font-bold drop-shadow-lg leading-tight">
              {variety.variety_name ?? 'صنف'}
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

      {/* ── Body ── */}
      <div className="p-4 space-y-3.5">
        {/* Header row: name (if no image) + gallery toggle */}
        {!mainImage && (
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-siwar-50 text-siwar-700 text-xs font-bold flex items-center justify-center border border-siwar-100">{index + 1}</span>
              <h4 className="text-base font-bold text-gray-800">{variety.variety_name ?? 'صنف نخيل'}</h4>
            </div>
            {quality && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${quality.bg} flex items-center gap-1`}>
                <Award className="w-3 h-3" />
                {quality.label}
              </span>
            )}
          </div>
        )}

        {/* Description — prominent */}
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
                    className="text-[11px] font-bold text-siwar-600 hover:text-siwar-700 mt-1.5 transition-colors flex items-center gap-1"
                  >
                    {expanded ? 'عرض أقل' : 'قراءة المزيد'}
                    <ChevronDownSmall flipped={expanded} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={Trees} label="عدد النخيل" value={(variety.palm_count ?? 0).toLocaleString('ar-EG')} />
          {ratio !== null && <StatTile icon={Percent} label="نسبة المزرعة" value={`${ratio}%`} />}
          {variety.expected_production && (
            <StatTile icon={Package} label="الإنتاج المتوقع" value={`${variety.expected_production} ${formatUnit(variety.production_unit ?? undefined)}`} />
          )}
          {variety.harvest_date && (
            <StatTile icon={Calendar} label="موعد الجني" value={variety.harvest_date} />
          )}
          {variety.age_years != null && (
            <StatTile icon={Sprout} label="عمر النخيل" value={`${variety.age_years} سنة`} />
          )}
          {irrigation && (
            <StatTile icon={Droplets} label="مصدر الري" value={irrigation.label} />
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

        {/* Gallery */}
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
                <VarietyImageSlider images={resolvedImages} alt={variety.variety_name ?? 'صنف نخيل'} />
              </div>
            )}
          </div>
        )}
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

function ChevronDownSmall({ flipped }: { flipped: boolean }) {
  return (
    <svg
      className={`w-3 h-3 transition-transform duration-200 ${flipped ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}
