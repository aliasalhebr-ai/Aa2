import type {
  NetworkPulseEvent, OpportunityDetailItem,
} from '@/types';

function num(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function toStr(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  return String(val);
}

function resolveIconKey(event: NetworkPulseEvent): string {
  const sub = event.activity_subtype ?? '';
  const attrs = (event.attributes ?? {}) as Record<string, unknown>;

  if (sub.includes('fruit') || sub.includes('palm_fruit') || attrs['sale_model']) return 'variety';
  if (sub.includes('service')) return 'service';
  if (sub.includes('seedling') || sub.includes('nursery') || sub.includes('plant')) return 'seedling';
  if (sub.includes('residue') || sub.includes('waste')) return 'residue';
  if (sub.includes('supply') || sub.includes('equipment') || sub.includes('technology')) return 'supply';
  if (sub.includes('factory') || sub.includes('product')) return 'product';
  if (sub.includes('logistics') || sub.includes('transport')) return 'logistics';
  return 'default';
}

function specsFromAttrs(attrs: Record<string, unknown>): { label: string; value: string }[] {
  const specs: { label: string; value: string }[] = [];
  const add = (label: string, value: string | null) => {
    if (value) specs.push({ label, value });
  };

  add('الجودة', toStr(attrs['quality']));
  add('الموسم', toStr(attrs['season']));
  add('موعد الجني', toStr(attrs['harvest_date'] ?? attrs['available_from']));
  add('نوع الخدمة', toStr(attrs['service_type'] ?? attrs['service_name']));
  add('عدد النخيل', num(attrs['palm_count']) !== null ? `${num(attrs['palm_count'])} نخلة` : null);
  add('نطاق التغطية', toStr(attrs['coverage_area']));
  add('المدة', toStr(attrs['duration'] ?? attrs['expected_duration']));
  add('النبات', toStr(attrs['plant_name'] ?? attrs['plant_type']));
  add('العمر', num(attrs['age_value']) !== null ? `${num(attrs['age_value'])} سنة` : null);
  add('الارتفاع', num(attrs['height_value']) !== null ? `${num(attrs['height_value'])} م` : null);
  add('حجم الحاوية', toStr(attrs['container_size']));
  add('نوع المركبة', toStr(attrs['vehicle_type']));
  add('نقطة الانطلاق', toStr(attrs['origin'] ?? attrs['pickup_location']));
  add('الوجهة', toStr(attrs['destination'] ?? attrs['dropoff_location']));
  add('السعة', toStr(attrs['capacity']));
  add('نوع المخلفات', toStr(attrs['residue_type'] ?? attrs['waste_type']));
  add('المنتج', toStr(attrs['product_name'] ?? attrs['product_type']));
  add('الجهاز', toStr(attrs['device_name'] ?? attrs['equipment_type']));
  add('نظام الري', toStr(attrs['irrigation_system'] ?? attrs['irrigation_type']));
  add('المعدات', toStr(attrs['equipment']));
  add('القدرة اليومية', toStr(attrs['daily_capacity']));

  return specs;
}

function buildBaseItem(
  id: string,
  name: string | null,
  iconKey: string,
  event: NetworkPulseEvent,
  attrs: Record<string, unknown>,
  quantity: number | null,
  unit: string | null,
  price: number | null,
  images: string[],
  coverImage: string | null,
): OpportunityDetailItem {
  return {
    id,
    itemType: event.activity_subtype ?? null,
    referenceSource: null,
    referenceId: null,
    iconKey,
    name,
    varietyName: toStr(attrs['variety_name'] ?? attrs['variety']),
    quantity,
    unit,
    minimumQuantity: null,
    price,
    minimumPrice: num(attrs['min_price']),
    maximumPrice: num(attrs['max_price']),
    pricingType: toStr(attrs['pricing_type']),
    age: num(attrs['age_value']),
    minimumHeight: null,
    maximumHeight: num(attrs['height_value']),
    heightUnit: 'م',
    trunkDiameter: null,
    containerSize: toStr(attrs['container_size']),
    rootStatus: toStr(attrs['root_status']),
    readinessStatus: toStr(attrs['readiness_status']),
    availableFrom: toStr(attrs['available_from'] ?? attrs['harvest_date']),
    requiredSupplyDate: toStr(attrs['required_supply_date']),
    images,
    coverImage,
    notes: toStr(attrs['notes']),
    specifications: specsFromAttrs(attrs),
  };
}

export function adaptV1ToDetailItems(event: NetworkPulseEvent): OpportunityDetailItem[] {
  const attrs = (event.attributes ?? {}) as Record<string, unknown>;
  const iconKey = resolveIconKey(event);
  const eventImages = Array.isArray(event.images) ? event.images : [];
  const eventCover = event.image ?? (eventImages.length > 0 ? eventImages[0] : null);

  // Multi-variety: if attributes.varieties is an array, produce one item per variety
  const varieties = attrs['varieties'];
  if (Array.isArray(varieties) && varieties.length > 0) {
    return varieties.map((v, i) => {
      const vAttrs = (v ?? {}) as Record<string, unknown>;
      const vName = toStr(vAttrs['name'] ?? vAttrs['variety_name'] ?? vAttrs['variety']) ?? `صنف ${i + 1}`;
      const vImages = Array.isArray(vAttrs['images']) ? vAttrs['images'] as string[] : [];
      const vCover = toStr(vAttrs['cover_image'] ?? vAttrs['image']) ?? (vImages.length > 0 ? vImages[0] : null);
      return buildBaseItem(
        `${event.id}-v1-${i}`,
        vName,
        iconKey,
        event,
        vAttrs,
        num(vAttrs['quantity']),
        toStr(vAttrs['unit']),
        num(vAttrs['price'] ?? vAttrs['unit_price']),
        vImages,
        vCover,
      );
    });
  }

  // Multi-service: if attributes.services is an array, produce one item per service
  const services = attrs['services'];
  if (Array.isArray(services) && services.length > 0) {
    return services.map((s, i) => {
      const sAttrs = (s ?? {}) as Record<string, unknown>;
      const sName = toStr(sAttrs['name'] ?? sAttrs['service_name'] ?? sAttrs['service_type']) ?? `خدمة ${i + 1}`;
      const sImages = Array.isArray(sAttrs['images']) ? sAttrs['images'] as string[] : [];
      const sCover = toStr(sAttrs['cover_image'] ?? sAttrs['image']) ?? (sImages.length > 0 ? sImages[0] : null);
      return buildBaseItem(
        `${event.id}-v1-${i}`,
        sName,
        'service',
        event,
        sAttrs,
        num(sAttrs['quantity']),
        toStr(sAttrs['unit']),
        num(sAttrs['price'] ?? sAttrs['unit_price']),
        sImages,
        sCover,
      );
    });
  }

  // Single item fallback
  const itemName =
    toStr(attrs['item_name'] ?? attrs['variety_name'] ?? attrs['service_name'] ?? attrs['plant_name'] ?? attrs['product_name'] ?? attrs['residue_type'])
    ?? event.title;

  return [buildBaseItem(
    `${event.id}-v1-adapted`,
    itemName,
    iconKey,
    event,
    attrs,
    num(event.quantity),
    toStr(attrs['unit']),
    num(event.price),
    eventImages,
    eventCover,
  )];
}
