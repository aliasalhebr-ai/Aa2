import { useState, useEffect, useCallback } from 'react';
import { X, ChevronDown, ChevronUp, Check, AlertCircle, Upload, Loader2, Lock, Building2 } from 'lucide-react';
import type { FieldDefinition, FormData, FormFieldValue, PublisherEntity, VarietyEntry } from '@/types';
import {
  getPalmVarieties, getMeasurementUnits, getPalmServiceBranches,
  getPalmServiceItems, getPalmResidueTypes,
} from '@/services/domainService';
import {
  uploadOpportunityImage, deleteOpportunityImage, createSignedImageUrl,
  getPublisherEntitiesForUser,
} from '@/services/opportunityService';
import type {
  PalmVariety, MeasurementUnit, PalmServiceBranch, PalmServiceItem, PalmResidueType,
} from '@/types';
import VarietyEditor from './VarietyEditor';

type Props = {
  fields: FieldDefinition[];
  onSubmit: (data: FormData, status: 'draft' | 'pending_review', publisherEntityId: string | null) => void;
  onCancel: () => void;
  isLoggedIn: boolean;
};

type OptionItem = { value: string; label: string; branch_id?: string };
type OptionsMap = Record<string, OptionItem[]>;

type UploadedImage = {
  path: string;
  signedUrl: string;
  name: string;
  uploading: boolean;
  error?: string;
};

const staticOptionLabels: Record<string, Record<string, string>> = {
  sale_model: { full_harvest: 'بيع كامل ثمار المزرعة', by_kilo: 'بيع ثمار المزرعة بالكيلو' },
  fruit_condition: { رطب: 'رطب', تمر: 'تمر', بسر: 'بسر', خلال: 'خلال' },
  price_or_quote: { price: 'سعر محدد', quote: 'طلب عرض سعر' },
  palm_condition: { ممتازة: 'ممتازة', جيدة: 'جيدة', مقبولة: 'مقبولة' },
  uprooting_readiness: { جاهز: 'جاهز', 'يحتاج تهيئة': 'يحتاج تهيئة', 'غير جاهز': 'غير جاهز' },
  rooting_status: { متجذر: 'متجذر', 'غير متجذر': 'غير متجذر', جزئي: 'جزئي' },
  seedling_condition: { ممتازة: 'ممتازة', جيدة: 'جيدة', مقبولة: 'مقبولة' },
  kerb_status: { سليم: 'سليم', 'سليم مع ملاحظات': 'سليم مع ملاحظات', 'يحتاج معالجة': 'يحتاج معالجة' },
  takreb_type: { هلالي: 'هلالي', عادي: 'عادي' },
  uniformity_grade: { عالي: 'عالي', متوسط: 'متوسط', منخفض: 'منخفض' },
  root_condition: { سليمة: 'سليمة', 'تحتاج معالجة': 'تحتاج معالجة', محدودة: 'محدودة' },
  quantity_method: { weight: 'بالوزن', count: 'بالعدد', manual_desc: 'وصف يدوي' },
  material_condition: { جافة: 'جافة', طازجة: 'طازجة', مخلوطة: 'مخلوطة' },
  loading_readiness: { جاهز: 'جاهز', 'يحتاج تجهيز': 'يحتاج تجهيز', 'غير جاهز': 'غير جاهز' },
  condition: { new: 'جديد', used: 'مستعمل' },
  seasonality: { year_round: 'طوال العام', seasonal: 'موسمي' },
  provider_type: { individual: 'فرد', team: 'فريق', organization: 'مؤسسة', company: 'شركة' },
  supply_category: {
    irrigation_systems: 'أنظمة الري', fertilization: 'التسميد والتغذية',
    pest_control: 'مكافحة الآفات والأمراض', pollination_tools: 'أدوات التلقيح والتقليم',
    harvest_equipment: 'معدات الحصاد والخدمة', smart_tech: 'التقنيات الذكية',
    packing_supplies: 'مستلزمات التعبئة الأولية',
  },
  weight_unit: { kg: 'كيلوجرام', ton: 'طن' },
  count_unit: { piece: 'قطعة', bunch: 'عذق', box: 'صندوق' },
};

