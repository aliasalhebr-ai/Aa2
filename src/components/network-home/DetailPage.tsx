import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, MapPin, Calendar, BadgeCheck, Clock, ChevronLeft, Check, Truck,
  MessageCircle, Lock,
} from 'lucide-react';
import type { NetworkPulseEvent, Company, FieldDefinition, VarietyEntry, UprootingVarietyEntry, SeedlingVarietyEntry, ProjectVarietyEntry, ProjectInfo, ResidueEntry, SupplyEntry, ServiceEntry, ServiceBranchEntry, ServiceItemEntry } from '@/types';
import {
  getServiceOffers, createServiceOffer,
  acceptServiceOffer, rejectServiceOffer, completeService,
} from '@/services/opportunityService';
import { supabase } from '@/lib/supabase';
import { buildWhatsAppLink } from '@/services/chatService';
import VarietyShowcase from './VarietyShowcase';
import UprootingShowcase from './UprootingShowcase';
import SeedlingShowcase from './SeedlingShowcase';
import ProjectShowcase from './ProjectShowcase';
import ResidueShowcase from './ResidueShowcase';
import SupplyShowcase from './SupplyShowcase';
import ServiceShowcase from './ServiceShowcase';
import ChatPanel from './ChatPanel';
import { formatVariety, formatResidueType } from '@/lib/cardFormatters';

type Props = {
  event: NetworkPulseEvent;
  company?: Company | null;
  fieldDefs?: FieldDefinition[];
  isLoggedIn: boolean;
  onClose: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
};

type Offer = {
  id: string;
  provider_user_id: string;
  price: number | null;
  currency: string;
  duration: string | null;
  scope: string | null;
  equipment: string | null;
  labor: string | null;
  notes: string | null;
  has_transport: boolean;
  status: string;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'منذ لحظات';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
  return new Date(dateStr).toLocaleDateString('ar-EG');
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  pending_review: 'قيد المراجعة',
  active: 'نشط',
  rejected: 'مرفوض',
  completed: 'مكتمل',
  in_progress: 'قيد التنفيذ',
};

