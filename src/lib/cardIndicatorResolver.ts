import type {
  NetworkPulseEvent,
  CardIndicator,
  OpportunityItemSummary,
  PartnershipProfileSummary,
  PartnershipRoleSummary,
  FieldDefinition,
  ItemFieldDefinition,
} from '@/types';
import { formatValue, formatUnit, formatVariety, formatPrice } from './cardFormatters';
import { resolveOpportunityFormat } from './opportunityFormatResolver';
import type { V2CardFieldDef } from './opportunityCardMapper';

function num(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

type Attrs = Record<string, unknown>;

type FormatIndicatorDef = {
  keys: string[];
  label: string;
  format: (attrs: Attrs, event: NetworkPulseEvent) => string | null;
};

const FORMAT_INDICATOR_DEFS: Record<string, FormatIndicatorDef[]> = {
  full_harvest_sale: [
    {
      keys: ['expected_production', 'varieties'],
      label: 'الإنتاج',
      format: (_attrs, _event) => {
        const varieties = Array.isArray(_attrs['varieties']) ? _attrs['varieties'] as Array<Record<string, unknown>> : [];
        const total = varieties.reduce((s, v) => s + (num(v['expected_production']) ?? 0), 0);
        return total > 0 ? `${total.toLocaleString('ar-EG')} طن` : null;
      },
    },
    {
      keys: ['season'],
      label: 'الموسم',
      format: (attrs) => formatValue(attrs['season']),
    },
    {
      keys: ['price', 'pricing_type'],
      label: 'السعر',
      format: (attrs, event) => {
        const p = formatPrice(event.price);
        if (p) return p;
        const pt = formatValue(attrs['pricing_type']);
        return pt === 'طلب تسعير' ? 'طلب تسعير' : null;
      },
    },
  ],
  per_kilo_sale: [
    {
      keys: ['varieties'],
      label: 'الأصناف',
      format: (attrs) => {
        const varieties = Array.isArray(attrs['varieties']) ? attrs['varieties'] as Array<Record<string, unknown>> : [];
        return varieties.length > 0 ? String(varieties.length) : null;
      },
    },
    {
      keys: ['quantity'],
      label: 'الكمية',
      format: (attrs) => {
        const q = num(attrs['quantity']);
        return q !== null ? `${q.toLocaleString('ar-EG')} طن` : null;
      },
    },
    {
      keys: ['price'],
      label: 'السعر',
      format: (_attrs, event) => formatPrice(event.price),
    },
  ],
  per_variety_sale: [
    {
      keys: ['varieties'],
      label: 'الأصناف',
      format: (attrs) => {
        const varieties = Array.isArray(attrs['varieties']) ? attrs['varieties'] as Array<Record<string, unknown>> : [];
        return varieties.length > 0 ? String(varieties.length) : null;
      },
    },
    {
      keys: ['varieties'],
      label: 'الكمية',
      format: (attrs) => {
        const varieties = Array.isArray(attrs['varieties']) ? attrs['varieties'] as Array<Record<string, unknown>> : [];
        const total = varieties.reduce((s, v) => s + (num(v['quantity']) ?? num(v['palm_count']) ?? 0), 0);
        return total > 0 ? total.toLocaleString('ar-EG') : null;
      },
    },
    {
      keys: ['price'],
      label: 'سعر الوحدة',
      format: (_attrs, event) => formatPrice(event.price),
    },
  ],
  future_production: [
    {
      keys: ['varieties'],
      label: 'الأصناف',
      format: (attrs) => {
        const varieties = Array.isArray(attrs['varieties']) ? attrs['varieties'] as Array<Record<string, unknown>> : [];
        if (varieties.length === 0) return null;
        if (varieties.length === 1) return formatVariety(String(varieties[0]['variety'] ?? ''));
        return `${varieties.length} أصناف`;
      },
    },
    {
      keys: ['season', 'harvest_date'],
      label: 'موعد الجني',
      format: (attrs) => formatValue(attrs['season']) ?? formatValue(attrs['harvest_date']),
    },
    {
      keys: ['varieties'],
      label: 'الكمية المتوقعة',
      format: (attrs) => {
        const varieties = Array.isArray(attrs['varieties']) ? attrs['varieties'] as Array<Record<string, unknown>> : [];
        const total = varieties.reduce((s, v) => s + (num(v['expected_production']) ?? 0), 0);
        return total > 0 ? `${total.toLocaleString('ar-EG')} طن` : null;
      },
    },
  ],
  standard_demand: [
    {
      keys: ['variety', 'varieties'],
      label: 'الأصناف المطلوبة',
      format: (attrs) => {
        const variety = formatVariety(String(attrs['variety'] ?? ''));
        if (variety) return variety;
        const varieties = Array.isArray(attrs['varieties']) ? attrs['varieties'] as Array<Record<string, unknown>> : [];
        return varieties.length > 0 ? `${varieties.length} أصناف` : null;
      },
    },
    {
      keys: ['count', 'quantity'],
      label: 'الكمية',
      format: (attrs) => {
        const c = num(attrs['count']) ?? num(attrs['quantity']);
        return c !== null ? c.toLocaleString('ar-EG') : null;
      },
    },
    {
      keys: ['supply_deadline', 'budget'],
      label: 'الموعد',
      format: (attrs) => formatValue(attrs['supply_deadline']) ?? formatValue(attrs['budget']),
    },
  ],
  standard_partnership: [
    {
      keys: ['partnership_type'],
      label: 'نوع الشراكة',
      format: (attrs) => formatValue(attrs['partnership_type']),
    },
    {
      keys: ['roles'],
      label: 'الأدوار',
      format: (attrs) => {
        const roles = Array.isArray(attrs['roles']) ? attrs['roles'] : [];
        return roles.length > 0 ? `${roles.length} أدوار` : null;
      },
    },
    {
      keys: ['join_deadline'],
      label: 'الموعد النهائي',
      format: (attrs) => formatValue(attrs['join_deadline']),
    },
  ],
  standard_offer: [
    {
      keys: ['quantity', 'count'],
      label: 'الكمية',
      format: (attrs) => {
        const q = num(attrs['quantity']) ?? num(attrs['count']);
        return q !== null ? q.toLocaleString('ar-EG') : null;
      },
    },
    {
      keys: ['price'],
      label: 'السعر',
      format: (_attrs, event) => formatPrice(event.price),
    },
    {
      keys: ['city'],
      label: 'الموقع',
      format: (_attrs, event) => event.city ?? null,
    },
  ],
};

const GENERIC_FALLBACK: FormatIndicatorDef[] = [
  {
    keys: ['quantity', 'count'],
    label: 'الكمية',
    format: (attrs) => {
      const q = num(attrs['quantity']) ?? num(attrs['count']);
      return q !== null ? q.toLocaleString('ar-EG') : null;
    },
  },
];

export function resolveLegacyIndicators(
  event: NetworkPulseEvent,
  templateVersion: number,
): CardIndicator[] {
  const format = resolveOpportunityFormat(event, templateVersion);
  const attrs = (event.attributes ?? {}) as Attrs;
  const defs = FORMAT_INDICATOR_DEFS[format.formatKey] ?? GENERIC_FALLBACK;

  const indicators: CardIndicator[] = [];
  for (const def of defs) {
    if (indicators.length >= 3) break;
    const value = def.format(attrs, event);
    if (value) {
      indicators.push({
        key: def.keys[0],
        label: def.label,
        formattedValue: value,
        iconKey: null,
        displayOrder: indicators.length,
      });
    }
  }

  return indicators;
}

export function resolveV2Indicators(
  event: NetworkPulseEvent,
  items: OpportunityItemSummary[],
  cardFieldDefs: V2CardFieldDef[],
  partnershipProfile: PartnershipProfileSummary | null,
  partnershipRoles: PartnershipRoleSummary[],
): CardIndicator[] {
  const format = resolveOpportunityFormat(event, 2);
  const formatDefs = FORMAT_INDICATOR_DEFS[format.formatKey];

  if (formatDefs && (event.attributes ?? null) !== null) {
    const attrs = (event.attributes ?? {}) as Attrs;
    const indicators: CardIndicator[] = [];
    for (const def of formatDefs) {
      if (indicators.length >= 3) break;
      const value = def.format(attrs, event);
      if (value) {
        indicators.push({
          key: def.keys[0],
          label: def.label,
          formattedValue: value,
          iconKey: null,
          displayOrder: indicators.length,
        });
      }
    }
    if (indicators.length > 0) return indicators;
  }

  return resolveV2IndicatorsFromFieldDefs(event, items, cardFieldDefs, partnershipProfile, partnershipRoles);
}

function resolveColumnValue(item: OpportunityItemSummary, columnName: string): string | null {
  switch (columnName) {
    case 'quantity':
      return num(item.quantity) !== null ? num(item.quantity)!.toLocaleString('ar-EG') : null;
    case 'unit':
      return item.unit ? formatUnit(item.unit) : null;
    case 'unit_price':
      return num(item.unit_price) !== null ? `${num(item.unit_price)!.toLocaleString('ar-EG')} ر.س` : null;
    case 'pricing_type':
      return item.pricing_type ? formatValue(item.pricing_type) : null;
    case 'age_value':
      return num(item.age_value) !== null ? `${num(item.age_value)} سنة` : null;
    case 'height_value':
      return num(item.height_value) !== null ? `${num(item.height_value)} م` : null;
    case 'root_status':
      return item.root_status ? formatValue(item.root_status) : null;
    case 'readiness_status':
      return item.readiness_status ? formatValue(item.readiness_status) : null;
    case 'container_size':
      return item.container_size ? formatValue(item.container_size) : null;
    case 'reference_id':
      return item.name_snapshot ?? null;
    case 'plant_variety_id':
      return item.variety_name_snapshot ?? null;
    default:
      return null;
  }
}

function resolveItemFieldValue(
  item: OpportunityItemSummary,
  fieldKey: string,
  columnName: string | null,
): string | null {
  if (columnName) {
    const colVal = resolveColumnValue(item, columnName);
    if (colVal) return colVal;
  }
  const attrVal = item.attributes?.[fieldKey];
  if (attrVal !== null && attrVal !== undefined && attrVal !== '') {
    return formatValue(attrVal);
  }
  return null;
}

function resolveProfileValue(
  profile: PartnershipProfileSummary | null,
  valueKey: string,
): string | null {
  if (!profile || !valueKey) return null;
  const val = (profile as Record<string, unknown>)[valueKey];
  if (val === null || val === undefined || val === '') return null;
  if (valueKey === 'required_partners_count') {
    const n = num(val);
    if (n === null) return null;
    return `${n} شركاء`;
  }
  return formatValue(val);
}

function resolveRolesValue(
  roles: PartnershipRoleSummary[],
  valueKey: string,
  aggregation: string | null,
): string | null {
  if (roles.length === 0) return null;
  if (aggregation === 'count' || aggregation === 'list_count') return `${roles.length} أدوار`;
  if (aggregation === 'sum') {
    const total = roles.reduce((s, r) => s + (num(r.required_count) ?? 0), 0);
    return total > 0 ? `${total}` : null;
  }
  if (aggregation === 'first' || !aggregation) {
    const val = (roles[0] as Record<string, unknown>)[valueKey];
    if (val !== null && val !== undefined && val !== '') return formatValue(val);
  }
  return null;
}

function resolveOpportunityValue(event: NetworkPulseEvent, valueKey: string): string | null {
  if (!valueKey) return null;
  const attrs = (event.attributes ?? {}) as Record<string, unknown>;
  const val = attrs[valueKey];
  if (val !== null && val !== undefined && val !== '') return formatValue(val);
  return null;
}

function resolveMultiItemIndicator(
  items: OpportunityItemSummary[],
  fieldKey: string,
  columnName: string | null,
  label: string,
  displayOrder: number,
): CardIndicator | null {
  if (items.length === 0) return null;

  if (fieldKey === 'plant_id' || fieldKey === 'variety_id' || columnName === 'reference_id') {
    if (items.length === 1) {
      const name = items[0].name_snapshot ?? items[0].variety_name_snapshot;
      if (name) return { key: fieldKey, label, formattedValue: name, iconKey: null, displayOrder };
    } else {
      const referenceSource = items[0].reference_source;
      const groupLabel = referenceSource === 'palm_varieties' ? 'الأصناف' : 'النباتات';
      return { key: fieldKey, label, formattedValue: `${items.length} ${groupLabel}`, iconKey: null, displayOrder };
    }
    return null;
  }

  if (fieldKey === 'quantity' || columnName === 'quantity') {
    if (items.length === 1) {
      const qty = num(items[0].quantity);
      if (qty !== null) {
        const unit = items[0].unit ? ` ${formatUnit(items[0].unit)}` : '';
        return { key: fieldKey, label, formattedValue: `${qty.toLocaleString('ar-EG')}${unit}`, iconKey: null, displayOrder };
      }
      return null;
    }
    const units = new Set(items.map((i) => i.unit ?? '').filter(Boolean));
    if (units.size === 1) {
      const total = items.reduce((sum, i) => sum + (num(i.quantity) ?? 0), 0);
      if (total > 0) {
        const unit = items[0].unit ? ` ${formatUnit(items[0].unit)}` : '';
        return { key: fieldKey, label, formattedValue: `${total.toLocaleString('ar-EG')}${unit}`, iconKey: null, displayOrder };
      }
    }
    return { key: fieldKey, label: 'العناصر', formattedValue: `${items.length} عناصر`, iconKey: null, displayOrder };
  }

  const val = resolveItemFieldValue(items[0], fieldKey, columnName);
  if (val) return { key: fieldKey, label, formattedValue: val, iconKey: null, displayOrder };
  return null;
}

function resolveV2IndicatorsFromFieldDefs(
  event: NetworkPulseEvent,
  items: OpportunityItemSummary[],
  cardFieldDefs: V2CardFieldDef[],
  partnershipProfile: PartnershipProfileSummary | null,
  partnershipRoles: PartnershipRoleSummary[],
): CardIndicator[] {
  const indicators: CardIndicator[] = [];

  for (const def of cardFieldDefs) {
    if (indicators.length >= 3) break;

    let value: string | null = null;

    switch (def.value_source) {
      case 'opportunity':
        value = resolveOpportunityValue(event, def.value_key ?? def.field_key);
        break;
      case 'opportunity_item':
        if (items.length > 0) {
          const ind = resolveMultiItemIndicator(
            items, def.field_key, def.column_name, def.label, def.display_order,
          );
          if (ind) {
            indicators.push(ind);
            continue;
          }
        }
        value = resolveOpportunityValue(event, def.field_key);
        break;
      case 'partnership_profile':
        value = resolveProfileValue(partnershipProfile, def.value_key ?? def.field_key);
        break;
      case 'partnership_roles':
        value = resolveRolesValue(partnershipRoles, def.value_key ?? def.field_key, def.aggregation_type);
        break;
      case 'computed':
        break;
    }

    if (value) {
      indicators.push({
        key: def.field_key,
        label: def.label,
        formattedValue: value,
        iconKey: def.icon,
        displayOrder: def.display_order,
      });
    }
  }

  return indicators;
}
