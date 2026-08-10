import { Plus, Sparkles } from 'lucide-react';

type Props = {
  isLoggedIn: boolean;
  onAddOpportunity: () => void;
};

export default function EmptyState({ isLoggedIn, onAddOpportunity }: Props) {
  return (
    <div className="px-4 py-16 text-center animate-fade-in">
      <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-5">
        <div className="absolute inset-0 rounded-3xl bg-siwar-100/40 blur-2xl animate-pulse-soft" />
        <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-siwar-50 to-siwar-100 border border-siwar-200 animate-float">
          <Sparkles className="w-9 h-9 text-siwar-500" />
        </div>
      </div>
      <p className="text-sm text-gray-700 mb-1 font-bold">
        لا توجد نشاطات منشورة في هذا القطاع حاليًا.
      </p>
      <p className="text-sm text-gray-400 mb-6">كن أول من يضيف فرصة.</p>
      <button
        onClick={onAddOpportunity}
        className="tap-scale inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-siwar-600 to-siwar-700 text-white rounded-xl text-sm font-bold hover:shadow-glow-siwar transition-all duration-300 shadow-soft"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        إضافة فرصة
      </button>
    </div>
  );
}
