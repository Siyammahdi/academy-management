import { RoleName } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  roles: RoleName[];
  /** Human-readable Student.studentId (e.g. "ANA-0042"), not the internal cuid. */
  studentId: string | null;
  /** User.fullName, falling back to linked Student.fullName. */
  fullName: string | null;
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
}
