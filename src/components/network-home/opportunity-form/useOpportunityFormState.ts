import { useState, useEffect, useCallback } from 'react';
import type { ItemFieldDefinition, ItemData, PublisherEntity, PartnershipRole, PartnershipRoleCatalogEntry, PartnershipType } from '@/types';
import {
  getItemFieldDefinitions, getActivePlants, getVarietiesByPlant,
  getV2PublisherEntities, getPartnershipRoleCatalog,
  type PlantOption, type VarietyOption,
} from '@/services/opportunityV2Service';
import type { UploadedImage } from './shared';

export type PartnershipProfileState = {
  partnership_type: PartnershipType | '';
  project_size: string;
  project_location: string;
  start_date: string;
  join_deadline: string;
  expected_duration: string;
  required_partners_count: string;
  partners_count_mode: 'fixed' | 'open';
  project_value: string;
  project_value_visibility: boolean;
  coverage_mode: 'single_partner' | 'multiple_partners' | 'mixed';
  project_phases: string;
  project_sites: string;
  is_splittable: boolean;
  total_quantity: string;
  total_quantity_unit: string;
  work_scope: string;
  summary: string;
  participation_terms: Record<string, unknown>;
};

function emptyPartnershipProfile(): PartnershipProfileState {
  return {
    partnership_type: '', project_size: '', project_location: '',
    start_date: '', join_deadline: '', expected_duration: '',
    required_partners_count: '', partners_count_mode: 'fixed',
    project_value: '', project_value_visibility: false,
    coverage_mode: 'single_partner', project_phases: '', project_sites: '',
    is_splittable: false, total_quantity: '', total_quantity_unit: '',
    work_scope: '', summary: '', participation_terms: {},
  };
}

function emptyPartnershipRole(): PartnershipRole {
  return { role_key: '', role_label_snapshot: '', description: '', required_count: 1 };
}

function emptyItem(): ItemData {
  return {} as Record<string, never> as unknown as ItemData;
}

export type DemandScope = {
  transport: boolean; loading: boolean; unloading: boolean;
  planting: boolean; irrigation: boolean; maintenance: boolean; replacement: boolean;
};

export type BatchDetails = {
  enabled: boolean; count: string; startDate: string; endDate: string;
  quantity: string; frequency: string;
};

export type TimingState = {
  region: string; deliveryLocation: string; bidDeadline: string;
  supplyDate: string; isFlexible: boolean; projectDuration: string;
  batch: BatchDetails; scope: DemandScope;
};

