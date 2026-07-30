import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CoursesService } from './courses.service';
import type { CourseWithOpenBatches } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import type { Paginated } from '../../common/utils/pagination';
import type { CourseResponse } from './course.presentation';
import type { ListCoursesParams } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Public()
  @Get()
  list(@Query() query: ListCoursesParams): Promise<Paginated<CourseResponse>> {
    return this.coursesService.listActive(query);
  }

  @Public()
  @Get(':id/thumbnail')
  async thumbnail(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.coursesService.getThumbnail(id);
    if (!file) {
      throw new NotFoundException('Not found');
    }
    // Write the binary yourself — StreamableFile was being JSON-serialized by
    // the global money interceptor into a ~200-byte options blob.
    const body = Buffer.from(file.body);
    res.status(200);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(body.byteLength));
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(body);
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string): Promise<CourseWithOpenBatches> {
    return this.coursesService.getByIdOrSlug(id);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post()
  create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseResponse> {
    return this.coursesService.create(dto, user);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseResponse> {
    return this.coursesService.update(id, dto, user);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseResponse> {
    return this.coursesService.archive(id, user);
  }
}
