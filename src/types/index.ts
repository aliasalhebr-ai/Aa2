export type SectorAction = {
  id: string;
  label: string;
  icon: string;
  is_active?: boolean;
};

export type FilterConfig = {
  key: string;
  label: string;
  type: 'select' | 'range' | 'date';
  displayOrder?: number;
  isActive?: boolean;
  optionsSource?: 'static' | 'variety';
  options?: string[];
  unit?: string;
  // Legacy `id` field — kept for backward compat with old sector filter configs
  id?: string;
};

export type Sector = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
  search_placeholder: string | null;
  available_actions: SectorAction[];
  filter_configuration: FilterConfig[];
  opportunity_template_version: number;
  created_at: string;
};

export type SpecialtyOperation = {
  id: string;
  label: string;
  icon: string;
  is_active?: boolean;
};

export type SubSector = {
  id: string;
  sector_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  allowed_operations: SpecialtyOperation[];
  filter_configuration: FilterConfig[];
  specialty_metadata: Record<string, unknown>;
  created_at: string;
};

export type PalmVariety = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  applicable_specialty_ids: string[];
  created_at: string;
};

export type MeasurementUnit = {
  id: string;
  key: string;
  label: string;
  display_order: number;
};

export type PalmServiceBranch = {
  id: string;
  key: string;
  label: string;
  display_order: number;
  is_active: boolean;
};

export type PalmServiceItem = {
  id: string;
  branch_id: string;
  key: string;
  label: string;
  display_order: number;
  is_active: boolean;
};

export type PalmResidueType = {
  id: string;
  key: string;
  label: string;
  display_order: number;
  is_active: boolean;
};

export type FieldDefinition = {
  id: string;
  specialty_id: string;
  operation_type_id: string;
  field_key: string;
  field_type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea' | 'date' | 'boolean' | 'image' | 'radio';
  label: string;
  is_required: boolean;
  display_order: number;
  is_filterable: boolean;
  is_card_visible: boolean;
  options_source: string | null;
  static_options: string[] | null;
  validation_rules: Record<string, unknown> | null;
  conditional_field_key: string | null;
  conditional_values: string[] | null;
  unit: string | null;
  placeholder: string | null;
  created_at: string;
};

export type VarietyEntry = {
  variety_id: string;
  variety_name: string;
  palm_count: number | null;
  expected_production: string | null;
  production_unit: string | null;
  harvest_date: string | null;
  readiness_status: string | null;
  images: string[];
  description?: string | null;
  quality_grade?: string | null;
  age_years?: number | null;
  irrigation_source?: string | null;
};

export type SeedlingVarietyEntry = {
  variety_id: string;
  variety_name: string;
  seedling_count: number | null;
  min_weight: number | null;
  max_weight: number | null;
  avg_weight: number | null;
  age: number | null;
  age_unit: string | null;
  height: number | null;
  leaf_count: number | null;
  rooting_status: string | null;
  growth_status: string | null;
  planting_ready: string | null;
  price: number | null;
  pricing_type: string | null;
  images: string[];
  description: string | null;
};

export type UprootingVarietyEntry = {
  variety_id: string;
  variety_name: string;
  count: number | null;
  min_height: number | null;
  max_height: number | null;
  trunk_diameter: number | null;
  age_years: number | null;
  readiness_status: string | null;
  health_status: string | null;
  root_status: string | null;
  uprooting_date: string | null;
  price: number | null;
  pricing_type: string | null;
  images: string[];
  description: string | null;
};

export type ProjectVarietyEntry = {
  variety_id: string;
  variety_name: string;
  palm_count: number | null;
  min_height: number | null;
  max_height: number | null;
  height_range: string | null;
  age: number | null;
  trunk_diameter: number | null;
  kerb_status: string | null;
  takreb_type: string | null;
  root_status: string | null;
  readiness_status: string | null;
  unit_price: number | null;
  pricing_type: string | null;
  delivery_date: string | null;
  images: string[];
  description: string | null;
};

export type ProjectInfo = {
  project_name: string | null;
  project_type: string | null;
  requesting_entity: string | null;
  project_location: string | null;
  total_quantity: number | null;
  start_date: string | null;
  execution_duration: string | null;
  offer_deadline: string | null;
  service_scope: string[];
  delivery_schedule: string | null;
  total_price: number | null;
  pricing_type: string | null;
  includes_planting: boolean | null;
  includes_uprooting: boolean | null;
  includes_transport: boolean | null;
  includes_pruning: boolean | null;
  includes_maintenance: boolean | null;
  description: string | null;
};

