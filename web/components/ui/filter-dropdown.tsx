'use client'

import { ChevronDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
  description?: string
}

interface FilterDropdownProps {
  label?: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** Wider panel for long batch names. */
  contentClassName?: string
  disabled?: boolean
  error?: string
}

/** Replaces native `<select>` with a shadcn DropdownMenu radio list. */
export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  className,
  contentClassName,
  disabled,
  error,
}: FilterDropdownProps) {
  const selected = options.find((o) => o.value === value)
  const triggerLabel = selected?.label ?? placeholder

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label ? (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          render={
            <Button
              variant="outline"
              className={cn(
                'min-h-11 w-full justify-between gap-2 font-normal',
                error && 'border-status-overdue',
              )}
            />
          }
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={cn(
            'max-h-72 w-(--anchor-width) min-w-56 rounded-xl p-1',
            contentClassName,
          )}
        >
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value || '__empty'}
                value={option.value}
                className="rounded-lg py-2.5"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate">{option.label}</span>
                  {option.description ? (
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p className="text-sm text-status-overdue" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
