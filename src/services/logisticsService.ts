import { supabase } from '@/lib/supabase';
import type {
  LogisticsFieldDefinition, LogisticsRequestStatus, SavedLogisticsRequest,
  LogisticsOffer, LogisticsOfferStatus, LogisticsCategory, FormData,
} from '@/types';

const CORE_LOGISTICS_KEYS = new Set([
  'asset_type', 'pickup_location', 'delivery_location', 'city',
  'quantity', 'weight', 'count', 'height', 'vehicle_type',
  'needs_crane', 'needs_loading', 'needs_unloading', 'transport_date', 'notes',
  'palm_count', 'seedling_count', 'height_range', 'trunk_diameter',
  'is_uprooted', 'needs_uprooting', 'needs_planting', 'approximate_weight',
  'packaging_condition', 'weight_unit', 'packaging_type', 'needs_refrigerated',
  'temperature', 'pickup_time', 'delivery_time', 'quantity_method',
  'quantity_description', 'loading_readiness', 'execution_schedule', 'is_batched',
]);

export type CreateLogisticsInput = {
  sectorId: string;
  subSectorId: string;
  sourceSectorId: string;
  sourceSpecialtyId: string | null;
  logisticsCategoryId?: string | null;
  sourceOpportunityId?: string | null;
  formData: FormData;
  fieldDefs: LogisticsFieldDefinition[];
  images: string[];
  status: LogisticsRequestStatus;
  publisherEntityId?: string | null;
};

export async function getLogisticsFieldDefinitions(
  sectorId: string,
  sourceSpecialtyId?: string | null,
): Promise<LogisticsFieldDefinition[]> {
  let query = supabase
    .from('logistics_field_definitions')
    .select('*')
    .eq('sector_id', sectorId);

  if (sourceSpecialtyId) {
    query = query.eq('source_specialty_id', sourceSpecialtyId);
  } else {
    query = query.is('source_specialty_id', null);
  }

  const { data, error } = await query.order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LogisticsFieldDefinition[];
}

