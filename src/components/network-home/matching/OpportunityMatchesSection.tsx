import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import type {
  NetworkPulseEvent,
  Company,
  Sector,
  SubSector,
  OpportunityCardViewModel,
  OpportunityItemSummary,
  ItemFieldDefinition,
  PartnershipProfileSummary,
  PartnershipRoleSummary,
} from '@/types';
import type { MatchResult } from '@/types/matching';
import { getScoreLabel } from '@/types/matching';
import {
  findOpportunityMatches,
  fetchMatchedOpportunitiesByIds,
  invalidateMatchCache,
} from '@/services/opportunityMatchingService';
import {
  getCompaniesByIds,
  getPalmVarieties,
  getPalmServiceBranches,
  getPalmServiceItems,
  getPalmResidueTypes,
  getMeasurementUnits,
  getOpportunityItemsBatch,
  getV2CardFieldDefsBatch,
  getPartnershipProfilesBatch,
  getPartnershipRolesBatch,
} from '@/services/domainService';
import { initLookupMaps, isLookupMapsInitialized } from '@/lib/cardFormatters';
import {
  mapOpportunityToCardViewModel,
  filterCardVisibleFieldDefs,
} from '@/lib/opportunityCardMapper';
import NetworkPulseSkeleton from '@/components/network-home/NetworkPulseSkeleton';
import MatchedOpportunityCard from './MatchedOpportunityCard';

type Props = {
  sourceOpportunity: NetworkPulseEvent;
  sectorId: string;
  subSectorId: string | null;
  sectors: Sector[];
  subSectors: SubSector[];
  onViewDetails: (event: NetworkPulseEvent) => void;
  onSave: (event: NetworkPulseEvent) => void;
  onCompanyClick: (company: Company) => void;
};

type CardState = {
  vm: OpportunityCardViewModel;
  imageUrl: string | null;
  score: number;
  reasons: string[];
};

type FilterTab = 'all' | 'offer' | 'demand' | 'partnership';

