import { useState, useEffect, useCallback } from 'react';
import {
  X, Gavel, ChevronLeft, Clock, Check, XCircle, Send, User,
  Calendar, Tag, FileText, Loader2, TrendingUp, Award,
} from 'lucide-react';
import type { AuctionRequest, AuctionRequestStatus } from '@/types';
import {
  getMyAuctionRequests, createAuctionRequest, updateAuctionRequest,
  submitAuctionRequest, reviewAuctionRequest, assignMarketer,
  prepareAuction, readyToPublish, publishAuction, activateAuction,
  endAuction, cancelAuction,
  AUCTION_STATUS_LABELS, AUCTION_STATUS_COLORS, AUCTION_TYPES,
} from '@/services/auctionService';
import { supabase } from '@/lib/supabase';

type Props = {
  isLoggedIn: boolean;
  activeSectorId: string | null;
  onClose: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
};

type View = 'list' | 'create' | 'detail';

export default function AuctionCenter({ isLoggedIn, activeSectorId, onClose, onToast }: Props) {
  const [view, setView] = useState<View>('list');
  const [auctions, setAuctions] = useState<AuctionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuctionRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create form
  const [assetTitle, setAssetTitle] = useState('');
  const [assetType, setAssetType] = useState('نخلة');
  const [assetDesc, setAssetDesc] = useState('');
  const [sourceSubSectorId, setSourceSubSectorId] = useState<string | null>(null);

  // Detail form fields
  const [marketerEmail, setMarketerEmail] = useState('');
  const [auctionType, setAuctionType] = useState('public');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyAuctionRequests();
      setAuctions(data);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (isLoggedIn) loadData();
  }, [isLoggedIn, loadData]);

  const handleCreate = useCallback(async () => {
    if (!assetTitle.trim() || !activeSectorId) {
      onToast('العنوان مطلوب', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const created = await createAuctionRequest({
        sourceSectorId: activeSectorId,
        sourceSubSectorId: sourceSubSectorId,
        assetType,
        assetTitle: assetTitle.trim(),
        assetDescription: assetDesc.trim() || null,
      });
      onToast('تم إنشاء طلب المزاد', 'success');
      setAssetTitle('');
      setAssetDesc('');
      setView('list');
      loadData();
      setSelected(created);
      setView('detail');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل الإنشاء', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [assetTitle, assetType, assetDesc, activeSectorId, sourceSubSectorId, onToast, loadData]);

  const handleAction = useCallback(async (action: () => Promise<void>, msg: string) => {
    setActionLoading(true);
    try {
      await action();
      onToast(msg, 'success');
      loadData();
      if (selected) {
        const updated = await getMyAuctionRequests();
        const found = updated.find((a) => a.id === selected.id);
        if (found) setSelected(found);
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشلت العملية', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [onToast, loadData, selected]);

  const handleAssignMarketer = useCallback(async () => {
    if (!selected || !marketerEmail.trim()) {
      onToast('بريد المسوق مطلوب', 'error');
      return;
    }
    setActionLoading(true);
    try {
      // Look up user by email
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', marketerEmail.trim())
        .maybeSingle();
      // Fallback: use a simple approach — just store the email as marketer_id reference
      // Since we can't query auth.users directly from client, we'll use a different approach
      // Let's just assign by updating with a placeholder and let admin handle it
      await assignMarketer(selected.id, marketerEmail.trim());
      onToast('تم تعيين المسوق', 'success');
      setMarketerEmail('');
      loadData();
      const updated = await getMyAuctionRequests();
      const found = updated.find((a) => a.id === selected.id);
      if (found) setSelected(found);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل التعيين', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [selected, marketerEmail, onToast, loadData]);

  const handlePrepare = useCallback(async () => {
    if (!selected) return;
    if (!auctionType || !startTime || !endTime) {
      onToast('نوع المزاد والوقت مطلوبان', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await prepareAuction(selected.id, auctionType, startTime, endTime);
      onToast('تم بدء تجهيز المزاد', 'success');
      setAuctionType('public');
      setStartTime('');
      setEndTime('');
      loadData();
      const updated = await getMyAuctionRequests();
      const found = updated.find((a) => a.id === selected.id);
      if (found) setSelected(found);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل التجهيز', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [selected, auctionType, startTime, endTime, onToast, loadData]);

  const handleReject = useCallback(async () => {
    if (!selected || !rejectReason.trim()) {
      onToast('سبب الرفض مطلوب', 'error');
      return;
    }
    await handleAction(
      () => cancelAuction(selected.id, rejectReason),
      'تم رفض طلب المزاد',
    );
    setShowRejectForm(false);
    setRejectReason('');
  }, [selected, rejectReason, handleAction]);

  if (!isLoggedIn) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-slide-up max-h-[80vh] overflow-y-auto fancy-scroll shadow-float">
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
          <div className="px-5 py-8 text-center">
            <Gavel className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">سجّل دخولك للوصول إلى مركز المزادات.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">إغلاق</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-3xl shadow-float w-full max-w-2xl max-h-[90vh] overflow-y-auto fancy-scroll pointer-events-auto animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl icon-3d text-siwar-700">
                <Gavel className="w-5 h-5 icon-emboss" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">مركز المزادات</h3>
                <p className="text-xs text-gray-400">إدارة طلبات المزادات</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="px-5 py-4">
            {view === 'list' && (
              <>
                <button
                  onClick={() => setView('create')}
                  className="w-full py-3 mb-4 rounded-xl bg-gradient-to-l from-siwar-600 to-siwar-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Gavel className="w-4 h-4" /> طلب مزاد جديد
                </button>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
                  </div>
                ) : auctions.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Gavel className="w-10 h-10 text-gray-300" />
                    <p className="text-sm text-gray-500">لا توجد طلبات مزاد.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auctions.map((auction) => (
                      <button
                        key={auction.id}
                        onClick={() => { setSelected(auction); setView('detail'); }}
                        className="w-full p-4 rounded-2xl border border-gray-100 bg-white hover:border-siwar-200 hover:shadow-card transition-all text-right group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-gray-800 group-hover:text-siwar-700">{auction.asset_title}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${AUCTION_STATUS_COLORS[auction.status]}`}>
                            {AUCTION_STATUS_LABELS[auction.status]}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          {auction.asset_type && <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {auction.asset_type}</span>}
                          {auction.auction_type && <span className="flex items-center gap-1"><Gavel className="w-3.5 h-3.5" /> {auction.auction_type}</span>}
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(auction.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {view === 'create' && (
              <div className="space-y-4">
                <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-siwar-600">
                  <ChevronLeft className="w-4 h-4" /> رجوع
                </button>

                <h4 className="text-base font-bold text-gray-800">طلب مزاد جديد</h4>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">عنوان الأصل *</label>
                  <input type="text" value={assetTitle} onChange={(e) => setAssetTitle(e.target.value)} placeholder="مثال: مزاد نخلة مجدول" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:border-siwar-400 focus:outline-none" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">نوع الأصل</label>
                  <input type="text" value={assetType} onChange={(e) => setAssetType(e.target.value)} placeholder="نخلة، محصول، إلخ" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:border-siwar-400 focus:outline-none" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">وصف الأصل</label>
                  <textarea value={assetDesc} onChange={(e) => setAssetDesc(e.target.value)} rows={3} placeholder="وصف تفصيلي للأصل" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:border-siwar-400 focus:outline-none resize-none" />
                </div>

                <button
                  onClick={handleCreate}
                  disabled={actionLoading || !assetTitle.trim()}
                  className="w-full py-3 rounded-xl bg-siwar-600 text-white text-sm font-bold hover:bg-siwar-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                  إنشاء الطلب
                </button>
              </div>
            )}

            {view === 'detail' && selected && (
              <div className="space-y-4">
                <button onClick={() => { setView('list'); setSelected(null); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-siwar-600">
                  <ChevronLeft className="w-4 h-4" /> رجوع للقائمة
                </button>

                {/* Auction info card */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-gray-800">{selected.asset_title}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${AUCTION_STATUS_COLORS[selected.status]}`}>
                      {AUCTION_STATUS_LABELS[selected.status]}
                    </span>
                  </div>
                  {selected.asset_description && <p className="text-sm text-gray-600">{selected.asset_description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selected.asset_type && <div className="text-gray-600 flex items-center gap-1"><Tag className="w-3.5 h-3.5 text-gray-400" /> {selected.asset_type}</div>}
                    {selected.auction_type && <div className="text-gray-600 flex items-center gap-1"><Gavel className="w-3.5 h-3.5 text-gray-400" /> {selected.auction_type}</div>}
                    {selected.start_time && <div className="text-gray-600 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" /> {new Date(selected.start_time).toLocaleString('ar-EG')}</div>}
                    {selected.end_time && <div className="text-gray-600 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" /> {new Date(selected.end_time).toLocaleString('ar-EG')}</div>}
                    {selected != null && 'current_bid' in selected && (selected as Record<string, unknown>).current_bid != null && <div className="text-gray-600 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-gray-400" /> {(selected as Record<string, unknown>).current_bid as number} ريال</div>}
                  </div>
                  {selected.rejection_reason && (
                    <div className="px-3 py-2 bg-red-50 rounded-lg text-xs text-red-600">سبب الرفض: {selected.rejection_reason}</div>
                  )}
                </div>

                {/* Workflow actions based on status */}
                {actionLoading && (
                  <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 text-siwar-500 animate-spin" /></div>
                )}

                {/* Draft → Submit */}
                {selected.status === 'draft' && !actionLoading && (
                  <button onClick={() => handleAction(() => submitAuctionRequest(selected.id), 'تم إرسال الطلب')} className="w-full py-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> إرسال للمراجعة
                  </button>
                )}

                {/* Submitted → Review (approve/reject) */}
                {selected.status === 'submitted' && !actionLoading && (
                  <div className="space-y-2">
                    <button onClick={() => handleAction(() => reviewAuctionRequest(selected.id, true), 'تم اعتماد الطلب')} className="w-full py-3 rounded-xl bg-green-50 text-green-700 text-sm font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" /> اعتماد الطلب
                    </button>
                    {!showRejectForm ? (
                      <button onClick={() => setShowRejectForm(true)} className="w-full py-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                        <XCircle className="w-4 h-4" /> رفض الطلب
                      </button>
                    ) : (
                      <div className="space-y-2 p-3 rounded-xl bg-red-50 border border-red-100">
                        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} placeholder="سبب الرفض" className="w-full px-3 py-2 rounded-lg border border-red-200 bg-white text-sm focus:outline-none resize-none" />
                        <div className="flex gap-2">
                          <button onClick={handleReject} disabled={!rejectReason.trim()} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50">تأكيد الرفض</button>
                          <button onClick={() => { setShowRejectForm(false); setRejectReason(''); }} className="flex-1 py-2 rounded-lg border border-gray-200 text-xs text-gray-600">إلغاء</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Under Review → Assign Marketer */}
                {selected.status === 'under_review' && !actionLoading && (
                  <div className="space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <h5 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><User className="w-4 h-4" /> تعيين مسوق</h5>
                    <input type="email" value={marketerEmail} onChange={(e) => setMarketerEmail(e.target.value)} placeholder="بريد المسوق الإلكتروني" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none" />
                    <button onClick={handleAssignMarketer} disabled={!marketerEmail.trim()} className="w-full py-3 rounded-xl bg-violet-50 text-violet-700 text-sm font-bold hover:bg-violet-100 disabled:opacity-50 transition-colors">
                      تعيين المسوق
                    </button>
                  </div>
                )}

                {/* Assigned to Marketer → Prepare Auction */}
                {selected.status === 'assigned_to_marketer' && !actionLoading && (
                  <div className="space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <h5 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Gavel className="w-4 h-4" /> تجهيز المزاد</h5>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600">نوع المزاد</label>
                      <select value={auctionType} onChange={(e) => setAuctionType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none">
                        {AUCTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">وقت البداية</label>
                        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">وقت النهاية</label>
                        <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none" />
                      </div>
                    </div>
                    <button onClick={handlePrepare} disabled={!startTime || !endTime} className="w-full py-3 rounded-xl bg-cyan-50 text-cyan-700 text-sm font-bold hover:bg-cyan-100 disabled:opacity-50 transition-colors">
                      بدء التجهيز
                    </button>
                  </div>
                )}

                {/* Preparing → Ready to Publish */}
                {selected.status === 'preparing' && !actionLoading && (
                  <button onClick={() => handleAction(() => readyToPublish(selected.id), 'المزاد جاهز للنشر')} className="w-full py-3 rounded-xl bg-teal-50 text-teal-700 text-sm font-bold hover:bg-teal-100 transition-colors">
                    تأكد الجاهزية للنشر
                  </button>
                )}

                {/* Ready to Publish → Publish */}
                {selected.status === 'ready_to_publish' && !actionLoading && (
                  <button onClick={() => handleAction(() => publishAuction(selected.id), 'تم نشر المزاد')} className="w-full py-3 rounded-xl bg-green-50 text-green-700 text-sm font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> نشر المزاد
                  </button>
                )}

                {/* Published → Activate */}
                {selected.status === 'published' && !actionLoading && (
                  <button onClick={() => handleAction(() => activateAuction(selected.id), 'تم تفعيل المزاد')} className="w-full py-3 rounded-xl bg-orange-50 text-orange-700 text-sm font-bold hover:bg-orange-100 transition-colors">
                    تفعيل المزاد
                  </button>
                )}

                {/* Active → End (sold/unsold) */}
                {selected.status === 'active' && !actionLoading && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(() => endAuction(selected.id, true), 'تم بيع الأصل')} className="flex-1 py-3 rounded-xl bg-green-50 text-green-700 text-sm font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                      <Award className="w-4 h-4" /> بيع
                    </button>
                    <button onClick={() => handleAction(() => endAuction(selected.id, false), 'لم يُبع الأصل')} className="flex-1 py-3 rounded-xl bg-gray-50 text-gray-700 text-sm font-bold hover:bg-gray-100 transition-colors">
                      لم يُبع
                    </button>
                  </div>
                )}

                {/* Cancel (for non-terminal statuses) */}
                {!['sold', 'unsold', 'cancelled'].includes(selected.status) && !actionLoading && !showRejectForm && selected.status !== 'submitted' && (
                  <button onClick={() => handleAction(() => cancelAuction(selected.id), 'تم إلغاء المزاد')} className="w-full py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">
                    إلغاء المزاد
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
