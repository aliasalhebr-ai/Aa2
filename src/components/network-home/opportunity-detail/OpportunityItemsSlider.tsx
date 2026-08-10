import type { OpportunityDetailItem } from '@/types';
import { resolveItemIconByKey } from '@/lib/itemIconResolver';

type Props = {
  items: OpportunityDetailItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  formatKey?: string;
};

function formatQtyShort(item: OpportunityDetailItem): string | null {
  if (item.quantity === null) return null;
  const unit = item.unit ?? '';
  const unitLabel: Record<string, string> = {
    ton: 'طن',
    kg: 'كغ',
    tree: 'نخلة',
    unit: 'وحدة',
  };
  const u = unitLabel[unit] ?? unit;
  return `${item.quantity.toLocaleString('ar-EG')}${u ? ' ' + u : ''}`;
}

export default function OpportunityItemsSlider({ items, selectedIndex, onSelectIndex }: Props) {
  if (items.length === 0) return null;

  // Single item — compact card, no slider chrome
  if (items.length === 1) {
    const item = items[0];
    const Icon = resolveItemIconByKey(item.iconKey);
    const qty = formatQtyShort(item);
    return (
      <div className="px-4 py-2.5">
        <div className="flex items-center gap-3 bg-gradient-to-l from-siwar-50/60 to-white rounded-xl p-3 border border-siwar-100/50">
          <div className="w-12 h-12 rounded-xl bg-siwar-100/60 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {item.coverImage ? (
              <img src={item.coverImage} alt={item.name ?? ''} loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <Icon className="w-6 h-6 text-siwar-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-800 truncate">{item.name ?? 'عنصر'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {item.varietyName && (
                <span className="text-[11px] text-gray-400 truncate">{item.varietyName}</span>
              )}
              {qty && (
                <span className="text-[10px] text-siwar-600 bg-siwar-50 px-1.5 py-0.5 rounded">{qty}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2.5">
      <div className="px-4 mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-700">العناصر</h3>
        <span className="text-[10px] text-gray-400 tabular-nums">{selectedIndex + 1} / {items.length}</span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-2 -mx-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, i) => {
          const Icon = resolveItemIconByKey(item.iconKey);
          const isSelected = i === selectedIndex;
          const qty = formatQtyShort(item);
          return (
            <button
              key={item.id}
              onClick={() => onSelectIndex(i)}
              className={`flex-shrink-0 w-[80px] rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
                isSelected
                  ? 'border-siwar-500 bg-siwar-50 shadow-sm scale-105'
                  : 'border-gray-100 bg-white hover:border-siwar-200'
              }`}
            >
              <div className={`w-full h-14 rounded-xl flex items-center justify-center mb-1.5 overflow-hidden ${isSelected ? 'bg-siwar-100/50' : 'bg-gray-100'}`}>
                {item.coverImage ? (
                  <img src={item.coverImage} alt={item.name ?? ''} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-siwar-500' : 'text-gray-300'}`} />
                )}
              </div>
              <p className={`text-[11px] font-bold truncate text-center ${isSelected ? 'text-siwar-700' : 'text-gray-600'}`}>
                {item.name ?? 'عنصر'}
              </p>
              {qty && (
                <p className={`text-[9px] truncate text-center mt-0.5 ${isSelected ? 'text-siwar-500' : 'text-gray-400'}`}>
                  {qty}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
