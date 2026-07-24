import { IsNotEmpty, IsString } from 'class-validator';

// GST-01 — matched against Student.studentId, Student.phone, or the
// linked User.email; the service tries all three, not this DTO.
export class GuestLookupDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
