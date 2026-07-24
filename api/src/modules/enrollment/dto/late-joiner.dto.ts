import { IsNotEmpty, IsString } from 'class-validator';

export class LateJoinerDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;
}
