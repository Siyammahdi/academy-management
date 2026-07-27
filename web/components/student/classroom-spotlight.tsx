'use client'

import { useState } from 'react'
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  RadioIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { CourseCover } from '@/components/student/course-cover'
import { Button } from '@/components/ui/button'
import type { EnrollmentWithBatch } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface ClassroomSpotlightProps {
  classrooms: EnrollmentWithBatch[]
}

async function copyLink(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Class link copied')
  } catch {
    toast.error('Could not copy the link. Copy it from the browser bar after joining.')
  }
}

export function ClassroomSpotlight({ classrooms }: ClassroomSpotlightProps) {
  const [index, setIndex] = useState(0)
  const current = classrooms[index]
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (classrooms.length === 0) {
    return (
      <section className="overflow-hidden rounded-xl bg-primary-wash">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <RadioIcon className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold text-primary-strong">
              Classroom
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              When a manager posts a class link for an active enrollment, Join
              and Copy appear here — ready for live sessions.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const link = current!.batch.classLink!

  return (
    <section className="overflow-hidden rounded-xl bg-primary-strong text-primary-foreground">
      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative min-h-48 sm:min-h-56">
          <CourseCover
            courseId={current!.batch.course.id}
            title={current!.batch.course.title}
            className="absolute inset-0 h-full w-full rounded-none opacity-95 [&_span]:text-primary-foreground"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-strong via-primary-strong/40 to-transparent lg:bg-gradient-to-r" />
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5">
            <p className="text-xs font-medium tracking-wide text-primary-foreground/70 uppercase">
              Live classroom
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              {current!.batch.course.title}
            </h2>
            <p className="mt-0.5 text-sm text-primary-foreground/75">
              {current!.batch.name}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 p-4 sm:gap-5 sm:p-6">
          <p className="hidden text-sm leading-relaxed text-primary-foreground/80 sm:block">
            Jump into class when it is live, or copy the link to share with a
            parent / open in another app.
          </p>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button
              size="lg"
              className="h-12 w-full flex-1 bg-primary text-primary-foreground hover:bg-primary/90 sm:h-11 py-3"
              render={
                <a href={link} target="_blank" rel="noopener noreferrer" />
              }
            >
              Join class
              <ExternalLinkIcon />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-12 w-full flex-1 bg-white/15 text-primary-foreground hover:bg-white/25 sm:h-11 py-3"
              onClick={() => {
                void copyLink(link).then(() => {
                  setCopiedId(current!.id)
                  window.setTimeout(() => setCopiedId(null), 2000)
                })
              }}
            >
              {copiedId === current!.id ? <CheckIcon /> : <CopyIcon />}
              {copiedId === current!.id ? 'Copied' : 'Copy link'}
            </Button>
          </div>

          {classrooms.length > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1.5">
                {classrooms.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={`Show ${c.batch.course.title}`}
                    aria-current={i === index}
                    onClick={() => setIndex(i)}
                    className={cn(
                      'size-2 rounded-full transition-colors',
                      i === index
                        ? 'bg-primary-foreground'
                        : 'bg-primary-foreground/35',
                    )}
                  />
                ))}
              </div>
              <p className="text-xs tabular-nums text-primary-foreground/65">
                {index + 1}/{classrooms.length}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
