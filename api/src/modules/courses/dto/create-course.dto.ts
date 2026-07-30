import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BillingType } from '@prisma/client';
import { CoursePartDto } from './course-part.dto';
import { CourseThumbnailDto } from './course-thumbnail.dto';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  /** Optional URL slug. Auto-generated from title when omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only.',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
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

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  featuredOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  emphasis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  focus?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  highlights?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(400)
  audience?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  outcomes?: string[];

  /** Optional cover image — stored as Bytes on the course row. */
  @IsOptional()
  @ValidateNested()
  @Type(() => CourseThumbnailDto)
  thumbnail?: CourseThumbnailDto;
}
