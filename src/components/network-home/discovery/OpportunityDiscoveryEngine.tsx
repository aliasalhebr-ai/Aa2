import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SlidersHorizontal, ChevronDown, ArrowUpDown, MapPin, Tag } from 'lucide-react';
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
import {
  searchOpportunities,
  fetchOpportunitiesByIds,
  countActiveFilters,
  hasActiveFilters,
  SORT_OPTIONS,
} from '@/services/opportunityDiscoveryService';
import type { DiscoveryFilters, DiscoveryFilterChip } from '@/types/discovery';
import { useDiscoveryState } from './useDiscoveryState';
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
import NetworkPulseCard from '@/components/network-home/NetworkPulseCard';
import NetworkPulseSkeleton from '@/components/network-home/NetworkPulseSkeleton';
import DiscoveryFilterPanel from './DiscoveryFilterPanel';
import ActiveFilterChips from './ActiveFilterChips';
import DiscoveryResultsHeader from './DiscoveryResultsHeader';

type Props = {
  sectorId: string;
  subSectorId: string | null;
  sector: Sector | null;
  subSectors: SubSector[];
  sectors: Sector[];
  isLoggedIn: boolean;
  onViewDetails: (event: NetworkPulseEvent) => void;
  onSave: (event: NetworkPulseEvent) => void;
  onCompanyClick: (company: Company) => void;
  onAddOpportunity: () => void;
};

const PAGE_SIZE = 10;

type CardState = {
  vm: OpportunityCardViewModel;
  imageUrl: string | null;
};

