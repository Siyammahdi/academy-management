'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  setUserRole,
  type RoleName,
} from '@/lib/api-client'
import { ApiError } from '@/lib/api'
import { roleLabel } from '@/lib/user-display'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS: { value: RoleName; label: string }[] = [
  { value: 'admin', label: 'Super Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
]

/** Prefer admin → teacher → student for the single-role picker default. */
export function primaryRoleOf(roles: readonly RoleName[]): RoleName {
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('teacher')) return 'teacher'
  if (roles.includes('student')) return 'student'
  return 'student'
}

interface RoleManagementCardProps {
  userId: string
  roles: RoleName[]
  disabled?: boolean
  disabledReason?: string
  onUpdated: (roles: RoleName[], warnings: string[]) => void
}

export function RoleManagementCard({
  userId,
  roles,
  disabled,
  disabledReason,
  onUpdated,
}: RoleManagementCardProps) {
  const current = primaryRoleOf(roles)
  const [selected, setSelected] = useState<RoleName>(current)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelected(primaryRoleOf(roles))
  }, [roles])

  const dirty = selected !== current

  async function confirmSave() {
    setSaving(true)
    try {
      const result = await setUserRole(userId, selected)
      onUpdated(result.user.roles, result.warnings)
      toast.success('Role updated')
      for (const warning of result.warnings) {
        toast.message(warning)
      }
      setConfirmOpen(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.body.error === 'LAST_ADMIN'
            ? 'Cannot remove the last admin.'
            : err.body.error === 'CANNOT_STRIP_OWN_ADMIN'
              ? 'You cannot remove your own admin role.'
              : err.body.message
          : 'Could not update role.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl bg-muted/50 p-5 sm:p-6">
      <div className="mb-4 space-y-1">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Role management
        </h2>
        <p className="text-sm text-muted-foreground">
          Changing the role immediately updates permissions and dashboard
          access. The account, password, and profile data are preserved.
        </p>
      </div>

      {disabled ? (
        <p className="text-sm text-muted-foreground">
          {disabledReason ?? 'Role management is unavailable for this profile.'}
        </p>
      ) : (
        <div className="grid max-w-md gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Current role
            </span>
            {roles.map((role) => (
              <Badge
                key={role}
                className={cn(
                  role === current
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary-wash text-primary-strong',
                )}
              >
                {role === 'admin' ? 'Super Admin' : roleLabel(role)}
              </Badge>
            ))}
          </div>

          <Field>
            <FieldLabel>Role</FieldLabel>
            <Select
              value={selected}
              onValueChange={(value) => {
                if (value != null) setSelected(value as RoleName)
              }}
              items={ROLE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            >
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div>
            <Button
              type="button"
              className="min-h-11"
              disabled={!dirty || saving}
              onClick={() => setConfirmOpen(true)}
            >
              Save role
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role?</DialogTitle>
            <DialogDescription>
              Changing this user’s role to{' '}
              <strong>
                {ROLE_OPTIONS.find((o) => o.value === selected)?.label}
              </strong>{' '}
              will immediately update their permissions and which dashboard they
              can open. Account credentials and profile information stay intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={saving}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={saving}
              onClick={() => {
                void confirmSave()
              }}
            >
              {saving ? 'Saving…' : 'Confirm change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export function DetailSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl bg-muted/50 p-5 sm:p-6">
      <div className="mb-4 space-y-1">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function DetailItem({
  label,
  value,
  mono,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'text-sm text-foreground',
          mono && 'break-all font-mono text-xs',
        )}
      >
        {value ?? '—'}
      </dd>
    </div>
  )
}
