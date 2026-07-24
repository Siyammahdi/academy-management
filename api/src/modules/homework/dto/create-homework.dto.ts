import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateHomeworkDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  dueDate: string;
}
