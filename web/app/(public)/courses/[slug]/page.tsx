import type { Metadata } from 'next'

import { CourseDetailsPage } from '@/components/marketing/course-details-page'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const title = slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  return {
    title: title || 'Course',
    description:
      'Program details, fees, curriculum, and open enrollment batches at An Nahda Academy.',
  }
}

export default async function PublicCoursePage({ params }: PageProps) {
  const { slug } = await params
  return <CourseDetailsPage slug={slug} />
}
