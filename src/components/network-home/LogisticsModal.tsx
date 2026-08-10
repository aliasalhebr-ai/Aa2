import { useState, useEffect, useCallback } from 'react';
import { X, Truck, Loader2, Lock, AlertCircle, Building2, ChevronDown, Check, Upload, MapPin, Package } from 'lucide-react';
import type { Sector, SubSector, LogisticsFieldDefinition, FormData, FormFieldValue, PublisherEntity, LogisticsCategory } from '@/types';
import {
  getLogisticsFieldDefinitions, getLogisticsCategories, uploadLogisticsImage,
  deleteLogisticsImage, createLogisticsSignedUrl, createLogisticsRequest,
} from '@/services/logisticsService';
import { getPublisherEntitiesForUser } from '@/services/opportunityService';

type Props = {
  sector: Sector;
  specialty: SubSector;
  isLoggedIn: boolean;
  sourceOpportunityId?: string | null;
  sourceSpecialtyId?: string | null;
  onClose: () => void;
  onCreated: (title: string) => void;
};

type UploadedImage = {
  path: string;
  signedUrl: string;
  name: string;
  uploading: boolean;
  error?: string;
};

const entityTypeLabels: Record<string, string> = {
  company: 'شركة', farm: 'مزرعة', organization: 'مؤسسة',
  individual: 'فرد', professional: 'مهني',
};

