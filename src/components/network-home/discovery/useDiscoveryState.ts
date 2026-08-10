import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  DiscoveryFilters,
  DiscoverySortOption,
} from '@/types/discovery';
import {
  createEmptyFilters,
  hashFilters,
} from '@/services/opportunityDiscoveryService';

// ── Cache entry for search state persistence ────────────────────────────────
type CacheEntry = {
  searchQuery: string;
  filters: DiscoveryFilters;
  sort: DiscoverySortOption;
  page: number;
  scrollY: number;
};

// ── Cache: keyed by sectorId + subSectorId ──────────────────────────────────
// Separated so different sectors/sub-sectors don't share cache.
const cache = new Map<string, CacheEntry>();

function getCacheKey(sectorId: string, subSectorId: string | null): string {
  return `${sectorId}:${subSectorId ?? 'null'}`;
}

export function useDiscoveryState(sectorId: string, subSectorId: string | null) {
  const cacheKey = getCacheKey(sectorId, subSectorId);
  const cached = cache.get(cacheKey);

  const [searchQuery, setSearchQuery] = useState(cached?.searchQuery ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(cached?.searchQuery ?? '');
  const [filters, setFilters] = useState<DiscoveryFilters>(cached?.filters ?? createEmptyFilters());
  const [sort, setSort] = useState<DiscoverySortOption>(cached?.sort ?? 'latest');
  const [page, setPage] = useState(cached?.page ?? 1);
  const scrollYRef = useRef(cached?.scrollY ?? 0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Save state to cache on changes ──
  const saveToCache = useCallback(() => {
    cache.set(cacheKey, {
      searchQuery,
      filters,
      sort,
      page,
      scrollY: scrollYRef.current,
    });
  }, [cacheKey, searchQuery, filters, sort, page]);

  // ── Debounce search ──
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  // ── Filter handlers ──
  const handleFilterChange = useCallback(<K extends keyof DiscoveryFilters>(
    key: K,
    value: DiscoveryFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleClearFilter = useCallback((key: keyof DiscoveryFilters) => {
    setFilters((prev) => ({ ...prev, [key]: null }));
    setPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setFilters(createEmptyFilters());
    setSearchQuery('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  const handleSortChange = useCallback((value: DiscoverySortOption) => {
    setSort(value);
    setPage(1);
  }, []);

  // ── Save scroll position ──
  const saveScrollPosition = useCallback(() => {
    scrollYRef.current = window.scrollY;
    saveToCache();
  }, [saveToCache]);

  // ── Restore scroll position after load ──
  const restoreScroll = useCallback(() => {
    if (scrollYRef.current > 0) {
      window.scrollTo({ top: scrollYRef.current, behavior: 'instant' });
      scrollYRef.current = 0;
    }
  }, []);

  // ── Save to cache on unmount or state change ──
  useEffect(() => {
    saveToCache();
  }, [saveToCache]);

  // ── Reset state when sector/sub-sector changes (unless we have cache) ──
  useEffect(() => {
    const entry = cache.get(cacheKey);
    if (entry) {
      setSearchQuery(entry.searchQuery);
      setDebouncedSearch(entry.searchQuery);
      setFilters(entry.filters);
      setSort(entry.sort);
      setPage(entry.page);
      scrollYRef.current = entry.scrollY;
    } else {
      setSearchQuery('');
      setDebouncedSearch('');
      setFilters(createEmptyFilters());
      setSort('latest');
      setPage(1);
      scrollYRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return {
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
    filtersHash: hashFilters(filters),
  };
}
