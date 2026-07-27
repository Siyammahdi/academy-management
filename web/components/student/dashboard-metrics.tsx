import Link from 'next/link'
import {
  BookOpenIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  VideoIcon,
  WalletIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

interface Metric {
  key: string
  label: string
  value: number
  hint: string
  href?: string
  tone: 'brand' | 'deep' | 'wash' | 'warm' | 'calm'
}

interface DashboardMetricsProps {
  metrics: Metric[]
}

const TONE: Record<
  Metric['tone'],
  { tile: string; icon: string; value: string; muted: string }
> = {
  brand: {
    tile: 'bg-primary text-primary-foreground',
    icon: 'bg-primary-foreground/15 text-primary-foreground',
    value: 'text-primary-foreground',
    muted: 'text-primary-foreground/75',
  },
  deep: {
    tile: 'bg-primary-strong text-primary-foreground',
    icon: 'bg-primary-foreground/15 text-primary-foreground',
    value: 'text-primary-foreground',
    muted: 'text-primary-foreground/70',
  },
  wash: {
    tile: 'bg-primary-wash text-primary-strong',
    icon: 'bg-primary/15 text-primary-strong',
    value: 'text-primary-strong',
    muted: 'text-muted-foreground',
  },
  warm: {
    tile: 'bg-status-pending-bg text-status-pending',
    icon: 'bg-status-pending/15 text-status-pending',
    value: 'text-foreground',
    muted: 'text-muted-foreground',
  },
  calm: {
    tile: 'bg-status-paid-bg text-status-paid',
    icon: 'bg-status-paid/15 text-status-paid',
    value: 'text-foreground',
    muted: 'text-muted-foreground',
  },
}

const ICONS = {
  courses: GraduationCapIcon,
  dues: WalletIcon,
  homework: ClipboardListIcon,
  recordings: VideoIcon,
  batches: BookOpenIcon,
} as const

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {metrics.map((metric) => {
        const tone = TONE[metric.tone]
        const Icon =
          ICONS[metric.key as keyof typeof ICONS] ?? GraduationCapIcon
        const inner = (
          <>
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg sm:size-9',
                  tone.icon,
                )}
              >
                <Icon className="size-4" />
              </span>
              <span
                className={cn(
                  'truncate text-xs font-medium',
                  tone.muted,
                )}
              >
                {metric.label}
              </span>
            </div>
            <p
              className={cn(
                'mt-3 font-heading text-2xl font-semibold tabular-nums tracking-tight sm:mt-4 sm:text-3xl',
                tone.value,
              )}
            >
              {metric.value}
            </p>
            <p className={cn('mt-0.5 truncate text-xs sm:mt-1', tone.muted)}>
              {metric.hint}
            </p>
          </>
        )

        const className = cn(
          'min-h-24 rounded-xl p-3.5 transition-transform active:scale-[0.98] sm:min-h-0 sm:p-4',
          tone.tile,
        )

        if (metric.href) {
          return (
            <Link key={metric.key} href={metric.href} className={className}>
              {inner}
            </Link>
          )
        }

        return (
          <div key={metric.key} className={className}>
            {inner}
          </div>
        )
      })}
    </div>
  )
}