export type ResidueEntry = {
  residue_type: string;
  residue_label: string | null;
  quantity_method: string | null;
  weight_value: number | null;
  weight_unit: string | null;
  count_value: number | null;
  count_unit: string | null;
  manual_quantity_desc: string | null;
  measurement_accuracy: string | null;
  residue_condition: string | null;
  preparation_form: string | null;
  average_length: number | null;
  length_range: string | null;
  bundle_weight: number | null;
  residue_source: string | null;
  suggested_uses: string[];
  loading_available: boolean | null;
  labor_available: boolean | null;
  equipment_available: boolean | null;
  transport_available: boolean | null;
  truck_access: string | null;
  availability_date: string | null;
  pickup_window: string | null;
  price: number | null;
  pricing_type: string | null;
  images: string[];
  description: string | null;
};

export type SupplyEntry = {
  item_name: string | null;
  category: string;
  category_label: string | null;
  brand: string | null;
  model: string | null;
  condition: string | null;
  quantity: number | null;
  unit: string | null;
  manufacturing_year: number | null;
  country_of_origin: string | null;
  warranty_status: string | null;
  warranty_duration: string | null;
  installation_available: boolean | null;
  maintenance_available: boolean | null;
  spare_parts_available: boolean | null;
  training_available: boolean | null;
  installation_duration: string | null;
  installation_cities: string | null;
  technical_specs: { label: string; value: string }[];
  usage_scope: string | null;
  farm_size_coverage: string | null;
  price: number | null;
  pricing_type: string | null;
  tax_included: boolean | null;
  installation_included: boolean | null;
  transport_available: boolean | null;
  availability_date: string | null;
  images: string[];
  video_url: string | null;
  description: string | null;
};

export type ServiceItemEntry = {
  item_key: string;
  item_label: string;
  price: number | null;
  pricing_type: string | null;
  estimated_duration: string | null;
  worker_count: number | null;
  supervisor_available: boolean | null;
  engineer_available: boolean | null;
  equipment_included: boolean | null;
  materials_included: boolean | null;
  cleanup_included: boolean | null;
  waste_removal_included: boolean | null;
  followup_included: boolean | null;
  minimum_palm_count: number | null;
  daily_capacity: number | null;
  images: string[];
  description: string | null;
};

export type ServiceBranchEntry = {
  branch_key: string;
  branch_label: string;
  items: ServiceItemEntry[];
};

export type ServicePortfolioItem = {
  image_before: string | null;
  image_after: string | null;
  service_type: string | null;
  city: string | null;
  palm_count: number | null;
  duration: string | null;
  description: string | null;
};

export type ServiceEntry = {
  provider_name: string | null;
  provider_type: string | null;
  provider_verified: boolean | null;
  experience_years: number | null;
  completed_projects: number | null;
  average_rating: number | null;
  rating_count: number | null;
  covered_cities: string[];
  coverage_radius: string | null;
  service_branches: ServiceBranchEntry[];
  project_capacity: string | null;
  equipment_list: string[];
  labor_info: string | null;
  worker_count: number | null;
  supervisor_available: boolean | null;
  engineer_available: boolean | null;
  technician_available: boolean | null;
  seasonality: string | null;
  min_work: string | null;
  contract_invoice: boolean | null;
  transport_available: boolean | null;
  transport_method: string | null;
  transport_cities: string | null;
  transport_included: boolean | null;
  availability_status: string | null;
  available_from: string | null;
  working_days: string | null;
  working_hours: string | null;
  safety_certifications: string[];
  licenses: string[];
  portfolio: ServicePortfolioItem[];
  images: string[];
  terms: string | null;
  cancellation_policy: string | null;
  description: string | null;
};

export type ValueSource = 'opportunity' | 'opportunity_item' | 'partnership_profile' | 'partnership_roles' | 'computed';

export type AggregationType = 'first' | 'count' | 'sum' | 'min' | 'max' | 'list_count';

