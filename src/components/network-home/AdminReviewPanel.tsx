import { useState, useEffect, useCallback } from 'react';
import { X, Check, XCircle, FileText, Clock, Eye, AlertCircle, Edit3 } from 'lucide-react';
import type { SavedOpportunity } from '@/types';
import { getOpportunitiesForReview, approveOpportunity, rejectOpportunity } from '@/services/opportunityService';

type Props = {
  isLoggedIn: boolean;
  onClose: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'قيد المراجعة',
  active: 'معتمد',
  rejected: 'مرفوض',
  draft: 'مسودة',
  closed: 'مغلق',
  archived: 'مؤرشف',
};

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
};

export default function AdminReviewPanel({ isLoggedIn, onClose, onToast }: Props) {
  const [opportunities, setOpportunities] = useState<SavedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState<SavedOpportunity | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOpportunitiesForReview();
      setOpportunities(data as SavedOpportunity[]);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (isLoggedIn) loadData();
  }, [isLoggedIn, loadData]);

  const handleApprove = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      await approveOpportunity(id);
      onToast('تم اعتماد السجل ونشره', 'success');
      setSelectedOpp(null);
      loadData();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل الاعتماد', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [onToast, loadData]);

  const handleReject = useCallback(async (id: string) => {
    if (!rejectReason) {
      onToast('سبب الرفض مطلوب', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await rejectOpportunity(id, rejectReason);
      onToast('تم رفض السجل', 'success');
      setSelectedOpp(null);
      setRejectMode(false);
      setRejectReason('');
      loadData();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل الرفض', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [rejectReason, onToast, loadData]);

  const pending = opportunities.filter((o) => o.status === 'pending_review');
  const approved = opportunities.filter((o) => o.status === 'active');
  const rejected = opportunities.filter((o) => o.status === 'rejected');

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-3xl shadow-float w-full max-w-2xl max-h-[90vh] overflow-y-auto fancy-scroll pointer-events-auto animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl icon-3d text-siwar-700">
                <FileText className="w-5 h-5 icon-emboss" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">لوحة مراجعة الإدارة</h3>
                <p className="text-xs text-gray-400">مراجعة واعتماد السجلات</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
              </div>
            ) : selectedOpp ? (
              /* Detail view */
              <div className="space-y-4">
                <button onClick={() => { setSelectedOpp(null); setRejectMode(false); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-siwar-600">
                  <Eye className="w-4 h-4" /> رجوع للقائمة
                </button>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-gray-800">{selectedOpp.title}</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[selectedOpp.status]}`}>
                      {STATUS_LABELS[selectedOpp.status]}
                    </span>
                  </div>
                  {selectedOpp.description && <p className="text-sm text-gray-600">{selectedOpp.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedOpp.city && <div className="text-gray-600">المدينة: {selectedOpp.city}</div>}
                    {selectedOpp.quantity && <div className="text-gray-600">الكمية: {selectedOpp.quantity}</div>}
                    {selectedOpp.price && <div className="text-gray-600">السعر: {selectedOpp.price}</div>}
                    {selectedOpp.operation_type && <div className="text-gray-600">العملية: {selectedOpp.operation_type}</div>}
                  </div>
                  {selectedOpp.images && selectedOpp.images.length > 0 && (
                    <div className="text-xs text-gray-500">عدد الصور: {selectedOpp.images.length}</div>
                  )}
                </div>

                {selectedOpp.status === 'pending_review' && (
                  <>
                    {rejectMode ? (
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-700">سبب الرفض</label>
                        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="اكتب سبب الرفض..." className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:border-siwar-400 focus:outline-none resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => handleReject(selectedOpp.id)} disabled={actionLoading || !rejectReason} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">
                            {actionLoading ? 'جاري...' : 'تأكيد الرفض'}
                          </button>
                          <button onClick={() => { setRejectMode(false); setRejectReason(''); }} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(selectedOpp.id)} disabled={actionLoading} className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                          <Check className="w-4 h-4" /> {actionLoading ? 'جاري...' : 'اعتماد ونشر'}
                        </button>
                        <button onClick={() => setRejectMode(true)} disabled={actionLoading} className="flex-1 py-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                          <XCircle className="w-4 h-4" /> رفض
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* List view */
              <div className="space-y-4">
                {/* Pending section */}
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    قيد المراجعة ({pending.length})
                  </h4>
                  {pending.length === 0 ? (
                    <p className="text-sm text-gray-400 px-4 py-3">لا توجد طلبات للمراجعة.</p>
                  ) : (
                    <div className="space-y-2">
                      {pending.map((opp) => (
                        <button key={opp.id} onClick={() => setSelectedOpp(opp)} className="w-full p-3 rounded-2xl border border-gray-100 bg-white hover:border-siwar-200 hover:shadow-card transition-all text-right">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-gray-800">{opp.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[opp.status]}`}>{STATUS_LABELS[opp.status]}</span>
                          </div>
                          <div className="flex gap-3 text-xs text-gray-500">
                            {opp.city && <span>{opp.city}</span>}
                            {opp.quantity && <span>{opp.quantity}</span>}
                            <span>{new Date(opp.created_at).toLocaleDateString('ar-EG')}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Approved section */}
                {approved.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-green-500" />
                      المعتمدة ({approved.length})
                    </h4>
                    <div className="space-y-2">
                      {approved.slice(0, 5).map((opp) => (
                        <button key={opp.id} onClick={() => setSelectedOpp(opp)} className="w-full p-3 rounded-2xl border border-gray-100 bg-white hover:border-siwar-200 transition-all text-right">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-800">{opp.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[opp.status]}`}>{STATUS_LABELS[opp.status]}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejected section */}
                {rejected.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-500" />
                      المرفوضة ({rejected.length})
                    </h4>
                    <div className="space-y-2">
                      {rejected.slice(0, 5).map((opp) => (
                        <button key={opp.id} onClick={() => setSelectedOpp(opp)} className="w-full p-3 rounded-2xl border border-gray-100 bg-white hover:border-siwar-200 transition-all text-right">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-gray-800">{opp.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[opp.status]}`}>{STATUS_LABELS[opp.status]}</span>
                          </div>
                          {opp.rejection_reason && <p className="text-xs text-red-500">{opp.rejection_reason}</p>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
