import { supabase } from '@/lib/supabase';
import type { FormData, FieldDefinition, PublisherEntity } from '@/types';

export type OpportunityStatus = 'draft' | 'pending_review' | 'active' | 'closed' | 'archived' | 'rejected';

export type CreateOpportunityInput = {
  sectorId: string;
  subSectorId: string;
  operationType: string;
  formData: FormData;
  fieldDefs: FieldDefinition[];
  images: string[];
  status: OpportunityStatus;
  publisherEntityId?: string | null;
};

export type SavedOpportunity = {
  id: string;
  title: string;
  description: string | null;
  sector_id: string;
  sub_sector_id: string | null;
  operation_type: string | null;
  quantity: string | null;
  price: string | null;
  city: string | null;
  attributes: Record<string, unknown>;
  images: string[];
  status: string;
  created_by: string | null;
  publisher_entity_id: string | null;
  created_at: string;
};

const CORE_FIELD_KEYS = new Set([
  'title', 'description', 'quantity', 'price', 'city', 'location',
]);

function buildAttributes(
  formData: FormData,
  fieldDefs: FieldDefinition[],
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  for (const field of fieldDefs) {
    const key = field.field_key;
    if (CORE_FIELD_KEYS.has(key)) continue;
    const value = formData[key];
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    attrs[key] = value;
  }
  return attrs;
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول لرفع الصور');
  return user.id;
}

export async function uploadOpportunityImage(
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

  const userId = await getCurrentUserId();
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const filePath = `opportunities/${userId}/${fileName}`;

  onProgress?.(10);

  const { error } = await supabase.storage
    .from('opportunity-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(`فشل رفع الصورة: ${error.message}`);

  onProgress?.(100);
  return filePath;
}

export async function deleteOpportunityImage(filePath: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const userPrefix = `opportunities/${user.id}/`;
  if (!filePath.startsWith(userPrefix)) {
    throw new Error('لا يمكنك حذف صورة لا تملكها');
  }

  await supabase.storage.from('opportunity-images').remove([filePath]);
}

export async function createSignedImageUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('opportunity-images')
    .createSignedUrl(filePath, expiresIn);
  if (error) throw new Error(`فشل إنشاء رابط الصورة: ${error.message}`);
  return data.signedUrl;
}

export async function createOpportunity(
  input: CreateOpportunityInput,
): Promise<SavedOpportunity> {
  const { sectorId, subSectorId, operationType, formData, fieldDefs, images, status, publisherEntityId } = input;

  if (status === 'pending_review' && !publisherEntityId) {
    throw new Error('يجب اختيار جهة ناشرة قبل إرسال السجل للمراجعة');
  }

  const title = String(formData.title ?? 'بدون عنوان');
  const description = (formData.description as string) ?? null;
  const quantity = formData.quantity != null ? String(formData.quantity) : null;
  const price = formData.price != null ? String(formData.price) : null;
  const city = (formData.city as string) ?? (formData.location as string) ?? null;
  const attributes = buildAttributes(formData, fieldDefs);

  const insertPayload = {
    sector_id: sectorId,
    sub_sector_id: subSectorId,
    operation_type: operationType,
    type: 'opportunity',
    title,
    description,
    quantity,
    price,
    city,
    attributes,
    images,
    status,
    publisher_entity_id: publisherEntityId ?? null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('opportunities')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError) {
    throw new Error(`فشل حفظ السجل: ${insertError.message}`);
  }
  if (!inserted) {
    throw new Error('فشل حفظ السجل: لم يتم إرجاع أي بيانات');
  }

  return inserted as SavedOpportunity;
}

export async function updateOpportunityStatus(
  id: string,
  status: OpportunityStatus,
): Promise<SavedOpportunity | null> {
  const { data, error } = await supabase
    .from('opportunities')
    .update({ status })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`فشل تحديث حالة السجل: ${error.message}`);
  return data as SavedOpportunity | null;
}

export async function readOpportunity(id: string): Promise<SavedOpportunity | null> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`فشل قراءة السجل: ${error.message}`);
  return data as SavedOpportunity | null;
}

export async function getPublisherEntitiesForUser(): Promise<PublisherEntity[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('publisher_entities')
    .select('*')
    .eq('owner_user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`فشل جلب الجهات الناشرة: ${error.message}`);
  return (data ?? []) as PublisherEntity[];
}

export async function createPublisherEntity(
  entity: Omit<PublisherEntity, 'id' | 'is_verified' | 'is_active' | 'created_at'>,
): Promise<PublisherEntity> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول لإنشاء جهة ناشرة');

  const { data, error } = await supabase
    .from('publisher_entities')
    .insert({
      owner_user_id: user.id,
      entity_type: entity.entity_type,
      name: entity.name,
      description: entity.description,
      city: entity.city,
    })
    .select('*')
    .single();
  if (error) throw new Error(`فشل إنشاء الجهة الناشرة: ${error.message}`);
  return data as PublisherEntity;
}

