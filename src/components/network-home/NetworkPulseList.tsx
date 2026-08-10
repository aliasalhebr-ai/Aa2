import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type {
  NetworkPulseEvent, Company, FieldDefinition, SubSector, Sector,
  OpportunityCardViewModel, OpportunityItemSummary, ItemFieldDefinition,
  PartnershipProfileSummary, PartnershipRoleSummary,
} from '@/types';
import {
  getNetworkPulse, getCompaniesByIds, getFieldDefinitions,
  getPalmVarieties, getPalmServiceBranches,
  getPalmServiceItems, getPalmResidueTypes, getMeasurementUnits,
  getOpportunityItemsBatch, getV2CardFieldDefsBatch,
  getPartnershipProfilesBatch, getPartnershipRolesBatch,
} from '@/services/domainService';
import { initLookupMaps, isLookupMapsInitialized } from '@/lib/cardFormatters';
import {
  mapOpportunityToCardViewModel,
  filterCardVisibleFieldDefs,
} from '@/lib/opportunityCardMapper';
import NetworkPulseCard from '@/components/network-home/NetworkPulseCard';
import NetworkPulseSkeleton from '@/components/network-home/NetworkPulseSkeleton';
import EmptyState from '@/components/network-home/EmptyState';

type Props = {
  sectorId: string;
  subSectorId: string | null;
  searchQuery: string;
  filters: Record<string, string>;
  sortBy: string;
  isLoggedIn: boolean;
  subSectors: SubSector[];
  sectors: Sector[];
  onViewDetails: (event: NetworkPulseEvent) => void;
  onSave: (event: NetworkPulseEvent) => void;
  onCompanyClick: (company: Company) => void;
  onAddOpportunity: () => void;
};

const PAGE_SIZE = 8;

type CardState = {
  vm: OpportunityCardViewModel;
  imageUrl: string | null;
};

