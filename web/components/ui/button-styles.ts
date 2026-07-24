import { cx } from '../../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'default' | 'compact';

// doc 09 §5 — Buttons. Sentence case is a content rule (not enforced by
// CSS): never pass an UPPERCASE label.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-purple text-paper-raised hover:bg-purple-deep',
  secondary:
    'bg-transparent border border-rule-strong text-ink hover:bg-paper-sunken',
  // reject, remove, refund only — doc 09 §5
  danger: 'bg-overdue text-paper-raised',
  ghost: 'bg-transparent text-purple hover:bg-purple-wash',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: 'h-control px-4',
  compact: 'h-control-compact px-4',
};

// Shared with anywhere a link needs to look like a button (nav CTAs, etc.)
// — a native <a> can't be nested inside a <button>, so those spots style a
// <Link> directly with these same classes rather than reusing <Button>.
export function buttonClassNames(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'default',
  className?: string,
): string {
  return cx(
    'inline-flex items-center justify-center rounded-sm font-body text-body font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}
