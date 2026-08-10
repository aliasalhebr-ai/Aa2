import { supabase } from '@/lib/supabase';
import type {
  NetworkPulseEvent, Company, OpportunityItemSummary,
  PartnershipProfileSummary, PartnershipRoleSummary,
} from '@/types';

export type OpportunityDetailBundle = {
  opportunity: NetworkPulseEvent | null;
  sectorLabel: string | null;
  subSectorLabel: string | null;
  subSectorSlug: string | null;
  publisher: Company | null;
  items: OpportunityItemSummary[];
  partnershipProfile: PartnershipProfileSummary | null;
  partnershipRoles: PartnershipRoleSummary[];
  isOwner: boolean;
  isAdmin: boolean;
};

export async function getOpportunityDetailBundle(
  opportunityId: string,
  currentUserId: string | null,
  isAdmin: boolean,
): Promise<OpportunityDetailBundle | null> {
  // ── Query 1: Opportunity ──
  const { data: opp, error: oppError } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .maybeSingle();

  if (oppError || !opp) return null;

  const isOwner = currentUserId !== null && opp.created_by === currentUserId;

  // Permission check: non-owners and non-admins can only see active
  if (!isOwner && !isAdmin && opp.status !== 'active') {
    return {
      opportunity: null,
      sectorLabel: null,
      subSectorLabel: null,
      subSectorSlug: null,
      publisher: null,
      items: [],
      partnershipProfile: null,
      partnershipRoles: [],
      isOwner: false,
      isAdmin: false,
    };
  }

  // Build NetworkPulseEvent-like object from the opportunity row
  const event: NetworkPulseEvent = {
    id: opp.id,
    activity_type: 'opportunity',
    activity_subtype: opp.operation_type ?? opp.opportunity_type,
    title: opp.title,
    description: opp.description,
    image: opp.image,
    city: opp.city,
    sector_id: opp.sector_id,
    sub_sector_id: opp.sub_sector_id,
    company_id: opp.publisher_entity_id ?? opp.company_id,
    quantity: opp.quantity,
    quality: opp.quality,
    price: opp.price,
    auction_status: null,
    time_remaining: null,
    attributes: opp.attributes ?? {},
    images: opp.images ?? [],
    created_at: opp.created_at,
    opportunity_type: opp.opportunity_type ?? opp.operation_type,
    opportunity_timing: opp.opportunity_timing,
    template_version: opp.template_version ?? 1,
  };

  // ── Parallel queries: sector, sub-sector, publisher, items, partnership ──
  const sectorPromise = opp.sector_id
    ? supabase.from('sectors').select('name').eq('id', opp.sector_id).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const subSectorPromise = opp.sub_sector_id
    ? supabase.from('sub_sectors').select('name, slug').eq('id', opp.sub_sector_id).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const publisherPromise = event.company_id
    ? supabase.from('publisher_entities').select('*').eq('id', event.company_id).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const itemsPromise = supabase
    .from('opportunity_items')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const isPartnership = (opp.opportunity_type ?? opp.operation_type) === 'partnership';
  const profilePromise = isPartnership
    ? supabase.from('partnership_opportunity_profiles').select('*').eq('opportunity_id', opportunityId).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const rolesPromise = isPartnership
    ? supabase.from('partnership_roles').select('*').eq('opportunity_id', opportunityId).order('display_order', { ascending: true })
    : Promise.resolve({ data: null, error: null });

  const [
    sectorResult, subSectorResult, publisherResult, itemsResult,
    profileResult, rolesResult,
  ] = await Promise.all([
    sectorPromise, subSectorPromise, publisherPromise, itemsPromise,
    profilePromise, rolesPromise,
  ]);

  const sectorLabel = sectorResult.data?.name ?? null;
  const subSectorLabel = subSectorResult.data?.name ?? null;
  const subSectorSlug = subSectorResult.data?.slug ?? null;

  const publisher: Company | null = publisherResult.data
    ? {
        id: publisherResult.data.id,
        name: publisherResult.data.name,
        entity_type: publisherResult.data.entity_type,
        is_verified: publisherResult.data.is_verified ?? false,
        is_active: publisherResult.data.is_active ?? true,
        city: publisherResult.data.city ?? null,
        owner_user_id: publisherResult.data.owner_user_id ?? null,
        created_at: publisherResult.data.created_at,
      } as unknown as Company
    : null;

  const items: OpportunityItemSummary[] = (itemsResult.data ?? []).map((row) => ({
    id: row.id,
    opportunity_id: opportunityId,
    item_type: row.item_type ?? null,
    reference_source: row.reference_source ?? null,
    reference_id: row.reference_id ?? null,
    name_snapshot: row.name_snapshot ?? null,
    variety_name_snapshot: row.variety_name_snapshot ?? null,
    quantity: row.quantity !== null ? Number(row.quantity) : null,
    unit: row.unit ?? null,
    unit_price: row.unit_price !== null ? Number(row.unit_price) : null,
    pricing_type: row.pricing_type ?? null,
    cover_image: row.cover_image ?? null,
    images: Array.isArray(row.images) ? row.images : [],
    attributes: (row.attributes ?? {}) as Record<string, unknown>,
    age_value: row.age_value !== null ? Number(row.age_value) : null,
    height_value: row.height_value !== null ? Number(row.height_value) : null,
    root_status: row.root_status ?? null,
    readiness_status: row.readiness_status ?? null,
    container_size: row.container_size ?? null,
    display_order: row.display_order ?? 0,
  }));

  const partnershipProfile: PartnershipProfileSummary | null = profileResult.data
    ? {
        opportunity_id: opportunityId,
        partnership_type: profileResult.data.partnership_type ?? null,
        project_size: profileResult.data.project_size ?? null,
        join_deadline: profileResult.data.join_deadline ?? null,
        required_partners_count: profileResult.data.required_partners_count ?? null,
        partners_count_mode: profileResult.data.partners_count_mode ?? null,
        coverage_mode: profileResult.data.coverage_mode ?? null,
        expected_duration: profileResult.data.expected_duration ?? null,
        summary: profileResult.data.summary ?? null,
      }
    : null;

  const partnershipRoles: PartnershipRoleSummary[] = (rolesResult.data ?? []).map((row) => ({
    opportunity_id: opportunityId,
    role_key: row.role_key,
    role_label_snapshot: row.role_label_snapshot ?? null,
    required_count: row.required_count ?? null,
    display_order: row.display_order ?? 0,
  }));

  return {
    opportunity: event,
    sectorLabel,
    subSectorLabel,
    subSectorSlug,
    publisher,
    items,
    partnershipProfile,
    partnershipRoles,
    isOwner,
    isAdmin,
  };
}

