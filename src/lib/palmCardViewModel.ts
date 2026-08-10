import type { NetworkPulseEvent, FieldDefinition, VarietyEntry } from '@/types';
import {
  formatOperationType,
  getOperationMeta,
  formatValue,
  formatVariety,
  formatResidueType,
  formatPrice,
} from './cardFormatters';

export type CardIndicator = {
  label: string;
  value: string;
};

export type PalmCardViewModel = {
  operationLabel: string;
  operationMeta: { bg: string; text: string; dot: string } | null;
  specialtyLabel: string | null;
  title: string;
  summary: string | null;
  indicators: CardIndicator[];
  price: string | null;
  publisherName: string | null;
  publisherVerified: boolean;
  location: string | null;
};

function num(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function buildFruitsIndicators(attrs: Record<string, unknown>): CardIndicator[] {
  const indicators: CardIndicator[] = [];
  const varieties = Array.isArray(attrs['varieties']) ? attrs['varieties'] as VarietyEntry[] : [];

  if (varieties.length > 0) {
    indicators.push({ label: 'الأصناف', value: String(varieties.length) });

    const totalPalms = varieties.reduce((sum, v) => sum + (num(v.palm_count) ?? 0), 0);
    if (totalPalms > 0) indicators.push({ label: 'النخيل', value: totalPalms.toLocaleString('ar-EG') });

    const totalProduction = varieties.reduce((sum, v) => sum + (num(v.expected_production) ?? 0), 0);
    if (totalProduction > 0) indicators.push({ label: 'الإنتاج', value: `${totalProduction} طن` });
  }

  const season = formatValue(attrs['season']);
  if (season) indicators.push({ label: 'الموسم', value: season });

  const saleModel = formatValue(attrs['sale_model']);
  if (saleModel) indicators.push({ label: 'طريقة البيع', value: saleModel });

  return indicators;
}

function buildTransplantedPalmsIndicators(attrs: Record<string, unknown>): CardIndicator[] {
  const indicators: CardIndicator[] = [];

  const count = num(attrs['count']);
  if (count !== null) indicators.push({ label: 'العدد', value: count.toLocaleString('ar-EG') });

  const variety = formatVariety(String(attrs['variety'] ?? ''));
  if (variety) indicators.push({ label: 'الصنف', value: variety });

  const trunkHeight = formatValue(attrs['trunk_height']);
  if (trunkHeight) indicators.push({ label: 'ارتفاع الساق', value: `${trunkHeight} م` });

  const condition = formatValue(attrs['palm_condition']);
  if (condition) indicators.push({ label: 'الحالة', value: condition });

  const uprooting = formatValue(attrs['uprooting_readiness']);
  if (uprooting) indicators.push({ label: 'الجاهزية', value: uprooting });

  return indicators;
}

function buildSeedlingsIndicators(attrs: Record<string, unknown>): CardIndicator[] {
  const indicators: CardIndicator[] = [];

  const count = num(attrs['count']);
  if (count !== null) indicators.push({ label: 'العدد', value: count.toLocaleString('ar-EG') });

  const variety = formatVariety(String(attrs['variety'] ?? ''));
  if (variety) indicators.push({ label: 'الصنف', value: variety });

  const rooting = formatValue(attrs['rooting_status']);
  if (rooting) indicators.push({ label: 'التجذير', value: rooting });

  const age = num(attrs['age']);
  if (age !== null) indicators.push({ label: 'العمر', value: `${age} سنة` });

  return indicators;
}

function buildProjectsIndicators(attrs: Record<string, unknown>): CardIndicator[] {
  const indicators: CardIndicator[] = [];

  const treeCount = num(attrs['tree_count']);
  if (treeCount !== null) indicators.push({ label: 'النخيل', value: treeCount.toLocaleString('ar-EG') });

  const variety = formatVariety(String(attrs['variety'] ?? ''));
  if (variety) indicators.push({ label: 'الصنف', value: variety });

  const takreb = formatValue(attrs['takreb_type']);
  if (takreb) indicators.push({ label: 'التكريب', value: takreb });

  const kerb = formatValue(attrs['kerb_status']);
  if (kerb) indicators.push({ label: 'الكرب', value: kerb });

  const heightRange = formatValue(attrs['height_range']);
  if (heightRange) indicators.push({ label: 'الارتفاع', value: heightRange });

  return indicators;
}

function buildResiduesIndicators(attrs: Record<string, unknown>): CardIndicator[] {
  const indicators: CardIndicator[] = [];

  const residueType = formatResidueType(String(attrs['residue_type'] ?? ''));
  if (residueType) indicators.push({ label: 'النوع', value: residueType });

  const weightValue = num(attrs['weight_value']);
  const weightUnit = formatValue(attrs['weight_unit']);
  if (weightValue !== null && weightUnit) {
    indicators.push({ label: 'الوزن', value: `${weightValue} ${weightUnit}` });
  }

  const qtyMethod = formatValue(attrs['quantity_method']);
  if (qtyMethod) indicators.push({ label: 'التحديد', value: qtyMethod });

  return indicators;
}

function buildSuppliesIndicators(attrs: Record<string, unknown>): CardIndicator[] {
  const indicators: CardIndicator[] = [];

  const category = formatValue(attrs['supply_category']);
  if (category) indicators.push({ label: 'الفئة', value: category });

  const condition = formatValue(attrs['condition']);
  if (condition) indicators.push({ label: 'الحالة', value: condition });

  return indicators;
}

function buildServicesIndicators(attrs: Record<string, unknown>): CardIndicator[] {
  const indicators: CardIndicator[] = [];

  const serviceType = formatValue(attrs['service_type']);
  if (serviceType) indicators.push({ label: 'الخدمة', value: serviceType });

  const providerType = formatValue(attrs['provider_type']);
  if (providerType) indicators.push({ label: 'المقدم', value: providerType });

  const hasTransport = attrs['has_transport'];
  if (hasTransport === true || hasTransport === 'true') {
    indicators.push({ label: 'النقل', value: 'متاح' });
  }

  return indicators;
}

function buildGenericIndicators(attrs: Record<string, unknown>): CardIndicator[] {
  const indicators: CardIndicator[] = [];

  const count = num(attrs['count'] ?? attrs['quantity']);
  if (count !== null) indicators.push({ label: 'الكمية', value: count.toLocaleString('ar-EG') });

  return indicators;
}

const INDICATOR_BUILDERS: Record<string, (attrs: Record<string, unknown>) => CardIndicator[]> = {
  'palm-fruits': buildFruitsIndicators,
  'transplanted-palms': buildTransplantedPalmsIndicators,
  'palm-seedlings': buildSeedlingsIndicators,
  'palm-projects': buildProjectsIndicators,
  'palm-residues': buildResiduesIndicators,
  'palm-supplies': buildSuppliesIndicators,
  'palm-services': buildServicesIndicators,
};

export function buildPalmCardViewModel(
  event: NetworkPulseEvent,
  specialtyName: string | null,
  subSectorSlug: string | null,
  _fieldDefs: FieldDefinition[],
): PalmCardViewModel {
  const operationLabel = formatOperationType(event.activity_subtype);
  const operationMeta = getOperationMeta(event.activity_subtype);
  const attrs = (event.attributes ?? {}) as Record<string, unknown>;

  const builder = subSectorSlug ? INDICATOR_BUILDERS[subSectorSlug] : null;
  const indicators = builder ? builder(attrs) : buildGenericIndicators(attrs);

  return {
    operationLabel,
    operationMeta,
    specialtyLabel: specialtyName,
    title: event.title,
    summary: event.description,
    indicators,
    price: formatPrice(event.price),
    publisherName: null,
    publisherVerified: false,
    location: event.city,
  };
}
