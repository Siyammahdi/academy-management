import type { ReactNode } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

interface AuthShellProps {
  children: ReactNode
  title: string
  description: string
  footer?: ReactNode
  className?: string
}

export function AuthShell({
  children,
  title,
  description,
  footer,
  className,
}: AuthShellProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary-strong text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 20% 20%, oklch(0.645 0.157 304.1 / 0.45), transparent 55%),
              radial-gradient(ellipse 70% 50% at 85% 75%, oklch(0.55 0.12 280 / 0.35), transparent 50%),
              linear-gradient(160deg, oklch(0.32 0.1 302) 0%, oklch(0.22 0.06 290) 100%)
            `,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white"
          >
            <span className="flex size-9 items-center justify-center rounded-2xl bg-white/15 text-sm font-bold backdrop-blur-sm">
              AN
            </span>
            An Nahda Academy
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <p className="text-xs font-medium tracking-[0.14em] text-white/55 uppercase">
            Enrollment &amp; billing
          </p>
          <h2 className="font-heading text-3xl leading-tight font-semibold text-balance text-white xl:text-4xl">
            Clarity on who is enrolled and who has paid.
          </h2>
          <p className="text-base leading-relaxed text-white/70">
            Teaching lives in Telegram and Zoom. This is the ledger that keeps
            the academy&apos;s enrollment and payments in order.
          </p>
        </div>

        <p className="relative z-10 text-sm text-white/45">
          © {new Date().getFullYear()} An Nahda Academy
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border/60 px-6 py-4 lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary-wash text-xs font-bold text-primary-strong">
              AN
            </span>
            An Nahda
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className={cn("w-full max-w-[400px] space-y-8", className)}>
            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
                {title}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>

            {children}

            {footer ? (
              <div className="text-center text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
