import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// Deliberately no enrollmentFee / monthlyFee here — doc 06 §13: fees are
// never accepted from the client. FEE-02 copies them from the course
// server-side. The global ValidationPipe's forbidNonWhitelisted rejects any
// request that tries to supply them.
export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  capacity: number;

  // FEE-04 — 0-100 inclusive, entry only
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  entryDiscountPercent?: number;

  @IsDateString()
  courseStartDate: string;

  @IsDateString()
  enrollmentOpensAt: string;

  @IsDateString()
  enrollmentClosesAt: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dueDayStart?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dueDayEnd?: number;
}
