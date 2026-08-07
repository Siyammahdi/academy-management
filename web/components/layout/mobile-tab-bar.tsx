'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpenIcon,
  ClipboardCheckIcon,
  CompassIcon,
  CreditCardIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LayersIcon,
  RadioIcon,
  UserIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'

import type { NavItem } from '@/components/layout/sidebar'
import { cn } from '@/lib/utils'

const TAB_ICONS: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboardIcon,
  '/dashboard/dues': WalletIcon,
  '/dashboard/payments': CreditCardIcon,
  '/dashboard/batches': BookOpenIcon,
  '/dashboard/classroom': RadioIcon,
  '/dashboard/courses': BookOpenIcon,
  '/dashboard/enroll': CompassIcon,
  '/dashboard/applications': ClipboardCheckIcon,
  '/dashboard/profile': UserIcon,
  '/teacher': LayoutDashboardIcon,
  '/teacher/batches': LayersIcon,
  '/teacher/payments': ClipboardCheckIcon,
  '/teacher/students': GraduationCapIcon,
  '/admin': LayoutDashboardIcon,
  '/admin/courses': BookOpenIcon,
  '/admin/batches': LayersIcon,
  '/admin/payments': ClipboardCheckIcon,
}

interface MobileTabBarProps {
  items: NavItem[]
}

export function MobileTabBar({ items }: MobileTabBarProps) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1">
        {items.map((item) => {
          const isRoot = item.href === items[0]?.href
          const isActive = isRoot
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const Icon = TAB_ICONS[item.href] ?? LayoutDashboardIcon

          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary-strong'
                    : 'text-muted-foreground active:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-lg transition-colors',
                    isActive && 'bg-primary-wash',
                  )}
                >
                  <Icon
                    className={cn('size-5', isActive && 'text-primary-strong')}
                    strokeWidth={isActive ? 2.25 : 1.75}
                  />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
