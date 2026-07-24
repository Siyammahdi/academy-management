'use client';

import { forwardRef, useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

// Same visual language as Input (doc 09 §5) — border/radius/focus ring
// tokens, just multi-line.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;

    return (
      <div className="flex flex-col gap-1">
        {label ? (
          <label
            htmlFor={textareaId}
            className="font-body text-sm font-medium text-ink-muted"
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cx(
            'w-full rounded-sm border border-rule bg-paper-sunken px-3 py-2 font-body text-body text-ink placeholder:text-ink-faint',
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
Textarea.displayName = 'Textarea';
