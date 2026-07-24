import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

// doc 09 §3 — page titles use the display face, sparingly; headings are
// weight 600, never 700+.
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cx('flex flex-col gap-3 border-b border-rule pb-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          {eyebrow ? (
            <span className="font-body text-xs font-medium uppercase tracking-eyebrow text-ink-faint">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="font-display text-h1 font-semibold text-ink">
            {title}
          </h1>
        </div>
        {actions ? (
          <div className="flex items-center gap-3">{actions}</div>
        ) : null}
      </div>
      {description ? (
        <p className="max-w-reading font-body text-body text-ink-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
}
