import { Skeleton } from "@/components/ui/skeleton";

export function MediaGridSkeletonNoSearchBar({
  count = 12,
}: {
  count?: number;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-full md:w-70 rounded-md" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-2/3 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChannelListSkeleton({ count = 20 }: { count?: number }) {
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-full md:w-70 rounded-md" />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-border/50 p-4"
            >
              <Skeleton className="size-12 rounded-lg shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export function ChannelListSkeletonNoSearchBar({
  count = 20,
}: {
  count?: number;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-border/50 p-4"
          >
            <Skeleton className="size-12 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryGridSkeleton({ count = 35 }: { count?: number }) {
  return (
    <div className="h-full flex flex-col gap-4 no-scrollbar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-8 w-full md:w-70 rounded-md" />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card p-5"
            >
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MediaDetailSkeleton() {
  return (
    <div className="min-h-full overflow-y-scroll no-scrollbar">
      <div className="relative">
        <div className="relative">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="shrink-0">
              <Skeleton className="w-48 md:w-56 aspect-2/3 rounded-xl shadow-2xl shadow-black/30 border border-border/30" />
            </div>
            <div className="flex-1 space-y-5">
              <div>
                <Skeleton className="h-9 w-3/4 max-w-md mb-2" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-7 w-14 rounded-md" />
                <Skeleton className="h-7 w-24 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-2xl" />
                <Skeleton className="h-4 w-full max-w-xl" />
                <Skeleton className="h-4 w-full max-w-lg" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-80" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Skeleton className="h-9 w-10 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-10 rounded-md" />
                <Skeleton className="h-9 w-10 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="  pb-8 mt-8">
        <Skeleton className="h-7 w-24 mb-4" />
        <Skeleton className="w-full max-w-3xl aspect-video rounded-xl shadow-xl border border-border/50" />
      </div>
    </div>
  );
}

export function ChannelDetailSkeleton() {
  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center gap-6 p-6 bg-muted/20">
          <Skeleton className="size-24 rounded-xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 p-6 border-t border-border/30">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ShowDetailSkeleton() {
  return (
    <div className="min-h-full overflow-y-scroll">
      <div className="relative">
        <div className="relative">
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            <div className="shrink-0">
              <Skeleton className="w-48 md:w-56 aspect-2/3 rounded-xl shadow-2xl shadow-black/30 border border-border/30" />
            </div>
            <div className="flex-1 space-y-5">
              <Skeleton className="h-9 w-3/4 max-w-md" />
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-7 w-16 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-24 rounded-md" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-2xl" />
                <Skeleton className="h-4 w-full max-w-xl" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-80" />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Skeleton className="h-9 w-32 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 pb-6">
        <Skeleton className="h-7 w-24 mb-4" />
        <Skeleton className="w-full max-w-3xl aspect-video rounded-xl shadow-xl border border-border/50" />
      </div>

      <div className="px-6 md:px-8 pb-8 space-y-8">
        <Skeleton className="h-7 w-32" />
        {Array.from({ length: 2 }).map((_, i) => (
          <section
            key={i}
            className="rounded-xl border border-border/50 bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/30">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="divide-y divide-border/30">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-start gap-4 px-5 py-4">
                  <Skeleton className="size-8 rounded-lg shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full max-w-2xl" />
                    <Skeleton className="h-3 w-full max-w-xl" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function SavedItemsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-border/50 bg-card px-5 py-4"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Skeleton className="size-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 max-w-xs" />
                <Skeleton className="h-3 w-1/2 max-w-[200px]" />
              </div>
            </div>
            <Skeleton className="size-8 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
