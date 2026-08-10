import { useState } from 'react';
import { Plus, X, Lock, ChevronLeft, Sparkles } from 'lucide-react';
import type { Sector, SubSector, SectorAction } from '@/types';

type Props = {
  sector: Sector | null;
  specialty: SubSector | null;
  actions: SectorAction[];
  isLoggedIn: boolean;
  onCreateAction: (actionId: string) => void;
};

export default function SectorCreationPanel({
  sector,
  specialty,
  actions,
  isLoggedIn,
  onCreateAction,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleActionClick = (actionId: string) => {
    setSheetOpen(false);
    onCreateAction(actionId);
  };

  return (
    <div className="px-3 sm:px-4 pb-2 pt-0.5">
      <div className="relative rounded-2xl overflow-hidden p-4 bg-gradient-to-br from-siwar-50 via-teal-50 to-sand-50 border border-siwar-100 shadow-soft">
        {/* Decorative blurred orbs */}
        <div className="absolute -left-10 -top-10 w-32 h-32 rounded-full bg-siwar-200/30 blur-3xl animate-float" />
        <div className="absolute -right-6 -bottom-10 w-24 h-24 rounded-full bg-amberx-200/20 blur-2xl animate-float" style={{ animationDelay: '1s' }} />

        <div className="relative flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl badge-3d flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-white icon-emboss-active" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-siwar-800">
                إنشاء في {specialty ? specialty.name : `قطاع ${sector?.name || ''}`}
              </h3>
              <p className="text-[11px] text-siwar-600 mt-0.5">اختر ما تريد إنشاءه الآن</p>
            </div>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="tap-scale flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-l from-siwar-600 to-siwar-700 text-white rounded-xl font-bold text-sm hover:shadow-glow-siwar transition-all duration-300 shadow-soft"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            إنشاء
          </button>
        </div>

        {/* Quick actions */}
        {actions.length > 0 && (
          <div className="relative no-scrollbar touch-scroll overflow-x-auto -mx-1">
            <div className="flex gap-2 px-1" style={{ width: 'max-content' }}>
              {actions.slice(0, 5).map((action, idx) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.id)}
                  className="tap-scale flex items-center gap-1.5 px-3.5 py-2 bg-white/90 backdrop-blur-sm text-siwar-700 rounded-full text-xs font-medium hover:bg-white transition-all flex-shrink-0 spring-in chip-3d"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <Plus className="w-3 h-3 icon-emboss" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setSheetOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-slide-up max-h-[75vh] overflow-y-auto fancy-scroll shadow-float">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="sticky top-0 bg-white px-5 pt-2 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-siwar-500 to-siwar-700" />
                <h4 className="text-base font-bold text-gray-800">
                  إنشاء في {specialty ? specialty.name : `قطاع ${sector?.name || ''}`}
                </h4>
              </div>
              <button onClick={() => setSheetOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-5 py-4">
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
