import { Skeleton } from '@/components/ui/skeleton';

export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-warm-white">
      {/* Header skeleton */}
      <div className="bg-pizza-dark px-4 py-3">
        <div className="max-w-[430px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full bg-gray-700" />
            <div>
              <Skeleton className="h-5 w-32 bg-gray-700" />
              <Skeleton className="h-3 w-24 mt-1 bg-gray-700" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 bg-gray-700 rounded-md" />
        </div>
      </div>

      {/* Category tabs skeleton */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="max-w-[430px] mx-auto flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </div>

      {/* Menu cards skeleton */}
      <div className="max-w-[430px] mx-auto px-4 py-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <Skeleton className="w-full h-44" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
