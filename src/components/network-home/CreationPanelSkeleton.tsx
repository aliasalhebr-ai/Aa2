export default function CreationPanelSkeleton() {
  return (
    <div className="px-3 sm:px-4 pb-3 pt-1">
      <div className="rounded-2xl bg-siwar-50 border border-siwar-100 p-3.5">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div>
            <div className="skeleton-shimmer h-4 w-36 rounded mb-1.5" />
            <div className="skeleton-shimmer h-2.5 w-28 rounded" />
          </div>
          <div className="skeleton-shimmer h-8 w-20 rounded-xl" />
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer rounded-full" style={{ width: '90px', height: '28px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
