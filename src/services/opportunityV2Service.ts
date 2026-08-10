import { supabase } from '@/lib/supabase';
import {
  uploadOpportunityImage,
  deleteOpportunityImage,
  createSignedImageUrl,
  getPublisherEntitiesForUser,
} from './opportunityService';
import type { ItemFieldDefinition, ItemData, PublisherEntity, PartnershipRoleCatalogEntry, PartnershipProfile, PartnershipRole } from '@/types';

export type PlantOption = {
  id: string;
  arabic_name: string;
  english_name: string | null;
  scientific_name: string | null;
  category_id: string;
};

export type VarietyOption = {
  id: string;
  plant_id: string;
  name_ar: string;
  name_en: string | null;
};

export type SavedV2Opportunity = {
  id: string;
  title: string;
  status: string;
};

// ── Allowlist: the ONLY column names that buildItemPayload will map to ──
// Any column_name from the DB not in this set is rejected and falls back to attributes.
const ALLOWED_ITEM_COLUMNS = new Set<string>([
  'quantity',
  'unit',
  'unit_price',
  'pricing_type',
  'min_order_quantity',
  'age_value',
  'height_value',
  'trunk_diameter_value',
  'container_size',
  'root_status',
  'readiness_status',
  'reference_id',
  'plant_variety_id',
  'images',
]);

