'use client'

import { useMemo, useState } from 'react'
import { CalendarIcon, ClockIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  formatDateOnly,
  parseDateOnly,
} from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'

/** Value format: `YYYY-MM-DDTHH:mm` (same as `<input type="datetime-local">`). */
export type DateTimeLocalValue = string

function splitDateTimeLocal(value: string): {
  date: string
  time: string
} {
  if (!value) return { date: '', time: '' }
  const [date = '', timePart = ''] = value.split('T')
  const time = timePart.slice(0, 5)
  return { date, time }
}

function joinDateTimeLocal(date: string, time: string): string {
  if (!date) return ''
  const t = time || '00:00'
  return `${date}T${t}`
}

function formatDateTimeLabel(value: string): string {
  const { date, time } = splitDateTimeLocal(value)
  const d = parseDateOnly(date)
  if (!d) return value
  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
  return time ? `${dateLabel} · ${time}` : dateLabel
}

interface DateTimePickerProps {
  label?: string
  value: DateTimeLocalValue
  onChange: (value: DateTimeLocalValue) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  allowClear?: boolean
  error?: string
}

/**
 * Date + time picker via shadcn Calendar + Popover.
 * Stores `YYYY-MM-DDTHH:mm` for drop-in replacement of datetime-local inputs.
 */
export function DateTimePicker({
  label,
  value,
  onChange,
  placeholder = 'Pick date & time',
  className,
  disabled,
  required,
  allowClear = !required,
  error,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const { date, time } = useMemo(() => splitDateTimeLocal(value), [value])
  const selected = useMemo(
    () => (date ? parseDateOnly(date) : undefined),
    [date],
  )

  function commit(nextDate: string, nextTime: string): void {
    if (!nextDate) {
      onChange('')
      return
    }
    onChange(joinDateTimeLocal(nextDate, nextTime || '00:00'))
  }

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
            {value ? formatDateTimeLabel(value) : placeholder}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-xl p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(picked) => {
              if (!picked) return
              commit(formatDateOnly(picked), time || '09:00')
            }}
            captionLayout="dropdown"
          />
          <div className="flex items-center gap-2 border-t border-border px-3 py-3">
            <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
            <Input
              type="time"
              value={time}
              onChange={(e) => commit(date || formatDateOnly(new Date()), e.target.value)}
              className="min-h-11"
              aria-label={label ? `${label} time` : 'Time'}
            />
          </div>
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
