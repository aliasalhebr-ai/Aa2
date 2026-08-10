import { useCallback } from 'react';
import type { ItemData, PartnershipProfile } from '@/types';
import { createV2Opportunity } from '@/services/opportunityV2Service';
import { useOpportunityFormState } from './opportunity-form/useOpportunityFormState';
import OpportunityHeaderSection from './opportunity-form/OpportunityHeaderSection';
import OpportunityItemsSection from './opportunity-form/OpportunityItemsSection';
import OpportunityTimingSection from './opportunity-form/OpportunityTimingSection';
import OpportunityImagesSection from './opportunity-form/OpportunityImagesSection';
import OpportunityPublisherSection from './opportunity-form/OpportunityPublisherSection';
import OpportunityReviewSection from './opportunity-form/OpportunityReviewSection';
import OpportunityPartnershipSection from './opportunity-form/OpportunityPartnershipSection';

type Props = {
  sectorId: string;
  subSectorId: string;
  operationType: string;
  templateVersion: number;
  isLoggedIn: boolean;
  onCancel: () => void;
  onSuccess: (title: string, status: string) => void;
};

export default function OpportunityForm({
  sectorId, subSectorId, operationType, templateVersion, isLoggedIn, onCancel, onSuccess,
}: Props) {
  const state = useOpportunityFormState(sectorId, subSectorId, operationType, templateVersion, isLoggedIn);

  const handleSubmit = useCallback(async (status: 'draft' | 'pending_review') => {
    if (status === 'pending_review') {
      if (!state.validate()) return;
      if (!state.selectedPublisherId) {
        state.setErrors((prev) => ({ ...prev, _publisher: 'يجب اختيار جهة ناشرة قبل الإرسال للمراجعة' }));
        return;
      }
    }

    const generalPaths = state.generalImages.filter((img) => img.path && !img.error).map((img) => img.path);
    const itemsWithImages: ItemData[] = state.items.map((item, i) => {
      const imgs = state.itemImages[i] ?? [];
      const paths = imgs.filter((img) => img.path && !img.error).map((img) => img.path);
      return { ...item, item_images: paths };
    });

    const oppAttributes: Record<string, unknown> = {};
    if (state.isDemand) {
      const t = state.timing;
      if (t.region) oppAttributes.region = t.region;
      if (t.deliveryLocation) oppAttributes.delivery_location = t.deliveryLocation;
      if (t.bidDeadline) oppAttributes.bid_deadline = t.bidDeadline;
      if (t.supplyDate) oppAttributes.supply_date = t.supplyDate;
      oppAttributes.is_flexible_timing = t.isFlexible;
      oppAttributes.opportunity_timing = t.isFlexible ? 'flexible' : 'scheduled';
      oppAttributes.allows_batch_delivery = t.batch.enabled;
      if (t.batch.enabled) {
        if (t.batch.count) oppAttributes.batch_count = Number(t.batch.count);
        if (t.batch.startDate) oppAttributes.batch_start_date = t.batch.startDate;
        if (t.batch.endDate) oppAttributes.batch_end_date = t.batch.endDate;
        if (t.batch.quantity) oppAttributes.batch_quantity = t.batch.quantity;
        if (t.batch.frequency) oppAttributes.batch_frequency = t.batch.frequency;
      }
      if (t.projectDuration) oppAttributes.project_duration = t.projectDuration;
      oppAttributes.includes_transport = t.scope.transport;
      oppAttributes.includes_loading = t.scope.loading;
      oppAttributes.includes_unloading = t.scope.unloading;
      oppAttributes.includes_planting = t.scope.planting;
      oppAttributes.includes_irrigation = t.scope.irrigation;
      oppAttributes.includes_maintenance = t.scope.maintenance;
      oppAttributes.includes_replacement = t.scope.replacement;
    }

    // Build partnership profile + roles if partnership
    let partnershipProfile: PartnershipProfile | null = null;
    let partnershipRoles = null;
    const pp = state.partnershipProfile;
    if (state.isPartnership && pp.partnership_type) {
      partnershipProfile = {
        partnership_type: pp.partnership_type,
        lead_entity_id: state.selectedPublisherId,
        project_size: pp.project_size || undefined,
        project_location: pp.project_location || undefined,
        start_date: pp.start_date || undefined,
        join_deadline: pp.join_deadline || undefined,
        expected_duration: pp.expected_duration || undefined,
        partners_count_mode: pp.partners_count_mode,
        required_partners_count: pp.required_partners_count ? parseInt(pp.required_partners_count) : undefined,
        project_value: pp.project_value ? parseFloat(pp.project_value) : undefined,
        project_value_visibility: pp.project_value_visibility,
        coverage_mode: pp.coverage_mode,
        project_phases: pp.project_phases ? parseInt(pp.project_phases) : undefined,
        project_sites: pp.project_sites ? parseInt(pp.project_sites) : undefined,
        is_splittable: pp.is_splittable,
        total_quantity: pp.total_quantity ? parseFloat(pp.total_quantity) : undefined,
        total_quantity_unit: pp.total_quantity_unit || undefined,
        work_scope: pp.work_scope || undefined,
        summary: pp.summary || undefined,
        participation_terms: pp.participation_terms,
      };
      partnershipRoles = state.partnershipRoles.filter(
        (r) => r.role_key && r.role_label_snapshot,
      );
    }

    state.setSubmitting(true);
    try {
      const saved = await createV2Opportunity({
        sectorId,
        subSectorId,
        operationType,
        templateVersion,
        title: state.title.trim(),
        description: state.description.trim(),
        city: state.city.trim(),
        generalImages: generalPaths,
        items: itemsWithImages,
        itemFieldDefs: state.itemFieldDefs,
        status,
        publisherEntityId: state.selectedPublisherId,
        opportunityAttributes: oppAttributes,
        partnershipProfile,
        partnershipRoles,
      });
      onSuccess(saved.title, saved.status);
    } catch (err) {
      state.setErrors((prev) => ({
        ...prev,
        _submit: err instanceof Error ? err.message : 'فشل حفظ الفرصة',
      }));
    } finally {
      state.setSubmitting(false);
    }
  }, [state, sectorId, subSectorId, operationType, templateVersion, onSuccess]);

  if (state.loadingDefs) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <OpportunityHeaderSection state={state} />
      {state.isPartnership && <OpportunityPartnershipSection state={state} />}
      <OpportunityItemsSection state={state} />
      {!state.isPartnership && <OpportunityTimingSection state={state} />}
      <OpportunityImagesSection state={state} />
      <OpportunityPublisherSection state={state} />
      <OpportunityReviewSection state={state} onSubmit={handleSubmit} onCancel={onCancel} />
    </div>
  );
}
