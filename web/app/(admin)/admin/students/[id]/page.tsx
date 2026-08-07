'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import {
  DetailItem,
  DetailSection,
  RoleManagementCard,
} from '@/components/admin/role-management-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchUserAvatarObjectUrl,
  getStudentDetail,
  type RoleName,
  type StudentDetail,
} from '@/lib/api-client'
import { formatDate, formatMoney } from '@/lib/format'
import { initials, roleLabel } from '@/lib/user-display'

function dash(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : '—'
}

export default function AdminStudentDetailPage() {
  const params = useParams<{ id: string }>()
  const studentId = params.id
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  async function reload(): Promise<void> {
    try {
      const next = await getStudentDetail(studentId)
      setDetail(next)
      setError(null)
      if (avatarUrl) URL.revokeObjectURL(avatarUrl)
      if (next.user?.hasAvatar) {
        setAvatarUrl(await fetchUserAvatarObjectUrl(next.user.id))
      } else {
        setAvatarUrl(null)
      }
      for (const warning of next.warnings) {
        toast.message(warning)
      }
    } catch {
      setError('Student details could not be loaded.')
    }
  }

  useEffect(() => {
    let cancelled = false
    getStudentDetail(studentId)
      .then(async (next) => {
        if (cancelled) return
        setDetail(next)
        setError(null)
        if (next.user?.hasAvatar) {
          setAvatarUrl(await fetchUserAvatarObjectUrl(next.user.id))
        }
      })
      .catch(() => {
        if (!cancelled) setError('Student details could not be loaded.')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  const student = detail?.student
  const user = detail?.user
  const billing = detail?.billing

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="Academy"
        title={student?.fullName || 'Student details'}
        description="Profile, enrollments, billing, activity, and role management."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              render={<Link href="/admin/students" />}
            >
              <ArrowLeftIcon />
              Students
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                void reload()
              }}
            >
              <RefreshCwIcon />
              Refresh
            </Button>
          </div>
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      {!detail && !error ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : null}

      {detail && student ? (
        <>
          <DetailSection title="Personal information">
            <div className="mb-5 flex items-center gap-3">
              <Avatar className="size-16 bg-primary-wash">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-primary-wash font-semibold text-primary-strong">
                  {initials({
                    email: user?.email ?? student.studentId,
                    fullName: student.fullName,
                  })}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-heading text-lg font-semibold text-foreground">
                  {student.fullName}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {student.studentId}
                </p>
              </div>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Full name" value={student.fullName} />
              <DetailItem label="Email" value={dash(user?.email)} />
              <DetailItem
                label="Phone"
                value={dash(user?.phone ?? student.phone)}
              />
              <DetailItem label="Gender" value={dash(user?.gender)} />
              <DetailItem
                label="Date of birth"
                value={
                  user?.dateOfBirth ? formatDate(user.dateOfBirth) : '—'
                }
              />
              <DetailItem label="Blood group" value={dash(user?.bloodGroup)} />
              <DetailItem
                label="Nationality"
                value={dash(user?.nationality)}
              />
              <DetailItem
                label="National ID / Passport"
                value={dash(user?.nationalId)}
              />
            </dl>
          </DetailSection>

          <DetailSection title="Address">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Address" value={dash(user?.addressLine)} />
              <DetailItem label="City" value={dash(user?.city)} />
              <DetailItem
                label="District / State"
                value={dash(user?.district)}
              />
              <DetailItem
                label="Postal code"
                value={dash(user?.postalCode)}
              />
              <DetailItem label="Country" value={dash(user?.country)} />
            </dl>
          </DetailSection>

          <DetailSection title="Account information">
            {user ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="User ID" value={user.id} mono />
                <DetailItem
                  label="Role"
                  value={
                    <span className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          className="bg-primary-wash text-primary-strong"
                        >
                          {role === 'admin' ? 'Super Admin' : roleLabel(role)}
                        </Badge>
                      ))}
                    </span>
                  }
                />
                <DetailItem
                  label="Account status"
                  value={user.status === 'active' ? 'Active' : 'Disabled'}
                />
                <DetailItem
                  label="Email verification"
                  value={user.emailVerified ? 'Verified' : 'Not verified'}
                />
                <DetailItem
                  label="Phone verification"
                  value={user.phoneVerified ? 'Verified' : 'Not verified'}
                />
                <DetailItem
                  label="Joined"
                  value={formatDate(user.createdAt)}
                />
                <DetailItem
                  label="Last login"
                  value={
                    user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'
                  }
                />
                <DetailItem
                  label="Last updated"
                  value={formatDate(user.updatedAt)}
                />
                <DetailItem label="Created by" value={dash(user.createdBy)} />
                <DetailItem label="Updated by" value={dash(user.updatedBy)} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                No linked login account. Guest-facing student profile only.
              </p>
            )}
          </DetailSection>

          <DetailSection title="Student information">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Student ID" value={student.studentId} mono />
              <DetailItem
                label="Guardian name"
                value={dash(student.guardianName)}
              />
              <DetailItem
                label="Guardian phone"
                value={dash(student.guardianPhone)}
              />
              <DetailItem
                label="Emergency contact"
                value={dash(student.emergencyContact)}
              />
              <DetailItem
                label="Enrollment date"
                value={
                  student.enrollmentDate
                    ? formatDate(student.enrollmentDate)
                    : '—'
                }
              />
              <DetailItem
                label="Current courses"
                value={
                  student.currentCourses.length > 0
                    ? student.currentCourses.map((c) => c.title).join(', ')
                    : 'None active'
                }
              />
              <DetailItem
                label="Current batches"
                value={
                  student.currentBatches.length > 0 ? (
                    <ul className="space-y-1">
                      {student.currentBatches.map((b) => (
                        <li key={b.id}>
                          <Link
                            href={`/admin/batches/${b.id}`}
                            className="text-primary-strong underline-offset-2 hover:underline"
                          >
                            {b.name}
                          </Link>
                          <span className="text-muted-foreground">
                            {' '}
                            · {b.course.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'None active'
                  )
                }
              />
              <DetailItem
                label="Attendance summary"
                value={student.attendanceSummary ?? 'Not tracked yet'}
              />
              <DetailItem
                label="Progress"
                value={student.progress ?? 'Not tracked yet'}
              />
              {billing ? (
                <>
                  <DetailItem
                    label="Payment status"
                    value={billing.paymentStatus.replaceAll('_', ' ')}
                  />
                  <DetailItem
                    label="Outstanding balance"
                    value={formatMoney(billing.outstandingBalance)}
                  />
                  <DetailItem
                    label="Current billing period"
                    value={
                      billing.currentBillingPeriod
                        ? `${billing.currentBillingPeriod.periodMonth} · ${billing.currentBillingPeriod.batchName} · ${billing.currentBillingPeriod.status}`
                        : '—'
                    }
                  />
                </>
              ) : null}
            </dl>
          </DetailSection>

          {billing ? (
            <DetailSection title="Billing">
              <dl className="mb-6 grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Outstanding balance"
                  value={formatMoney(billing.outstandingBalance)}
                />
                <DetailItem
                  label="Last payment"
                  value={
                    billing.lastPaymentDate
                      ? formatDate(billing.lastPaymentDate)
                      : '—'
                  }
                />
              </dl>

              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Outstanding invoices
              </h3>
              {billing.outstandingInvoices.length === 0 ? (
                <p className="mb-6 text-sm text-muted-foreground">None</p>
              ) : (
                <ul className="mb-6 space-y-2">
                  {billing.outstandingInvoices.map((inv) => (
                    <li
                      key={inv.id}
                      className="rounded-lg bg-background/70 px-3 py-2 text-sm"
                    >
                      {inv.periodMonth} · {inv.batchName} · {inv.status} ·{' '}
                      {formatMoney(inv.outstanding)} due{' '}
                      {formatDate(inv.dueDate)}
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Penalties
              </h3>
              {billing.penalties.length === 0 ? (
                <p className="mb-6 text-sm text-muted-foreground">None active</p>
              ) : (
                <ul className="mb-6 space-y-2">
                  {billing.penalties.map((p) => (
                    <li
                      key={p.enrollmentId}
                      className="rounded-lg bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue"
                    >
                      {p.batchName} — in penalty
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Billing history
              </h3>
              {billing.billingHistory.length === 0 ? (
                <p className="mb-6 text-sm text-muted-foreground">No periods</p>
              ) : (
                <ul className="mb-6 max-h-64 space-y-2 overflow-y-auto">
                  {billing.billingHistory.slice(0, 20).map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg bg-background/70 px-3 py-2 text-sm"
                    >
                      {p.periodMonth} · {p.batchName} · {p.status} · owed{' '}
                      {formatMoney(p.amountOwed)} · paid{' '}
                      {formatMoney(p.amountPaid)}
                      {p.inPenalty ? ' · penalty' : ''}
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Payment history
              </h3>
              {billing.paymentHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {billing.paymentHistory.slice(0, 20).map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg bg-background/70 px-3 py-2 text-sm"
                    >
                      {formatMoney(p.amount)} · {p.status} · {p.method} ·{' '}
                      {p.batchName} · {formatDate(p.createdAt)}
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>
          ) : null}

          <RoleManagementCard
            userId={user?.id ?? ''}
            roles={(user?.roles ?? []) as RoleName[]}
            disabled={!user}
            disabledReason="Link a login account before changing roles."
            onUpdated={(roles, warnings) => {
              setDetail((prev) =>
                prev && prev.user
                  ? {
                      ...prev,
                      user: { ...prev.user, roles },
                      warnings,
                    }
                  : prev,
              )
            }}
          />

          <DetailSection title="Activity">
            <div className="grid gap-6 lg:grid-cols-2">
              <AuditList
                title="Recent activity"
                rows={detail.recentActivity}
              />
              <AuditList title="Audit logs" rows={detail.auditLogs} />
            </div>
          </DetailSection>
        </>
      ) : null}
    </div>
  )
}

function AuditList({
  title,
  rows,
}: {
  title: string
  rows: StudentDetail['auditLogs']
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 12).map((row) => (
            <li
              key={row.id}
              className="rounded-lg bg-background/70 px-3 py-2 text-sm"
            >
              <p className="font-medium text-foreground">{row.action}</p>
              <p className="text-xs text-muted-foreground">
                {row.targetType} · {formatDate(row.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
