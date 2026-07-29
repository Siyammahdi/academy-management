import { Type } from 'class-transformer';
import {
  IsArray,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BillingType } from '@prisma/client';
import { CoursePartDto } from './course-part.dto';
import { CourseThumbnailDto } from './course-thumbnail.dto';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(BillingType)
  billingType: BillingType;

  // FEE-01 — the current price list. Never accepted for a batch (FEE-02 copies it).
  @IsDecimal({ decimal_digits: '0,2' })
  enrollmentFee: string;

  @IsDecimal({ decimal_digits: '0,2' })
  monthlyFee: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoursePartDto)
  parts?: CoursePartDto[];

  /** Optional cover image — stored as Bytes on the course row. */
  @IsOptional()
  @ValidateNested()
  @Type(() => CourseThumbnailDto)
  thumbnail?: CourseThumbnailDto;
}
