'use client'

import type { ReactNode } from 'react'
import { useParams } from 'next/navigation'

import { BatchWorkspaceNav } from '@/components/manager/batch-workspace-nav'

export default function ManagerBatchWorkspaceLayout({
  children,
}: {
  children: ReactNode
}) {
  const params = useParams<{ id: string }>()
  const batchId = params.id

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
      <BatchWorkspaceNav batchId={batchId} />
      {children}
    </div>
  )
}