export async function getPublicOpportunityImageUrl(
  opportunityId: string,
  imageIndex: number,
): Promise<string | null> {
  try {
    const baseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    if (!baseUrl) return null;

    const response = await fetch(
      `${baseUrl}/functions/v1/serve-opportunity-image/${opportunityId}/${imageIndex}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}

export async function getPublicImageUrlByPath(
  imagePath: string,
): Promise<string | null> {
  if (/^https?:\/\//.test(imagePath)) return imagePath;
  try {
    const baseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    if (!baseUrl) return null;

    const encodedPath = encodeURIComponent(imagePath);
    const response = await fetch(
      `${baseUrl}/functions/v1/serve-opportunity-image/path/${encodedPath}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}

// ── Admin review ──────────────────────────────────────────

export async function getOpportunitiesForReview(): Promise<SavedOpportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .in('status', ['pending_review', 'active', 'rejected'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedOpportunity[];
}

export async function approveOpportunity(id: string): Promise<SavedOpportunity | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('opportunities')
    .update({ status: 'active', reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(), rejection_reason: null })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`فشل اعتماد السجل: ${error.message}`);
  return data as SavedOpportunity | null;
}

export async function rejectOpportunity(id: string, reason: string): Promise<SavedOpportunity | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('opportunities')
    .update({ status: 'rejected', reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(), rejection_reason: reason })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`فشل رفض السجل: ${error.message}`);
  return data as SavedOpportunity | null;
}

export async function getMyOpportunities(): Promise<SavedOpportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedOpportunity[];
}

export async function updateOpportunity(
  id: string,
  updates: Record<string, unknown>,
): Promise<SavedOpportunity | null> {
  const { data, error } = await supabase
    .from('opportunities')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`فشل تحديث السجل: ${error.message}`);
  return data as SavedOpportunity | null;
}

// ── Service Offers ─────────────────────────────────────────

export type CreateServiceOfferInput = {
  opportunityId: string;
  price?: number | null;
  duration?: string | null;
  scope?: string | null;
  equipment?: string | null;
  labor?: string | null;
  notes?: string | null;
  hasTransport?: boolean;
  providerEntityId?: string | null;
};

export async function createServiceOffer(input: CreateServiceOfferInput): Promise<unknown> {
  const payload = {
    opportunity_id: input.opportunityId,
    price: input.price ?? null,
    duration: input.duration ?? null,
    scope: input.scope ?? null,
    equipment: input.equipment ?? null,
    labor: input.labor ?? null,
    notes: input.notes ?? null,
    has_transport: input.hasTransport ?? false,
    provider_entity_id: input.providerEntityId ?? null,
  };
  const { data, error } = await supabase
    .from('service_offers')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new Error(`فشل تقديم العرض: ${error.message}`);
  return data;
}

export async function getServiceOffers(opportunityId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('service_offers')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function acceptServiceOffer(offerId: string): Promise<void> {
  await supabase.from('service_offers').update({ status: 'accepted' }).eq('id', offerId);
}

export async function rejectServiceOffer(offerId: string): Promise<void> {
  await supabase.from('service_offers').update({ status: 'rejected' }).eq('id', offerId);
}

export async function getMyServiceOffers(): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('service_offers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function completeService(opportunityId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_service', { p_opportunity_id: opportunityId });
  if (error) throw new Error(`فشل إكمال الخدمة: ${error.message}`);
}

export async function getRelatedOpportunities(
  sectorId: string,
  subSectorId: string | null,
  excludeId: string,
  limit: number = 5,
): Promise<unknown[]> {
  let query = supabase
    .from('opportunities')
    .select('id, title, image, city, price, quantity, created_at')
    .eq('sector_id', sectorId)
    .eq('status', 'active')
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (subSectorId) {
    query = query.eq('sub_sector_id', subSectorId);
  }
  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function getRelatedLogistics(opportunityId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('logistics_requests')
    .select('id, title, status, city, asset_type, created_at')
    .eq('source_opportunity_id', opportunityId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) return [];
  return data ?? [];
}

export async function getRelatedAuctions(opportunityId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('auction_requests')
    .select('id, asset_title, status, auction_type, created_at')
    .eq('source_opportunity_id', opportunityId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) return [];
  return data ?? [];
}
