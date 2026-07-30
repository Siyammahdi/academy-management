/** Join opens this many ms before classStartsAt. */
export const CLASS_JOIN_EARLY_MS = 5 * 60 * 1000

export type ClassSessionFields = {
  classLink: string | null
  classStartsAt: string | null
  classEndsAt: string | null
}

export type ClassJoinState =
  | { kind: 'no_link' }
  | { kind: 'no_schedule' }
  | {
      kind: 'before'
      startsAt: Date
      opensAt: Date
      msRemaining: number
    }
  | { kind: 'open'; endsAt: Date; msRemaining: number }
  | { kind: 'ended'; endsAt: Date }

export function getClassJoinState(
  batch: ClassSessionFields,
  now: Date = new Date(),
): ClassJoinState {
  if (!batch.classLink) {
    return { kind: 'no_link' }
  }
  if (!batch.classStartsAt || !batch.classEndsAt) {
    return { kind: 'no_schedule' }
  }

  const startsAt = new Date(batch.classStartsAt)
  const endsAt = new Date(batch.classEndsAt)
  const opensAt = new Date(startsAt.getTime() - CLASS_JOIN_EARLY_MS)
  const t = now.getTime()

  if (t < opensAt.getTime()) {
    return {
      kind: 'before',
      startsAt,
      opensAt,
      msRemaining: opensAt.getTime() - t,
    }
  }
  if (t <= endsAt.getTime()) {
    return {
      kind: 'open',
      endsAt,
      msRemaining: endsAt.getTime() - t,
    }
  }
  return { kind: 'ended', endsAt }
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
