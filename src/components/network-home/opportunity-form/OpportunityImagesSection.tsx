import { Loader2, Upload, Lock, X } from 'lucide-react';
import { baseInputClass, type UploadedImage } from './shared';
import type { OpportunityFormState } from './useOpportunityFormState';
import {
  uploadV2Image, removeV2Image, getV2SignedUrl,
} from '@/services/opportunityV2Service';

export default function OpportunityImagesSection({ state }: { state: OpportunityFormState }) {
  const { generalImages, setGeneralImages, generalUploading, setGeneralUploading, isLoggedIn } = state;

  const handleUpload = async (files: FileList) => {
    if (!isLoggedIn) return;
    const fileArr = Array.from(files);
    setGeneralUploading(true);
    for (const file of fileArr) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setGeneralImages((prev) => [...prev, { path: '', signedUrl: '', name: id, uploading: true }]);
      try {
        const path = await uploadV2Image(file);
        const signedUrl = await getV2SignedUrl(path);
        setGeneralImages((prev) =>
          prev.map((img) => (img.name === id ? { ...img, path, signedUrl, uploading: false } : img)),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل رفع الصورة';
        setGeneralImages((prev) =>
          prev.map((img) => (img.name === id ? { ...img, uploading: false, error: msg } : img)),
        );
      }
    }
    setGeneralUploading(false);
  };

  const handleRemove = async (index: number) => {
    const img = generalImages[index];
    if (img.path) { try { await removeV2Image(img.path); } catch { /* ignore */ } }
    setGeneralImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 pt-2 border-t border-gray-100">
      <h5 className="text-sm font-bold text-siwar-700 flex items-center gap-1.5">
        <span className="w-1 h-4 rounded-full bg-siwar-500" />
        الصور العامة للفرصة
      </h5>
      {isLoggedIn ? (
        <div className="flex flex-wrap gap-2.5">
          {generalImages.map((img, idx) => (
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
                  <img src={img.signedUrl} alt="general" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => handleRemove(idx)}
                    className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </>
              )}
            </div>
          ))}
          <label className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${generalUploading ? 'border-gray-100 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-siwar-300 hover:bg-siwar-50/30'}`}>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden"
              disabled={generalUploading}
              onChange={(e) => { if (e.target.files && e.target.files.length > 0) { handleUpload(e.target.files); e.target.value = ''; } }} />
            {generalUploading ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <Upload className="w-5 h-5 text-gray-400" />}
          </label>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200">
          <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500">سجّل دخولك لرفع الصور</span>
        </div>
      )}
    </div>
  );
}
