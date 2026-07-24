import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export type CardProps = HTMLAttributes<HTMLDivElement>;

// doc 09 §4 — "Cards do not float": no shadow, hairline rule border,
// --paper-raised surface, --radius-md. This is the one deliberate
// departure from the default dashboard look.
export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cx('rounded-md border border-rule bg-paper-raised p-6', className)}
      {...props}
    />
  );
}
