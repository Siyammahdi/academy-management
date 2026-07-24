import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateBatchDto } from './create-batch.dto';

// courseId is fixed at creation — no rule allows moving a batch to another course.
export class UpdateBatchDto extends PartialType(
  OmitType(CreateBatchDto, ['courseId'] as const),
) {}
