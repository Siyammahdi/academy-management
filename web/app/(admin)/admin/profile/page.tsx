'use client'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ProfileEditor } from '@/components/profile/profile-editor'

export default function AdminProfilePage() {
  return (
    <ProfileEditor
      variant="admin"
      header={({ title, description, actions }) => (
        <AdminPageHeader
          eyebrow="Account"
          title={title}
          description={description}
          actions={actions}
        />
      )}
    />
  )
}
