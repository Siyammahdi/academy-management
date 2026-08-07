import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { DomainException } from '../../common/exceptions/domain.exception';
import {
  ChangePasswordDto,
  DeleteAccountDto,
  UpdateProfileDto,
} from './dto/update-profile.dto';
import { ProfileService } from './profile.service';
import type { ProfileResponse } from './profile.presentation';

class AvatarNotFoundException extends DomainException {
  constructor() {
    super(
      'AVATAR_NOT_FOUND',
      'No profile photo is set.',
      HttpStatus.NOT_FOUND,
    );
  }
}

@Controller()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me/profile')
  getProfile(@CurrentUser() user: AuthUser): Promise<ProfileResponse> {
    return this.profileService.getProfile(user.id);
  }

  @Get('me/profile/avatar')
  async getAvatar(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const avatar = await this.profileService.getAvatar(user.id);
    if (!avatar) {
      throw new AvatarNotFoundException();
    }
    res.setHeader('Content-Type', avatar.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(HttpStatus.OK).send(avatar.body);
  }

  @Patch('me/profile')
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    return this.profileService.updateProfile(user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('me/profile/password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.profileService.changePassword(user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me/profile')
  deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAccountDto,
  ): Promise<void> {
    return this.profileService.deleteAccount(user.id, dto);
  }
}
