'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCurrentUser } from '@/components/auth/current-user-provider'
import { BANGLADESH_DISTRICTS } from '@/lib/bangladesh-districts'
import { formatDate } from '@/lib/format'
import { logout } from '@/lib/auth'
import {
  BLOOD_GROUPS,
  GENDER_OPTIONS,
  changePassword,
  deleteAccount,
  fetchProfileAvatarObjectUrl,
  fileToAvatarInput,
  getProfile,
  profileErrorMessage,
  updateProfile,
  type Gender,
  type ProfileAvatarInput,
  type UpdateProfileInput,
  type UserProfile,
} from '@/lib/profile'
import { initials, roleLabel } from '@/lib/user-display'
import { cn } from '@/lib/utils'

export type ProfileVariant = 'admin' | 'teacher' | 'student'

interface ProfileFormState {
  fullName: string
  email: string
  phone: string
  gender: string
  dateOfBirth: string
  bloodGroup: string
  nationality: string
  nationalId: string
  addressLine: string
  district: string
  postalCode: string
  country: string
  guardianName: string
  guardianPhone: string
  emergencyContact: string
}

function profileToForm(p: UserProfile): ProfileFormState {
  return {
    fullName: p.fullName ?? '',
    email: p.email,
    phone: p.phone ?? '',
    gender: p.gender ?? '',
    dateOfBirth: p.dateOfBirth ?? '',
    bloodGroup: p.bloodGroup ?? '',
    nationality: p.nationality ?? '',
    nationalId: p.nationalId ?? '',
    addressLine: p.addressLine ?? '',
    district: p.district ?? p.city ?? '',
    postalCode: p.postalCode ?? '',
    country: p.country ?? 'Bangladesh',
    guardianName: p.student?.guardianName ?? '',
    guardianPhone: p.student?.guardianPhone ?? '',
    emergencyContact: p.student?.emergencyContact ?? '',
  }
}

function emptyToNull(value: string): string | null {
  const t = value.trim()
  return t.length === 0 ? null : t
}

function buildPatch(
  baseline: ProfileFormState,
  form: ProfileFormState,
  profile: UserProfile,
  avatar: ProfileAvatarInput | null,
  clearAvatar: boolean,
): UpdateProfileInput | null {
  const patch: UpdateProfileInput = {}

  if (form.fullName.trim() !== baseline.fullName.trim()) {
    patch.fullName = form.fullName.trim()
  }
  if (form.email.trim().toLowerCase() !== baseline.email.trim().toLowerCase()) {
    patch.email = form.email.trim()
  }
  if (form.phone.trim() !== baseline.phone.trim()) {
    patch.phone = emptyToNull(form.phone)
  }
  if (form.gender !== baseline.gender) {
    patch.gender = (emptyToNull(form.gender) as Gender | null) ?? null
  }
  if (form.dateOfBirth !== baseline.dateOfBirth) {
    patch.dateOfBirth = emptyToNull(form.dateOfBirth)
  }
  if (form.bloodGroup !== baseline.bloodGroup) {
    patch.bloodGroup = emptyToNull(form.bloodGroup)
  }
  if (form.nationality !== baseline.nationality) {
    patch.nationality = emptyToNull(form.nationality)
  }
  if (form.nationalId !== baseline.nationalId) {
    patch.nationalId = emptyToNull(form.nationalId)
  }
  if (form.addressLine !== baseline.addressLine) {
    patch.addressLine = emptyToNull(form.addressLine)
  }
  if (form.district !== baseline.district) {
    patch.district = emptyToNull(form.district)
  }
  if (profile.city && form.district !== baseline.district) {
    patch.city = null
  }
  if (form.postalCode !== baseline.postalCode) {
    patch.postalCode = emptyToNull(form.postalCode)
  }
  if (form.country !== baseline.country) {
    patch.country = emptyToNull(form.country)
  }

  if (avatar) patch.avatar = avatar
  else if (clearAvatar) patch.clearAvatar = true

  if (profile.student) {
    const student: NonNullable<UpdateProfileInput['student']> = {}
    if (form.guardianName !== baseline.guardianName) {
      student.guardianName = emptyToNull(form.guardianName)
    }
    if (form.guardianPhone !== baseline.guardianPhone) {
      student.guardianPhone = emptyToNull(form.guardianPhone)
    }
    if (form.emergencyContact !== baseline.emergencyContact) {
      student.emergencyContact = emptyToNull(form.emergencyContact)
    }
    if (Object.keys(student).length > 0) patch.student = student
  }

  return Object.keys(patch).length > 0 ? patch : null
}

