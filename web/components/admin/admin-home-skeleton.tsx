import { Skeleton } from '@/components/ui/skeleton'

export function AdminHomeSkeleton() {
  return (
    <div
      className="flex min-w-0 flex-col gap-5 sm:gap-7"
      aria-busy="true"
      aria-live="polite"
    >
      <Skeleton className="h-36 w-full rounded-xl sm:h-40" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