export async function getLogisticsCategories(sectorId: string): Promise<LogisticsCategory[]> {
  const { data, error } = await supabase
    .from('logistics_categories')
    .select('*')
    .eq('sector_id', sectorId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LogisticsCategory[];
}

function buildLogisticsAttributes(
  formData: FormData,
  fieldDefs: LogisticsFieldDefinition[],
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  for (const field of fieldDefs) {
    const key = field.field_key;
    if (CORE_LOGISTICS_KEYS.has(key)) continue;
    const value = formData[key];
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    attrs[key] = value;
  }
  return attrs;
}

function mapFormDataToColumns(formData: FormData): Record<string, unknown> {
  return {
    asset_type: (formData.asset_type as string) ?? 'نخلة',
    pickup_location: (formData.pickup_location as string) ?? null,
    delivery_location: (formData.delivery_location as string) ?? null,
    city: (formData.city as string) ?? null,
    quantity: formData.quantity != null ? String(formData.quantity) : null,
    weight: formData.weight != null ? String(formData.weight) : null,
    count: formData.count != null ? Number(formData.count) : null,
    height: formData.height != null ? String(formData.height) : null,
    vehicle_type: (formData.vehicle_type as string) ?? null,
    needs_crane: formData.needs_crane === true,
    needs_loading: formData.needs_loading === true,
    needs_unloading: formData.needs_unloading === true,
    transport_date: (formData.transport_date as string) ?? null,
    description: (formData.notes as string) ?? null,
  };
}

export async function createLogisticsRequest(
  input: CreateLogisticsInput,
): Promise<SavedLogisticsRequest> {
  const {
    sectorId, subSectorId, sourceSectorId, sourceSpecialtyId,
    logisticsCategoryId, sourceOpportunityId, formData, fieldDefs, images, status,
    publisherEntityId,
  } = input;

  const cols = mapFormDataToColumns(formData);
  const assetType = cols.asset_type as string;
  const city = (cols.city as string) ?? '';
  const title = `طلب نقل ${assetType} — ${city || 'غير محدد'}`;
  const attributes = buildLogisticsAttributes(formData, fieldDefs);

  const payload = {
    sector_id: sectorId,
    sub_sector_id: subSectorId,
    source_sector_id: sourceSectorId,
    source_specialty_id: sourceSpecialtyId,
    logistics_category_id: logisticsCategoryId ?? null,
    source_opportunity_id: sourceOpportunityId ?? null,
    title,
    attributes,
    images,
    status,
    publisher_entity_id: publisherEntityId ?? null,
    ...cols,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('logistics_requests')
    .insert(payload)
    .select('*')
    .single();

  if (insertError) throw new Error(`فشل حفظ الطلب اللوجستي: ${insertError.message}`);
  if (!inserted) throw new Error('فشل حفظ الطلب اللوجستي: لم يتم إرجاع أي بيانات');

  return inserted as SavedLogisticsRequest;
}

export async function readLogisticsRequest(id: string): Promise<SavedLogisticsRequest | null> {
  const { data, error } = await supabase
    .from('logistics_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`فشل قراءة الطلب اللوجستي: ${error.message}`);
  return data as SavedLogisticsRequest | null;
}

export async function getMyLogisticsRequests(): Promise<SavedLogisticsRequest[]> {
  const { data, error } = await supabase
    .from('logistics_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`فشل جلب الطلبات: ${error.message}`);
  return (data ?? []) as SavedLogisticsRequest[];
}

export async function getAvailableLogisticsRequests(): Promise<SavedLogisticsRequest[]> {
  const { data, error } = await supabase
    .from('logistics_requests')
    .select('*')
    .in('status', ['available_to_providers', 'offers_received'])
    .order('created_at', { ascending: false });
  if (error) throw new Error(`فشل جلب الطلبات المتاحة: ${error.message}`);
  return (data ?? []) as SavedLogisticsRequest[];
}

export async function updateLogisticsRequestStatus(
  id: string,
  status: LogisticsRequestStatus,
): Promise<SavedLogisticsRequest | null> {
  const { data, error } = await supabase
    .from('logistics_requests')
    .update({ status })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`فشل تحديث حالة الطلب: ${error.message}`);
  return data as SavedLogisticsRequest | null;
}

export async function cancelLogisticsRequest(id: string): Promise<SavedLogisticsRequest | null> {
  return updateLogisticsRequestStatus(id, 'cancelled');
}

// ═══════════════════════════════════════════════════════════
// Offers
// ═══════════════════════════════════════════════════════════

export type CreateOfferInput = {
  logisticsRequestId: string;
  price?: number | null;
  vehicleType?: string | null;
  estimatedDuration?: string | null;
  notes?: string | null;
  providerEntityId?: string | null;
};

export async function createLogisticsOffer(input: CreateOfferInput): Promise<LogisticsOffer> {
  const payload = {
    logistics_request_id: input.logisticsRequestId,
    price: input.price ?? null,
    vehicle_type: input.vehicleType ?? null,
    estimated_duration: input.estimatedDuration ?? null,
    notes: input.notes ?? null,
    provider_entity_id: input.providerEntityId ?? null,
    status: 'pending' as LogisticsOfferStatus,
  };

  const { data, error } = await supabase
    .from('logistics_offers')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new Error(`فشل تقديم العرض: ${error.message}`);
  return data as LogisticsOffer;
}

export async function getOffersForRequest(requestId: string): Promise<LogisticsOffer[]> {
  const { data, error } = await supabase
    .from('logistics_offers')
    .select('*')
    .eq('logistics_request_id', requestId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`فشل جلب العروض: ${error.message}`);
  return (data ?? []) as LogisticsOffer[];
}

export async function getMyOffers(): Promise<LogisticsOffer[]> {
  const { data, error } = await supabase
    .from('logistics_offers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`فشل جلب عروضي: ${error.message}`);
  return (data ?? []) as LogisticsOffer[];
}

export async function updateOfferStatus(
  offerId: string,
  status: LogisticsOfferStatus,
): Promise<LogisticsOffer | null> {
  const { data, error } = await supabase
    .from('logistics_offers')
    .update({ status })
    .eq('id', offerId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`فشل تحديث العرض: ${error.message}`);
  return data as LogisticsOffer | null;
}

export async function acceptOffer(
  offerId: string,
  requestId: string,
): Promise<void> {
  await updateOfferStatus(offerId, 'accepted');
  await updateLogisticsRequestStatus(requestId, 'provider_selected');
}

export async function rejectOffer(offerId: string): Promise<void> {
  await updateOfferStatus(offerId, 'rejected');
}

// ═══════════════════════════════════════════════════════════
// Images
// ═══════════════════════════════════════════════════════════

export async function uploadLogisticsImage(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error('نوع الملف غير مسموح. الأنواع المسموحة: JPG, PNG, WebP, GIF');
  }
  if (file.size > maxSize) {
    throw new Error('حجم الصورة يتجاوز 5 ميجابايت');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول لرفع الصور');

  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const filePath = `${user.id}/${fileName}`;

  onProgress?.(10);

  const { error } = await supabase.storage
    .from('logistics-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(`فشل رفع الصورة: ${error.message}`);

  onProgress?.(100);
  return filePath;
}

export async function deleteLogisticsImage(filePath: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (!filePath.startsWith(`${user.id}/`)) {
    throw new Error('لا يمكنك حذف صورة لا تملكها');
  }
  await supabase.storage.from('logistics-images').remove([filePath]);
}

export async function createLogisticsSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('logistics-images')
    .createSignedUrl(filePath, expiresIn);
  if (error) throw new Error(`فشل إنشاء رابط الصورة: ${error.message}`);
  return data.signedUrl;
}

// ═══════════════════════════════════════════════════════════
// Status labels & colors
// ═══════════════════════════════════════════════════════════

export const LOGISTICS_STATUS_LABELS: Record<LogisticsRequestStatus, string> = {
  draft: 'مسودة',
  submitted: 'مرسل',
  under_review: 'قيد المراجعة',
  available_to_providers: 'متاح لمقدمي الخدمات',
  offers_received: 'تم استلام عروض',
  provider_selected: 'تم اختيار مقدم الخدمة',
  scheduled: 'مجدول',
  in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  failed: 'فشل',
};

export const LOGISTICS_STATUS_COLORS: Record<LogisticsRequestStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  available_to_providers: 'bg-cyan-100 text-cyan-700',
  offers_received: 'bg-indigo-100 text-indigo-700',
  provider_selected: 'bg-violet-100 text-violet-700',
  scheduled: 'bg-teal-100 text-teal-700',
  in_progress: 'bg-orange-100 text-orange-700',
  delivered: 'bg-lime-100 text-lime-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

export const OFFER_STATUS_LABELS: Record<LogisticsOfferStatus, string> = {
  pending: 'قيد الانتظار',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  withdrawn: 'مسحوب',
};

export const OFFER_STATUS_COLORS: Record<LogisticsOfferStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};
