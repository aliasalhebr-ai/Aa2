// ── Opportunity Discovery Engine Types ──────────────────────────────────────
// Generic types designed for reuse across sectors. Currently activated only
// for nursery (template_version = 2).

export type DiscoverySortOption =
  | 'latest'
  | 'price_low'
  | 'price_high'
  | 'quantity_high'
  | 'quantity_low'
  | 'closing_soon';

export type DiscoveryOpportunityType = 'offer' | 'demand' | 'partnership' | null;

export type DiscoveryTimingFilter =
  | 'available_now'
  | 'future_production'
  | 'scheduled'
  | 'flexible'
  | null;

export type DiscoveryFilterValue = string | number | boolean | null;

export type DiscoveryFilters = {
  opportunityType: DiscoveryOpportunityType;
  subSectorId: string | null;
  city: string | null;
  opportunityTiming: DiscoveryTimingFilter;
  plantId: string | null;
  varietyId: string | null;
  quantityMin: number | null;
  quantityMax: number | null;
  priceMin: number | null;
  priceMax: number | null;
  isVerified: boolean | null;
  // Demand-specific
  supplyDateBefore: string | null;
  includesPlanting: boolean | null;
  includesTransport: boolean | null;
  // Partnership-specific
  partnershipType: string | null;
  partnershipRoleKey: string | null;
  joinDeadlineBefore: string | null;
};

export type DiscoveryQuery = {
  sectorId: string;
  searchQuery: string;
  filters: DiscoveryFilters;
  sort: DiscoverySortOption;
  page: number;
  pageSize: number;
};

export type DiscoveryResult = {
  opportunityIds: string[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type DiscoveryFilterChip = {
  key: string;
  label: string;
  valueLabel: string;
  filterKey: keyof DiscoveryFilters;
};

export type DiscoveryFilterDefinition = {
  key: string;
  label: string;
  type: 'select' | 'range' | 'boolean' | 'date';
  valueSource: 'column' | 'attribute' | 'item_column' | 'rpc';
  valueKey: string;
  operator: 'equals' | 'in' | 'contains' | 'gte' | 'lte' | 'between' | 'date_before' | 'date_after' | 'boolean' | 'exists';
  optionsSource?: 'sub_sectors' | 'plants' | 'varieties' | 'cities' | 'partnership_types' | 'partnership_roles' | 'static';
  staticOptions?: { value: string; label: string }[];
  unit?: string;
  displayOrder: number;
  isActive: boolean;
  applicableTypes?: DiscoveryOpportunityType[];
};

export type PlantSearchResult = {
  id: string;
  arabic_name: string;
  english_name: string | null;
  scientific_name: string | null;
};

export type VarietySearchResult = {
  id: string;
  plant_id: string;
  name_ar: string;
};

export type CityOption = {
  value: string;
  label: string;
};

export type PartnershipRoleOption = {
  role_key: string;
  role_label: string;
};

export type PartnershipTypeOption = {
  value: string;
  label: string;
};
