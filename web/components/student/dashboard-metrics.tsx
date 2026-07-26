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
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {metrics.map((metric) => {
        const tone = TONE[metric.tone]
        const Icon =
          ICONS[metric.key as keyof typeof ICONS] ?? GraduationCapIcon
        const inner = (
          <>
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg',
                  tone.icon,
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className={cn('text-xs font-medium', tone.muted)}>
                {metric.label}
              </span>
            </div>
            <p
              className={cn(
                'mt-4 font-heading text-3xl font-semibold tabular-nums tracking-tight',
                tone.value,
              )}
            >
              {metric.value}
            </p>
            <p className={cn('mt-1 text-xs', tone.muted)}>{metric.hint}</p>
          </>
        )

        const className = cn(
          'min-w-40 shrink-0 snap-start rounded-xl p-4 sm:min-w-0',
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