const entityTypeLabels: Record<string, string> = {
  company: 'شركة', farm: 'مزرعة', organization: 'مؤسسة',
  individual: 'فرد', professional: 'مهني',
};

function labelForStatic(fieldKey: string, value: string): string {
  return staticOptionLabels[fieldKey]?.[value] ?? value;
}

export default function DynamicForm({ fields, onSubmit, onCancel, isLoggedIn }: Props) {
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [optionsMap, setOptionsMap] = useState<OptionsMap>({});
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [publisherEntities, setPublisherEntities] = useState<PublisherEntity[]>([]);
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(null);
  const [loadingPublishers, setLoadingPublishers] = useState(false);

  const isUploading = uploadingCount > 0;
  const hasImageField = fields.some((f) => f.field_type === 'image');

  // Detect palm-fruits offer with sale_model field
  const hasSaleModelField = fields.some((f) => f.field_key === 'sale_model');
  const saleModelValue = formData.sale_model as string | undefined;
  const showVarietyEditor = hasSaleModelField && (saleModelValue === 'full_harvest' || saleModelValue === 'by_kilo');
  const varieties = Array.isArray(formData.varieties) ? formData.varieties as VarietyEntry[] : [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sources = new Set<string>();
      fields.forEach((f) => {
        if (f.options_source && f.options_source !== 'static') sources.add(f.options_source);
      });

      const map: OptionsMap = {};

      if (sources.has('variety')) {
        try {
          const varieties = await getPalmVarieties();
          map.variety = varieties.map((v: PalmVariety) => ({ value: v.slug, label: v.name }));
        } catch { map.variety = []; }
      }
      if (sources.has('units')) {
        try {
          const units = await getMeasurementUnits();
          map.units = units.map((u: MeasurementUnit) => ({ value: u.key, label: u.label }));
        } catch { map.units = []; }
      }
      if (sources.has('service_branches')) {
        try {
          const branches = await getPalmServiceBranches();
          map.service_branches = branches.map((b: PalmServiceBranch) => ({ value: b.key, label: b.label }));
        } catch { map.service_branches = []; }
      }
      if (sources.has('service_items')) {
        try {
          const items = await getPalmServiceItems();
          map.service_items = items.map((i: PalmServiceItem) => ({ value: i.key, label: i.label, branch_id: i.branch_id }));
        } catch { map.service_items = []; }
      }
      if (sources.has('residue_types')) {
        try {
          const types = await getPalmResidueTypes();
          map.residue_types = types.map((t: PalmResidueType) => ({ value: t.key, label: t.label }));
        } catch { map.residue_types = []; }
      }

      if (!cancelled) {
        setOptionsMap(map);
        setLoadingOptions(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fields]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setLoadingPublishers(true);
    (async () => {
      try {
        const entities = await getPublisherEntitiesForUser();
        if (!cancelled) {
          setPublisherEntities(entities);
          if (entities.length === 1) setSelectedPublisherId(entities[0].id);
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingPublishers(false); }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const getOptions = useCallback((field: FieldDefinition): OptionItem[] => {
    if (field.options_source === 'static' && field.static_options) {
      const opts = field.static_options as unknown as string[];
      return opts.map((v) => ({ value: v, label: labelForStatic(field.field_key, v) }));
    }
    if (field.options_source && optionsMap[field.options_source]) {
      return optionsMap[field.options_source];
    }
    return [];
  }, [optionsMap]);

  const isFieldVisible = useCallback((field: FieldDefinition): boolean => {
    if (!field.conditional_field_key || !field.conditional_values) return true;
    const parentValue = formData[field.conditional_field_key];
    if (parentValue === undefined || parentValue === null || parentValue === '') return false;
    const parentStr = String(parentValue);
    return field.conditional_values.includes(parentStr);
  }, [formData]);

  const setFieldValue = useCallback((key: string, value: FormFieldValue) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const toggleMultiSelect = useCallback((key: string, value: string) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] as string[] : [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }, []);

  const handleImageUpload = useCallback(async (files: FileList) => {
    if (!isLoggedIn) return;
    const fileArr = Array.from(files);
    for (const file of fileArr) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setUploadedImages((prev) => [...prev, { path: '', signedUrl: '', name: id, uploading: true }]);
      setUploadingCount((c) => c + 1);
      try {
        const path = await uploadOpportunityImage(file);
        const signedUrl = await createSignedImageUrl(path);
        setUploadedImages((prev) =>
          prev.map((img) => (img.name === id ? { ...img, path, signedUrl, uploading: false } : img)),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل رفع الصورة';
        setUploadedImages((prev) =>
          prev.map((img) => (img.name === id ? { ...img, uploading: false, error: msg } : img)),
        );
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }
  }, [isLoggedIn]);

  const handleRemoveImage = useCallback(async (index: number) => {
    const img = uploadedImages[index];
    if (img.path) {
      try { await deleteOpportunityImage(img.path); } catch { /* ignore */ }
    }
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }, [uploadedImages]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (!isFieldVisible(field)) return;
      if (!field.is_required) return;
      const value = formData[field.field_key];
      if (value === undefined || value === null || value === '') {
        newErrors[field.field_key] = `${field.label} مطلوب`;
      } else if (Array.isArray(value) && value.length === 0) {
        newErrors[field.field_key] = `${field.label} مطلوب`;
      }
    });

    fields.forEach((field) => {
      if (!isFieldVisible(field)) return;
      if (field.field_type !== 'number') return;
      const value = formData[field.field_key];
      if (value === undefined || value === null || value === '') return;
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        newErrors[field.field_key] = `${field.label} يجب أن يكون رقماً موجباً`;
      }
    });

    const minMaxPairs: Record<string, string> = {
      min_trunk_height: 'max_trunk_height',
      min_weight: 'max_weight',
      min_quantity: 'max_quantity',
    };
    Object.entries(minMaxPairs).forEach(([minKey, maxKey]) => {
      const minVal = formData[minKey];
      const maxVal = formData[maxKey];
      if (minVal !== undefined && minVal !== '' && maxVal !== undefined && maxVal !== '') {
        if (Number(minVal) > Number(maxVal)) {
          newErrors[maxKey] = 'الحد الأعلى يجب أن يكون أكبر من أو يساوي الحد الأدنى';
        }
      }
    });

    const execDate = formData.execution_date;
    const offerDeadline = formData.offer_deadline;
    if (execDate && offerDeadline && String(execDate) > String(offerDeadline)) {
      newErrors.offer_deadline = 'آخر موعد للعروض يجب أن يكون قبل تاريخ التنفيذ';
    }

    const quantityMethod = formData.quantity_method;
    if (quantityMethod === 'weight') {
      if (!formData.weight || formData.weight === '') newErrors.weight = 'الوزن مطلوب عند اختيار الكمية بالوزن';
      if (!formData.weight_unit || formData.weight_unit === '') newErrors.weight_unit = 'وحدة الوزن مطلوبة';
    } else if (quantityMethod === 'count') {
      if (!formData.count || formData.count === '') newErrors.count = 'العدد مطلوب عند اختيار الكمية بالعدد';
    } else if (quantityMethod === 'manual_desc') {
      if (!formData.quantity_description || formData.quantity_description === '') newErrors.quantity_description = 'وصف الكمية مطلوب';
    }

    const hasServiceItemsField = fields.some((f) => f.field_key === 'service_items');
    if (hasServiceItemsField) {
      const services = formData.service_items;
      if (!Array.isArray(services) || services.length === 0) newErrors.service_items = 'يجب اختيار خدمة واحدة على الأقل';
    }

    const transportAvailable = formData.transport_available;
    if (transportAvailable === true) {
      const hasTransportMethodField = fields.some((f) => f.field_key === 'transport_method');
      if (hasTransportMethodField && (!formData.transport_method || formData.transport_method === '')) {
        newErrors.transport_method = 'يجب تحديد طريقة توفير النقل';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields, formData, isFieldVisible]);

  const handleSubmit = useCallback(async (status: 'draft' | 'pending_review') => {
    if (isUploading) return;
    if (status === 'pending_review') {
      if (!validate()) return;
      if (!selectedPublisherId) {
        setErrors((prev) => ({ ...prev, _publisher: 'يجب اختيار جهة ناشرة قبل الإرسال للمراجعة' }));
        return;
      }
    }
    setSubmitting(true);
    const imagePaths = uploadedImages
      .filter((img) => img.path && !img.error)
      .map((img) => img.path);
    const dataWithImages = { ...formData, _images: imagePaths } as unknown as FormData;
    onSubmit(dataWithImages, status, selectedPublisherId);
  }, [formData, validate, onSubmit, isUploading, uploadedImages, selectedPublisherId]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
      </div>
    );
  }

  const visibleFields = fields.filter(isFieldVisible);

  const selectedBranches = Array.isArray(formData.service_branches) ? formData.service_branches as string[] : [];
  const allServiceItems = optionsMap.service_items || [];
  const filteredServiceItems = selectedBranches.length > 0
    ? allServiceItems.filter((item) => {
        return item.branch_id != null && selectedBranches.includes(item.branch_id);
      })
    : allServiceItems;

  return (
    <div className="space-y-4">
      {visibleFields.map((field) => {
        const value = formData[field.field_key];
        const error = errors[field.field_key];
        const options = field.field_key === 'service_items' ? filteredServiceItems : getOptions(field);
        const hasError = !!error;

        const baseInputClass = `w-full px-4 py-3.5 rounded-xl border transition-all duration-200 text-sm font-medium text-right ${
          hasError
            ? 'border-red-300 bg-red-50/50 focus:border-red-400'
            : 'border-gray-200 bg-gray-50/50 focus:border-siwar-400 focus:bg-white'
        } focus:outline-none focus:ring-2 focus:ring-siwar-100`;

        return (
          <div key={field.id} className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-bold text-gray-700">
              {field.label}
              {field.is_required && <span className="text-red-500">*</span>}
              {field.unit && <span className="text-xs font-normal text-gray-400">({field.unit})</span>}
            </label>

          {field.field_type === 'text' && (
            <input
              type="text"
              value={(value as string) ?? ''}
              onChange={(e) => setFieldValue(field.field_key, e.target.value)}
              placeholder={field.placeholder ?? ''}
              className={baseInputClass}
            />
          )}

          {field.field_type === 'number' && (
            <input
              type="number"
              min="0"
              value={value !== undefined ? String(value) : ''}
              onChange={(e) => setFieldValue(field.field_key, e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={field.placeholder ?? ''}
              className={baseInputClass}
            />
          )}

          {field.field_type === 'textarea' && (
            <textarea
              value={(value as string) ?? ''}
              onChange={(e) => setFieldValue(field.field_key, e.target.value)}
              placeholder={field.placeholder ?? ''}
              rows={3}
              className={baseInputClass + ' resize-none'}
            />
          )}

          {field.field_type === 'date' && (
            <input
              type="date"
              value={(value as string) ?? ''}
              onChange={(e) => setFieldValue(field.field_key, e.target.value)}
              className={baseInputClass}
            />
          )}

          {field.field_type === 'boolean' && (
            <button
              type="button"
              onClick={() => setFieldValue(field.field_key, !value)}
              className={`flex items-center justify-between w-full px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                value ? 'border-siwar-400 bg-siwar-50' : 'border-gray-200 bg-gray-50/50'
              }`}
            >
              <span className="text-sm font-medium text-gray-700">
                {value ? 'نعم' : 'لا'}
              </span>
              <div className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-siwar-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${value ? 'right-0.5' : 'right-5'}`} />
              </div>
            </button>
          )}

          {field.field_type === 'select' && (
            <div className="relative">
              <select
                value={(value as string) ?? ''}
                onChange={(e) => setFieldValue(field.field_key, e.target.value)}
                className={baseInputClass + ' appearance-none pl-10'}
              >
                <option value="">اختر...</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}

          {field.field_type === 'radio' && (
            <div className="flex gap-2 flex-wrap">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFieldValue(field.field_key, opt.value)}
                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                    value === opt.value
                      ? 'border-siwar-500 bg-siwar-50 text-siwar-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {field.field_type === 'multiselect' && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => toggleSection(field.field_key)}
                className={`flex items-center justify-between w-full px-4 py-3.5 rounded-xl border transition-all ${baseInputClass} appearance-none`}
              >
                <span className="text-sm text-gray-500">
                  {Array.isArray(value) && value.length > 0
                    ? `${value.length} محدد`
                    : 'اختر...'}
                </span>
                {expandedSections[field.field_key]
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {expandedSections[field.field_key] && (
                <div className="max-h-48 overflow-y-auto fancy-scroll rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
                  {options.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">لا توجد خيارات متاحة</p>
                  ) : (
                    options.map((opt) => {
                      const selected = Array.isArray(value) && (value as string[]).includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleMultiSelect(field.field_key, opt.value)}
                          className={`flex items-center justify-between w-full px-4 py-3 text-right transition-colors ${
                            selected ? 'bg-siwar-50 text-siwar-700' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span className="text-sm font-medium">{opt.label}</span>
                          {selected && (
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-siwar-600">
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {field.field_type === 'image' && (
            <div className="space-y-3">
              {isLoggedIn ? (
                <>
                  <div className="flex flex-wrap gap-2.5">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                        {img.uploading ? (
                          <div className="flex items-center justify-center w-full h-full bg-gray-50">
                            <Loader2 className="w-5 h-5 text-siwar-500 animate-spin" />
                          </div>
                        ) : img.error ? (
                          <div className="flex items-center justify-center w-full h-full bg-red-50 p-1">
                            <span className="text-[9px] text-red-500 text-center leading-tight">{img.error}</span>
                          </div>
                        ) : (
                          <>
                            <img src={img.signedUrl} alt="uploaded" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    <label className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isUploading ? 'border-gray-100 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-siwar-300 hover:bg-siwar-50/30'}`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleImageUpload(e.target.files);
                            e.target.value = '';
                          }
                        }}
                      />
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 text-gray-400" />
                      )}
                    </label>
                  </div>
                  <p className="text-xs text-gray-400">JPG, PNG, WebP — حد أقصى 5 ميجابايت لكل صورة</p>
                </>
              ) : (
                <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200">
                  <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <p className="text-xs text-gray-500">سجّل دخولك لرفع الصور</p>
                </div>
              )}
            </div>
          )}

          {hasError && (
            <div className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
          </div>
        );
      })}

      {/* Variety editor for palm-fruits offer */}
      {showVarietyEditor && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-1 text-sm font-bold text-gray-700">
            أصناف المزرعة
            <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 leading-relaxed">
            أضف صنفًا واحدًا أو عدة أصناف، ولكل صنف بياناته وصوره الخاصة.
          </p>
          <VarietyEditor
            varieties={varieties}
            onChange={(updated) => setFieldValue('varieties', updated as unknown as FormFieldValue)}
            varietyOptions={(optionsMap.varieties ?? []) as unknown as PalmVariety[]}
            unitOptions={(optionsMap.units ?? []) as unknown as MeasurementUnit[]}
            saleModel={saleModelValue ?? ''}
            isLoggedIn={isLoggedIn}
          />
        </div>
      )}

      {/* Publisher entity selector */}
      {isLoggedIn && (
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
                لا توجد جهة ناشرة مرتبطة بحسابك. يمكنك حفظ السجل كمسودة، لكن يجب إنشاء جهة ناشرة قبل الإرسال للمراجعة.
              </p>
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedPublisherId ?? ''}
                onChange={(e) => {
                  setSelectedPublisherId(e.target.value || null);
                  setErrors((prev) => { const n = { ...prev }; delete n._publisher; return n; });
                }}
                className={`w-full px-4 py-3.5 rounded-xl border transition-all duration-200 text-sm font-medium text-right border-gray-200 bg-gray-50/50 focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100 appearance-none pl-10`}
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
          {errors._publisher && (
            <div className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors._publisher}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2.5 pt-2">
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => handleSubmit('pending_review')}
            disabled={isUploading || submitting || (isLoggedIn && !selectedPublisherId)}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-l from-siwar-600 to-siwar-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 tap-scale disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري رفع الصور...
              </>
            ) : submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              'إرسال للمراجعة'
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={isUploading || submitting}
            className="flex-1 py-3.5 rounded-xl border border-siwar-200 bg-siwar-50 text-siwar-700 text-sm font-bold hover:bg-siwar-100 transition-all duration-300 tap-scale disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
    </div>
  );
}
