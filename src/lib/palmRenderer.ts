import type { OpportunityItemSummary, VarietyEntry } from '@/types';

// ── Shared helpers ──

function num(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function toStr(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  return String(val);
}

function getAttr(item: OpportunityItemSummary, key: string): unknown {
  return item.attributes?.[key] ?? null;
}

// ── Palm Renderer ──
//
// General renderer for the entire palm sector. Converts opportunity_items
// into display models (VarietyEntry[], etc.) for Showcase components.
//
// Flow: Opportunity Items → Palm Renderer → Showcase Component
//
// Each palm sub-sector registers a sub-renderer. Adding a new branch
// is just adding a new entry to PALM_SUB_RENDERERS — no new architecture.

export type PalmRenderResult = {
  varieties: VarietyEntry[];
  saleModel?: string;
  season?: string;
  totalPalms: number;
};

type PalmSubRenderer = {
  slug: string;
  render: (items: OpportunityItemSummary[]) => PalmRenderResult;
};

// ── palm-fruits sub-renderer ──

function renderPalmFruits(items: OpportunityItemSummary[]): PalmRenderResult {
  const varieties = items.map((item) => {
    const varietyId = item.reference_id ?? toStr(getAttr(item, 'variety_id'));
    const varietyName = item.variety_name_snapshot ?? item.name_snapshot ?? varietyId ?? 'صنف';
    const palmCount = num(getAttr(item, 'palm_count'));
    const expectedProduction = item.quantity != null ? String(item.quantity) : toStr(getAttr(item, 'expected_production'));
    const productionUnit = item.unit ?? toStr(getAttr(item, 'production_unit')) ?? 'ton';
    const harvestDate = toStr(getAttr(item, 'harvest_date'));
    const readinessStatus = toStr(getAttr(item, 'readiness_status'));
    const qualityGrade = toStr(getAttr(item, 'quality_grade'));
    const ageYears = num(getAttr(item, 'age_years')) ?? num(item.age_value);
    const irrigationSource = toStr(getAttr(item, 'irrigation_source'));
    const description = toStr(getAttr(item, 'description'));
    const images = Array.isArray(getAttr(item, 'images')) ? getAttr(item, 'images') as string[] : [];
    const fruitCondition = toStr(getAttr(item, 'fruit_condition'));
    const priceKilo = item.unit_price != null ? String(item.unit_price) : toStr(getAttr(item, 'price_kilo'));

    const entry: VarietyEntry = {
      variety_id: varietyId ?? varietyName,
      variety_name: varietyName,
      palm_count: palmCount,
      expected_production: expectedProduction,
      production_unit: productionUnit,
      harvest_date: harvestDate,
      readiness_status: readinessStatus,
      images,
      description: description ?? (fruitCondition ? `حالة الثمار: ${fruitCondition}` : null),
      quality_grade: qualityGrade,
      age_years: ageYears,
      irrigation_source: irrigationSource,
    };

    if (priceKilo) {
      (entry as VarietyEntry & { price_kilo?: string }).price_kilo = priceKilo;
    }

    return entry;
  });

  return {
    varieties,
    saleModel: items.length > 0 ? toStr(getAttr(items[0], 'sale_model')) ?? undefined : undefined,
    season: items.length > 0 ? toStr(getAttr(items[0], 'season')) ?? undefined : undefined,
    totalPalms: items.reduce((sum, item) => sum + (num(getAttr(item, 'palm_count')) ?? 0), 0),
  };
}

// ── Default sub-renderer (for future palm sub-sectors not yet V2) ──
// When a sub-sector is upgraded to V2, replace this with a specialized renderer.

function renderDefault(items: OpportunityItemSummary[]): PalmRenderResult {
  const varieties = items.map((item) => {
    const varietyName = item.variety_name_snapshot ?? item.name_snapshot ?? 'صنف';
    const images = Array.isArray(getAttr(item, 'images')) ? getAttr(item, 'images') as string[] : [];

    const entry: VarietyEntry = {
      variety_id: item.reference_id ?? varietyName,
      variety_name: varietyName,
      palm_count: num(getAttr(item, 'palm_count')),
      expected_production: item.quantity != null ? String(item.quantity) : null,
      production_unit: item.unit ?? 'ton',
      harvest_date: toStr(getAttr(item, 'harvest_date')),
      readiness_status: toStr(getAttr(item, 'readiness_status')) ?? item.readiness_status,
      images,
      description: toStr(getAttr(item, 'description')),
      quality_grade: toStr(getAttr(item, 'quality_grade')),
      age_years: num(getAttr(item, 'age_years')) ?? num(item.age_value),
      irrigation_source: toStr(getAttr(item, 'irrigation_source')),
    };

    return entry;
  });

  return {
    varieties,
    totalPalms: items.reduce((sum, item) => sum + (num(getAttr(item, 'palm_count')) ?? 0), 0),
  };
}

// ── Sub-renderer registry ──
// Adding a new palm branch = adding one entry here.

const PALM_SUB_RENDERERS: Record<string, PalmSubRenderer> = {
  'palm-fruits': { slug: 'palm-fruits', render: renderPalmFruits },
  // Future: palm-seedlings, transplanted-palms, palm-projects, palm-residues, palm-supplies, palm-services
  // Each will get its own specialized render function when upgraded to V2.
};

/**
 * Main entry point — renders opportunity_items for any palm sub-sector.
 * Falls back to the default renderer for sub-sectors without a specialized one.
 */
export function renderPalmItems(subSectorSlug: string, items: OpportunityItemSummary[]): PalmRenderResult {
  const renderer = PALM_SUB_RENDERERS[subSectorSlug];
  if (renderer) return renderer.render(items);
  return renderDefault(items);
}

// ── Backward-compatible exports (palm-fruits specific) ──

export function renderPalmFruitsVarieties(items: OpportunityItemSummary[]): VarietyEntry[] {
  return renderPalmFruits(items).varieties;
}

export function renderPalmFruitsSaleModel(items: OpportunityItemSummary[]): string | undefined {
  return renderPalmFruits(items).saleModel;
}

export function renderPalmFruitsSeason(items: OpportunityItemSummary[]): string | undefined {
  return renderPalmFruits(items).season;
}

export function renderPalmFruitsTotalPalms(items: OpportunityItemSummary[]): number {
  return renderPalmFruits(items).totalPalms;
}
