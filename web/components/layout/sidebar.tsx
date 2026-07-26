'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookOpenIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  WalletIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { clearSession, getRefreshToken } from '@/lib/session'

export interface NavItem {
  href: string
  label: string
}

const DEFAULT_TITLE = 'An Nahda'
const DEFAULT_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/courses', label: 'Courses' },
  { href: '/admin/batches', label: 'Batches' },
  { href: '/admin/payments', label: 'Payments' },
]

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboardIcon,
  '/dashboard/dues': WalletIcon,
  '/dashboard/payments': CreditCardIcon,
  '/dashboard/batches': BookOpenIcon,
  '/admin': LayoutDashboardIcon,
  '/admin/courses': BookOpenIcon,
  '/admin/batches': BookOpenIcon,
  '/admin/payments': CreditCardIcon,
  '/manager': LayoutDashboardIcon,
  '/manager/batches': BookOpenIcon,
  '/manager/payments': CreditCardIcon,
}

export interface SidebarProps {
  title?: string
  items?: NavItem[]
  className?: string
  onNavigate?: () => void
}

export function Sidebar({
  title = DEFAULT_TITLE,
  items = DEFAULT_ITEMS,
  className,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout(): Promise<void> {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        })
      } catch {
        // Local clear still happens — server revoke is best-effort.
      }
    }
    clearSession()
    router.push('/login')
  }

  return (
    <nav className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary-wash text-xs font-bold text-primary-strong">
          AN
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold tracking-tight text-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">Academy portal</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const isRoot = item.href === items[0]?.href
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
              {Icon ? <Icon className="size-4 shrink-0 opacity-80" /> : null}
              {item.label}
            </Link>
          )
        })}
      </div>

      <div className="p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2.5 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOutIcon className="size-4" />
          Log out
        </Button>
      </div>
    </nav>
  )
}
