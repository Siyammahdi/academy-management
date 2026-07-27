'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { apiErrorMessage } from '@/lib/error-message'
import {
  triggerBillingGeneration,
  triggerGatewayExpiry,
  triggerPenaltySweep,
} from '@/lib/api-client'

type JobKey = 'penalty' | 'billing' | 'expiry'

const JOBS: Array<{
  key: JobKey
  title: string
  description: string
  confirm: string
  run: () => Promise<{ jobId: string }>
}> = [
  {
    key: 'penalty',
    title: 'Penalty sweep',
    description:
      'Marks overdue unpaid periods into penalty on the same path the nightly job uses.',
    confirm: 'Enqueue a penalty sweep job now?',
    run: triggerPenaltySweep,
  },
  {
    key: 'billing',
    title: 'Billing generation',
    description:
      'Creates the next billing periods for running enrollments — same queue as the scheduled generator.',
    confirm: 'Enqueue billing generation now?',
    run: triggerBillingGeneration,
  },
  {
    key: 'expiry',
    title: 'Gateway expiry',
    description:
      'Expires stale gateway payment sessions that never completed checkout.',
    confirm: 'Enqueue gateway expiry now?',
    run: triggerGatewayExpiry,
  },
]

export default function AdminSettingsPage() {
  const [busy, setBusy] = useState<JobKey | null>(null)

  async function onTrigger(job: (typeof JOBS)[number]): Promise<void> {
    if (!window.confirm(job.confirm)) return
    setBusy(job.key)
    try {
      const result = await job.run()
      toast.success(`${job.title} queued`, {
        description: result.jobId
          ? `Job id ${result.jobId}`
          : 'Worker will pick it up shortly.',
      })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'Job could not be queued.')
          : 'Job could not be queued.'
      toast.error(message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="Operations"
        title="Settings"
        description="Exceptional owner tools that exist today. Academy-wide config (branding, due-day defaults, notification rules) is not modeled in the API yet."
      />

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Scheduled jobs
          </h2>
          <p className="text-sm text-muted-foreground">
            Manual triggers for the same BullMQ jobs the cron would run. Use when
            you need to demonstrate or recover — not for daily teaching.
          </p>
        </div>

        <ul className="grid min-w-0 gap-3 lg:grid-cols-3">
          {JOBS.map((job) => (
            <li
              key={job.key}
              className="flex flex-col rounded-xl bg-muted/50 p-4 sm:p-5"
            >
              <h3 className="font-heading text-base font-semibold text-foreground">
                {job.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {job.description}
              </p>
              <Button
                className="mt-4 min-h-11 w-full"
                variant="secondary"
                disabled={busy === job.key}
                onClick={() => {
                  void onTrigger(job)
                }}
              >
                {busy === job.key ? 'Queuing…' : 'Run now'}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <aside className="space-y-3 rounded-xl bg-muted/50 p-5 text-sm text-muted-foreground">
        <p className="font-heading text-base font-semibold text-foreground">
          Not available yet
        </p>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            Academy branding / locale settings
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            Role assignment UI (roles still via ops / Prisma Studio)
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            Notification rules and payment reminders
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            Reports, billing ledger, financial history
          </li>
        </ul>
      </aside>
    </div>
  )
}
