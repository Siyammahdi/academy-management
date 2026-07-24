import { IsEnum } from 'class-validator';
import { BatchStatus } from '@prisma/client';

export class ChangeBatchStatusDto {
  @IsEnum(BatchStatus)
  status: BatchStatus;
}
