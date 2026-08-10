import { supabase } from '@/lib/supabase';
import type {
  DiscoveryQuery,
  DiscoveryResult,
  DiscoveryFilters,
  DiscoverySortOption,
  PlantSearchResult,
  VarietySearchResult,
  CityOption,
  PartnershipRoleOption,
  PartnershipTypeOption,
} from '@/types/discovery';

// ── Default empty filters ──────────────────────────────────────────────────
export function createEmptyFilters(): DiscoveryFilters {
  return {
    opportunityType: null,
    subSectorId: null,
    city: null,
    opportunityTiming: null,
    plantId: null,
    varietyId: null,
    quantityMin: null,
    quantityMax: null,
    priceMin: null,
    priceMax: null,
    isVerified: null,
    supplyDateBefore: null,
    includesPlanting: null,
    includesTransport: null,
    partnershipType: null,
    partnershipRoleKey: null,
    joinDeadlineBefore: null,
  };
}

// ── Check if any filters are active ─────────────────────────────────────────
export function hasActiveFilters(filters: DiscoveryFilters): boolean {
  return (Object.keys(filters) as (keyof DiscoveryFilters)[]).some((key) => {
    const val = filters[key];
    if (val === null || val === undefined) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    return true;
  });
}

// ── Count active filters ───────────────────────────────────────────────────
export function countActiveFilters(filters: DiscoveryFilters): number {
  return (Object.keys(filters) as (keyof DiscoveryFilters)[]).filter((key) => {
    const val = filters[key];
    if (val === null || val === undefined) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    return true;
  }).length;
}

// ── Hash filters for cache key ──────────────────────────────────────────────
export function hashFilters(filters: DiscoveryFilters): string {
  const sorted = JSON.stringify(filters, Object.keys(filters).sort());
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// ── Main search function via RPC ────────────────────────────────────────────
export async function searchOpportunities(query: DiscoveryQuery): Promise<DiscoveryResult> {
  const { data, error } = await supabase.rpc('search_opportunities_v2', {
    p_sector_id: query.sectorId,
    p_search_query: query.searchQuery.trim() || null,
    p_opportunity_type: query.filters.opportunityType,
    p_sub_sector_id: query.filters.subSectorId,
    p_city: query.filters.city,
    p_opportunity_timing: query.filters.opportunityTiming,
    p_plant_id: query.filters.plantId,
    p_variety_id: query.filters.varietyId,
    p_quantity_min: query.filters.quantityMin,
    p_quantity_max: query.filters.quantityMax,
    p_price_min: query.filters.priceMin,
    p_price_max: query.filters.priceMax,
    p_is_verified: query.filters.isVerified,
    p_supply_date_before: query.filters.supplyDateBefore,
    p_includes_planting: query.filters.includesPlanting,
    p_includes_transport: query.filters.includesTransport,
    p_partnership_type: query.filters.partnershipType,
    p_partnership_role_key: query.filters.partnershipRoleKey,
    p_join_deadline_before: query.filters.joinDeadlineBefore,
    p_page: query.page,
    p_page_size: query.pageSize,
    p_sort: query.sort,
  });

  if (error) throw error;

  const rows = (data ?? []) as { id: string | null; total_count: number }[];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
  const opportunityIds = rows
    .map((r) => r.id)
    .filter((id): id is string => id !== null);

  return {
    opportunityIds,
    totalCount,
    page: query.page,
    pageSize: query.pageSize,
    hasMore: opportunityIds.length === query.pageSize && totalCount > query.page * query.pageSize,
  };
}

// ── Fetch full opportunity data by IDs ──────────────────────────────────────
// Uses the existing network_pulse view to get the full row shape that
// OpportunityCardMapper expects.
export async function fetchOpportunitiesByIds(ids: string[]): Promise<Record<string, unknown>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from('network_pulse')
    .select('*')
    .in('id', ids);

  if (error) return {};

  const map: Record<string, unknown> = {};
  for (const row of data ?? []) {
    map[row.id as string] = row;
  }
  return map;
}

