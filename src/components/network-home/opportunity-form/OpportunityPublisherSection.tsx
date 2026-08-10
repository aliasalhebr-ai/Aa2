import { Building2, ChevronDown, Loader2 } from 'lucide-react';
import { baseInputClass, FieldError, entityTypeLabels } from './shared';
import type { OpportunityFormState } from './useOpportunityFormState';

export default function OpportunityPublisherSection({ state }: { state: OpportunityFormState }) {
  const {
    isLoggedIn, publisherEntities, selectedPublisherId, setSelectedPublisherId,
    loadingPublishers, errors, clearError,
  } = state;

  if (!isLoggedIn) return null;

  return (
    <div className="space-y-1.5 pt-2 border-t border-gray-100">
      <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
        <Building2 className="w-4 h-4 text-siwar-600" />
        الجهة الناشرة
        <span className="text-red-500">*</span>
        <span className="text-xs font-normal text-gray-400">(مطلوبة للإرسال للمراجعة)</span>
      </label>
      {loadingPublishers ? (
        <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200">
          <Loader2 className="w-4 h-4 text-siwar-500 animate-spin" />
          <span className="text-sm text-gray-500">جاري تحميل الجهات...</span>
        </div>
      ) : publisherEntities.length === 0 ? (
        <div className="px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700 leading-relaxed">
            لا توجد جهة ناشرة مرتبطة بحسابك. يمكنك حفظ الفرصة كمسودة، لكن يجب إنشاء جهة ناشرة قبل الإرسال للمراجعة.
          </p>
        </div>
      ) : (
        <div className="relative">
          <select
            value={selectedPublisherId ?? ''}
            onChange={(e) => { setSelectedPublisherId(e.target.value || null); clearError('_publisher'); }}
            className={baseInputClass(!!errors._publisher) + ' appearance-none pl-10'}
          >
            <option value="">اختر الجهة الناشرة...</option>
            {publisherEntities.map((pe) => (
              <option key={pe.id} value={pe.id}>
                {pe.name} ({entityTypeLabels[pe.entity_type] ?? pe.entity_type})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      )}
      {errors._publisher && <FieldError msg={errors._publisher} />}
    </div>
  );
}
