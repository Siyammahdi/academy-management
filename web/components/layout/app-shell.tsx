'use client'

import { useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { MenuIcon, XIcon } from 'lucide-react'

import { ActiveWorkspaceSync } from '@/components/auth/active-workspace-sync'
import {
  CurrentUserProvider,
  useCurrentUser,
} from '@/components/auth/current-user-provider'
import { AcademyLogo } from '@/components/brand/academy-logo'
import { MobileTabBar } from './mobile-tab-bar'
import { Sidebar } from './sidebar'
import type { NavItem, NavSection } from './sidebar'
import { UserMenu } from './user-menu'
import { Container } from './container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  resolveActiveRole,
  roleFromPathname,
  workspaceLabel,
} from '@/lib/active-role'
import { cn } from '@/lib/utils'

export interface AppShellProps {
  children: ReactNode
  title?: string
  items?: NavItem[]
  /** Grouped sidebar sections. When set, overrides flat `items` in the sidebar. */
  sections?: NavSection[]
  /**
   * `tabs` — fixed bottom nav (student / manager).
   * `drawer` — hamburger + slide-over (admin owner console).
   */
  mobileNav?: 'drawer' | 'tabs'
}

function AppShellChrome({
  children,
  title,
  items = [],
  sections,
  mobileNav = 'drawer',
}: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { user, loading } = useCurrentUser()
  const pathname = usePathname()
  const useTabs = mobileNav === 'tabs' && items.length > 0
  const fromPath = roleFromPathname(pathname)
  const activeRole =
    (fromPath && user?.roles.includes(fromPath) ? fromPath : null) ??
    (user ? resolveActiveRole(user.roles) : null)

  return (
    <ActiveWorkspaceSync>
      <div className="flex min-h-svh flex-col overflow-x-clip bg-background">
        <header
          className={cn(
            'sticky top-0 z-30 flex items-center justify-between bg-background/95 px-4 backdrop-blur-md lg:hidden',
            'pt-[max(0.75rem,env(safe-area-inset-top))] pb-3',
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <AcademyLogo size={32} className="shrink-0" decorative />
            <div className="min-w-0">
              <span className="block truncate font-heading text-base font-semibold tracking-tight text-foreground">
                {title ?? 'An Nahda'}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {workspaceLabel(activeRole)}
              </span>
            </div>
          </div>

          {useTabs ? (
            loading || !user ? (
              <Skeleton className="size-11 rounded-lg" />
            ) : (
              <UserMenu user={user} compact align="end" />
            )
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-11 shrink-0"
              aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setIsDrawerOpen((open) => !open)}
            >
              {isDrawerOpen ? <XIcon /> : <MenuIcon />}
            </Button>
          )}
        </header>

        <div className="flex min-w-0 flex-1">
          <aside className="hidden w-64 shrink-0 bg-primary-wash/40 lg:block">
            <Sidebar
              className="sticky top-0 h-svh"
              title={title}
              items={items}
              sections={sections}
              user={user}
              userLoading={loading}
            />
          </aside>

          {!useTabs && isDrawerOpen ? (
            <div className="fixed inset-0 z-40 flex lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-foreground/30"
                aria-label="Close menu"
                onClick={() => setIsDrawerOpen(false)}
              />
              <div className="relative z-10 h-full w-80 max-w-[85vw] overflow-hidden bg-background">
                <Sidebar
                  title={title}
                  items={items}
                  sections={sections}
                  user={user}
                  userLoading={loading}
                  onNavigate={() => setIsDrawerOpen(false)}
                />
              </div>
            </div>
          ) : null}

          <main
            className={cn(
              'min-w-0 flex-1 overflow-x-clip pt-4 sm:pt-6 lg:pt-8',
              useTabs
                ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-10'
                : 'pb-10',
            )}
          >
            <Container
              width="app"
              className={cn(
                'flex min-w-0 flex-col gap-5 sm:gap-7 lg:gap-8',
                useTabs && 'px-3 sm:px-6',
              )}
            >
              {children}
            </Container>
          </main>
        </div>

        {useTabs ? <MobileTabBar items={items} /> : null}
      </div>
    </ActiveWorkspaceSync>
  )
}

export function AppShell(props: AppShellProps) {
  return (
    <CurrentUserProvider>
      <AppShellChrome {...props} />
    </CurrentUserProvider>
  )
}
