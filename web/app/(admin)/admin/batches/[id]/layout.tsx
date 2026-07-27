'use client'

import type { ReactNode } from 'react'
import { useParams } from 'next/navigation'

import { AdminBatchWorkspaceNav } from '@/components/admin/admin-batch-workspace-nav'

export default function AdminBatchWorkspaceLayout({
  children,
}: {
  children: ReactNode
}) {
  const params = useParams<{ id: string }>()
  const batchId = params.id

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
      <AdminBatchWorkspaceNav batchId={batchId} />
      {children}
    </div>
  )
}
