import { useState, useCallback } from 'react';
import { Plus, X, Trash2, Loader2, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import type { VarietyEntry, PalmVariety, MeasurementUnit } from '@/types';
import {
  uploadOpportunityImage, deleteOpportunityImage, createSignedImageUrl,
} from '@/services/opportunityService';

type Props = {
  varieties: VarietyEntry[];
  onChange: (varieties: VarietyEntry[]) => void;
  varietyOptions: PalmVariety[];
  unitOptions: MeasurementUnit[];
  saleModel: string;
  isLoggedIn: boolean;
};

type UploadedImage = {
  path: string;
  signedUrl: string;
  name: string;
  uploading: boolean;
  error?: string;
};

export default function VarietyEditor({
  varieties,
  onChange,
  varietyOptions,
  unitOptions,
  saleModel,
  isLoggedIn,
}: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [varietyImages, setVarietyImages] = useState<Record<number, UploadedImage[]>>({});
  const [uploadingCount, setUploadingCount] = useState(0);

  const isByWeight = saleModel === 'by_kilo';

  const addVariety = useCallback(() => {
    const newEntry: VarietyEntry = {
      variety_id: '',
      variety_name: '',
      palm_count: null,
      expected_production: null,
      production_unit: null,
      harvest_date: null,
      readiness_status: null,
      images: [],
      description: null,
      quality_grade: null,
      age_years: null,
      irrigation_source: null,
    };
    onChange([...varieties, newEntry]);
    setExpandedIndex(varieties.length);
  }, [varieties, onChange]);

  const removeVariety = useCallback((index: number) => {
    const next = varieties.filter((_, i) => i !== index);
    onChange(next);
    setExpandedIndex(null);
  }, [varieties, onChange]);

  const updateVariety = useCallback((index: number, updates: Partial<VarietyEntry>) => {
    const next = varieties.map((v, i) => i === index ? { ...v, ...updates } : v);
    onChange(next);
  }, [varieties, onChange]);

  const handleVarietyImageUpload = useCallback(async (index: number, files: FileList) => {
    if (!isLoggedIn) return;
    const fileArr = Array.from(files);
    for (const file of fileArr) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setVarietyImages((prev) => ({
        ...prev,
        [index]: [...(prev[index] ?? []), { path: '', signedUrl: '', name: id, uploading: true }],
      }));
      setUploadingCount((c) => c + 1);
      try {
        const path = await uploadOpportunityImage(file);
        const signedUrl = await createSignedImageUrl(path);
        setVarietyImages((prev) => ({
          ...prev,
          [index]: (prev[index] ?? []).map((img) =>
            img.name === id ? { ...img, path, signedUrl, uploading: false } : img,
          ),
        }));
        updateVariety(index, {
          images: [...(varieties[index].images ?? []), path],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل رفع الصورة';
        setVarietyImages((prev) => ({
          ...prev,
          [index]: (prev[index] ?? []).map((img) =>
            img.name === id ? { ...img, uploading: false, error: msg } : img,
          ),
        }));
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }
  }, [isLoggedIn, varieties, updateVariety]);

  const handleRemoveVarietyImage = useCallback(async (varietyIndex: number, imgIndex: number) => {
    const imgs = varietyImages[varietyIndex] ?? [];
    const img = imgs[imgIndex];
    if (img?.path) {
      try { await deleteOpportunityImage(img.path); } catch { /* ignore */ }
    }
    setVarietyImages((prev) => ({
      ...prev,
      [varietyIndex]: (prev[varietyIndex] ?? []).filter((_, i) => i !== imgIndex),
    }));
    const currentPaths = varieties[varietyIndex].images ?? [];
    updateVariety(varietyIndex, {
      images: currentPaths.filter((_, i) => i !== imgIndex),
    });
  }, [varietyImages, varieties, updateVariety]);

  return (
    <div className="space-y-3">
      {varieties.map((variety, index) => (
        <div key={index} className="rounded-2xl border border-gray-200 overflow-hidden">
          {/* Variety header — collapsed view */}
          <div className="flex items-center justify-between p-3 bg-gray-50/50">
            <button
              type="button"
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="flex items-center gap-2 flex-1 text-right"
            >
              <span className="text-sm font-bold text-gray-700">
                {variety.variety_name || `الصنف ${index + 1}`}
              </span>
              {!isByWeight && variety.palm_count != null && (
                <span className="text-xs text-gray-400">{variety.palm_count} نخلة</span>
              )}
              {isByWeight && variety.expected_production && (
                <span className="text-xs text-gray-400">{variety.expected_production} {variety.production_unit ?? ''}</span>
              )}
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {expandedIndex === index
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              <button
                type="button"
                onClick={() => removeVariety(index)}
                className="p-1 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>

          {/* Expanded variety form */}
          {expandedIndex === index && (
            <div className="p-3 space-y-3">
              {/* Variety select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">الصنف *</label>
                <select
                  value={variety.variety_id}
                  onChange={(e) => {
                    const opt = varietyOptions.find((v) => v.slug === e.target.value);
                    updateVariety(index, {
                      variety_id: e.target.value,
                      variety_name: opt?.name ?? e.target.value,
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-right focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100"
                >
                  <option value="">اختر الصنف...</option>
                  {varietyOptions.map((v) => (
                    <option key={v.slug} value={v.slug}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Palm count (full_harvest only) */}
              {!isByWeight && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">عدد النخيل</label>
                  <input
                    type="number"
                    min="0"
                    value={variety.palm_count ?? ''}
                    onChange={(e) => updateVariety(index, {
                      palm_count: e.target.value === '' ? null : Number(e.target.value),
                    })}
                    placeholder="500"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-right focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100"
                  />
                </div>
              )}

              {/* Expected production */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">
                    {isByWeight ? 'الكمية' : 'الإنتاج المتوقع'}
                  </label>
                  <input
                    type="text"
                    value={variety.expected_production ?? ''}
                    onChange={(e) => updateVariety(index, { expected_production: e.target.value || null })}
                    placeholder={isByWeight ? '12' : '40'}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-right focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">الوحدة</label>
                  <select
                    value={variety.production_unit ?? ''}
                    onChange={(e) => updateVariety(index, { production_unit: e.target.value || null })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-right focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100"
                  >
                    <option value="">اختر...</option>
                    {unitOptions.map((u) => (
                      <option key={u.key} value={u.key}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Harvest date (full_harvest only) */}
              {!isByWeight && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">موعد الجني</label>
                  <input
                    type="text"
                    value={variety.harvest_date ?? ''}
                    onChange={(e) => updateVariety(index, { harvest_date: e.target.value || null })}
                    placeholder="أغسطس 2026"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-right focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100"
                  />
                </div>
              )}

              {/* Readiness status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">حالة الجاهزية</label>
                <select
                  value={variety.readiness_status ?? ''}
                  onChange={(e) => updateVariety(index, { readiness_status: e.target.value || null })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-right focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100"
                >
                  <option value="">اختر...</option>
                  <option value="جاهز">جاهز</option>
                  <option value="يحتاج_تهيئة">يحتاج تهيئة</option>
                  <option value="غير_جاهز">غير جاهز</option>
                </select>
              </div>

              {/* Quality grade + Age + Irrigation source */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">درجة الجودة</label>
                  <select
                    value={variety.quality_grade ?? ''}
                    onChange={(e) => updateVariety(index, { quality_grade: e.target.value || null })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-right focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100"
                  >
                    <option value="">اختر...</option>
                    <option value="extra">فاخر</option>
                    <option value="grade_a">درجة أولى</option>
                    <option value="grade_b">درجة ثانية</option>
                    <option value="standard">عادي</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">عمر النخيل (سنة)</label>
                  <input
                    type="number"
                    min="0"
                    value={variety.age_years ?? ''}
                    onChange={(e) => updateVariety(index, { age_years: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="15"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-right focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">مصدر الري</label>
                <select
                  value={variety.irrigation_source ?? ''}
                  onChange={(e) => updateVariety(index, { irrigation_source: e.target.value || null })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-right focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100"
                >
                  <option value="">اختر...</option>
                  <option value="drip">تنقيط</option>
                  <option value="bubbler">فقاعات</option>
                  <option value="flood">غمر</option>
                  <option value="well">بئر</option>
                  <option value="mixed">مختلط</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">وصف الصنف</label>
                <textarea
                  value={variety.description ?? ''}
                  onChange={(e) => updateVariety(index, { description: e.target.value || null })}
                  placeholder="اكتب وصفًا للصنف: المميزات، طبيعة التمر، ملاحظات الجودة..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-right focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100 resize-none"
                />
              </div>

              {/* Variety images */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">صور الصنف</label>
                {isLoggedIn ? (
                  <div className="flex flex-wrap gap-2">
                    {(varietyImages[index] ?? []).map((img, imgIdx) => (
                      <div key={imgIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                        {img.uploading ? (
                          <div className="flex items-center justify-center w-full h-full bg-gray-50">
                            <Loader2 className="w-4 h-4 text-siwar-500 animate-spin" />
                          </div>
                        ) : img.error ? (
                          <div className="flex items-center justify-center w-full h-full bg-red-50 p-1">
                            <span className="text-[8px] text-red-500 text-center leading-tight">{img.error}</span>
                          </div>
                        ) : (
                          <>
                            <img src={img.signedUrl} alt="صنف" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveVarietyImage(index, imgIdx)}
                              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5 text-white" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    <label className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${uploadingCount > 0 ? 'border-gray-100 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-siwar-300 hover:bg-siwar-50/30'}`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        disabled={uploadingCount > 0}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleVarietyImageUpload(index, e.target.files);
                            e.target.value = '';
                          }
                        }}
                      />
                      {uploadingCount > 0
                        ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        : <Upload className="w-4 h-4 text-gray-400" />}
                    </label>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">سجّل دخولك لرفع صور الصنف</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addVariety}
        className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-500 hover:border-siwar-300 hover:bg-siwar-50/30 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        إضافة صنف
      </button>
    </div>
  );
}
