import { IsUrl } from 'class-validator';

export class UpdateClassLinkDto {
  @IsUrl()
  classLink: string;
}
