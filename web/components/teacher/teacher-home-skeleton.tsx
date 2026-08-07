import { Skeleton } from '@/components/ui/skeleton'

export function TeacherHomeSkeleton() {
  return (
    <div
      className="flex min-w-0 flex-col gap-5 sm:gap-7"
      aria-busy="true"
      aria-live="polite"
    >
      <Skeleton className="h-32 w-full rounded-xl sm:h-40" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl sm:h-24" />
        ))}
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="-mx-3 flex gap-3 overflow-hidden px-3 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-3">
          <Skeleton className="h-64 w-72 shrink-0 rounded-xl md:w-auto" />
          <Skeleton className="hidden h-64 w-72 shrink-0 rounded-xl sm:block md:w-auto" />
          <Skeleton className="hidden h-64 rounded-xl xl:block" />
        </div>
      </div>
    </div>
  )
}
