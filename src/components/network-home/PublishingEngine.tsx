import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, ChevronLeft, ChevronRight, Check, AlertCircle, Lock,
  Layers, ArrowLeftRight, Sparkles, Building2, Loader2,
  Gavel, Truck, FileText, Plus, MapPin,
} from 'lucide-react';
import type { Sector, SubSector, SectorAction, FieldDefinition, FormData, PublisherEntity } from '@/types';
import { getFieldDefinitions } from '@/services/domainService';
import { getV2PublisherEntities } from '@/services/opportunityV2Service';
import { PalmTreeIcon, AppleTreeIcon, AuctionIcon } from '@/components/network-home/SectorIcons';
import DynamicForm from '@/components/network-home/DynamicForm';
import OpportunityForm from '@/components/network-home/OpportunityForm';

type Props = {
  browsingSector: Sector | null;
  browsingSubSector: SubSector | null;
  sectors: Sector[];
  subSectors: SubSector[];
  isLoggedIn: boolean;
  onLoginRequired: () => void;
  onV2Success: (title: string, status: string) => void;
  onV1Submit: (
    actionId: string,
    data: FormData,
    fieldDefs: FieldDefinition[],
    status: 'draft' | 'pending_review',
    publisherEntityId: string | null,
  ) => void;
  onClose: () => void;
};

type EngineStep = 'context' | 'selectSector' | 'selectSubSector' | 'selectType' | 'confirm' | 'login' | 'publisher' | 'form';

const operationLabels: Record<string, string> = {
  offer: 'عرض',
  demand: 'احتياج',
  partnership: 'شراكة',
  lease: 'إيجار',
  project: 'مشروع',
  service: 'خدمة',
  logistics_request: 'طلب لوجستي',
  auction_request: 'طلب مزاد',
  add_opportunity: 'فرصة',
};

function renderSectorIcon(slug: string, className: string) {
  if (slug === 'palm' || slug === 'palms') return <PalmTreeIcon className={className} />;
  if (slug === 'auctions') return <AuctionIcon className={className} />;
  if (slug === 'logistics') return <Truck className={className} />;
  return <AppleTreeIcon className={className} />;
}

