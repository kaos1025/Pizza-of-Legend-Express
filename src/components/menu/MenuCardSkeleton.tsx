import { Skeleton } from '@/components/ui/skeleton';

export const MenuCardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <Skeleton className="w-full h-44" />
    <div className="p-3 space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-5 w-1/3" />
    </div>
  </div>
);

export const MenuCardSkeletonList = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <MenuCardSkeleton key={i} />
    ))}
  </div>
);