export default function NetworkPulseList({
  sectorId,
  subSectorId,
  searchQuery,
  filters,
  sortBy,
  isLoggedIn,
  subSectors,
  sectors,
  onViewDetails,
  onSave,
  onCompanyClick,
  onAddOpportunity,
}: Props) {
  const [cards, setCards] = useState<CardState[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);
  const scrollPosRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const v1FieldDefsCache = useRef<Record<string, FieldDefinition[]>>({});

  const { names: subSectorNames, slugs: subSectorSlugs } = useMemo(() => {
    const names: Record<string, string> = {};
    const slugs: Record<string, string> = {};
    for (const s of subSectors) {
      names[s.id] = s.name;
      slugs[s.id] = s.slug;
    }
    return { names, slugs };
  }, [subSectors]);

  const sectorLabel = useMemo(() => {
    return sectors.find((s) => s.id === sectorId)?.name ?? null;
  }, [sectors, sectorId]);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    const reqId = ++reqIdRef.current;
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      // ── Query 1: Opportunities (single query) ──
      const data = await getNetworkPulse({
        sectorId, subSectorId, searchQuery, filters, sortBy,
        page: pageNum, pageSize: PAGE_SIZE,
      });
      if (reqId !== reqIdRef.current) return;

      if (data.length < PAGE_SIZE) setHasMore(false);
      else setHasMore(true);

      // ── Query 2: Companies (single batch) ──
      const companyIds = [...new Set(data.map((e) => e.company_id).filter(Boolean))] as string[];
      const companiesMap: Record<string, Company> = {};
      if (companyIds.length > 0) {
        const comps = await getCompaniesByIds(companyIds);
        if (reqId !== reqIdRef.current) return;
        for (const c of comps) companiesMap[c.id] = c;
      }

      // ── Split V1 / V2 ──
      const v2Events = data.filter((e) => (e.template_version ?? 1) >= 2);
      const v1Events = data.filter((e) => (e.template_version ?? 1) < 2);

      // ── Query 3: V2 opportunity items (single batch IN) ──
      let v2ItemsMap: Record<string, OpportunityItemSummary[]> = {};
      if (v2Events.length > 0) {
        v2ItemsMap = await getOpportunityItemsBatch(v2Events.map((e) => e.id));
        if (reqId !== reqIdRef.current) return;
      }

      // ── Query 4: V2 card field definitions (cached, single batch) ──
      const v2OpTypes = [...new Set(
        v2Events.map((e) => e.opportunity_type ?? e.activity_subtype).filter(Boolean),
      )] as string[];
      let v2FieldDefsMap: Record<string, ItemFieldDefinition[]> = {};
      if (v2OpTypes.length > 0) {
        v2FieldDefsMap = await getV2CardFieldDefsBatch(sectorId, v2OpTypes, 2, subSectorId);
        if (reqId !== reqIdRef.current) return;
      }

      // ── Query 5+6: Partnership profiles + roles (single batch each, only for partnership opps) ──
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
        if (reqId !== reqIdRef.current) return;
      }

      // ── Query 7: V1 field definitions (cached per subSector+opType) ──
      const v1DefKeys = new Set<string>();
      for (const e of v1Events) {
        if (e.sub_sector_id && e.activity_subtype) {
          v1DefKeys.add(`${e.sub_sector_id}:${e.activity_subtype}`);
        }
      }
      for (const key of v1DefKeys) {
        if (!v1FieldDefsCache.current[key]) {
          const [ssId, opType] = key.split(':');
          try {
            const defs = await getFieldDefinitions(ssId, opType);
            if (reqId !== reqIdRef.current) return;
            v1FieldDefsCache.current[key] = defs;
          } catch { /* ignore */ }
        }
      }

      // ── Build ViewModels in memory ──
      const newCards: CardState[] = data.map((event) => {
        const tv = event.template_version ?? 1;
        const company = event.company_id ? companiesMap[event.company_id] ?? null : null;
        const subSecName = subSectorNames[event.sub_sector_id ?? ''] ?? null;
        const subSecSlug = subSectorSlugs[event.sub_sector_id ?? ''] ?? null;

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
          const defKey = event.sub_sector_id && event.activity_subtype
            ? `${event.sub_sector_id}:${event.activity_subtype}` : '';
          const fieldDefs = defKey ? v1FieldDefsCache.current[defKey] ?? [] : [];

          vm = mapOpportunityToCardViewModel(event, {
            templateVersion: 1,
            specialtyName: subSecName,
            subSectorSlug: subSecSlug,
            fieldDefs,
            sectorLabel,
            subSectorLabel: subSecName,
            company,
          });
        }

        return { vm, imageUrl: vm.image };
      });

      setCards((prev) => (append ? [...prev, ...newCards] : newCards));
      setError(null);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setError('حدث خطأ أثناء تحميل الأنشطة');
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [sectorId, subSectorId, searchQuery, filters, sortBy, sectorLabel, subSectorNames, subSectorSlugs]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPage(1, false);
  }, [fetchPage]);

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

  useEffect(() => {
    return () => {
      if (containerRef.current) scrollPosRef.current = window.scrollY;
    };
  }, []);

  useEffect(() => {
    if (!loading && scrollPosRef.current > 0) {
      window.scrollTo(0, scrollPosRef.current);
      scrollPosRef.current = 0;
    }
  }, [loading]);

  const handleLoadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }, [page, fetchPage]);

  const handleViewDetails = useCallback((vm: OpportunityCardViewModel) => {
    onViewDetails(vm.sourceOpportunity);
  }, [onViewDetails]);

  const handleSave = useCallback((vm: OpportunityCardViewModel) => {
    onSave(vm.sourceOpportunity);
  }, [onSave]);

  const handleCompanyClick = useCallback((vm: OpportunityCardViewModel) => {
    onViewDetails(vm.sourceOpportunity);
  }, [onViewDetails]);

  if (loading) return <NetworkPulseSkeleton count={4} />;

  if (error) {
    return (
      <div className="px-4 py-10 text-center animate-fade-in">
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button
          onClick={() => fetchPage(1, false)}
          className="tap-scale px-4 py-2 bg-siwar-600 text-white rounded-lg text-sm font-medium hover:bg-siwar-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (cards.length === 0) {
    return <EmptyState isLoggedIn={isLoggedIn} onAddOpportunity={onAddOpportunity} />;
  }

  return (
    <div ref={containerRef} className="px-3 sm:px-4 space-y-3 stagger">
      {cards.map(({ vm, imageUrl }) => (
        <NetworkPulseCard
          key={`${vm.sourceOpportunity.activity_type}-${vm.id}`}
          viewModel={vm}
          imageUrl={imageUrl}
          onViewDetails={handleViewDetails}
          onSave={handleSave}
          onCompanyClick={handleCompanyClick}
        />
      ))}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="tap-scale w-full py-3 text-sm font-medium text-siwar-700 bg-siwar-50 border border-siwar-200 rounded-xl hover:bg-siwar-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loadingMore ? (
            <>
              <span className="w-4 h-4 border-2 border-siwar-300 border-t-siwar-600 rounded-full animate-spin" />
              جاري التحميل...
            </>
          ) : (
            'تحميل المزيد'
          )}
        </button>
      )}
    </div>
  );
}