export default function PublishingEngine({
  browsingSector,
  browsingSubSector,
  sectors,
  subSectors,
  isLoggedIn,
  onLoginRequired,
  onV2Success,
  onV1Submit,
  onClose,
}: Props) {
  const [step, setStep] = useState<EngineStep>('context');
  const [lockedSectorId, setLockedSectorId] = useState<string | null>(null);
  const [lockedSubSectorId, setLockedSubSectorId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [publisherEntities, setPublisherEntities] = useState<PublisherEntity[]>([]);
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(null);
  const [loadingPublishers, setLoadingPublishers] = useState(false);
  const [v1FieldDefs, setV1FieldDefs] = useState<FieldDefinition[]>([]);
  const [loadingV1Defs, setLoadingV1Defs] = useState(false);

  useEffect(() => {
    setStep('context');
    setLockedSectorId(null);
    setLockedSubSectorId(null);
    setSelectedType(null);
    setPublisherEntities([]);
    setSelectedPublisherId(null);
    setV1FieldDefs([]);
  }, []);

  const lockedSector = useMemo(
    () => sectors.find((s) => s.id === lockedSectorId) ?? null,
    [sectors, lockedSectorId],
  );
  const lockedSubSector = useMemo(
    () => subSectors.find((s) => s.id === lockedSubSectorId) ?? null,
    [subSectors, lockedSubSectorId],
  );

  const templateVersion = lockedSector?.opportunity_template_version ?? 1;
  const isV2 = templateVersion === 2;

  const allowedActions: SectorAction[] = useMemo(() => {
    const raw =
      (lockedSubSector?.allowed_operations ?? lockedSector?.available_actions ?? []) as SectorAction[];
    return raw.filter((a) => a.is_active !== false);
  }, [lockedSubSector, lockedSector]);

  const isOperational = lockedSector?.slug === 'auctions' || lockedSector?.slug === 'logistics';

  const creatableSectors = useMemo(
    () => sectors.filter((s) => s.is_active),
    [sectors],
  );

  const relevantSubSectors = useMemo(
    () => {
      const sid = lockedSectorId ?? browsingSector?.id ?? null;
      return subSectors.filter((s) => s.sector_id === sid && s.is_active);
    },
    [subSectors, lockedSectorId, browsingSector],
  );

  // ── Load publisher entities when entering publisher step ──
  useEffect(() => {
    if (step !== 'publisher' || !isLoggedIn) return;
    let cancelled = false;
    setLoadingPublishers(true);
    (async () => {
      try {
        const entities = await getV2PublisherEntities();
        if (!cancelled) {
          setPublisherEntities(entities);
          if (entities.length === 1) {
            setSelectedPublisherId(entities[0].id);
          }
        }
      } catch {
        if (!cancelled) setPublisherEntities([]);
      } finally {
        if (!cancelled) setLoadingPublishers(false);
      }
    })();
    return () => { cancelled = true; };
  }, [step, isLoggedIn]);

  // ── Load V1 field defs when entering form step for V1 ──
  useEffect(() => {
    if (step !== 'form' || isV2 || !selectedType || !lockedSubSector) return;
    let cancelled = false;
    setLoadingV1Defs(true);
    (async () => {
      try {
        const defs = await getFieldDefinitions(lockedSubSector.id, selectedType);
        if (!cancelled) setV1FieldDefs(defs);
      } catch {
        if (!cancelled) setV1FieldDefs([]);
      } finally {
        if (!cancelled) setLoadingV1Defs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [step, isV2, selectedType, lockedSubSector]);

  // ── Step: context — determine initial state ──
  const handleContextContinue = useCallback(() => {
    if (isOperational) {
      // Auctions / logistics have their own modals — caller handles routing
      setLockedSectorId(browsingSector!.id);
      setLockedSubSectorId(null);
      setStep('confirm');
      return;
    }
    if (browsingSubSector) {
      setLockedSectorId(browsingSector!.id);
      setLockedSubSectorId(browsingSubSector.id);
      setStep('selectType');
    } else {
      // No sub-sector — need to pick one
      setLockedSectorId(browsingSector?.id ?? null);
      setStep('selectSubSector');
    }
  }, [isOperational, browsingSector, browsingSubSector]);

  const handleChangeSection = useCallback(() => {
    setStep('selectSector');
    setLockedSectorId(null);
    setLockedSubSectorId(null);
  }, []);

  const handleSectorPick = useCallback((sectorId: string) => {
    setLockedSectorId(sectorId);
    setLockedSubSectorId(null);
    setStep('selectSubSector');
  }, []);

  const handleSubSectorPick = useCallback((subSectorId: string | null) => {
    setLockedSubSectorId(subSectorId);
  }, []);

  const handleSubSectorConfirm = useCallback(() => {
    if (lockedSectorId && lockedSubSectorId) {
      setStep('selectType');
    } else if (lockedSectorId && !lockedSubSectorId && !isOperational) {
      // Allow publishing at sector level if no sub-sector needed
      setStep('selectType');
    }
  }, [lockedSectorId, lockedSubSectorId, isOperational]);

  const handleTypeSelect = useCallback((actionId: string) => {
    setSelectedType(actionId);
    setStep('confirm');
  }, []);

  const handleConfirmProceed = useCallback(() => {
    if (!isLoggedIn) {
      setStep('login');
      onLoginRequired();
      return;
    }
    // If operational sector, the caller handles routing — just close
    if (isOperational) {
      onClose();
      return;
    }
    // For V2 with publisher entity requirement, go to publisher step
    if (isV2) {
      setStep('publisher');
    } else {
      // V1 — also needs publisher for pending_review, but form handles it
      setStep('form');
    }
  }, [isLoggedIn, isOperational, isV2, onClose, onLoginRequired]);

  // ── Resume after login ──
  // App.tsx will re-render with isLoggedIn=true; we detect the transition
  const wasLoggedIn = useMemo(() => isLoggedIn, [isLoggedIn]);
  useEffect(() => {
    if (step === 'login' && wasLoggedIn) {
      // Login succeeded — proceed to publisher or form
      if (isOperational) {
        onClose();
      } else if (isV2) {
        setStep('publisher');
      } else {
        setStep('form');
      }
    }
  }, [step, wasLoggedIn, isOperational, isV2, onClose]);

  const handlePublisherConfirm = useCallback(() => {
    setStep('form');
  }, []);

  const handlePublisherSkip = useCallback(() => {
    // Allow proceeding without publisher (draft mode)
    setStep('form');
  }, []);

  // ── V1 form submit ──
  const handleV1FormSubmit = useCallback(
    (data: FormData, status: 'draft' | 'pending_review', publisherEntityId: string | null) => {
      if (selectedType) {
        onV1Submit(selectedType, data, v1FieldDefs, status, publisherEntityId);
      }
    },
    [selectedType, v1FieldDefs, onV1Submit],
  );

  // ── V2 form success ──
  const handleV2Success = useCallback(
    (title: string, status: string) => {
      onV2Success(title, status);
    },
    [onV2Success],
  );

  const handleBack = useCallback(() => {
    if (step === 'selectSector') {
      setStep('context');
      setLockedSectorId(browsingSector?.id ?? null);
    } else if (step === 'selectSubSector') {
      if (lockedSectorId && lockedSectorId !== browsingSector?.id) {
        setStep('selectSector');
      } else {
        setStep('context');
      }
    } else if (step === 'selectType') {
      if (lockedSubSectorId) {
        setStep('selectSubSector');
      } else {
        setStep('context');
      }
    } else if (step === 'confirm') {
      setStep('selectType');
      setSelectedType(null);
    } else if (step === 'publisher') {
      setStep('confirm');
    } else if (step === 'form') {
      if (isV2) {
        setStep('publisher');
      } else {
        setStep('confirm');
      }
    }
  }, [step, lockedSectorId, lockedSubSectorId, browsingSector, isV2]);

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  const selectedTypeLabel = selectedType
    ? operationLabels[selectedType] ?? allowedActions.find((a) => a.id === selectedType)?.label ?? selectedType
    : '';

  const showBackButton = step !== 'context' && step !== 'login';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-slide-up max-h-[85vh] overflow-y-auto fancy-scroll shadow-float">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-white px-5 pt-2 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {showBackButton && (
              <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-siwar-500 to-siwar-700" />
            <h4 className="text-base font-bold text-gray-800">
              {step === 'context' && 'نشر فرصة'}
              {step === 'selectSector' && 'اختيار القطاع'}
              {step === 'selectSubSector' && 'اختيار الفرع'}
              {step === 'selectType' && 'نوع الفرصة'}
              {step === 'confirm' && 'تأكيد النشر'}
              {step === 'login' && 'تسجيل الدخول'}
              {step === 'publisher' && 'الجهة الناشرة'}
              {step === 'form' && selectedTypeLabel}
            </h4>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* ════════ Step: context ════════ */}
          {step === 'context' && browsingSector && (
            <div className="space-y-4">
              {/* Operational sectors */}
              {isOperational && (
                <>
                  <ContextBanner sector={browsingSector} subSector={null} />
                  <button
                    onClick={handleContextContinue}
                    className="w-full py-3 rounded-2xl bg-gradient-to-l from-siwar-500 to-siwar-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {browsingSector.slug === 'auctions' ? (
                      <><Gavel className="w-4 h-4" />متابعة إلى طلب المزاد</>
                    ) : (
                      <><Truck className="w-4 h-4" />متابعة إلى الطلب اللوجستي</>
                    )}
                  </button>
                </>
              )}

              {/* Normal sector with sub-sector */}
              {!isOperational && browsingSubSector && (
                <>
                  <ContextBanner sector={browsingSector} subSector={browsingSubSector} />
                  <div className="space-y-2.5">
                    <button
                      onClick={handleContextContinue}
                      className="w-full py-3 rounded-2xl bg-gradient-to-l from-siwar-500 to-siwar-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      متابعة في {browsingSubSector.name}
                    </button>
                    <button
                      onClick={handleChangeSection}
                      className="w-full py-3 rounded-2xl bg-white border-2 border-gray-200 text-gray-600 font-bold text-sm hover:border-siwar-300 hover:bg-siwar-50/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      تغيير القسم
                    </button>
                  </div>
                </>
              )}

              {/* Normal sector without sub-sector */}
              {!isOperational && !browsingSubSector && (
                <>
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-siwar-50 to-siwar-100 border border-siwar-200">
                      {renderSectorIcon(browsingSector.slug, 'w-8 h-8')}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">أنت الآن داخل:</p>
                      <p className="text-base font-bold text-gray-800">قطاع {browsingSector.name}</p>
                      <p className="text-xs text-amber-600 font-medium">اختر الفرع الذي تريد النشر فيه أولاً</p>
                    </div>
                  </div>

                  {relevantSubSectors.length > 0 && (
                    <div className="grid grid-cols-2 gap-2.5">
                      {relevantSubSectors.map((sub, idx) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setLockedSectorId(browsingSector.id);
                            setLockedSubSectorId(sub.id);
                            setStep('selectType');
                          }}
                          className="tap-scale flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:border-siwar-300 hover:shadow-card transition-all duration-300 text-center spring-in"
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-siwar-50 border border-siwar-100">
                            <Layers className="w-4 h-4 text-siwar-600" />
                          </div>
                          <span className="text-xs font-bold text-gray-800">{sub.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {relevantSubSectors.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <AlertCircle className="w-8 h-8 text-gray-300" />
                      <p className="text-xs text-gray-400">لا توجد فروع متاحة في هذا القطاع</p>
                    </div>
                  )}

                  <button
                    onClick={handleChangeSection}
                    className="w-full py-3 rounded-2xl bg-white border-2 border-gray-200 text-gray-600 font-bold text-sm hover:border-siwar-300 hover:bg-siwar-50/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    اختيار قطاع آخر
                  </button>
                </>
              )}
            </div>
          )}

          {step === 'context' && !browsingSector && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">لا يمكن النشر بدون اختيار قطاع. يرجى اختيار قطاع أولاً.</p>
            </div>
          )}

          {/* ════════ Step: selectSector ════════ */}
          {step === 'selectSector' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100">
                <AlertCircle className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <p className="text-xs text-sky-700">اختر القطاع الذي تريد النشر فيه</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {creatableSectors.map((sector, idx) => (
                  <button
                    key={sector.id}
                    onClick={() => handleSectorPick(sector.id)}
                    className="tap-scale flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:border-siwar-300 hover:shadow-card transition-all duration-300 text-center spring-in"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm">
                      {renderSectorIcon(sector.slug, 'w-7 h-7')}
                    </div>
                    <span className="text-xs font-bold text-gray-800">{sector.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ════════ Step: selectSubSector ════════ */}
          {step === 'selectSubSector' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100">
                <AlertCircle className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <p className="text-xs text-sky-700">
                  اختر الفرع داخل قطاع {lockedSector?.name ?? ''}
                </p>
              </div>

              {relevantSubSectors.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    {relevantSubSectors.map((sub, idx) => {
                      const isSelected = lockedSubSectorId === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSubSectorPick(sub.id)}
                          className={`tap-scale flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all duration-300 text-center spring-in ${
                            isSelected
                              ? 'border-siwar-400 bg-siwar-50 shadow-sm'
                              : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:border-siwar-300 hover:shadow-card'
                          }`}
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-siwar-50 border border-siwar-100">
                            <Layers className="w-4 h-4 text-siwar-600" />
                          </div>
                          <span className="text-xs font-bold text-gray-800">{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleSubSectorConfirm}
                    disabled={!lockedSubSectorId}
                    className="w-full py-3 rounded-2xl bg-gradient-to-l from-siwar-500 to-siwar-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    تأكيد الفرع
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <AlertCircle className="w-8 h-8 text-gray-300" />
                  <p className="text-xs text-gray-400">لا توجد فروع متاحة في هذا القطاع</p>
                </div>
              )}
            </div>
          )}

          {/* ════════ Step: selectType ════════ */}
          {step === 'selectType' && (
            <div className="space-y-3">
              {lockedSector && lockedSubSector && (
                <ContextBanner sector={lockedSector} subSector={lockedSubSector} compact />
              )}

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100">
                <Sparkles className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <p className="text-xs text-sky-700">اختر نوع الفرصة التي تريد نشرها</p>
              </div>

              {allowedActions.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl icon-3d text-siwar-700">
                    <Sparkles className="w-5 h-5 icon-emboss" />
                  </div>
                  <p className="text-sm text-gray-500">لا توجد أنواع فرص مدعومة في هذا الفرع حالياً.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {allowedActions.map((action, idx) => (
                    <button
                      key={action.id}
                      onClick={() => handleTypeSelect(action.id)}
                      className="tap-scale flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:border-siwar-300 hover:shadow-card transition-all duration-300 text-center group spring-in"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl icon-3d text-siwar-700 group-hover:badge-3d group-hover:text-white transition-all duration-300">
                        <Plus className="w-5 h-5 icon-emboss group-hover:icon-emboss-active" strokeWidth={2.5} />
                      </div>
                      <span className="text-xs font-bold text-gray-800">
                        {operationLabels[action.id] ?? action.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-[10px] text-gray-400">
                  القالب: V{templateVersion} — يتم اختيار النموذج المناسب تلقائياً
                </span>
              </div>
            </div>
          )}

          {/* ════════ Step: confirm ════════ */}
          {step === 'confirm' && lockedSector && (
            <div className="space-y-4">
              {isOperational ? (
                <>
                  <ContextBanner sector={lockedSector} subSector={null} />
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <p className="text-sm text-gray-600">
                      {lockedSector.slug === 'auctions'
                        ? 'سيتم إنشاء طلب مزاد داخل قطاع المزادات'
                        : 'سيتم إنشاء طلب خدمة لوجستية داخل قطاع اللوجستيات'}
                    </p>
                  </div>
                  <button
                    onClick={handleConfirmProceed}
                    className="w-full py-3 rounded-2xl bg-gradient-to-l from-siwar-500 to-siwar-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {lockedSector.slug === 'auctions' ? <Gavel className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                    متابعة
                  </button>
                </>
              ) : (
                <>
                  <ContextBanner sector={lockedSector} subSector={lockedSubSector} />

                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-siwar-50 to-siwar-100 border border-siwar-200">
                      <Check className="w-8 h-8 text-siwar-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">سيتم إنشاء:</p>
                      <p className="text-lg font-bold text-gray-800">
                        فرصة {selectedTypeLabel}
                      </p>
                      <p className="text-xs text-gray-400">داخل:</p>
                      <div className="flex items-center justify-center gap-1.5 text-sm text-siwar-600 font-medium">
                        <span>{lockedSector.name}</span>
                        {lockedSubSector && (
                          <>
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>{lockedSubSector.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[10px] text-gray-500">القالب: V{templateVersion}</span>
                    </div>
                  </div>

                  {!isLoggedIn && (
                    <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-l from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 flex-shrink-0">
                        <Lock className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        سجّل دخولك للمتابعة. سيتم حفظ القطاع والفرع ونوع الفرصة ولن تفقد السياق.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleConfirmProceed}
                    className="w-full py-3 rounded-2xl bg-gradient-to-l from-siwar-500 to-siwar-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isLoggedIn ? (
                      <><Check className="w-4 h-4" />متابعة النشر</>
                    ) : (
                      <><Lock className="w-4 h-4" />تسجيل الدخول للمتابعة</>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ════════ Step: login ════════ */}
          {step === 'login' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                <Lock className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">بانتظار تسجيل الدخول</p>
                <p className="text-xs text-gray-500 max-w-xs">
                  سيتم حفظ السياق (القطاع، الفرع، نوع الفرصة) والعودة تلقائياً بعد تسجيل الدخول.
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-siwar-50 border border-siwar-100">
                <Loader2 className="w-4 h-4 text-siwar-600 animate-spin" />
                <span className="text-xs text-siwar-700">في انتظار تسجيل الدخول...</span>
              </div>
            </div>
          )}

          {/* ════════ Step: publisher ════════ */}
          {step === 'publisher' && lockedSector && (
            <div className="space-y-4">
              <ContextBanner sector={lockedSector} subSector={lockedSubSector} compact />
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-siwar-50 border border-siwar-100">
                <Building2 className="w-4 h-4 text-siwar-600" />
                <span className="text-xs font-bold text-siwar-700">الجهة الناشرة</span>
              </div>

              {loadingPublishers ? (
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200">
                  <Loader2 className="w-4 h-4 text-siwar-500 animate-spin" />
                  <span className="text-sm text-gray-500">جاري تحميل الجهات...</span>
                </div>
              ) : publisherEntities.length === 0 ? (
                <div className="space-y-3">
                  <div className="px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-700 leading-relaxed">
                      لا توجد جهة ناشرة مرتبطة بحسابك. يجب إنشاء جهة ناشرة قبل الإرسال للمراجعة.
                      يمكنك المتابعة لحفظ الفرصة كمسودة مؤقتاً.
                    </p>
                  </div>
                  <button
                    onClick={handlePublisherSkip}
                    className="w-full py-3 rounded-2xl bg-white border-2 border-gray-200 text-gray-600 font-bold text-sm hover:border-siwar-300 hover:bg-siwar-50/30 transition-all active:scale-95"
                  >
                    متابعة كمسودة (بدون جهة ناشرة)
                  </button>
                </div>
              ) : publisherEntities.length === 1 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-siwar-50 border border-siwar-200">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-siwar-100">
                      <Building2 className="w-5 h-5 text-siwar-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">تم اختيار الجهة تلقائياً:</p>
                      <p className="text-sm font-bold text-gray-800">{publisherEntities[0].name}</p>
                    </div>
                    <Check className="w-5 h-5 text-siwar-600 mr-auto" />
                  </div>
                  <button
                    onClick={handlePublisherConfirm}
                    className="w-full py-3 rounded-2xl bg-gradient-to-l from-siwar-500 to-siwar-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    متابعة إلى النموذج
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {publisherEntities.map((pe) => {
                      const isSelected = selectedPublisherId === pe.id;
                      return (
                        <button
                          key={pe.id}
                          onClick={() => setSelectedPublisherId(pe.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-right ${
                            isSelected
                              ? 'border-siwar-400 bg-siwar-50'
                              : 'border-gray-200 bg-white hover:border-siwar-300'
                          }`}
                        >
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-100">
                            <Building2 className="w-5 h-5 text-siwar-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-800">{pe.name}</p>
                            <p className="text-xs text-gray-400">{pe.entity_type}</p>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-siwar-600" />}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handlePublisherConfirm}
                    disabled={!selectedPublisherId}
                    className="w-full py-3 rounded-2xl bg-gradient-to-l from-siwar-500 to-siwar-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    متابعة إلى النموذج
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════ Step: form ════════ */}
          {step === 'form' && lockedSector && selectedType && (
            <>
              {isV2 ? (
                <OpportunityForm
                  sectorId={lockedSector.id}
                  subSectorId={lockedSubSector?.id ?? ''}
                  operationType={selectedType}
                  templateVersion={templateVersion}
                  isLoggedIn={isLoggedIn}
                  onCancel={handleBack}
                  onSuccess={handleV2Success}
                />
              ) : loadingV1Defs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
                </div>
              ) : v1FieldDefs.length > 0 ? (
                <DynamicForm
                  fields={v1FieldDefs}
                  onSubmit={handleV1FormSubmit}
                  onCancel={handleBack}
                  isLoggedIn={isLoggedIn}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl icon-3d text-siwar-700">
                    <Sparkles className="w-5 h-5 icon-emboss" />
                  </div>
                  <p className="text-sm text-gray-500">لا توجد حقول معرفة لهذه العملية بعد.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Context banner sub-component ──
function ContextBanner({
  sector,
  subSector,
  compact,
}: {
  sector: Sector;
  subSector: SubSector | null;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl bg-siwar-50 border border-siwar-100 ${compact ? 'mb-2' : ''}`}>
      <MapPin className="w-4 h-4 text-siwar-600 flex-shrink-0" />
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-gray-500">النشر في:</span>
        <span className="font-bold text-gray-800">{sector.name}</span>
        {subSector && (
          <>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="font-bold text-siwar-700">{subSector.name}</span>
          </>
        )}
      </div>
    </div>
  );
}
