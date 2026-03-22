import { Skeleton } from '@/components/ui/skeleton';

export default function OrderLoading() {
  return (
    <div className="min-h-screen bg-warm-white">
      <div className="bg-pizza-dark px-4 py-3">
        <Skeleton className="h-6 w-32 bg-gray-700 mx-auto" />
      </div>
      <div className="max-w-[430px] mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-36 mx-auto" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}
