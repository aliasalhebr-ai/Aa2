import { Search, X } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function DiscoverySearchBar({
  value,
  onChange,
  placeholder = 'ابحث عن نبات أو صنف أو فرصة',
}: Props) {
  return (
    <div className="px-3 sm:px-4 pt-2 pb-1">
      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50/80 text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-siwar-400 focus:bg-white focus:ring-2 focus:ring-siwar-100 transition-all"
          aria-label="بحث الفرص"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="مسح البحث"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}
