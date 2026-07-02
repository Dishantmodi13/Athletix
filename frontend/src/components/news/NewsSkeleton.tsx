import { Skeleton } from "@/components/dashboard/ui/Skeleton";

export function NewsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="auth-glass-card overflow-hidden rounded-2xl">
          <Skeleton className="h-44 w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewsCarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="auth-glass-card min-w-[280px] flex-1 overflow-hidden rounded-2xl sm:min-w-[320px]">
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
