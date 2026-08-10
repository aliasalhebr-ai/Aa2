import type {
  NetworkPulseEvent, Company, OpportunityItemSummary,
  PartnershipProfileSummary, PartnershipRoleSummary,
  OpportunityDetailViewModel, OpportunityDetailItem, PublisherSummary,
  OfferDetails, DemandDetails, PartnershipDetails, PartnershipRoleDetail,
  OpportunityDetailPermissions, DetailAction, OpportunityTypePresentation,
} from '@/types';
import { resolveOpportunityTypePresentation } from './opportunityTypePresentation';
import { adaptV1ToDetailItems } from './v1DetailAdapter';
import type { OpportunityDetailBundle } from '@/services/opportunityDetailService';

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  pending_review: 'قيد المراجعة',
  active: 'منشورة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  closed: 'مغلقة',
  rejected: 'مرفوضة',
  archived: 'مؤرشفة',
};

const TIMING_LABELS: Record<string, string> = {
  available_now: 'متاح الآن',
  future_production: 'إنتاج مستقبلي',
  scheduled: 'موعد محدد',
  flexible: 'موعد مرن',
};

const ROOT_STATUS_LABELS: Record<string, string> = {
  rooted: 'مجذّر',
  bare_root: 'جذور عارية',
  air_layered: 'تطعير هوائي',
};

const READINESS_LABELS: Record<string, string> = {
  ready: 'جاهز',
  not_ready: 'غير جاهز',
  preparing: 'قيد التجهيز',
};

const PRICING_TYPE_LABELS: Record<string, string> = {
  fixed: 'سعر ثابت',
  negotiable: 'قابل للتفاوض',
  quote: 'حسب عرض السعر',
  range: 'نطاق سعر',
};

const COVERAGE_MODE_LABELS: Record<string, string> = {
  single_partner: 'شريك واحد',
  multi_partner: 'عدة شركاء',
  mixed: 'مختلط',
};

const PARTNERSHIP_TYPE_LABELS: Record<string, string> = {
  production: 'إنتاج',
  marketing: 'تسويق',
  distribution: 'توزيع',
  investment: 'استثمار',
  joint_venture: 'مشروع مشترك',
};

