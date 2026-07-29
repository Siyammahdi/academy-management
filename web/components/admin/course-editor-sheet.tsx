'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import {
  ImagePlusIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'

import { CourseCover } from '@/components/student/course-cover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ApiError } from '@/lib/api'
import {
  createCourse,
  updateCourse,
  type BillingType,
  type Course,
  type CoursePart,
  type CreateCourseInput,
  type CourseThumbnailInput,
} from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/error-message'
import { cn } from '@/lib/utils'

const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/
const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const MAX_BYTES = 2 * 1024 * 1024

interface CourseFormState {
  title: string
  description: string
  billingType: BillingType
  enrollmentFee: string
  monthlyFee: string
  parts: CoursePart[]
}

function emptyForm(): CourseFormState {
  return {
    title: '',
    description: '',
    billingType: 'monthly',
    enrollmentFee: '',
    monthlyFee: '',
    parts: [],
  }
}

function courseToForm(course: Course): CourseFormState {
  return {
    title: course.title,
    description: course.description ?? '',
    billingType: course.billingType,
    enrollmentFee: course.enrollmentFee,
    monthlyFee: course.monthlyFee,
    parts: course.parts ?? [],
  }
}

async function fileToThumbnail(
  file: File,
): Promise<CourseThumbnailInput> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error('Use a JPEG, PNG, WebP, or GIF image.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Course cover must be 2 MB or smaller.')
  }
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return {
    mimeType: file.type,
    data: btoa(binary),
  }
}

interface CourseEditorSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  course?: Course | null
  onOpenChange: (open: boolean) => void
  onSaved: (course: Course, mode: 'create' | 'edit') => void
}

