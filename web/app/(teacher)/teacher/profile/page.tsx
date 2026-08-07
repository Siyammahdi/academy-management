'use client'

import { ProfileEditor } from '@/components/profile/profile-editor'
import { TeacherPageHeader } from '@/components/teacher/teacher-page-header'

export default function TeacherProfilePage() {
  return (
    <ProfileEditor
      variant="teacher"
      header={({ title, description, actions }) => (
        <TeacherPageHeader
          eyebrow="Account"
          title={title}
          description={description}
          actions={actions}
        />
      )}
    />
  )
}
