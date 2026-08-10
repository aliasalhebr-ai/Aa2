import { useEffect, useState, useCallback, useRef } from 'react';
import type { Sector, SubSector, NetworkPulseEvent, Company, SectorAction, FormData, FieldDefinition } from '@/types';
import { getActiveSectors, getSubSectorsBySector, getAllSectorActivityCounts, getFieldDefinitions } from '@/services/domainService';
import { getUnreadCount } from '@/services/notificationService';
import { createOpportunity, readOpportunity, type OpportunityStatus } from '@/services/opportunityService';
import { supabase } from '@/lib/supabase';

import NetworkHeader from '@/components/network-home/NetworkHeader';
import MainSectorSlider from '@/components/network-home/MainSectorSlider';
import SubSectorSlider from '@/components/network-home/SubSectorSlider';

import SectorFilterBar from '@/components/network-home/SectorFilterBar';
import NetworkPulseHeader from '@/components/network-home/NetworkPulseHeader';
import NetworkPulseList from '@/components/network-home/NetworkPulseList';
import OpportunityDiscoveryEngine from '@/components/network-home/discovery/OpportunityDiscoveryEngine';
import BottomNavigation from '@/components/network-home/BottomNavigation';
import SectorSliderSkeleton from '@/components/network-home/SectorSliderSkeleton';
import SubSectorSliderSkeleton from '@/components/network-home/SubSectorSliderSkeleton';
import LoginPrompt from '@/components/network-home/LoginPrompt';
import PublishingEngine from '@/components/network-home/PublishingEngine';
import LogisticsModal from '@/components/network-home/LogisticsModal';
import LogisticsCenter from '@/components/network-home/LogisticsCenter';
import AuctionCenter from '@/components/network-home/AuctionCenter';
import AuctionRequestModal from '@/components/network-home/AuctionRequestModal';
import OpportunityDetailPage from '@/components/network-home/OpportunityDetailPage';
import { clearAllOpportunityDetailCache } from '@/services/opportunityDetailService';
import UserDashboard from '@/components/network-home/UserDashboard';
import AdminReviewPanel from '@/components/network-home/AdminReviewPanel';
import NotificationsPanel from '@/components/network-home/NotificationsPanel';
import Toast from '@/components/network-home/Toast';
import PalmFruitsPreview from '@/components/network-home/PalmFruitsPreview';

