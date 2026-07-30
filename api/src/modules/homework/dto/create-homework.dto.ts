import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** PDF worksheet — base64, decoded size capped in the service. */
export class HomeworkPdfDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^application\/pdf$/i, {
    message: 'Homework attachment must be a PDF.',
  })
  mimeType: string;

  /** Raw base64 (data-URL prefix optional). */
  @IsString()
  @IsNotEmpty()
  data: string;
}

export class CreateHomeworkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  /** Rich-text HTML from the editor. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  description: string;

  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => HomeworkPdfDto)
  pdf?: HomeworkPdfDto;
}