export function useOpportunityFormState(
  sectorId: string, subSectorId: string, operationType: string,
  templateVersion: number, isLoggedIn: boolean,
) {
  const isDemand = operationType === 'demand';
  const isPartnership = operationType === 'partnership';

  const [partnershipProfile, setPartnershipProfile] = useState<PartnershipProfileState>(emptyPartnershipProfile());
  const [partnershipRoles, setPartnershipRoles] = useState<PartnershipRole[]>([emptyPartnershipRole()]);
  const [roleCatalog, setRoleCatalog] = useState<PartnershipRoleCatalogEntry[]>([]);
  const [loadingRoleCatalog, setLoadingRoleCatalog] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [items, setItems] = useState<ItemData[]>([emptyItem()] as ItemData[]);
  const [generalImages, setGeneralImages] = useState<UploadedImage[]>([]);
  const [generalUploading, setGeneralUploading] = useState(false);
  const [itemImages, setItemImages] = useState<Record<number, UploadedImage[]>>({});
  const [itemUploading, setItemUploading] = useState<Record<number, boolean>>({});

  const [itemFieldDefs, setItemFieldDefs] = useState<ItemFieldDefinition[]>([]);
  const [loadingDefs, setLoadingDefs] = useState(true);
  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [varietyCache, setVarietyCache] = useState<Record<string, VarietyOption[]>>({});
  const [varietyLoading, setVarietyLoading] = useState<Record<number, boolean>>({});

  const [publisherEntities, setPublisherEntities] = useState<PublisherEntity[]>([]);
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(null);
  const [loadingPublishers, setLoadingPublishers] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [timing, setTiming] = useState<TimingState>({
    region: '', deliveryLocation: '', bidDeadline: '', supplyDate: '',
    isFlexible: false, projectDuration: '',
    batch: { enabled: false, count: '', startDate: '', endDate: '', quantity: '', frequency: '' },
    scope: { transport: false, loading: false, unloading: false, planting: false, irrigation: false, maintenance: false, replacement: false },
  });

  const hasPlantField = itemFieldDefs.some((f) => f.field_key === 'plant_id');
  const hasVarietyField = itemFieldDefs.some((f) => f.field_key === 'variety_id');
  const hasItemImagesField = itemFieldDefs.some((f) => f.field_key === 'item_images');

  useEffect(() => {
    let cancelled = false;
    setLoadingDefs(true);
    (async () => {
      try {
        const defs = await getItemFieldDefinitions(sectorId, operationType, templateVersion, subSectorId || null);
        if (!cancelled) setItemFieldDefs(defs);
      } catch {
        if (!cancelled) setItemFieldDefs([]);
      } finally {
        if (!cancelled) setLoadingDefs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sectorId, operationType, templateVersion, subSectorId]);

  useEffect(() => {
    if (!hasPlantField) return;
    let cancelled = false;
    setLoadingPlants(true);
    (async () => {
      try {
        const data = await getActivePlants();
        if (!cancelled) setPlants(data);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingPlants(false); }
    })();
    return () => { cancelled = true; };
  }, [hasPlantField]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setLoadingPublishers(true);
    (async () => {
      try {
        const entities = await getV2PublisherEntities();
        if (!cancelled) {
          setPublisherEntities(entities);
          if (entities.length === 1) setSelectedPublisherId(entities[0].id);
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingPublishers(false); }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isPartnership) return;
    let cancelled = false;
    setLoadingRoleCatalog(true);
    (async () => {
      try {
        const catalog = await getPartnershipRoleCatalog();
        if (!cancelled) setRoleCatalog(catalog);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingRoleCatalog(false); }
    })();
    return () => { cancelled = true; };
  }, [isPartnership]);

  const loadVarieties = useCallback(async (plantId: string) => {
    if (varietyCache[plantId]) return;
    setVarietyLoading((prev) => ({ ...prev, [plantId]: true }));
    try {
      const vars = await getVarietiesByPlant(plantId);
      setVarietyCache((prev) => ({ ...prev, [plantId]: vars }));
    } catch { /* ignore */ }
    finally { setVarietyLoading((prev) => ({ ...prev, [plantId]: false })); }
  }, [varietyCache]);

  const updateItem = useCallback((index: number, key: string, value: unknown) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value } as ItemData;
      return next;
    });
    setErrors((prev) => { const n = { ...prev }; delete n[`item_${index}_${key}`]; return n; });
  }, []);

  const handlePlantChange = useCallback((index: number, plantId: string) => {
    const plant = plants.find((p) => p.id === plantId);
    if (plant) {
      updateItem(index, 'plant_id', plantId);
      updateItem(index, 'plant_name', plant.arabic_name);
      if (hasVarietyField) {
        updateItem(index, 'variety_id', '');
        updateItem(index, 'variety_name', '');
        loadVarieties(plantId);
      }
    }
  }, [plants, hasVarietyField, updateItem, loadVarieties]);

  const handleVarietyChange = useCallback((index: number, varietyId: string) => {
    const plantId = items[index]?.plant_id as string;
    if (!plantId) return;
    if (varietyId === '__all__') {
      updateItem(index, 'variety_id', '');
      updateItem(index, 'variety_name', 'جميع الأصناف المقبولة');
      return;
    }
    const vars = varietyCache[plantId] ?? [];
    const v = vars.find((x) => x.id === varietyId);
    updateItem(index, 'variety_id', varietyId || '');
    updateItem(index, 'variety_name', v?.name_ar ?? '');
  }, [items, varietyCache, updateItem]);

  const addItem = useCallback(() => setItems((prev) => [...prev, emptyItem()] as ItemData[]), []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setItemImages((prev) => {
      const next: Record<number, UploadedImage[]> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      });
      return next;
    });
  }, []);

  const clearError = useCallback((key: string) => {
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const updatePartnershipProfile = useCallback((patch: Partial<PartnershipProfileState>) => {
    setPartnershipProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const updatePartnershipRole = useCallback((index: number, patch: Partial<PartnershipRole>) => {
    setPartnershipRoles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const addPartnershipRole = useCallback(() => {
    setPartnershipRoles((prev) => [...prev, emptyPartnershipRole()]);
  }, []);

  const removePartnershipRole = useCallback((index: number) => {
    setPartnershipRoles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRoleCatalogSelect = useCallback((index: number, roleKey: string) => {
    const entry = roleCatalog.find((r) => r.role_key === roleKey);
    if (entry) {
      updatePartnershipRole(index, {
        role_key: roleKey,
        role_label_snapshot: entry.name_ar,
        description: entry.description ?? '',
      });
    }
  }, [roleCatalog, updatePartnershipRole]);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'العنوان مطلوب';
    if (!city.trim()) e.city = 'المدينة مطلوبة';
    if (items.length === 0 && !isPartnership) e._items = 'يجب إضافة عنصر واحد على الأقل';

    if (isPartnership) {
      if (!partnershipProfile.partnership_type) e.partnership_type = 'نوع الشراكة مطلوب';
      if (!partnershipProfile.summary.trim()) e.partnership_summary = 'الوصف مطلوب';
      if (partnershipProfile.join_deadline) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(partnershipProfile.join_deadline) < today) {
          e.join_deadline = 'آخر موعد للانضمام لا يسبق تاريخ اليوم';
        }
      }
      if (partnershipProfile.start_date && partnershipProfile.join_deadline) {
        const isFlex = partnershipProfile.coverage_mode === 'mixed' || false;
        if (new Date(partnershipProfile.start_date) < new Date(partnershipProfile.join_deadline) && !isFlex) {
          e.start_date = 'تاريخ البداية لا يسبق آخر موعد للانضمام (إلا إذا كان الموعد مرنًا)';
        }
      }
      if (partnershipProfile.partners_count_mode === 'fixed') {
        const n = Number(partnershipProfile.required_partners_count);
        if (!n || n <= 0) e.required_partners_count = 'عدد الشركاء يجب أن يكون أكبر من صفر في الوضع المحدد';
      }
      const validRoles = partnershipRoles.filter((r) => r.role_key && r.role_label_snapshot);
      if (partnershipProfile.partnership_type === 'project_execution' || partnershipProfile.partnership_type === 'supply') {
        if (partnershipProfile.coverage_mode !== 'single_partner' && validRoles.length === 0) {
          e._roles = 'يجب تحديد دور واحد على الأقل لشراكات التنفيذ والتوريد الجماعي';
        }
      }
    }

    if (isDemand) {
      if (timing.bidDeadline) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(timing.bidDeadline) < today) e.bidDeadline = 'آخر موعد للعروض لا يسبق تاريخ اليوم';
      }
      if (timing.supplyDate && timing.bidDeadline) {
        if (new Date(timing.supplyDate) < new Date(timing.bidDeadline) && !timing.isFlexible) {
          e.supplyDate = 'موعد التوريد لا يسبق آخر موعد لاستقبال العروض (إلا إذا كان الموعد مرنًا)';
        }
      }
      if (timing.batch.enabled && !timing.batch.count) {
        e.batchCount = 'عدد الدفعات مطلوب عند اختيار التوريد على دفعات';
      }
      items.forEach((item, i) => {
        const qty = Number(item.quantity);
        const minQty = Number(item.min_supplier_qty);
        if (qty > 0 && minQty > 0 && minQty > qty) {
          e[`item_${i}_min_supplier_qty`] = 'الحد الأدنى من المورد لا يمكن أن يتجاوز الكمية الإجمالية';
        }
        const minP = Number(item.min_price);
        const maxP = Number(item.max_price);
        if (minP > 0 && maxP > 0 && minP > maxP) {
          e[`item_${i}_max_price`] = 'الحد الأدنى للسعر لا يمكن أن يتجاوز الحد الأعلى';
        }
      });
    }

    itemFieldDefs.forEach((field) => {
      if (!field.is_required) return;
      if (field.conditional_field_key && field.conditional_values) {
        items.forEach((item, i) => {
          const condVal = item[field.conditional_field_key!] as string;
          if (!condVal || !field.conditional_values!.includes(condVal)) return;
          const val = item[field.field_key];
          if (val === undefined || val === null || val === '') {
            e[`item_${i}_${field.field_key}`] = `${field.label} مطلوب`;
          }
        });
      } else {
        items.forEach((item, i) => {
          const val = item[field.field_key];
          if (val === undefined || val === null || val === '' ||
              (Array.isArray(val) && val.length === 0)) {
            e[`item_${i}_${field.field_key}`] = `${field.label} مطلوب`;
          }
        });
      }
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [title, city, items, itemFieldDefs, isDemand, isPartnership, timing, partnershipProfile, partnershipRoles]);

  return {
    isDemand, isPartnership,
    title, setTitle, description, setDescription, city, setCity,
    items, setItems, updateItem, handlePlantChange, handleVarietyChange, addItem, removeItem,
    generalImages, setGeneralImages, generalUploading, setGeneralUploading,
    itemImages, setItemImages, itemUploading, setItemUploading,
    itemFieldDefs, loadingDefs, plants, loadingPlants, varietyCache, varietyLoading,
    publisherEntities, selectedPublisherId, setSelectedPublisherId, loadingPublishers,
    errors, setErrors, clearError, submitting, setSubmitting,
    timing, setTiming, validate,
    hasPlantField, hasVarietyField, hasItemImagesField,
    partnershipProfile, updatePartnershipProfile,
    partnershipRoles, updatePartnershipRole, addPartnershipRole, removePartnershipRole,
    handleRoleCatalogSelect, roleCatalog, loadingRoleCatalog,
    isLoggedIn,
  };
}

export type OpportunityFormState = ReturnType<typeof useOpportunityFormState>;
