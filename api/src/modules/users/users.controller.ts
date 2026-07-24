import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersService, UserSummary } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get()
  list(@Query('role') role?: string): Promise<UserSummary[]> {
    return this.usersService.list(role);
  }
}
