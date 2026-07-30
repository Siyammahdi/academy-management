'use client'

import { useEffect, useState } from 'react'
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  formatCountdown,
  getClassJoinState,
  type ClassSessionFields,
} from '@/lib/class-session'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ClassJoinControlsProps {
  batch: ClassSessionFields
  /** Dark surface (spotlight) vs default muted card. */
  tone?: 'default' | 'on-dark'
  className?: string
}

export function ClassJoinControls({
  batch,
  tone = 'default',
  className,
}: ClassJoinControlsProps) {
  const [now, setNow] = useState(() => new Date())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const state = getClassJoinState(batch, now)
  const onDark = tone === 'on-dark'
  const muted = onDark
    ? 'text-primary-foreground/75'
    : 'text-muted-foreground'

  async function copyLink(): Promise<void> {
    if (!batch.classLink) return
    try {
      await navigator.clipboard.writeText(batch.classLink)
      toast.success('Class link copied')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy the link.')
    }
  }

  if (state.kind === 'no_link') {
    return (
      <p className={cn('text-sm', muted, className)}>
        No class link yet. Your manager will post it when class is ready.
      </p>
    )
  }

  if (state.kind === 'no_schedule') {
    return (
      <div className={cn('space-y-3', className)}>
        <p className={cn('text-sm', muted)}>
          Class schedule is not set yet. Join will unlock once your manager
          sets the session time.
        </p>
        <Button
          size="lg"
          className="min-h-11 w-full sm:w-auto"
          disabled
        >
          Join class
          <ExternalLinkIcon />
        </Button>
      </div>
    )
  }

  if (state.kind === 'before') {
    return (
      <div className={cn('space-y-3', className)}>
        <p className={cn('text-sm', muted)}>
          Class starts {formatDate(state.startsAt.toISOString())}. Join opens
          5 minutes before.
        </p>
        <p
          className={cn(
            'font-heading text-2xl font-semibold tabular-nums tracking-tight',
            onDark ? 'text-primary-foreground' : 'text-foreground',
          )}
          aria-live="polite"
        >
          Opens in {formatCountdown(state.msRemaining)}
        </p>
        <Button size="lg" className="min-h-11 w-full sm:w-auto" disabled>
          Join class
          <ExternalLinkIcon />
        </Button>
      </div>
    )
  }

  if (state.kind === 'ended') {
    return (
      <div className={cn('space-y-3', className)}>
        <p className={cn('text-sm', muted)}>
          This session ended {formatDate(state.endsAt.toISOString())}. Waiting
          for the next schedule.
        </p>
        <Button size="lg" className="min-h-11 w-full sm:w-auto" disabled>
          Join class
          <ExternalLinkIcon />
        </Button>
      </div>
    )
  }

  // open
  return (
    <div className={cn('space-y-3', className)}>
      <p
        className={cn(
          'font-heading text-lg font-semibold tabular-nums',
          onDark ? 'text-primary-foreground' : 'text-foreground',
        )}
        aria-live="polite"
      >
        Ends in {formatCountdown(state.msRemaining)}
      </p>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button
          size="lg"
          className={cn(
            'min-h-11 w-full flex-1 sm:w-auto',
            onDark &&
              'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
          render={
            <a
              href={batch.classLink!}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          Join class
          <ExternalLinkIcon />
        </Button>
        <Button
          size="lg"
          variant={onDark ? 'secondary' : 'outline'}
          className={cn(
            'min-h-11 w-full flex-1 sm:w-auto',
            onDark &&
              'bg-white/15 text-primary-foreground hover:bg-white/25',
          )}
          onClick={() => {
            void copyLink()
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </div>
  )
}
