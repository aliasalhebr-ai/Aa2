import { useState, useEffect, useRef } from 'react';
import {
  Trees, Ruler, Calendar, Package, MapPin, CheckCircle2, AlertCircle,
  XCircle, ShieldCheck, Sprout, CircleDollarSign, Tag, Images, FileText,
  ChevronLeft, ChevronRight, Layers, ClipboardList, Building2, Clock,
  Truck, Scissors, Leaf, Repeat, CheckSquare, Square,
} from 'lucide-react';
import type { ProjectVarietyEntry, ProjectInfo } from '@/types';
import { getPublicImageUrlByPath } from '@/services/opportunityService';
import { getPalmTreeImages, getVarietyIcon } from '@/lib/varietyDefaultImages';
import VarietyImageSlider from './VarietyImageSlider';

type Props = {
  varieties: ProjectVarietyEntry[];
  totalCount: number;
  projectInfo: ProjectInfo | null;
  operationType: string;
  location?: string | null;
};

const KERB_META: Record<string, { label: string; icon: typeof ShieldCheck; color: string; bg: string }> = {
  سليم: { label: 'كرب سليم', icon: ShieldCheck, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  'سليم مع ملاحظات': { label: 'سليم مع ملاحظات', icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  'يحتاج معالجة': { label: 'يحتاج معالجة', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  'بحالة ممتازة': { label: 'كرب بحالة ممتازة', icon: ShieldCheck, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  'بدون كرب': { label: 'بدون كرب', icon: Square, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
};

const TAKREB_META: Record<string, { label: string; color: string; bg: string }> = {
  هلالي: { label: 'تكريب هلالي', color: 'text-siwar-700', bg: 'bg-siwar-50 border-siwar-100' },
  'تكريب هلالي': { label: 'تكريب هلالي', color: 'text-siwar-700', bg: 'bg-siwar-50 border-siwar-100' },
  عادي: { label: 'تكريب عادي', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  'تكريب عادي': { label: 'تكريب عادي', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  'بدون تكريب': { label: 'بدون تكريب', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
  'حسب طلب المشروع': { label: 'حسب طلب المشروع', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
};

const ROOT_META: Record<string, string> = {
  'مجهزة للغرس': 'مجهزة للغرس',
  'ملفوفة بالخيش': 'ملفوفة بالخيش',
  'داخل حاوية': 'داخل حاوية',
  'مقلوعة حديثًا': 'مقلوعة حديثًا',
  'تحتاج تجهيز': 'تحتاج تجهيز',
  'سليمة': 'سليمة',
  'تحتاج معالجة': 'تحتاج معالجة',
  'محدودة': 'محدودة',
};

const READINESS_META: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string; dot: string }> = {
  جاهز: { label: 'جاهزة للنقل والغرس', icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  'جاهزة للنقل والغرس': { label: 'جاهزة للنقل والغرس', icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  'جاهزة للقلع': { label: 'جاهزة للقلع', icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  'يحتاج تهيئة': { label: 'تحتاج تجهيز', icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  'تحتاج تجهيز': { label: 'تحتاج تجهيز', icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  'غير جاهز': { label: 'غير جاهزة', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  'غير جاهزة': { label: 'غير جاهزة', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  'متوفرة على دفعات': { label: 'متوفرة على دفعات', icon: Layers, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
};

const SERVICE_ICONS: Record<string, typeof Truck> = {
  'توريد النخيل': Package,
  'القلع': Sprout,
  'التحميل': Package,
  'النقل': Truck,
  'التنزيل': Package,
  'الغرس': Sprout,
  'التكريب': Scissors,
  'التقليم': Scissors,
  'الصيانة': Leaf,
  'استبدال النخيل التالف': Repeat,
};

function getKerbMeta(status: string | null | undefined) {
  if (!status) return null;
  return KERB_META[status] ?? null;
}

function getTakrebMeta(status: string | null | undefined) {
  if (!status) return null;
  return TAKREB_META[status] ?? TAKREB_META[status.toLowerCase().replace(/\s+/g, '_')] ?? null;
}

function getReadinessMeta(status: string | null | undefined) {
  if (!status) return null;
  return READINESS_META[status] ?? READINESS_META[status.toLowerCase().replace(/\s+/g, '_')] ?? null;
}

function formatHeight(min: number | null, max: number | null, range: string | null): string | null {
  if (range) return range;
  if (min != null && max != null) return `${min}–${max} م`;
  if (min != null && max == null) return `${min} م فأكثر`;
  if (max != null) return `حتى ${max} م`;
  return null;
}

function formatPriceDisplay(price: number | null, pricingType: string | null, count: number | null): string | null {
  if (pricingType === 'quote' || pricingType === 'طلب عرض سعر') return 'طلب عرض سعر';
  if (price == null || price === 0) return null;
  const formatted = price.toLocaleString('ar-EG');
  if (count != null && count > 1) return `${formatted} ريال للنخلة`;
  return `${formatted} ريال`;
}

export default function ProjectShowcase({ varieties, totalCount, projectInfo, operationType, location }: Props) {
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

  const ratio = totalCount > 0 && active?.palm_count != null
    ? Math.round((active.palm_count / totalCount) * 100)
    : null;

  const kerb = getKerbMeta(active?.kerb_status);
  const takreb = getTakrebMeta(active?.takreb_type);
  const readiness = getReadinessMeta(active?.readiness_status);
  const rootStatus = active?.root_status ? (ROOT_META[active.root_status] ?? active.root_status) : null;
  const heightStr = formatHeight(active?.min_height ?? null, active?.max_height ?? null, active?.height_range ?? null);
  const priceStr = formatPriceDisplay(active?.unit_price ?? null, active?.pricing_type ?? null, active?.palm_count ?? null);
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

  if (!active) return null;
  const mainImage = resolvedImages[mainImageIdx] ?? resolvedImages[0] ?? null;

  return (
    <div className="space-y-4">
      {/* ════════ Project Info Section ════════ */}
      {projectInfo && (
        <div className="rounded-2xl border border-siwar-100 bg-gradient-to-br from-siwar-50/60 to-white p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-siwar-100/60">
            <div className="w-8 h-8 rounded-lg bg-siwar-100 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-siwar-700" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">بيانات المشروع</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {projectInfo.project_name && (
              <InfoTile icon={FileText} label="اسم المشروع" value={projectInfo.project_name} />
            )}
            {projectInfo.project_type && (
              <InfoTile icon={Building2} label="نوع المشروع" value={projectInfo.project_type} />
            )}
            {projectInfo.requesting_entity && (
              <InfoTile icon={Building2} label="الجهة الطالبة" value={projectInfo.requesting_entity} />
            )}
            {projectInfo.project_location && (
              <InfoTile icon={MapPin} label="موقع المشروع" value={projectInfo.project_location} />
            )}
            {projectInfo.total_quantity != null && (
              <InfoTile icon={Trees} label="إجمالي النخيل" value={projectInfo.total_quantity.toLocaleString('ar-EG')} />
            )}
            {varieties.length > 0 && (
              <InfoTile icon={Layers} label="عدد الأصناف" value={String(varieties.length)} />
            )}
            {projectInfo.start_date && (
              <InfoTile icon={Calendar} label="تاريخ البدء" value={projectInfo.start_date} />
            )}
            {projectInfo.execution_duration && (
              <InfoTile icon={Clock} label="مدة التنفيذ" value={projectInfo.execution_duration} />
            )}
            {projectInfo.offer_deadline && (
              <InfoTile icon={Clock} label="آخر موعد للعرض" value={projectInfo.offer_deadline} />
            )}
            {projectInfo.delivery_schedule && (
              <InfoTile icon={Calendar} label="جدول التوريد" value={projectInfo.delivery_schedule} />
            )}
            {projectInfo.total_price != null && projectInfo.total_price > 0 && (
              <InfoTile icon={CircleDollarSign} label="سعر المشروع" value={`${projectInfo.total_price.toLocaleString('ar-EG')} ريال`} />
            )}
            {projectInfo.pricing_type === 'quote' && (
              <InfoTile icon={Tag} label="طريقة التسعير" value="طلب عرض سعر" />
            )}
          </div>

          {/* Service scope */}
          {projectInfo.service_scope.length > 0 && (
            <div className="pt-2 border-t border-siwar-100/60">
              <p className="text-[10px] font-bold text-siwar-600 mb-2">نطاق الخدمة</p>
              <div className="flex flex-wrap gap-1.5">
                {projectInfo.service_scope.map((service, i) => {
                  const Icon = SERVICE_ICONS[service] ?? CheckSquare;
                  return (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-siwar-100 text-[11px] font-medium text-gray-700 shadow-sm">
                      <Icon className="w-3 h-3 text-siwar-500" />
                      {service}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Service inclusions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {projectInfo.includes_planting != null && (
              <ServiceCheck label="يشمل الغرس" included={projectInfo.includes_planting} />
            )}
            {projectInfo.includes_uprooting != null && (
              <ServiceCheck label="يشمل القلع" included={projectInfo.includes_uprooting} />
            )}
            {projectInfo.includes_transport != null && (
              <ServiceCheck label="يشمل النقل" included={projectInfo.includes_transport} />
            )}
            {projectInfo.includes_pruning != null && (
              <ServiceCheck label="يشمل التكريب والتقليم" included={projectInfo.includes_pruning} />
            )}
            {projectInfo.includes_maintenance != null && (
              <ServiceCheck label="يشمل الصيانة" included={projectInfo.includes_maintenance} />
            )}
          </div>

          {projectInfo.description && (
            <div className="rounded-xl bg-white/60 border border-siwar-100/40 p-3">
              <p className="text-xs text-gray-600 leading-relaxed">{projectInfo.description}</p>
            </div>
          )}
        </div>
      )}

      {/* ════════ Variety Slider ════════ */}
      <div className="flex items-center gap-2">
        <Trees className="w-4 h-4 text-siwar-600" />
        <h3 className="text-sm font-bold text-gray-700">أصناف نخيل المشروع</h3>
        <span className="text-xs text-gray-400">
          ({varieties.length} صنف{totalCount > 0 ? ` · ${totalCount.toLocaleString('ar-EG')} نخلة` : ''})
        </span>
      </div>

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
                    ? 'bg-siwar-50 border-siwar-400 shadow-sm scale-105'
                    : 'bg-white border-gray-100 hover:border-siwar-200 hover:bg-siwar-50/30'
                }`}
              >
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden transition-all duration-300 ${
                  isActive ? 'bg-gradient-to-br from-siwar-100 to-siwar-200 shadow-inner' : 'bg-gray-50'
                }`}>
                  {icon}
                  {isActive && (
                    <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-siwar-500 flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-bold whitespace-nowrap transition-colors ${
                  isActive ? 'text-siwar-700' : 'text-gray-500'
                }`}>
                  {v.variety_name ?? 'صنف'}
                </span>
                {v.palm_count != null && (
                  <span className={`text-[9px] font-medium whitespace-nowrap ${
                    isActive ? 'text-siwar-600' : 'text-gray-400'
                  }`}>
                    {v.palm_count.toLocaleString('ar-EG')} نخلة
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      </div>

      {/* Dots */}
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

      {/* ════════ Variety Detail Card ════════ */}
      <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
        <div className="rounded-2xl border border-gray-200/80 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
          {/* Hero image */}
          {mainImage && (
            <div className="relative h-48 sm:h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
              {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
              <img
                src={mainImage}
                alt={active.variety_name ?? 'نخيل مشروع'}
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
                  {active.variety_name ?? 'صنف'}
                </h4>
                {active.palm_count != null && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-sm text-gray-700 shadow-sm">
                    {active.palm_count.toLocaleString('ar-EG')} نخلة
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
            {!mainImage && (
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-siwar-50 flex items-center justify-center text-lg">
                    {getVarietyIcon(active.variety_id, active.variety_name)}
                  </span>
                  <h4 className="text-base font-bold text-gray-800">{active.variety_name ?? 'نخيل مشروع'}</h4>
                </div>
                {active.palm_count != null && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-siwar-50 text-siwar-700 border border-siwar-200">
                    {active.palm_count.toLocaleString('ar-EG')} نخلة
                  </span>
                )}
              </div>
            )}

            {description && (
              <div className="relative rounded-xl bg-gradient-to-l from-siwar-50/80 to-amber-50/40 border border-siwar-100/60 p-3.5 overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-siwar-100/20 rounded-full blur-2xl -translate-y-6 translate-x-4" />
                <div className="relative flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-siwar-100 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-siwar-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-siwar-600 mb-1">وصف الصنف</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats grid — height is primary */}
            <div className="grid grid-cols-2 gap-2">
              <StatTile icon={Trees} label={isDemand ? 'العدد المطلوب' : 'عدد النخيل'} value={active.palm_count != null ? active.palm_count.toLocaleString('ar-EG') : null} />
              {ratio !== null && <StatTile icon={Package} label="نسبة المشروع" value={`${ratio}%`} />}
              {heightStr && <StatTile icon={Ruler} label="نطاق الارتفاع" value={heightStr} />}
              {active.age != null && <StatTile icon={Sprout} label="العمر التقريبي" value={`${active.age} سنة`} />}
              {active.trunk_diameter != null && <StatTile icon={Ruler} label="قطر الجذع" value={`${active.trunk_diameter} سم`} />}
              {active.delivery_date && <StatTile icon={Calendar} label="موعد التوريد" value={active.delivery_date} />}
              {priceStr && <StatTile icon={CircleDollarSign} label="السعر" value={priceStr} />}
              {active.pricing_type === 'quote' && !priceStr && <StatTile icon={Tag} label="طريقة البيع" value="طلب عرض سعر" />}
              {location && <StatTile icon={MapPin} label="موقع المصدر" value={location} />}
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {kerb && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${kerb.bg}`}>
                  <kerb.icon className={`w-3.5 h-3.5 ${kerb.color}`} />
                  <span className={`text-xs font-bold ${kerb.color}`}>{kerb.label}</span>
                </div>
              )}
              {takreb && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${takreb.bg}`}>
                  <Scissors className={`w-3.5 h-3.5 ${takreb.color}`} />
                  <span className={`text-xs font-bold ${takreb.color}`}>{takreb.label}</span>
                </div>
              )}
              {rootStatus && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-blue-50 border-blue-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-blue-700">{rootStatus}</span>
                </div>
              )}
              {readiness && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${readiness.bg}`}>
                  <span className={`w-2 h-2 rounded-full ${readiness.dot} animate-pulse`} />
                  <readiness.icon className={`w-3.5 h-3.5 ${readiness.color}`} />
                  <span className={`text-xs font-bold ${readiness.color}`}>{readiness.label}</span>
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
                    <VarietyImageSlider
                      images={resolvedImages}
                      alt={active.variety_name ?? 'نخيل مشروع'}
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
        <Icon className="w-4 h-4 text-siwar-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
        <p className="text-sm font-bold text-gray-800 truncate leading-tight">{value}</p>
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 border border-siwar-100/40">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-siwar-50 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-siwar-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
        <p className="text-xs font-bold text-gray-700 truncate leading-tight">{value}</p>
      </div>
    </div>
  );
}

function ServiceCheck({ label, included }: { label: string; included: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
      included
        ? 'bg-green-50 border-green-200 text-green-700'
        : 'bg-gray-50 border-gray-200 text-gray-400'
    }`}>
      {included ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
      {label}
    </div>
  );
}