export type ItemFieldDefinition = {
  id: string;
  sector_id: string;
  sub_sector_id: string | null;
  operation_type: string;
  template_version: number;
  field_key: string;
  field_type: 'text' | 'number' | 'select' | 'boolean' | 'date' | 'image';
  label: string;
  is_required: boolean;
  display_order: number;
  is_filterable: boolean;
  is_card_visible: boolean;
  options_source: string | null;
  static_options: string[] | null;
  validation_rules: Record<string, unknown> | null;
  conditional_field_key: string | null;
  conditional_values: string[] | null;
  unit: string | null;
  placeholder: string | null;
  column_name: string | null;
  value_source: ValueSource;
  value_key: string | null;
  aggregation_type: AggregationType | null;
  is_active: boolean;
  created_at: string;
};

export type ItemFieldValue = string | number | boolean | string[];
export type ItemData = Record<string, ItemFieldValue>;

export type FormFieldValue = string | number | boolean | string[] | VarietyEntry[];
export type FormData = Record<string, FormFieldValue>;

export type Company = {
  id: string;
  name: string;
  logo: string | null;
  is_verified: boolean;
  description: string | null;
  city: string | null;
  whatsapp_number: string | null;
  created_at: string;
};

export type PublisherEntity = {
  id: string;
  owner_user_id: string;
  entity_type: 'company' | 'farm' | 'organization' | 'individual' | 'professional';
  name: string;
  description: string | null;
  city: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
};

export type NetworkPulseEvent = {
  id: string;
  activity_type: 'opportunity' | 'auction' | 'product' | 'service' | 'event';
  activity_subtype: string;
  title: string;
  description: string | null;
  image: string | null;
  images: string[] | null;
  city: string | null;
  sector_id: string;
  sub_sector_id: string | null;
  company_id: string;
  quantity: string | null;
  quality: string | null;
  price: string | null;
  auction_status: string | null;
  time_remaining: string | null;
  created_at: string;
  attributes?: Record<string, unknown>;
  template_version?: number;
  opportunity_type?: string | null;
  opportunity_timing?: string | null;
};

export type LogisticsFieldDefinition = {
  id: string;
  sector_id: string;
  source_specialty_id: string | null;
  field_key: string;
  field_type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea' | 'date' | 'boolean' | 'image' | 'radio';
  label: string;
  is_required: boolean;
  display_order: number;
  is_card_visible: boolean;
  options_source: string | null;
  static_options: string[] | null;
  validation_rules: Record<string, unknown> | null;
  conditional_field_key: string | null;
  conditional_values: string[] | null;
  unit: string | null;
  placeholder: string | null;
  created_at: string;
};

export type LogisticsRequestStatus =
  | 'draft' | 'submitted' | 'under_review' | 'available_to_providers'
  | 'offers_received' | 'provider_selected' | 'scheduled' | 'in_progress'
  | 'delivered' | 'completed' | 'cancelled' | 'failed';

export type LogisticsCategory = {
  id: string;
  sector_id: string;
  sub_sector_id: string;
  source_specialty_id: string | null;
  key: string;
  label: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
};

