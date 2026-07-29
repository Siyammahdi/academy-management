import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCourseDto } from './create-course.dto';

// FEE-03 — editing these fields never touches an existing batch's snapshot.
export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  /** When true, clears any stored cover image. Ignored if thumbnail is sent. */
  @IsOptional()
  @IsBoolean()
  clearThumbnail?: boolean;
}
