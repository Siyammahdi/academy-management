import { cn } from '@/lib/utils'

/** Deterministic brand covers — API has no course image field yet. */
const THEMES = [
  {
    surface: 'bg-primary',
    ink: 'text-primary-foreground',
    blob: 'bg-primary-strong/40',
    accent: 'bg-primary-wash/30',
  },
  {
    surface: 'bg-primary-strong',
    ink: 'text-primary-foreground',
    blob: 'bg-primary/50',
    accent: 'bg-white/10',
  },
  {
    surface: 'bg-primary-wash',
    ink: 'text-primary-strong',
    blob: 'bg-primary/25',
    accent: 'bg-primary/15',
  },
  {
    surface: 'bg-status-pending-bg',
    ink: 'text-status-pending',
    blob: 'bg-status-pending/20',
    accent: 'bg-primary/10',
  },
  {
    surface: 'bg-status-paid-bg',
    ink: 'text-status-paid',
    blob: 'bg-status-paid/15',
    accent: 'bg-primary/10',
  },
] as const

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function courseInitials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'AN'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

interface CourseCoverProps {
  courseId: string
  title: string
  className?: string
  compact?: boolean
}

export function CourseCover({
  courseId,
  title,
  className,
  compact = false,
}: CourseCoverProps) {
  const theme = THEMES[hashId(courseId) % THEMES.length]!
  const initials = courseInitials(title)

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        theme.surface,
        theme.ink,
        className,
      )}
      aria-hidden
    >
      <span
        className={cn(
          'absolute -right-6 -top-8 size-28 rounded-full',
          theme.blob,
        )}
      />
      <span
        className={cn(
          'absolute -bottom-10 -left-4 size-32 rounded-full',
          theme.accent,
        )}
      />
      <span
        className={cn(
          'absolute right-8 top-1/2 size-16 -translate-y-1/2 rotate-12 rounded-xl',
          theme.blob,
        )}
      />
      <div
        className={cn(
          'relative flex h-full flex-col justify-between p-4',
          compact && 'p-3',
        )}
      >
        <span
          className={cn(
            'font-heading font-bold tracking-tight opacity-90',
            compact ? 'text-lg' : 'text-2xl sm:text-3xl',
          )}
        >
          {initials}
        </span>
        {!compact ? (
          <span className="line-clamp-2 max-w-[90%] text-xs font-medium opacity-80 sm:text-sm">
            {title}
          </span>
        ) : null}
      </div>
    </div>
  )
}
