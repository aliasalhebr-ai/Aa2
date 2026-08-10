import { useState, useEffect } from 'react';
import type { SubSector } from '@/types';
import { getSubBranchesBySubSector } from '@/services/domainService';

type Props = {
  subSectors: SubSector[];
  sectorName: string;
  activeSubSectorId: string | null;
  onSubSectorChange: (subSectorId: string | null) => void;
  onBranchChange?: (branchId: string | null) => void;
};

export default function SubSectorSlider({
  subSectors,
  sectorName,
  activeSubSectorId,
  onSubSectorChange,
  onBranchChange,
}: Props) {
  const [branches, setBranches] = useState<SubSector[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const topLevelSubs = subSectors.filter((s) => !s.parent_id);

  useEffect(() => {
    if (!activeSubSectorId) {
      setBranches([]);
      setActiveBranchId(null);
      return;
    }
    let cancelled = false;
    setLoadingBranches(true);
    setActiveBranchId(null);
    (async () => {
      try {
        const subs = await getSubBranchesBySubSector(activeSubSectorId);
        if (!cancelled) setBranches(subs);
      } catch {
        if (!cancelled) setBranches([]);
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeSubSectorId]);

  const handleBranchClick = (branchId: string) => {
    const next = activeBranchId === branchId ? null : branchId;
    setActiveBranchId(next);
    onBranchChange?.(next);
  };

  return (
    <div className="py-2">
      {/* Sub-sector chips row */}
      <div className="px-3 sm:px-4">
        <div className="no-scrollbar touch-scroll overflow-x-auto">
          <div className="flex items-center gap-2" style={{ width: 'max-content', paddingBottom: '2px' }}>

            {/* "الكل" — dark green filled */}
            <button
              onClick={() => onSubSectorChange(null)}
              className="tap-scale flex-shrink-0 flex items-center justify-center px-5 rounded-full text-sm font-bold text-white transition-all duration-200"
              style={{
                height: '38px',
                background: activeSubSectorId === null ? '#1b5e35' : 'transparent',
                border: activeSubSectorId === null ? '1.5px solid #1b5e35' : '1.5px solid #d1d5db',
                color: activeSubSectorId === null ? '#fff' : '#374151',
              }}
            >
              الكل
            </button>

            {/* Sub-sector chips */}
            {topLevelSubs.map((sub) => {
              const isActive = sub.id === activeSubSectorId;
              return (
                <button
                  key={sub.id}
                  onClick={() => onSubSectorChange(isActive ? null : sub.id)}
                  className="tap-scale flex-shrink-0 flex items-center gap-1.5 px-4 rounded-full text-sm font-medium transition-all duration-200"
                  style={{
                    height: '38px',
                    background: isActive ? '#f0faf4' : '#fff',
                    border: isActive ? '1.5px solid #1b5e35' : '1.5px solid #d1d5db',
                    color: isActive ? '#1b5e35' : '#374151',
                  }}
                >
                  {sub.icon && <span className="text-base leading-none">{sub.icon}</span>}
                  <span>{sub.name}</span>
                </button>
              );
            })}

            {/* "...المزيد" placeholder */}
            {topLevelSubs.length > 5 && (
              <button
                className="tap-scale flex-shrink-0 flex items-center gap-1 px-3 rounded-full text-sm font-medium text-gray-500 bg-white transition-all duration-200"
                style={{ height: '38px', border: '1.5px solid #d1d5db' }}
              >
                ... المزيد
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Branch row — third level (shown when sub-sector selected and has branches) */}
      {activeSubSectorId && (branches.length > 0 || loadingBranches) && (
        <div className="px-3 sm:px-4 pt-2">
          <div className="no-scrollbar touch-scroll overflow-x-auto">
            <div className="flex items-center gap-2" style={{ width: 'max-content' }}>
              <button
                onClick={() => { setActiveBranchId(null); onBranchChange?.(null); }}
                className="tap-scale flex-shrink-0 flex items-center px-3.5 rounded-xl text-[11px] font-bold bg-white transition-all duration-200"
                style={{
                  height: '30px',
                  border: activeBranchId === null ? '1.5px solid #1b5e35' : '1.5px solid #d1d5db',
                  color: activeBranchId === null ? '#1b5e35' : '#6b7280',
                }}
              >
                الكل
              </button>
              {loadingBranches
                ? [1, 2, 3].map((i) => (
                    <div key={i} className="w-16 h-[30px] rounded-xl bg-gray-100 animate-pulse" />
                  ))
                : branches.map((branch) => {
                    const isActive = branch.id === activeBranchId;
                    return (
                      <button
                        key={branch.id}
                        onClick={() => handleBranchClick(branch.id)}
                        className="tap-scale flex-shrink-0 flex items-center gap-1.5 px-3.5 rounded-xl text-[11px] font-bold bg-white transition-all duration-200"
                        style={{
                          height: '30px',
                          border: isActive ? '1.5px solid #1b5e35' : '1.5px solid #d1d5db',
                          color: isActive ? '#1b5e35' : '#6b7280',
                        }}
                      >
                        {branch.icon && <span className="text-xs">{branch.icon}</span>}
                        <span>{branch.name}</span>
                      </button>
                    );
                  })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
