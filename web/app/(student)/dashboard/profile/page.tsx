'use client'

import { ProfileEditor } from '@/components/profile/profile-editor'
import { StudentPageHeader } from '@/components/student/student-page-header'

export default function StudentProfilePage() {
  return (
    <ProfileEditor
      variant="student"
      header={({ title, description, actions }) => (
        <StudentPageHeader
          title={title}
          description={description}
          actions={actions}
        />
      )}
    />
  )
}