function num(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function toStr(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  return String(val);
}

function formatBool(val: unknown, trueLabel: string, falseLabel: string): string | null {
  if (val === null || val === undefined) return null;
  return val ? trueLabel : falseLabel;
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function buildSpecifications(item: OpportunityItemSummary): { label: string; value: string }[] {
  const specs: { label: string; value: string }[] = [];
  const itemAttrs = (item.attributes ?? {}) as Record<string, unknown>;

  const add = (label: string, value: string | null) => {
    if (value) specs.push({ label, value });
  };

  add('الكمية', num(item.quantity) !== null ? `${num(item.quantity)!.toLocaleString('ar-EG')} ${item.unit ? formatUnit(item.unit) : ''}`.trim() : null);
  add('السعر', num(item.unit_price) !== null ? `${num(item.unit_price)!.toLocaleString('ar-EG')} ر.س` : null);
  add('طريقة التسعير', item.pricing_type ? PRICING_TYPE_LABELS[item.pricing_type] ?? item.pricing_type : null);
  add('الجودة', toStr(itemAttrs['quality']));
  add('الموسم', toStr(itemAttrs['season']));
  add('موعد الجني', toStr(itemAttrs['harvest_date']));
  add('نوع الخدمة', toStr(itemAttrs['service_type'] ?? itemAttrs['service_name']));
  add('نطاق التغطية', toStr(itemAttrs['coverage_area']));
  add('المدة', toStr(itemAttrs['duration'] ?? itemAttrs['expected_duration']));
  add('المعدات', toStr(itemAttrs['equipment']));
  add('القدرة اليومية', toStr(itemAttrs['daily_capacity']));
  add('العمر', num(item.age_value) !== null ? `${num(item.age_value)} سنة` : null);
  add('الارتفاع', num(item.height_value) !== null ? `${num(item.height_value)} م` : null);
  add('حجم الحاوية', item.container_size);
  add('حالة الجذور', item.root_status ? ROOT_STATUS_LABELS[item.root_status] ?? item.root_status : null);
  add('حالة الجاهزية', item.readiness_status ? READINESS_LABELS[item.readiness_status] ?? item.readiness_status : null);
  add('التوفر', toStr(itemAttrs['available_from']));

  return specs;
}

function formatUnit(unit: string): string {
  const units: Record<string, string> = {
    seedling: 'شتلة',
    pot: 'أصيص',
    ton: 'طن',
    kg: 'كجم',
    unit: 'وحدة',
    tree: 'شجرة',
  };
  return units[unit] ?? unit;
}

function buildOfferDetails(event: NetworkPulseEvent, items: OpportunityItemSummary[]): OfferDetails | null {
  const attrs = (event.attributes ?? {}) as Record<string, unknown>;
  const timing = event.opportunity_timing;
  const firstItem = items[0];

  return {
    availableNow: timing === 'available_now',
    availableFromDate: firstItem ? null : null,
    isNegotiable: attrs['is_negotiable'] !== undefined ? Boolean(attrs['is_negotiable']) : null,
  };
}

function buildDemandDetails(event: NetworkPulseEvent, items: OpportunityItemSummary[]): DemandDetails | null {
  const attrs = (event.attributes ?? {}) as Record<string, unknown>;

  return {
    requiredSupplyDate: toStr(attrs['required_supply_date']) ?? null,
    offerDeadline: toStr(attrs['offer_deadline']) ?? null,
    isFlexibleTiming: event.opportunity_timing === 'flexible',
    minPrice: num(attrs['min_price']),
    maxPrice: num(attrs['max_price']),
    includesTransport: Boolean(attrs['includes_transport']),
    includesLoading: Boolean(attrs['includes_loading']),
    includesPlanting: Boolean(attrs['includes_planting']),
    includesIrrigation: Boolean(attrs['includes_irrigation']),
    includesMaintenance: Boolean(attrs['includes_maintenance']),
    batchDelivery: Boolean(attrs['batch_delivery']),
    batchCount: num(attrs['batch_count']),
    batchStartDate: toStr(attrs['batch_start_date']),
    batchEndDate: toStr(attrs['batch_end_date']),
    batchFrequency: toStr(attrs['batch_frequency']),
    batchQuantityPerDelivery: num(attrs['batch_quantity_per_delivery']),
  };
}

function buildPartnershipDetails(
  profile: PartnershipProfileSummary | null,
  roles: PartnershipRoleSummary[],
): PartnershipDetails | null {
  if (!profile) return null;

  const roleDetails: PartnershipRoleDetail[] = roles.map((r) => ({
    roleKey: r.role_key,
    roleLabel: r.role_label_snapshot,
    description: null,
    requiredCount: r.required_count,
    requiredQuantity: null,
    unit: null,
    minimumCapacity: null,
    coverageArea: null,
    requirements: null,
    status: 'open',
  }));

  return {
    partnershipType: profile.partnership_type,
    leadEntityName: null,
    summary: profile.summary,
    projectLocation: null,
    startDate: null,
    expectedDuration: profile.expected_duration,
    joinDeadline: profile.join_deadline,
    requiredPartnersCount: profile.required_partners_count,
    partnersCountMode: profile.partners_count_mode,
    coverageMode: profile.coverage_mode,
    projectSize: profile.project_size,
    projectValue: null,
    projectValueVisible: false,
    projectSites: null,
    projectPhases: null,
    isSplittable: false,
    roles: roleDetails,
  };
}

function buildItems(items: OpportunityItemSummary[]): OpportunityDetailItem[] {
  return items.map((item) => {
    const refSource = item.reference_source ?? '';
    const itemType = item.item_type ?? '';
    let iconKey = 'default';
    if (refSource.includes('variety') || refSource.includes('palm') || itemType.includes('variety')) iconKey = 'variety';
    else if (refSource.includes('plant') || refSource.includes('seedling') || itemType.includes('plant')) iconKey = 'seedling';
    else if (refSource.includes('service') || itemType.includes('service')) iconKey = 'service';
    else if (refSource.includes('product') || refSource.includes('factory') || itemType.includes('product')) iconKey = 'product';
    else if (refSource.includes('supply') || refSource.includes('equipment') || itemType.includes('supply')) iconKey = 'supply';
    else if (refSource.includes('residue') || refSource.includes('waste') || itemType.includes('residue')) iconKey = 'residue';
    else if (refSource.includes('logistics') || refSource.includes('transport') || itemType.includes('logistics')) iconKey = 'logistics';
    return {
    id: item.id,
    itemType: item.item_type ?? 'plant',
    referenceSource: item.reference_source ?? null,
    referenceId: item.reference_id ?? null,
    iconKey,
    name: item.name_snapshot,
    varietyName: item.variety_name_snapshot,
    quantity: num(item.quantity),
    unit: item.unit,
    minimumQuantity: null,
    price: num(item.unit_price),
    minimumPrice: null,
    maximumPrice: null,
    pricingType: item.pricing_type,
    age: num(item.age_value),
    minimumHeight: null,
    maximumHeight: num(item.height_value),
    heightUnit: 'م',
    trunkDiameter: null,
    containerSize: item.container_size,
    rootStatus: item.root_status,
    readinessStatus: item.readiness_status,
    availableFrom: null,
    requiredSupplyDate: null,
    images: item.images ?? [],
    coverImage: item.cover_image,
    notes: null,
    specifications: buildSpecifications(item),
    };
  });
}

export function mapOpportunityDetailBundle(
  bundle: OpportunityDetailBundle,
): OpportunityDetailViewModel | null {
  const { opportunity: event, sectorLabel, subSectorLabel, subSectorSlug, publisher, items, partnershipProfile, partnershipRoles, isOwner, isAdmin } = bundle;

  if (!event) return null;

  const opType = event.opportunity_type ?? event.activity_subtype ?? 'unknown';
  const presentation = resolveOpportunityTypePresentation(opType);
  // Use actual status from the opportunity, not hardcoded
  const status = event.attributes?.['status'] as string ?? 'active';
  const statusLabel = STATUS_LABELS[status] ?? status;
  const timingLabel = event.opportunity_timing ? TIMING_LABELS[event.opportunity_timing] ?? event.opportunity_timing : null;

  const publisherSummary: PublisherSummary | null = publisher
    ? {
        id: publisher.id,
        name: publisher.name,
        entityType: (publisher as unknown as Record<string, unknown>).entity_type as string ?? null,
        verified: publisher.is_verified ?? false,
        city: publisher.city ?? null,
        logo: null,
        isOwner,
      }
    : null;

  const permissions: OpportunityDetailPermissions = {
    canView: true,
    isOwner,
    isAdmin,
    canEdit: false,
    canClose: false,
    canArchive: false,
  };

  // Only show chat/whatsapp to non-owners. Owners don't contact themselves.
  const availableActions: DetailAction[] = isOwner ? [] : ['chat', 'whatsapp'];

  const tv = event.template_version ?? 1;
  let detailItems = buildItems(items);
  if (detailItems.length === 0) {
    detailItems = adaptV1ToDetailItems(event);
  }

  let offerDetails: OfferDetails | null = null;
  let demandDetails: DemandDetails | null = null;
  let partnershipDetails: PartnershipDetails | null = null;

  if (opType === 'offer') {
    offerDetails = buildOfferDetails(event, items);
  } else if (opType === 'demand') {
    demandDetails = buildDemandDetails(event, items);
  } else if (opType === 'partnership') {
    partnershipDetails = buildPartnershipDetails(partnershipProfile, partnershipRoles);
  }

  return {
    id: event.id,
    title: event.title,
    fullDescription: event.description ?? null,
    opportunityType: opType,
    opportunityTypeLabel: presentation.label,
    opportunityTypePresentation: presentation,
    sectorLabel,
    subSectorLabel,
    subSectorSlug,
    status,
    statusLabel,
    opportunityTiming: event.opportunity_timing ?? null,
    opportunityTimingLabel: timingLabel,
    createdAt: event.created_at,
    publishedAt: event.created_at,
    city: event.city ?? null,
    location: event.city ?? null,
    generalImages: event.images ?? [],
    items: detailItems,
    rawItems: items,
    publisher: publisherSummary,
    offerDetails,
    demandDetails,
    partnershipDetails,
    permissions,
    availableActions,
    sourceOpportunity: event,
    templateVersion: tv,
  };
}
