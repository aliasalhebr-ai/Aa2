import type {
  NetworkPulseEvent,
  FieldDefinition,
  ItemFieldDefinition,
  Company,
  OpportunityCardViewModel,
  OpportunityItemSummary,
  PartnershipProfileSummary,
  PartnershipRoleSummary,
  ValueSource,
  AggregationType,
} from '@/types';
import { resolveOpportunityTypePresentation } from './opportunityTypePresentation';
import { resolveOpportunityFormat } from './opportunityFormatResolver';
import { resolveLegacyIndicators, resolveV2Indicators } from './cardIndicatorResolver';

// ── V1 Legacy Mapper ──────────────────────────────────────────────────────

export function mapLegacyPalmToOpportunityCardViewModel(
  event: NetworkPulseEvent,
  specialtyName: string | null,
  _subSectorSlug: string | null,
  _fieldDefs: FieldDefinition[],
  sectorLabel: string | null,
  company: Company | null,
): OpportunityCardViewModel {
  const presentation = resolveOpportunityTypePresentation(
    event.opportunity_type ?? event.activity_subtype,
  );
  const format = resolveOpportunityFormat(event, 1);
  const indicators = resolveLegacyIndicators(event, 1);

  return {
    id: event.id,
    title: event.title,
    descriptionPreview: event.description,
    image: null,
    opportunityType: presentation.type,
    opportunityTypeLabel: presentation.label,
    opportunityTypeStyle: presentation.style,
    opportunityTypeIcon: presentation.iconKey,
    formatKey: format.formatKey,
    sectorLabel,
    subSectorLabel: specialtyName,
    status: 'active',
    publishedAt: event.created_at,
    publisherName: company?.name ?? null,
    publisherVerified: company?.is_verified ?? false,
    location: event.city ?? null,
    indicators,
    primaryAction: presentation.primaryAction,
    primaryActionLabel: presentation.primaryActionLabel,
    templateVersion: 1,
    sourceOpportunity: event,
  };
}

// ── V2 Card Field Definitions resolution ──────────────────────────────────

export type V2CardFieldDef = {
  field_key: string;
  label: string;
  display_order: number;
  column_name: string | null;
  icon: string | null;
  value_source: ValueSource;
  value_key: string | null;
  aggregation_type: AggregationType | null;
};

export function filterCardVisibleFieldDefs(defs: ItemFieldDefinition[]): V2CardFieldDef[] {
  return defs
    .filter((d) => d.is_card_visible && d.is_active)
    .sort((a, b) => a.display_order - b.display_order)
    .map((d) => ({
      field_key: d.field_key,
      label: d.label,
      display_order: d.display_order,
      column_name: d.column_name,
      icon: null,
      value_source: d.value_source ?? 'opportunity_item',
      value_key: d.value_key,
      aggregation_type: d.aggregation_type,
    }));
}

// ── Image resolution ──────────────────────────────────────────────────────

export function resolveCardImage(
  event: NetworkPulseEvent,
  items: OpportunityItemSummary[],
): string | null {
  if (event.image && /^https?:\/\//.test(event.image)) return event.image;
  if (event.images && event.images.length > 0) return event.images[0];
  if (items.length > 0 && items[0].cover_image) return items[0].cover_image;
  if (items.length > 0 && items[0].images && items[0].images.length > 0) return items[0].images[0];
  return null;
}

// ── V2 Mapper ─────────────────────────────────────────────────────────────

export function mapV2OpportunityToCardViewModel(
  event: NetworkPulseEvent,
  items: OpportunityItemSummary[],
  cardFieldDefs: V2CardFieldDef[],
  sectorLabel: string | null,
  subSectorLabel: string | null,
  company: Company | null,
  partnershipProfile: PartnershipProfileSummary | null,
  partnershipRoles: PartnershipRoleSummary[],
): OpportunityCardViewModel {
  const presentation = resolveOpportunityTypePresentation(
    event.opportunity_type ?? event.activity_subtype,
  );

  const format = resolveOpportunityFormat(event, 2);
  const indicators = resolveV2Indicators(event, items, cardFieldDefs, partnershipProfile, partnershipRoles);
  const image = resolveCardImage(event, items);

  return {
    id: event.id,
    title: event.title,
    descriptionPreview: event.description ?? null,
    image,
    opportunityType: presentation.type,
    opportunityTypeLabel: presentation.label,
    opportunityTypeStyle: presentation.style,
    opportunityTypeIcon: presentation.iconKey,
    formatKey: format.formatKey,
    sectorLabel,
    subSectorLabel,
    status: 'active',
    publishedAt: event.created_at,
    publisherName: company?.name ?? null,
    publisherVerified: company?.is_verified ?? false,
    location: event.city ?? null,
    indicators,
    primaryAction: presentation.primaryAction,
    primaryActionLabel: presentation.primaryActionLabel,
    templateVersion: 2,
    sourceOpportunity: event,
  };
}

// ── Unified entry point ───────────────────────────────────────────────────

export function mapOpportunityToCardViewModel(
  event: NetworkPulseEvent,
  options: {
    templateVersion: number;
    specialtyName?: string | null;
    subSectorSlug?: string | null;
    fieldDefs?: FieldDefinition[];
    items?: OpportunityItemSummary[];
    v2CardFieldDefs?: V2CardFieldDef[];
    sectorLabel?: string | null;
    subSectorLabel?: string | null;
    company?: Company | null;
    partnershipProfile?: PartnershipProfileSummary | null;
    partnershipRoles?: PartnershipRoleSummary[];
  },
): OpportunityCardViewModel {
  if (options.templateVersion >= 2) {
    return mapV2OpportunityToCardViewModel(
      event,
      options.items ?? [],
      options.v2CardFieldDefs ?? [],
      options.sectorLabel ?? null,
      options.subSectorLabel ?? null,
      options.company ?? null,
      options.partnershipProfile ?? null,
      options.partnershipRoles ?? [],
    );
  }

  return mapLegacyPalmToOpportunityCardViewModel(
    event,
    options.specialtyName ?? null,
    options.subSectorSlug ?? null,
    options.fieldDefs ?? [],
    options.sectorLabel ?? null,
    options.company ?? null,
  );
}
