import { supabase } from '@/lib/supabase';
import type {
  Sector, SubSector, Company, NetworkPulseEvent, PalmVariety,
  FieldDefinition, MeasurementUnit, PalmServiceBranch, PalmServiceItem, PalmResidueType,
  ItemFieldDefinition, OpportunityItemSummary,
  PartnershipProfileSummary, PartnershipRoleSummary,
} from '@/types';

// ── In-memory cache: avoids re-fetching data that was already loaded ──
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60_000; // 60 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
}

// ── Batched activity counts: single query for all sectors ──
let allSectorCountsCache: Record<string, number> | null = null;

export async function getAllSectorActivityCounts(): Promise<Record<string, number>> {
  if (allSectorCountsCache) return allSectorCountsCache;
  const { data, error } = await supabase
    .from('network_pulse')
    .select('sector_id');
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const sid = row.sector_id as string;
    counts[sid] = (counts[sid] ?? 0) + 1;
  }
  allSectorCountsCache = counts;
  return counts;
}

export async function getActiveSectors(): Promise<Sector[]> {
  const cached = getCached<Sector[]>('sectors:active');
  if (cached) return cached;
  const { data, error } = await supabase
    .from('sectors')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  const result = data ?? [];
  setCached('sectors:active', result);
  return result;
}

