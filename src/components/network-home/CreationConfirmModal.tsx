import { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, Check, AlertCircle,
  Gavel, Truck, Layers, FolderTree, ArrowLeftRight,
} from 'lucide-react';
import type { Sector, SubSector } from '@/types';
import { PalmTreeIcon, AppleTreeIcon, AuctionIcon } from '@/components/network-home/SectorIcons';

type Props = {
  browsingSector: Sector | null;
  browsingSubSector: SubSector | null;
  sectors: Sector[];
  subSectors: SubSector[];
  onConfirm: (sectorId: string, subSectorId: string | null) => void;
  onClose: () => void;
};

function renderSectorIcon(slug: string, className: string) {
  if (slug === 'palm' || slug === 'palms') return <PalmTreeIcon className={className} />;
  if (slug === 'auctions') return <AuctionIcon className={className} />;
  if (slug === 'logistics') return <Truck className={className} />;
  return <AppleTreeIcon className={className} />;
}

export default function CreationConfirmModal({
  browsingSector,
  browsingSubSector,
  sectors,
  subSectors,
  onConfirm,
  onClose,
}: Props) {
  // ── Internal flow state ──
  // step: 'confirm' | 'selectSector' | 'selectSubSector'
  const [step, setStep] = useState<'confirm' | 'selectSector' | 'selectSubSector'>('confirm');
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [selectedSubSectorId, setSelectedSubSectorId] = useState<string | null>(null);

  // Reset when opened
  useEffect(() => {
    setStep('confirm');
    setSelectedSectorId(null);
    setSelectedSubSectorId(null);
  }, []);

  const isAuctions = browsingSector?.slug === 'auctions';
  const isLogistics = browsingSector?.slug === 'logistics';
  const isOperational = isAuctions || isLogistics;

  // ── Sectors available for creation (exclude operational sectors from the "change sector" list) ──
  const creatableSectors = sectors.filter((s) => s.is_active);

  // ── Sub-sectors for the selected sector (or browsing sector if confirming) ──
  const relevantSectorId = selectedSectorId ?? browsingSector?.id ?? null;
  const relevantSubSectors = subSectors.filter((s) => s.sector_id === relevantSectorId && s.is_active);

  const handleContinue = useCallback(() => {
    if (isOperational) {
      onConfirm(browsingSector!.id, null);
    } else if (browsingSubSector) {
      onConfirm(browsingSector!.id, browsingSubSector.id);
    } else {
      // No sub-sector selected — go to sub-sector selection
      setStep('selectSubSector');
    }
  }, [isOperational, browsingSector, browsingSubSector, onConfirm]);

  const handleChangeSection = useCallback(() => {
    setStep('selectSector');
    setSelectedSectorId(null);
    setSelectedSubSectorId(null);
  }, []);

  const handleSectorPick = useCallback((sectorId: string) => {
    setSelectedSectorId(sectorId);
    setSelectedSubSectorId(null);
    setStep('selectSubSector');
  }, []);

  const handleSubSectorPick = useCallback((subSectorId: string) => {
    setSelectedSubSectorId(subSectorId);
  }, []);

  const handleConfirmNewSection = useCallback(() => {
    if (selectedSectorId) {
      onConfirm(selectedSectorId, selectedSubSectorId);
    }
  }, [selectedSectorId, selectedSubSectorId, onConfirm]);

  const handleBack = useCallback(() => {
    if (step === 'selectSubSector') {
      // The only way to reach selectSubSector is from handleSectorPick
      // (after the user chose to change the sector), so go back to sector selection.
      setStep('selectSector');
    } else if (step === 'selectSector') {
      setStep('confirm');
    }
  }, [step]);

  // ── Render ──
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-slide-up max-h-[80vh] overflow-y-auto fancy-scroll shadow-float">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-white px-5 pt-2 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {step !== 'confirm' && (
              <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-siwar-500 to-siwar-700" />
            <h4 className="text-base font-bold text-gray-800">
              {step === 'confirm' && 'تأكيد قسم النشر'}
              {step === 'selectSector' && 'اختيار القطاع'}
              {step === 'selectSubSector' && 'اختيار الفرع'}
            </h4>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* ── Step 1: Confirm current section ── */}
          {step === 'confirm' && browsingSector && (
            <div className="space-y-4">
              {/* Operational sectors (auctions / logistics) */}
              {isOperational && (
                <>
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-siwar-50 to-siwar-100 border border-siwar-200">
                      {renderSectorIcon(browsingSector.slug, 'w-8 h-8')}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {isAuctions
                          ? 'أنت الآن تنشئ طلب مزاد داخل قطاع المزادات'
                          : 'أنت الآن تنشئ طلب خدمة لوجستية داخل قطاع اللوجستيات الزراعية'}
                      </p>
                      <p className="text-xs text-gray-400">
                        سيتم نشر الطلب داخل هذا القسم فقط
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleContinue}
                    className="w-full py-3 rounded-2xl bg-gradient-to-l from-siwar-500 to-siwar-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Gavel className="w-4 h-4" />
                    {isAuctions ? 'متابعة إلى طلب المزاد' : 'متابعة إلى الطلب اللوجستي'}
                  </button>
                </>
              )}

              {/* Normal sectors with sub-sector selected */}
              {!isOperational && browsingSubSector && (
                <>
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-siwar-50 to-siwar-100 border border-siwar-200">
                      {renderSectorIcon(browsingSector.slug, 'w-8 h-8')}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">أنت الآن تنشر في:</p>
                      <p className="text-base font-bold text-gray-800">{browsingSector.name}</p>
                      <div className="flex items-center justify-center gap-1.5 text-sm text-siwar-600 font-medium">
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>{browsingSubSector.name}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 max-w-xs">
                      سيتم نشر الفرصة داخل هذا القسم فقط
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    <button
                      onClick={handleContinue}
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

              {/* Normal sector without sub-sector selected */}
              {!isOperational && !browsingSubSector && (
                <>
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-siwar-50 to-siwar-100 border border-siwar-200">
                      {renderSectorIcon(browsingSector.slug, 'w-8 h-8')}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">أنت الآن داخل:</p>
                      <p className="text-base font-bold text-gray-800">قطاع {browsingSector.name}</p>
                      <p className="text-xs text-gray-500">اختر الفرع الذي تريد النشر فيه</p>
                    </div>
                  </div>

                  {/* Show sub-sectors of current sector */}
                  {relevantSubSectors.length > 0 && (
                    <div className="grid grid-cols-2 gap-2.5">
                      {relevantSubSectors.map((sub, idx) => (
                        <button
                          key={sub.id}
                          onClick={() => onConfirm(browsingSector.id, sub.id)}
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
                      <FolderTree className="w-8 h-8 text-gray-300" />
                      <p className="text-xs text-gray-400">لا توجد فروع متاحة في هذا القطاع</p>
                    </div>
                  )}

                  {/* Option to select a different sector */}
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

          {/* ── Step 2: Select sector ── */}
          {step === 'selectSector' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100">
                <AlertCircle className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <p className="text-xs text-sky-700">اختر القطاع الذي تريد النشر فيه</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {creatableSectors.map((sector, idx) => {
                  const isSelected = selectedSectorId === sector.id;
                  return (
                    <button
                      key={sector.id}
                      onClick={() => handleSectorPick(sector.id)}
                      className={`tap-scale flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 text-center spring-in ${
                        isSelected
                          ? 'border-siwar-400 bg-siwar-50 shadow-sm'
                          : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:border-siwar-300 hover:shadow-card'
                      }`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm">
                        {renderSectorIcon(sector.slug, 'w-7 h-7')}
                      </div>
                      <span className="text-xs font-bold text-gray-800">{sector.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Select sub-sector ── */}
          {step === 'selectSubSector' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100">
                <AlertCircle className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <p className="text-xs text-sky-700">
                  اختر الفرع داخل قطاع {sectors.find((s) => s.id === selectedSectorId)?.name ?? ''}
                </p>
              </div>

              {relevantSubSectors.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {relevantSubSectors.map((sub, idx) => {
                    const isSelected = selectedSubSectorId === sub.id;
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
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FolderTree className="w-8 h-8 text-gray-300" />
                  <p className="text-xs text-gray-400">لا توجد فروع متاحة في هذا القطاع</p>
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={handleConfirmNewSection}
                disabled={!selectedSectorId}
                className="w-full py-3 rounded-2xl bg-gradient-to-l from-siwar-500 to-siwar-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                تأكيد القسم
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
