import { useState, useEffect } from 'react';
import { SlidersHorizontal, ChevronDown, Check, X, ArrowUpDown, MapPin } from 'lucide-react';
import type { FilterConfig, PalmVariety } from '@/types';
import { getPalmVarieties } from '@/services/domainService';

type Props = {
  filters: FilterConfig[];
  activeFilters: Record<string, string>;
  onFilterChange: (filterId: string, value: string) => void;
  onClearFilter: (filterId: string) => void;
  onClearAll: () => void;
  sortBy: string;
  onSortChange: (value: string) => void;
};

const SORT_OPTIONS = [
  { id: 'latest', label: 'الأحدث' },
  { id: 'oldest', label: 'الأقدم' },
];

export default function SectorFilterBar({
  filters,
  activeFilters,
  onFilterChange,
  onClearFilter,
  onClearAll,
  sortBy,
  onSortChange,
}: Props) {
  const [openFilterId, setOpenFilterId] = useState<string | null>(null);
  const [varietyOptions, setVarietyOptions] = useState<string[]>([]);
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');
  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const activeCount = Object.keys(activeFilters).length;

  const needsVarieties = filters.some((f) => f.optionsSource === 'variety');

  useEffect(() => {
    if (!needsVarieties) return;
    let cancelled = false;
    (async () => {
      try {
        const varieties = await getPalmVarieties();
        if (!cancelled) setVarietyOptions(varieties.map((v: PalmVariety) => v.name));
      } catch {
        if (!cancelled) setVarietyOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [needsVarieties]);

  // Reset range inputs when opening a range filter
  useEffect(() => {
    if (!openFilterId) return;
    const filter = filters.find((f) => (f.key ?? f.id ?? '') === openFilterId);
    if (filter?.type === 'range') {
      const existing = activeFilters[openFilterId];
      if (existing && existing.includes('-')) {
        const [min, max] = existing.split('-');
        setRangeMin(min || '');
        setRangeMax(max || '');
      } else {
        setRangeMin('');
        setRangeMax('');
      }
    }
  }, [openFilterId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getFilterOptions = (filter: FilterConfig): string[] => {
    if (filter.optionsSource === 'variety' && varietyOptions.length > 0) {
      return varietyOptions;
    }
    return filter.options ?? [];
  };

  const handleRangeApply = (filterKey: string) => {
    const min = rangeMin.trim();
    const max = rangeMax.trim();
    if (!min && !max) return;
    const value = `${min}-${max}`;
    onFilterChange(filterKey, value);
    setOpenFilterId(null);
  };

  const chipStyle = (isActive: boolean): React.CSSProperties => ({
    height: '36px',
    background: isActive ? '#f0faf4' : '#fff',
    border: isActive ? '1.5px solid #1b5e35' : '1.5px solid #d1d5db',
    color: isActive ? '#1b5e35' : '#374151',
  });

  return (
    <div className="px-3 sm:px-4 pb-2 pt-0">
      <div className="no-scrollbar touch-scroll overflow-x-auto">
        <div className="flex gap-2 pb-1 items-center" style={{ width: 'max-content' }}>
          {/* Sort chip */}
          <button
            onClick={() => setOpenFilterId(openFilterId === 'sort' ? null : 'sort')}
            className="tap-scale flex items-center gap-1.5 px-4 rounded-full transition-all duration-200 flex-shrink-0 text-xs font-medium"
            style={chipStyle(openFilterId === 'sort')}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {SORT_OPTIONS.find((s) => s.id === sortBy)?.label || 'الفرز'}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openFilterId === 'sort' ? 'rotate-180' : ''}`} />
          </button>

          {/* Filter chips */}
          {filters.filter((f) => f.isActive !== false).map((filter) => {
            const filterKey = filter.key ?? filter.id ?? '';
            const isActive = activeFilters[filterKey] !== undefined;
            const isOpen = openFilterId === filterKey;
            const showPin = filter.label?.includes('الموقع') || filter.key === 'location';
            return (
              <button
                key={filterKey}
                onClick={() => setOpenFilterId(isOpen ? null : filterKey)}
                className="tap-scale flex items-center gap-1.5 px-4 rounded-full transition-all duration-200 flex-shrink-0 text-xs font-medium"
                style={chipStyle(isOpen || isActive)}
              >
                {showPin ? <MapPin className="w-3.5 h-3.5" /> : null}
                {filter.label}
                {isActive && (
                  <span className="text-[10px] text-siwar-600 font-bold bg-siwar-100 px-1.5 py-0.5 rounded-full">
                    {activeFilters[filterKey]}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            );
          })}

          {/* Advanced filter chip */}
          <button
            className="tap-scale flex items-center gap-1.5 px-4 rounded-full transition-all duration-200 flex-shrink-0 text-xs font-medium"
            style={chipStyle(false)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            فلاتر متقدمة
          </button>
        </div>
      </div>

      {/* Bottom sheet for filter options — z-[60] to sit above BottomNavigation (z-50) */}
      {openFilterId && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] animate-fade-in"
            onClick={() => setOpenFilterId(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] animate-slide-up max-h-[65vh] overflow-y-auto fancy-scroll shadow-float">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="sticky top-0 bg-white px-5 pt-2 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-siwar-500 to-siwar-700" />
                <h4 className="text-base font-bold text-gray-800">
                  {openFilterId === 'sort' ? 'الترتيب' : filters.find((f) => (f.key ?? f.id) === openFilterId)?.label}
                </h4>
              </div>
              <button onClick={() => setOpenFilterId(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-5 py-3">
              {openFilterId === 'sort' ? (
                <div className="space-y-1.5">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { onSortChange(opt.id); setOpenFilterId(null); }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 ${
                        sortBy === opt.id
                          ? 'bg-gradient-to-l from-siwar-50 to-white text-siwar-700 border border-siwar-200 shadow-soft'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <span className="text-sm font-medium">{opt.label}</span>
                      {sortBy === opt.id && (
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-siwar-600">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(() => {
                    const filter = filters.find((f) => (f.key ?? f.id) === openFilterId);
                    if (!filter) return null;

                    // Range filter UI
                    if (filter.type === 'range') {
                      const filterKey = filter.key ?? filter.id ?? '';
                      const unit = filter.unit ?? '';
                      return (
                        <div className="space-y-4 py-2">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 space-y-1">
                              <label className="text-xs text-gray-500 font-medium">من</label>
                              <input
                                type="number"
                                value={rangeMin}
                                onChange={(e) => setRangeMin(e.target.value)}
                                placeholder="0"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100 text-sm font-medium text-right"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <label className="text-xs text-gray-500 font-medium">إلى{unit ? ` (${unit})` : ''}</label>
                              <input
                                type="number"
                                value={rangeMax}
                                onChange={(e) => setRangeMax(e.target.value)}
                                placeholder="∞"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:border-siwar-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-siwar-100 text-sm font-medium text-right"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => handleRangeApply(filterKey)}
                            disabled={!rangeMin.trim() && !rangeMax.trim()}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-l from-siwar-600 to-siwar-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            تطبيق النطاق
                          </button>
                          {activeFilters[filterKey] && (
                            <button
                              onClick={() => { onClearFilter(filterKey); setOpenFilterId(null); }}
                              className="w-full text-center py-3 text-sm text-red-500 font-medium hover:bg-red-50 rounded-xl transition-colors"
                            >
                              إزالة الفلتر
                            </button>
                          )}
                        </div>
                      );
                    }

                    // Select filter UI
                    const opts = getFilterOptions(filter);
                    if (opts.length === 0) {
                      return <p className="text-sm text-gray-400 text-center py-4">لا توجد خيارات متاحة</p>;
                    }
                    return opts.map((opt) => {
                      const filterKey = filter.key ?? filter.id ?? '';
                      return (
                        <button
                          key={opt}
                          onClick={() => { onFilterChange(filterKey, opt); setOpenFilterId(null); }}
                          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 ${
                            activeFilters[filterKey] === opt
                              ? 'bg-gradient-to-l from-siwar-50 to-white text-siwar-700 border border-siwar-200 shadow-soft'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <span className="text-sm font-medium">{opt}</span>
                          {activeFilters[filterKey] === opt && (
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-siwar-600">
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    });
                  })()}
                  {activeFilters[openFilterId] && filters.find((f) => (f.key ?? f.id) === openFilterId)?.type !== 'range' && (
                    <button
                      onClick={() => { onClearFilter(openFilterId); setOpenFilterId(null); }}
                      className="w-full text-center py-3 mt-2 text-sm text-red-500 font-medium hover:bg-red-50 rounded-xl transition-colors"
                    >
                      إزالة الفلتر
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
