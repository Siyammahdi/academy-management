import { IsBoolean, IsDateString, IsOptional, IsUrl } from 'class-validator';

export class UpdateClassLinkDto {
  @IsUrl()
  classLink: string;

  /** Session start instant (ISO-8601). Must be paired with classEndsAt. */
  @IsOptional()
  @IsDateString()
  classStartsAt?: string;

  /** Session end instant (ISO-8601). Join disables at this time. */
  @IsOptional()
  @IsDateString()
  classEndsAt?: string;

  /** Clears classStartsAt / classEndsAt while keeping the link. */
  @IsOptional()
  @IsBoolean()
  clearSchedule?: boolean;
}
