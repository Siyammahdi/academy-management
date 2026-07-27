'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  listMyEnrollments,
  type EnrollmentWithBatch,
} from '@/lib/api-client'
import {
  hasActiveEnrollment,
  hasBillableEnrollment,
  hasPendingApplication,
  pendingApplications,
} from '@/lib/enrollment-access'

interface StudentEnrollmentContextValue {
  enrollments: EnrollmentWithBatch[]
  loading: boolean
  error: string | null
  hasActive: boolean
  hasPending: boolean
  hasBillable: boolean
  applications: EnrollmentWithBatch[]
  reload: () => Promise<void>
}

const StudentEnrollmentContext =
  createContext<StudentEnrollmentContextValue | null>(null)

export function StudentEnrollmentProvider({
  children,
}: {
  children: ReactNode
}) {
  const [enrollments, setEnrollments] = useState<EnrollmentWithBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const result = await listMyEnrollments(1, 100)
      setEnrollments(result.data)
      setError(null)
    } catch {
      setError('Enrollment status could not be loaded.')
      setEnrollments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    listMyEnrollments(1, 100)
      .then((result) => {
        if (!cancelled) {
          setEnrollments(result.data)
          setError(null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Enrollment status could not be loaded.')
          setEnrollments([])
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Re-check when the tab regains focus so nav expands after activation.
  useEffect(() => {
    function onFocus(): void {
      void reload()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  const value = useMemo<StudentEnrollmentContextValue>(
    () => ({
      enrollments,
      loading,
      error,
      hasActive: hasActiveEnrollment(enrollments),
      hasPending: hasPendingApplication(enrollments),
      hasBillable: hasBillableEnrollment(enrollments),
      applications: pendingApplications(enrollments),
      reload,
    }),
    [enrollments, loading, error, reload],
  )

  return (
    <StudentEnrollmentContext.Provider value={value}>
      {children}
    </StudentEnrollmentContext.Provider>
  )
}

export function useStudentEnrollment(): StudentEnrollmentContextValue {
  const ctx = useContext(StudentEnrollmentContext)
  if (!ctx) {
    throw new Error(
      'useStudentEnrollment must be used within StudentEnrollmentProvider',
    )
  }
  return ctx
}
