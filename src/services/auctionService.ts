import { supabase } from '@/lib/supabase';
import type { AuctionRequest, AuctionRequestStatus } from '@/types';

export async function getMyAuctionRequests(): Promise<AuctionRequest[]> {
  const { data, error } = await supabase
    .from('auction_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`فشل جلب طلبات المزاد: ${error.message}`);
  return (data ?? []) as AuctionRequest[];
}

export async function createAuctionRequest(input: {
  sourceSectorId: string;
  sourceSubSectorId?: string | null;
  sourceOpportunityId?: string | null;
  ownerEntityId?: string | null;
  assetType?: string | null;
  assetTitle: string;
  assetDescription?: string | null;
}): Promise<AuctionRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول');

  const payload = {
    source_sector_id: input.sourceSectorId,
    source_sub_sector_id: input.sourceSubSectorId ?? null,
    source_opportunity_id: input.sourceOpportunityId ?? null,
    owner_entity_id: input.ownerEntityId ?? null,
    asset_type: input.assetType ?? null,
    asset_title: input.assetTitle,
    asset_description: input.assetDescription ?? null,
    status: 'draft' as AuctionRequestStatus,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from('auction_requests')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new Error(`فشل إنشاء طلب المزاد: ${error.message}`);
  return data as AuctionRequest;
}

export async function updateAuctionRequest(
  id: string,
  updates: Record<string, unknown>,
): Promise<AuctionRequest | null> {
  const { data, error } = await supabase
    .from('auction_requests')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`فشل تحديث طلب المزاد: ${error.message}`);
  return data as AuctionRequest | null;
}

export async function submitAuctionRequest(id: string): Promise<void> {
  await updateAuctionRequest(id, { status: 'submitted' });
}

export async function reviewAuctionRequest(id: string, approved: boolean, rejectionReason?: string): Promise<void> {
  if (approved) {
    await updateAuctionRequest(id, { status: 'under_review' });
  } else {
    await updateAuctionRequest(id, { status: 'cancelled', rejection_reason: rejectionReason ?? null });
  }
}

export async function assignMarketer(
  id: string,
  marketerId: string,
  marketerEntityId?: string | null,
): Promise<void> {
  await updateAuctionRequest(id, {
    status: 'assigned_to_marketer',
    marketer_id: marketerId,
    marketer_entity_id: marketerEntityId ?? null,
  });
}

export async function prepareAuction(
  id: string,
  auctionType: string,
  startTime: string,
  endTime: string,
): Promise<void> {
  await updateAuctionRequest(id, {
    status: 'preparing',
    auction_type: auctionType,
    start_time: startTime,
    end_time: endTime,
  });
}

export async function readyToPublish(id: string): Promise<void> {
  await updateAuctionRequest(id, { status: 'ready_to_publish' });
}

export async function publishAuction(id: string): Promise<void> {
  await updateAuctionRequest(id, { status: 'published' });
}

export async function activateAuction(id: string): Promise<void> {
  await updateAuctionRequest(id, { status: 'active' });
}

export async function endAuction(id: string, sold: boolean): Promise<void> {
  await updateAuctionRequest(id, { status: sold ? 'sold' : 'unsold' });
}

export async function cancelAuction(id: string, reason?: string): Promise<void> {
  await updateAuctionRequest(id, { status: 'cancelled', rejection_reason: reason ?? null });
}

export const AUCTION_STATUS_LABELS: Record<AuctionRequestStatus, string> = {
  draft: 'مسودة',
  submitted: 'مرسل',
  under_review: 'قيد المراجعة',
  assigned_to_marketer: 'تم تعيين مسوق',
  preparing: 'تجهيز',
  ready_to_publish: 'جاهز للنشر',
  published: 'منشور',
  active: 'نشط',
  ended: 'منتهي',
  sold: 'تم البيع',
  unsold: 'لم يُبع',
  cancelled: 'ملغي',
};

export const AUCTION_STATUS_COLORS: Record<AuctionRequestStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  assigned_to_marketer: 'bg-violet-100 text-violet-700',
  preparing: 'bg-cyan-100 text-cyan-700',
  ready_to_publish: 'bg-teal-100 text-teal-700',
  published: 'bg-green-100 text-green-700',
  active: 'bg-orange-100 text-orange-700',
  ended: 'bg-gray-100 text-gray-700',
  sold: 'bg-green-100 text-green-700',
  unsold: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const AUCTION_TYPES = [
  { value: 'public', label: 'مزاد علني' },
  { value: 'private', label: 'مزاد مغلق' },
  { value: 'online', label: 'مزاد إلكتروني' },
  { value: 'live', label: 'مزاد مباشر' },
];
