import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export type ContainerWidth = 'marketing' | 'app' | 'reading';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  width?: ContainerWidth;
}

// doc 09 §4 — three container widths: marketing/public 1120px, application
// screens 1280px, reading content (about, policies) 68ch.
const WIDTH_CLASSES: Record<ContainerWidth, string> = {
  marketing: 'max-w-marketing',
  app: 'max-w-app',
  reading: 'max-w-reading',
};

export function Container({
  width = 'marketing',
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cx(
        'mx-auto w-full px-4 sm:px-6',
        WIDTH_CLASSES[width],
        className,
      )}
      {...props}
    />
  );
}
