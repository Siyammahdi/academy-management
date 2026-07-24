'use client';

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  // doc 09 §5 — state what to do, not merely what failed
  // ("Enter an amount of ৳500.00 or less" beats "Invalid amount").
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="flex flex-col gap-1">
        {label ? (
          <label
            htmlFor={inputId}
            className="font-body text-sm font-medium text-ink-muted"
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cx(
            'h-control w-full rounded-sm border border-rule bg-paper-sunken px-3 font-body text-body text-ink placeholder:text-ink-faint',
            // doc 09 §5 — focus: border --purple + 2px --purple-wash ring.
            // The default outline is replaced by this ring, not removed.
            'focus-visible:border-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-wash',
            error && 'border-overdue',
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {error ? (
          <p id={errorId} className="font-body text-sm text-overdue">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';
