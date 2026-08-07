import { apiFetch, ApiError } from './api'
import { getAccessToken } from './session'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type UserStatus = 'active' | 'disabled'
export type RoleName = 'admin' | 'teacher' | 'student'

export interface ProfileCourseRef {
  id: string
  title: string
  slug: string
}

export interface ProfileBatchRef {
  id: string
  name: string
  course: ProfileCourseRef
}

export interface ProfileTeacherBlock {
  employeeId: string | null
  designation: string | null
  department: string | null
  bio: string | null
  qualifications: string | null
  experience: string | null
  joiningDate: string | null
  assignedCourses: ProfileCourseRef[]
  assignedBatches: ProfileBatchRef[]
}

export interface ProfileStudentBlock {
  studentId: string
  guardianName: string | null
  guardianPhone: string | null
  emergencyContact: string | null
  enrollmentDate: string | null
  currentCourses: ProfileCourseRef[]
  currentBatches: ProfileBatchRef[]
}

export interface UserProfile {
  id: string
  email: string
  status: UserStatus
  fullName: string | null
  phone: string | null
  gender: Gender | null
  dateOfBirth: string | null
  bloodGroup: string | null
  nationality: string | null
  nationalId: string | null
  addressLine: string | null
  city: string | null
  district: string | null
  postalCode: string | null
  country: string | null
  hasAvatar: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  roles: RoleName[]
  emailVerified: boolean
  phoneVerified: boolean
  teacher: ProfileTeacherBlock | null
  student: ProfileStudentBlock | null
  admin: { permissionsSummary: string[] } | null
}

export interface ProfileAvatarInput {
  mimeType: string
  data: string
}

export interface UpdateProfileInput {
  fullName?: string
  email?: string
  phone?: string | null
  gender?: Gender | null
  dateOfBirth?: string | null
  bloodGroup?: string | null
  nationality?: string | null
  nationalId?: string | null
  addressLine?: string | null
  city?: string | null
  district?: string | null
  postalCode?: string | null
  country?: string | null
  avatar?: ProfileAvatarInput
  clearAvatar?: boolean
  teacher?: {
    employeeId?: string | null
    designation?: string | null
    department?: string | null
    bio?: string | null
    qualifications?: string | null
    experience?: string | null
    joiningDate?: string | null
  }
  student?: {
    guardianName?: string | null
    guardianPhone?: string | null
    emergencyContact?: string | null
  }
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface DeleteAccountInput {
  password: string
  confirmation: string
}

export const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/me/profile')
}

export function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  return apiFetch<UserProfile>('/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiFetch<void>('/me/profile/password', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteAccount(input: DeleteAccountInput): Promise<void> {
  await apiFetch<void>('/me/profile', {
    method: 'DELETE',
    body: JSON.stringify(input),
  })
}

/** Load avatar bytes with Bearer auth (img src cannot send Authorization). */
export async function fetchProfileAvatarObjectUrl(): Promise<string | null> {
  const token = getAccessToken()
  if (!token) return null
  try {
    const response = await fetch(`${API_BASE_URL}/me/profile/avatar`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return null
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

export function profileErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    switch (err.body.error) {
      case 'EMAIL_TAKEN':
        return 'That email is already in use.'
      case 'PHONE_TAKEN':
        return 'That phone number is already in use.'
      case 'AVATAR_INVALID':
        return err.body.message || 'That image cannot be used as a profile photo.'
      case 'CURRENT_PASSWORD_INCORRECT':
        return 'Current password is incorrect.'
      case 'PASSWORD_CONFIRMATION_MISMATCH':
        return 'New password and confirmation do not match.'
      case 'ACCOUNT_DELETE_CONFIRMATION_INVALID':
        return 'Type your account email exactly to confirm deletion.'
      case 'LAST_ADMIN_DELETE_BLOCKED':
        return 'You are the only active admin. Transfer ownership before deleting this account.'
      case 'VALIDATION_ERROR':
        return err.body.message || 'Please check the highlighted fields.'
      default:
        return err.body.message || fallback
    }
  }
  return fallback
}

const AVATAR_OUTPUT_SIZE = 512

/** Center-crop to 1:1 and resize before upload. */
export async function fileToAvatarInput(file: File): Promise<{
  input: ProfileAvatarInput
  previewUrl: string
}> {
  const allowed = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ])
  if (!allowed.has(file.type)) {
    throw new Error('AVATAR_TYPE')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    if (side < 1) throw new Error('AVATAR_TYPE')
    const sx = Math.floor((bitmap.width - side) / 2)
    const sy = Math.floor((bitmap.height - side) / 2)

    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_OUTPUT_SIZE
    canvas.height = AVATAR_OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('AVATAR_TYPE')
    ctx.drawImage(
      bitmap,
      sx,
      sy,
      side,
      side,
      0,
      0,
      AVATAR_OUTPUT_SIZE,
      AVATAR_OUTPUT_SIZE,
    )

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result)
          else reject(new Error('AVATAR_TYPE'))
        },
        'image/jpeg',
        0.9,
      )
    })

    const maxBytes = 2 * 1024 * 1024
    if (blob.size > maxBytes) {
      throw new Error('AVATAR_TOO_LARGE')
    }

    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]!)
    }
    return {
      input: { mimeType: 'image/jpeg', data: btoa(binary) },
      previewUrl: URL.createObjectURL(blob),
    }
  } finally {
    bitmap.close()
  }
}
