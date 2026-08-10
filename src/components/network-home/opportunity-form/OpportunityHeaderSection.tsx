import { baseInputClass, FieldError } from './shared';
import type { OpportunityFormState } from './useOpportunityFormState';

export default function OpportunityHeaderSection({ state }: { state: OpportunityFormState }) {
  const { title, setTitle, description, setDescription, city, setCity, errors, clearError } = state;

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-bold text-siwar-700 flex items-center gap-1.5">
        <span className="w-1 h-4 rounded-full bg-siwar-500" />
        معلومات الفرصة
      </h5>
      <div className="space-y-1.5">
        <label className="flex items-center gap-1 text-sm font-bold text-gray-700">
          عنوان الفرصة <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); clearError('title'); }}
          placeholder="مثال: عرض شتلات سدر متجذرة"
          className={baseInputClass(!!errors.title)}
        />
        {errors.title && <FieldError msg={errors.title} />}
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-gray-700">الوصف</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف تفصيلي للعرض..."
          rows={3}
          className={baseInputClass(false) + ' resize-none'}
        />
      </div>
      <div className="space-y-1.5">
        <label className="flex items-center gap-1 text-sm font-bold text-gray-700">
          المدينة <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={city}
          onChange={(e) => { setCity(e.target.value); clearError('city'); }}
          placeholder="الرياض"
          className={baseInputClass(!!errors.city)}
        />
        {errors.city && <FieldError msg={errors.city} />}
      </div>
    </div>
  );
}
