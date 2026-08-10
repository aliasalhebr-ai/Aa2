import { supabase } from '@/lib/supabase';
import type { MatchResult, MatchType } from '@/types/matching';

// ── In-memory cache: sourceOpportunityId → { results, ts } ──
type CacheEntry = { results: MatchResult[]; ts: number };
const matchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): MatchResult[] | null {
  const entry = matchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    matchCache.delete(key);
    return null;
  }
  return entry.results;
}

function setCached(key: string, results: MatchResult[]) {
  matchCache.set(key, { results, ts: Date.now() });
}

export function invalidateMatchCache(sourceOpportunityId?: string) {
  if (sourceOpportunityId) {
    matchCache.delete(sourceOpportunityId);
  } else {
    matchCache.clear();
  }
}

// ── Main matching function ──
export async function findOpportunityMatches(
  sourceOpportunityId: string,
  options?: { limit?: number; minimumScore?: number; forceRefresh?: boolean },
): Promise<MatchResult[]> {
  const limit = options?.limit ?? 10;
  const minimumScore = options?.minimumScore ?? 50;
  const forceRefresh = options?.forceRefresh ?? false;

  if (!forceRefresh) {
    const cached = getCached(sourceOpportunityId);
    if (cached) return cached;
  }

  const { data, error } = await supabase.rpc('find_opportunity_matches_v2', {
    p_source_opportunity_id: sourceOpportunityId,
    p_limit: limit,
    p_minimum_score: minimumScore,
  });

  if (error) throw error;

  const results = ((data ?? []) as Array<{
    matched_opportunity_id: string;
    match_type: string;
    total_score: number;
    score_breakdown: Record<string, number>;
    match_reasons: string[];
    rules_version: number;
  }>).map((row) => ({
    matched_opportunity_id: row.matched_opportunity_id,
    match_type: row.match_type as MatchType,
    total_score: Number(row.total_score),
    score_breakdown: {
      plant: row.score_breakdown.plant ?? 0,
      variety: row.score_breakdown.variety ?? 0,
      quantity: row.score_breakdown.quantity ?? 0,
      location: row.score_breakdown.location ?? 0,
      timing: row.score_breakdown.timing ?? 0,
      price: row.score_breakdown.price ?? 0,
      specs: row.score_breakdown.specs ?? 0,
    },
    match_reasons: row.match_reasons ?? [],
    rules_version: row.rules_version,
  }));

  setCached(sourceOpportunityId, results);
  return results;
}

// ── Fetch full opportunity data by IDs (reuses network_pulse view) ──
export async function fetchMatchedOpportunitiesByIds(
  ids: string[],
): Promise<Record<string, unknown>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from('network_pulse')
    .select('*')
    .in('id', ids);

  if (error) return {};

  const map: Record<string, unknown> = {};
  for (const row of data ?? []) {
    map[row.id as string] = row;
  }
  return map;
}
