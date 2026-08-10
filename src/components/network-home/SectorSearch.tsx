import { useState, useEffect, useRef } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import type { Sector } from '@/types';

type Props = {
  sector: Sector | null;
  value: string;
  onChange: (value: string) => void;
};

export default function SectorSearch({ sector, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholder =
    sector?.search_placeholder ||
    'ابحث عن فرصة، شركة، منتج أو خدمة...';

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="px-3 sm:px-4 pb-2 pt-0.5 flex items-center gap-2">
      {/* Collapsed: search icon button */}
      {!open && !value ? (
        <button
          onClick={() => setOpen(true)}
          className="tap-scale flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-soft hover:border-siwar-300 hover:shadow-card transition-all duration-300 flex-shrink-0"
          style={{ width: '40px', height: '40px' }}
        >
          <Search className="w-5 h-5 text-gray-500" />
        </button>
      ) : (
        /* Expanded: full search bar */
        <div className="relative flex-1 spring-in">
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
            <Search className={`w-4.5 h-4.5 transition-all duration-300 ${value ? 'text-siwar-600 scale-110' : 'text-gray-400'}`} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-white border border-gray-200 rounded-full pr-11 pl-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-siwar-400 focus:ring-4 focus:ring-siwar-100/60 focus:shadow-soft transition-all duration-300 shadow-soft"
            style={{ height: '40px' }}
          />
          {value ? (
            <button
              onClick={() => onChange('')}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 hover:scale-110 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setOpen(false)}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 hover:scale-110 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Filter icon button — always visible */}
      {!open || value ? null : (
        <button
          className="tap-scale flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-soft hover:border-siwar-300 hover:shadow-card transition-all duration-300 flex-shrink-0"
          style={{ width: '40px', height: '40px' }}
        >
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </div>
  );
}
