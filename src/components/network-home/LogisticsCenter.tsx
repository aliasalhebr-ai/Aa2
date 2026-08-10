import { useState, useEffect, useCallback } from 'react';
import {
  X, Truck, Loader2, AlertCircle, Check, Clock, Package, MapPin, Calendar,
  ChevronDown, ChevronLeft, User, DollarSign, ArrowRight, Eye,
} from 'lucide-react';
import type {
  SavedLogisticsRequest, LogisticsOffer, LogisticsRequestStatus, LogisticsOfferStatus,
} from '@/types';
import {
  getMyLogisticsRequests, getAvailableLogisticsRequests, getOffersForRequest,
  createLogisticsOffer, acceptOffer, rejectOffer, cancelLogisticsRequest,
  updateLogisticsRequestStatus, getMyOffers, uploadLogisticsImage,
  LOGISTICS_STATUS_LABELS, LOGISTICS_STATUS_COLORS,
  OFFER_STATUS_LABELS, OFFER_STATUS_COLORS,
} from '@/services/logisticsService';
import { supabase } from '@/lib/supabase';

type Props = {
  isLoggedIn: boolean;
  onClose: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
};

type Tab = 'owner' | 'provider';

export default function LogisticsCenter({ isLoggedIn, onClose, onToast }: Props) {
  const [tab, setTab] = useState<Tab>('owner');
  const [myRequests, setMyRequests] = useState<SavedLogisticsRequest[]>([]);
  const [availableRequests, setAvailableRequests] = useState<SavedLogisticsRequest[]>([]);
  const [myOffers, setMyOffers] = useState<LogisticsOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<SavedLogisticsRequest | null>(null);
  const [offers, setOffers] = useState<LogisticsOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerVehicle, setOfferVehicle] = useState('');
  const [offerDuration, setOfferDuration] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LogisticsRequestStatus | 'all'>('all');
  const [proofUploading, setProofUploading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, available, offers] = await Promise.all([
        getMyLogisticsRequests(),
        getAvailableLogisticsRequests(),
        getMyOffers().catch(() => []),
      ]);
      setMyRequests(mine);
      setAvailableRequests(available);
      setMyOffers(offers);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (isLoggedIn) loadData();
  }, [isLoggedIn, loadData]);

  const loadOffers = useCallback(async (requestId: string) => {
    setLoadingOffers(true);
    try {
      const data = await getOffersForRequest(requestId);
      setOffers(data);
    } catch {
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  const handleSelectRequest = useCallback((req: SavedLogisticsRequest) => {
    setSelectedRequest(req);
    setShowOfferForm(false);
    loadOffers(req.id);
  }, [loadOffers]);

  const handleSubmitOffer = useCallback(async () => {
    if (!selectedRequest || !offerPrice) {
      onToast('السعر مطلوب', 'error');
      return;
    }
    setSubmittingOffer(true);
    try {
      await createLogisticsOffer({
        logisticsRequestId: selectedRequest.id,
        price: Number(offerPrice),
        vehicleType: offerVehicle || null,
        estimatedDuration: offerDuration || null,
        notes: offerNotes || null,
      });
      onToast('تم تقديم العرض بنجاح', 'success');
      setShowOfferForm(false);
      setOfferPrice('');
      setOfferVehicle('');
      setOfferDuration('');
      setOfferNotes('');
      loadData();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل تقديم العرض', 'error');
    } finally {
      setSubmittingOffer(false);
    }
  }, [selectedRequest, offerPrice, offerVehicle, offerDuration, offerNotes, onToast, loadData]);

  const handleAcceptOffer = useCallback(async (offerId: string) => {
    if (!selectedRequest) return;
    try {
      await acceptOffer(offerId, selectedRequest.id);
      onToast('تم قبول العرض', 'success');
      loadOffers(selectedRequest.id);
      loadData();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل قبول العرض', 'error');
    }
  }, [selectedRequest, onToast, loadOffers, loadData]);

  const handleRejectOffer = useCallback(async (offerId: string) => {
    try {
      await rejectOffer(offerId);
      onToast('تم رفض العرض', 'success');
      if (selectedRequest) loadOffers(selectedRequest.id);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل رفض العرض', 'error');
    }
  }, [selectedRequest, onToast, loadOffers]);

  const handleCancel = useCallback(async (id: string) => {
    try {
      await cancelLogisticsRequest(id);
      onToast('تم إلغاء الطلب', 'success');
      setSelectedRequest(null);
      loadData();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل إلغاء الطلب', 'error');
    }
  }, [onToast, loadData]);

  const handleStatusChange = useCallback(async (id: string, status: LogisticsRequestStatus) => {
    try {
      await updateLogisticsRequestStatus(id, status);
      onToast('تم تحديث الحالة', 'success');
      loadData();
      if (selectedRequest?.id === id) {
        setSelectedRequest((prev) => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل تحديث الحالة', 'error');
    }
  }, [onToast, loadData, selectedRequest]);

  const handleUploadProof = useCallback(async (proofType: 'loading' | 'delivery') => {
    if (!selectedRequest) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setProofUploading(true);
      try {
        const filePath = await uploadLogisticsImage(file);
        const { error } = await supabase.rpc('update_logistics_proof', {
          p_request_id: selectedRequest.id,
          p_proof_type: proofType,
          p_proof_url: filePath,
        });
        if (error) throw error;
        onToast(proofType === 'loading' ? 'تم رفع إثبات التحميل' : 'تم رفع إثبات التسليم', 'success');
        loadData();
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'فشل رفع الإثبات', 'error');
      } finally {
        setProofUploading(false);
      }
    };
    input.click();
  }, [selectedRequest, onToast, loadData]);

  const filteredRequests = statusFilter === 'all'
    ? myRequests
    : myRequests.filter((r) => r.status === statusFilter);

  const statusOptions: (LogisticsRequestStatus | 'all')[] = [
    'all', 'draft', 'submitted', 'under_review', 'available_to_providers',
    'offers_received', 'provider_selected', 'scheduled', 'in_progress',
    'delivered', 'completed', 'cancelled', 'failed',
  ];

  if (!isLoggedIn) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-slide-up max-h-[80vh] overflow-y-auto fancy-scroll shadow-float">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <div className="px-5 py-8 text-center">
            <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">سجّل دخولك للوصول إلى مركز اللوجستيات.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              إغلاق
            </button>
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
                <Truck className="w-5 h-5 icon-emboss" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">مركز اللوجستيات</h3>
                <p className="text-xs text-gray-400">إدارة طلبات النقل والخدمات اللوجستية</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 px-5 pt-3">
            <button
              onClick={() => { setTab('owner'); setSelectedRequest(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'owner' ? 'bg-siwar-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              طلباتي
            </button>
            <button
              onClick={() => { setTab('provider'); setSelectedRequest(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'provider' ? 'bg-siwar-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الطلبات المتاحة
            </button>
          </div>

          <div className="px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
              </div>
            ) : selectedRequest ? (
              /* ── Detail View ── */
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-siwar-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  رجوع للقائمة
                </button>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-gray-800">{selectedRequest.title}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${LOGISTICS_STATUS_COLORS[selectedRequest.status]}`}>
                      {LOGISTICS_STATUS_LABELS[selectedRequest.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span>{selectedRequest.asset_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{selectedRequest.city ?? '—'}</span>
                    </div>
                    {selectedRequest.pickup_location && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span>استلام: {selectedRequest.pickup_location}</span>
                      </div>
                    )}
                    {selectedRequest.delivery_location && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <ArrowRight className="w-4 h-4 text-gray-400 rotate-180" />
                        <span>تسليم: {selectedRequest.delivery_location}</span>
                      </div>
                    )}
                    {selectedRequest.transport_date && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{selectedRequest.transport_date}</span>
                      </div>
                    )}
                    {selectedRequest.quantity && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span>الكمية: {selectedRequest.quantity}</span>
                      </div>
                    )}
                    {selectedRequest.weight && (
                      <div className="text-gray-600">الوزن: {selectedRequest.weight}</div>
                    )}
                    {selectedRequest.count != null && (
                      <div className="text-gray-600">العدد: {selectedRequest.count}</div>
                    )}
                    {selectedRequest.vehicle_type && (
                      <div className="text-gray-600">المركبة: {selectedRequest.vehicle_type}</div>
                    )}
                    {selectedRequest.needs_crane && (
                      <div className="flex items-center gap-1 text-siwar-600">
                        <Check className="w-3.5 h-3.5" /> يحتاج رافعة
                      </div>
                    )}
                    {selectedRequest.needs_loading && (
                      <div className="flex items-center gap-1 text-siwar-600">
                        <Check className="w-3.5 h-3.5" /> يحتاج تحميل
                      </div>
                    )}
                    {selectedRequest.needs_unloading && (
                      <div className="flex items-center gap-1 text-siwar-600">
                        <Check className="w-3.5 h-3.5" /> يحتاج تنزيل
                      </div>
                    )}
                  </div>

                  {selectedRequest.description && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-600">{selectedRequest.description}</p>
                    </div>
                  )}
                </div>

                {/* Owner actions */}
                {tab === 'owner' && (
                  <div className="space-y-3">
                    {/* Status transition buttons */}
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(selectedRequest.id, 'submitted')}
                          className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition-colors"
                        >
                          إرسال للمراجعة
                        </button>
                      )}
                      {selectedRequest.status === 'submitted' && (
                        <button
                          onClick={() => handleStatusChange(selectedRequest.id, 'under_review')}
                          className="px-4 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors"
                        >
                          مراجعة الطلب
                        </button>
                      )}
                      {selectedRequest.status === 'under_review' && (
                        <button
                          onClick={() => handleStatusChange(selectedRequest.id, 'available_to_providers')}
                          className="px-4 py-2 rounded-xl bg-cyan-50 text-cyan-700 text-sm font-bold hover:bg-cyan-100 transition-colors"
                        >
                          اعتماد وإتاحة لمقدمي الخدمات
                        </button>
                      )}
                      {selectedRequest.status === 'offers_received' && (
                        <button
                          onClick={() => handleStatusChange(selectedRequest.id, 'available_to_providers')}
                          className="px-4 py-2 rounded-xl bg-cyan-50 text-cyan-700 text-sm font-bold hover:bg-cyan-100 transition-colors"
                        >
                          إعادة الإتاحة
                        </button>
                      )}
                      {selectedRequest.status === 'provider_selected' && (
                        <button
                          onClick={() => handleStatusChange(selectedRequest.id, 'scheduled')}
                          className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm font-bold hover:bg-teal-100 transition-colors"
                        >
                          جدولة التنفيذ
                        </button>
                      )}
                      {selectedRequest.status === 'scheduled' && (
                        <button
                          onClick={() => handleStatusChange(selectedRequest.id, 'in_progress')}
                          className="px-4 py-2 rounded-xl bg-orange-50 text-orange-700 text-sm font-bold hover:bg-orange-100 transition-colors"
                        >
                          بدء التنفيذ
                        </button>
                      )}
                      {selectedRequest.status === 'in_progress' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleUploadProof('loading')}
                            disabled={proofUploading}
                            className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {proofUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إثبات التحميل'}
                          </button>
                          <button
                            onClick={() => handleStatusChange(selectedRequest.id, 'delivered')}
                            className="px-4 py-2 rounded-xl bg-lime-50 text-lime-700 text-sm font-bold hover:bg-lime-100 transition-colors"
                          >
                            تأكيد التسليم
                          </button>
                        </div>
                      )}
                      {selectedRequest.status === 'delivered' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleUploadProof('delivery')}
                            disabled={proofUploading}
                            className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {proofUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إثبات التسليم'}
                          </button>
                          <button
                            onClick={() => handleStatusChange(selectedRequest.id, 'completed')}
                            className="px-4 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-bold hover:bg-green-100 transition-colors"
                          >
                            إكمال الطلب
                          </button>
                        </div>
                      )}
                      {!['completed', 'cancelled', 'failed'].includes(selectedRequest.status) && (
                        <button
                          onClick={() => handleCancel(selectedRequest.id)}
                          className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors"
                        >
                          إلغاء الطلب
                        </button>
                      )}
                    </div>

                    {/* Offers list */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-bold text-gray-700">العروض المقدمة</h5>
                      {loadingOffers ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 text-siwar-500 animate-spin" />
                        </div>
                      ) : offers.length === 0 ? (
                        <div className="px-4 py-6 rounded-xl bg-gray-50 text-center">
                          <Clock className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">لا توجد عروض بعد.</p>
                        </div>
                      ) : (
                        offers.map((offer) => (
                          <div key={offer.id} className="p-3 rounded-xl border border-gray-100 bg-white space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-siwar-600" />
                                <span className="text-sm font-bold text-gray-800">
                                  {offer.price != null ? `${offer.price} ${offer.currency}` : 'بدون سعر'}
                                </span>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${OFFER_STATUS_COLORS[offer.status]}`}>
                                {OFFER_STATUS_LABELS[offer.status]}
                              </span>
                            </div>
                            {offer.vehicle_type && (
                              <div className="text-xs text-gray-500">المركبة: {offer.vehicle_type}</div>
                            )}
                            {offer.estimated_duration && (
                              <div className="text-xs text-gray-500">المدة: {offer.estimated_duration}</div>
                            )}
                            {offer.notes && (
                              <div className="text-xs text-gray-500">{offer.notes}</div>
                            )}
                            {offer.status === 'pending' && (
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => handleAcceptOffer(offer.id)}
                                  className="flex-1 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors"
                                >
                                  قبول
                                </button>
                                <button
                                  onClick={() => handleRejectOffer(offer.id)}
                                  className="flex-1 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors"
                                >
                                  رفض
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Provider actions */}
                {tab === 'provider' && (
                  <div className="space-y-3">
                    {selectedRequest.status === 'available_to_providers' && !showOfferForm && (
                      <button
                        onClick={() => setShowOfferForm(true)}
                        className="w-full py-3 rounded-xl bg-gradient-to-l from-siwar-600 to-siwar-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
                      >
                        تقديم عرض سعر
                      </button>
                    )}

                    {showOfferForm && (
                      <div className="space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <h5 className="text-sm font-bold text-gray-700">تقديم عرض</h5>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600">السعر (ريال) *</label>
                          <input
                            type="number"
                            value={offerPrice}
                            onChange={(e) => setOfferPrice(e.target.value)}
                            placeholder="مثال: 1500"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600">نوع المركبة</label>
                          <input
                            type="text"
                            value={offerVehicle}
                            onChange={(e) => setOfferVehicle(e.target.value)}
                            placeholder="مثال: شاحنة متوسطة"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600">المدة المتوقعة</label>
                          <input
                            type="text"
                            value={offerDuration}
                            onChange={(e) => setOfferDuration(e.target.value)}
                            placeholder="مثال: 2 يوم"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600">ملاحظات</label>
                          <textarea
                            value={offerNotes}
                            onChange={(e) => setOfferNotes(e.target.value)}
                            rows={2}
                            placeholder="تفاصيل إضافية"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSubmitOffer}
                            disabled={submittingOffer || !offerPrice}
                            className="flex-1 py-3 rounded-xl bg-siwar-600 text-white text-sm font-bold hover:bg-siwar-700 transition-colors disabled:opacity-50"
                          >
                            {submittingOffer ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'تقديم'}
                          </button>
                          <button
                            onClick={() => setShowOfferForm(false)}
                            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}

                    {/* My offer status for this request */}
                    {myOffers.filter((o) => o.logistics_request_id === selectedRequest.id).length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <p className="text-xs text-amber-700">
                          عرضك على هذا الطلب: {OFFER_STATUS_LABELS[myOffers.find((o) => o.logistics_request_id === selectedRequest.id)?.status ?? 'pending']}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : tab === 'owner' ? (
              /* ── Owner: My Requests List ── */
              <div className="space-y-3">
                {/* Status filter */}
                <div className="flex items-center gap-2 overflow-x-auto fancy-scroll pb-1">
                  {statusOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        statusFilter === s ? 'bg-siwar-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s === 'all' ? 'الكل' : LOGISTICS_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Package className="w-10 h-10 text-gray-300" />
                    <p className="text-sm text-gray-500">لا توجد طلبات لوجستية.</p>
                  </div>
                ) : (
                  filteredRequests.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => handleSelectRequest(req)}
                      className="w-full p-4 rounded-2xl border border-gray-100 bg-white hover:border-siwar-200 hover:shadow-card transition-all text-right group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-gray-800 group-hover:text-siwar-700 transition-colors">
                          {req.title}
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${LOGISTICS_STATUS_COLORS[req.status]}`}>
                          {LOGISTICS_STATUS_LABELS[req.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" /> {req.asset_type}
                        </span>
                        {req.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {req.city}
                          </span>
                        )}
                        {req.transport_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {req.transport_date}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              /* ── Provider: Available Requests ── */
              <div className="space-y-3">
                {availableRequests.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Truck className="w-10 h-10 text-gray-300" />
                    <p className="text-sm text-gray-500">لا توجد طلبات متاحة حالياً.</p>
                  </div>
                ) : (
                  availableRequests.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => handleSelectRequest(req)}
                      className="w-full p-4 rounded-2xl border border-gray-100 bg-white hover:border-siwar-200 hover:shadow-card transition-all text-right group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-gray-800 group-hover:text-siwar-700 transition-colors">
                          {req.title}
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${LOGISTICS_STATUS_COLORS[req.status]}`}>
                          {LOGISTICS_STATUS_LABELS[req.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" /> {req.asset_type}
                        </span>
                        {req.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {req.city}
                          </span>
                        )}
                        {req.transport_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {req.transport_date}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> عرض وتقديم عرض
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
