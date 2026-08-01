'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3Icon,
  BookOpenIcon,
  ClipboardCheckIcon,
  CompassIcon,
  CreditCardIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LayersIcon,
  LinkIcon,
  NotebookPenIcon,
  RadioIcon,
  SettingsIcon,
  ShieldIcon,
  UserCogIcon,
  UserIcon,
  VideoIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'

import { AcademyLogo } from '@/components/brand/academy-logo'
import { UserMenu } from '@/components/layout/user-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { AuthUser } from '@/lib/auth'
import {
  roleFromPathname,
  resolveActiveRole,
  workspaceLabel,
} from '@/lib/active-role'
import { cn } from '@/lib/utils'

export interface NavItem {
  href: string
  label: string
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

const DEFAULT_TITLE = 'An Nahda'
const DEFAULT_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/courses', label: 'Courses' },
  { href: '/admin/batches', label: 'Batches' },
  { href: '/admin/payments', label: 'Payments' },
]

const ICONS: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboardIcon,
  '/dashboard/dues': WalletIcon,
  '/dashboard/payments': CreditCardIcon,
  '/dashboard/batches': BookOpenIcon,
  '/dashboard/courses': BookOpenIcon,
  '/dashboard/classroom': RadioIcon,
  '/dashboard/homework': NotebookPenIcon,
  '/dashboard/recordings': VideoIcon,
  '/dashboard/enroll': CompassIcon,
  '/dashboard/applications': ClipboardCheckIcon,
  '/dashboard/profile': UserIcon,
  '/admin': LayoutDashboardIcon,
  '/admin/courses': BookOpenIcon,
  '/admin/batches': LayersIcon,
  '/admin/managers': UserCogIcon,
  '/admin/students': GraduationCapIcon,
  '/admin/payments': ClipboardCheckIcon,
  '/admin/reports': BarChart3Icon,
  '/admin/roles': ShieldIcon,
  '/admin/settings': SettingsIcon,
  '/admin/profile': UserIcon,
  '/manager': LayoutDashboardIcon,
  '/manager/batches': LayersIcon,
  '/manager/class-links': LinkIcon,
  '/manager/homework': NotebookPenIcon,
  '/manager/recordings': VideoIcon,
  '/manager/students': GraduationCapIcon,
  '/manager/payments': ClipboardCheckIcon,
  '/manager/profile': UserIcon,
}

function sectionsFromItems(items: NavItem[]): NavSection[] {
  return [{ items }]
}

export interface SidebarProps {
  title?: string
  items?: NavItem[]
  /** Grouped nav — preferred for admin. Wins over `items` when set. */
  sections?: NavSection[]
  className?: string
  onNavigate?: () => void
  user?: AuthUser | null
  userLoading?: boolean
}

export function Sidebar({
  title = DEFAULT_TITLE,
  items = DEFAULT_ITEMS,
  sections,
  className,
  onNavigate,
  user = null,
  userLoading = false,
}: SidebarProps) {
  const pathname = usePathname()
  const navSections = sections ?? sectionsFromItems(items)
  const rootHref = navSections[0]?.items[0]?.href
  const fromPath = roleFromPathname(pathname)
  const activeRole =
    (fromPath && user?.roles.includes(fromPath) ? fromPath : null) ??
    (user ? resolveActiveRole(user.roles) : null)

  return (
    <nav className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <AcademyLogo size={36} decorative />
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold tracking-tight text-foreground">
            {title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {workspaceLabel(activeRole)}
          </p>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3">
        <div className="flex flex-col gap-5 py-1">
          {navSections.map((section, sectionIndex) => (
            <div
              key={section.label ?? `section-${sectionIndex}`}
              className="space-y-1"
            >
              {section.label ? (
                <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {section.label}
                </p>
              ) : null}
              {section.items.map((item) => {
                const isRoot = item.href === rootHref
                const isActive = isRoot
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                const Icon = ICONS[item.href]

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-wash text-primary-strong'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {Icon ? (
                      <Icon className="size-4 shrink-0 opacity-80" />
                    ) : null}
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border/40 p-2">
        {userLoading ? (
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Skeleton className="size-8 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          </div>
        ) : user ? (
          <UserMenu user={user} align="start" />
        ) : null}
      </div>
    </nav>
  )
}
