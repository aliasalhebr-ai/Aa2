import { AlertCircle, ChevronDown } from 'lucide-react';
import type { ItemFieldDefinition } from '@/types';

export type UploadedImage = { path: string; signedUrl: string; name: string; uploading: boolean; error?: string };

export const entityTypeLabels: Record<string, string> = {
  company: 'شركة', farm: 'مزرعة', organization: 'مؤسسة',
  individual: 'فرد', professional: 'مهني',
};

export const staticLabelMaps: Record<string, Record<string, string>> = {
  unit: { piece: 'قطعة', pot: 'أصيص', bag: 'كيس', box: 'صندوق', dozen: 'دستة', hundred: 'مئة', thousand: 'ألف',
    seedling: 'شتلة', tree: 'شجرة', thousand_seedlings: 'ألف شتلة', tray: 'صينية', unit: 'وحدة', contract: 'كمية تعاقدية' },
  container_size: {
    small_bag: 'كيس صغير', medium_bag: 'كيس متوسط', large_bag: 'كيس كبير',
    pot_15: 'أصيص 15 سم', pot_25: 'أصيص 25 سم', pot_40: 'أصيص 40 سم', ground: 'في الأرض',
  },
  root_status: { rooted: 'متجذر', not_rooted: 'غير متجذر', partial: 'جزئي' },
  readiness: { ready: 'جاهز', needs_prep: 'يحتاج تهيئة', not_ready: 'غير جاهز' },
  readiness_status: { ready: 'جاهز', needs_prep: 'يحتاج تهيئة', not_ready: 'غير جاهز' },
  pricing_type: { fixed: 'سعر ثابت', negotiable: 'قابل للتفاوض', auction: 'مزاد',
    quote: 'طلب عرض سعر', budget: 'ميزانية تقديرية', range_unit: 'نطاق سعر للوحدة', range_project: 'نطاق سعر للمشروع' },
  batch_frequency: { weekly: 'أسبوعي', biweekly: 'نصف شهري', monthly: 'شهري', custom: 'جدول مخصص' },
  opportunity_timing: { scheduled: 'موعد محدد', flexible: 'موعد مرن' },
};

export function labelForStatic(fieldKey: string, value: string): string {
  return staticLabelMaps[fieldKey]?.[value] ?? value;
}

export const baseInputClass = (hasError: boolean) =>
  `w-full px-4 py-3.5 rounded-xl border transition-all duration-200 text-sm font-medium text-right ${
    hasError
      ? 'border-red-300 bg-red-50/50 focus:border-red-400'
      : 'border-gray-200 bg-gray-50/50 focus:border-siwar-400 focus:bg-white'
  } focus:outline-none focus:ring-2 focus:ring-siwar-100`;

export const smallInputClass = (hasError: boolean) =>
  `w-full px-3 py-2.5 rounded-xl border transition-all duration-200 text-xs font-medium text-right ${
    hasError
      ? 'border-red-300 bg-red-50/50 focus:border-red-400'
      : 'border-gray-200 bg-gray-50/50 focus:border-siwar-400 focus:bg-white'
  } focus:outline-none focus:ring-2 focus:ring-siwar-100`;

export function FieldError({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-red-500">
      <AlertCircle className="w-3.5 h-3.5" />
      <span>{msg}</span>
    </div>
  );
}

type GenericFieldProps = {
  field: ItemFieldDefinition;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
};

export function GenericField({ field, value, error, onChange }: GenericFieldProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs font-bold text-gray-700">
        {field.label}
        {field.is_required && <span className="text-red-500">*</span>}
        {field.unit && <span className="text-[10px] font-normal text-gray-400">({field.unit})</span>}
      </label>

      {field.field_type === 'number' && (
        <input
          type="number" min="0" step="0.01"
          value={value !== undefined ? String(value) : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
          className={smallInputClass(!!error)}
        />
      )}

      {field.field_type === 'text' && (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
          className={smallInputClass(!!error)}
        />
      )}

      {field.field_type === 'boolean' && (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border transition-all ${
            value ? 'border-siwar-400 bg-siwar-50' : 'border-gray-200 bg-gray-50/50'
          }`}
        >
          <span className="text-xs font-medium text-gray-700">{value ? 'نعم' : 'لا'}</span>
          <div className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-siwar-600' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${value ? 'right-0.5' : 'right-4.5'}`} />
          </div>
        </button>
      )}

      {field.field_type === 'date' && (
        <input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={smallInputClass(!!error)}
        />
      )}

      {field.field_type === 'select' && (
        <div className="relative">
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={smallInputClass(!!error) + ' appearance-none pl-8'}
          >
            <option value="">اختر...</option>
            {field.static_options?.map((opt) => (
              <option key={opt} value={opt}>{labelForStatic(field.field_key, opt)}</option>
            ))}
          </select>
          <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      )}

      {error && <FieldError msg={error} />}
    </div>
  );
}
