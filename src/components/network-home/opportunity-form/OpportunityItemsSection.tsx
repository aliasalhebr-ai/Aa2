import { Plus, Trash2, Sprout, Loader2, Upload, Lock, X, ChevronDown } from 'lucide-react';
import type { ItemFieldDefinition } from '@/types';
import {
  smallInputClass, FieldError, GenericField, labelForStatic,
  type UploadedImage,
} from './shared';
import type { OpportunityFormState } from './useOpportunityFormState';
import {
  uploadV2Image, removeV2Image, getV2SignedUrl,
} from '@/services/opportunityV2Service';

export default function OpportunityItemsSection({ state }: { state: OpportunityFormState }) {
  const {
    items, itemFieldDefs, errors, plants, loadingPlants,
    varietyCache, varietyLoading, itemImages, itemUploading,
    hasPlantField, hasVarietyField, hasItemImagesField,
    updateItem, handlePlantChange, handleVarietyChange, addItem, removeItem,
    clearError, isLoggedIn,
  } = state;

  if (itemFieldDefs.length === 0) return null;

  const handleItemImageUpload = async (itemIndex: number, files: FileList) => {
    if (!isLoggedIn) return;
    const fileArr = Array.from(files);
    state.setItemUploading((prev) => ({ ...prev, [itemIndex]: true }));
    for (const file of fileArr) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      state.setItemImages((prev) => ({
        ...prev,
        [itemIndex]: [...(prev[itemIndex] ?? []), { path: '', signedUrl: '', name: id, uploading: true }],
      }));
      try {
        const path = await uploadV2Image(file);
        const signedUrl = await getV2SignedUrl(path);
        state.setItemImages((prev) => ({
          ...prev,
          [itemIndex]: (prev[itemIndex] ?? []).map((img) =>
            img.name === id ? { ...img, path, signedUrl, uploading: false } : img,
          ),
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل رفع الصورة';
        state.setItemImages((prev) => ({
          ...prev,
          [itemIndex]: (prev[itemIndex] ?? []).map((img) =>
            img.name === id ? { ...img, uploading: false, error: msg } : img,
          ),
        }));
      }
    }
    state.setItemUploading((prev) => ({ ...prev, [itemIndex]: false }));
  };

  const handleRemoveItemImage = async (itemIndex: number, imgIndex: number) => {
    const imgs = itemImages[itemIndex] ?? [];
    const img = imgs[imgIndex];
    if (img?.path) { try { await removeV2Image(img.path); } catch { /* ignore */ } }
    state.setItemImages((prev) => ({
      ...prev,
      [itemIndex]: (prev[itemIndex] ?? []).filter((_, i) => i !== imgIndex),
    }));
  };

  const renderPlantField = (field: ItemFieldDefinition, idx: number, value: unknown, error?: string) => (
    <div className="relative">
      <select
        value={(value as string) ?? ''}
        onChange={(e) => handlePlantChange(idx, e.target.value)}
        className={smallInputClass(!!error) + ' appearance-none pl-8'}
      >
        <option value="">{loadingPlants ? 'جاري التحميل...' : 'اختر...'}</option>
        {plants.map((p) => <option key={p.id} value={p.id}>{p.arabic_name}</option>)}
      </select>
      <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  );

  const renderVarietyField = (field: ItemFieldDefinition, idx: number, value: unknown, error?: string) => {
    const plantId = (items[idx]?.plant_id as string) ?? '';
    return (
      <div className="relative">
        {(varietyLoading as Record<string, boolean>)[plantId ?? ''] ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
            <Loader2 className="w-3.5 h-3.5 text-siwar-500 animate-spin" />
            <span className="text-xs text-gray-500">جاري تحميل الأصناف...</span>
          </div>
        ) : (varietyCache[plantId as unknown as string] ?? []).length > 0 ? (
          <>
            <select
              value={(value as string) ?? ''}
              onChange={(e) => handleVarietyChange(idx, e.target.value)}
              className={smallInputClass(!!error) + ' appearance-none pl-8'}
            >
              <option value="">بدون صنف محدد</option>
              <option value="__all__">جميع الأصناف المقبولة</option>
              {(varietyCache[plantId as unknown as string] ?? []).map((v) => <option key={v.id} value={v.id}>{v.name_ar}</option>)}
            </select>
            <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </>
        ) : (
          <div className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-400">لا توجد أصناف مسجلة لهذا النبات</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 pt-2 border-t border-gray-100">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-bold text-siwar-700 flex items-center gap-1.5">
          <span className="w-1 h-4 rounded-full bg-siwar-500" />
          العناصر ({items.length})
        </h5>
        <button
          type="button" onClick={addItem}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-siwar-50 border border-siwar-200 text-siwar-700 text-xs font-bold hover:bg-siwar-100 transition-colors tap-scale"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          إضافة عنصر آخر
        </button>
      </div>

      {errors._items && <FieldError msg={errors._items} />}

      {items.map((item, idx) => (
        <div key={idx} className="rounded-2xl border border-gray-200 bg-gray-50/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
              <Sprout className="w-3.5 h-3.5 text-siwar-500" />
              عنصر {idx + 1}
            </span>
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(idx)}
                className="p-1 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {itemFieldDefs.map((field) => {
            if (field.field_key === 'item_images') return null;
            const value = item[field.field_key];
            const errorKey = `item_${idx}_${field.field_key}`;
            const error = errors[errorKey];
            const isPlantField = field.field_key === 'plant_id';
            const isVarietyField = field.field_key === 'variety_id';

            if (isVarietyField && !item.plant_id) return null;

            if (field.conditional_field_key && field.conditional_values) {
              const condVal = item[field.conditional_field_key] as string;
              if (!condVal || !field.conditional_values.includes(condVal)) return null;
            }

            return (
              <div key={field.id} className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-bold text-gray-700">
                  {field.label}
                  {field.is_required && <span className="text-red-500">*</span>}
                  {field.unit && <span className="text-[10px] font-normal text-gray-400">({field.unit})</span>}
                </label>

                {isPlantField && renderPlantField(field, idx, value, error)}
                {isVarietyField && renderVarietyField(field, idx, value, error)}
                {!isPlantField && !isVarietyField && (
                  <GenericField field={field} value={value} error={error}
                    onChange={(v) => updateItem(idx, field.field_key, v)} />
                )}
                {error && <FieldError msg={error} />}
              </div>
            );
          })}

          {hasItemImagesField && (
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-gray-700">صور العنصر</label>
              {isLoggedIn ? (
                <div className="flex flex-wrap gap-2">
                  {(itemImages[idx] ?? []).map((img, imgIdx) => (
                    <div key={imgIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                      {img.uploading ? (
                        <div className="flex items-center justify-center w-full h-full bg-gray-50">
                          <Loader2 className="w-4 h-4 text-siwar-500 animate-spin" />
                        </div>
                      ) : img.error ? (
                        <div className="flex items-center justify-center w-full h-full bg-red-50 p-0.5">
                          <span className="text-[8px] text-red-500 text-center leading-tight">{img.error}</span>
                        </div>
                      ) : (
                        <>
                          <img src={img.signedUrl} alt="item" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => handleRemoveItemImage(idx, imgIdx)}
                            className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  <label className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${itemUploading[idx] ? 'border-gray-100 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-siwar-300 hover:bg-siwar-50/30'}`}>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden"
                      disabled={itemUploading[idx]}
                      onChange={(e) => { if (e.target.files && e.target.files.length > 0) { handleItemImageUpload(idx, e.target.files); e.target.value = ''; } }} />
                    {itemUploading[idx] ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" /> : <Upload className="w-4 h-4 text-gray-400" />}
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500">سجّل دخولك لرفع الصور</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
