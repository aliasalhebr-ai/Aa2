import { AlertCircle, Loader2 } from 'lucide-react';
import { FieldError } from './shared';
import type { OpportunityFormState } from './useOpportunityFormState';

export default function OpportunityReviewSection({
  state, onSubmit, onCancel,
}: {
  state: OpportunityFormState;
  onSubmit: (status: 'draft' | 'pending_review') => void;
  onCancel: () => void;
}) {
  const { submitting, isLoggedIn, selectedPublisherId, errors } = state;

  return (
    <>
      {errors._submit && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-600">{errors._submit}</span>
        </div>
      )}

      <div className="space-y-2.5 pt-2">
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => onSubmit('pending_review')}
            disabled={submitting || (isLoggedIn && !selectedPublisherId)}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-l from-siwar-600 to-siwar-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 tap-scale disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />جاري الإرسال...</>
            ) : 'إرسال للمراجعة'}
          </button>
          <button
            type="button"
            onClick={() => onSubmit('draft')}
            disabled={submitting}
            className="flex-1 py-3.5 rounded-xl border border-siwar-200 bg-siwar-50 text-siwar-700 text-sm font-bold hover:bg-siwar-100 transition-all duration-300 tap-scale disabled:opacity-50 disabled:cursor-not-allowed"
          >
            حفظ كمسودة
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          إلغاء
        </button>
      </div>
    </>
  );
}
