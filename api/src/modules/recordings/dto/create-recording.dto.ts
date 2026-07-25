import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { IsYoutubeVideoInput } from '../../../common/validators/is-youtube-video-input.validator';

export class CreateRecordingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  // Accepts a bare video id or a full youtube.com/youtu.be link — the
  // service extracts and stores only the id.
  @IsString()
  @IsNotEmpty()
  @IsYoutubeVideoInput()
  youtubeVideoId: string;

  @IsDateString()
  recordedFor: string;
}
