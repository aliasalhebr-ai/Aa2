export default function SectorSliderSkeleton() {
  return (
    <div className="pt-3.5 pb-2">
      <div className="no-scrollbar overflow-x-auto px-3 sm:px-4">
        <div className="flex gap-2.5 pb-1.5" style={{ width: 'max-content' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer rounded-2xl" style={{ width: '88px', minHeight: '108px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
