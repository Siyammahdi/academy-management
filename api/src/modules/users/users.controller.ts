import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import { RoleName } from '@prisma/client'

import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AssignRoleDto } from './dto/assign-role.dto'
import { CreateUserDto } from './dto/create-user.dto'
import { SetRoleDto } from './dto/set-role.dto'
import {
  SetRoleResult,
  TeacherDetailResponse,
  UsersService,
  UserSummary,
} from './users.service'

@Controller('users')
@Roles('admin')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(
    @Query('role') role?: string,
    @Query('q') q?: string,
  ): Promise<UserSummary[]> {
    return this.usersService.list({ role, q })
  }

  @Post()
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserSummary> {
    return this.usersService.create(dto, actor)
  }

  @Get(':id')
  getDetail(@Param('id') userId: string): Promise<TeacherDetailResponse> {
    return this.usersService.getDetail(userId)
  }

  @Get(':id/avatar')
  async getAvatar(
    @Param('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const avatar = await this.usersService.getAvatar(userId)
    if (!avatar) {
      throw new NotFoundException('Not found')
    }
    res.setHeader('Content-Type', avatar.mimeType)
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.status(HttpStatus.OK).send(avatar.body)
  }

  /** Replace the entire role set with exactly one role. */
  @Put(':id/roles')
  setRole(
    @Param('id') userId: string,
    @Body() dto: SetRoleDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<SetRoleResult> {
    return this.usersService.setRole(userId, dto.role, actor)
  }

  @Post(':id/roles')
  assignRole(
    @Param('id') userId: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserSummary> {
    return this.usersService.assignRole(userId, dto.role, actor)
  }

  @Delete(':id/roles/:role')
  removeRole(
    @Param('id') userId: string,
    @Param('role') role: RoleName,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserSummary> {
    return this.usersService.removeRole(userId, role, actor)
  }
}
