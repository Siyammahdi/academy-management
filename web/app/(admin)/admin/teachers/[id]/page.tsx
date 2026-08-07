'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeftIcon,
  RefreshCwIcon,
} from 'lucide-react'
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
  getUserDetail,
  type RoleName,
  type TeacherDetail,
} from '@/lib/api-client'
import { formatDate } from '@/lib/format'
import { initials, roleLabel } from '@/lib/user-display'

function dash(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : '—'
}

export default function AdminTeacherDetailPage() {
  const params = useParams<{ id: string }>()
  const userId = params.id
  const [detail, setDetail] = useState<TeacherDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  async function reload(): Promise<void> {
    try {
      const next = await getUserDetail(userId)
      setDetail(next)
      setError(null)
      if (avatarUrl) URL.revokeObjectURL(avatarUrl)
      if (next.user.hasAvatar) {
        setAvatarUrl(await fetchUserAvatarObjectUrl(userId))
      } else {
        setAvatarUrl(null)
      }
      for (const warning of next.warnings) {
        toast.message(warning)
      }
    } catch {
      setError('Teacher details could not be loaded.')
    }
  }

  useEffect(() => {
    let cancelled = false
    getUserDetail(userId)
      .then(async (next) => {
        if (cancelled) return
        setDetail(next)
        setError(null)
        if (next.user.hasAvatar) {
          setAvatarUrl(await fetchUserAvatarObjectUrl(userId))
        }
      })
      .catch(() => {
        if (!cancelled) setError('Teacher details could not be loaded.')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load by route id
  }, [userId])

  const user = detail?.user
  const teacher = detail?.teacher

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="Academy"
        title={user?.fullName?.trim() || user?.email || 'Teacher details'}
        description="Full staff profile, assignments, activity, and role management."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              render={<Link href="/admin/teachers" />}
            >
              <ArrowLeftIcon />
              Teachers
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

      {detail && user ? (
        <>
          <DetailSection title="Personal information">
            <div className="mb-5 flex items-center gap-3">
              <Avatar className="size-16 bg-primary-wash">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-primary-wash font-semibold text-primary-strong">
                  {initials({
                    email: user.email,
                    fullName: user.fullName,
                  })}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-heading text-lg font-semibold text-foreground">
                  {dash(user.fullName)}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Full name" value={dash(user.fullName)} />
              <DetailItem label="Email" value={user.email} />
              <DetailItem label="Phone" value={dash(user.phone)} />
              <DetailItem label="Gender" value={dash(user.gender)} />
              <DetailItem
                label="Date of birth"
                value={user.dateOfBirth ? formatDate(user.dateOfBirth) : '—'}
              />
              <DetailItem label="Blood group" value={dash(user.bloodGroup)} />
              <DetailItem label="Nationality" value={dash(user.nationality)} />
              <DetailItem
                label="National ID / Passport"
                value={dash(user.nationalId)}
              />
            </dl>
          </DetailSection>

          <DetailSection title="Address">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Address" value={dash(user.addressLine)} />
              <DetailItem label="City" value={dash(user.city)} />
              <DetailItem label="District / State" value={dash(user.district)} />
              <DetailItem label="Postal code" value={dash(user.postalCode)} />
              <DetailItem label="Country" value={dash(user.country)} />
            </dl>
          </DetailSection>

          <DetailSection title="Account information">
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
              <DetailItem label="Joined" value={formatDate(user.createdAt)} />
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
          </DetailSection>

          {teacher ? (
            <DetailSection title="Teacher information">
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Employee ID" value={dash(teacher.employeeId)} />
                <DetailItem
                  label="Designation"
                  value={dash(teacher.designation)}
                />
                <DetailItem
                  label="Department"
                  value={dash(teacher.department)}
                />
                <DetailItem
                  label="Joining date"
                  value={
                    teacher.joiningDate
                      ? formatDate(teacher.joiningDate)
                      : '—'
                  }
                />
                <DetailItem
                  label="Qualifications"
                  value={dash(teacher.qualifications)}
                />
                <DetailItem
                  label="Experience"
                  value={dash(teacher.experience)}
                />
                <DetailItem label="Bio" value={dash(teacher.bio)} />
                <DetailItem
                  label="Total students"
                  value={String(teacher.totalStudents)}
                />
                <DetailItem
                  label="Assigned courses"
                  value={
                    teacher.assignedCourses.length > 0
                      ? teacher.assignedCourses.map((c) => c.title).join(', ')
                      : 'None'
                  }
                />
                <DetailItem
                  label="Assigned batches"
                  value={
                    teacher.assignedBatches.length > 0 ? (
                      <ul className="space-y-1">
                        {teacher.assignedBatches.map((b) => (
                          <li key={b.id}>
                            <Link
                              href={`/admin/batches/${b.id}`}
                              className="text-primary-strong underline-offset-2 hover:underline"
                            >
                              {b.name}
                            </Link>
                            <span className="text-muted-foreground">
                              {' '}
                              · {b.course.title} · {b.studentCount} students
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      'None'
                    )
                  }
                />
              </dl>
            </DetailSection>
          ) : null}

          <RoleManagementCard
            userId={user.id}
            roles={user.roles}
            onUpdated={(roles: RoleName[], warnings) => {
              setDetail((prev) =>
                prev
                  ? {
                      ...prev,
                      user: { ...prev.user, roles },
                      warnings,
                    }
                  : prev,
              )
            }}
          />

          <DetailSection
            title="Activity"
            description="Recent actions by this user and audit entries targeting this account."
          >
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
  rows: TeacherDetail['auditLogs']
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
