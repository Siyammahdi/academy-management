import { IsNotEmpty, IsString } from 'class-validator';

export class AssignTeacherDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
