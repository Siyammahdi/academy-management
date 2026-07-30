import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateHomeworkDto } from './create-homework.dto';

export class UpdateHomeworkDto extends PartialType(CreateHomeworkDto) {
  @IsOptional()
  @IsBoolean()
  clearPdf?: boolean;
}