export default function App() {
  // ── Core state ──────────────────────────────────────────
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [activeSectorId, setActiveSectorId] = useState<string | null>(null);
  const [subSectors, setSubSectors] = useState<SubSector[]>([]);
  const [activeSubSectorId, setActiveSubSectorId] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});

  // ── Search & filter state ────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState('latest');

  // ── UI state — each modal/center has its own independent boolean ──
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [loadingSubSectors, setLoadingSubSectors] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isPublishingEngineOpen, setIsPublishingEngineOpen] = useState(false);

  // ── Creation context (separate from browsing context) ──
  const [creationSectorId, setCreationSectorId] = useState<string | null>(null);
  const [creationSubSectorId, setCreationSubSectorId] = useState<string | null>(null);

  // ── Derived creation context (separate from browsing) ──
  const creationSector = sectors.find((s) => s.id === creationSectorId) ?? null;
  const creationSubSector = subSectors.find((s) => s.id === creationSubSectorId) ?? null;
  const [isLogisticsModalOpen, setIsLogisticsModalOpen] = useState(false);
  const [isAuctionRequestModalOpen, setIsAuctionRequestModalOpen] = useState(false);
  const [isLogisticsCenterOpen, setIsLogisticsCenterOpen] = useState(false);
  const [isAuctionCenterOpen, setIsAuctionCenterOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<NetworkPulseEvent | null>(null);
  const [showUserDashboard, setShowUserDashboard] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [city] = useState('الرياض');

  // ── Creation context state — cleared on every open ──
  const [logisticsSourceOppId, setLogisticsSourceOppId] = useState<string | null>(null);
  const [logisticsSourceSpecialtyId, setLogisticsSourceSpecialtyId] = useState<string | null>(null);
  const [auctionSourceSpecialtyId, setAuctionSourceSpecialtyId] = useState<string | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Tracks whether we need to resume creation after a successful login
  const [pendingCreationResume, setPendingCreationResume] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived ──────────────────────────────────────────────
  const activeSector = sectors.find((s) => s.id === activeSectorId) ?? null;
  const activeSpecialty = subSectors.find((s) => s.id === activeSubSectorId) ?? null;
  const availableActions: SectorAction[] =
    (activeSpecialty?.allowed_operations ?? activeSector?.available_actions ?? [])
      .filter((a) => a.is_active !== false);
  const filterConfig =
    activeSpecialty?.filter_configuration ?? activeSector?.filter_configuration ?? [];

  // ── Auth state ────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
    let wasLoggedIn = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (!session && wasLoggedIn) {
        clearAllOpportunityDetailCache();
      }
      wasLoggedIn = !!session;
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Resume creation after login ──
  useEffect(() => {
    if (isLoggedIn && pendingCreationResume && creationSectorId) {
      setPendingCreationResume(false);
      setShowLoginPrompt(false);
      const sector = sectors.find((s) => s.id === creationSectorId);
      if (sector?.slug === 'auctions') {
        setAuctionSourceSpecialtyId(creationSubSectorId);
        setIsAuctionRequestModalOpen(true);
      } else if (sector?.slug === 'logistics') {
        setLogisticsSourceOppId(null);
        setLogisticsSourceSpecialtyId(creationSubSectorId);
        setIsLogisticsModalOpen(true);
      } else {
        setIsPublishingEngineOpen(true);
      }
    }
  }, [isLoggedIn, pendingCreationResume, creationSectorId, creationSubSectorId, sectors]);

  // ── Load sectors on mount ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getActiveSectors();
        if (cancelled) return;
        setSectors(data);
        if (data.length > 0) setActiveSectorId(data[0].id);
      } catch {
        if (!cancelled) setToastMessage('تعذر تحميل القطاعات');
      } finally {
        if (!cancelled) setLoadingSectors(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Load activity counts for all sectors (single batched query) ──
  useEffect(() => {
    if (sectors.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const counts = await getAllSectorActivityCounts();
        if (!cancelled) setActivityCounts(counts);
      } catch {
        if (!cancelled) setActivityCounts({});
      }
    })();
    return () => { cancelled = true; };
  }, [sectors]);

  // ── Load unread notifications ─────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const count = await getUnreadCount();
        if (!cancelled) setUnreadNotifications(count);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // ── On sector change: load sub-sectors, reset ALL state ───
  useEffect(() => {
    if (!activeSectorId) return;
    let cancelled = false;
    setLoadingSubSectors(true);
    setActiveSubSectorId(null);
    setActiveBranchId(null);
    setSearchQuery('');
    setDebouncedSearch('');
    setActiveFilters({});
    setSortBy('latest');

    // Close centers on sector change, but do NOT close the creation modal —
    // creation context is separate from browsing context.
    setIsLogisticsCenterOpen(false);
    setIsAuctionCenterOpen(false);

    (async () => {
      try {
        const subs = await getSubSectorsBySector(activeSectorId);
        if (!cancelled) setSubSectors(subs);
      } catch {
        if (!cancelled) setSubSectors([]);
      } finally {
        if (!cancelled) setLoadingSubSectors(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeSectorId]);

  // ── On sub-sector change: close ALL creation modals ──────
  const handleSubSectorChange = useCallback((subSectorId: string | null) => {
    setActiveSubSectorId(subSectorId);
    setActiveBranchId(null);
    // Do NOT close creation modals here — creation context is separate
    // from browsing context. The context-change warning effect handles
    // alerting the user.
  }, []);

  // ── Debounce search ──────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  }, []);

  // ── Filter handlers ──────────────────────────────────────
  const handleFilterChange = useCallback((filterId: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [filterId]: value }));
  }, []);

  const handleClearFilter = useCallback((filterId: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      delete next[filterId];
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setActiveFilters({});
  }, []);

  // ── Sector change handler ─────────────────────────────────
  const handleSectorChange = useCallback((sectorId: string) => {
    // If selecting the auctions or logistics main sector, open the center directly
    const sector = sectors.find((s) => s.id === sectorId);
    if (sector?.slug === 'auctions') {
      setActiveSectorId(sectorId);
      setIsAuctionCenterOpen(true);
      return;
    }
    if (sector?.slug === 'logistics') {
      setActiveSectorId(sectorId);
      setIsLogisticsCenterOpen(true);
      return;
    }
    // Normal sector — close any open centers
    setIsAuctionCenterOpen(false);
    setIsLogisticsCenterOpen(false);
    setActiveSectorId(sectorId);
  }, [sectors]);

  // ── Open creation: show publishing engine ──
  const handleOpenCreation = useCallback(() => {
    setIsAuctionCenterOpen(false);
    setIsLogisticsCenterOpen(false);
    setIsLogisticsModalOpen(false);
    setIsAuctionRequestModalOpen(false);
    setLogisticsSourceOppId(null);
    setLogisticsSourceSpecialtyId(null);
    setAuctionSourceSpecialtyId(null);
    setCreationSectorId(activeSectorId);
    setCreationSubSectorId(activeSubSectorId);
    setIsPublishingEngineOpen(true);
  }, [activeSectorId, activeSubSectorId]);

  // ── Publishing engine: login required ──
  const handleEngineLoginRequired = useCallback(() => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      setPendingCreationResume(true);
    }
  }, [isLoggedIn]);

  // ── V2 form success from publishing engine ──
  const handleEngineV2Success = useCallback((_title: string, status: string) => {
    setIsPublishingEngineOpen(false);
    setToastType('success');
    setToastMessage(
      status === 'draft'
        ? 'تم حفظ المسودة بنجاح'
        : 'تم إرسال الفرصة للمراجعة'
    );
  }, []);

  // ── V1 form submit from publishing engine ──
  const handleEngineV1Submit = useCallback(async (actionId: string, data: FormData, fieldDefs: FieldDefinition[], status: 'draft' | 'pending_review', publisherEntityId: string | null) => {
    setIsPublishingEngineOpen(false);
    if (!creationSectorId) {
      setToastType('error');
      setToastMessage('يجب اختيار قطاع قبل الإرسال');
      return;
    }
    if (status === 'pending_review' && !publisherEntityId) {
      setToastType('error');
      setToastMessage('يجب اختيار جهة ناشرة قبل الإرسال للمراجعة');
      return;
    }
    setToastType('info');
    setToastMessage(status === 'draft' ? 'جاري حفظ المسودة...' : 'جاري إرسال السجل للمراجعة...');
    try {
      const imagePaths = (data._images as string[]) ?? [];
      const saved = await createOpportunity({
        sectorId: creationSectorId,
        subSectorId: creationSubSectorId ?? '',
        operationType: actionId,
        formData: data,
        fieldDefs,
        images: imagePaths,
        status: status as OpportunityStatus,
        publisherEntityId,
      });
      const confirmed = await readOpportunity(saved.id);
      if (!confirmed) {
        setToastType('error');
        setToastMessage('تم الحفظ لكن تعذر تأكيد السجل');
        return;
      }
      setToastType('success');
      setToastMessage(
        status === 'draft'
          ? `تم حفظ المسودة بنجاح: ${confirmed.title}`
          : `تم إرسال السجل للمراجعة: ${confirmed.title}`
      );
    } catch (err) {
      setToastType('error');
      setToastMessage(err instanceof Error ? err.message : 'فشل حفظ السجل');
    }
  }, [creationSectorId, creationSubSectorId]);

  // ── Warn when browsing context changes while creation modal is open ──
  useEffect(() => {
    if (!isPublishingEngineOpen) return;
    if (!creationSubSector) return;
    const browsingChanged =
      (activeSectorId && activeSectorId !== creationSectorId) ||
      (activeSubSectorId && activeSubSectorId !== creationSubSectorId);
    if (browsingChanged) {
      setToastType('info');
      setToastMessage(`تغير قسم التصفح، لكن هذه الفرصة ما زالت مرتبطة بـ ${creationSubSector.name}`);
    }
  }, [activeSectorId, activeSubSectorId, isPublishingEngineOpen, creationSectorId, creationSubSectorId, creationSubSector]);

  const handleViewDetails = useCallback((event: NetworkPulseEvent) => {
    setDetailEvent(event);
  }, []);

  const handleSave = useCallback((_event: NetworkPulseEvent) => {
    setToastType('success');
    setToastMessage('تم حفظ النشاط في المحفوظات');
  }, []);

  const handleCompanyClick = useCallback((company: Company) => {
    setToastMessage(`فتح ملف: ${company.name}`);
  }, []);

  const handleViewAll = useCallback(() => {
    setToastMessage('عرض جميع الأنشطة');
  }, []);

  const handleBranchChange = useCallback((branchId: string | null) => {
    setActiveBranchId(branchId);
  }, []);

  if (typeof window !== 'undefined' && window.location.hash === '#preview') {
    return <PalmFruitsPreview />;
  }

  return (
    <div className="min-h-screen mesh-bg bg-grain">
      {/* Header — no auction/logistics buttons */}
      <NetworkHeader
        city={city}
        onCityClick={() => setToastMessage('اختيار المدينة')}
        onAccountClick={() => setShowUserDashboard(true)}
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder={activeSector?.search_placeholder || 'ابحث عن فرصة، شركة، منتج أو خدمة...'}
      />

      <main className="pb-24 max-w-5xl mx-auto">
        {/* Main Sector Slider */}
        {loadingSectors ? (
          <SectorSliderSkeleton />
        ) : (
          <MainSectorSlider
            sectors={sectors}
            activeSectorId={activeSectorId}
            onSectorChange={handleSectorChange}
          />
        )}

        {/* Sub-Sector Slider — only for non-center sectors */}
        {activeSector?.slug !== 'auctions' && activeSector?.slug !== 'logistics' && (
          loadingSubSectors ? (
            <SubSectorSliderSkeleton />
          ) : (
            <SubSectorSlider
              subSectors={subSectors}
              sectorName={activeSector?.name || ''}
              activeSubSectorId={activeSubSectorId}
              onSubSectorChange={handleSubSectorChange}
              onBranchChange={handleBranchChange}
            />
          )
        )}

        {/* V2 Discovery Engine — for sectors with template_version = 2 (nursery) */}
        {activeSectorId && activeSector?.slug !== 'auctions' && activeSector?.slug !== 'logistics' && (activeSector?.opportunity_template_version ?? 1) >= 2 && (
          <OpportunityDiscoveryEngine
            sectorId={activeSectorId}
            subSectorId={activeBranchId || activeSubSectorId}
            sector={activeSector}
            subSectors={subSectors}
            sectors={sectors}
            isLoggedIn={isLoggedIn}
            onViewDetails={handleViewDetails}
            onSave={handleSave}
            onCompanyClick={handleCompanyClick}
            onAddOpportunity={handleOpenCreation}
          />
        )}

        {/* V1 Legacy: Filter Chips + Network Pulse Header + List — for template_version < 2 sectors */}
        {activeSector?.slug !== 'auctions' && activeSector?.slug !== 'logistics' && (activeSector?.opportunity_template_version ?? 1) < 2 && (
          <>
            <SectorFilterBar
              filters={filterConfig}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              onClearFilter={handleClearFilter}
              onClearAll={handleClearAll}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            <NetworkPulseHeader sector={activeSector} onViewAll={handleViewAll} />

            {activeSectorId && (
              <NetworkPulseList
                sectorId={activeSectorId}
                subSectorId={activeBranchId || activeSubSectorId}
                searchQuery={debouncedSearch}
                filters={activeFilters}
                sortBy={sortBy}
                isLoggedIn={isLoggedIn}
                subSectors={subSectors}
                sectors={sectors}
                onViewDetails={handleViewDetails}
                onSave={handleSave}
                onCompanyClick={handleCompanyClick}
                onAddOpportunity={handleOpenCreation}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNavigation
        unreadNotifications={unreadNotifications}
        onCreateClick={handleOpenCreation}
        onHomeClick={() => setToastMessage('الرئيسية')}
        onNotificationsClick={() => setShowNotifications(true)}
        onNetworkClick={() => setShowAdminPanel(true)}
        onAccountClick={() => setShowUserDashboard(true)}
      />

      {/* Publishing Engine — unified creation flow */}
      {isPublishingEngineOpen && (
        <PublishingEngine
          browsingSector={activeSector}
          browsingSubSector={activeSpecialty}
          sectors={sectors}
          subSectors={subSectors}
          isLoggedIn={isLoggedIn}
          onLoginRequired={handleEngineLoginRequired}
          onV2Success={handleEngineV2Success}
          onV1Submit={handleEngineV1Submit}
          onClose={() => setIsPublishingEngineOpen(false)}
        />
      )}

      {/* Logistics Request Modal — for creating a logistics request from within palm */}
      {isLogisticsModalOpen && creationSector && (
        <LogisticsModal
          sector={creationSector}
          specialty={creationSubSector!}
          isLoggedIn={isLoggedIn}
          sourceOpportunityId={logisticsSourceOppId}
          sourceSpecialtyId={logisticsSourceSpecialtyId}
          onClose={() => setIsLogisticsModalOpen(false)}
          onCreated={(title) => {
            setIsLogisticsModalOpen(false);
            setToastType('success');
            setToastMessage(`تم إرسال الطلب إلى مركز اللوجستيات: ${title}`);
          }}
        />
      )}

      {/* Auction Request Modal — for creating an auction request from within palm */}
      {isAuctionRequestModalOpen && creationSector && (
        <AuctionRequestModal
          sector={creationSector}
          specialty={creationSubSector!}
          isLoggedIn={isLoggedIn}
          sourceSpecialtyId={auctionSourceSpecialtyId}
          onClose={() => setIsAuctionRequestModalOpen(false)}
          onCreated={(title) => {
            setIsAuctionRequestModalOpen(false);
            setToastType('success');
            setToastMessage(`تم إرسال طلب المزاد: ${title}`);
          }}
        />
      )}

      {/* Logistics Center — opened from main sector slider */}
      {isLogisticsCenterOpen && (
        <LogisticsCenter
          isLoggedIn={isLoggedIn}
          onClose={() => setIsLogisticsCenterOpen(false)}
          onToast={(message, type) => {
            setToastType(type);
            setToastMessage(message);
          }}
        />
      )}

      {/* Auction Center — opened from main sector slider */}
      {isAuctionCenterOpen && (
        <AuctionCenter
          isLoggedIn={isLoggedIn}
          activeSectorId={activeSectorId}
          onClose={() => setIsAuctionCenterOpen(false)}
          onToast={(message, type) => { setToastType(type); setToastMessage(message); }}
        />
      )}

      {/* Detail Page — unified for ALL sectors (V1 via adapter, V2 via opportunity_items) */}
      {detailEvent && (
          <OpportunityDetailPage
            event={detailEvent}
            isLoggedIn={isLoggedIn}
            onClose={() => setDetailEvent(null)}
            onToast={(message, type) => { setToastType(type); setToastMessage(message); }}
            sectors={sectors}
            subSectors={subSectors}
            activeSectorId={activeSectorId}
            activeSubSectorId={activeBranchId || activeSubSectorId}
            onViewDetails={handleViewDetails}
            onSave={handleSave}
            onCompanyClick={handleCompanyClick}
          />
      )}

      {/* User Dashboard */}
      {showUserDashboard && (
        <UserDashboard
          isLoggedIn={isLoggedIn}
          onClose={() => setShowUserDashboard(false)}
          onToast={(message, type) => { setToastType(type); setToastMessage(message); }}
          onViewOpportunity={() => setShowUserDashboard(false)}
        />
      )}

      {/* Admin Review Panel */}
      {showAdminPanel && (
        <AdminReviewPanel
          isLoggedIn={isLoggedIn}
          onClose={() => setShowAdminPanel(false)}
          onToast={(message, type) => { setToastType(type); setToastMessage(message); }}
        />
      )}

      {/* Notifications */}
      {showNotifications && (
        <NotificationsPanel
          isLoggedIn={isLoggedIn}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {/* Login Prompt */}
      {showLoginPrompt && (
        <LoginPrompt
          sector={creationSector ?? activeSector}
          onClose={() => { setShowLoginPrompt(false); setPendingCreationResume(false); }}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}
