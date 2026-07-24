import { IsNotEmpty, IsString } from 'class-validator';

export class AssignManagerDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