export default function OpportunityMatchesSection({
  sourceOpportunity,
  sectorId,
  subSectorId,
  sectors,
  subSectors,
  onViewDetails,
  onSave,
  onCompanyClick,
}: Props) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [cards, setCards] = useState<CardState[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const reqIdRef = useRef(0);

  const sectorLabel = useMemo(
    () => sectors.find((s) => s.id === sectorId)?.name ?? null,
    [sectors, sectorId],
  );

  const { names: subSectorNames, slugs: subSectorSlugs } = useMemo(() => {
    const names: Record<string, string> = {};
    const slugs: Record<string, string> = {};
    for (const s of subSectors) {
      names[s.id] = s.name;
      slugs[s.id] = s.slug;
    }
    return { names, slugs };
  }, [subSectors]);

  // ── Build card view models from match results ──
  const buildCards = useCallback(
    async (matchResults: MatchResult[]): Promise<CardState[]> => {
      if (matchResults.length === 0) return [];

      const ids = matchResults.map((m) => m.matched_opportunity_id);

      // ── Query 1: Fetch full opportunity rows ──
      const oppMap = await fetchMatchedOpportunitiesByIds(ids);
      const data = ids
        .map((id) => oppMap[id])
        .filter((row): row is NetworkPulseEvent => row !== undefined) as NetworkPulseEvent[];

      if (data.length === 0) return [];

      // ── Query 2: Companies ──
      const companyIds = [...new Set(data.map((e) => e.company_id).filter(Boolean))] as string[];
      const companiesMap: Record<string, Company> = {};
      if (companyIds.length > 0) {
        const comps = await getCompaniesByIds(companyIds);
        for (const c of comps) companiesMap[c.id] = c;
      }

      // ── Split V1 / V2 ──
      const v2Events = data.filter((e) => (e.template_version ?? 1) >= 2);
      const v1Events = data.filter((e) => (e.template_version ?? 1) < 2);

      // ── Query 3: V2 items ──
      let v2ItemsMap: Record<string, OpportunityItemSummary[]> = {};
      if (v2Events.length > 0) {
        v2ItemsMap = await getOpportunityItemsBatch(v2Events.map((e) => e.id));
      }

      // ── Query 4: V2 card field defs ──
      const v2OpTypes = [...new Set(
        v2Events.map((e) => e.opportunity_type ?? e.activity_subtype).filter(Boolean),
      )] as string[];
      let v2FieldDefsMap: Record<string, ItemFieldDefinition[]> = {};
      if (v2OpTypes.length > 0) {
        v2FieldDefsMap = await getV2CardFieldDefsBatch(sectorId, v2OpTypes, 2, subSectorId);
      }

      // ── Query 5: Partnership data ──
      const partnershipOppIds = v2Events
        .filter((e) => (e.opportunity_type ?? e.activity_subtype) === 'partnership')
        .map((e) => e.id);

      let partnershipProfilesMap: Record<string, PartnershipProfileSummary> = {};
      let partnershipRolesMap: Record<string, PartnershipRoleSummary[]> = {};
      if (partnershipOppIds.length > 0) {
        [partnershipProfilesMap, partnershipRolesMap] = await Promise.all([
          getPartnershipProfilesBatch(partnershipOppIds),
          getPartnershipRolesBatch(partnershipOppIds),
        ]);
      }

      // ── Build ViewModels ──
      const matchMap = new Map(matchResults.map((m) => [m.matched_opportunity_id, m]));

      return data.map((event): CardState => {
        const tv = event.template_version ?? 1;
        const company = event.company_id ? companiesMap[event.company_id] ?? null : null;
        const subSecName = subSectorNames[event.sub_sector_id ?? ''] ?? null;
        const subSecSlug = subSectorSlugs[event.sub_sector_id ?? ''] ?? null;
        const match = matchMap.get(event.id);

        let vm: OpportunityCardViewModel;

        if (tv >= 2) {
          const opType = event.opportunity_type ?? event.activity_subtype ?? '';
          const fieldDefs = v2FieldDefsMap[opType] ?? [];
          const cardFieldDefs = filterCardVisibleFieldDefs(fieldDefs);
          const items = v2ItemsMap[event.id] ?? [];

          vm = mapOpportunityToCardViewModel(event, {
            templateVersion: 2,
            items,
            v2CardFieldDefs: cardFieldDefs,
            sectorLabel,
            subSectorLabel: subSecName,
            company,
            partnershipProfile: partnershipProfilesMap[event.id] ?? null,
            partnershipRoles: partnershipRolesMap[event.id] ?? [],
          });
        } else {
          vm = mapOpportunityToCardViewModel(event, {
            templateVersion: 1,
            specialtyName: subSecName,
            subSectorSlug: subSecSlug,
            fieldDefs: [],
            sectorLabel,
            subSectorLabel: subSecName,
            company,
          });
        }

        return {
          vm,
          imageUrl: vm.image,
          score: match?.total_score ?? 0,
          reasons: match?.match_reasons ?? [],
        };
      });
    },
    [sectorId, subSectorId, sectorLabel, subSectorNames, subSectorSlugs],
  );

  // ── Fetch matches ──
  const fetchMatches = useCallback(
    async (forceRefresh: boolean) => {
      const reqId = ++reqIdRef.current;
      if (forceRefresh) {
        setRefreshing(true);
        invalidateMatchCache(sourceOpportunity.id);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const results = await findOpportunityMatches(sourceOpportunity.id, {
          limit: 10,
          minimumScore: 50,
          forceRefresh,
        });
        if (reqId !== reqIdRef.current) return;

        setMatches(results);

        const builtCards = await buildCards(results);
        if (reqId !== reqIdRef.current) return;

        setCards(builtCards);
      } catch {
        if (reqId === reqIdRef.current) {
          setError('تعذّر تحميل الفرص المناسبة');
        }
      } finally {
        if (reqId === reqIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [sourceOpportunity.id, buildCards],
  );

  // ── Initial load ──
  useEffect(() => {
    fetchMatches(false);
  }, [fetchMatches]);

  // ── Initialize lookup maps for V1 cards ──
  useEffect(() => {
    let cancelled = false;
    if (!isLookupMapsInitialized()) {
      Promise.all([
        getPalmVarieties(), getPalmServiceBranches(), getPalmServiceItems(),
        getPalmResidueTypes(), getMeasurementUnits(),
      ]).then(([v, b, i, r, u]) => {
        if (!cancelled) initLookupMaps(v, b, i, r, u);
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [sectorId]);

  // ── Filter by tab ──
  const filteredCards = useMemo(() => {
    if (activeTab === 'all') return cards;
    return cards.filter((c) => c.vm.opportunityType === activeTab);
  }, [cards, activeTab]);

  const handleRefresh = useCallback(() => {
    fetchMatches(true);
  }, [fetchMatches]);

  const handleViewDetails = useCallback(
    (vm: OpportunityCardViewModel) => {
      onViewDetails(vm.sourceOpportunity);
    },
    [onViewDetails],
  );

  const handleSave = useCallback(
    (vm: OpportunityCardViewModel) => {
      onSave(vm.sourceOpportunity);
    },
    [onSave],
  );

  const handleCompanyClick = useCallback(
    (vm: OpportunityCardViewModel) => {
      onCompanyClick(vm.sourceOpportunity as unknown as Company);
    },
    [onCompanyClick],
  );

  // ── Render ──
  return (
    <div className="px-4 py-4 mt-2 bg-gradient-to-b from-siwar-50/40 to-transparent rounded-t-2xl">
      {/* Section header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-siwar-100">
            <Sparkles className="w-4 h-4 text-siwar-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">فرص مناسبة لهذه الفرصة</h3>
            <p className="text-[11px] text-gray-400">اخترنا هذه الفرص بناءً على النبات والكمية والموقع والتوقيت</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="tap-scale flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Filter tabs */}
      {matches.length > 0 && (
        <div className="flex gap-1.5 mt-3 mb-3">
          {([
            { key: 'all', label: 'الكل' },
            { key: 'offer', label: 'عروض' },
            { key: 'demand', label: 'احتياجات' },
            { key: 'partnership', label: 'شراكات' },
          ] as { key: FilterTab; label: string }[]).map((tab) => {
            const count = tab.key === 'all'
              ? cards.length
              : cards.filter((c) => c.vm.opportunityType === tab.key).length;
            if (count === 0) return null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`tap-scale px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-siwar-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <NetworkPulseSkeleton count={3} />
      ) : error ? (
        <div className="py-6 text-center">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-xs text-red-500 mb-3">{error}</p>
          <button
            onClick={handleRefresh}
            className="tap-scale px-4 py-2 bg-siwar-50 border border-siwar-200 text-siwar-700 rounded-lg text-xs font-medium hover:bg-siwar-100 transition-all"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="py-8 text-center">
          <Sparkles className="w-7 h-7 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium mb-1">لا توجد فرص مطابقة حاليًا</p>
          <p className="text-xs text-gray-400">ستظهر هنا الفرص المناسبة عند نشر فرص جديدة.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger">
          {filteredCards.map(({ vm, imageUrl, score, reasons }) => (
            <MatchedOpportunityCard
              key={`${vm.sourceOpportunity.activity_type}-${vm.id}`}
              viewModel={vm}
              imageUrl={imageUrl}
              score={score}
              reasons={reasons}
              onViewDetails={handleViewDetails}
              onSave={handleSave}
              onCompanyClick={handleCompanyClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
