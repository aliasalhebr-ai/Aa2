import { Plus, Trash2, Users, Briefcase, ChevronDown, Loader2, Handshake } from 'lucide-react';
import { baseInputClass, smallInputClass, FieldError } from './shared';
import type { OpportunityFormState } from './useOpportunityFormState';
import type { PartnershipType } from '@/types';

const partnershipTypeLabels: Record<PartnershipType, string> = {
  production: 'شراكة إنتاج',
  supply: 'شراكة توريد',
  project_execution: 'شراكة تنفيذ مشروع',
  distribution_expansion: 'شراكة توزيع أو توسع',
};

const coverageModeLabels: Record<string, string> = {
  single_partner: 'شريك واحد يغطي الاحتياج كاملًا',
  multiple_partners: 'عدة شركاء يغطون المشروع',
  mixed: 'مختلط (بعض الأدوار فردية وبعضها جماعي)',
};

export default function OpportunityPartnershipSection({ state }: { state: OpportunityFormState }) {
  const {
    isPartnership, partnershipProfile, updatePartnershipProfile,
    partnershipRoles, updatePartnershipRole, addPartnershipRole, removePartnershipRole,
    handleRoleCatalogSelect, roleCatalog, loadingRoleCatalog, errors, clearError,
  } = state;

  if (!isPartnership) return null;

  return (
    <div className="space-y-5">
      {/* ═══ 1. معلومات الشراكة ═══ */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <h5 className="text-sm font-bold text-siwar-700 flex items-center gap-1.5">
          <Handshake className="w-4 h-4 text-siwar-600" />
          <span className="w-1 h-4 rounded-full bg-siwar-500" />
          معلومات الشراكة
        </h5>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1 text-sm font-bold text-gray-700">
            نوع الشراكة <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={partnershipProfile.partnership_type}
              onChange={(e) => { updatePartnershipProfile({ partnership_type: e.target.value as PartnershipType }); clearError('partnership_type'); }}
              className={baseInputClass(!!errors.partnership_type) + ' appearance-none pl-10'}
            >
              <option value="">اختر نوع الشراكة...</option>
              {Object.entries(partnershipTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {errors.partnership_type && <FieldError msg={errors.partnership_type} />}
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1 text-sm font-bold text-gray-700">
            الهدف من الشراكة / الوصف <span className="text-red-500">*</span>
          </label>
          <textarea
            value={partnershipProfile.summary}
            onChange={(e) => { updatePartnershipProfile({ summary: e.target.value }); clearError('partnership_summary'); }}
            placeholder="وصف واضح للمشروع أو المبادرة والهدف من الشراكة..."
            rows={3}
            className={baseInputClass(!!errors.partnership_summary) + ' resize-none'}
          />
          {errors.partnership_summary && <FieldError msg={errors.partnership_summary} />}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">المنطقة</label>
            <input type="text" value={partnershipProfile.project_size}
              onChange={(e) => updatePartnershipProfile({ project_size: e.target.value })}
              placeholder="المنطقة" className={baseInputClass(false)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">موقع المشروع التقريبي</label>
            <input type="text" value={partnershipProfile.project_location}
              onChange={(e) => updatePartnershipProfile({ project_location: e.target.value })}
              placeholder="الموقع التقريبي" className={baseInputClass(false)} />
          </div>
        </div>
      </div>

      {/* ═══ 2. حجم المشروع ═══ */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <h5 className="text-sm font-bold text-siwar-700 flex items-center gap-1.5">
          <span className="w-1 h-4 rounded-full bg-siwar-500" />
          حجم المشروع أو الشراكة
        </h5>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">إجمالي الكمية</label>
            <input type="number" min="0" value={partnershipProfile.total_quantity}
              onChange={(e) => updatePartnershipProfile({ total_quantity: e.target.value })}
              placeholder="0" className={baseInputClass(false)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">وحدة القياس</label>
            <input type="text" value={partnershipProfile.total_quantity_unit}
              onChange={(e) => updatePartnershipProfile({ total_quantity_unit: e.target.value })}
              placeholder="مثال: شتلة" className={baseInputClass(false)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">القيمة التقديرية (اختياري)</label>
            <input type="number" min="0" value={partnershipProfile.project_value}
              onChange={(e) => updatePartnershipProfile({ project_value: e.target.value })}
              placeholder="0" className={baseInputClass(false)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">مدة التنفيذ</label>
            <input type="text" value={partnershipProfile.expected_duration}
              onChange={(e) => updatePartnershipProfile({ expected_duration: e.target.value })}
              placeholder="مثال: 6 أشهر" className={baseInputClass(false)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">عدد المواقع</label>
            <input type="number" min="0" value={partnershipProfile.project_sites}
              onChange={(e) => updatePartnershipProfile({ project_sites: e.target.value })}
              placeholder="1" className={baseInputClass(false)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">عدد المراحل</label>
            <input type="number" min="0" value={partnershipProfile.project_phases}
              onChange={(e) => updatePartnershipProfile({ project_phases: e.target.value })}
              placeholder="1" className={baseInputClass(false)} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">نطاق العمل</label>
          <input type="text" value={partnershipProfile.work_scope}
            onChange={(e) => updatePartnershipProfile({ work_scope: e.target.value })}
            placeholder="مثال: إنتاج وتوريد وغرس 300 ألف شتلة" className={baseInputClass(false)} />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={partnershipProfile.is_splittable}
            onChange={(e) => updatePartnershipProfile({ is_splittable: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-siwar-600 focus:ring-siwar-500" />
          <span className="text-xs text-gray-700">المشروع قابل للتجزئة بين عدة شركاء</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={partnershipProfile.project_value_visibility}
            onChange={(e) => updatePartnershipProfile({ project_value_visibility: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-siwar-600 focus:ring-siwar-500" />
          <span className="text-xs text-gray-700">إظهار القيمة المالية للفرصة</span>
        </label>
      </div>

      {/* ═══ 3. التوقيت والتغطية ═══ */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <h5 className="text-sm font-bold text-siwar-700 flex items-center gap-1.5">
          <span className="w-1 h-4 rounded-full bg-siwar-500" />
          التوقيت والتغطية
        </h5>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">تاريخ البداية المتوقع</label>
            <input type="date" value={partnershipProfile.start_date}
              onChange={(e) => { updatePartnershipProfile({ start_date: e.target.value }); clearError('start_date'); }}
              className={baseInputClass(!!errors.start_date)} />
            {errors.start_date && <FieldError msg={errors.start_date} />}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">آخر موعد للانضمام</label>
            <input type="date" value={partnershipProfile.join_deadline}
              onChange={(e) => { updatePartnershipProfile({ join_deadline: e.target.value }); clearError('join_deadline'); }}
              className={baseInputClass(!!errors.join_deadline)} />
            {errors.join_deadline && <FieldError msg={errors.join_deadline} />}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700">نمط التغطية</label>
          <div className="relative">
            <select
              value={partnershipProfile.coverage_mode}
              onChange={(e) => updatePartnershipProfile({ coverage_mode: e.target.value as 'single_partner' | 'multiple_partners' | 'mixed' })}
              className={baseInputClass(false) + ' appearance-none pl-10'}
            >
              {Object.entries(coverageModeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700">عدد الشركاء المطلوب</label>
          <div className="flex gap-2.5">
            <div className="relative">
              <select
                value={partnershipProfile.partners_count_mode}
                onChange={(e) => updatePartnershipProfile({ partners_count_mode: e.target.value as 'fixed' | 'open' })}
                className={baseInputClass(false) + ' appearance-none pl-10 w-32'}
              >
                <option value="fixed">عدد محدد</option>
                <option value="open">مفتوح</option>
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {partnershipProfile.partners_count_mode === 'fixed' && (
              <input type="number" min="1" value={partnershipProfile.required_partners_count}
                onChange={(e) => { updatePartnershipProfile({ required_partners_count: e.target.value }); clearError('required_partners_count'); }}
                placeholder="عدد الشركاء" className={baseInputClass(!!errors.required_partners_count) + ' flex-1'} />
            )}
          </div>
          {errors.required_partners_count && <FieldError msg={errors.required_partners_count} />}
        </div>
      </div>

      {/* ═══ 4. الأدوار المطلوبة ═══ */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-bold text-siwar-700 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-siwar-600" />
            <span className="w-1 h-4 rounded-full bg-siwar-500" />
            الأدوار المطلوبة ({partnershipRoles.length})
          </h5>
          <button type="button" onClick={addPartnershipRole}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-siwar-50 border border-siwar-200 text-siwar-700 text-xs font-bold hover:bg-siwar-100 transition-colors tap-scale">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            إضافة دور
          </button>
        </div>

        {errors._roles && <FieldError msg={errors._roles} />}

        {loadingRoleCatalog ? (
          <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <Loader2 className="w-4 h-4 text-siwar-500 animate-spin" />
            <span className="text-sm text-gray-500">جاري تحميل أدوار الشراكة...</span>
          </div>
        ) : (
          partnershipRoles.map((role, idx) => (
            <div key={idx} className="rounded-2xl border border-gray-200 bg-gray-50/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                  <Briefcase className="w-3.5 h-3.5 text-siwar-500" />
                  دور {idx + 1}
                </span>
                {partnershipRoles.length > 1 && (
                  <button type="button" onClick={() => removePartnershipRole(idx)}
                    className="p-1 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">الدور من الكتالوج</label>
                <div className="relative">
                  <select
                    value={role.role_key}
                    onChange={(e) => handleRoleCatalogSelect(idx, e.target.value)}
                    className={smallInputClass(false) + ' appearance-none pl-8'}
                  >
                    <option value="">اختر دورًا...</option>
                    {roleCatalog.map((r) => (
                      <option key={r.id} value={r.role_key}>{r.name_ar}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {role.role_key && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">وصف الدور</label>
                    <input type="text" value={role.description ?? ''}
                      onChange={(e) => updatePartnershipRole(idx, { description: e.target.value })}
                      placeholder="وصف موجز للمطلوب من هذا الدور"
                      className={smallInputClass(false)} />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">العدد المطلوب</label>
                      <input type="number" min="1" value={role.required_count ?? ''}
                        onChange={(e) => updatePartnershipRole(idx, { required_count: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="1" className={smallInputClass(false)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">الكمية المطلوبة</label>
                      <input type="number" min="0" value={role.required_quantity ?? ''}
                        onChange={(e) => updatePartnershipRole(idx, { required_quantity: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="0" className={smallInputClass(false)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">الوحدة</label>
                      <input type="text" value={role.unit ?? ''}
                        onChange={(e) => updatePartnershipRole(idx, { unit: e.target.value })}
                        placeholder="مثال: شتلة" className={smallInputClass(false)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">الحد الأدنى للطاقة</label>
                      <input type="number" min="0" value={role.minimum_capacity ?? ''}
                        onChange={(e) => updatePartnershipRole(idx, { minimum_capacity: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="0" className={smallInputClass(false)} />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
