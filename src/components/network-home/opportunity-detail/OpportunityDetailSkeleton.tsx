import { ChevronLeft } from 'lucide-react';

type Props = {
  onClose: () => void;
};

export default function OpportunityDetailSkeleton({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="flex items-center gap-2 px-3 py-3 bg-white border-b border-gray-100">
        <button onClick={onClose} className="tap-scale p-2 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <div className="skeleton-shimmer h-3 w-20 rounded mb-1" />
          <div className="skeleton-shimmer h-4 w-32 rounded" />
        </div>
        <div className="skeleton-shimmer h-5 w-12 rounded" />
      </div>

      {/* Image skeleton */}
      <div className="skeleton-shimmer w-full h-56" />

      {/* Title skeleton */}
      <div className="px-4 py-3 space-y-2">
        <div className="skeleton-shimmer h-5 w-3/4 rounded" />
        <div className="flex gap-1.5">
          <div className="skeleton-shimmer h-5 w-14 rounded-full" />
          <div className="skeleton-shimmer h-5 w-16 rounded-full" />
          <div className="skeleton-shimmer h-5 w-10 rounded-full" />
        </div>
      </div>

      {/* Items slider skeleton */}
      <div className="px-4 py-2">
        <div className="skeleton-shimmer h-3 w-20 rounded mb-2" />
        <div className="flex gap-2">
          <div className="skeleton-shimmer w-20 h-16 rounded-xl" />
          <div className="skeleton-shimmer w-20 h-16 rounded-xl" />
          <div className="skeleton-shimmer w-20 h-16 rounded-xl" />
        </div>
      </div>

      {/* Specs skeleton */}
      <div className="px-4 py-2">
        <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
          <div className="skeleton-shimmer h-3 w-16 rounded" />
          <div className="skeleton-shimmer h-4 w-full rounded" />
          <div className="skeleton-shimmer h-4 w-2/3 rounded" />
          <div className="skeleton-shimmer h-4 w-3/4 rounded" />
          <div className="skeleton-shimmer h-4 w-1/2 rounded" />
        </div>
      </div>

      {/* Publisher skeleton */}
      <div className="px-4 py-2">
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
          <div className="skeleton-shimmer w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton-shimmer h-3 w-24 rounded" />
            <div className="skeleton-shimmer h-2.5 w-16 rounded" />
          </div>
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-2">
        <div className="skeleton-shimmer flex-1 h-10 rounded-xl" />
        <div className="skeleton-shimmer flex-1 h-10 rounded-xl" />
      </div>
    </div>
  );
}
