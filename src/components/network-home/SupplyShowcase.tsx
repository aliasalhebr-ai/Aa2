import { useState, useEffect, useRef } from 'react';
import {
  Wrench, Package, Tag, CircleDollarSign, Calendar, MapPin, CheckCircle2,
  AlertCircle, ShieldCheck, Settings, Cog, GraduationCap, Truck, Ruler,
  Images, FileText, ChevronLeft, ChevronRight, Boxes, Play, Layers,
  ClipboardList, Building2, Clock,
} from 'lucide-react';
import type { SupplyEntry } from '@/types';
import { getPublicImageUrlByPath } from '@/services/opportunityService';
import { getSupplyImages, getSupplyIcon } from '@/lib/varietyDefaultImages';
import VarietyImageSlider from './VarietyImageSlider';

type Props = {
  supplies: SupplyEntry[];
  location?: string | null;
};

const CONDITION_META: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'جديد', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  'جديد': { label: 'جديد', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  used: { label: 'مستعمل', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  'مستعمل بحالة ممتازة': { label: 'مستعمل بحالة ممتازة', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  'مستعمل بحالة جيدة': { label: 'مستعمل بحالة جيدة', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  'مجدد': { label: 'مجدد', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  'refurbished': { label: 'مجدد', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  'يحتاج صيانة': { label: 'يحتاج صيانة', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  'قطع غيار فقط': { label: 'قطع غيار فقط', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
};

const UNIT_LABELS: Record<string, string> = {
  unit: 'وحدة',
  piece: 'قطعة',
  set: 'طقم',
  system: 'نظام كامل',
  box: 'صندوق',
  pack: 'حزمة',
};

const CATEGORY_LABELS: Record<string, string> = {
  irrigation_systems: 'أنظمة الري',
  fertilization: 'أنظمة التسميد',
  pest_control: 'مكافحة الآفات',
  pollination_tools: 'أدوات التكريب والتقليم',
  harvest_equipment: 'معدات الحصاد',
  smart_tech: 'تقنيات ذكية',
  packing_supplies: 'مستلزمات التعبئة',
  spare_parts: 'قطع الغيار',
};

function getConditionMeta(condition: string | null | undefined) {
  if (!condition) return null;
  return CONDITION_META[condition] ?? CONDITION_META[condition.toLowerCase()] ?? null;
}

function formatQuantity(value: number | null, unit: string | null): string | null {
  if (value == null) return null;
  const unitLabel = unit ? (UNIT_LABELS[unit] ?? unit) : 'وحدة';
  return `${value.toLocaleString('ar-EG')} ${unitLabel}`;
}

function formatPriceDisplay(price: number | null, pricingType: string | null, unit: string | null): string | null {
  if (pricingType === 'quote' || pricingType === 'طلب عرض سعر') return 'طلب عرض سعر';
  if (pricingType === 'free' || pricingType === 'مجانًا') return 'مجانًا';
  if (price == null || price === 0) return null;
  const formatted = price.toLocaleString('ar-EG');
  const unitLabel = unit ? (UNIT_LABELS[unit] ?? unit) : 'الوحدة';
  return `${formatted} ريال لل${unitLabel}`;
}

export default function SupplyShowcase({ supplies, location }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [resolvedImages, setResolvedImages] = useState<string[]>([]);
  const [mainImageIdx, setMainImageIdx] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = supplies[activeIdx];

  const condition = getConditionMeta(active?.condition);
  const quantityStr = formatQuantity(active?.quantity ?? null, active?.unit ?? null);
  const priceStr = formatPriceDisplay(active?.price ?? null, active?.pricing_type ?? null, active?.unit ?? null);
  const description = active?.description?.trim() || null;
  const categoryLabel = active?.category_label ?? CATEGORY_LABELS[active?.category ?? ''] ?? active?.category ?? 'مستلزم';
  const hasWarranty = active?.warranty_status || active?.warranty_duration;
  const hasInstallation = active?.installation_available != null || active?.installation_duration || active?.installation_cities || active?.training_available != null || active?.maintenance_available != null || active?.spare_parts_available != null;
  const hasTechSpecs = active?.technical_specs && active.technical_specs.length > 0;

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
        if (!cancelled) setResolvedImages(valid.length > 0 ? valid : getSupplyImages(active.category));
      } else {
        if (!cancelled) setResolvedImages(getSupplyImages(active.category));
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

  const switchSupply = (idx: number) => {
    if (idx === activeIdx) return;
    setIsAnimating(true);
    setActiveIdx(idx);
    setTimeout(() => setIsAnimating(false), 50);
  };

  if (!active) return null;
  const mainImage = resolvedImages[mainImageIdx] ?? resolvedImages[0] ?? null;
  const itemName = active.item_name ?? categoryLabel;

  return (
    <div className="space-y-3">
      {/* ── Section header ── */}
      <div className="flex items-center gap-2">
        <Wrench className="w-4 h-4 text-cyan-600" />
        <h3 className="text-sm font-bold text-gray-700">فئات المستلزمات</h3>
        <span className="text-xs text-gray-400">({supplies.length} فئة)</span>
      </div>

      {/* ── Category slider ── */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-2 fancy-scroll scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          {supplies.map((s, idx) => {
            const isActive = idx === activeIdx;
            const icon = getSupplyIcon(s.category);
            const label = s.category_label ?? CATEGORY_LABELS[s.category] ?? s.category ?? 'مستلزم';
            const qty = formatQuantity(s.quantity ?? null, s.unit ?? null);
            return (
              <button
                key={s.category ?? idx}
                ref={(el) => { iconRefs.current[idx] = el; }}
                onClick={() => switchSupply(idx)}
                className={`snap-center flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all duration-300 ${
                  isActive
                    ? 'bg-cyan-50 border-cyan-400 shadow-sm scale-105'
                    : 'bg-white border-gray-100 hover:border-cyan-200 hover:bg-cyan-50/30'
                }`}
              >
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden transition-all duration-300 ${
                  isActive ? 'bg-gradient-to-br from-cyan-100 to-cyan-200 shadow-inner' : 'bg-gray-50'
                }`}>
                  {icon}
                  {isActive && (
                    <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-bold whitespace-nowrap transition-colors ${
                  isActive ? 'text-cyan-700' : 'text-gray-500'
                }`}>
                  {label}
                </span>
                {qty && (
                  <span className={`text-[9px] font-medium whitespace-nowrap ${
                    isActive ? 'text-cyan-600' : 'text-gray-400'
                  }`}>
                    {qty}
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
      {supplies.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {supplies.map((_, idx) => (
            <button
              key={idx}
              onClick={() => switchSupply(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIdx ? 'w-5 bg-cyan-500' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
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
                alt={itemName ?? 'مستلزم نخيل'}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-700 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

              {/* Video button */}
              {active.video_url && (
                <button
                  onClick={() => window.open(active.video_url!, '_blank', 'noopener,noreferrer')}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur-sm text-white text-xs font-bold shadow-sm flex items-center gap-1.5 hover:bg-red-600 transition-colors z-10"
                >
                  <Play className="w-3.5 h-3.5" />
                  فيديو
                </button>
              )}

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
                  {itemName}
                </h4>
                {quantityStr && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-sm text-gray-700 shadow-sm">
                    {quantityStr}
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
                  <span className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center text-lg">
                    {getSupplyIcon(active.category)}
                  </span>
                  <h4 className="text-base font-bold text-gray-800">{itemName}</h4>
                </div>
                {quantityStr && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                    {quantityStr}
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {description && (
              <div className="relative rounded-xl bg-gradient-to-l from-cyan-50/80 to-sky-50/40 border border-cyan-100/60 p-3.5 overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-100/20 rounded-full blur-2xl -translate-y-6 translate-x-4" />
                <div className="relative flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-cyan-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-cyan-600 mb-1">وصف المنتج</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic stats */}
            <div className="grid grid-cols-2 gap-2">
              {active.brand && <StatTile icon={Tag} label="العلامة التجارية" value={active.brand} />}
              {active.model && <StatTile icon={Boxes} label="الموديل" value={active.model} />}
              {active.manufacturing_year != null && <StatTile icon={Calendar} label="سنة الصنع" value={String(active.manufacturing_year)} />}
              {active.country_of_origin && <StatTile icon={MapPin} label="بلد الصنع" value={active.country_of_origin} />}
              {active.availability_date && <StatTile icon={Calendar} label="موعد التوفر" value={active.availability_date} />}
              {priceStr && <StatTile icon={CircleDollarSign} label="السعر" value={priceStr} />}
              {active.pricing_type === 'quote' && !priceStr && <StatTile icon={Tag} label="طريقة البيع" value="طلب عرض سعر" />}
              {location && <StatTile icon={MapPin} label="الموقع" value={location} />}
            </div>

            {/* Condition badge */}
            {condition && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${condition.bg}`}>
                  <ShieldCheck className={`w-3.5 h-3.5 ${condition.color}`} />
                  <span className={`text-xs font-bold ${condition.color}`}>{condition.label}</span>
                </div>
              </div>
            )}

            {/* Price inclusions */}
            {priceStr && (active.tax_included != null || active.installation_included != null) && (
              <div className="flex flex-wrap gap-2">
                {active.tax_included != null && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                    active.tax_included ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}>
                    {active.tax_included ? 'شامل الضريبة' : 'غير شامل الضريبة'}
                  </span>
                )}
                {active.installation_included != null && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                    active.installation_included ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}>
                    {active.installation_included ? 'شامل التركيب' : 'غير شامل التركيب'}
                  </span>
                )}
              </div>
            )}

            {/* Technical specs */}
            {hasTechSpecs && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-cyan-600 mb-2">المواصفات الفنية</p>
                <div className="grid grid-cols-2 gap-2">
                  {active.technical_specs.map((spec, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50/80 border border-gray-100/80">
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                        <Ruler className="w-3.5 h-3.5 text-cyan-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 leading-tight">{spec.label}</p>
                        <p className="text-xs font-bold text-gray-800 truncate leading-tight">{spec.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usage scope */}
            {(active.usage_scope || active.farm_size_coverage) && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 mb-2">نطاق الاستخدام</p>
                <div className="flex flex-wrap gap-1.5">
                  {active.farm_size_coverage && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-100 text-[11px] font-medium text-gray-700 shadow-sm">
                      <Layers className="w-3 h-3 text-cyan-500" />
                      {active.farm_size_coverage}
                    </span>
                  )}
                  {active.usage_scope && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-100 text-[11px] font-medium text-gray-700 shadow-sm">
                      <ClipboardList className="w-3 h-3 text-sky-500" />
                      {active.usage_scope}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Warranty section */}
            {hasWarranty && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-green-600 mb-2">الضمان وخدمة ما بعد البيع</p>
                <div className="grid grid-cols-2 gap-2">
                  {active.warranty_status && <StatTile icon={ShieldCheck} label="حالة الضمان" value={active.warranty_status} />}
                  {active.warranty_duration && <StatTile icon={Clock} label="مدة الضمان" value={active.warranty_duration} />}
                </div>
              </div>
            )}

            {/* Installation & maintenance */}
            {hasInstallation && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 mb-2">التركيب والصيانة</p>
                <div className="grid grid-cols-2 gap-2">
                  <ServiceTile icon={Settings} label="التركيب" available={active.installation_available} />
                  <ServiceTile icon={Cog} label="الصيانة" available={active.maintenance_available} />
                  <ServiceTile icon={Boxes} label="قطع الغيار" available={active.spare_parts_available} />
                  <ServiceTile icon={GraduationCap} label="دورة تدريبية" available={active.training_available} />
                  {active.installation_duration && <StatTile icon={Clock} label="مدة التركيب" value={active.installation_duration} />}
                  {active.installation_cities && <StatTile icon={MapPin} label="مدن التغطية" value={active.installation_cities} />}
                </div>
              </div>
            )}

            {/* Transport */}
            {active.transport_available != null && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <ServiceTile icon={Truck} label="النقل والتوصيل" available={active.transport_available} />
                </div>
              </div>
            )}

            {/* Gallery */}
            {resolvedImages.length > 1 && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowGallery((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-700 text-xs font-bold border border-cyan-100 hover:bg-cyan-100 transition-colors w-full justify-center"
                >
                  <Images className="w-3.5 h-3.5" />
                  {showGallery ? 'إخفاء معرض الصور' : `عرض معرض الصور (${resolvedImages.length})`}
                </button>
                {showGallery && (
                  <div className="mt-2.5 animate-fade-in">
                    <VarietyImageSlider
                      images={resolvedImages}
                      alt={itemName ?? 'مستلزم نخيل'}
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

function StatTile({ icon: Icon, label, value }: { icon: typeof Wrench; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50/80 border border-gray-100/80 hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm">
        <Icon className="w-4 h-4 text-cyan-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
        <p className="text-sm font-bold text-gray-800 truncate leading-tight">{value}</p>
      </div>
    </div>
  );
}

function ServiceTile({ icon: Icon, label, available }: { icon: typeof Settings; label: string; available: boolean | null }) {
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
