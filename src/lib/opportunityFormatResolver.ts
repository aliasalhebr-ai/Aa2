import type { NetworkPulseEvent } from '@/types';

export type OpportunityFormat = {
  formatKey: string;
  label: string;
};

const SALE_MODEL_FORMATS: Record<string, OpportunityFormat> = {
  full_harvest: { formatKey: 'full_harvest_sale', label: 'بيع محصول كامل' },
  by_kilo: { formatKey: 'per_kilo_sale', label: 'بيع بالكيلو' },
  by_variety: { formatKey: 'per_variety_sale', label: 'بيع أصناف منفصلة' },
  future_production: { formatKey: 'future_production', label: 'إنتاج مستقبلي' },
};

const TYPE_DEFAULTS: Record<string, OpportunityFormat> = {
  offer: { formatKey: 'standard_offer', label: 'عرض' },
  demand: { formatKey: 'standard_demand', label: 'طلب' },
  partnership: { formatKey: 'standard_partnership', label: 'شراكة' },
};

const FALLBACK_FORMAT: OpportunityFormat = {
  formatKey: 'generic',
  label: 'فرصة',
};

export function resolveOpportunityFormat(
  event: NetworkPulseEvent,
  templateVersion: number,
): OpportunityFormat {
  const opportunityType = event.opportunity_type ?? event.activity_subtype ?? null;
  const attrs = (event.attributes ?? {}) as Record<string, unknown>;
  const saleModel = typeof attrs['sale_model'] === 'string' ? attrs['sale_model'] : null;

  if (saleModel && SALE_MODEL_FORMATS[saleModel]) {
    return SALE_MODEL_FORMATS[saleModel];
  }

  if (opportunityType && TYPE_DEFAULTS[opportunityType]) {
    return TYPE_DEFAULTS[opportunityType];
  }

  if (templateVersion >= 2 && opportunityType === 'partnership') {
    return TYPE_DEFAULTS['partnership'];
  }

  return FALLBACK_FORMAT;
}

export function getFormatLabel(formatKey: string): string {
  const all: Record<string, OpportunityFormat> = { ...SALE_MODEL_FORMATS, ...TYPE_DEFAULTS, generic: FALLBACK_FORMAT };
  return all[formatKey]?.label ?? FALLBACK_FORMAT.label;
}
