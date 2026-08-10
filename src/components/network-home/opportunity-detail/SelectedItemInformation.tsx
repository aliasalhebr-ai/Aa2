import { Package, FileText } from 'lucide-react';
import type { OpportunityDetailItem } from '@/types';

type Props = {
  item: OpportunityDetailItem | null;
};

function formatQty(item: OpportunityDetailItem): string | null {
  if (item.quantity === null) return null;
  const unitLabels: Record<string, string> = {
    ton: 'طن',
    kg: 'كغ',
    tree: 'نخلة',
    unit: 'وحدة',
  };
  const u = unitLabels[item.unit ?? ''] ?? item.unit ?? '';
  return `${item.quantity.toLocaleString('ar-EG')}${u ? ' ' + u : ''}`;
}

function formatPrice(item: OpportunityDetailItem): string | null {
  if (item.price !== null) return `${item.price.toLocaleString('ar-EG')} ر.س`;
  if (item.minimumPrice !== null && item.maximumPrice !== null) {
    return `${item.minimumPrice.toLocaleString('ar-EG')} — ${item.maximumPrice.toLocaleString('ar-EG')} ر.س`;
  }
  if (item.minimumPrice !== null) return `من ${item.minimumPrice.toLocaleString('ar-EG')} ر.س`;
  return null;
}

function formatHeight(item: OpportunityDetailItem): string | null {
  if (item.minimumHeight !== null && item.maximumHeight !== null) {
    return `${item.minimumHeight} — ${item.maximumHeight} ${item.heightUnit ?? 'م'}`;
  }
  if (item.maximumHeight !== null) return `${item.maximumHeight} ${item.heightUnit ?? 'م'}`;
  return null;
}

function SpecRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-[12px] text-gray-400">{label}</span>
      <span className="text-[12px] font-semibold text-gray-800">{value}</span>
    </div>
  );
}

export default function SelectedItemInformation({ item }: Props) {
  if (!item) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs text-gray-400 text-center">لا توجد عناصر في هذه الفرصة</p>
      </div>
    );
  }

  const qty = formatQty(item);
  const price = formatPrice(item);
  const height = formatHeight(item);

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Item name header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-siwar-100/60 flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4 text-siwar-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-gray-900 truncate">{item.name ?? 'عنصر'}</h3>
          {item.varietyName && item.varietyName !== item.name && (
            <p className="text-[11px] text-gray-400 truncate">{item.varietyName}</p>
          )}
        </div>
      </div>

      {/* Key metrics — prominent cards */}
      {(qty || price) && (
        <div className="grid grid-cols-2 gap-2">
          {qty && (
            <div className="bg-siwar-50/50 rounded-xl p-2.5 border border-siwar-100/40">
              <p className="text-[10px] text-gray-400 mb-0.5">الكمية</p>
              <p className="text-sm font-bold text-siwar-700">{qty}</p>
            </div>
          )}
          {price && (
            <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100/40">
              <p className="text-[10px] text-gray-400 mb-0.5">السعر</p>
              <p className="text-sm font-bold text-emerald-700">{price}</p>
            </div>
          )}
        </div>
      )}

      {/* Specifications */}
      <div className="bg-white rounded-xl border border-gray-100 px-3 py-2">
        <SpecRow label="طريقة التسعير" value={item.pricingType} />
        <SpecRow label="العمر" value={item.age !== null ? `${item.age} سنة` : null} />
        <SpecRow label="الارتفاع" value={height} />
        <SpecRow label="حجم الحاوية" value={item.containerSize} />
        <SpecRow label="حالة الجذور" value={item.rootStatus} />
        <SpecRow label="الجاهزية" value={item.readinessStatus} />
        <SpecRow label="التوفر" value={item.availableFrom} />
        <SpecRow label="موعد التوريد" value={item.requiredSupplyDate} />
      </div>

      {/* Additional specifications */}
      {item.specifications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 px-3 py-2">
          <h4 className="text-[11px] font-bold text-gray-500 mb-1">تفاصيل إضافية</h4>
          {item.specifications.map((spec, i) => (
            <SpecRow key={i} label={spec.label} value={spec.value} />
          ))}
        </div>
      )}

      {/* Notes */}
      {item.notes && (
        <div className="bg-amber-50/40 rounded-xl border border-amber-100/50 p-3 flex items-start gap-2">
          <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">{item.notes}</p>
        </div>
      )}
    </div>
  );
}
