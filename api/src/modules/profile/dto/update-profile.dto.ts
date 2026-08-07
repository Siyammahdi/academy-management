import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;

const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

/** Base64 image payload stored as Bytes on User — same pattern as course covers. */
export class ProfileAvatarDto {
  @IsString()
  @IsIn([...AVATAR_MIME_TYPES])
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  data: string;
}

export class UpdateTeacherProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  employeeId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  qualifications?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  experience?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  joiningDate?: string | null;
}

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  guardianName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  guardianPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContact?: string | null;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn([...GENDERS])
  gender?: (typeof GENDERS)[number] | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsIn([...BLOOD_GROUPS])
  bloodGroup?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(80)
  nationality?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(64)
  nationalId?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(240)
  addressLine?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(80)
  city?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(80)
  district?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(20)
  postalCode?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(80)
  country?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileAvatarDto)
  avatar?: ProfileAvatarDto;

  /** When true, clears any stored avatar. Ignored if avatar is sent. */
  @IsOptional()
  @IsBoolean()
  clearAvatar?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTeacherProfileDto)
  teacher?: UpdateTeacherProfileDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateStudentProfileDto)
  student?: UpdateStudentProfileDto;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword: string;
}

/** Permanent self-service account closure — requires password + email confirmation. */
export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  /** Must match the account email (case-insensitive). */
  @IsString()
  @IsNotEmpty()
  confirmation: string;
}

export { AVATAR_MIME_TYPES, BLOOD_GROUPS, GENDERS };
