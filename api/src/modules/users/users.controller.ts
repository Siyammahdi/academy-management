import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { RoleName } from '@prisma/client'

import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AssignRoleDto } from './dto/assign-role.dto'
import { CreateUserDto } from './dto/create-user.dto'
import { UsersService, UserSummary } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Admin directory (R-04) and manager picker (optional ?role=).
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get()
  list(
    @Query('role') role?: string,
    @Query('q') q?: string,
  ): Promise<UserSummary[]> {
    return this.usersService.list({ role, q })
  }

  // Manual provisioning — staff or student accounts without public register.
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post()
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserSummary> {
    return this.usersService.create(dto, actor)
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post(':id/roles')
  assignRole(
    @Param('id') userId: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserSummary> {
    return this.usersService.assignRole(userId, dto.role, actor)
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Delete(':id/roles/:role')
  removeRole(
    @Param('id') userId: string,
    @Param('role') role: RoleName,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserSummary> {
    return this.usersService.removeRole(userId, role, actor)
  }
}
