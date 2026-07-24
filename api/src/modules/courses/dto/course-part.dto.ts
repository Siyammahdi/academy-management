import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/// Descriptive only — drives nothing (doc 05 §2's `parts` comment).
export class CoursePartDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  durationMonths: number;
}
