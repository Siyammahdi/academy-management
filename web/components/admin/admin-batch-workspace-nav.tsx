'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { adminBatchWorkspaceTabs } from '@/lib/admin-nav'
import { cn } from '@/lib/utils'

interface AdminBatchWorkspaceNavProps {
  batchId: string
}

export function AdminBatchWorkspaceNav({
  batchId,
}: AdminBatchWorkspaceNavProps) {
  const pathname = usePathname()
  const tabs = adminBatchWorkspaceTabs(batchId)

  return (
    <nav
      aria-label="Batch sections"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const isExact = tab.href === `/admin/batches/${batchId}`
        const isActive = isExact
          ? pathname === tab.href
          : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'shrink-0 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-wash text-primary-strong'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
