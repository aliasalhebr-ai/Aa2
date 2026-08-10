import { useState, useEffect } from 'react';
import { X, Plus, Lock, Sparkles, ChevronRight, MapPin } from 'lucide-react';
import type { Sector, SubSector, SectorAction, FieldDefinition, FormData } from '@/types';
import { getFieldDefinitions } from '@/services/domainService';
import DynamicForm from './DynamicForm';
import OpportunityForm from './OpportunityForm';

type Props = {
  sector: Sector | null;
  specialty: SubSector | null;
  actions: SectorAction[];
  isLoggedIn: boolean;
  onAction: (actionId: string) => void;
  onSubmit: (actionId: string, data: FormData, fieldDefs: FieldDefinition[], status: 'draft' | 'pending_review', publisherEntityId: string | null) => void;
  onV2Submit: (sectorId: string, subSectorId: string, status: 'draft' | 'pending_review', publisherEntityId: string | null) => void;
  onClose: () => void;
};

export default function CreationModal({ sector, specialty, actions, isLoggedIn, onAction, onSubmit, onV2Submit, onClose }: Props) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [fieldDefs, setFieldDefs] = useState<FieldDefinition[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  const isV2 = sector?.opportunity_template_version === 2;

  useEffect(() => {
    if (!selectedAction || !specialty || isV2) return;
    let cancelled = false;
    setLoadingFields(true);
    (async () => {
      try {
        const defs = await getFieldDefinitions(specialty.id, selectedAction);
        if (!cancelled) setFieldDefs(defs);
      } catch {
        if (!cancelled) setFieldDefs([]);
      } finally {
        if (!cancelled) setLoadingFields(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedAction, specialty, isV2]);

  const handleActionClick = (actionId: string) => {
    if (!isLoggedIn) {
      onAction(actionId);
      return;
    }
    setSelectedAction(actionId);
  };

  const handleFormSubmit = (data: FormData, status: 'draft' | 'pending_review', publisherEntityId: string | null) => {
    if (selectedAction) {
      onSubmit(selectedAction, data, fieldDefs, status, publisherEntityId);
      setSelectedAction(null);
    }
  };

  const handleV2Success = (_title: string, status: string) => {
    if (sector) {
      onV2Submit(sector.id, specialty?.id ?? '', status as 'draft' | 'pending_review', null);
    }
    setSelectedAction(null);
  };

  const handleBack = () => {
    setSelectedAction(null);
    setFieldDefs([]);
  };

  const selectedActionLabel = actions.find((a) => a.id === selectedAction)?.label ?? '';

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

        <div className="sticky top-0 bg-white px-5 pt-2 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {selectedAction && (
              <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-siwar-500 to-siwar-700" />
            <h4 className="text-base font-bold text-gray-800">
              {selectedAction
                ? `${selectedActionLabel} — ${specialty?.name ?? ''}`
                : `إنشاء في ${specialty ? specialty.name : `قطاع ${sector?.name || ''}`}`}
            </h4>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* ── Fixed context banner ── */}
          {specialty && sector && (
            <div className="flex items-center gap-2 px-3 py-2.5 mb-4 rounded-xl bg-siwar-50 border border-siwar-100">
              <MapPin className="w-4 h-4 text-siwar-600 flex-shrink-0" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500">النشر في:</span>
                <span className="font-bold text-gray-800">{sector.name}</span>
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <span className="font-bold text-siwar-700">{specialty.name}</span>
              </div>
            </div>
          )}
          {sector && !specialty && (
            <div className="flex items-center gap-2 px-3 py-2.5 mb-4 rounded-xl bg-siwar-50 border border-siwar-100">
              <MapPin className="w-4 h-4 text-siwar-600 flex-shrink-0" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500">النشر في:</span>
                <span className="font-bold text-siwar-700">قطاع {sector.name}</span>
              </div>
            </div>
          )}

          {!isLoggedIn && (
            <div className="flex items-center gap-2.5 px-4 py-3 mb-4 bg-gradient-to-l from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 flex-shrink-0">
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                سجّل دخولك لإضافة فرصة داخل {specialty ? specialty.name : `قطاع ${sector?.name}`} والوصول إلى الجهات المهتمة.
              </p>
            </div>
          )}

          {!selectedAction && (
            <>
              {actions.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl icon-3d text-siwar-700">
                    <Sparkles className="w-5 h-5 icon-emboss" />
                  </div>
                  <p className="text-sm text-gray-500">لا توجد خيارات إنشاء متاحة في هذا القطاع حالياً.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {actions.map((action, idx) => (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action.id)}
                      className="tap-scale flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:border-siwar-300 hover:shadow-card transition-all duration-300 text-center group spring-in"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl icon-3d text-siwar-700 group-hover:badge-3d group-hover:text-white transition-all duration-300">
                        <Plus className="w-5 h-5 icon-emboss group-hover:icon-emboss-active" strokeWidth={2.5} />
                      </div>
                      <span className="text-xs font-bold text-gray-800">{action.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* V2: data-driven OpportunityForm */}
          {selectedAction && isV2 && (
            <OpportunityForm
              sectorId={sector!.id}
              subSectorId={specialty?.id ?? ''}
              operationType={selectedAction}
              templateVersion={2}
              isLoggedIn={isLoggedIn}
              onCancel={handleBack}
              onSuccess={handleV2Success}
            />
          )}

          {/* V1: legacy DynamicForm (palm sector etc.) */}
          {selectedAction && !isV2 && loadingFields && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
            </div>
          )}

          {selectedAction && !isV2 && !loadingFields && fieldDefs.length > 0 && (
            <DynamicForm
              fields={fieldDefs}
              onSubmit={handleFormSubmit}
              onCancel={handleBack}
              isLoggedIn={isLoggedIn}
            />
          )}

          {selectedAction && !isV2 && !loadingFields && fieldDefs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl icon-3d text-siwar-700">
                <Sparkles className="w-5 h-5 icon-emboss" />
              </div>
              <p className="text-sm text-gray-500">لا توجد حقول معرفة لهذه العملية بعد.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
