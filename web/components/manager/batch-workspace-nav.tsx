'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboardIcon,
  LinkIcon,
  NotebookPenIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

import { batchWorkspaceTabs } from '@/lib/manager-nav'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const TAB_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboardIcon,
  roster: UsersIcon,
  classroom: NotebookPenIcon,
}

interface BatchWorkspaceNavProps {
  batchId: string
}

export function BatchWorkspaceNav({ batchId }: BatchWorkspaceNavProps) {
  const pathname = usePathname()
  const tabs = batchWorkspaceTabs(batchId)
  const base = `/manager/batches/${batchId}`

  return (
    <nav
      aria-label="Batch sections"
      className="rounded-xl bg-muted/50 p-1"
    >
      <ScrollArea className="w-full">
        <ul className="flex w-max min-w-full gap-1">
          {tabs.map((tab) => {
            const isExact = tab.href === base
            const isActive = isExact
              ? pathname === tab.href
              : pathname.startsWith(tab.href)
            const key = isExact
              ? 'overview'
              : tab.href.endsWith('/roster')
                ? 'roster'
                : 'classroom'
            const Icon = TAB_ICONS[key] ?? LinkIcon

            return (
              <li key={tab.href} className="min-w-0 flex-1">
                <Link
                  href={tab.href}
                  className={cn(
                    'flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-background text-primary-strong'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-80" />
                  <span className="truncate">{tab.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </ScrollArea>
    </nav>
  )
}
