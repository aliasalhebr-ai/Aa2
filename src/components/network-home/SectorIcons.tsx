type Props = {
  className?: string;
};

export function PalmTreeIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Trunk */}
      <path
        d="M48 92 C47 80 46 65 47 50 C48 35 49 25 50 18"
        stroke="#8B6F47"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Trunk segments */}
      <path d="M46 80 L52 80 M45 70 L53 70 M45 60 L53 60 M46 50 L52 50 M47 40 L52 40 M48 30 L52 30" stroke="#6B5435" strokeWidth="1.5" strokeLinecap="round" />
      {/* Fronds (palm leaves) */}
      <g stroke="#2D8B5E" strokeWidth="3.5" fill="none" strokeLinecap="round">
        <path d="M50 18 C38 14 25 10 14 12 C20 16 30 18 50 18" fill="#3DA872" />
        <path d="M50 18 C62 14 75 10 86 12 C80 16 70 18 50 18" fill="#3DA872" />
        <path d="M50 18 C42 8 32 2 22 0 C28 8 38 14 50 18" fill="#3DA872" />
        <path d="M50 18 C58 8 68 2 78 0 C72 8 62 14 50 18" fill="#3DA872" />
        <path d="M50 18 C48 6 50 -2 52 -4 C54 4 52 12 50 18" fill="#3DA872" />
      </g>
      {/* Date clusters (fruits) */}
      <g fill="#C4781F" stroke="#A05E15" strokeWidth="0.5">
        <circle cx="44" cy="28" r="2.5" />
        <circle cx="47" cy="31" r="2.5" />
        <circle cx="43" cy="33" r="2.5" />
        <circle cx="46" cy="36" r="2.5" />
        <circle cx="42" cy="39" r="2.5" />
        <circle cx="45" cy="42" r="2" />
        <circle cx="43" cy="45" r="2" />
      </g>
      <g fill="#D4881F" stroke="#A05E15" strokeWidth="0.5">
        <circle cx="55" cy="28" r="2.5" />
        <circle cx="53" cy="31" r="2.5" />
        <circle cx="56" cy="33" r="2.5" />
        <circle cx="54" cy="36" r="2.5" />
        <circle cx="57" cy="39" r="2" />
        <circle cx="55" cy="42" r="2" />
      </g>
    </svg>
  );
}

export function AppleTreeIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Trunk */}
      <path
        d="M47 92 L47 55 C47 50 53 50 53 55 L53 92"
        stroke="#7A5C3A"
        strokeWidth="5"
        fill="#8B6F47"
        strokeLinecap="round"
      />
      {/* Branches */}
      <path d="M50 55 C40 48 30 45 22 42" stroke="#7A5C3A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M50 55 C60 48 70 45 78 42" stroke="#7A5C3A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Foliage canopy */}
      <circle cx="50" cy="35" r="22" fill="#4CAF50" />
      <circle cx="32" cy="38" r="14" fill="#5DBE5D" />
      <circle cx="68" cy="38" r="14" fill="#5DBE5D" />
      <circle cx="40" cy="22" r="12" fill="#5DBE5D" />
      <circle cx="60" cy="22" r="12" fill="#5DBE5D" />
      <circle cx="50" cy="18" r="10" fill="#6BCE6B" />
      {/* Apples */}
      <g fill="#E53935" stroke="#C62828" strokeWidth="0.5">
        <circle cx="35" cy="32" r="3.5" />
        <circle cx="62" cy="28" r="3.5" />
        <circle cx="48" cy="42" r="3.5" />
        <circle cx="70" cy="42" r="3" />
        <circle cx="28" cy="44" r="3" />
        <circle cx="55" cy="20" r="3" />
      </g>
      {/* Apple stems */}
      <g stroke="#5D4037" strokeWidth="0.8" strokeLinecap="round">
        <path d="M35 29 L35 27" />
        <path d="M62 25 L62 23" />
        <path d="M48 39 L48 37" />
        <path d="M55 17 L55 15" />
      </g>
      {/* Leaf highlights */}
      <ellipse cx="44" cy="28" rx="3" ry="1.5" fill="#7DD87D" opacity="0.5" transform="rotate(-30 44 28)" />
      <ellipse cx="58" cy="32" rx="3" ry="1.5" fill="#7DD87D" opacity="0.5" transform="rotate(-30 58 32)" />
    </svg>
  );
}

export function AuctionIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Gavel head */}
      <rect x="22" y="28" width="36" height="16" rx="3" fill="#C49A6C" stroke="#8B6F47" strokeWidth="1.5" />
      <rect x="25" y="31" width="30" height="3" rx="1" fill="#D9A7B53" opacity="0.5" />
      {/* Gavel handle */}
      <path
        d="M58 36 C66 42 74 48 82 54"
        stroke="#8B6F47"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Sound block (striking base) */}
      <rect x="18" y="72" width="40" height="10" rx="2" fill="#A0825A" stroke="#7A5C3A" strokeWidth="1.5" />
      <rect x="21" y="74" width="34" height="2" rx="1" fill="#7A5C3A" opacity="0.3" />
      {/* Impact lines */}
      <g stroke="#D4A24E" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M62 22 L66 16" />
        <path d="M68 26 L74 22" />
        <path d="M58 18 L60 12" />
      </g>
      {/* Sparkle */}
      <g fill="#F0C75E">
        <circle cx="70" cy="14" r="1.5" />
        <circle cx="76" cy="18" r="1" />
        <circle cx="64" cy="10" r="1" />
      </g>
    </svg>
  );
}