export async function getItemFieldDefinitions(
  sectorId: string,
  operationType: string,
  templateVersion: number,
  subSectorId?: string | null,
): Promise<ItemFieldDefinition[]> {
  let query = supabase
    .from('opportunity_item_field_definitions')
    .select('*')
    .eq('sector_id', sectorId)
    .eq('operation_type', operationType)
    .eq('template_version', templateVersion)
    .order('display_order', { ascending: true });

  if (subSectorId) {
    query = query.or(`sub_sector_id.is.null,sub_sector_id.eq.${subSectorId}`);
  } else {
    query = query.is('sub_sector_id', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(`فشل تحميل تعريفات الحقول: ${error.message}`);
  return (data ?? []) as unknown as ItemFieldDefinition[];
}

export async function getActivePlants(): Promise<PlantOption[]> {
  const { data, error } = await supabase
    .from('plant_catalog')
    .select('id, arabic_name, english_name, scientific_name, category_id')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('arabic_name', { ascending: true });
  if (error) throw new Error(`فشل تحميل دليل النباتات: ${error.message}`);
  return (data ?? []) as PlantOption[];
}

export async function getVarietiesByPlant(plantId: string): Promise<VarietyOption[]> {
  const { data, error } = await supabase
    .from('plant_varieties')
    .select('id, plant_id, name_ar, name_en')
    .eq('plant_id', plantId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name_ar', { ascending: true });
  if (error) throw new Error(`فشل تحميل الأصناف: ${error.message}`);
  return (data ?? []) as VarietyOption[];
}

export async function uploadV2Image(file: File): Promise<string> {
  return uploadOpportunityImage(file);
}

export async function removeV2Image(filePath: string): Promise<void> {
  await deleteOpportunityImage(filePath);
}

export async function getV2SignedUrl(filePath: string): Promise<string> {
  return createSignedImageUrl(filePath);
}

export async function getV2PublisherEntities(): Promise<PublisherEntity[]> {
  return getPublisherEntitiesForUser();
}

export async function getPartnershipRoleCatalog(): Promise<PartnershipRoleCatalogEntry[]> {
  const { data, error } = await supabase
    .from('partnership_role_catalog')
    .select('id, role_key, name_ar, name_en, description, icon, is_active, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw new Error(`فشل تحميل كتالوج أدوار الشراكة: ${error.message}`);
  return (data ?? []) as PartnershipRoleCatalogEntry[];
}

function toNumber(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function toStr(val: unknown): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val);
}

type ItemPayload = Record<string, unknown>;

function buildItemPayload(
  itemData: ItemData,
  fieldDefs: ItemFieldDefinition[],
  index: number,
): ItemPayload {
  const payload: ItemPayload = {
    item_type: 'plant',
    reference_source: null,
    reference_id: null,
    name_snapshot: String(itemData.plant_name ?? itemData.plant_id ?? 'بدون اسم'),
    variety_name_snapshot: null,
    plant_variety_id: null,
    quantity: null,
    unit: null,
    unit_price: null,
    pricing_type: null,
    min_order_quantity: null,
    age_value: null,
    height_value: null,
    trunk_diameter_value: null,
    container_size: null,
    root_status: null,
    readiness_status: null,
    cover_image: null,
    images: [],
    attributes: {},
    display_order: index,
    is_active: true,
  };

  for (const field of fieldDefs) {
    const key = field.field_key;
    const value = itemData[key];
    if (value === undefined || value === null || value === '') continue;

    const colName = field.column_name;

    if (key === 'plant_id') {
      payload.reference_source = 'plant_catalog';
      payload.reference_id = String(value);
    } else if (key === 'variety_id') {
      if (field.options_source === 'palm_varieties') {
        payload.reference_source = 'palm_varieties';
        payload.reference_id = String(value) || null;
        payload.name_snapshot = String(itemData.variety_name ?? value ?? 'صنف');
        payload.variety_name_snapshot = String(itemData.variety_name ?? value ?? '');
      } else {
        payload.plant_variety_id = String(value) || null;
        payload.variety_name_snapshot = String(itemData.variety_name ?? '');
      }
    } else if (key === 'item_images') {
      const imgs = Array.isArray(value) ? value as string[] : [];
      payload.images = imgs;
      payload.cover_image = imgs[0] ?? null;
    } else if (colName && ALLOWED_ITEM_COLUMNS.has(colName)) {
      // Column is in the allowlist — map to the dedicated column
      switch (colName) {
        case 'quantity': payload.quantity = toNumber(value); break;
        case 'unit': payload.unit = toStr(value); break;
        case 'unit_price': payload.unit_price = toNumber(value); break;
        case 'pricing_type': payload.pricing_type = toStr(value); break;
        case 'min_order_quantity': payload.min_order_quantity = toNumber(value); break;
        case 'age_value': payload.age_value = toNumber(value); break;
        case 'height_value': payload.height_value = toNumber(value); break;
        case 'trunk_diameter_value': payload.trunk_diameter_value = toNumber(value); break;
        case 'container_size': payload.container_size = toStr(value); break;
        case 'root_status': payload.root_status = toStr(value); break;
        case 'readiness_status': payload.readiness_status = toStr(value); break;
        default: (payload.attributes as Record<string, unknown>)[key] = value;
      }
    } else if (colName === null) {
      // Intentionally flexible field — store in attributes
      (payload.attributes as Record<string, unknown>)[key] = value;
    } else {
      // column_name is non-null but NOT in allowlist — reject
      throw new Error(`تعريف الحقل يشير إلى عمود غير مسموح: ${colName}`);
    }
  }

  return payload;
}

export async function createV2Opportunity(input: {
  sectorId: string;
  subSectorId: string;
  operationType: string;
  templateVersion: number;
  title: string;
  description: string;
  city: string;
  generalImages: string[];
  items: ItemData[];
  itemFieldDefs: ItemFieldDefinition[];
  status: 'draft' | 'pending_review';
  publisherEntityId: string | null;
  opportunityAttributes?: Record<string, unknown>;
  partnershipProfile?: PartnershipProfile | null;
  partnershipRoles?: PartnershipRole[] | null;
}): Promise<SavedV2Opportunity> {
  const {
    sectorId, subSectorId, operationType, templateVersion,
    title, description, city, generalImages, items, itemFieldDefs,
    status, publisherEntityId, opportunityAttributes,
    partnershipProfile, partnershipRoles,
  } = input;

  if (status === 'pending_review' && !publisherEntityId) {
    throw new Error('يجب اختيار جهة ناشرة قبل الإرسال للمراجعة');
  }

  // Build items JSON array for the RPC call
  const itemsJson = items.map((item, i) => buildItemPayload(item, itemFieldDefs, i));

  // Single atomic RPC call — the function handles the transaction
  const { data, error } = await supabase.rpc('create_v2_opportunity', {
    p_sector_id: sectorId,
    p_sub_sector_id: subSectorId || null,
    p_operation_type: operationType,
    p_template_version: templateVersion,
    p_title: title,
    p_description: description,
    p_city: city,
    p_general_images: generalImages,
    p_items: itemsJson,
    p_status: status,
    p_publisher_entity_id: publisherEntityId,
    p_opportunity_attributes: opportunityAttributes ?? {},
    p_partnership_profile: partnershipProfile ?? null,
    p_partnership_roles: partnershipRoles ?? null,
  });

  if (error) throw new Error(`فشل حفظ الفرصة: ${error.message}`);
  if (!data) throw new Error('فشل حفظ الفرصة: لم يتم إرجاع أي بيانات');

  return {
    id: data.id,
    title: data.title,
    status: data.status,
  };
}
