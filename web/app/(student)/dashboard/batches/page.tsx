import { redirect } from 'next/navigation'

/** Legacy path — Browse & Enroll now lives at /dashboard/enroll. */
export default function StudentBatchesRedirectPage() {
  redirect('/dashboard/enroll')
}
