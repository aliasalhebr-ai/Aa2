import { useState, useEffect, useRef } from 'react';
import {
  Briefcase, MapPin, Clock, Users, ShieldCheck, Wrench, Truck,
  CircleDollarSign, Calendar, Star, ChevronLeft, ChevronRight,
  CheckCircle2, FileText, Images, Play, Award, HardHat, ClipboardCheck,
  CalendarDays, Settings, Cog, GraduationCap, Layers, Info,
  Building2, BadgeCheck, Sparkles,
} from 'lucide-react';
import type { ServiceEntry } from '@/types';
import { getPublicImageUrlByPath } from '@/services/opportunityService';
import { getServiceImages, getServiceBranchIcon } from '@/lib/varietyDefaultImages';
import VarietyImageSlider from './VarietyImageSlider';

type Props = {
  service: ServiceEntry;
  operationType: string;
  location?: string | null;
};

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  individual: 'فرد مهني',
  team: 'فريق مهني',
  organization: 'مؤسسة',
  company: 'شركة',
};

const PRICING_TYPE_LABELS: Record<string, string> = {
  per_palm: 'للنخلة',
  per_day: 'ليوم',
  per_project: 'للمشروع كاملاً',
  per_visit: 'للزيارة',
  per_hour: 'للساعة',
  per_treatment: 'للرش أو المعالجة',
  quote: 'طلب عرض سعر',
  negotiable: 'قابل للتفاوض',
  price: '',
};

const AVAILABILITY_LABELS: Record<string, string> = {
  available_now: 'متاح الآن',
  available_from: 'متاح من تاريخ محدد',
  busy: 'مشغول حالياً',
  accepting_bookings: 'يقبل الحجوزات',
  urgent: 'خدمة عاجلة متاحة',
};

function formatPriceDisplay(price: number | null, pricingType: string | null): string | null {
  if (pricingType === 'quote' || pricingType === 'طلب عرض سعر') return 'طلب عرض سعر';
  if (pricingType === 'negotiable' || pricingType === 'قابل للتفاوض') return 'قابل للتفاوض';
  if (price == null || price === 0) return null;
  const formatted = price.toLocaleString('ar-EG');
  const unitLabel = pricingType ? (PRICING_TYPE_LABELS[pricingType] ?? '') : '';
  return unitLabel ? `${formatted} ريال ${unitLabel}` : `${formatted} ريال`;
}

