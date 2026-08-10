import { useState, useEffect, useRef } from 'react';
import {
  Recycle, Scale, Hash, FileText, Package, MapPin, Calendar, CheckCircle2,
  AlertCircle, Ruler, Layers, Truck, Users, Wrench, CircleDollarSign, Tag,
  Images, ChevronLeft, ChevronRight, Sprout, Leaf, Boxes, ClipboardList, Clock,
} from 'lucide-react';
import type { ResidueEntry } from '@/types';
import { getPublicImageUrlByPath } from '@/services/opportunityService';
import { getResidueImages, getResidueIcon } from '@/lib/varietyDefaultImages';
import { formatResidueType } from '@/lib/cardFormatters';
import VarietyImageSlider from './VarietyImageSlider';

type Props = {
  residues: ResidueEntry[];
  location?: string | null;
};

const CONDITION_META: Record<string, { label: string; color: string; bg: string }> = {
  طازج: { label: 'طازج', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  طازجة: { label: 'طازجة', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  جاف: { label: 'جاف', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  جافة: { label: 'جافة', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  'شبه جاف': { label: 'شبه جاف', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  'شبه جافة': { label: 'شبه جافة', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  مختلط: { label: 'مختلط', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  مخلوطة: { label: 'مخلوطة', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  مفروم: { label: 'مفروم', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  'مربوط في حزم': { label: 'مربوط في حزم', color: 'text-siwar-700', bg: 'bg-siwar-50 border-siwar-100' },
  'غير مفرز': { label: 'غير مفرز', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
};

const PREPARATION_META: Record<string, { label: string; color: string; bg: string }> = {
  كامل: { label: 'كامل', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  مقطع: { label: 'مقطع', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  مفروم: { label: 'مفروم', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  'مربوط في حزم': { label: 'مربوط في حزم', color: 'text-siwar-700', bg: 'bg-siwar-50 border-siwar-100' },
  مكبوس: { label: 'مكبوس', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  'غير مجهز': { label: 'غير مجهز', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
};

const SOURCE_LABELS: Record<string, string> = {
  pruning: 'ناتج عن التقليم',
  تكريب: 'ناتج عن التكريب',
  تقليم: 'ناتج عن التقليم',
  uprooting: 'ناتج عن قلع نخيل',
  'قلع نخيل': 'ناتج عن قلع نخيل',
  seasonal: 'مخلفات موسمية',
  'مخلفات موسمية': 'مخلفات موسمية',
  accumulated: 'مخلفات متراكمة',
  'مخلفات متراكمة': 'مخلفات متراكمة',
};

const USE_LABELS: Record<string, string> = {
  feed: 'أعلاف',
  أعلاف: 'أعلاف',
  compost: 'سماد عضوي',
  'سماد عضوي': 'سماد عضوي',
  boards: 'تصنيع ألواح',
  'تصنيع ألواح': 'تصنيع ألواح',
  fuel: 'حطب أو وقود حيوي',
  'حطب أو وقود حيوي': 'حطب أو وقود حيوي',
  crafts: 'أعمال حرفية',
  'أعمال حرفية': 'أعمال حرفية',
  recycling: 'إعادة تدوير',
  'إعادة تدوير': 'إعادة تدوير',
  unspecified: 'استخدام غير محدد',
  'استخدام غير محدد': 'استخدام غير محدد',
};

const WEIGHT_UNIT_LABELS: Record<string, string> = {
  kg: 'كجم',
  ton: 'طن',
};

const COUNT_UNIT_LABELS: Record<string, string> = {
  piece: 'قطعة',
  bunch: 'حزمة',
  box: 'صندوق',
};

function getConditionMeta(status: string | null | undefined) {
  if (!status) return null;
  return CONDITION_META[status] ?? CONDITION_META[status.toLowerCase().replace(/\s+/g, '_')] ?? null;
}

function getPreparationMeta(status: string | null | undefined) {
  if (!status) return null;
  return PREPARATION_META[status] ?? PREPARATION_META[status.toLowerCase().replace(/\s+/g, '_')] ?? null;
}

function formatWeight(value: number | null, unit: string | null): string | null {
  if (value == null) return null;
  const unitLabel = unit ? (WEIGHT_UNIT_LABELS[unit] ?? unit) : '';
  return `${value.toLocaleString('ar-EG')} ${unitLabel}`.trim();
}

function formatCount(value: number | null, unit: string | null): string | null {
  if (value == null) return null;
  const unitLabel = unit ? (COUNT_UNIT_LABELS[unit] ?? unit) : 'قطعة';
  return `${value.toLocaleString('ar-EG')} ${unitLabel}`;
}

function formatPriceDisplay(price: number | null, pricingType: string | null, quantityMethod: string | null, weightUnit: string | null): string | null {
  if (pricingType === 'quote' || pricingType === 'طلب عرض سعر') return 'طلب عرض سعر';
  if (pricingType === 'free' || pricingType === 'مجانًا مقابل النقل') return 'مجانًا مقابل النقل والتحميل';
  if (price == null || price === 0) return null;
  const formatted = price.toLocaleString('ar-EG');
  if (quantityMethod === 'weight') {
    const unitLabel = weightUnit ? (WEIGHT_UNIT_LABELS[weightUnit] ?? weightUnit) : 'طن';
    return `${formatted} ريال لل${unitLabel}`;
  }
  if (quantityMethod === 'count') return `${formatted} ريال للقطعة`;
  return `${formatted} ريال`;
}

function formatQuantitySummary(r: ResidueEntry): string | null {
  if (r.quantity_method === 'weight') {
    const w = formatWeight(r.weight_value, r.weight_unit);
    return w ? `${w}` : null;
  }
  if (r.quantity_method === 'count') {
    const c = formatCount(r.count_value, r.count_unit);
    return c ?? null;
  }
  if (r.quantity_method === 'manual_desc') {
    return r.manual_quantity_desc ? 'كمية تقديرية' : null;
  }
  return null;
}

const QUANTITY_METHOD_LABELS: Record<string, string> = {
  weight: 'بالوزن',
  count: 'بالعدد',
  manual_desc: 'وصف يدوي',
};

export default function ResidueShowcase({ residues, location }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [resolvedImages, setResolvedImages] = useState<string[]>([]);
  const [mainImageIdx, setMainImageIdx] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = residues[activeIdx];

  const condition = getConditionMeta(active?.residue_condition);
  const preparation = getPreparationMeta(active?.preparation_form);
  const quantityMethod = active?.quantity_method ?? null;
  const quantityMethodLabel = quantityMethod ? (QUANTITY_METHOD_LABELS[quantityMethod] ?? quantityMethod) : null;
  const priceStr = formatPriceDisplay(active?.price ?? null, active?.pricing_type ?? null, quantityMethod, active?.weight_unit ?? null);
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
        if (!cancelled) setResolvedImages(valid.length > 0 ? valid : getResidueImages(active.residue_type));
      } else {
        if (!cancelled) setResolvedImages(getResidueImages(active.residue_type));
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

  const switchResidue = (idx: number) => {
    if (idx === activeIdx) return;
    setIsAnimating(true);
    setActiveIdx(idx);
    setTimeout(() => setIsAnimating(false), 50);
  };

  if (!active) return null;
  const mainImage = resolvedImages[mainImageIdx] ?? resolvedImages[0] ?? null;
  const residueLabel = active.residue_label ?? formatResidueType(active.residue_type);
  const quantitySummary = formatQuantitySummary(active);

  return (
    <div className="space-y-3">
      {/* ── Section header ── */}
      <div className="flex items-center gap-2">
        <Recycle className="w-4 h-4 text-amber-600" />
        <h3 className="text-sm font-bold text-gray-700">أنواع المخلفات</h3>
        <span className="text-xs text-gray-400">({residues.length} نوع)</span>
      </div>

      {/* ── Residue type slider ── */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-2 fancy-scroll scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          {residues.map((r, idx) => {
            const isActive = idx === activeIdx;
            const icon = getResidueIcon(r.residue_type);
            const label = r.residue_label ?? formatResidueType(r.residue_type);
            const summary = formatQuantitySummary(r);
            return (
              <button
                key={r.residue_type ?? idx}
                ref={(el) => { iconRefs.current[idx] = el; }}
                onClick={() => switchResidue(idx)}
                className={`snap-center flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all duration-300 ${
                  isActive
                    ? 'bg-amber-50 border-amber-400 shadow-sm scale-105'
                    : 'bg-white border-gray-100 hover:border-amber-200 hover:bg-amber-50/30'
                }`}
              >
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden transition-all duration-300 ${
                  isActive ? 'bg-gradient-to-br from-amber-100 to-amber-200 shadow-inner' : 'bg-gray-50'
                }`}>
                  {icon}
                  {isActive && (
                    <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-bold whitespace-nowrap transition-colors ${
                  isActive ? 'text-amber-700' : 'text-gray-500'
                }`}>
                  {label}
                </span>
                {summary && (
                  <span className={`text-[9px] font-medium whitespace-nowrap ${
                    isActive ? 'text-amber-600' : 'text-gray-400'
                  }`}>
                    {summary}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      </div>

      {/* ── Dots indicator ── */}
      {residues.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {residues.map((_, idx) => (
            <button
              key={idx}
              onClick={() => switchResidue(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIdx ? 'w-5 bg-amber-500' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
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
                alt={residueLabel ?? 'مخلفات نخيل'}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-700 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

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

              <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between gap-2">
                <h4 className="text-white text-lg font-bold drop-shadow-lg leading-tight">
                  {residueLabel ?? 'مخلفات نخيل'}
                </h4>
                {quantitySummary && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-sm text-gray-700 shadow-sm">
                    {quantitySummary}
                  </span>
                )}
              </div>

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
                  <span className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-lg">
                    {getResidueIcon(active.residue_type)}
                  </span>
                  <h4 className="text-base font-bold text-gray-800">{residueLabel ?? 'مخلفات نخيل'}</h4>
                </div>
                {quantitySummary && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {quantitySummary}
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {description && (
              <div className="relative rounded-xl bg-gradient-to-l from-amber-50/80 to-orange-50/40 border border-amber-100/60 p-3.5 overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100/20 rounded-full blur-2xl -translate-y-6 translate-x-4" />
                <div className="relative flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-amber-600 mb-1">وصف إضافي</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ Quantity method-specific stats ═══ */}
            {quantityMethod === 'weight' && (
              <div className="grid grid-cols-2 gap-2">
                <StatTile icon={Scale} label="الكمية" value={formatWeight(active.weight_value, active.weight_unit)} />
                {quantityMethodLabel && <StatTile icon={Tag} label="طريقة القياس" value={quantityMethodLabel} />}
                {active.measurement_accuracy && <StatTile icon={CheckCircle2} label="نوع القياس" value={active.measurement_accuracy} />}
                {active.availability_date && <StatTile icon={Calendar} label="الجاهزية" value={active.availability_date} />}
              </div>
            )}

            {quantityMethod === 'count' && (
              <div className="grid grid-cols-2 gap-2">
                <StatTile icon={Hash} label="العدد" value={formatCount(active.count_value, active.count_unit)} />
                {quantityMethodLabel && <StatTile icon={Tag} label="طريقة القياس" value={quantityMethodLabel} />}
                {active.measurement_accuracy && <StatTile icon={CheckCircle2} label="نوع القياس" value={active.measurement_accuracy} />}
                {active.average_length != null && <StatTile icon={Ruler} label="متوسط الطول" value={`${active.average_length} م`} />}
                {active.availability_date && <StatTile icon={Calendar} label="الجاهزية" value={active.availability_date} />}
              </div>
            )}

            {quantityMethod === 'manual_desc' && active.manual_quantity_desc && (
              <div className="rounded-xl bg-amber-50/60 border border-amber-100/60 p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-amber-600 mb-1">وصف الكمية</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{active.manual_quantity_desc}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Common stats */}
            <div className="grid grid-cols-2 gap-2">
              {active.length_range && <StatTile icon={Ruler} label="نطاق الأطوال" value={active.length_range} />}
              {active.bundle_weight != null && <StatTile icon={Scale} label="وزن الحزمة" value={`${active.bundle_weight} كجم`} />}
              {active.residue_source && <StatTile icon={Sprout} label="مصدر المخلفات" value={SOURCE_LABELS[active.residue_source] ?? active.residue_source} />}
              {active.pickup_window && <StatTile icon={Clock} label="فترة الاستلام" value={active.pickup_window} />}
              {priceStr && <StatTile icon={CircleDollarSign} label="السعر" value={priceStr} />}
              {active.pricing_type === 'quote' && !priceStr && <StatTile icon={Tag} label="طريقة البيع" value="طلب عرض سعر" />}
              {location && <StatTile icon={MapPin} label="الموقع" value={location} />}
              {active.truck_access && <StatTile icon={Truck} label="وصول الشاحنات" value={active.truck_access} />}
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {condition && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${condition.bg}`}>
                  <Leaf className={`w-3.5 h-3.5 ${condition.color}`} />
                  <span className={`text-xs font-bold ${condition.color}`}>{condition.label}</span>
                </div>
              )}
              {preparation && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${preparation.bg}`}>
                  <ClipboardList className={`w-3.5 h-3.5 ${preparation.color}`} />
                  <span className={`text-xs font-bold ${preparation.color}`}>{preparation.label}</span>
                </div>
              )}
            </div>

            {/* Suggested uses */}
            {active.suggested_uses.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-amber-600 mb-2">الاستخدام المقترح</p>
                <div className="flex flex-wrap gap-1.5">
                  {active.suggested_uses.map((use, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-[11px] font-medium text-gray-700 shadow-sm">
                      <Recycle className="w-3 h-3 text-amber-500" />
                      {USE_LABELS[use] ?? use}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Loading & transport */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 mb-2">التحميل والنقل</p>
              <div className="grid grid-cols-2 gap-2">
                <TransportTile icon={Package} label="التحميل" available={active.loading_available} />
                <TransportTile icon={Users} label="عمالة التحميل" available={active.labor_available} />
                <TransportTile icon={Wrench} label="رافعة / معدات" available={active.equipment_available} />
                <TransportTile icon={Truck} label="النقل" available={active.transport_available} />
              </div>
            </div>

            {/* Gallery */}
            {resolvedImages.length > 1 && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowGallery((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100 hover:bg-amber-100 transition-colors w-full justify-center"
                >
                  <Images className="w-3.5 h-3.5" />
                  {showGallery ? 'إخفاء معرض الصور' : `عرض معرض الصور (${resolvedImages.length})`}
                </button>
                {showGallery && (
                  <div className="mt-2.5 animate-fade-in">
                    <VarietyImageSlider
                      images={resolvedImages}
                      alt={residueLabel ?? 'مخلفات نخيل'}
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

function StatTile({ icon: Icon, label, value }: { icon: typeof Scale; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50/80 border border-gray-100/80 hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm">
        <Icon className="w-4 h-4 text-amber-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
        <p className="text-sm font-bold text-gray-800 truncate leading-tight">{value}</p>
      </div>
    </div>
  );
}

function TransportTile({ icon: Icon, label, available }: { icon: typeof Truck; label: string; available: boolean | null }) {
  if (available == null) return null;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
      available
        ? 'bg-green-50 border-green-200'
        : 'bg-gray-50 border-gray-200'
    }`}>
      <Icon className={`w-4 h-4 ${available ? 'text-green-500' : 'text-gray-400'}`} />
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
        <p className={`text-xs font-bold leading-tight ${available ? 'text-green-700' : 'text-gray-500'}`}>
          {available ? 'متوفر' : 'غير متوفر'}
        </p>
      </div>
    </div>
  );
}
