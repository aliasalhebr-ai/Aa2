import type { OpportunityTypePresentation, OpportunityTypeStyle, PrimaryCardAction } from '@/types';

const STYLES: Record<string, OpportunityTypeStyle> = {
  offer:       { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  demand:      { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500' },
  partnership: { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500' },
};

const PRESENTATIONS: Record<string, OpportunityTypePresentation> = {
  offer: {
    type: 'offer',
    label: 'عرض',
    style: STYLES.offer,
    iconKey: 'Tag',
    primaryAction: 'view_details',
    primaryActionLabel: 'عرض التفاصيل',
  },
  demand: {
    type: 'demand',
    label: 'احتياج',
    style: STYLES.demand,
    iconKey: 'ShoppingCart',
    primaryAction: 'submit_offer',
    primaryActionLabel: 'تقديم عرض',
  },
  partnership: {
    type: 'partnership',
    label: 'شراكة',
    style: STYLES.partnership,
    iconKey: 'Handshake',
    primaryAction: 'view_partnership',
    primaryActionLabel: 'استعراض الشراكة',
  },
};

const FALLBACK: OpportunityTypePresentation = {
  type: 'unknown',
  label: 'فرصة',
  style: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
  iconKey: 'Sparkles',
  primaryAction: 'view_details' as PrimaryCardAction,
  primaryActionLabel: 'عرض التفاصيل',
};

export function resolveOpportunityTypePresentation(
  operationType: string | null | undefined,
): OpportunityTypePresentation {
  if (!operationType) return FALLBACK;
  return PRESENTATIONS[operationType] ?? FALLBACK;
}
