'use client'

import Link from 'next/link'
import { ClipboardListIcon } from 'lucide-react'

import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { isDueToday, isPastDue } from '@/lib/homework-status'
import type { HomeworkWithContext } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface HomeworkBoardProps {
  items: HomeworkWithContext[]
  /** Cap list length on the home dashboard. */
  limit?: number
  viewAllHref?: string
}

export function HomeworkBoard({
  items,
  limit,
  viewAllHref,
}: HomeworkBoardProps) {
  const sorted = [...items].sort((a, b) => {
    const aPast = isPastDue(a.dueDate)
    const bPast = isPastDue(b.dueDate)
    if (aPast !== bPast) return aPast ? -1 : 1
    return a.dueDate.localeCompare(b.dueDate)
  })
  const visible = limit != null ? sorted.slice(0, limit) : sorted
  const pastDueCount = sorted.filter((h) => isPastDue(h.dueDate)).length
  const dueTodayCount = sorted.filter((h) => isDueToday(h.dueDate)).length

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl bg-muted/40">
      <div className="bg-status-pending-bg px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-10 items-center justify-center rounded-lg bg-status-pending/15 text-status-pending">
              <ClipboardListIcon className="size-5" />
            </span>
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                Homework
              </h2>
              <p className="text-xs text-muted-foreground">
                {items.length === 0
                  ? 'Nothing assigned yet'
                  : pastDueCount > 0
                    ? `${pastDueCount} past due · finish offline`
                    : dueTodayCount > 0
                      ? `${dueTodayCount} due today`
                      : `${items.length} open · finish offline`}
              </p>
            </div>
          </div>
          {viewAllHref && items.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 shrink-0"
              render={<Link href={viewAllHref} />}
            >
              View all
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {visible.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Assignments for your batches show up here.
            </p>
            <Button
              variant="link"
              size="sm"
              className="h-auto text-primary-strong"
              render={<Link href="/dashboard/enroll" />}
            >
              Browse batches
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {visible.map((hw) => {
              const pastDue = isPastDue(hw.dueDate)
              const today = isDueToday(hw.dueDate)
              return (
                <li
                  key={hw.id}
                  className={cn(
                    'rounded-lg px-3 py-3.5 transition-colors',
                    pastDue ? 'bg-status-overdue-bg/70' : 'active:bg-muted/80',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-1 size-4 shrink-0 rounded-full border-2',
                        pastDue
                          ? 'border-status-overdue bg-status-overdue/20'
                          : today
                            ? 'border-status-pending bg-status-pending/20'
                            : 'border-primary/40',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{hw.title}</p>
                        <StatusBadge
                          tone={
                            pastDue ? 'overdue' : today ? 'pending' : 'neutral'
                          }
                          label={
                            pastDue
                              ? 'Past due'
                              : today
                                ? 'Due today'
                                : 'To do'
                          }
                        />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {hw.batch.course.title} · {hw.batch.name}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        Due {formatDate(hw.dueDate)}
                      </p>
                      {hw.description ? (
                        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {hw.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
