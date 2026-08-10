import { useState, useEffect, useCallback } from 'react';
import {
  X, FileText, Clock, Check, XCircle, Archive, Truck, Gavel,
  TrendingUp, Package, Wrench, ChevronLeft, Eye, Edit3, Send,
} from 'lucide-react';
import type { SavedOpportunity } from '@/types';
import { getMyOpportunities, updateOpportunity } from '@/services/opportunityService';
import { getMyLogisticsRequests, LOGISTICS_STATUS_LABELS, LOGISTICS_STATUS_COLORS } from '@/services/logisticsService';
import type { SavedLogisticsRequest, LogisticsRequestStatus } from '@/types';

type Props = {
  isLoggedIn: boolean;
  onClose: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
  onViewOpportunity: (id: string) => void;
};

type Tab = 'drafts' | 'pending' | 'published' | 'rejected' | 'logistics';

const OPP_STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  pending_review: 'قيد المراجعة',
  active: 'منشور',
  closed: 'مغلق',
  archived: 'مؤرشف',
  rejected: 'مرفوض',
};

const OPP_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-700',
};

export default function UserDashboard({ isLoggedIn, onClose, onToast, onViewOpportunity }: Props) {
  const [tab, setTab] = useState<Tab>('drafts');
  const [opportunities, setOpportunities] = useState<SavedOpportunity[]>([]);
  const [logistics, setLogistics] = useState<SavedLogisticsRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [opps, logs] = await Promise.all([
        getMyOpportunities(),
        getMyLogisticsRequests().catch(() => []),
      ]);
      setOpportunities(opps as SavedOpportunity[]);
      setLogistics(logs);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (isLoggedIn) loadData();
  }, [isLoggedIn, loadData]);

  const handleResubmit = useCallback(async (id: string) => {
    try {
      await updateOpportunity(id, { status: 'pending_review' });
      onToast('تم إعادة إرسال السجل للمراجعة', 'success');
      loadData();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل الإعادة', 'error');
    }
  }, [onToast, loadData]);

  const handleClose = useCallback(async (id: string) => {
    try {
      await updateOpportunity(id, { status: 'closed' });
      onToast('تم إغلاق السجل', 'success');
      loadData();
    } catch {
      onToast('فشل إغلاق السجل', 'error');
    }
  }, [onToast, loadData]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await updateOpportunity(id, { status: 'archived' });
      onToast('تم أرشفة السجل', 'success');
      loadData();
    } catch {
      onToast('فشل الأرشفة', 'error');
    }
  }, [onToast, loadData]);

  if (!isLoggedIn) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] animate-slide-up max-h-[80vh] overflow-y-auto fancy-scroll shadow-float">
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
          <div className="px-5 py-8 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">سجّل دخولك لإدارة سجلاتك.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">إغلاق</button>
          </div>
        </div>
      </>
    );
  }

  const filteredOpps = opportunities.filter((o) => {
    if (tab === 'drafts') return o.status === 'draft';
    if (tab === 'pending') return o.status === 'pending_review';
    if (tab === 'published') return o.status === 'active' || o.status === 'closed';
    if (tab === 'rejected') return o.status === 'rejected';
    return false;
  });

  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: 'drafts', label: 'المسودات', icon: Edit3 },
    { id: 'pending', label: 'قيد المراجعة', icon: Clock },
    { id: 'published', label: 'المنشورة', icon: Check },
    { id: 'rejected', label: 'المرفوضة', icon: XCircle },
    { id: 'logistics', label: 'اللوجستيات', icon: Truck },
  ];

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
              <h3 className="text-lg font-bold text-gray-800">لوحة التحكم</h3>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 px-5 pt-3 overflow-x-auto fancy-scroll">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  tab === t.id ? 'bg-siwar-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
              </div>
            ) : tab === 'logistics' ? (
              logistics.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Truck className="w-10 h-10 text-gray-300" />
                  <p className="text-sm text-gray-500">لا توجد طلبات لوجستية.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logistics.map((req) => (
                    <div key={req.id} className="p-3 rounded-2xl border border-gray-100 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-gray-800">{req.title}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${LOGISTICS_STATUS_COLORS[req.status as LogisticsRequestStatus]}`}>
                          {LOGISTICS_STATUS_LABELS[req.status as LogisticsRequestStatus]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {req.asset_type}</span>
                        {req.city && <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {req.city}</span>}
                        {req.transport_date && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {req.transport_date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : filteredOpps.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <FileText className="w-10 h-10 text-gray-300" />
                <p className="text-sm text-gray-500">لا توجد سجلات في هذا القسم.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOpps.map((opp) => (
                  <div key={opp.id} className="p-3 rounded-2xl border border-gray-100 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-800">{opp.title}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${OPP_STATUS_COLORS[opp.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {OPP_STATUS_LABELS[opp.status] ?? opp.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {opp.city && <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {opp.city}</span>}
                      {opp.quantity && <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {opp.quantity}</span>}
                      {opp.price && <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {opp.price}</span>}
                    </div>
                    {opp.status === 'rejected' && opp.rejection_reason && (
                      <div className="px-3 py-2 bg-red-50 rounded-lg text-xs text-red-600">
                        سبب الرفض: {opp.rejection_reason}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => onViewOpportunity(opp.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> عرض
                      </button>
                      {opp.status === 'draft' && (
                        <button onClick={() => handleResubmit(opp.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors">
                          <Send className="w-3.5 h-3.5" /> إرسال للمراجعة
                        </button>
                      )}
                      {opp.status === 'rejected' && (
                        <button onClick={() => handleResubmit(opp.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors">
                          <Send className="w-3.5 h-3.5" /> إعادة إرسال
                        </button>
                      )}
                      {opp.status === 'active' && (
                        <button onClick={() => handleClose(opp.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                          <X className="w-3.5 h-3.5" /> إغلاق
                        </button>
                      )}
                      {(opp.status === 'closed' || opp.status === 'active') && (
                        <button onClick={() => handleArchive(opp.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                          <Archive className="w-3.5 h-3.5" /> أرشفة
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
