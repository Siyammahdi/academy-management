import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const THUMBNAIL_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/** Base64 image payload stored as Bytes on Course — not a URL. */
export class CourseThumbnailDto {
  @IsString()
  @IsIn([...THUMBNAIL_MIME_TYPES])
  mimeType: string;

  /** Raw base64 or a `data:<mime>;base64,...` data URL. */
  @IsString()
  @IsNotEmpty()
  data: string;
}

export { THUMBNAIL_MIME_TYPES };
