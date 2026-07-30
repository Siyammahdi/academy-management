'use client'

import { useMemo, useState } from 'react'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** Parse YYYY-MM-DD as a local calendar date (no UTC shift). */
export function parseDateOnly(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return undefined
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const d = new Date(year, month - 1, day)
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return undefined
  }
  return d
}

export function formatDateOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDateLabel(value: string): string {
  const d = parseDateOnly(value)
  if (!d) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

interface DatePickerProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  allowClear?: boolean
  error?: string
}

/** Date-only picker (YYYY-MM-DD) via shadcn Calendar + Popover. */
export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  disabled,
  required,
  allowClear = !required,
  error,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(
    () => (value ? parseDateOnly(value) : undefined),
    [value],
  )

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label ? (
        <span className="text-sm font-medium text-muted-foreground">
          {label}
          {required ? <span className="text-status-overdue"> *</span> : null}
        </span>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                'min-h-11 w-full justify-start gap-2 font-normal',
                !value && 'text-muted-foreground',
                error && 'border-status-overdue',
              )}
            />
          }
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {value ? formatDateLabel(value) : placeholder}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-xl p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (!date) return
              onChange(formatDateOnly(date))
              setOpen(false)
            }}
            captionLayout="dropdown"
          />
          {allowClear && value ? (
            <div className="border-t border-border p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 w-full"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {error ? (
        <p className="text-xs text-status-overdue" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
