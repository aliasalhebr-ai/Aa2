export default function NetworkPulseSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="px-3 sm:px-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden flex"
          style={{ minHeight: '120px', maxHeight: '140px' }}
        >
          {/* Image skeleton — right side */}
          <div className="skeleton-shimmer w-28 h-full flex-shrink-0" />

          {/* Content skeleton — left side */}
          <div className="flex-1 p-2.5 flex flex-col justify-between gap-1.5">
            <div className="flex justify-between">
              <div className="skeleton-shimmer h-3 w-16 rounded" />
              <div className="skeleton-shimmer h-3 w-10 rounded" />
            </div>
            <div className="skeleton-shimmer h-3 w-full rounded" />
            <div className="skeleton-shimmer h-3 w-2/3 rounded" />
            <div className="flex gap-1">
              <div className="skeleton-shimmer h-4 w-16 rounded" />
              <div className="skeleton-shimmer h-4 w-14 rounded" />
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <div className="skeleton-shimmer w-4 h-4 rounded-full" />
                <div className="skeleton-shimmer h-2.5 w-16 rounded" />
              </div>
              <div className="skeleton-shimmer h-6 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
