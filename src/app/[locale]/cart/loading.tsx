import { Skeleton } from '@/components/ui/skeleton';

export default function CartLoading() {
  return (
    <div className="min-h-screen bg-warm-white">
      <div className="bg-pizza-dark px-4 py-3">
        <Skeleton className="h-6 w-32 bg-gray-700 mx-auto" />
      </div>
      <div className="max-w-[430px] mx-auto px-4 py-4">
        <Skeleton className="h-8 w-24 mb-4" />
        <div className="bg-white rounded-2xl p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
