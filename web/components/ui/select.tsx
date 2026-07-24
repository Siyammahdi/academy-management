'use client';

import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

// Same surface treatment as Input (doc 09 §5) — sunken fill, hairline
// border, purple focus ring.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;

    return (
      <div className="flex flex-col gap-1">
        {label ? (
          <label
            htmlFor={selectId}
            className="font-body text-sm font-medium text-ink-muted"
          >
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={cx(
            'h-control w-full rounded-sm border border-rule bg-paper-sunken px-3 font-body text-body text-ink',
            'focus-visible:border-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-wash',
            error && 'border-overdue',
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p id={errorId} className="font-body text-sm text-overdue">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Select.displayName = 'Select';
