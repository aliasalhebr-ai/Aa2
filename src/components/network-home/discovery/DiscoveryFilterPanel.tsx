import { useState, useEffect, useCallback } from 'react';
import { X, Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import type {
  DiscoveryFilters,
  DiscoveryOpportunityType,
  PlantSearchResult,
  VarietySearchResult,
  CityOption,
  PartnershipRoleOption,
  PartnershipTypeOption,
} from '@/types/discovery';
import {
  OPPORTUNITY_TYPE_OPTIONS,
  TIMING_OPTIONS,
  SORT_OPTIONS,
  searchPlants,
  getVarietiesForPlant,
  getCitiesForSector,
  getPartnershipRoleOptions,
  getPartnershipTypeOptions,
} from '@/services/opportunityDiscoveryService';
import type { DiscoverySortOption } from '@/types/discovery';

type SubSectorOption = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  filters: DiscoveryFilters;
  onFilterChange: <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => void;
  onClearAll: () => void;
  sort: DiscoverySortOption;
  onSortChange: (value: DiscoverySortOption) => void;
  sectorId: string;
  subSectors: SubSectorOption[];
  activeCount: number;
};

type Section = 'type' | 'plant' | 'quantity' | 'price' | 'timing' | 'location' | 'type_specific';

export default function DiscoveryFilterPanel({
  open,
  onClose,
  filters,
  onFilterChange,
  onClearAll,
  sort,
  onSortChange,
  sectorId,
  subSectors,
  activeCount,
}: Props) {
  const [openSection, setOpenSection] = useState<Section | null>('type');
  const [plantSearch, setPlantSearch] = useState('');
  const [plantResults, setPlantResults] = useState<PlantSearchResult[]>([]);
  const [plantSearchLoading, setPlantSearchLoading] = useState(false);
  const [varieties, setVarieties] = useState<VarietySearchResult[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [partnershipRoles, setPartnershipRoles] = useState<PartnershipRoleOption[]>([]);
  const [partnershipTypes, setPartnershipTypes] = useState<PartnershipTypeOption[]>([]);

  // ── Load cities for sector ──
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getCitiesForSector(sectorId).then((c) => {
      if (!cancelled) setCities(c);
    });
    return () => { cancelled = true; };
  }, [open, sectorId]);

  // ── Load partnership options when partnership type is selected ──
  useEffect(() => {
    if (!open || filters.opportunityType !== 'partnership') return;
    let cancelled = false;
    Promise.all([getPartnershipRoleOptions(), getPartnershipTypeOptions()]).then(([roles, types]) => {
      if (!cancelled) {
        setPartnershipRoles(roles);
        setPartnershipTypes(types);
      }
    });
    return () => { cancelled = true; };
  }, [open, filters.opportunityType]);

  // ── Plant search with debounce ──
  useEffect(() => {
    if (!open) return;
    if (plantSearch.trim().length < 1) {
      setPlantResults([]);
      return;
    }
    setPlantSearchLoading(true);
    const timer = setTimeout(async () => {
      const results = await searchPlants(plantSearch);
      setPlantResults(results);
      setPlantSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [plantSearch, open]);

  // ── Load varieties when plant is selected ──
  useEffect(() => {
    if (!filters.plantId) {
      setVarieties([]);
      return;
    }
    let cancelled = false;
    getVarietiesForPlant(filters.plantId).then((v) => {
      if (!cancelled) setVarieties(v);
    });
    return () => { cancelled = true; };
  }, [filters.plantId]);

  const handleApply = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open) return null;

  const selectedType = filters.opportunityType;

  const sectionToggle = (section: Section) => ({
    onClick: () => setOpenSection(openSection === section ? null : section),
    'aria-expanded': openSection === section,
  });

  const sectionOpen = (section: Section) => openSection === section;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] animate-fade-in"
        onClick={onClose}
      />
      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] animate-slide-up max-h-[80vh] overflow-y-auto fancy-scroll shadow-float">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-white px-5 pt-2 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-siwar-500 to-siwar-700" />
            <h4 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-siwar-600" />
              الفلاتر
              {activeCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white rounded-full bg-siwar-600">
                  {activeCount}
                </span>
              )}
            </h4>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-1">
          {/* ── Section 1: Sort ── */}
          <FilterSection label="الترتيب" open={sectionOpen('type') && false} {...sectionToggle('type')}>
            <div className="space-y-1.5">
              {SORT_OPTIONS.map((opt) => (
                <SelectRow
                  key={opt.value}
                  label={opt.label}
                  selected={sort === opt.value}
                  onClick={() => onSortChange(opt.value)}
                />
              ))}
            </div>
          </FilterSection>

          {/* ── Section 2: Opportunity Type ── */}
          <FilterSection label="نوع الفرصة" open={sectionOpen('type')} {...sectionToggle('type')}>
            <div className="space-y-1.5">
              <SelectRow
                label="الكل"
                selected={!selectedType}
                onClick={() => onFilterChange('opportunityType', null)}
              />
              {OPPORTUNITY_TYPE_OPTIONS.map((opt) => (
                <SelectRow
                  key={opt.value}
                  label={opt.label}
                  selected={selectedType === opt.value}
                  onClick={() => onFilterChange('opportunityType', opt.value as DiscoveryOpportunityType)}
                />
              ))}
            </div>
          </FilterSection>

          {/* ── Section 3: Branch (sub-sector) ── */}
          {subSectors.length > 0 && (
            <FilterSection label="الفرع" open={sectionOpen('plant') && false} {...sectionToggle('plant')}>
              <div className="space-y-1.5">
                <SelectRow
                  label="الكل"
                  selected={!filters.subSectorId}
                  onClick={() => onFilterChange('subSectorId', null)}
                />
                {subSectors.map((s) => (
                  <SelectRow
                    key={s.id}
                    label={s.name}
                    selected={filters.subSectorId === s.id}
                    onClick={() => onFilterChange('subSectorId', s.id)}
                  />
                ))}
              </div>
            </FilterSection>
          )}

          {/* ── Section 4: Plant & Variety ── */}
          <FilterSection label="النبات والصنف" open={sectionOpen('plant')} {...sectionToggle('plant')}>
            {/* Branch sub-selector inside plant section for mobile convenience */}
            {subSectors.length > 0 && (
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">الفرع</label>
                <div className="flex flex-wrap gap-1.5">
                  <ChipButton
                    label="الكل"
                    selected={!filters.subSectorId}
                    onClick={() => onFilterChange('subSectorId', null)}
                  />
                  {subSectors.map((s) => (
                    <ChipButton
                      key={s.id}
                      label={s.name}
                      selected={filters.subSectorId === s.id}
                      onClick={() => onFilterChange('subSectorId', s.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Plant search */}
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">النبات</label>
            <input
              type="text"
              value={plantSearch}
              onChange={(e) => setPlantSearch(e.target.value)}
              placeholder="ابحث عن نبات..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-medium focus:outline-none focus:border-siwar-400 focus:bg-white focus:ring-2 focus:ring-siwar-100 mb-2"
            />
            {plantSearchLoading && (
              <p className="text-xs text-gray-400 mb-2">جاري البحث...</p>
            )}
            {!plantSearchLoading && plantResults.length > 0 && (
              <div className="space-y-1 mb-3">
                {plantResults.map((p) => (
                  <SelectRow
                    key={p.id}
                    label={p.arabic_name + (p.english_name ? ` (${p.english_name})` : '')}
                    selected={filters.plantId === p.id}
                    onClick={() => onFilterChange('plantId', p.id)}
                  />
                ))}
              </div>
            )}
            {filters.plantId && !plantSearchLoading && (
              <div className="mb-3">
                <button
                  onClick={() => { onFilterChange('plantId', null); onFilterChange('varietyId', null); }}
                  className="text-xs text-red-500 font-medium"
                >
                  إزالة النبات المختار
                </button>
              </div>
            )}

            {/* Variety dropdown (only if plant selected) */}
            {filters.plantId && varieties.length > 0 && (
              <>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">الصنف</label>
                <div className="space-y-1">
                  <SelectRow
                    label="جميع الأصناف"
                    selected={!filters.varietyId}
                    onClick={() => onFilterChange('varietyId', null)}
                  />
                  {varieties.map((v) => (
                    <SelectRow
                      key={v.id}
                      label={v.name_ar}
                      selected={filters.varietyId === v.id}
                      onClick={() => onFilterChange('varietyId', v.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </FilterSection>

          {/* ── Section 5: Quantity ── */}
          <FilterSection label="الكمية" open={sectionOpen('quantity')} {...sectionToggle('quantity')}>
            <RangeInput
              min={filters.quantityMin?.toString() ?? ''}
              max={filters.quantityMax?.toString() ?? ''}
              onMinChange={(v) => onFilterChange('quantityMin', v ? Number(v) : null)}
              onMaxChange={(v) => onFilterChange('quantityMax', v ? Number(v) : null)}
            />
          </FilterSection>

          {/* ── Section 6: Price ── */}
          <FilterSection label="السعر" open={sectionOpen('price')} {...sectionToggle('price')}>
            <RangeInput
              min={filters.priceMin?.toString() ?? ''}
              max={filters.priceMax?.toString() ?? ''}
              unit="ريال"
              onMinChange={(v) => onFilterChange('priceMin', v ? Number(v) : null)}
              onMaxChange={(v) => onFilterChange('priceMax', v ? Number(v) : null)}
            />
          </FilterSection>

          {/* ── Section 7: Timing ── */}
          <FilterSection label="التوقيت" open={sectionOpen('timing')} {...sectionToggle('timing')}>
            <div className="space-y-1.5">
              <SelectRow
                label="الكل"
                selected={!filters.opportunityTiming}
                onClick={() => onFilterChange('opportunityTiming', null)}
              />
              {TIMING_OPTIONS.map((opt) => (
                <SelectRow
                  key={opt.value}
                  label={opt.label}
                  selected={filters.opportunityTiming === opt.value}
                  onClick={() => onFilterChange('opportunityTiming', opt.value as DiscoveryFilters['opportunityTiming'])}
                />
              ))}
            </div>
          </FilterSection>

          {/* ── Section 8: Location ── */}
          <FilterSection label="الموقع" open={sectionOpen('location')} {...sectionToggle('location')}>
            <div className="space-y-1.5">
              <SelectRow
                label="الكل"
                selected={!filters.city}
                onClick={() => onFilterChange('city', null)}
              />
              {cities.map((c) => (
                <SelectRow
                  key={c.value}
                  label={c.label}
                  selected={filters.city === c.value}
                  onClick={() => onFilterChange('city', c.value)}
                />
              ))}
            </div>
          </FilterSection>

          {/* ── Section 9: Verified publisher ── */}
          <FilterSection label="الجهة الموثقة" open={sectionOpen('location') && false} {...sectionToggle('location')}>
            <div className="space-y-1.5">
              <SelectRow
                label="الكل"
                selected={filters.isVerified === null}
                onClick={() => onFilterChange('isVerified', null)}
              />
              <SelectRow
                label="موثقة فقط"
                selected={filters.isVerified === true}
                onClick={() => onFilterChange('isVerified', true)}
              />
            </div>
          </FilterSection>

          {/* ── Section 10: Type-specific filters ── */}
          {selectedType === 'demand' && (
            <FilterSection label="خصائص الاحتياج" open={sectionOpen('type_specific')} {...sectionToggle('type_specific')}>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">موعد التوريد قبل</label>
                  <input
                    type="date"
                    value={filters.supplyDateBefore ?? ''}
                    onChange={(e) => onFilterChange('supplyDateBefore', e.target.value || null)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-medium focus:outline-none focus:border-siwar-400 focus:bg-white focus:ring-2 focus:ring-siwar-100"
                  />
                </div>
                <BooleanFilter
                  label="يشمل الغرس"
                  value={filters.includesPlanting}
                  onChange={(v) => onFilterChange('includesPlanting', v)}
                />
                <BooleanFilter
                  label="يشمل النقل"
                  value={filters.includesTransport}
                  onChange={(v) => onFilterChange('includesTransport', v)}
                />
              </div>
            </FilterSection>
          )}

          {selectedType === 'partnership' && (
            <FilterSection label="خصائص الشراكة" open={sectionOpen('type_specific')} {...sectionToggle('type_specific')}>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">نوع الشراكة</label>
                  <div className="space-y-1">
                    <SelectRow
                      label="الكل"
                      selected={!filters.partnershipType}
                      onClick={() => onFilterChange('partnershipType', null)}
                    />
                    {partnershipTypes.map((t) => (
                      <SelectRow
                        key={t.value}
                        label={t.label}
                        selected={filters.partnershipType === t.value}
                        onClick={() => onFilterChange('partnershipType', t.value)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">الدور المطلوب</label>
                  <div className="space-y-1">
                    <SelectRow
                      label="الكل"
                      selected={!filters.partnershipRoleKey}
                      onClick={() => onFilterChange('partnershipRoleKey', null)}
                    />
                    {partnershipRoles.map((r) => (
                      <SelectRow
                        key={r.role_key}
                        label={r.role_label}
                        selected={filters.partnershipRoleKey === r.role_key}
                        onClick={() => onFilterChange('partnershipRoleKey', r.role_key)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">آخر موعد للانضمام قبل</label>
                  <input
                    type="date"
                    value={filters.joinDeadlineBefore ?? ''}
                    onChange={(e) => onFilterChange('joinDeadlineBefore', e.target.value || null)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-medium focus:outline-none focus:border-siwar-400 focus:bg-white focus:ring-2 focus:ring-siwar-100"
                  />
                </div>
              </div>
            </FilterSection>
          )}
        </div>

        {/* Footer: Apply + Clear All */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex gap-3">
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-xl bg-gradient-to-l from-siwar-600 to-siwar-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
          >
            تطبيق
          </button>
          {activeCount > 0 && (
            <button
              onClick={onClearAll}
              className="px-5 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold hover:bg-red-100 transition-all"
            >
              مسح الكل
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({
  label,
  open,
  children,
  ...toggleProps
}: {
  label: string;
  open: boolean;
  children: React.ReactNode;
  onClick: () => void;
  'aria-expanded': boolean;
}) {
  return (
    <div className="border-b border-gray-50">
      <button
        onClick={toggleProps.onClick}
        aria-expanded={toggleProps['aria-expanded']}
        className="w-full flex items-center justify-between py-3 text-right"
      >
        <span className="text-sm font-bold text-gray-700">{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

function SelectRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
        selected
          ? 'bg-gradient-to-l from-siwar-50 to-white text-siwar-700 border border-siwar-200 shadow-soft'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      {selected && (
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-siwar-600">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

function ChipButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        selected
          ? 'bg-siwar-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function RangeInput({
  min,
  max,
  unit,
  onMinChange,
  onMaxChange,
}: {
  min: string;
  max: string;
  unit?: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="text-xs text-gray-500 font-medium block mb-1">من</label>
        <input
          type="number"
          value={min}
          onChange={(e) => onMinChange(e.target.value)}
          placeholder="0"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-medium focus:outline-none focus:border-siwar-400 focus:bg-white focus:ring-2 focus:ring-siwar-100"
        />
      </div>
      <div className="flex-1">
        <label className="text-xs text-gray-500 font-medium block mb-1">
          إلى{unit ? ` (${unit})` : ''}
        </label>
        <input
          type="number"
          value={max}
          onChange={(e) => onMaxChange(e.target.value)}
          placeholder="∞"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-medium focus:outline-none focus:border-siwar-400 focus:bg-white focus:ring-2 focus:ring-siwar-100"
        />
      </div>
    </div>
  );
}

function BooleanFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <ChipButton label="الكل" selected={value === null} onClick={() => onChange(null)} />
        <ChipButton label="نعم" selected={value === true} onClick={() => onChange(true)} />
        <ChipButton label="لا" selected={value === false} onClick={() => onChange(false)} />
      </div>
    </div>
  );
}
