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

/** YYYY-MM in Asia/Dhaka (report API month params). */
export function toYearMonthDhaka(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  return `${year}-${month}`
}

export function currentYearMonthDhaka(): string {
  return toYearMonthDhaka(new Date())
}

export function addMonthsToYearMonth(ym: string, delta: number): string {
  const [yearPart, monthPart] = ym.split('-')
  const y = Number(yearPart)
  const m = Number(monthPart)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function yearMonthToDate(ym: string): Date {
  const [yearPart, monthPart] = ym.split('-')
  const y = Number(yearPart)
  const m = Number(monthPart)
  return new Date(Date.UTC(y, m - 1, 1))
}

export function formatYearMonthLabel(ym: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(yearMonthToDate(ym))
}

interface MonthPickerProps {
  label?: string
  value?: string
  onChange: (ym: string | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowClear?: boolean
}

/** Month selector via shadcn Calendar + Popover (stores YYYY-MM). */
export function MonthPicker({
  label,
  value,
  onChange,
  placeholder = 'Pick month',
  className,
  disabled,
  allowClear = true,
}: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(
    () => (value ? yearMonthToDate(value) : undefined),
    [value],
  )

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label ? (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              variant="outline"
              className="min-h-11 w-full justify-start gap-2 font-normal"
            />
          }
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {value ? formatYearMonthLabel(value) : placeholder}
          </span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto rounded-xl p-0"
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (!date) return
              onChange(toYearMonthDhaka(date))
              setOpen(false)
            }}
            captionLayout="dropdown"
          />
          {allowClear && value ? (
            <div className="border-t border-border p-2">
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 w-full"
                onClick={() => {
                  onChange(undefined)
                  setOpen(false)
                }}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}