export default function ServiceShowcase({ service, operationType, location }: Props) {
  const [activeBranchIdx, setActiveBranchIdx] = useState(0);
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [resolvedImages, setResolvedImages] = useState<string[]>([]);
  const [mainImageIdx, setMainImageIdx] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const branchScrollRef = useRef<HTMLDivElement>(null);
  const itemScrollRef = useRef<HTMLDivElement>(null);
  const branchBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const itemBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const branches = service.service_branches ?? [];
  const activeBranch = branches[activeBranchIdx];
  const activeItem = activeBranch?.items?.[activeItemIdx];

  const isServiceOffer = operationType === 'service_offer' || operationType === 'offer';
  const isServiceRequest = operationType === 'service_request' || operationType === 'request';

  const providerLabel = service.provider_type ? (PROVIDER_TYPE_LABELS[service.provider_type] ?? service.provider_type) : null;
  const availabilityLabel = service.availability_status ? (AVAILABILITY_LABELS[service.availability_status] ?? service.availability_status) : null;

  // Resolve images for active item
  useEffect(() => {
    let cancelled = false;
    setImgLoaded(false);
    setMainImageIdx(0);
    async function resolve() {
      const itemImages = activeItem?.images ?? [];
      let imgs: string[];
      if (itemImages.length > 0) {
        const urls = await Promise.all(
          itemImages.map((p) => getPublicImageUrlByPath(p).catch(() => null)),
        );
        const valid = urls.filter((u): u is string => u != null);
        imgs = valid.length > 0 ? valid : getServiceImages(activeBranch?.branch_key ?? '');
      } else {
        imgs = getServiceImages(activeBranch?.branch_key ?? '');
      }
      if (!cancelled) setResolvedImages(imgs);
    }
    resolve();
    return () => { cancelled = true; };
  }, [activeItem, activeBranch]);

  // Scroll active branch into view
  useEffect(() => {
    const container = branchScrollRef.current;
    const el = branchBtnRefs.current[activeBranchIdx];
    if (!container || !el) return;
    const target = el.offsetLeft - (container.clientWidth - el.clientWidth) / 2;
    container.scrollTo({ left: target, behavior: 'smooth' });
  }, [activeBranchIdx]);

  // Scroll active item into view
  useEffect(() => {
    const container = itemScrollRef.current;
    const el = itemBtnRefs.current[activeItemIdx];
    if (!container || !el) return;
    const target = el.offsetLeft - (container.clientWidth - el.clientWidth) / 2;
    container.scrollTo({ left: target, behavior: 'smooth' });
  }, [activeItemIdx]);

  // Reset item index when branch changes
  useEffect(() => {
    setActiveItemIdx(0);
  }, [activeBranchIdx]);

  const switchBranch = (idx: number) => {
    if (idx === activeBranchIdx) return;
    setIsAnimating(true);
    setActiveBranchIdx(idx);
    setTimeout(() => setIsAnimating(false), 50);
  };

  const switchItem = (idx: number) => {
    if (idx === activeItemIdx) return;
    setIsAnimating(true);
    setActiveItemIdx(idx);
    setTimeout(() => setIsAnimating(false), 50);
  };

  if (branches.length === 0) return null;

  const mainImage = resolvedImages[mainImageIdx] ?? resolvedImages[0] ?? null;
  const priceStr = formatPriceDisplay(activeItem?.price ?? null, activeItem?.pricing_type ?? null);
  const hasRating = service.average_rating != null && service.rating_count != null && service.rating_count > 0;
  const hasPortfolio = service.portfolio && service.portfolio.length > 0;
  const hasSafety = service.safety_certifications && service.safety_certifications.length > 0;
  const hasLicenses = service.licenses && service.licenses.length > 0;
  const hasEquipment = service.equipment_list && service.equipment_list.length > 0;
  const hasTransport = service.transport_available != null;
  const hasTerms = service.terms || service.cancellation_policy;
  const hasDescription = activeItem?.description?.trim() || service.description?.trim();
  const description = activeItem?.description?.trim() || service.description?.trim() || null;

  return (
    <div className="space-y-3">
      {/* ── Section header ── */}
      <div className="flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-teal-600" />
        <h3 className="text-sm font-bold text-gray-700">فروع الخدمات</h3>
        <span className="text-xs text-gray-400">({branches.length} فرع)</span>
      </div>

      {/* ── Branch slider ── */}
      <div className="relative">
        <div
          ref={branchScrollRef}
          className="flex gap-2.5 overflow-x-auto pb-2 fancy-scroll scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          {branches.map((b, idx) => {
            const isActive = idx === activeBranchIdx;
            const icon = getServiceBranchIcon(b.branch_key);
            const itemCount = b.items?.length ?? 0;
            return (
              <button
                key={b.branch_key ?? idx}
                ref={(el) => { branchBtnRefs.current[idx] = el; }}
                onClick={() => switchBranch(idx)}
                className={`snap-center flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all duration-300 ${
                  isActive
                    ? 'bg-teal-50 border-teal-400 shadow-sm scale-105'
                    : 'bg-white border-gray-100 hover:border-teal-200 hover:bg-teal-50/30'
                }`}
              >
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden transition-all duration-300 ${
                  isActive ? 'bg-gradient-to-br from-teal-100 to-teal-200 shadow-inner' : 'bg-gray-50'
                }`}>
                  {icon}
                  {isActive && (
                    <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-bold whitespace-nowrap transition-colors ${
                  isActive ? 'text-teal-700' : 'text-gray-500'
                }`}>
                  {b.branch_label ?? b.branch_key}
                </span>
                {itemCount > 0 && (
                  <span className={`text-[9px] font-medium whitespace-nowrap ${
                    isActive ? 'text-teal-600' : 'text-gray-400'
                  }`}>
                    {itemCount} خدمات
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      </div>

      {/* ── Service items selector (within active branch) ── */}
      {activeBranch && activeBranch.items && activeBranch.items.length > 0 && (
        <div className="relative">
          <div
            ref={itemScrollRef}
            className="flex gap-2 overflow-x-auto pb-1.5 fancy-scroll scroll-smooth snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none' }}
          >
            {activeBranch.items.map((item, idx) => {
              const isActive = idx === activeItemIdx;
              return (
                <button
                  key={item.item_key ?? idx}
                  ref={(el) => { itemBtnRefs.current[idx] = el; }}
                  onClick={() => switchItem(idx)}
                  className={`snap-center flex-shrink-0 px-3 py-2 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300 hover:bg-teal-50'
                  }`}
                >
                  <span className="text-xs font-bold whitespace-nowrap">{item.item_label ?? item.item_key}</span>
                </button>
              );
            })}
          </div>
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
                alt={activeItem?.item_label ?? activeBranch?.branch_label ?? 'خدمة نخيل'}
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

              <div className="absolute bottom-3 right-3 left-3">
                <h4 className="text-white text-lg font-bold drop-shadow-lg leading-tight">
                  {activeItem?.item_label ?? activeBranch?.branch_label ?? 'خدمة'}
                </h4>
                {activeBranch && (
                  <p className="text-white/80 text-xs mt-0.5 drop-shadow">{activeBranch.branch_label}</p>
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
            {/* Description */}
            {description && (
              <div className="relative rounded-xl bg-gradient-to-l from-teal-50/80 to-emerald-50/40 border border-teal-100/60 p-3.5 overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-teal-100/20 rounded-full blur-2xl -translate-y-6 translate-x-4" />
                <div className="relative flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-teal-600 mb-1">وصف الخدمة</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Price */}
            {priceStr && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-l from-teal-50 to-emerald-50 border border-teal-100">
                <CircleDollarSign className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-teal-600 font-bold">السعر</p>
                  <p className="text-base font-bold text-gray-800">{priceStr}</p>
                </div>
              </div>
            )}

            {/* Service execution details */}
            {(activeItem?.minimum_palm_count != null || activeItem?.daily_capacity != null || activeItem?.estimated_duration || activeItem?.worker_count != null) && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-teal-600 mb-2">تفاصيل التنفيذ</p>
                <div className="grid grid-cols-2 gap-2">
                  {activeItem?.minimum_palm_count != null && (
                    <StatTile icon={Layers} label="الحد الأدنى للنخيل" value={String(activeItem.minimum_palm_count)} />
                  )}
                  {activeItem?.daily_capacity != null && (
                    <StatTile icon={Sparkles} label="القدرة اليومية" value={String(activeItem.daily_capacity)} />
                  )}
                  {activeItem?.estimated_duration && (
                    <StatTile icon={Clock} label="المدة المتوقعة" value={activeItem.estimated_duration} />
                  )}
                  {activeItem?.worker_count != null && (
                    <StatTile icon={Users} label="عدد العمال" value={String(activeItem.worker_count)} />
                  )}
                </div>
              </div>
            )}

            {/* Service inclusions */}
            {(activeItem?.equipment_included != null || activeItem?.materials_included != null || activeItem?.cleanup_included != null || activeItem?.waste_removal_included != null || activeItem?.followup_included != null) && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 mb-2">ما يشمله التنفيذ</p>
                <div className="grid grid-cols-2 gap-2">
                  <ServiceInclusion icon={Wrench} label="المعدات" included={activeItem?.equipment_included} />
                  <ServiceInclusion icon={Settings} label="المواد" included={activeItem?.materials_included} />
                  <ServiceInclusion icon={Sparkles} label="تنظيف الموقع" included={activeItem?.cleanup_included} />
                  <ServiceInclusion icon={Cog} label="التخلص من المخلفات" included={activeItem?.waste_removal_included} />
                  <ServiceInclusion icon={ClipboardCheck} label="المتابعة بعد التنفيذ" included={activeItem?.followup_included} />
                </div>
              </div>
            )}

            {/* Equipment & labor */}
            {(hasEquipment || service.labor_info || service.worker_count != null || service.supervisor_available != null || service.engineer_available != null || service.technician_available != null) && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 mb-2">المعدات والعمالة</p>
                {hasEquipment && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {service.equipment_list.map((eq, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[11px] font-medium text-gray-700 shadow-sm">
                        <Wrench className="w-3 h-3 text-teal-500" />
                        {eq}
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {service.worker_count != null && <StatTile icon={Users} label="عدد العمال" value={String(service.worker_count)} />}
                  {service.labor_info && <StatTile icon={Users} label="العمالة" value={service.labor_info} />}
                  <ServiceInclusion icon={BadgeCheck} label="مشرف مختص" included={service.supervisor_available} />
                  <ServiceInclusion icon={GraduationCap} label="مهندس زراعي" included={service.engineer_available} />
                  <ServiceInclusion icon={HardHat} label="فني نخيل" included={service.technician_available} />
                </div>
              </div>
            )}

            {/* Provider info */}
            {(service.provider_name || providerLabel || service.experience_years != null) && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-teal-600 mb-2">مقدم الخدمة</p>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-l from-teal-50/60 to-white border border-teal-100/60">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                    <Building2 className="w-5 h-5 text-teal-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {service.provider_name && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-gray-800 truncate">{service.provider_name}</span>
                        {service.provider_verified && (
                          <BadgeCheck className="w-4 h-4 text-teal-600 flex-shrink-0" fill="currentColor" />
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {providerLabel && <span className="text-[10px] text-gray-500">{providerLabel}</span>}
                      {service.experience_years != null && (
                        <span className="text-[10px] text-gray-500">• {service.experience_years} سنوات خبرة</span>
                      )}
                      {service.completed_projects != null && (
                        <span className="text-[10px] text-gray-500">• {service.completed_projects} عمل منفذ</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rating (only if real data) */}
            {hasRating && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/60 border border-amber-100/60">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span className="text-sm font-bold text-gray-800">{service.average_rating!.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({service.rating_count} تقييم)</span>
              </div>
            )}

            {/* Coverage areas */}
            {service.covered_cities.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 mb-2">نطاق التغطية</p>
                <div className="flex flex-wrap gap-1.5">
                  {service.covered_cities.map((city, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-100 text-[11px] font-medium text-gray-700 shadow-sm">
                      <MapPin className="w-3 h-3 text-teal-500" />
                      {city}
                    </span>
                  ))}
                </div>
                {service.coverage_radius && (
                  <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {service.coverage_radius}
                  </p>
                )}
              </div>
            )}

            {/* Safety & licenses */}
            {(hasSafety || hasLicenses) && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 mb-2">السلامة والاعتمادات</p>
                <div className="flex flex-wrap gap-1.5">
                  {service.safety_certifications.map((cert, i) => (
                    <span key={`s-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 border border-green-100 text-[11px] font-medium text-gray-700 shadow-sm">
                      <ShieldCheck className="w-3 h-3 text-green-500" />
                      {cert}
                    </span>
                  ))}
                  {service.licenses.map((lic, i) => (
                    <span key={`l-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[11px] font-medium text-gray-700 shadow-sm">
                      <Award className="w-3 h-3 text-blue-500" />
                      {lic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Transport */}
            {hasTransport && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 mb-2">النقل</p>
                <div className="grid grid-cols-2 gap-2">
                  <ServiceInclusion icon={Truck} label="يوفر النقل" included={service.transport_available} />
                  {service.transport_method && <StatTile icon={Truck} label="نوع المركبة" value={service.transport_method} />}
                  {service.transport_cities && <StatTile icon={MapPin} label="المدن المشمولة" value={service.transport_cities} />}
                  {service.transport_included != null && (
                    <ServiceInclusion icon={CircleDollarSign} label="السعر يشمل النقل" included={service.transport_included} />
                  )}
                </div>
              </div>
            )}

            {/* Availability */}
            {(availabilityLabel || service.available_from || service.working_days || service.working_hours) && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 mb-2">حالة التوفر</p>
                <div className="grid grid-cols-2 gap-2">
                  {availabilityLabel && <StatTile icon={Clock} label="التوفر" value={availabilityLabel} />}
                  {service.available_from && <StatTile icon={Calendar} label="متاح من" value={service.available_from} />}
                  {service.working_days && <StatTile icon={CalendarDays} label="أيام العمل" value={service.working_days} />}
                  {service.working_hours && <StatTile icon={Clock} label="ساعات العمل" value={service.working_hours} />}
                </div>
              </div>
            )}

            {/* Other info */}
            {(service.project_capacity || service.seasonality || service.min_work || service.contract_invoice != null) && (
              <div className="pt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-2">
                  {service.project_capacity && <StatTile icon={Layers} label="قدرة المشاريع" value={service.project_capacity} />}
                  {service.seasonality && <StatTile icon={Calendar} label="موسمية الخدمة" value={service.seasonality === 'year_round' ? 'موسم متاح' : 'موسمي'} />}
                  {service.min_work && <StatTile icon={ClipboardCheck} label="الحد الأدنى للعمل" value={service.min_work} />}
                  {service.contract_invoice != null && (
                    <ServiceInclusion icon={FileText} label="إصدار عقد/فاتورة" included={service.contract_invoice} />
                  )}
                </div>
              </div>
            )}

            {/* Gallery */}
            {resolvedImages.length > 1 && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => setMainImageIdx((prev) => (prev + 1) % resolvedImages.length)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-100 hover:bg-teal-100 transition-colors w-full justify-center"
                >
                  <Images className="w-3.5 h-3.5" />
                  معرض الصور ({resolvedImages.length})
                </button>
                <div className="mt-2.5">
                  <VarietyImageSlider images={resolvedImages} alt={activeItem?.item_label ?? 'خدمة نخيل'} />
                </div>
              </div>
            )}

            {/* Portfolio (previous works) */}
            {hasPortfolio && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowPortfolio((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-bold border border-gray-100 hover:bg-gray-100 transition-colors w-full justify-center"
                >
                  <Images className="w-3.5 h-3.5" />
                  {showPortfolio ? 'إخفاء الأعمال السابقة' : `عرض الأعمال السابقة (${service.portfolio.length})`}
                </button>
                {showPortfolio && (
                  <div className="mt-2.5 space-y-2.5 animate-fade-in">
                    {service.portfolio.map((p, i) => (
                      <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                        <div className="flex gap-2 mb-2">
                          {p.image_before && (
                            <div className="flex-1">
                              <img src={p.image_before} alt="قبل" loading="lazy" className="w-full h-20 object-cover rounded-lg" />
                              <p className="text-[9px] text-gray-400 text-center mt-0.5">قبل</p>
                            </div>
                          )}
                          {p.image_after && (
                            <div className="flex-1">
                              <img src={p.image_after} alt="بعد" loading="lazy" className="w-full h-20 object-cover rounded-lg" />
                              <p className="text-[9px] text-gray-400 text-center mt-0.5">بعد</p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {p.service_type && <StatTile icon={Briefcase} label="نوع الخدمة" value={p.service_type} />}
                          {p.city && <StatTile icon={MapPin} label="المدينة" value={p.city} />}
                          {p.palm_count != null && <StatTile icon={Layers} label="عدد النخيل" value={String(p.palm_count)} />}
                          {p.duration && <StatTile icon={Clock} label="المدة" value={p.duration} />}
                        </div>
                        {p.description && <p className="text-[11px] text-gray-500 mt-1.5">{p.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Terms (collapsible) */}
            {hasTerms && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowTerms((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-bold border border-gray-100 hover:bg-gray-100 transition-colors w-full justify-center"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {showTerms ? 'إخفاء الشروط' : 'عرض شروط الخدمة'}
                </button>
                {showTerms && (
                  <div className="mt-2.5 space-y-2 animate-fade-in">
                    {service.terms && (
                      <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-500 mb-1">شروط الخدمة</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{service.terms}</p>
                      </div>
                    )}
                    {service.cancellation_policy && (
                      <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-500 mb-1">سياسة الإلغاء</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{service.cancellation_policy}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Operation type indicator */}
            {isServiceOffer && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-700">عرض خدمة — متاح للطلب</span>
              </div>
            )}
            {isServiceRequest && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-100">
                <Info className="w-3.5 h-3.5 text-sky-600" />
                <span className="text-[11px] font-bold text-sky-700">طلب خدمة — يمكن تقديم عرض</span>
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
        <Icon className="w-4 h-4 text-teal-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
        <p className="text-sm font-bold text-gray-800 truncate leading-tight">{value}</p>
      </div>
    </div>
  );
}

function ServiceInclusion({ icon: Icon, label, included }: { icon: typeof Settings; label: string; included: boolean | null }) {
  if (included == null) return null;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
      included ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <Icon className={`w-4 h-4 ${included ? 'text-green-500' : 'text-gray-400'}`} />
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
        <p className={`text-xs font-bold leading-tight ${included ? 'text-green-700' : 'text-gray-500'}`}>
          {included ? 'متوفر' : 'غير متوفر'}
        </p>
      </div>
    </div>
  );
}