export function CourseEditorSheet({
  open,
  mode,
  course,
  onOpenChange,
  onSaved,
}: CourseEditorSheetProps) {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<CourseFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [thumbnail, setThumbnail] = useState<CourseThumbnailInput | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [clearThumbnail, setClearThumbnail] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(course && mode === 'edit' ? courseToForm(course) : emptyForm())
    setError(null)
    setThumbnail(null)
    setClearThumbnail(false)
    setIsDragging(false)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [open, mode, course])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function updatePart(index: number, patch: Partial<CoursePart>): void {
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.map((part, i) =>
        i === index ? { ...part, ...patch } : part,
      ),
    }))
  }

  function removePart(index: number): void {
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.filter((_, i) => i !== index),
    }))
  }

  function addPart(): void {
    setForm((prev) => ({
      ...prev,
      parts: [...prev.parts, { name: '', durationMonths: 1 }],
    }))
  }

  async function applyFile(file: File): Promise<void> {
    setError(null)
    try {
      const next = await fileToThumbnail(file)
      setThumbnail(next)
      setClearThumbnail(false)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image.')
    }
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) await applyFile(file)
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>): Promise<void> {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) await applyFile(file)
  }

  function removeCover(): void {
    setThumbnail(null)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (mode === 'edit' && course?.hasThumbnail) {
      setClearThumbnail(true)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    if (!form.title.trim()) {
      setError('Enter a course title.')
      return
    }
    if (!DECIMAL_PATTERN.test(form.enrollmentFee)) {
      setError('Enter the enrollment fee as an amount like 1000.00.')
      return
    }
    if (!DECIMAL_PATTERN.test(form.monthlyFee)) {
      setError('Enter the monthly fee as an amount like 500.00.')
      return
    }

    const input: CreateCourseInput = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      billingType: form.billingType,
      enrollmentFee: form.enrollmentFee,
      monthlyFee: form.monthlyFee,
      parts: form.parts.length > 0 ? form.parts : undefined,
      ...(thumbnail ? { thumbnail } : {}),
    }

    setIsSubmitting(true)
    try {
      const saved =
        mode === 'create'
          ? await createCourse(input)
          : await updateCourse(course?.id ?? '', {
              ...input,
              ...(clearThumbnail && !thumbnail ? { clearThumbnail: true } : {}),
            })
      onSaved(saved, mode)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(
              err.body,
              'This course could not be saved. Try again.',
            )
          : 'This course could not be saved. Try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const showingExisting =
    !previewUrl &&
    !clearThumbnail &&
    mode === 'edit' &&
    Boolean(course?.hasThumbnail)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0">
        <SheetHeader>
          <SheetTitle>
            {mode === 'create' ? 'New course' : 'Edit course'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? 'Add a cover, pricing, and optional curriculum parts. Fees here are the current price list — batches snapshot them when opened.'
              : 'Updating fees does not rewrite existing batches — they keep the snapshot from when they were opened.'}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <form
            id="course-editor-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-8"
            noValidate
          >
            <section className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">
                  Cover image
                </h3>
                <p className="text-sm text-muted-foreground">
                  Shown on every dashboard where this course appears. JPEG, PNG,
                  WebP, or GIF · max 2 MB.
                </p>
              </div>

              <div
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  void handleDrop(event)
                }}
                className={cn(
                  'relative overflow-hidden rounded-xl bg-muted/60 transition-colors',
                  isDragging && 'bg-primary-wash ring-2 ring-primary/40',
                )}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                ) : showingExisting && course ? (
                  <CourseCover
                    courseId={course.id}
                    title={course.title}
                    hasThumbnail
                    updatedAt={course.updatedAt}
                    className="aspect-video w-full"
                  />
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center gap-3 px-6 text-center">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-primary-wash text-primary-strong">
                      <ImagePlusIcon className="size-5" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Drop a cover image here
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Or choose a file from your device
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  void handleFileChange(event)
                }}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon />
                  {previewUrl || showingExisting ? 'Replace image' : 'Upload image'}
                </Button>
                {previewUrl || showingExisting ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 text-muted-foreground"
                    onClick={removeCover}
                  >
                    <Trash2Icon />
                    Remove
                  </Button>
                ) : null}
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">Basics</h3>
                <p className="text-sm text-muted-foreground">
                  What students see when browsing and enrolling.
                </p>
              </div>
              <Input
                label="Title"
                required
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Learning Arabic Language"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="A short overview of the program…"
                  className="w-full rounded-lg border border-transparent bg-input/50 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                />
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Billing type
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        value: 'monthly' as const,
                        label: 'Monthly',
                        hint: 'Recurring dues',
                      },
                      {
                        value: 'one_time' as const,
                        label: 'One-time',
                        hint: 'Single payment',
                      },
                    ] as const
                  ).map((option) => {
                    const selected = form.billingType === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            billingType: option.value,
                          }))
                        }
                        className={cn(
                          'rounded-xl px-4 py-3 text-left transition-colors',
                          selected
                            ? 'bg-primary-wash text-primary-strong'
                            : 'bg-muted/60 text-foreground hover:bg-muted',
                        )}
                      >
                        <span className="block text-sm font-medium">
                          {option.label}
                        </span>
                        <span
                          className={cn(
                            'mt-0.5 block text-xs',
                            selected
                              ? 'text-primary-strong/80'
                              : 'text-muted-foreground',
                          )}
                        >
                          {option.hint}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">Fees</h3>
                <p className="text-sm text-muted-foreground">
                  Current price list in BDT. Amounts use two decimal places.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Enrollment fee (৳)"
                  required
                  inputMode="decimal"
                  placeholder="1000.00"
                  value={form.enrollmentFee}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, enrollmentFee: e.target.value }))
                  }
                />
                <Input
                  label="Monthly fee (৳)"
                  required
                  inputMode="decimal"
                  placeholder="500.00"
                  value={form.monthlyFee}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, monthlyFee: e.target.value }))
                  }
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground">
                    Curriculum parts
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Optional. Descriptive only — they do not drive billing.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 shrink-0"
                  onClick={addPart}
                >
                  <PlusIcon />
                  Add part
                </Button>
              </div>

              {form.parts.length === 0 ? (
                <p className="rounded-xl bg-muted/50 px-4 py-5 text-sm text-muted-foreground">
                  No parts yet. Add stages like Basic · Intermediate · Advanced
                  if you want them shown on the course.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {form.parts.map((part, index) => (
                    <li
                      key={index}
                      className="flex flex-col gap-3 rounded-xl bg-muted/50 p-3 sm:flex-row sm:items-end"
                    >
                      <Input
                        label="Name"
                        value={part.name}
                        onChange={(e) =>
                          updatePart(index, { name: e.target.value })
                        }
                        placeholder="Basic"
                        className="flex-1"
                      />
                      <Input
                        label="Months"
                        type="number"
                        min={1}
                        value={part.durationMonths}
                        onChange={(e) =>
                          updatePart(index, {
                            durationMonths:
                              Number.parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="sm:w-28"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11"
                        onClick={() => removePart(index)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {error ? (
              <p className="text-sm text-status-overdue" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </SheetBody>

        <SheetFooter>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="course-editor-form"
            className="min-h-11"
            loading={isSubmitting}
          >
            {isSubmitting
              ? 'Saving…'
              : mode === 'create'
                ? 'Create course'
                : 'Save changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
