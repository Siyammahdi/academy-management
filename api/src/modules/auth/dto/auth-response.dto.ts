import { RoleName } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  roles: RoleName[];
  studentId: string | null; // human-readable Student.studentId (e.g. "ANA-0042"), not the internal cuid
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
}
