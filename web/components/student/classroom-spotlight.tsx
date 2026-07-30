'use client'

import { useState } from 'react'
import { RadioIcon } from 'lucide-react'

import { CourseCover } from '@/components/student/course-cover'
import { ClassJoinControls } from '@/components/student/class-join-controls'
import type { EnrollmentWithBatch } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface ClassroomSpotlightProps {
  classrooms: EnrollmentWithBatch[]
}

export function ClassroomSpotlight({ classrooms }: ClassroomSpotlightProps) {
  const [index, setIndex] = useState(0)
  const current = classrooms[index]

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
              When a manager posts a class link and schedule for an active
              enrollment, Join unlocks here five minutes before class.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl bg-primary-strong text-primary-foreground">
      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative min-h-48 sm:min-h-56">
          <CourseCover
            courseId={current!.batch.course.id}
            title={current!.batch.course.title}
            hasThumbnail={current!.batch.course.hasThumbnail}
            updatedAt={current!.batch.course.updatedAt}
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
          <ClassJoinControls batch={current!.batch} tone="on-dark" />

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
