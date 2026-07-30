'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArchiveIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { CourseEditorSheet } from '@/components/admin/course-editor-sheet'
import { AmountCell } from '@/components/money/amount-cell'
import { StatusBadge } from '@/components/money/status-badge'
import { CourseCover } from '@/components/student/course-cover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import { apiErrorMessage } from '@/lib/error-message'
import {
  archiveCourse,
  listCourses,
  type BillingType,
  type Course,
} from '@/lib/api-client'

const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  monthly: 'Monthly',
  one_time: 'One-time',
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [archivingCourse, setArchivingCourse] = useState<Course | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  async function reload(): Promise<void> {
    try {
      const result = await listCourses(1, 100)
      setCourses(result.data)
      setError(null)
    } catch {
      setError('Courses could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    listCourses(1, 100)
      .then((result) => {
        if (!cancelled) {
          setCourses(result.data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Courses could not be loaded. Try again.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!courses) return []
    const q = query.trim().toLowerCase()
    if (!q) return courses
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        BILLING_TYPE_LABELS[c.billingType].toLowerCase().includes(q),
    )
  }, [courses, query])

  function openCreate(): void {
    setEditorMode('create')
    setEditingCourse(null)
    setEditorOpen(true)
  }

  function openEdit(course: Course): void {
    setEditorMode('edit')
    setEditingCourse(course)
    setEditorOpen(true)
  }

  function handleSaved(course: Course, mode: 'create' | 'edit'): void {
    setCourses((prev) => {
      if (!prev) return [course]
      if (mode === 'create') return [course, ...prev]
      return prev.map((c) => (c.id === course.id ? course : c))
    })
    toast.success(mode === 'create' ? 'Course created' : 'Course saved')
  }

  async function handleConfirmArchive(): Promise<void> {
    if (!archivingCourse) return
    setArchiveError(null)
    setIsArchiving(true)
    try {
      await archiveCourse(archivingCourse.id)
      setCourses(
        (prev) => prev?.filter((c) => c.id !== archivingCourse.id) ?? null,
      )
      setArchivingCourse(null)
      toast.success('Course archived')
    } catch (err) {
      setArchiveError(
        err instanceof ApiError
          ? apiErrorMessage(
              err.body,
              'This course could not be archived. Try again.',
            )
          : 'This course could not be archived. Try again.',
      )
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="Academy"
        title="Courses"
        description="Define what you teach and what it costs. Editing fees never rewrites existing batches — they keep the fee snapshot from when they were opened."
        actions={
          <>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                void reload()
              }}
            >
              <RefreshCwIcon />
              Refresh
            </Button>
            <Button className="min-h-11" onClick={openCreate}>
              <PlusIcon />
              New course
            </Button>
          </>
        }
      />

      <div className="relative min-w-0">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or billing type"
          className="min-h-11 pl-9"
          aria-label="Search courses"
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      {!courses && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : null}

      {courses && filtered.length === 0 ? (
        <div className="rounded-xl bg-primary-wash px-5 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            {courses.length === 0 ? 'No courses yet' : 'No matches'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {courses.length === 0
              ? 'Create a course with a cover image, enrollment and monthly fees, then open batches under it.'
              : 'Try a different search.'}
          </p>
          {courses.length === 0 ? (
            <Button className="mt-4 min-h-11" onClick={openCreate}>
              <PlusIcon />
              New course
            </Button>
          ) : null}
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => (
            <article
              key={course.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-muted/60"
            >
              <CourseCover
                courseId={course.id}
                title={course.title}
                hasThumbnail={course.hasThumbnail}
                updatedAt={course.updatedAt}
                className="aspect-video w-full"
              />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-base font-semibold text-foreground">
                      {course.title}
                    </h2>
                    <StatusBadge
                      tone="paid"
                      label={BILLING_TYPE_LABELS[course.billingType]}
                    />
                    {course.featured ? (
                      <StatusBadge tone="pending" label="Featured" />
                    ) : null}
                  </div>
                  {course.tagline ? (
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {course.tagline}
                    </p>
                  ) : course.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {course.description}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1 text-sm">
                  <p className="flex items-baseline justify-between gap-2 text-muted-foreground">
                    <span>Enrollment</span>
                    <AmountCell amount={course.enrollmentFee} />
                  </p>
                  <p className="flex items-baseline justify-between gap-2 text-muted-foreground">
                    <span>Monthly</span>
                    <AmountCell amount={course.monthlyFee} />
                  </p>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    className="min-h-11"
                    onClick={() => openEdit(course)}
                  >
                    <PencilIcon />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-11"
                    render={
                      <Link href={`/admin/batches?courseId=${course.id}`} />
                    }
                  >
                    <LayersIcon />
                    Batches
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-11"
                    render={
                      <Link
                        href={`/courses/${course.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    Public page
                  </Button>
                  <Button
                    variant="destructive"
                    className="min-h-11"
                    onClick={() => setArchivingCourse(course)}
                  >
                    <ArchiveIcon />
                    Archive
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <CourseEditorSheet
        open={editorOpen}
        mode={editorMode}
        course={editingCourse}
        onOpenChange={setEditorOpen}
        onSaved={handleSaved}
      />

      <Modal
        isOpen={archivingCourse !== null}
        onClose={() => setArchivingCourse(null)}
        title="Archive this course?"
        footer={
          <>
            <Button
              variant="secondary"
              className="min-h-11"
              onClick={() => setArchivingCourse(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="min-h-11"
              onClick={() => {
                void handleConfirmArchive()
              }}
              loading={isArchiving}
            >
              {isArchiving ? 'Archiving…' : 'Archive course'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          It stops appearing here and in new batch creation. Batches that
          already exist for {archivingCourse?.title} keep running unchanged.
        </p>
        {archiveError ? (
          <p className="mt-3 text-sm text-status-overdue" role="alert">
            {archiveError}
          </p>
        ) : null}
      </Modal>
    </div>
  )
}