interface ProfileEditorProps {
  variant: ProfileVariant
  header: (args: {
    title: string
    description: string
    actions?: ReactNode
  }) => ReactNode
}

export function ProfileEditor({ variant, header }: ProfileEditorProps) {
  const router = useRouter()
  const { reload: reloadCurrentUser } = useCurrentUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [baseline, setBaseline] = useState<ProfileFormState | null>(null)
  const [form, setForm] = useState<ProfileFormState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingAvatar, setPendingAvatar] = useState<ProfileAvatarInput | null>(
    null,
  )
  const [clearAvatar, setClearAvatar] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {},
  )

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})

  const fileRef = useRef<HTMLInputElement>(null)
  const avatarObjectUrlRef = useRef<string | null>(null)

  const revokeAvatarUrl = useCallback(() => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current)
      avatarObjectUrlRef.current = null
    }
  }, [])

  const loadAvatar = useCallback(
    async (hasAvatar: boolean) => {
      revokeAvatarUrl()
      setAvatarUrl(null)
      if (!hasAvatar) return
      const url = await fetchProfileAvatarObjectUrl()
      if (url) {
        avatarObjectUrlRef.current = url
        setAvatarUrl(url)
      }
    },
    [revokeAvatarUrl],
  )

  const applyProfile = useCallback(
    async (next: UserProfile) => {
      const nextForm = profileToForm(next)
      setProfile(next)
      setBaseline(nextForm)
      setForm(nextForm)
      setPendingAvatar(null)
      setClearAvatar(false)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      await loadAvatar(next.hasAvatar)
    },
    [loadAvatar],
  )

  const reload = useCallback(async () => {
    try {
      const next = await getProfile()
      await applyProfile(next)
      setLoadError(null)
    } catch (err) {
      setLoadError(profileErrorMessage(err, 'Your profile could not be loaded.'))
    }
  }, [applyProfile])

  useEffect(() => {
    let cancelled = false
    getProfile()
      .then(async (next) => {
        if (cancelled) return
        await applyProfile(next)
        setLoadError(null)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            profileErrorMessage(err, 'Your profile could not be loaded.'),
          )
        }
      })
    return () => {
      cancelled = true
      revokeAvatarUrl()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load
  }, [])

  const dirty = useMemo(() => {
    if (!baseline || !form) return false
    if (pendingAvatar || clearAvatar) return true
    return JSON.stringify(baseline) !== JSON.stringify(form)
  }, [baseline, form, pendingAvatar, clearAvatar])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function setField<K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function validateForm(state: ProfileFormState): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!state.fullName.trim()) errors.fullName = 'Full name is required.'
    if (!state.email.trim()) errors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }
    return errors
  }

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { input, previewUrl: nextPreview } = await fileToAvatarInput(file)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return nextPreview
      })
      setPendingAvatar(input)
      setClearAvatar(false)
    } catch (err) {
      if (err instanceof Error && err.message === 'AVATAR_TOO_LARGE') {
        toast.error('Profile photo must be 2 MB or smaller.')
      } else if (err instanceof Error && err.message === 'AVATAR_TYPE') {
        toast.error('Use a JPEG, PNG, WebP, or GIF image.')
      } else {
        toast.error('Could not read that image.')
      }
    }
  }

  function onRemoveAvatar() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setPendingAvatar(null)
    if (profile?.hasAvatar && !clearAvatar) {
      setClearAvatar(true)
    }
  }

  function onCancel() {
    if (!profile || !baseline) return
    setForm(baseline)
    setFieldErrors({})
    setPendingAvatar(null)
    setClearAvatar(false)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  async function onSave() {
    if (!profile || !baseline || !form) return
    const errors = validateForm(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the highlighted fields.')
      return
    }
    const patch = buildPatch(baseline, form, profile, pendingAvatar, clearAvatar)
    if (!patch) return

    setSaving(true)
    try {
      const next = await updateProfile(patch)
      await applyProfile(next)
      await reloadCurrentUser()
      toast.success('Profile saved')
    } catch (err) {
      toast.error(profileErrorMessage(err, 'Could not save your profile.'))
    } finally {
      setSaving(false)
    }
  }

  async function onChangePassword() {
    const errors: Record<string, string> = {}
    if (!currentPassword) errors.currentPassword = 'Enter your current password.'
    if (newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters.'
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    setPasswordErrors(errors)
    if (Object.keys(errors).length > 0) return

    setPasswordSaving(true)
    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated. Other sessions were signed out.')
    } catch (err) {
      toast.error(profileErrorMessage(err, 'Could not change password.'))
    } finally {
      setPasswordSaving(false)
    }
  }

  async function onDeleteAccount() {
    if (!profile) return
    const errors: Record<string, string> = {}
    if (
      deleteConfirmation.trim().toLowerCase() !==
      profile.email.trim().toLowerCase()
    ) {
      errors.confirmation = 'Type your email exactly to confirm.'
    }
    if (!deletePassword) {
      errors.password = 'Enter your password to continue.'
    }
    setDeleteErrors(errors)
    if (Object.keys(errors).length > 0) return

    setDeleteSaving(true)
    try {
      await deleteAccount({
        password: deletePassword,
        confirmation: deleteConfirmation.trim(),
      })
      await logout()
      toast.success('Your account has been deleted.')
      router.replace('/login')
    } catch (err) {
      toast.error(profileErrorMessage(err, 'Could not delete your account.'))
    } finally {
      setDeleteSaving(false)
    }
  }

  const title =
    form?.fullName.trim() || profile?.fullName
      ? `${(form?.fullName.trim() || profile?.fullName || '').trim()}'s Profile`
      : 'Your profile'

  const description =
    variant === 'admin'
      ? 'Update your account details. Role and permissions stay managed separately.'
      : variant === 'teacher'
        ? 'Your contact details and security settings.'
        : 'Your personal details, guardian contacts, and password.'

  const displayAvatar =
    clearAvatar && !previewUrl ? null : (previewUrl ?? avatarUrl)

  const deleteEmailMatches =
    !!profile &&
    deleteConfirmation.trim().toLowerCase() ===
      profile.email.trim().toLowerCase()

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {header({
        title,
        description,
        actions: (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={!dirty || saving}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={!dirty || saving || !form}
              onClick={() => {
                void onSave()
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        ),
      })}

      {loadError ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {loadError}
          <Button
            type="button"
            variant="outline"
            className="ml-3 min-h-9"
            onClick={() => {
              void reload()
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {!profile || !form ? (
        !loadError ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : null
      ) : (
        <>
          <Section
            title="Avatar"
            description="Square crop · JPEG, PNG, WebP, or GIF · max 2 MB"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="size-20 bg-primary-wash">
                {displayAvatar ? (
                  <AvatarImage src={displayAvatar} alt="" />
                ) : null}
                <AvatarFallback className="bg-primary-wash text-lg font-semibold text-primary-strong">
                  {initials({
                    email: form.email,
                    fullName: form.fullName || null,
                  })}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    void onPickAvatar(e)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => fileRef.current?.click()}
                >
                  {profile.hasAvatar || previewUrl
                    ? 'Replace photo'
                    : 'Upload photo'}
                </Button>
                {(profile.hasAvatar && !clearAvatar) || previewUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={onRemoveAvatar}
                  >
                    Remove photo
                  </Button>
                ) : null}
              </div>
            </div>
          </Section>

          <Section
            title="Personal information"
            description="Name and identity details shown across the academy."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                  error={fieldErrors.fullName}
                />
                {fieldErrors.fullName ? (
                  <FieldError>{fieldErrors.fullName}</FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="gender">Gender</FieldLabel>
                <select
                  id="gender"
                  className={selectClass}
                  value={form.gender}
                  onChange={(e) => setField('gender', e.target.value)}
                >
                  <option value="">Not set</option>
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="dateOfBirth">Date of birth</FieldLabel>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setField('dateOfBirth', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="bloodGroup">Blood group</FieldLabel>
                <select
                  id="bloodGroup"
                  className={selectClass}
                  value={form.bloodGroup}
                  onChange={(e) => setField('bloodGroup', e.target.value)}
                >
                  <option value="">Not set</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="nationality">Nationality</FieldLabel>
                <Input
                  id="nationality"
                  value={form.nationality}
                  onChange={(e) => setField('nationality', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="nationalId">National ID / Passport</FieldLabel>
                <Input
                  id="nationalId"
                  value={form.nationalId}
                  onChange={(e) => setField('nationalId', e.target.value)}
                />
                <FieldDescription>Optional</FieldDescription>
              </Field>
            </div>
          </Section>

          <Section title="Contact information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  error={fieldErrors.email}
                />
                {fieldErrors.email ? (
                  <FieldError>{fieldErrors.email}</FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="addressLine">Address</FieldLabel>
                <Input
                  id="addressLine"
                  value={form.addressLine}
                  onChange={(e) => setField('addressLine', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="district">District</FieldLabel>
                <select
                  id="district"
                  className={selectClass}
                  value={form.district}
                  onChange={(e) => setField('district', e.target.value)}
                >
                  <option value="">Select district</option>
                  {BANGLADESH_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                  {form.district &&
                  !BANGLADESH_DISTRICTS.includes(
                    form.district as (typeof BANGLADESH_DISTRICTS)[number],
                  ) ? (
                    <option value={form.district}>{form.district}</option>
                  ) : null}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="postalCode">Postal code</FieldLabel>
                <Input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(e) => setField('postalCode', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="country">Country</FieldLabel>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => setField('country', e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Account information"
            description="Managed by the academy — not editable here."
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <ReadonlyItem label="User ID" value={profile.id} mono />
              {variant !== 'student' ? (
                <ReadonlyItem
                  label="Role"
                  value={
                    <span className="flex flex-wrap gap-2">
                      {profile.roles.map((role) => (
                        <Badge
                          key={role}
                          className="bg-primary-wash text-primary-strong"
                        >
                          {roleLabel(role)}
                        </Badge>
                      ))}
                    </span>
                  }
                />
              ) : null}
              <ReadonlyItem
                label="Account status"
                value={profile.status === 'active' ? 'Active' : 'Disabled'}
              />
              <ReadonlyItem
                label="Joined"
                value={formatDate(profile.createdAt)}
              />
              <ReadonlyItem
                label="Last login"
                value={
                  profile.lastLoginAt ? formatDate(profile.lastLoginAt) : '—'
                }
              />
              <ReadonlyItem
                label="Email verification"
                value={profile.emailVerified ? 'Verified' : 'Not verified'}
              />
              <ReadonlyItem
                label="Phone verification"
                value={profile.phoneVerified ? 'Verified' : 'Not verified'}
              />
            </dl>
          </Section>

          {profile.student ? (
            <Section
              title="Academic information"
              description="Student identity and guardian contacts."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {variant !== 'student' ? (
                  <ReadonlyItem
                    label="Student ID"
                    value={profile.student.studentId}
                    mono
                  />
                ) : null}
                <ReadonlyItem
                  label="Enrollment date"
                  value={
                    profile.student.enrollmentDate
                      ? formatDate(profile.student.enrollmentDate)
                      : '—'
                  }
                />
                <Field>
                  <FieldLabel htmlFor="guardianName">Guardian name</FieldLabel>
                  <Input
                    id="guardianName"
                    value={form.guardianName}
                    onChange={(e) => setField('guardianName', e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="guardianPhone">Guardian phone</FieldLabel>
                  <Input
                    id="guardianPhone"
                    value={form.guardianPhone}
                    onChange={(e) => setField('guardianPhone', e.target.value)}
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="emergencyContact">
                    Emergency contact
                  </FieldLabel>
                  <Input
                    id="emergencyContact"
                    value={form.emergencyContact}
                    onChange={(e) =>
                      setField('emergencyContact', e.target.value)
                    }
                  />
                </Field>
                <ReadonlyItem
                  label="Current courses"
                  value={
                    profile.student.currentCourses.length > 0
                      ? profile.student.currentCourses
                          .map((c) => c.title)
                          .join(', ')
                      : 'None active'
                  }
                />
                <ReadonlyItem
                  label="Current batches"
                  value={
                    profile.student.currentBatches.length > 0
                      ? profile.student.currentBatches
                          .map((b) => `${b.name} (${b.course.title})`)
                          .join(', ')
                      : 'None active'
                  }
                />
              </div>
            </Section>
          ) : null}

          {profile.admin ? (
            <Section
              title="Permissions summary"
              description="Owner/admin capabilities for this account."
            >
              <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                {profile.admin.permissionsSummary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="Security" description="Password and account access.">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="grid gap-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Change password
                </h3>
                <Field>
                  <FieldLabel htmlFor="currentPassword">
                    Current password
                  </FieldLabel>
                  <Input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      setPasswordErrors((p) => {
                        const n = { ...p }
                        delete n.currentPassword
                        return n
                      })
                    }}
                    error={passwordErrors.currentPassword}
                  />
                  {passwordErrors.currentPassword ? (
                    <FieldError>{passwordErrors.currentPassword}</FieldError>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setPasswordErrors((p) => {
                        const n = { ...p }
                        delete n.newPassword
                        return n
                      })
                    }}
                    error={passwordErrors.newPassword}
                  />
                  {passwordErrors.newPassword ? (
                    <FieldError>{passwordErrors.newPassword}</FieldError>
                  ) : (
                    <FieldDescription>At least 8 characters.</FieldDescription>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmPassword">
                    Confirm password
                  </FieldLabel>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setPasswordErrors((p) => {
                        const n = { ...p }
                        delete n.confirmPassword
                        return n
                      })
                    }}
                    error={passwordErrors.confirmPassword}
                  />
                  {passwordErrors.confirmPassword ? (
                    <FieldError>{passwordErrors.confirmPassword}</FieldError>
                  ) : null}
                </Field>
                <div>
                  <Button
                    type="button"
                    className="min-h-11"
                    disabled={
                      passwordSaving ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                    onClick={() => {
                      void onChangePassword()
                    }}
                  >
                    {passwordSaving ? 'Updating…' : 'Update password'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-xl border border-status-overdue/30 bg-status-overdue-bg/40 p-4 sm:p-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-status-overdue">
                    Delete account
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently close this account and sign out everywhere.
                    Enrollment and payment history stay with the academy; you
                    will not be able to sign in again.
                  </p>
                </div>

                {!deleteOpen ? (
                  <div>
                    <Button
                      type="button"
                      variant="destructive"
                      className="min-h-11"
                      onClick={() => setDeleteOpen(true)}
                    >
                      Delete account
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <Field>
                      <FieldLabel htmlFor="deleteConfirmation">
                        Type{' '}
                        <span className="font-mono text-foreground">
                          {profile.email}
                        </span>{' '}
                        to confirm
                      </FieldLabel>
                      <Input
                        id="deleteConfirmation"
                        autoComplete="off"
                        value={deleteConfirmation}
                        onChange={(e) => {
                          setDeleteConfirmation(e.target.value)
                          setDeleteErrors((p) => {
                            const n = { ...p }
                            delete n.confirmation
                            return n
                          })
                        }}
                        error={deleteErrors.confirmation}
                      />
                      {deleteErrors.confirmation ? (
                        <FieldError>{deleteErrors.confirmation}</FieldError>
                      ) : null}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="deletePassword">Password</FieldLabel>
                      <Input
                        id="deletePassword"
                        type="password"
                        autoComplete="current-password"
                        value={deletePassword}
                        onChange={(e) => {
                          setDeletePassword(e.target.value)
                          setDeleteErrors((p) => {
                            const n = { ...p }
                            delete n.password
                            return n
                          })
                        }}
                        error={deleteErrors.password}
                      />
                      {deleteErrors.password ? (
                        <FieldError>{deleteErrors.password}</FieldError>
                      ) : null}
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        disabled={deleteSaving}
                        onClick={() => {
                          setDeleteOpen(false)
                          setDeleteConfirmation('')
                          setDeletePassword('')
                          setDeleteErrors({})
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="min-h-11"
                        disabled={
                          deleteSaving ||
                          !deleteEmailMatches ||
                          !deletePassword
                        }
                        onClick={() => {
                          void onDeleteAccount()
                        }}
                      >
                        {deleteSaving ? 'Deleting…' : 'Delete my account'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

const selectClass = cn(
  'h-9 w-full min-w-0 rounded-lg border border-transparent bg-input/50 px-3 py-1 text-base outline-none transition-[color,box-shadow,background-color]',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm',
)

function Section({
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

function ReadonlyItem({
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
        {value}
      </dd>
    </div>
  )
}
