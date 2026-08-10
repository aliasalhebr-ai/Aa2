import { Calendar, Clock, Truck } from 'lucide-react';
import { baseInputClass, FieldError } from './shared';
import type { OpportunityFormState } from './useOpportunityFormState';

export default function OpportunityTimingSection({ state }: { state: OpportunityFormState }) {
  const { isDemand, timing, setTiming, errors, clearError } = state;
  if (!isDemand) return null;

  const updateTiming = (patch: Partial<typeof timing>) => setTiming((prev) => ({ ...prev, ...patch }));
  const updateBatch = (patch: Partial<typeof timing.batch>) =>
    setTiming((prev) => ({ ...prev, batch: { ...prev.batch, ...patch } }));
  const updateScope = (key: keyof typeof timing.scope, value: boolean) =>
    setTiming((prev) => ({ ...prev, scope: { ...prev.scope, [key]: value } }));

  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <h5 className="text-sm font-bold text-siwar-700 flex items-center gap-1.5">
        <span className="w-1 h-4 rounded-full bg-siwar-500" />
        تفاصيل الاحتياج والتوقيت
      </h5>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">المنطقة</label>
          <input type="text" value={timing.region}
            onChange={(e) => updateTiming({ region: e.target.value })}
            placeholder="المنطقة" className={baseInputClass(false)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">موقع التسليم التقريبي</label>
          <input type="text" value={timing.deliveryLocation}
            onChange={(e) => updateTiming({ deliveryLocation: e.target.value })}
            placeholder="موقع التسليم" className={baseInputClass(false)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-siwar-500" />
            آخر موعد لاستقبال العروض
          </label>
          <input type="date" value={timing.bidDeadline}
            onChange={(e) => { updateTiming({ bidDeadline: e.target.value }); clearError('bidDeadline'); }}
            className={baseInputClass(!!errors.bidDeadline)} />
          {errors.bidDeadline && <FieldError msg={errors.bidDeadline} />}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-siwar-500" />
            موعد التوريد المطلوب
          </label>
          <input type="date" value={timing.supplyDate}
            onChange={(e) => { updateTiming({ supplyDate: e.target.value }); clearError('supplyDate'); }}
            className={baseInputClass(!!errors.supplyDate)} />
          {errors.supplyDate && <FieldError msg={errors.supplyDate} />}
        </div>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={timing.isFlexible}
          onChange={(e) => updateTiming({ isFlexible: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-siwar-600 focus:ring-siwar-500" />
        <span className="text-xs text-gray-700">الموعد مرن وقابل للتفاوض</span>
      </label>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={timing.batch.enabled}
          onChange={(e) => updateBatch({ enabled: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-siwar-600 focus:ring-siwar-500" />
        <span className="text-xs text-gray-700">يقبل التوريد على دفعات</span>
      </label>

      {timing.batch.enabled && (
        <div className="space-y-2.5 p-3 rounded-xl bg-siwar-50/50 border border-siwar-100">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">عدد الدفعات</label>
              <input type="number" min="1" value={timing.batch.count}
                onChange={(e) => { updateBatch({ count: e.target.value }); clearError('batchCount'); }}
                placeholder="3" className={baseInputClass(!!errors.batchCount)} />
              {errors.batchCount && <FieldError msg={errors.batchCount} />}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">تكرار الدفعات</label>
              <select value={timing.batch.frequency}
                onChange={(e) => updateBatch({ frequency: e.target.value })}
                className={baseInputClass(false)}>
                <option value="">اختر...</option>
                <option value="weekly">أسبوعي</option>
                <option value="biweekly">نصف شهري</option>
                <option value="monthly">شهري</option>
                <option value="custom">جدول مخصص</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">تاريخ بداية التوريد</label>
              <input type="date" value={timing.batch.startDate}
                onChange={(e) => updateBatch({ startDate: e.target.value })}
                className={baseInputClass(false)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">تاريخ نهاية التوريد</label>
              <input type="date" value={timing.batch.endDate}
                onChange={(e) => updateBatch({ endDate: e.target.value })}
                className={baseInputClass(false)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">الكمية التقريبية لكل دفعة</label>
            <input type="text" value={timing.batch.quantity}
              onChange={(e) => updateBatch({ quantity: e.target.value })}
              placeholder="مثال: 10000 شتلة" className={baseInputClass(false)} />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">مدة المشروع أو التوريد</label>
        <input type="text" value={timing.projectDuration}
          onChange={(e) => updateTiming({ projectDuration: e.target.value })}
          placeholder="مثال: 3 أشهر" className={baseInputClass(false)} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-siwar-500" />
          ما يشمله الاحتياج
        </label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { label: 'النقل', key: 'transport' as const },
            { label: 'التحميل', key: 'loading' as const },
            { label: 'التنزيل', key: 'unloading' as const },
            { label: 'الغرس', key: 'planting' as const },
            { label: 'شبكة الري', key: 'irrigation' as const },
            { label: 'الصيانة', key: 'maintenance' as const },
            { label: 'الاستبدال/الضمان', key: 'replacement' as const },
          ]).map((item) => (
            <label key={item.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={timing.scope[item.key]}
                onChange={(e) => updateScope(item.key, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-siwar-600 focus:ring-siwar-500" />
              <span className="text-xs text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
