import { MapPin, UserCircle2, Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

type Props = {
  city: string;
  onCityClick: () => void;
  onAccountClick: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
};

function SiwarLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* trunk */}
      <line x1="22" y1="38" x2="22" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      {/* fronds */}
      <path d="M22 20 C18 16 10 15 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 20 C26 16 34 15 36 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 20 C20 14 20 8 22 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 20 C16 17 11 12 12 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
      <path d="M22 20 C28 17 33 12 32 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
      {/* dates cluster */}
      <circle cx="17" cy="24" r="1.8" fill="currentColor" opacity="0.9"/>
      <circle cx="22" cy="26" r="1.8" fill="currentColor" opacity="0.9"/>
      <circle cx="27" cy="24" r="1.8" fill="currentColor" opacity="0.9"/>
      <circle cx="19.5" cy="27.5" r="1.6" fill="currentColor" opacity="0.7"/>
      <circle cx="24.5" cy="27.5" r="1.6" fill="currentColor" opacity="0.7"/>
    </svg>
  );
}

export default function NetworkHeader({
  city,
  onCityClick,
  onAccountClick,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const showSearchBar = searchOpen || searchValue.length > 0;

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: '#1b5e35',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}
    >
      <div className="flex items-center h-[60px] px-4 max-w-5xl mx-auto">
        {showSearchBar ? (
          <div className="relative flex-1">
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-white rounded-xl pr-10 pl-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all duration-200"
              style={{ height: '40px' }}
            />
            <button
              onClick={() => { onSearchChange(''); setSearchOpen(false); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* RIGHT: logo + brand text */}
            <div className="flex items-center gap-2.5">
              <SiwarLogo className="w-10 h-10 text-white" />
              <div className="flex flex-col leading-none gap-0.5">
                <span className="text-2xl font-black text-white" style={{ fontFamily: 'Tajawal, sans-serif', letterSpacing: '-0.5px' }}>صوار</span>
                <span className="text-[11px] text-white/80 font-medium">الشبكة الزراعية الذكية</span>
              </div>
            </div>

            <div className="flex-1" />

            {/* LEFT: 3 icon circles — in RTL, DOM order = location, account, search → visual left-to-right: search, account, location */}
            <div className="flex items-center gap-2">
              {/* Location */}
              <button
                onClick={onCityClick}
                className="tap-scale flex items-center justify-center w-11 h-11 rounded-full border-2 border-white/60 text-white hover:bg-white/10 transition-colors"
                aria-label={city}
              >
                <MapPin className="w-5 h-5" />
              </button>
              {/* Account */}
              <button
                onClick={onAccountClick}
                className="tap-scale flex items-center justify-center w-11 h-11 rounded-full border-2 border-white/60 text-white hover:bg-white/10 transition-colors"
                aria-label="الحساب"
              >
                <UserCircle2 className="w-5 h-5" />
              </button>
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="tap-scale flex items-center justify-center w-11 h-11 rounded-full border-2 border-white/60 text-white hover:bg-white/10 transition-colors"
                aria-label="البحث"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
