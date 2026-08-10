// ── Opportunity Matching Engine Types ──────────────────────────────────────

export type MatchType =
  | 'offer_to_demand'
  | 'demand_to_offer'
  | 'partnership_to_offer'
  | 'partnership_to_demand'
  | 'partnership_to_partnership';

export type ScoreBreakdown = {
  plant: number;
  variety: number;
  quantity: number;
  location: number;
  timing: number;
  price: number;
  specs: number;
};

export type MatchResult = {
  matched_opportunity_id: string;
  match_type: MatchType;
  total_score: number;
  score_breakdown: ScoreBreakdown;
  match_reasons: string[];
  rules_version: number;
};

export type ScoreLabel = 'تطابق ممتاز' | 'تطابق قوي' | 'تطابق جيد';

export function getScoreLabel(score: number): ScoreLabel | null {
  if (score >= 85) return 'تطابق ممتاز';
  if (score >= 70) return 'تطابق قوي';
  if (score >= 50) return 'تطابق جيد';
  return null;
}

export function getScoreColor(score: number): string {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-siwar-600';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-gray-400';
}

export const MATCHING_RULES_VERSION = 1;