export async function getSubSectorsBySector(sectorId: string): Promise<SubSector[]> {
  const cacheKey = `subsectors:${sectorId}`;
  const cached = getCached<SubSector[]>(cacheKey);
  if (cached) return cached;
  const { data, error } = await supabase
    .from('sub_sectors')
    .select('*')
    .eq('sector_id', sectorId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  const result = data ?? [];
  setCached(cacheKey, result);
  return result;
}

export async function getSubBranchesBySubSector(subSectorId: string): Promise<SubSector[]> {
  const cacheKey = `branches:${subSectorId}`;
  const cached = getCached<SubSector[]>(cacheKey);
  if (cached) return cached;
  const { data, error } = await supabase
    .from('sub_sectors')
    .select('*')
    .eq('parent_id', subSectorId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  const result = data ?? [];
  setCached(cacheKey, result);
  return result;
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCompaniesByIds(companyIds: string[]): Promise<Company[]> {
  if (companyIds.length === 0) return [];
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .in('id', companyIds);
  if (error) throw error;
  return data ?? [];
}

export type PulseQuery = {
  sectorId: string;
  subSectorId?: string | null;
  searchQuery?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  page?: number;
  pageSize?: number;
};

export async function getNetworkPulse(query: PulseQuery): Promise<NetworkPulseEvent[]> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dbQuery = supabase
    .from('network_pulse')
    .select('*')
    .eq('sector_id', query.sectorId);

  if (query.subSectorId) {
    const branchIds = await getSubBranchesBySubSector(query.subSectorId).then((branches) =>
      branches.map((b) => b.id)
    );
    const allIds = [query.subSectorId, ...branchIds];
    dbQuery = dbQuery.in('sub_sector_id', allIds);
  }

  if (query.searchQuery && query.searchQuery.trim().length > 0) {
    dbQuery = dbQuery.or(`title.ilike.%${query.searchQuery}%,description.ilike.%${query.searchQuery}%`);
  }

  // Apply filters — support both top-level columns and JSONB attributes
  if (query.filters) {
    for (const [key, value] of Object.entries(query.filters)) {
      if (!value) continue;
      if (key === 'location' || key === 'city') {
        dbQuery = dbQuery.eq('city', value);
      } else if (key === 'variety') {
        dbQuery = dbQuery.eq('attributes->>variety', value);
      } else if (key === 'height_range' || key === 'height') {
        dbQuery = dbQuery.eq('attributes->>height_range', value);
      } else if (key === 'weight' || key === 'weight_range') {
        dbQuery = dbQuery.eq('attributes->>weight', value);
      } else if (key === 'quantity') {
        dbQuery = dbQuery.ilike('quantity', `%${value}%`);
      } else if (key === 'price') {
        if (value.includes('-')) {
          const [min, max] = value.split('-');
          if (min) dbQuery = dbQuery.gte('price', min);
          if (max) dbQuery = dbQuery.lte('price', max);
        } else {
          dbQuery = dbQuery.eq('price', value);
        }
      } else if (key === 'sale_model') {
        dbQuery = dbQuery.eq('attributes->>sale_model', value);
      } else if (key === 'fruit_condition') {
        dbQuery = dbQuery.eq('attributes->>fruit_condition', value);
      } else if (key === 'palm_condition') {
        dbQuery = dbQuery.eq('attributes->>palm_condition', value);
      } else if (key === 'seedling_condition') {
        dbQuery = dbQuery.eq('attributes->>seedling_condition', value);
      } else if (key === 'kerb_status') {
        dbQuery = dbQuery.eq('attributes->>kerb_status', value);
      } else if (key === 'takreb_type') {
        dbQuery = dbQuery.eq('attributes->>takreb_type', value);
      } else if (key === 'condition') {
        dbQuery = dbQuery.eq('attributes->>condition', value);
      } else if (key === 'supply_category') {
        dbQuery = dbQuery.eq('attributes->>supply_category', value);
      } else if (key === 'service_branches') {
        dbQuery = dbQuery.contains('attributes->service_branches', [value]);
      } else if (key === 'transport_available') {
        dbQuery = dbQuery.eq('attributes->>transport_available', value === 'true');
      } else if (key === 'provider_type') {
        dbQuery = dbQuery.eq('attributes->>provider_type', value);
      } else if (key === 'residue_type') {
        dbQuery = dbQuery.eq('attributes->>residue_type', value);
      } else if (key === 'loading_readiness') {
        dbQuery = dbQuery.eq('attributes->>loading_readiness', value);
      } else {
        dbQuery = dbQuery.eq(`attributes->>${key}`, value);
      }
    }
  }

  const sort = query.sortBy || 'latest';
  if (sort === 'latest') {
    dbQuery = dbQuery.order('created_at', { ascending: false });
  } else if (sort === 'oldest') {
    dbQuery = dbQuery.order('created_at', { ascending: true });
  } else if (sort === 'price_low') {
    dbQuery = dbQuery.order('price', { ascending: true, nullsFirst: false });
  } else if (sort === 'price_high') {
    dbQuery = dbQuery.order('price', { ascending: false, nullsFirst: true });
  }

  dbQuery = dbQuery.range(from, to);

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data ?? [];
}

export async function getSectorActivityCount(sectorId: string): Promise<number> {
  const { count, error } = await supabase
    .from('network_pulse')
    .select('*', { count: 'exact', head: true })
    .eq('sector_id', sectorId);
  if (error) throw error;
  return count ?? 0;
}

export async function getSpecialtyActivityCount(subSectorId: string): Promise<number> {
  const branchIds = await getSubBranchesBySubSector(subSectorId).then((branches) =>
    branches.map((b) => b.id)
  );
  const allIds = [subSectorId, ...branchIds];
  const { count, error } = await supabase
    .from('network_pulse')
    .select('*', { count: 'exact', head: true })
    .in('sub_sector_id', allIds);
  if (error) throw error;
  return count ?? 0;
}

export async function getPalmVarieties(): Promise<PalmVariety[]> {
  const cached = getCached<PalmVariety[]>('palm_varieties');
  if (cached) return cached;
  const { data, error } = await supabase
    .from('palm_varieties')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  const result = data ?? [];
  setCached('palm_varieties', result);
  return result;
}

export async function getVarietiesBySpecialty(specialtyId: string): Promise<PalmVariety[]> {
  const { data, error } = await supabase
    .from('palm_varieties')
    .select('*')
    .eq('is_active', true)
    .contains('applicable_specialty_ids', [specialtyId])
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getFieldDefinitions(specialtyId: string, operationTypeId: string): Promise<FieldDefinition[]> {
  const cacheKey = `fielddefs:${specialtyId}:${operationTypeId}`;
  const cached = getCached<FieldDefinition[]>(cacheKey);
  if (cached) return cached;
  const { data, error } = await supabase
    .from('specialty_field_definitions')
    .select('*')
    .eq('specialty_id', specialtyId)
    .eq('operation_type_id', operationTypeId)
    .order('display_order', { ascending: true });
  if (error) throw error;
  const result = data ?? [];
  setCached(cacheKey, result);
  return result;
}

export async function getMeasurementUnits(): Promise<MeasurementUnit[]> {
  const cached = getCached<MeasurementUnit[]>('measurement_units');
  if (cached) return cached;
  const { data, error } = await supabase
    .from('measurement_units')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw error;
  const result = data ?? [];
  setCached('measurement_units', result);
  return result;
}

export async function getPalmServiceBranches(): Promise<PalmServiceBranch[]> {
  const cached = getCached<PalmServiceBranch[]>('palm_service_branches');
  if (cached) return cached;
  const { data, error } = await supabase
    .from('palm_service_branches')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  const result = data ?? [];
  setCached('palm_service_branches', result);
  return result;
}

export async function getPalmServiceItems(): Promise<PalmServiceItem[]> {
  const cached = getCached<PalmServiceItem[]>('palm_service_items');
  if (cached) return cached;
  const { data, error } = await supabase
    .from('palm_service_items')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  const result = data ?? [];
  setCached('palm_service_items', result);
  return result;
}

export async function getPalmResidueTypes(): Promise<PalmResidueType[]> {
  const cached = getCached<PalmResidueType[]>('palm_residue_types');
  if (cached) return cached;
  const { data, error } = await supabase
    .from('palm_residue_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  const result = data ?? [];
  setCached('palm_residue_types', result);
  return result;
}

// ── V2 batch loading for Opportunity Card Engine ──────────────────────────

export async function getOpportunityItemsBatch(
  opportunityIds: string[],
): Promise<Record<string, OpportunityItemSummary[]>> {
  if (opportunityIds.length === 0) return {};
  const { data, error } = await supabase
    .from('opportunity_items')
    .select('*')
    .in('opportunity_id', opportunityIds)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) return {};

  const map: Record<string, OpportunityItemSummary[]> = {};
  for (const row of data ?? []) {
    const oppId = row.opportunity_id as string;
    if (!map[oppId]) map[oppId] = [];
    map[oppId].push({
      id: row.id,
      opportunity_id: oppId,
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
    });
  }
  return map;
}

const v2FieldDefsCache = new Map<string, ItemFieldDefinition[]>();

export async function getV2CardFieldDefsBatch(
  sectorId: string,
  operationTypes: string[],
  templateVersion: number,
  subSectorId: string | null,
): Promise<Record<string, ItemFieldDefinition[]>> {
  const result: Record<string, ItemFieldDefinition[]> = {};
  const types = [...new Set(operationTypes.filter(Boolean))];

  for (const opType of types) {
    const cacheKey = `${sectorId}:${subSectorId ?? 'null'}:${opType}:${templateVersion}`;
    if (v2FieldDefsCache.has(cacheKey)) {
      result[opType] = v2FieldDefsCache.get(cacheKey)!;
      continue;
    }

    let query = supabase
      .from('opportunity_item_field_definitions')
      .select('*')
      .eq('sector_id', sectorId)
      .eq('operation_type', opType)
      .eq('template_version', templateVersion)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (subSectorId) {
      query = query.or(`sub_sector_id.is.null,sub_sector_id.eq.${subSectorId}`);
    } else {
      query = query.is('sub_sector_id', null);
    }

    const { data, error } = await query;
    if (!error && data) {
      v2FieldDefsCache.set(cacheKey, data as unknown as ItemFieldDefinition[]);
      result[opType] = data as unknown as ItemFieldDefinition[];
    } else {
      result[opType] = [];
    }
  }
  return result;
}

export async function getSectorLabels(sectorIds: string[]): Promise<Record<string, string>> {
  if (sectorIds.length === 0) return {};
  const { data, error } = await supabase
    .from('sectors')
    .select('id, name')
    .in('id', sectorIds);
  if (error) return {};
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.id] = row.name;
  return map;
}

export async function getPartnershipProfilesBatch(
  opportunityIds: string[],
): Promise<Record<string, PartnershipProfileSummary>> {
  if (opportunityIds.length === 0) return {};
  const { data, error } = await supabase
    .from('partnership_opportunity_profiles')
    .select('*')
    .in('opportunity_id', opportunityIds);
  if (error || !data) return {};
  const map: Record<string, PartnershipProfileSummary> = {};
  for (const row of data) {
    map[row.opportunity_id] = {
      opportunity_id: row.opportunity_id,
      partnership_type: row.partnership_type ?? null,
      project_size: row.project_size ?? null,
      join_deadline: row.join_deadline ?? null,
      required_partners_count: row.required_partners_count ?? null,
      partners_count_mode: row.partners_count_mode ?? null,
      coverage_mode: row.coverage_mode ?? null,
      expected_duration: row.expected_duration ?? null,
      summary: row.summary ?? null,
    };
  }
  return map;
}

export async function getPartnershipRolesBatch(
  opportunityIds: string[],
): Promise<Record<string, PartnershipRoleSummary[]>> {
  if (opportunityIds.length === 0) return {};
  const { data, error } = await supabase
    .from('partnership_roles')
    .select('*')
    .in('opportunity_id', opportunityIds)
    .order('display_order', { ascending: true });
  if (error || !data) return {};
  const map: Record<string, PartnershipRoleSummary[]> = {};
  for (const row of data) {
    const oppId = row.opportunity_id;
    if (!map[oppId]) map[oppId] = [];
    map[oppId].push({
      opportunity_id: oppId,
      role_key: row.role_key,
      role_label_snapshot: row.role_label_snapshot ?? null,
      required_count: row.required_count ?? null,
      display_order: row.display_order ?? 0,
    });
  }
  return map;
}