// ── Plant search (with debounce-friendly pattern) ────────────────────────────
export async function searchPlants(searchText: string): Promise<PlantSearchResult[]> {
  const trimmed = searchText.trim();
  if (trimmed.length < 1) return [];

  const { data, error } = await supabase
    .from('plant_catalog')
    .select('id, arabic_name, english_name, scientific_name')
    .or(`arabic_name.ilike.%${trimmed}%,english_name.ilike.%${trimmed}%,scientific_name.ilike.%${trimmed}%`)
    .eq('is_active', true)
    .order('arabic_name')
    .limit(20);

  if (error) return [];
  return (data ?? []) as PlantSearchResult[];
}

// ── Get all plants (for dropdown without search) ─────────────────────────────
export async function getAllPlants(): Promise<PlantSearchResult[]> {
  const { data, error } = await supabase
    .from('plant_catalog')
    .select('id, arabic_name, english_name, scientific_name')
    .eq('is_active', true)
    .order('arabic_name')
    .limit(50);

  if (error) return [];
  return (data ?? []) as PlantSearchResult[];
}

// ── Get varieties for a specific plant ───────────────────────────────────────
export async function getVarietiesForPlant(plantId: string): Promise<VarietySearchResult[]> {
  const { data, error } = await supabase
    .from('plant_varieties')
    .select('id, plant_id, name_ar')
    .eq('plant_id', plantId)
    .eq('is_active', true)
    .order('name_ar');

  if (error) return [];
  return (data ?? []) as VarietySearchResult[];
}

// ── Get cities that exist in active opportunities for a sector ──────────────
export async function getCitiesForSector(sectorId: string): Promise<CityOption[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('city')
    .eq('sector_id', sectorId)
    .eq('status', 'active')
    .not('city', 'is', null)
    .neq('city', '');

  if (error) return [];

  const unique = [...new Set((data ?? []).map((r) => r.city as string).filter(Boolean))];
  return unique
    .sort()
    .map((c) => ({ value: c, label: c }));
}

// ── Get partnership role options from catalog ────────────────────────────────
export async function getPartnershipRoleOptions(): Promise<PartnershipRoleOption[]> {
  const { data, error } = await supabase
    .from('partnership_role_catalog')
    .select('role_key, role_label')
    .eq('is_active', true)
    .order('display_order');

  if (error) return [];
  return (data ?? []) as PartnershipRoleOption[];
}

// ── Get partnership type options ──────────────────────────────────────────────
export async function getPartnershipTypeOptions(): Promise<PartnershipTypeOption[]> {
  const { data, error } = await supabase
    .from('partnership_opportunity_profiles')
    .select('partnership_type')
    .not('partnership_type', 'is', null)
    .neq('partnership_type', '');

  if (error) return [];

  const unique = [...new Set((data ?? []).map((r) => r.partnership_type as string).filter(Boolean))];
  const labels: Record<string, string> = {
    production: 'إنتاج',
    marketing: 'تسويق',
    distribution: 'توزيع',
    investment: 'استثمار',
    joint_venture: 'مشروع مشترك',
  };
  return unique.map((v) => ({ value: v, label: labels[v] ?? v }));
}

// ── Sort options ──────────────────────────────────────────────────────────────
export const SORT_OPTIONS: { value: DiscoverySortOption; label: string }[] = [
  { value: 'latest', label: 'الأحدث' },
  { value: 'closing_soon', label: 'الأقرب لموعد الإغلاق' },
  { value: 'quantity_high', label: 'الكمية: من الأعلى' },
  { value: 'quantity_low', label: 'الكمية: من الأقل' },
  { value: 'price_low', label: 'السعر: من الأقل' },
  { value: 'price_high', label: 'السعر: من الأعلى' },
];

// ── Timing options ────────────────────────────────────────────────────────────
export const TIMING_OPTIONS: { value: string; label: string }[] = [
  { value: 'available_now', label: 'متاح الآن' },
  { value: 'future_production', label: 'إنتاج مستقبلي' },
  { value: 'scheduled', label: 'موعد محدد' },
  { value: 'flexible', label: 'موعد مرن' },
];

// ── Opportunity type options ──────────────────────────────────────────────────
export const OPPORTUNITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'offer', label: 'عرض' },
  { value: 'demand', label: 'احتياج' },
  { value: 'partnership', label: 'شراكة' },
];
