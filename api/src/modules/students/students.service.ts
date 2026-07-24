import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async count(): Promise<{ count: number }> {
    const count = await this.prisma.student.count();
    return { count };
  }
}
