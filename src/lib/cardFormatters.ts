import type { PalmVariety, PalmServiceBranch, PalmServiceItem, PalmResidueType, MeasurementUnit } from '@/types';

const VARIETY_MAP: Record<string, string> = {};
const SERVICE_BRANCH_MAP: Record<string, string> = {};
const SERVICE_ITEM_MAP: Record<string, string> = {};
const RESIDUE_TYPE_MAP: Record<string, string> = {};
const UNIT_MAP: Record<string, string> = {};

let lookupMapsInitialized = false;

export function initLookupMaps(
  varieties: PalmVariety[],
  branches: PalmServiceBranch[],
  items: PalmServiceItem[],
  residues: PalmResidueType[],
  units: MeasurementUnit[],
) {
  for (const v of varieties) VARIETY_MAP[v.slug] = v.name;
  for (const b of branches) SERVICE_BRANCH_MAP[b.key] = b.label;
  for (const i of items) SERVICE_ITEM_MAP[i.key] = i.label;
  for (const r of residues) RESIDUE_TYPE_MAP[r.key] = r.label;
  for (const u of units) UNIT_MAP[u.key] = u.label;
  lookupMapsInitialized = true;
}

export function isLookupMapsInitialized() {
  return lookupMapsInitialized;
}

const VALUE_LABELS: Record<string, string> = {
  full_harvest: 'كامل محصول المزرعة',
  by_kilo: 'بيع بالكيلو',
  by_piece: 'بيع بالقطعة',
  by_lot: 'بيع بالدفعة',
  whole_farm: 'المزرعة كاملة',
  crescent: 'تكريب هلالي',
  هلالي: 'تكريب هلالي',
  normal: 'تكريب عادي',
  عادي: 'تكريب عادي',
  rooted: 'متجذرة',
  متجذر: 'متجذرة',
  غير_متجذر: 'غير متجذرة',
  partial: 'تجذير جزئي',
  جزئي: 'تجذير جزئي',
  good: 'جيد',
  excellent: 'ممتاز',
  acceptable: 'مقبول',
  ممتازة: 'ممتازة',
  جيدة: 'جيدة',
  مقبولة: 'مقبولة',
  fresh: 'طازج',
  dried: 'مجفف',
  ripe: 'ناضج',
  uprooted: 'مقلوع',
  potted: 'في أصص',
  bare_root: 'مجذور عاري',
  yes: 'نعم',
  no: 'لا',
  true: 'متاح',
  false: 'غير متاح',
  new: 'جديد',
  used: 'مستعمل',
  weight: 'بالوزن',
  count: 'بالعدد',
  manual_desc: 'وصف يدوي',
  company: 'شركة',
  individual: 'فرد',
  team: 'فريق',
  organization: 'جهة',
  year_round: 'طوال السنة',
  seasonal: 'موسمي',
  price: 'سعر محدد',
  quote: 'طلب عرض سعر',
  irrigation_systems: 'أنظمة ري',
  fertilization: 'تسميد',
  pest_control: 'مكافحة آفات',
  pollination_tools: 'أدوات التلقيح',
  harvest_equipment: 'معدات الحصاد',
  smart_tech: 'تقنيات ذكية',
  packing_supplies: 'مستلزمات التعبئة',
  جاهز: 'جاهز',
  يحتاج_تهيئة: 'يحتاج تهيئة',
  غير_جاهز: 'غير جاهز',
  سليم: 'سليم',
  سليم_مع_ملاحظات: 'سليم مع ملاحظات',
  يحتاج_معالجة: 'يحتاج معالجة',
  جافة: 'جافة',
  طازجة: 'طازجة',
  مخلوطة: 'مخلوطة',
};

export function formatValue(rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined || rawValue === '') return '';
  const str = String(rawValue).trim();
  if (str === '') return '';
  const lower = str.toLowerCase();
  if (VALUE_LABELS[lower]) return VALUE_LABELS[lower];
  if (VALUE_LABELS[str]) return VALUE_LABELS[str];
  if (str === 'true') return 'متاح';
  if (str === 'false') return 'غير متاح';
  return str;
}

export function formatVariety(slug: string): string {
  return VARIETY_MAP[slug] ?? slug;
}

export function formatServiceBranch(key: string): string {
  return SERVICE_BRANCH_MAP[key] ?? key;
}

export function formatServiceItem(key: string): string {
  return SERVICE_ITEM_MAP[key] ?? key;
}

export function formatResidueType(key: string): string {
  return RESIDUE_TYPE_MAP[key] ?? key;
}

export function formatUnit(key: string): string {
  return UNIT_MAP[key] ?? key;
}

export function formatArray(
  rawValue: unknown,
  formatter: (key: string) => string,
  maxDisplay: number = 3,
): { text: string; extraCount: number } {
  if (!Array.isArray(rawValue)) {
    const single = formatValue(rawValue);
    return { text: single, extraCount: 0 };
  }
  const labels = rawValue.map((v) => formatter(String(v))).filter((v) => v !== '');
  if (labels.length === 0) return { text: '', extraCount: 0 };
  const displayed = labels.slice(0, maxDisplay);
  const text = displayed.join(' • ');
  const extraCount = labels.length - maxDisplay;
  return { text, extraCount };
}

export function formatPrice(price: string | null | undefined): string | null {
  if (!price) return null;
  const lower = price.toLowerCase().trim();
  if (lower.includes('تفاوض') || lower === 'بالتفاوض') return 'طلب عرض سعر';
  if (lower.includes('quote') || lower.includes('عرض سعر')) return 'طلب عرض سعر';
  if (price === '0' || price === '0 ريال' || price === '0 ر.س') return null;
  const cleaned = price.replace(/ريال\/?(\S+)?/i, '').replace(/ريال/i, '').trim();
  if (cleaned && cleaned !== price) {
    return `${cleaned} ر.س`;
  }
  return price;
}

export function formatOperationType(subtype: string | null | undefined): string {
  if (!subtype) return '';
  const map: Record<string, string> = {
    offer: 'عرض',
    demand: 'طلب',
    sell: 'عرض',
    buy: 'طلب',
    project: 'مشروع',
    invest: 'استثمار',
    service_offer: 'عرض خدمة',
    service_request: 'طلب خدمة',
    request: 'طلب خدمة',
    new: 'منتج جديد',
    announcement: 'إعلان',
    live: 'مزاد مباشر',
    upcoming: 'مزاد قادم',
    auction_request: 'طلب مزاد',
    logistics_request: 'طلب لوجستي',
  };
  return map[subtype] ?? subtype;
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'منذ لحظات';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
  return new Date(dateStr).toLocaleDateString('ar-EG');
}

export const OPERATION_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  offer:            { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  sell:             { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  demand:           { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500' },
  buy:              { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500' },
  project:          { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500' },
  invest:           { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500' },
  service_offer:    { bg: 'bg-teal-50',    text: 'text-teal-700',    dot: 'bg-teal-500' },
  service_request:  { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  request:          { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  new:              { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  announcement:     { bg: 'bg-slate-50',   text: 'text-slate-700',   dot: 'bg-slate-500' },
  live:             { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
  upcoming:         { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  auction_request:  { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  logistics_request:{ bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-500' },
};

export function getOperationMeta(subtype: string | null | undefined) {
  if (!subtype) return null;
  return OPERATION_TYPE_COLORS[subtype] ?? null;
}
