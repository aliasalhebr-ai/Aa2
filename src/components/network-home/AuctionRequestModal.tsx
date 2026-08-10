import { useState } from 'react';
import { X, Gavel, ChevronRight, Loader2, FileText, Tag } from 'lucide-react';
import type { Sector, SubSector } from '@/types';
import { createAuctionRequest, submitAuctionRequest } from '@/services/auctionService';

type Props = {
  sector: Sector;
  specialty: SubSector;
  isLoggedIn: boolean;
  sourceSpecialtyId: string | null;
  onClose: () => void;
  onCreated: (title: string) => void;
};

export default function AuctionRequestModal({ sector, specialty, isLoggedIn, sourceSpecialtyId, onClose, onCreated }: Props) {
  const [assetTitle, setAssetTitle] = useState('');
  const [assetType, setAssetType] = useState('نخلة');
  const [assetDesc, setAssetDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    if (!assetTitle.trim()) return;
    setSubmitting(true);
    try {
      const created = await createAuctionRequest({
        sourceSectorId: sector.id,
        sourceSubSectorId: specialty.id,
        assetType: assetType.trim(),
        assetTitle: assetTitle.trim(),
        assetDescription: assetDesc.trim() || null,
      });
      if (status === 'submitted') {
        await submitAuctionRequest(created.id);
      }
      onCreated(created.asset_title);
    } catch (err) {
      onCreated('');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] animate-fade-in" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] animate-slide-up shadow-float">
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
          <div className="px-6 pb-6 pt-2 text-center">
            <Gavel className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-4">سجّل دخولك لإنشاء طلب مزاد.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">إغلاق</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] animate-slide-up max-h-[80vh] overflow-y-auto fancy-scroll shadow-float">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>

        <div className="sticky top-0 bg-white px-5 pt-2 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-siwar-500 to-siwar-700" />
            <h4 className="text-base font-bold text-gray-800">طلب مزاد — {specialty.name}</h4>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> عنوان الأصل *</label>
            <input
              type="text"
              value={assetTitle}
              onChange={(e) => setAssetTitle(e.target.value)}
              placeholder="مثال: مزاد نخلة مجدول"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:border-siwar-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> نوع الأصل</label>
            <input
              type="text"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              placeholder="نخلة، محصول، إلخ"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:border-siwar-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600">وصف الأصل</label>
            <textarea
              value={assetDesc}
              onChange={(e) => setAssetDesc(e.target.value)}
              rows={3}
              placeholder="وصف تفصيلي للأصل"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:border-siwar-400 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleSubmit('submitted')}
              disabled={submitting || !assetTitle.trim()}
              className="flex-1 py-3 rounded-xl bg-siwar-600 text-white text-sm font-bold hover:bg-siwar-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
              إرسال للمراجعة
            </button>
            <button
              onClick={() => handleSubmit('draft')}
              disabled={submitting || !assetTitle.trim()}
              className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              حفظ كمسودة
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            سيتم إرسال طلب المزاد إلى مركز المزادات للمراجعة.
          </p>
        </div>
      </div>
    </>
  );
}