export default function OpportunityDiscoveryEngine({
  sectorId,
  subSectorId,
  sector,
  subSectors,
  sectors,
  isLoggedIn,
  onViewDetails,
  onSave,
  onCompanyClick,
  onAddOpportunity,
}: Props) {
  const {
    searchQuery,
    debouncedSearch,
    filters,
    sort,
    page,
    setPage,
    handleSearchChange,
    handleFilterChange,
    handleClearFilter,
    handleClearAll,
    handleSortChange,
    saveScrollPosition,
    restoreScroll,
  } = useDiscoveryState(sectorId, subSectorId);

  const [cards, setCards] = useState<CardState[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);
  const v1FieldDefsCache = useRef<Record<string, unknown>>({});

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

  const activeCount = countActiveFilters(filters);

  // ── Build filter chips for display ──
  const filterChips: DiscoveryFilterChip[] = useMemo(() => {
    const chips: DiscoveryFilterChip[] = [];
    if (filters.opportunityType) {
      const opt = SORT_OPTIONS.find((o) => o.value === filters.opportunityType as unknown as string);
      const label = filters.opportunityType === 'offer' ? 'عرض' : filters.opportunityType === 'demand' ? 'احتياج' : 'شراكة';
      chips.push({ key: 'opportunityType', label: 'النوع', valueLabel: label, filterKey: 'opportunityType' });
    }
    if (filters.subSectorId) {
      const name = subSectors.find((s) => s.id === filters.subSectorId)?.name ?? filters.subSectorId;
      chips.push({ key: 'subSectorId', label: 'الفرع', valueLabel: name, filterKey: 'subSectorId' });
    }
    if (filters.city) {
      chips.push({ key: 'city', label: 'المدينة', valueLabel: filters.city, filterKey: 'city' });
    }
    if (filters.opportunityTiming) {
      const timingLabels: Record<string, string> = {
        available_now: 'متاح الآن',
        future_production: 'إنتاج مستقبلي',
        scheduled: 'موعد محدد',
        flexible: 'موعد مرن',
      };
      chips.push({ key: 'opportunityTiming', label: 'التوقيت', valueLabel: timingLabels[filters.opportunityTiming] ?? filters.opportunityTiming, filterKey: 'opportunityTiming' });
    }
    if (filters.plantId) {
      chips.push({ key: 'plantId', label: 'النبات', valueLabel: 'محدد', filterKey: 'plantId' });
    }
    if (filters.varietyId) {
      chips.push({ key: 'varietyId', label: 'الصنف', valueLabel: 'محدد', filterKey: 'varietyId' });
    }
    if (filters.quantityMin !== null || filters.quantityMax !== null) {
      const val = `${filters.quantityMin ?? 0} - ${filters.quantityMax ?? '∞'}`;
      chips.push({ key: 'quantity', label: 'الكمية', valueLabel: val, filterKey: 'quantityMin' });
    }
    if (filters.priceMin !== null || filters.priceMax !== null) {
      const val = `${filters.priceMin ?? 0} - ${filters.priceMax ?? '∞'}`;
      chips.push({ key: 'price', label: 'السعر', valueLabel: val, filterKey: 'priceMin' });
    }
    if (filters.isVerified === true) {
      chips.push({ key: 'isVerified', label: 'موثقة', valueLabel: 'نعم', filterKey: 'isVerified' });
    }
    if (filters.includesPlanting === true) {
      chips.push({ key: 'includesPlanting', label: 'يشمل الغرس', valueLabel: 'نعم', filterKey: 'includesPlanting' });
    }
    if (filters.includesTransport === true) {
      chips.push({ key: 'includesTransport', label: 'يشمل النقل', valueLabel: 'نعم', filterKey: 'includesTransport' });
    }
    if (filters.partnershipType) {
      chips.push({ key: 'partnershipType', label: 'نوع الشراكة', valueLabel: filters.partnershipType, filterKey: 'partnershipType' });
    }
    if (filters.partnershipRoleKey) {
      chips.push({ key: 'partnershipRoleKey', label: 'الدور', valueLabel: filters.partnershipRoleKey, filterKey: 'partnershipRoleKey' });
    }
    return chips;
  }, [filters, subSectors]);

  // ── Fetch page ──
  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    const reqId = ++reqIdRef.current;
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      // ── Query 1: Search RPC ──
      const result = await searchOpportunities({
        sectorId,
        searchQuery: debouncedSearch,
        filters,
        sort,
        page: pageNum,
        pageSize: PAGE_SIZE,
      });
      if (reqId !== reqIdRef.current) return;

      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);

      if (result.opportunityIds.length === 0) {
        if (!append) setCards([]);
        return;
      }

      // ── Query 2: Fetch full opportunity rows by IDs ──
      const oppMap = await fetchOpportunitiesByIds(result.opportunityIds);
      if (reqId !== reqIdRef.current) return;

      const data = result.opportunityIds
        .map((id) => oppMap[id])
        .filter((row): row is NetworkPulseEvent => row !== undefined) as NetworkPulseEvent[];

      // ── Query 3: Companies ──
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

      // ── Query 4: V2 items ──
      let v2ItemsMap: Record<string, OpportunityItemSummary[]> = {};
      if (v2Events.length > 0) {
        v2ItemsMap = await getOpportunityItemsBatch(v2Events.map((e) => e.id));
        if (reqId !== reqIdRef.current) return;
      }

      // ── Query 5: V2 card field defs ──
      const v2OpTypes = [...new Set(
        v2Events.map((e) => e.opportunity_type ?? e.activity_subtype).filter(Boolean),
      )] as string[];
      let v2FieldDefsMap: Record<string, ItemFieldDefinition[]> = {};
      if (v2OpTypes.length > 0) {
        v2FieldDefsMap = await getV2CardFieldDefsBatch(sectorId, v2OpTypes, 2, subSectorId);
        if (reqId !== reqIdRef.current) return;
      }

      // ── Query 6: Partnership data ──
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

      // ── Build ViewModels ──
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

        return { vm, imageUrl: vm.image };
      });

      setCards((prev) => (append ? [...prev, ...newCards] : newCards));
      setError(null);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setError('حدث خطأ أثناء البحث');
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [sectorId, subSectorId, debouncedSearch, filters, sort, sectorLabel, subSectorNames, subSectorSlugs]);

  // ── Initial load and on filter/search/sort change ──
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPage(1, false);
  }, [fetchPage, setPage]);

  // ── Initialize lookup maps (for V1 card formatting) ──
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

  // ── Restore scroll position after load ──
  useEffect(() => {
    if (!loading) {
      restoreScroll();
    }
  }, [loading, restoreScroll]);

  // ── Save scroll on unmount ──
  useEffect(() => {
    return () => saveScrollPosition();
  }, [saveScrollPosition]);

  const handleLoadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }, [page, fetchPage, setPage]);

  const handleViewDetails = useCallback((vm: OpportunityCardViewModel) => {
    saveScrollPosition();
    onViewDetails(vm.sourceOpportunity);
  }, [onViewDetails, saveScrollPosition]);

  const handleSave = useCallback((vm: OpportunityCardViewModel) => {
    onSave(vm.sourceOpportunity);
  }, [onSave]);

  const handleCompanyClick = useCallback((vm: OpportunityCardViewModel) => {
    onCompanyClick(vm.sourceOpportunity as unknown as Company);
  }, [onCompanyClick]);

  const opportunityTypeLabel = useMemo(() => {
    if (!filters.opportunityType) return null;
    return filters.opportunityType === 'offer' ? 'عرض'
      : filters.opportunityType === 'demand' ? 'احتياج'
      : 'شراكة';
  }, [filters.opportunityType]);

  const chipStyle = (isActive: boolean): React.CSSProperties => ({
    height: '36px',
    background: isActive ? '#f0faf4' : '#fff',
    border: isActive ? '1.5px solid #1b5e35' : '1.5px solid #d1d5db',
    color: isActive ? '#1b5e35' : '#374151',
  });

  const sortLabel = SORT_OPTIONS.find((s) => s.value === sort)?.label ?? 'الفرز';
  const hasTypeFilter = !!filters.opportunityType;
  const hasLocationFilter = !!filters.city;

  return (
    <div className="space-y-0">
      {/* Unified filter chip row — matches SectorFilterBar visual style */}
      <div className="px-3 sm:px-4 pb-2 pt-0">
        <div className="no-scrollbar touch-scroll overflow-x-auto">
          <div className="flex gap-2 pb-1 items-center" style={{ width: 'max-content' }}>
            {/* Sort chip */}
            <button
              onClick={() => {
                const idx = SORT_OPTIONS.findIndex((s) => s.value === sort);
                const next = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length];
                handleSortChange(next.value as typeof sort);
              }}
              className="tap-scale flex items-center gap-1.5 px-4 rounded-full transition-all duration-200 flex-shrink-0 text-xs font-medium"
              style={chipStyle(true)}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortLabel}
            </button>

            {/* Opportunity type chip */}
            <button
              onClick={() => setShowFilterPanel(true)}
              className="tap-scale flex items-center gap-1.5 px-4 rounded-full transition-all duration-200 flex-shrink-0 text-xs font-medium"
              style={chipStyle(hasTypeFilter)}
            >
              <Tag className="w-3.5 h-3.5" />
              نوع الفرصة
              {hasTypeFilter && (
                <span className="text-[10px] text-siwar-600 font-bold bg-siwar-100 px-1.5 py-0.5 rounded-full">
                  {opportunityTypeLabel}
                </span>
              )}
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Location chip */}
            <button
              onClick={() => setShowFilterPanel(true)}
              className="tap-scale flex items-center gap-1.5 px-4 rounded-full transition-all duration-200 flex-shrink-0 text-xs font-medium"
              style={chipStyle(hasLocationFilter)}
            >
              <MapPin className="w-3.5 h-3.5" />
              الموقع
              {hasLocationFilter && (
                <span className="text-[10px] text-siwar-600 font-bold bg-siwar-100 px-1.5 py-0.5 rounded-full">
                  {filters.city}
                </span>
              )}
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Advanced filters chip */}
            <button
              onClick={() => setShowFilterPanel(true)}
              className="tap-scale flex items-center gap-1.5 px-4 rounded-full transition-all duration-200 flex-shrink-0 text-xs font-medium"
              style={chipStyle(activeCount > 0)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              فلاتر متقدمة
              {activeCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-[9px] font-bold text-white rounded-full" style={{ background: '#1b5e35' }}>
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips
        filters={filters}
        chips={filterChips}
        onRemove={(key) => handleClearFilter(key)}
        onClearAll={handleClearAll}
      />

      {/* Results count */}
      <DiscoveryResultsHeader
        totalCount={totalCount}
        loading={loading}
        sectorLabel={sectorLabel}
        opportunityTypeLabel={opportunityTypeLabel}
      />

      {/* Results */}
      {loading ? (
        <NetworkPulseSkeleton count={4} />
      ) : error ? (
        <div className="px-4 py-10 text-center animate-fade-in">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button
            onClick={() => fetchPage(1, false)}
            className="tap-scale px-4 py-2 bg-siwar-600 text-white rounded-lg text-sm font-medium hover:bg-siwar-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : cards.length === 0 ? (
        <div className="px-4 py-12 text-center animate-fade-in">
          <p className="text-sm text-gray-700 mb-1 font-bold">
            لم نجد فرصًا مطابقة لهذه الفلاتر
          </p>
          <p className="text-sm text-gray-400 mb-4">
            جرّب توسيع نطاق البحث أو إزالة بعض الفلاتر
          </p>
          {hasActiveFilters(filters) && (
            <button
              onClick={handleClearAll}
              className="tap-scale px-5 py-2.5 bg-siwar-50 border border-siwar-200 text-siwar-700 rounded-xl text-sm font-bold hover:bg-siwar-100 transition-all"
            >
              مسح جميع الفلاتر
            </button>
          )}
        </div>
      ) : (
        <div className="px-3 sm:px-4 space-y-3 stagger">
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
      )}

      {/* Filter bottom sheet */}
      <DiscoveryFilterPanel
        open={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        sort={sort}
        onSortChange={handleSortChange}
        sectorId={sectorId}
        subSectors={subSectors.map((s) => ({ id: s.id, name: s.name }))}
        activeCount={activeCount}
      />
    </div>
  );
}
