'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  getBatch,
  listBatches,
  listCourses,
  type BatchWithSeats,
  type Course,
} from '@/lib/api-client'

export interface AcademySnapshot {
  status: 'loading' | 'ready' | 'error'
  courses: Course[]
  /** Open batches, newest window first, enriched with live seat counts. */
  openBatches: BatchWithSeats[]
  openBatchByCourseId: Map<string, BatchWithSeats>
}

const EMPTY: AcademySnapshot = {
  status: 'loading',
  courses: [],
  openBatches: [],
  openBatchByCourseId: new Map(),
}

const AcademyDataContext = createContext<AcademySnapshot>(EMPTY)

/**
 * Loads the public course/batch data once for the whole marketing page.
 * Both `GET /courses` and `GET /batches` are public (doc 06 §3–4); seats
 * come from `GET /batches/:id`, which is the only endpoint that computes
 * `seatsRemaining`.
 */
export function AcademyDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AcademySnapshot>(EMPTY)

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      try {
        const [courseList, batchList] = await Promise.all([
          listCourses(1, 24),
          listBatches({ status: 'enrolling', limit: 24 }),
        ])
        if (cancelled) return

        const enriched = await Promise.all(
          batchList.data.map((batch) => getBatch(batch.id).catch(() => null)),
        )
        if (cancelled) return

        const openBatches = enriched.filter(
          (batch): batch is BatchWithSeats => batch !== null,
        )
        const openBatchByCourseId = new Map<string, BatchWithSeats>()
        for (const batch of openBatches) {
          const existing = openBatchByCourseId.get(batch.courseId)
          // Prefer a batch that still has seats over one that is full.
          if (!existing || (existing.seatsRemaining <= 0 && batch.seatsRemaining > 0)) {
            openBatchByCourseId.set(batch.courseId, batch)
          }
        }

        setSnapshot({
          status: 'ready',
          courses: courseList.data,
          openBatches,
          openBatchByCourseId,
        })
      } catch {
        if (!cancelled) {
          setSnapshot({ ...EMPTY, status: 'error' })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AcademyDataContext.Provider value={snapshot}>
      {children}
    </AcademyDataContext.Provider>
  )
}

export function useAcademyData(): AcademySnapshot {
  return useContext(AcademyDataContext)
}

/** Finds the live course matching a flagship program's keywords. */
export function useCourseByKeywords(keywords: string[]): Course | null {
  const { courses } = useAcademyData()

  return useMemo(() => {
    const match = courses.find((course) => {
      const title = course.title.toLowerCase()
      return keywords.some((keyword) => title.includes(keyword))
    })
    return match ?? null
  }, [courses, keywords])
}