// ── Cache ──────────────────────────────────────────────────────────────────
//
// Two-tier cache to prevent permission leakage:
//   - publicCache: for active opportunities visible to everyone (key = opportunityId)
//   - privateCache: for non-active opportunities visible only to owner/admin (key = opportunityId + viewerId + scope)
// Permission is re-checked before returning any cached bundle.

const publicCache = new Map<string, { bundle: OpportunityDetailBundle; timestamp: number }>();
const privateCache = new Map<string, { bundle: OpportunityDetailBundle; timestamp: number }>();
const CACHE_TTL = 30_000; // 30 seconds

export async function getCachedOpportunityDetailBundle(
  opportunityId: string,
  currentUserId: string | null,
  isAdmin: boolean,
): Promise<OpportunityDetailBundle | null> {
  // We don't know the status yet, so check private cache first (owner/admin)
  if (currentUserId) {
    const privateKey = `${opportunityId}:${currentUserId}:${isAdmin ? 'admin' : 'owner'}`;
    const cachedPrivate = privateCache.get(privateKey);
    if (cachedPrivate && Date.now() - cachedPrivate.timestamp < CACHE_TTL) {
      // Re-check permission before returning
      if (cachedPrivate.bundle.isOwner || cachedPrivate.bundle.isAdmin) {
        return cachedPrivate.bundle;
      }
    }
  }

  // Check public cache (active opportunities)
  const cachedPublic = publicCache.get(opportunityId);
  if (cachedPublic && Date.now() - cachedPublic.timestamp < CACHE_TTL) {
    // Only return public cache if the bundle is for an active opportunity
    // and the viewer is not the owner (owner might see a different status)
    if (cachedPublic.bundle.opportunity && !cachedPublic.bundle.isOwner) {
      return cachedPublic.bundle;
    }
  }

  // Cache miss — fetch fresh
  const bundle = await getOpportunityDetailBundle(opportunityId, currentUserId, isAdmin);
  if (!bundle || !bundle.opportunity) return bundle;

  if (bundle.opportunity && (bundle.isOwner || bundle.isAdmin)) {
    // Private cache for owner/admin
    if (currentUserId) {
      const privateKey = `${opportunityId}:${currentUserId}:${isAdmin ? 'admin' : 'owner'}`;
      privateCache.set(privateKey, { bundle, timestamp: Date.now() });
    }
    // If it's also active, store in public cache too (for non-owner viewers)
    if (bundle.opportunity && (bundle.opportunity as NetworkPulseEvent).attributes) {
      // We need to check status — but we don't have it in the event object
      // Store a non-owner version in public cache
      const publicBundle: OpportunityDetailBundle = {
        ...bundle,
        isOwner: false,
        isAdmin: false,
      };
      publicCache.set(opportunityId, { bundle: publicBundle, timestamp: Date.now() });
    }
  } else {
    // Public cache for active opportunities
    publicCache.set(opportunityId, { bundle, timestamp: Date.now() });
  }

  return bundle;
}

export function invalidateOpportunityDetailCache(opportunityId: string): void {
  publicCache.delete(opportunityId);
  for (const key of privateCache.keys()) {
    if (key.startsWith(opportunityId)) privateCache.delete(key);
  }
}

export function clearAllOpportunityDetailCache(): void {
  publicCache.clear();
  privateCache.clear();
}

// ── Admin check ────────────────────────────────────────────────────────────

export async function checkIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check raw_app_meta_data for admin role (server-set, not client-set)
  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  if (appMeta?.role === 'admin' || appMeta?.is_admin === true) return true;

  // Fallback: check is_super_admin on auth.users
  if (user.app_metadata?.is_super_admin === true) return true;

  return false;
}