export default function LogisticsModal({
  sector, specialty, isLoggedIn, sourceOpportunityId, sourceSpecialtyId, onClose, onCreated,
}: Props) {
  const [categories, setCategories] = useState<LogisticsCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [fieldDefs, setFieldDefs] = useState<LogisticsFieldDefinition[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [publisherEntities, setPublisherEntities] = useState<PublisherEntity[]>([]);
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(null);
  const [loadingPublishers, setLoadingPublishers] = useState(false);

  const isUploading = uploadingCount > 0;
  const fromSpecialty = !!sourceSpecialtyId;
  const effectiveSpecialtyId = sourceSpecialtyId ?? (selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)?.source_specialty_id ?? null
    : null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await getLogisticsCategories(sector.id);
        if (!cancelled) setCategories(cats);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [sector.id]);

  useEffect(() => {
    if (!effectiveSpecialtyId) {
      setFieldDefs([]);
      setLoadingFields(false);
      return;
    }
    let cancelled = false;
    setLoadingFields(true);
    (async () => {
      try {
        const defs = await getLogisticsFieldDefinitions(sector.id, effectiveSpecialtyId);
        if (!cancelled) setFieldDefs(defs);
      } catch {
        if (!cancelled) setFieldDefs([]);
      } finally {
        if (!cancelled) setLoadingFields(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sector.id, effectiveSpecialtyId]);

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

  const setFieldValue = useCallback((key: string, value: FormFieldValue) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const getOptions = useCallback((field: LogisticsFieldDefinition): { value: string; label: string }[] => {
    if (field.static_options && field.static_options.length > 0) {
      return field.static_options.map((v) => ({ value: v, label: v }));
    }
    return [];
  }, []);

  const handleImageUpload = useCallback(async (files: FileList) => {
    if (!isLoggedIn) return;
    const fileArr = Array.from(files);
    for (const file of fileArr) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setUploadedImages((prev) => [...prev, { path: '', signedUrl: '', name: id, uploading: true }]);
      setUploadingCount((c) => c + 1);
      try {
        const path = await uploadLogisticsImage(file);
        const signedUrl = await createLogisticsSignedUrl(path);
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
      try { await deleteLogisticsImage(img.path); } catch { /* ignore */ }
    }
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }, [uploadedImages]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    fieldDefs.forEach((field) => {
      if (!field.is_required) return;
      const value = formData[field.field_key];
      if (value === undefined || value === null || value === '') {
        newErrors[field.field_key] = `${field.label} مطلوب`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fieldDefs, formData]);

  const handleSubmit = useCallback(async (status: 'draft' | 'submitted') => {
    if (isUploading || submitting) return;
    if (status === 'submitted') {
      if (!validate()) return;
      if (!selectedPublisherId) {
        setErrors((prev) => ({ ...prev, _publisher: 'يجب اختيار جهة ناشرة قبل الإرسال' }));
        return;
      }
    }
    setSubmitting(true);
    try {
      const imagePaths = uploadedImages
        .filter((img) => img.path && !img.error)
        .map((img) => img.path);
      const saved = await createLogisticsRequest({
        sectorId: sector.id,
        subSectorId: specialty.id,
        sourceSectorId: sector.id,
        sourceSpecialtyId: effectiveSpecialtyId,
        logisticsCategoryId: selectedCategoryId,
        sourceOpportunityId: sourceOpportunityId ?? null,
        formData,
        fieldDefs,
        images: imagePaths,
        status,
        publisherEntityId: selectedPublisherId,
      });
      onCreated(saved.title);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        _form: err instanceof Error ? err.message : 'فشل حفظ الطلب',
      }));
    } finally {
      setSubmitting(false);
    }
  }, [isUploading, submitting, validate, selectedPublisherId, uploadedImages, formData, fieldDefs, sector.id, specialty.id, effectiveSpecialtyId, selectedCategoryId, sourceOpportunityId, onCreated]);

  const baseInputClass = (hasError: boolean) =>
    `w-full px-4 py-3.5 rounded-xl border transition-all duration-200 text-sm font-medium text-right ${
      hasError
        ? 'border-red-300 bg-red-50/50 focus:border-red-400'
        : 'border-gray-200 bg-gray-50/50 focus:border-siwar-400 focus:bg-white'
    } focus:outline-none focus:ring-2 focus:ring-siwar-100`;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-slide-up max-h-[85vh] overflow-y-auto fancy-scroll shadow-float">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="sticky top-0 bg-white px-5 pt-2 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl icon-3d text-siwar-700">
              <Truck className="w-4 h-4 icon-emboss" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-800">طلب خدمة لوجستية</h4>
              <p className="text-xs text-gray-400">{sector.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Context badge */}
          <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-siwar-50 border border-siwar-100 rounded-xl">
            <Check className="w-4 h-4 text-siwar-600 flex-shrink-0" />
            <p className="text-xs text-siwar-700 leading-relaxed">
              {fromSpecialty
                ? `القطاع والتخصص محددان تلقائياً: ${sector.name} ← ${specialty.name}`
                : `قطاع النخيل محدد تلقائياً — اختر نوع الأصل لعرض النموذج المناسب`}
            </p>
          </div>

          {!isLoggedIn && (
            <div className="flex items-center gap-2.5 px-4 py-3 mb-4 bg-gradient-to-l from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 flex-shrink-0">
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                سجّل دخولك لإنشاء طلب لوجستي وإرساله إلى مركز اللوجستيات.
              </p>
            </div>
          )}

          {/* Category picker (only when coming from logistics branch) */}
          {!fromSpecialty && categories.length > 0 && (
            <div className="space-y-1.5 mb-4">
              <label className="flex items-center gap-1 text-sm font-bold text-gray-700">
                <Package className="w-4 h-4 text-siwar-600" />
                نوع الأصل
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setFormData({});
                    }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      selectedCategoryId === cat.id
                        ? 'border-siwar-500 bg-siwar-50 text-siwar-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Truck className="w-4 h-4 flex-shrink-0" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading fields */}
          {loadingFields && effectiveSpecialtyId && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
            </div>
          )}

          {/* Form fields */}
          {!loadingFields && fieldDefs.length > 0 && (
            <div className="space-y-4">
              {fieldDefs.map((field) => {
                const value = formData[field.field_key];
                const error = errors[field.field_key];
                const options = getOptions(field);
                const hasError = !!error;

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
                        className={baseInputClass(hasError)}
                      />
                    )}

                    {field.field_type === 'number' && (
                      <input
                        type="number"
                        min="0"
                        value={value !== undefined ? String(value) : ''}
                        onChange={(e) => setFieldValue(field.field_key, e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={field.placeholder ?? ''}
                        className={baseInputClass(hasError)}
                      />
                    )}

                    {field.field_type === 'textarea' && (
                      <textarea
                        value={(value as string) ?? ''}
                        onChange={(e) => setFieldValue(field.field_key, e.target.value)}
                        placeholder={field.placeholder ?? ''}
                        rows={3}
                        className={baseInputClass(hasError) + ' resize-none'}
                      />
                    )}

                    {field.field_type === 'date' && (
                      <input
                        type="date"
                        value={(value as string) ?? ''}
                        onChange={(e) => setFieldValue(field.field_key, e.target.value)}
                        className={baseInputClass(hasError)}
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
                          className={baseInputClass(hasError) + ' appearance-none pl-10'}
                        >
                          <option value="">اختر...</option>
                          {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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

              {/* Publisher entity selector */}
              {isLoggedIn && (
                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
                    <Building2 className="w-4 h-4 text-siwar-600" />
                    الجهة الناشرة
                    <span className="text-red-500">*</span>
                    <span className="text-xs font-normal text-gray-400">(مطلوبة للإرسال)</span>
                  </label>
                  {loadingPublishers ? (
                    <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200">
                      <Loader2 className="w-4 h-4 text-siwar-500 animate-spin" />
                      <span className="text-sm text-gray-500">جاري تحميل الجهات...</span>
                    </div>
                  ) : publisherEntities.length === 0 ? (
                    <div className="px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-xs text-amber-700 leading-relaxed">
                        لا توجد جهة ناشرة مرتبطة بحسابك. يمكنك حفظ الطلب كمسودة، لكن يجب إنشاء جهة ناشرة قبل الإرسال.
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
                  {errors._publisher && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors._publisher}</span>
                    </div>
                  )}
                </div>
              )}

              {errors._form && (
                <div className="flex items-center gap-1.5 text-xs text-red-500 px-4 py-2.5 bg-red-50 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors._form}</span>
                </div>
              )}

              <div className="space-y-2.5 pt-2">
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSubmit('submitted')}
                    disabled={isUploading || submitting || (isLoggedIn && !selectedPublisherId) || !effectiveSpecialtyId}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-l from-siwar-600 to-siwar-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 tap-scale disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> جاري رفع الصور...</>
                    ) : submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
                    ) : (
                      'إرسال إلى مركز اللوجستيات'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit('draft')}
                    disabled={isUploading || submitting || !effectiveSpecialtyId}
                    className="flex-1 py-3.5 rounded-xl border border-siwar-200 bg-siwar-50 text-siwar-700 text-sm font-bold hover:bg-siwar-100 transition-all duration-300 tap-scale disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    حفظ كمسودة
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>

              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl">
                <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-500 leading-relaxed">
                  ينتقل الطلب إلى مركز اللوجستيات ولا يظهر في بطاقات قطاع النخيل.
                </p>
              </div>
            </div>
          )}

          {!loadingFields && !effectiveSpecialtyId && categories.length > 0 && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl icon-3d text-siwar-700">
                <Package className="w-5 h-5 icon-emboss" />
              </div>
              <p className="text-sm text-gray-500">اختر نوع الأصل لعرض النموذج المناسب.</p>
            </div>
          )}

          {!loadingFields && effectiveSpecialtyId && fieldDefs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl icon-3d text-siwar-700">
                <Truck className="w-5 h-5 icon-emboss" />
              </div>
              <p className="text-sm text-gray-500">لا توجد حقول معرفة لهذا النوع بعد.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