export type SavedLogisticsRequest = {
  id: string;
  sector_id: string;
  sub_sector_id: string;
  source_sector_id: string | null;
  source_specialty_id: string | null;
  logistics_category_id: string | null;
  source_opportunity_id: string | null;
  title: string;
  description: string | null;
  asset_type: string;
  pickup_location: string | null;
  delivery_location: string | null;
  city: string | null;
  quantity: string | null;
  weight: string | null;
  count: number | null;
  height: string | null;
  vehicle_type: string | null;
  needs_crane: boolean;
  needs_loading: boolean;
  needs_unloading: boolean;
  transport_date: string | null;
  images: string[];
  status: LogisticsRequestStatus;
  attributes: Record<string, unknown>;
  publisher_entity_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type LogisticsOfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export type LogisticsOffer = {
  id: string;
  logistics_request_id: string;
  provider_user_id: string;
  provider_entity_id: string | null;
  price: number | null;
  currency: string;
  vehicle_type: string | null;
  estimated_duration: string | null;
  notes: string | null;
  status: LogisticsOfferStatus;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_type: string | null;
  link_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type ServiceOffer = {
  id: string;
  opportunity_id: string;
  provider_user_id: string;
  provider_entity_id: string | null;
  price: number | null;
  currency: string;
  duration: string | null;
  scope: string | null;
  equipment: string | null;
  labor: string | null;
  notes: string | null;
  has_transport: boolean;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
};

export type AuctionRequestStatus =
  | 'draft' | 'submitted' | 'under_review' | 'assigned_to_marketer'
  | 'preparing' | 'ready_to_publish' | 'published' | 'active'
  | 'ended' | 'sold' | 'unsold' | 'cancelled';

export type AuctionRequest = {
  id: string;
  source_sector_id: string;
  source_sub_sector_id: string | null;
  source_opportunity_id: string | null;
  owner_entity_id: string | null;
  asset_type: string | null;
  asset_title: string;
  asset_description: string | null;
  marketer_id: string | null;
  marketer_entity_id: string | null;
  auction_type: string | null;
  start_time: string | null;
  end_time: string | null;
  status: AuctionRequestStatus;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
};

export type SavedOpportunity = {
  id: string;
  title: string;
  description: string | null;
  sector_id: string;
  sub_sector_id: string | null;
  operation_type: string | null;
  type: string;
  quantity: string | null;
  price: string | null;
  city: string | null;
  attributes: Record<string, unknown>;
  images: string[];
  status: string;
  publisher_entity_id: string | null;
  created_by: string | null;
  created_at: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

export type NetworkHomeState = {
  activeSectorId: string | null;
  activeSubSectorId: string | null;
  searchQuery: string;
  activeFilters: Record<string, string>;
  sortBy: string;
};

export type PartnershipType = 'production' | 'supply' | 'project_execution' | 'distribution_expansion';

export type PartnershipRoleCatalogEntry = {
  id: string;
  role_key: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
};

export type PartnershipRole = {
  role_key: string;
  role_label_snapshot: string;
  description?: string;
  required_count?: number | null;
  required_quantity?: number | null;
  unit?: string | null;
  minimum_capacity?: number | null;
  coverage_area?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
  display_order?: number;
};

export type PartnershipProfile = {
  partnership_type: PartnershipType;
  lead_entity_id?: string | null;
  project_size?: string;
  project_location?: string;
  start_date?: string;
  join_deadline?: string;
  required_partners_count?: number;
  summary?: string;
  expected_duration?: string;
  partners_count_mode: 'fixed' | 'open';
  project_value?: number | null;
  project_value_visibility?: boolean;
  participation_terms?: Record<string, unknown>;
  coverage_mode: 'single_partner' | 'multiple_partners' | 'mixed';
  project_phases?: number | null;
  project_sites?: number | null;
  is_splittable?: boolean;
  total_quantity?: number | null;
  total_quantity_unit?: string;
  work_scope?: string;
};

// ── Opportunity Card Engine types ──────────────────────────────────────────

export type CardIndicator = {
  key: string;
  label: string;
  formattedValue: string;
  iconKey: string | null;
  displayOrder: number;
};

export type OpportunityTypeStyle = {
  bg: string;
  text: string;
  dot: string;
};

export type PrimaryCardAction =
  | 'view_details'
  | 'submit_offer'
  | 'view_partnership';

export type OpportunityTypePresentation = {
  type: string;
  label: string;
  style: OpportunityTypeStyle;
  iconKey: string;
  primaryAction: PrimaryCardAction;
  primaryActionLabel: string;
};

export type OpportunityCardViewModel = {
  id: string;
  title: string;
  descriptionPreview: string | null;
  image: string | null;
  opportunityType: string;
  opportunityTypeLabel: string;
  opportunityTypeStyle: OpportunityTypeStyle;
  opportunityTypeIcon: string;
  formatKey: string;
  sectorLabel: string | null;
  subSectorLabel: string | null;
  status: string;
  publishedAt: string;
  publisherName: string | null;
  publisherVerified: boolean;
  location: string | null;
  indicators: CardIndicator[];
  primaryAction: PrimaryCardAction;
  primaryActionLabel: string;
  templateVersion: number;
  sourceOpportunity: NetworkPulseEvent;
};

export type OpportunityItemSummary = {
  id: string;
  opportunity_id: string;
  item_type: string | null;
  reference_source: string | null;
  reference_id: string | null;
  name_snapshot: string | null;
  variety_name_snapshot: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  pricing_type: string | null;
  cover_image: string | null;
  images: string[];
  attributes: Record<string, unknown>;
  age_value: number | null;
  height_value: number | null;
  root_status: string | null;
  readiness_status: string | null;
  container_size: string | null;
  display_order: number;
};

export type PartnershipProfileSummary = {
  opportunity_id: string;
  partnership_type: string | null;
  project_size: string | null;
  join_deadline: string | null;
  required_partners_count: number | null;
  partners_count_mode: string | null;
  coverage_mode: string | null;
  expected_duration: string | null;
  summary: string | null;
};

export type PartnershipRoleSummary = {
  opportunity_id: string;
  role_key: string;
  role_label_snapshot: string | null;
  required_count: number | null;
  display_order: number;
};

export type PartnershipData = {
  profile: PartnershipProfileSummary | null;
  roles: PartnershipRoleSummary[];
};

// ── Opportunity Detail Engine types ───────────────────────────────────────

export type PublisherSummary = {
  id: string;
  name: string;
  entityType: string | null;
  verified: boolean;
  city: string | null;
  logo: string | null;
  isOwner: boolean;
};

export type OpportunityDetailItem = {
  id: string;
  itemType: string | null;
  referenceSource: string | null;
  referenceId: string | null;
  iconKey: string;
  name: string | null;
  varietyName: string | null;
  quantity: number | null;
  unit: string | null;
  minimumQuantity: number | null;
  price: number | null;
  minimumPrice: number | null;
  maximumPrice: number | null;
  pricingType: string | null;
  age: number | null;
  minimumHeight: number | null;
  maximumHeight: number | null;
  heightUnit: string | null;
  trunkDiameter: number | null;
  containerSize: string | null;
  rootStatus: string | null;
  readinessStatus: string | null;
  availableFrom: string | null;
  requiredSupplyDate: string | null;
  images: string[];
  coverImage: string | null;
  notes: string | null;
  specifications: { label: string; value: string }[];
};

export type OfferDetails = {
  availableNow: boolean;
  availableFromDate: string | null;
  isNegotiable: boolean | null;
};

export type DemandDetails = {
  requiredSupplyDate: string | null;
  offerDeadline: string | null;
  isFlexibleTiming: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  includesTransport: boolean;
  includesLoading: boolean;
  includesPlanting: boolean;
  includesIrrigation: boolean;
  includesMaintenance: boolean;
  batchDelivery: boolean;
  batchCount: number | null;
  batchStartDate: string | null;
  batchEndDate: string | null;
  batchFrequency: string | null;
  batchQuantityPerDelivery: number | null;
};

export type PartnershipDetails = {
  partnershipType: string | null;
  leadEntityName: string | null;
  summary: string | null;
  projectLocation: string | null;
  startDate: string | null;
  expectedDuration: string | null;
  joinDeadline: string | null;
  requiredPartnersCount: number | null;
  partnersCountMode: string | null;
  coverageMode: string | null;
  projectSize: string | null;
  projectValue: number | null;
  projectValueVisible: boolean;
  projectSites: number | null;
  projectPhases: number | null;
  isSplittable: boolean;
  roles: PartnershipRoleDetail[];
};

export type PartnershipRoleDetail = {
  roleKey: string;
  roleLabel: string | null;
  description: string | null;
  requiredCount: number | null;
  requiredQuantity: number | null;
  unit: string | null;
  minimumCapacity: number | null;
  coverageArea: string | null;
  requirements: string | null;
  status: string;
};

export type DetailAction = 'chat' | 'whatsapp' | 'edit' | 'close' | 'archive';

export type OpportunityDetailPermissions = {
  canView: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  canClose: boolean;
  canArchive: boolean;
};

export type OpportunityDetailViewModel = {
  id: string;
  title: string;
  fullDescription: string | null;
  opportunityType: string;
  opportunityTypeLabel: string;
  opportunityTypePresentation: OpportunityTypePresentation;
  sectorLabel: string | null;
  subSectorLabel: string | null;
  subSectorSlug: string | null;
  status: string;
  statusLabel: string;
  opportunityTiming: string | null;
  opportunityTimingLabel: string | null;
  createdAt: string;
  publishedAt: string;
  city: string | null;
  location: string | null;
  generalImages: string[];
  items: OpportunityDetailItem[];
  rawItems: OpportunityItemSummary[];
  publisher: PublisherSummary | null;
  offerDetails: OfferDetails | null;
  demandDetails: DemandDetails | null;
  partnershipDetails: PartnershipDetails | null;
  permissions: OpportunityDetailPermissions;
  availableActions: DetailAction[];
  sourceOpportunity: NetworkPulseEvent;
  templateVersion: number;
};
