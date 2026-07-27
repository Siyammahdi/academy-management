import { RoleName } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  roles: RoleName[];
  /** Human-readable Student.studentId (e.g. "ANA-0042"), not the internal cuid. */
  studentId: string | null;
  /** From linked Student profile when present; null for staff-only accounts. */
  fullName: string | null;
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
}
