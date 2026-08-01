import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  BookOpenIcon,
  GraduationCapIcon,
  WalletIcon,
} from 'lucide-react'

import { AcademyLogo } from '@/components/brand/academy-logo'
import { cn } from '@/lib/utils'

interface AuthShellProps {
  children: ReactNode
  title: string
  description: string
  /** Small brand line above the title — e.g. greeting. */
  eyebrow?: string
  footer?: ReactNode
  className?: string
}

const HIGHLIGHTS = [
  {
    label: 'Enroll',
    hint: 'Join a batch',
    icon: GraduationCapIcon,
    tone: 'bg-primary text-primary-foreground',
    iconTone: 'bg-primary-foreground/15',
  },
  {
    label: 'Dues',
    hint: 'Per course',
    icon: WalletIcon,
    tone: 'bg-status-pending-bg text-status-pending',
    iconTone: 'bg-status-pending/15',
  },
  {
    label: 'Class',
    hint: 'Links & HW',
    icon: BookOpenIcon,
    tone: 'bg-status-paid-bg text-status-paid',
    iconTone: 'bg-status-paid/15',
  },
] as const

export function AuthShell({
  children,
  title,
  description,
  eyebrow,
  footer,
  className,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-hidden bg-background">
      {/* Atmosphere — same language as the student dashboard */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-primary-wash/70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-primary/25 blur-2xl sm:size-96"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-32 size-64 rounded-full bg-primary-strong/15 blur-2xl sm:size-80"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 size-56 rounded-full bg-primary/10 blur-3xl"
      />

      {/* App top bar */}
      <header
        className="relative z-10 flex items-center justify-between px-4 pb-3 sm:px-6 lg:px-10"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 font-heading text-base font-semibold tracking-tight text-foreground"
        >
          <AcademyLogo size={36} decorative priority />
          <span className="hidden sm:inline">An Nahda Academy</span>
          <span className="sm:hidden">An Nahda</span>
        </Link>
        <span className="rounded-lg bg-background/70 px-2.5 py-1 text-xs font-medium text-primary-strong backdrop-blur-sm">
          Student portal
        </span>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-10 sm:px-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-10 lg:pb-16">
        {/* Brand story — visible on all breakpoints, denser on mobile */}
        <section className="space-y-5 pt-2 lg:space-y-8 lg:pt-0">
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-wide text-primary-strong uppercase sm:text-sm">
              Enrollment &amp; billing
            </p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl">
            Your Arabic learning journey starts here
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              Teaching stays on Telegram and Zoom. This portal keeps who is
              enrolled and who has paid clear — never mixed into one total.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {HIGHLIGHTS.map(({ label, hint, icon: Icon, tone, iconTone }) => (
              <div
                key={label}
                className={cn('rounded-xl p-3 sm:p-4', tone)}
              >
                <span
                  className={cn(
                    'mb-2 flex size-8 items-center justify-center rounded-lg sm:size-9',
                    iconTone,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <p className="font-heading text-sm font-semibold sm:text-base">
                  {label}
                </p>
                <p className="mt-0.5 text-xs opacity-80">{hint}</p>
              </div>
            ))}
          </div>

          <p className="hidden text-xs text-muted-foreground lg:block">
            © {new Date().getFullYear()} An Nahda Academy
          </p>
        </section>

        {/* Form card — app sheet */}
        <main
          className={cn(
            'w-full rounded-xl bg-background p-5 sm:p-7 lg:p-8',
            className,
          )}
          style={{
            paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="mb-6 space-y-2 sm:mb-8">
            {eyebrow ? (
              <p className="text-sm font-medium text-primary-strong">{eyebrow}</p>
            ) : null}
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          {children}

          {footer ? (
            <div className="mt-6 text-center text-sm text-muted-foreground sm:mt-8">
              {footer}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