export default function DetailPage({ event, company, fieldDefs: _fieldDefs, isLoggedIn, onClose, onToast }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerDuration, setOfferDuration] = useState('');
  const [offerScope, setOfferScope] = useState('');
  const [offerEquipment, setOfferEquipment] = useState('');
  const [offerLabor, setOfferLabor] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [offerHasTransport, setOfferHasTransport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [oppStatus, setOppStatus] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [subSectorSlug, setSubSectorSlug] = useState<string | null>(null);

  const isOpportunity = event.activity_type === 'opportunity';
  const isServiceRequest = event.activity_subtype === 'service_request' || event.activity_subtype === 'request';
  const isOwner = currentUserId && company?.id === event.company_id;

  const varieties: VarietyEntry[] = useMemo(() => {
    if (!event.attributes) return [];
    const attrs = event.attributes as Record<string, unknown>;
    const raw = attrs['varieties'];
    if (Array.isArray(raw) && raw.length > 0) return raw as VarietyEntry[];

    // ── Convert flat by_kilo / demand attributes into a synthetic variety ──
    const varietyId = (attrs['variety_kilo'] ?? attrs['variety']) as string | undefined;
    if (!varietyId) return [];
    const unit = (attrs['unit_of_measure'] as string) ?? 'ton';
    const qty = (attrs['quantity_available'] ?? attrs['quantity_needed']) as string | undefined;
    const fruitCondition = attrs['fruit_condition'] as string | undefined;
    const priceKilo = attrs['price_kilo'] as string | undefined;

    const synthetic: VarietyEntry = {
      variety_id: varietyId,
      variety_name: varietyId,
      palm_count: null,
      expected_production: qty ?? null,
      production_unit: unit,
      harvest_date: null,
      readiness_status: null,
      images: [],
      description: fruitCondition ? `حالة الثمار: ${fruitCondition}` : null,
      quality_grade: null,
      age_years: null,
      irrigation_source: null,
    };
    // Stash price_kilo so VarietyShowcase can display it if needed
    (synthetic as VarietyEntry & { price_kilo?: string }).price_kilo = priceKilo ?? undefined;
    return [synthetic];
  }, [event.attributes]);
  const totalPalms = useMemo(() => varieties.reduce((s, v) => s + (v.palm_count ?? 0), 0), [varieties]);
  const totalProduction = useMemo(() => {
    const total = varieties.reduce((s, v) => {
      const n = parseFloat(v.expected_production ?? '');
      return s + (isNaN(n) ? 0 : n);
    }, 0);
    return total > 0 ? total : null;
  }, [varieties]);
  const saleModel = event.attributes?.['sale_model'] as string | undefined;

  // ── Resolve sub-sector slug to detect palm uprooting ──
  useEffect(() => {
    if (!event.sub_sector_id) { setSubSectorSlug(null); return; }
    let cancelled = false;
    supabase.from('sub_sectors').select('slug').eq('id', event.sub_sector_id).maybeSingle().then(({ data }) => {
      if (!cancelled) setSubSectorSlug(data?.slug ?? null);
    });
    return () => { cancelled = true; };
  }, [event.sub_sector_id]);

  const isUprooting = subSectorSlug === 'transplanted-palms';
  const isSeedling = subSectorSlug === 'palm-seedlings';
  const isProject = subSectorSlug === 'palm-projects';
  const isResidue = subSectorSlug === 'palm-residues';
  const isSupply = subSectorSlug === 'palm-supplies';
  const isService = subSectorSlug === 'palm-services';

  // ── Build uprooting varieties from flat attributes ──
  const uprootingVarieties: UprootingVarietyEntry[] = useMemo(() => {
    if (!isUprooting || !event.attributes) return [];
    const attrs = event.attributes as Record<string, unknown>;

    // If a structured `varieties` array exists, use it directly
    const raw = attrs['varieties'];
    if (Array.isArray(raw) && raw.length > 0) return raw as UprootingVarietyEntry[];

    // Otherwise, convert flat attributes into a single synthetic variety
    const varietySlug = attrs['variety'] as string | undefined;
    if (!varietySlug) return [];
    const varietyName = formatVariety(varietySlug);
    const count = attrs['count'] != null ? Number(attrs['count']) : null;
    const trunkHeight = attrs['trunk_height'] != null ? Number(attrs['trunk_height']) : null;
    const totalHeight = attrs['total_height'] != null ? Number(attrs['total_height']) : null;
    const minTrunk = attrs['min_trunk_height'] != null ? Number(attrs['min_trunk_height']) : null;
    const maxTrunk = attrs['max_trunk_height'] != null ? Number(attrs['max_trunk_height']) : null;
    const trunkDiameter = attrs['trunk_diameter'] != null ? Number(attrs['trunk_diameter']) : null;
    const ageYears = attrs['age_years'] != null ? Number(attrs['age_years']) : null;
    const readiness = (attrs['uprooting_readiness'] ?? attrs['readiness_status']) as string | undefined;
    const palmCondition = attrs['palm_condition'] as string | undefined;
    const rootStatus = attrs['root_status'] as string | undefined;
    const uprootingDate = (attrs['uprooting_date'] ?? attrs['availability_date'] ?? attrs['transport_date']) as string | undefined;
    const priceVal = attrs['price'] != null ? Number(attrs['price']) : null;
    const pricingType = (attrs['price_or_quote'] ?? attrs['pricing_type']) as string | undefined;
    const images = Array.isArray(attrs['images']) ? attrs['images'] as string[] : [];
    const description = (attrs['description'] ?? attrs['palm_condition']) as string | undefined;

    // For demand: min/max trunk height; for offer: trunk_height (single value → min only)
    const minHeight = minTrunk ?? trunkHeight;
    const maxHeight = maxTrunk ?? totalHeight ?? trunkHeight;

    return [{
      variety_id: varietySlug,
      variety_name: varietyName,
      count: count != null && Number.isFinite(count) ? count : null,
      min_height: minHeight != null && Number.isFinite(minHeight) ? minHeight : null,
      max_height: maxHeight != null && Number.isFinite(maxHeight) ? maxHeight : null,
      trunk_diameter: trunkDiameter != null && Number.isFinite(trunkDiameter) ? trunkDiameter : null,
      age_years: ageYears != null && Number.isFinite(ageYears) ? ageYears : null,
      readiness_status: readiness ?? null,
      health_status: palmCondition ?? null,
      root_status: rootStatus ?? null,
      uprooting_date: uprootingDate ?? null,
      price: priceVal != null && Number.isFinite(priceVal) ? priceVal : null,
      pricing_type: pricingType ?? null,
      images,
      description: description ?? null,
    }];
  }, [isUprooting, event.attributes]);

  const totalUprootingCount = useMemo(() =>
    uprootingVarieties.reduce((s, v) => s + (v.count ?? 0), 0),
  [uprootingVarieties]);

  // ── Build seedling varieties from flat attributes ──
  const seedlingVarieties: SeedlingVarietyEntry[] = useMemo(() => {
    if (!isSeedling || !event.attributes) return [];
    const attrs = event.attributes as Record<string, unknown>;

    // If a structured `varieties` array exists, use it directly
    const raw = attrs['varieties'];
    if (Array.isArray(raw) && raw.length > 0) return raw as SeedlingVarietyEntry[];

    // Otherwise, convert flat attributes into a single synthetic variety
    const varietySlug = attrs['variety'] as string | undefined;
    if (!varietySlug) return [];
    const varietyName = formatVariety(varietySlug);
    const count = attrs['count'] != null ? Number(attrs['count']) : null;
    const minWeight = attrs['min_weight'] != null ? Number(attrs['min_weight']) : null;
    const maxWeight = attrs['max_weight'] != null ? Number(attrs['max_weight']) : null;
    const avgWeight = attrs['avg_weight'] != null ? Number(attrs['avg_weight']) : null;
    const age = attrs['age'] != null ? Number(attrs['age']) : null;
    const ageUnit = (attrs['age_unit'] ?? 'year') as string | undefined;
    const height = attrs['height'] != null ? Number(attrs['height']) : null;
    const leafCount = attrs['leaf_count'] != null ? Number(attrs['leaf_count']) : null;
    const rootingStatus = (attrs['rooting_status'] ?? attrs['root_status']) as string | undefined;
    const growthStatus = (attrs['growth_status'] ?? attrs['seedling_condition']) as string | undefined;
    const plantingReady = (attrs['planting_ready'] ?? attrs['planting_readiness']) as string | undefined;
    const priceVal = attrs['price'] != null ? Number(attrs['price']) : null;
    const pricingType = (attrs['price_or_quote'] ?? attrs['pricing_type']) as string | undefined;
    const images = Array.isArray(attrs['images']) ? attrs['images'] as string[] : [];
    const description = attrs['description'] as string | undefined;

    return [{
      variety_id: varietySlug,
      variety_name: varietyName,
      seedling_count: count != null && Number.isFinite(count) ? count : null,
      min_weight: minWeight != null && Number.isFinite(minWeight) ? minWeight : null,
      max_weight: maxWeight != null && Number.isFinite(maxWeight) ? maxWeight : null,
      avg_weight: avgWeight != null && Number.isFinite(avgWeight) ? avgWeight : null,
      age: age != null && Number.isFinite(age) ? age : null,
      age_unit: ageUnit ?? null,
      height: height != null && Number.isFinite(height) ? height : null,
      leaf_count: leafCount != null && Number.isFinite(leafCount) ? leafCount : null,
      rooting_status: rootingStatus ?? null,
      growth_status: growthStatus ?? null,
      planting_ready: plantingReady ?? null,
      price: priceVal != null && Number.isFinite(priceVal) ? priceVal : null,
      pricing_type: pricingType ?? null,
      images,
      description: description ?? null,
    }];
  }, [isSeedling, event.attributes]);

  const totalSeedlingCount = useMemo(() =>
    seedlingVarieties.reduce((s, v) => s + (v.seedling_count ?? 0), 0),
  [seedlingVarieties]);

  // ── Build project varieties from flat attributes ──
  const projectVarieties: ProjectVarietyEntry[] = useMemo(() => {
    if (!isProject || !event.attributes) return [];
    const attrs = event.attributes as Record<string, unknown>;

    const raw = attrs['varieties'];
    if (Array.isArray(raw) && raw.length > 0) return raw as ProjectVarietyEntry[];

    const varietySlug = attrs['variety'] as string | undefined;
    if (!varietySlug) return [];
    const varietyName = formatVariety(varietySlug);
    const treeCount = attrs['tree_count'] != null ? Number(attrs['tree_count']) : null;
    const trunkHeight = attrs['trunk_height'] != null ? Number(attrs['trunk_height']) : null;
    const heightRange = attrs['height_range'] as string | undefined;
    const minTrunk = attrs['min_height'] != null ? Number(attrs['min_height']) : null;
    const maxTrunk = attrs['max_height'] != null ? Number(attrs['max_height']) : null;
    const age = attrs['age'] != null ? Number(attrs['age']) : null;
    const trunkDiameter = attrs['trunk_diameter'] != null ? Number(attrs['trunk_diameter']) : null;
    const kerbStatus = attrs['kerb_status'] as string | undefined;
    const takrebType = attrs['takreb_type'] as string | undefined;
    const rootStatus = (attrs['root_status'] ?? attrs['root_condition']) as string | undefined;
    const readinessStatus = (attrs['readiness_status'] ?? attrs['uprooting_readiness']) as string | undefined;
    const priceVal = attrs['price'] != null ? Number(attrs['price']) : null;
    const pricingType = (attrs['price_or_quote'] ?? attrs['pricing_type']) as string | undefined;
    const deliveryDate = (attrs['delivery_date'] ?? attrs['execution_date']) as string | undefined;
    const images = Array.isArray(attrs['images']) ? attrs['images'] as string[] : [];
    const description = (attrs['description'] ?? attrs['project_specs']) as string | undefined;

    return [{
      variety_id: varietySlug,
      variety_name: varietyName,
      palm_count: treeCount != null && Number.isFinite(treeCount) ? treeCount : null,
      min_height: minTrunk ?? trunkHeight,
      max_height: maxTrunk ?? trunkHeight,
      height_range: heightRange ?? null,
      age: age != null && Number.isFinite(age) ? age : null,
      trunk_diameter: trunkDiameter != null && Number.isFinite(trunkDiameter) ? trunkDiameter : null,
      kerb_status: kerbStatus ?? null,
      takreb_type: takrebType ?? null,
      root_status: rootStatus ?? null,
      readiness_status: readinessStatus ?? null,
      unit_price: priceVal != null && Number.isFinite(priceVal) ? priceVal : null,
      pricing_type: pricingType ?? null,
      delivery_date: deliveryDate ?? null,
      images,
      description: description ?? null,
    }];
  }, [isProject, event.attributes]);

  const totalProjectCount = useMemo(() =>
    projectVarieties.reduce((s, v) => s + (v.palm_count ?? 0), 0),
  [projectVarieties]);

  // ── Build project info from flat attributes ──
  const projectInfo: ProjectInfo | null = useMemo(() => {
    if (!isProject || !event.attributes) return null;
    const attrs = event.attributes as Record<string, unknown>;
    const serviceName = (attrs['service_scope'] ?? attrs['services']) as string | string[] | undefined;
    const scope = Array.isArray(serviceName) ? serviceName : serviceName ? [serviceName] : [];
    const totalPrice = attrs['total_price'] != null ? Number(attrs['total_price']) : null;
    const pricingType = (attrs['price_or_quote'] ?? attrs['pricing_type']) as string | undefined;

    return {
      project_name: (attrs['project_name'] ?? event.title) as string | null,
      project_type: attrs['project_type'] as string | null,
      requesting_entity: (attrs['requesting_entity'] ?? attrs['contact_info']) as string | null,
      project_location: (attrs['project_location'] ?? attrs['location'] ?? event.city) as string | null,
      total_quantity: attrs['quantity_needed'] != null ? Number(attrs['quantity_needed']) : attrs['tree_count'] != null ? Number(attrs['tree_count']) : null,
      start_date: (attrs['start_date'] ?? attrs['execution_date']) as string | null,
      execution_duration: attrs['execution_duration'] as string | null,
      offer_deadline: attrs['offer_deadline'] as string | null,
      service_scope: scope,
      delivery_schedule: (attrs['delivery_schedule'] ?? attrs['delivery_date']) as string | null,
      total_price: totalPrice != null && Number.isFinite(totalPrice) ? totalPrice : null,
      pricing_type: pricingType ?? null,
      includes_planting: attrs['includes_planting'] != null ? Boolean(attrs['includes_planting']) : (attrs['planting_capability'] != null ? Boolean(attrs['planting_capability']) : null),
      includes_uprooting: attrs['includes_uprooting'] != null ? Boolean(attrs['includes_uprooting']) : null,
      includes_transport: attrs['includes_transport'] != null ? Boolean(attrs['includes_transport']) : (attrs['logistics_available'] != null ? Boolean(attrs['logistics_available']) : null),
      includes_pruning: attrs['includes_pruning'] != null ? Boolean(attrs['includes_pruning']) : null,
      includes_maintenance: attrs['includes_maintenance'] != null ? Boolean(attrs['includes_maintenance']) : null,
      description: (attrs['project_description'] ?? attrs['description']) as string | null,
    };
  }, [isProject, event.attributes, event.title, event.city]);

  // ── Build residue entries from flat attributes ──
  const residueEntries: ResidueEntry[] = useMemo(() => {
    if (!isResidue || !event.attributes) return [];
    const attrs = event.attributes as Record<string, unknown>;

    // If a structured `residues` array exists, use it directly
    const raw = attrs['residues'];
    if (Array.isArray(raw) && raw.length > 0) return raw as ResidueEntry[];

    // Otherwise, convert flat attributes into a single synthetic residue entry
    const residueType = attrs['residue_type'] as string | undefined;
    if (!residueType) return [];
    const quantityMethod = (attrs['quantity_method'] ?? 'weight') as string | undefined;
    const weightValue = attrs['weight_value'] != null ? Number(attrs['weight_value']) : null;
    const weightUnit = (attrs['weight_unit'] ?? 'ton') as string | undefined;
    const countValue = attrs['count_value'] != null ? Number(attrs['count_value']) : null;
    const countUnit = (attrs['count_unit'] ?? 'piece') as string | undefined;
    const manualDesc = attrs['manual_quantity_desc'] as string | undefined;
    const measurementAccuracy = (attrs['measurement_accuracy'] ?? attrs['weight_accuracy']) as string | undefined;
    const condition = (attrs['residue_condition'] ?? attrs['material_condition']) as string | undefined;
    const preparationForm = (attrs['preparation_form'] ?? attrs['preparation']) as string | undefined;
    const avgLength = attrs['average_length'] != null ? Number(attrs['average_length']) : null;
    const lengthRange = attrs['length_range'] as string | undefined;
    const bundleWeight = attrs['bundle_weight'] != null ? Number(attrs['bundle_weight']) : null;
    const residueSource = (attrs['residue_source'] ?? attrs['source']) as string | undefined;
    const rawUses = attrs['suggested_uses'];
    const uses = Array.isArray(rawUses) ? rawUses as string[] : rawUses ? [String(rawUses)] : [];
    const loadingAvailable = attrs['loading_available'] != null ? Boolean(attrs['loading_available']) : (attrs['loading_readiness'] === 'جاهز' ? true : attrs['loading_readiness'] === 'غير جاهز' ? false : null);
    const laborAvailable = attrs['labor_available'] != null ? Boolean(attrs['labor_available']) : null;
    const equipmentAvailable = attrs['equipment_available'] != null ? Boolean(attrs['equipment_available']) : null;
    const transportAvailable = (attrs['transport_available'] ?? attrs['logistics_available']) != null ? Boolean(attrs['transport_available'] ?? attrs['logistics_available']) : null;
    const truckAccess = attrs['truck_access'] as string | undefined;
    const availabilityDate = (attrs['availability_date'] ?? attrs['pickup_date']) as string | undefined;
    const pickupWindow = attrs['pickup_window'] as string | undefined;
    const priceVal = attrs['price'] != null ? Number(attrs['price']) : null;
    const pricingType = (attrs['price_or_quote'] ?? attrs['pricing_type']) as string | undefined;
    const images = Array.isArray(attrs['images']) ? attrs['images'] as string[] : [];
    const description = attrs['description'] as string | undefined;

    return [{
      residue_type: residueType,
      residue_label: formatResidueType(residueType),
      quantity_method: quantityMethod ?? null,
      weight_value: weightValue != null && Number.isFinite(weightValue) ? weightValue : null,
      weight_unit: weightUnit ?? null,
      count_value: countValue != null && Number.isFinite(countValue) ? countValue : null,
      count_unit: countUnit ?? null,
      manual_quantity_desc: manualDesc ?? null,
      measurement_accuracy: measurementAccuracy ?? null,
      residue_condition: condition ?? null,
      preparation_form: preparationForm ?? null,
      average_length: avgLength != null && Number.isFinite(avgLength) ? avgLength : null,
      length_range: lengthRange ?? null,
      bundle_weight: bundleWeight != null && Number.isFinite(bundleWeight) ? bundleWeight : null,
      residue_source: residueSource ?? null,
      suggested_uses: uses,
      loading_available: loadingAvailable,
      labor_available: laborAvailable,
      equipment_available: equipmentAvailable,
      transport_available: transportAvailable,
      truck_access: truckAccess ?? null,
      availability_date: availabilityDate ?? null,
      pickup_window: pickupWindow ?? null,
      price: priceVal != null && Number.isFinite(priceVal) ? priceVal : null,
      pricing_type: pricingType ?? null,
      images,
      description: description ?? null,
    }];
  }, [isResidue, event.attributes]);

  // ── Build supply entries from flat attributes ──
  const supplyEntries: SupplyEntry[] = useMemo(() => {
    if (!isSupply || !event.attributes) return [];
    const attrs = event.attributes as Record<string, unknown>;

    // If a structured `supplies` array exists, use it directly
    const raw = attrs['supplies'];
    if (Array.isArray(raw) && raw.length > 0) return raw as SupplyEntry[];

    // Otherwise, convert flat attributes into a single synthetic supply entry
    const category = (attrs['supply_category'] ?? attrs['category']) as string | undefined;
    if (!category) return [];
    const quantity = attrs['quantity'] != null ? Number(attrs['quantity']) : null;
    const unit = (attrs['unit_of_measure'] ?? attrs['unit']) as string | undefined;
    const condition = (attrs['condition'] ?? attrs['item_condition']) as string | undefined;
    const brand = attrs['brand'] as string | undefined;
    const model = attrs['model'] as string | undefined;
    const supplyType = attrs['supply_type'] as string | undefined;
    const warranty = (attrs['warranty'] ?? attrs['warranty_status']) as string | undefined;
    const usageRange = (attrs['usage_range'] ?? attrs['usage_scope']) as string | undefined;
    const farmSizeCoverage = (attrs['farm_size_coverage'] ?? attrs['farm_coverage']) as string | undefined;
    const priceVal = attrs['price'] != null ? Number(attrs['price']) : null;
    const pricingType = (attrs['price_or_quote'] ?? attrs['pricing_type']) as string | undefined;
    const installationAvailable = attrs['installation_available'] != null ? Boolean(attrs['installation_available']) : null;
    const supplyIncluded = attrs['supply_included'] != null ? Boolean(attrs['supply_included']) : null;
    const transportAvailable = (attrs['transport_available'] ?? attrs['logistics_available']) != null ? Boolean(attrs['transport_available'] ?? attrs['logistics_available']) : null;
    const images = Array.isArray(attrs['images']) ? attrs['images'] as string[] : [];
    const description = (attrs['description'] ?? attrs['supply_description']) as string | undefined;

    return [{
      item_name: (supplyType ?? attrs['title'] ?? null) as string | null,
      category,
      category_label: null,
      brand: brand ?? null,
      model: model ?? null,
      condition: condition ?? null,
      quantity: quantity != null && Number.isFinite(quantity) ? quantity : null,
      unit: unit ?? null,
      manufacturing_year: null,
      country_of_origin: null,
      warranty_status: warranty ?? null,
      warranty_duration: null,
      installation_available: installationAvailable,
      maintenance_available: null,
      spare_parts_available: null,
      training_available: null,
      installation_duration: null,
      installation_cities: null,
      technical_specs: [],
      usage_scope: usageRange ?? null,
      farm_size_coverage: farmSizeCoverage ?? null,
      price: priceVal != null && Number.isFinite(priceVal) ? priceVal : null,
      pricing_type: pricingType ?? null,
      tax_included: null,
      installation_included: supplyIncluded,
      transport_available: transportAvailable,
      availability_date: null,
      images,
      video_url: null,
      description: description ?? null,
    }];
  }, [isSupply, event.attributes]);

  // ── Build service entry from flat attributes (service_offer or service_request) ──
  const serviceEntry: ServiceEntry | null = useMemo(() => {
    if (!isService || !event.attributes) return null;
    const attrs = event.attributes as Record<string, unknown>;

    // If a structured `service` object exists, use it directly
    const raw = attrs['service'];
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as ServiceEntry;

    // Otherwise, convert flat attributes into a structured ServiceEntry
    const serviceBranchKeys = Array.isArray(attrs['service_branches']) ? attrs['service_branches'] as string[] : [];
    const serviceItemKeys = Array.isArray(attrs['service_items']) ? attrs['service_items'] as string[] : [];
    const coveredCities = Array.isArray(attrs['coverage_areas']) ? attrs['coverage_areas'] as string[] : [];
    const equipmentList = Array.isArray(attrs['equipment_list']) ? attrs['equipment_list'] as string[] : [];
    const safetyCerts = Array.isArray(attrs['safety_certifications']) ? attrs['safety_certifications'] as string[] : [];
    const licenses = Array.isArray(attrs['licenses']) ? attrs['licenses'] as string[] : [];
    const images = Array.isArray(attrs['images']) ? attrs['images'] as string[] : [];

    // Build branches with items grouped by branch_key
    const branches: ServiceBranchEntry[] = serviceBranchKeys.map((branchKey) => {
      // Items that belong to this branch (from the flat service_items list)
      // Since we don't have branch_id mapping in flat attrs, assign all items to their branch
      // via known mapping (best-effort: all items go under their branch if only one branch)
      const items: ServiceItemEntry[] = serviceItemKeys.map((itemKey) => ({
        item_key: itemKey,
        item_label: itemKey, // Will be formatted by catalog lookup in showcase
        price: attrs['price'] != null ? Number(attrs['price']) : null,
        pricing_type: (attrs['pricing_type'] ?? attrs['price_or_quote']) as string | null,
        estimated_duration: (attrs['expected_duration'] ?? attrs['estimated_duration']) as string | null,
        worker_count: attrs['worker_count'] != null ? Number(attrs['worker_count']) : null,
        supervisor_available: attrs['supervisor_available'] != null ? Boolean(attrs['supervisor_available']) : null,
        engineer_available: attrs['engineer_available'] != null ? Boolean(attrs['engineer_available']) : null,
        equipment_included: attrs['equipment_available'] != null ? Boolean(attrs['equipment_available']) : null,
        materials_included: attrs['materials_included'] != null ? Boolean(attrs['materials_included']) : null,
        cleanup_included: attrs['cleanup_included'] != null ? Boolean(attrs['cleanup_included']) : null,
        waste_removal_included: attrs['waste_removal_included'] != null ? Boolean(attrs['waste_removal_included']) : null,
        followup_included: attrs['followup_included'] != null ? Boolean(attrs['followup_included']) : null,
        minimum_palm_count: attrs['minimum_palm_count'] != null ? Number(attrs['minimum_palm_count']) : null,
        daily_capacity: attrs['daily_capacity'] != null ? Number(attrs['daily_capacity']) : null,
        images: [],
        description: (attrs['description'] ?? attrs['service_description']) as string | null,
      }));
      return {
        branch_key: branchKey,
        branch_label: branchKey, // Will be formatted by catalog lookup in showcase
        items,
      };
    });

    return {
      provider_name: (attrs['provider_name'] ?? null) as string | null,
      provider_type: (attrs['provider_type'] ?? null) as string | null,
      provider_verified: attrs['provider_verified'] != null ? Boolean(attrs['provider_verified']) : null,
      experience_years: attrs['experience_years'] != null ? Number(attrs['experience_years']) : null,
      completed_projects: attrs['completed_projects'] != null ? Number(attrs['completed_projects']) : null,
      average_rating: attrs['average_rating'] != null ? Number(attrs['average_rating']) : null,
      rating_count: attrs['rating_count'] != null ? Number(attrs['rating_count']) : null,
      covered_cities: coveredCities,
      coverage_radius: (attrs['coverage_radius'] ?? null) as string | null,
      service_branches: branches,
      project_capacity: (attrs['project_capacity'] ?? null) as string | null,
      equipment_list: equipmentList,
      labor_info: (attrs['labor_available'] ?? null) as string | null,
      worker_count: attrs['worker_count'] != null ? Number(attrs['worker_count']) : null,
      supervisor_available: attrs['supervisor_available'] != null ? Boolean(attrs['supervisor_available']) : null,
      engineer_available: attrs['engineer_available'] != null ? Boolean(attrs['engineer_available']) : null,
      technician_available: attrs['technician_available'] != null ? Boolean(attrs['technician_available']) : null,
      seasonality: (attrs['seasonality'] ?? null) as string | null,
      min_work: (attrs['min_work'] ?? null) as string | null,
      contract_invoice: attrs['contract_invoice'] != null ? Boolean(attrs['contract_invoice']) : null,
      transport_available: attrs['transport_available'] != null ? Boolean(attrs['transport_available']) : null,
      transport_method: (attrs['transport_method'] ?? null) as string | null,
      transport_cities: (attrs['transport_cities'] ?? null) as string | null,
      transport_included: attrs['transport_included'] != null ? Boolean(attrs['transport_included']) : null,
      availability_status: (attrs['availability_status'] ?? null) as string | null,
      available_from: (attrs['available_from'] ?? null) as string | null,
      working_days: (attrs['working_days'] ?? null) as string | null,
      working_hours: (attrs['working_hours'] ?? null) as string | null,
      safety_certifications: safetyCerts,
      licenses: licenses,
      portfolio: Array.isArray(attrs['portfolio']) ? attrs['portfolio'] as ServiceEntry['portfolio'] : [],
      images,
      terms: (attrs['terms'] ?? null) as string | null,
      cancellation_policy: (attrs['cancellation_policy'] ?? null) as string | null,
      description: (attrs['description'] ?? null) as string | null,
    };
  }, [isService, event.attributes]);

  useEffect(() => {
    if (!isLoggedIn) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, [isLoggedIn]);

  const loadOffers = useCallback(async () => {
    if (!isServiceRequest) return;
    setLoadingOffers(true);
    try {
      const data = await getServiceOffers(event.id);
      setOffers(data as Offer[]);
    } catch { /* ignore */ }
    finally { setLoadingOffers(false); }
  }, [event.id, isServiceRequest]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    if (!isOpportunity) return;
    supabase.from('opportunities').select('status').eq('id', event.id).maybeSingle().then(({ data }) => {
      if (data) setOppStatus(data.status);
    });
  }, [event.id, isOpportunity]);

  const handleCompleteService = useCallback(async () => {
    try {
      await completeService(event.id);
      onToast('تم إكمال الخدمة', 'success');
      setOppStatus('completed');
      loadOffers();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل إكمال الخدمة', 'error');
    }
  }, [event.id, onToast, loadOffers]);

  const handleSubmitOffer = useCallback(async () => {
    if (!offerPrice) {
      onToast('السعر مطلوب', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createServiceOffer({
        opportunityId: event.id,
        price: Number(offerPrice),
        duration: offerDuration || null,
        scope: offerScope || null,
        equipment: offerEquipment || null,
        labor: offerLabor || null,
        notes: offerNotes || null,
        hasTransport: offerHasTransport,
      });
      onToast('تم تقديم العرض بنجاح', 'success');
      setShowOfferForm(false);
      setOfferPrice('');
      setOfferDuration('');
      setOfferScope('');
      setOfferEquipment('');
      setOfferLabor('');
      setOfferNotes('');
      setOfferHasTransport(false);
      loadOffers();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل تقديم العرض', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [event.id, offerPrice, offerDuration, offerScope, offerEquipment, offerLabor, offerNotes, offerHasTransport, onToast, loadOffers]);

  const handleAcceptOffer = useCallback(async (offerId: string) => {
    try {
      await acceptServiceOffer(offerId);
      onToast('تم قبول العرض', 'success');
      loadOffers();
    } catch {
      onToast('فشل قبول العرض', 'error');
    }
  }, [onToast, loadOffers]);

  const handleRejectOffer = useCallback(async (offerId: string) => {
    try {
      await rejectServiceOffer(offerId);
      onToast('تم رفض العرض', 'success');
      loadOffers();
    } catch {
      onToast('فشل رفض العرض', 'error');
    }
  }, [onToast, loadOffers]);

  const statusLabel = oppStatus ? (STATUS_LABELS[oppStatus] ?? oppStatus) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-start justify-center p-0 sm:p-4 pointer-events-none">
        <div className="bg-white rounded-none sm:rounded-3xl shadow-float w-full max-w-2xl max-h-[100vh] sm:max-h-[90vh] overflow-y-auto fancy-scroll pointer-events-auto animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
            <button onClick={onClose} className="flex items-center gap-1 text-sm text-gray-500 hover:text-siwar-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
              رجوع
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Operation type badge */}
            {event.activity_subtype && (
              <div className="inline-flex px-3 py-1 bg-siwar-50 rounded-full border border-siwar-100">
                <span className="text-xs font-bold text-siwar-700">{event.activity_subtype}</span>
              </div>
            )}

            {/* Title */}
            <h2 className="text-lg font-bold text-gray-800">{event.title}</h2>

            {/* General info */}
            <div className="flex flex-wrap gap-2">
              {event.city && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">{event.city}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">{new Date(event.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">{timeAgo(event.created_at)}</span>
              </div>
              {statusLabel && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-siwar-50 rounded-lg border border-siwar-100">
                  <span className="text-xs font-bold text-siwar-700">{statusLabel}</span>
                </div>
              )}
            </div>

            {/* Publisher entity */}
            {company && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-l from-siwar-50 to-white rounded-xl border border-siwar-100">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-100 icon-3d text-lg">
                  {company.logo || '🏢'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-800">{company.name}</span>
                    {company.is_verified && (
                      <BadgeCheck className="w-4 h-4 text-siwar-600" fill="currentColor" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">الجهة الناشرة</p>
                </div>
              </div>
            )}

            {/* ── Palm services (خدمات النخيل) section — branch slider + service selector + detail ── */}
            {isService && serviceEntry ? (
              <ServiceShowcase
                service={serviceEntry}
                operationType={event.activity_subtype}
                location={event.city}
              />
            ) : isSupply && supplyEntries.length > 0 ? (
              <SupplyShowcase
                supplies={supplyEntries}
                location={event.city}
              />
            ) : isResidue && residueEntries.length > 0 ? (
              <ResidueShowcase
                residues={residueEntries}
                location={event.city}
              />
            ) : isProject && projectVarieties.length > 0 ? (
              <ProjectShowcase
                varieties={projectVarieties}
                totalCount={totalProjectCount}
                projectInfo={projectInfo}
                operationType={event.activity_subtype}
                location={event.city}
              />
            ) : isSeedling && seedlingVarieties.length > 0 ? (
              <SeedlingShowcase
                varieties={seedlingVarieties}
                totalCount={totalSeedlingCount}
                operationType={event.activity_subtype}
                location={event.city}
              />
            ) : isUprooting && uprootingVarieties.length > 0 ? (
              <UprootingShowcase
                varieties={uprootingVarieties}
                totalCount={totalUprootingCount}
                operationType={event.activity_subtype}
                location={event.city}
              />
            ) : varieties.length > 0 ? (
              <VarietyShowcase
                varieties={varieties}
                totalPalms={totalPalms}
                saleModel={saleModel}
              />
            ) : null}

            {/* Service offers section — operational, already implemented */}
            {isServiceRequest && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-700">العروض المقدمة</h3>
                  {isLoggedIn && !isOwner && !showOfferForm && (
                    <button
                      onClick={() => setShowOfferForm(true)}
                      className="px-4 py-2 rounded-xl bg-siwar-600 text-white text-xs font-bold hover:bg-siwar-700 transition-colors"
                    >
                      تقديم عرض
                    </button>
                  )}
                </div>

                {showOfferForm && (
                  <div className="space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">السعر (ريال) *</label>
                        <input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="1500" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">المدة</label>
                        <input type="text" value={offerDuration} onChange={(e) => setOfferDuration(e.target.value)} placeholder="2 يوم" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600">نطاق العمل</label>
                      <input type="text" value={offerScope} onChange={(e) => setOfferScope(e.target.value)} placeholder="قلع وغرس 50 نخلة" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">المعدات</label>
                        <input type="text" value={offerEquipment} onChange={(e) => setOfferEquipment(e.target.value)} placeholder="رافعة، شاحنة" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">العمالة</label>
                        <input type="text" value={offerLabor} onChange={(e) => setOfferLabor(e.target.value)} placeholder="4 عمال" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600">ملاحظات</label>
                      <textarea value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} rows={2} placeholder="تفاصيل إضافية" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-siwar-400 focus:outline-none resize-none" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={offerHasTransport} onChange={(e) => setOfferHasTransport(e.target.checked)} className="w-4 h-4 accent-siwar-600" />
                      <span className="text-sm text-gray-600">أوفر النقل ضمن العرض</span>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={handleSubmitOffer} disabled={submitting || !offerPrice} className="flex-1 py-2.5 rounded-xl bg-siwar-600 text-white text-sm font-bold hover:bg-siwar-700 disabled:opacity-50 transition-colors">
                        {submitting ? 'جاري...' : 'تقديم'}
                      </button>
                      <button onClick={() => setShowOfferForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {loadingOffers ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
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
                        <span className="text-sm font-bold text-gray-800">
                          {offer.price != null ? `${offer.price} ${offer.currency}` : 'بدون سعر'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          offer.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          offer.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {offer.status === 'accepted' ? 'مقبول' : offer.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                        </span>
                      </div>
                      {offer.duration && <p className="text-xs text-gray-500">المدة: {offer.duration}</p>}
                      {offer.scope && <p className="text-xs text-gray-500">النطاق: {offer.scope}</p>}
                      {offer.equipment && <p className="text-xs text-gray-500">المعدات: {offer.equipment}</p>}
                      {offer.labor && <p className="text-xs text-gray-500">العمالة: {offer.labor}</p>}
                      {offer.has_transport && (
                        <div className="flex items-center gap-1 text-xs text-siwar-600">
                          <Truck className="w-3.5 h-3.5" /> يوفر النقل
                        </div>
                      )}
                      {offer.notes && <p className="text-xs text-gray-500">{offer.notes}</p>}
                      {isOwner && offer.status === 'pending' && (
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => handleAcceptOffer(offer.id)} className="flex-1 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors">قبول</button>
                          <button onClick={() => handleRejectOffer(offer.id)} className="flex-1 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors">رفض</button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Complete service button for in_progress services */}
            {isServiceRequest && isOwner && oppStatus === 'in_progress' && (
              <button
                onClick={handleCompleteService}
                className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> إكمال الخدمة
              </button>
            )}
          </div>

          {/* ── Contact Footer ── */}
          {!isOwner && (
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-3 -mx-5 -mb-4">
              <div className="flex gap-2.5">
                {company?.whatsapp_number && (
                  <a
                    href={buildWhatsAppLink(company.whatsapp_number, `مرحباً، بخصوص عرضكم: ${event.title}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#1eb558] transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.89-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    واتساب
                  </a>
                )}
                <button
                  onClick={() => {
                    if (!isLoggedIn) { onToast('يجب تسجيل الدخول لبدء المحادثة', 'error'); return; }
                    setShowChat(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-siwar-600 text-white text-sm font-bold hover:bg-siwar-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  محادثة
                </button>
              </div>
              {!company?.whatsapp_number && (
                <p className="flex items-center justify-center gap-1 mt-2 text-[10px] text-gray-400">
                  <Lock className="w-2.5 h-2.5" />
                  الوسائل المتاحة: محادثة داخل التطبيق
                </p>
              )}
            </div>
          )}
        </div>

        {showChat && company && (
          <ChatPanel
            opportunityId={event.id}
            companyId={company.id}
            opportunityTitle={event.title}
            onClose={() => setShowChat(false)}
            onToast={onToast}
          />
        )}
      </div>
    </>
  );
}
