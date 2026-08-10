export default function SubSectorSliderSkeleton() {
  return (
    <div className="px-3 sm:px-4 pb-2.5 pt-1">
      <div className="skeleton-shimmer h-2.5 w-28 rounded mb-2 px-1" />
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer rounded-full" style={{ width: '72px', height: '38px' }} />
        ))}
      </div>
    </div>
  );
}
