import { Skeleton } from "@/components/ui/skeleton";

/** Generic loading state for list/detail pages: header, stat cards, a table or grid. */
export function PageSkeleton({ variant = "table" }: { variant?: "table" | "grid" | "detail" }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading…">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="hidden h-9 w-36 sm:block" />
      </div>
      {variant !== "detail" && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[4.75rem] rounded-xl" />
          ))}
        </div>
      )}
      {variant === "grid" ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      ) : variant === "detail" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-border">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
