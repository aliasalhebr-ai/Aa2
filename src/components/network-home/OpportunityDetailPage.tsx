import { useState, useEffect, useRef, Component, ReactNode } from 'react';
import type { NetworkPulseEvent, OpportunityDetailViewModel, OpportunityDetailItem, Company, Sector, SubSector } from '@/types';
import { getCachedOpportunityDetailBundle, checkIsAdmin } from '@/services/opportunityDetailService';
import { mapOpportunityDetailBundle } from '@/lib/opportunityDetailMapper';
import { supabase } from '@/lib/supabase';
import OpportunityDetailHeader from './opportunity-detail/OpportunityDetailHeader';
import OpportunityGeneralInformation from './opportunity-detail/OpportunityGeneralInformation';
import OpportunityItemsSlider from './opportunity-detail/OpportunityItemsSlider';
import SelectedItemContent from './opportunity-detail/SelectedItemContent';
import OpportunityPublisherSection from './opportunity-detail/OpportunityPublisherSection';
import OpportunityDetailSkeleton from './opportunity-detail/OpportunityDetailSkeleton';
import OpportunityMatchesSection from './matching/OpportunityMatchesSection';
import { resolveOpportunityFormat } from '@/lib/opportunityFormatResolver';

type Props = {
  event: NetworkPulseEvent;
  isLoggedIn: boolean;
  onClose: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
  sectors: Sector[];
  subSectors: SubSector[];
  activeSectorId: string | null;
  activeSubSectorId: string | null;
  onViewDetails: (event: NetworkPulseEvent) => void;
  onSave: (event: NetworkPulseEvent) => void;
  onCompanyClick: (company: Company) => void;
};

class DetailErrorBoundary extends Component<{ children: ReactNode; onClose: () => void }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('OpportunityDetailPage crash:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6">
          <p className="text-sm text-red-500 text-center mb-2">حدث خطأ غير متوقع</p>
          <p className="text-xs text-gray-400 text-center mb-4 max-w-xs break-words">{this.state.message}</p>
          <button
            onClick={this.props.onClose}
            className="px-5 py-2.5 bg-siwar-600 text-white rounded-lg text-sm font-medium"
          >
            رجوع
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function OpportunityDetailPageInner({ event, isLoggedIn, onClose, onToast, sectors, subSectors, activeSectorId, activeSubSectorId, onViewDetails, onSave, onCompanyClick }: Props) {
  const [vm, setVm] = useState<OpportunityDetailViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);
        const admin = await checkIsAdmin();
        setIsAdmin(admin);
      } catch {
        // ignore — user not logged in
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    setSelectedItemId(null);

    (async () => {
      try {
        const bundle = await getCachedOpportunityDetailBundle(event.id, currentUserId, isAdmin);
        if (cancelled || reqId !== reqIdRef.current) return;

        if (!bundle || !bundle.opportunity) {
          setError('لا يمكنك عرض هذه الفرصة أو أنها غير موجودة');
          return;
        }

        const detailVm = mapOpportunityDetailBundle(bundle);
        if (!detailVm || cancelled || reqId !== reqIdRef.current) return;
        setVm(detailVm);
        // Select first valid item by id
        if (detailVm.items.length > 0) {
          setSelectedItemId(detailVm.items[0].id);
        }
      } catch {
        if (!cancelled) setError('حدث خطأ أثناء تحميل التفاصيل');
      } finally {
        if (!cancelled && reqId === reqIdRef.current) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [event.id, currentUserId, isAdmin]);

  if (loading) return <OpportunityDetailSkeleton onClose={onClose} />;

  if (error || !vm) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6">
        <p className="text-sm text-gray-500 text-center mb-4">{error || 'الفرصة غير متاحة'}</p>
        <button
          onClick={onClose}
          className="tap-scale px-5 py-2.5 bg-siwar-600 text-white rounded-lg text-sm font-medium hover:bg-siwar-700 transition-colors"
        >
          رجوع
        </button>
      </div>
    );
  }

  // Derive selectedItem from selectedItemId — stable across reorders
  const selectedItemIndex = vm.items.findIndex(item => item.id === selectedItemId);
  const safeIndex = selectedItemIndex >= 0 ? selectedItemIndex : 0;
  const selectedItem: OpportunityDetailItem | null = vm.items[safeIndex] ?? null;

  const handleSelectIndex = (index: number) => {
    const item = vm.items[index];
    if (item) setSelectedItemId(item.id);
  };

  const format = resolveOpportunityFormat(vm.sourceOpportunity, vm.templateVersion);

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden">
      {/* 1. Header — fixed, constant */}
      <OpportunityDetailHeader vm={vm} onClose={onClose} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* 2. Opportunity General Information — constant, shown once */}
        <OpportunityGeneralInformation vm={vm} format={format} />

        {/* 3. Opportunity Items Slider — heart of the page */}
        <OpportunityItemsSlider
          items={vm.items}
          selectedIndex={safeIndex}
          onSelectIndex={handleSelectIndex}
          formatKey={format.formatKey}
        />

        {/* 4. Selected Item Content — driven by selectedItemId */}
        <SelectedItemContent
          selectedItem={selectedItem}
          vm={vm}
          isLoggedIn={isLoggedIn}
          onToast={onToast}
        />

        {/* Full description */}
        {vm.fullDescription && (
          <div className="px-4 py-3 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-2">تفاصيل الفرصة</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{vm.fullDescription}</p>
          </div>
        )}

        {/* 5. Publisher Section */}
        {vm.publisher && (
          <OpportunityPublisherSection publisher={vm.publisher} />
        )}

        {/* 6. Matching Section */}
        {vm.templateVersion >= 2 && vm.status === 'active' && activeSectorId && (
          <OpportunityMatchesSection
            sourceOpportunity={vm.sourceOpportunity}
            sectorId={activeSectorId}
            subSectorId={activeSubSectorId}
            sectors={sectors}
            subSectors={subSectors}
            onViewDetails={onViewDetails}
            onSave={onSave}
            onCompanyClick={onCompanyClick}
          />
        )}
      </div>
    </div>
  );
}

export default function OpportunityDetailPage(props: Props) {
  return (
    <DetailErrorBoundary onClose={props.onClose}>
      <OpportunityDetailPageInner {...props} />
    </DetailErrorBoundary>
  );
}
