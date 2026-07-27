import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { CoursesModule } from './modules/courses/courses.module';
import { BatchesModule } from './modules/batches/batches.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StudentsModule } from './modules/students/students.module';
import { UsersModule } from './modules/users/users.module';
import { BillingModule } from './modules/billing/billing.module';
import { GuestModule } from './modules/guest/guest.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { RecordingsModule } from './modules/recordings/recordings.module';
import { MailModule } from './modules/mail/mail.module';
import { JobsModule } from './jobs/jobs.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { MoneySerializationInterceptor } from './common/interceptors/money-serialization.interceptor';

@Module({
  imports: [
    // Default limits are generous; forgot-password tightens via @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    MailModule,
    AuthModule,
    CoursesModule,
    BatchesModule,
    EnrollmentModule,
    GatewayModule,
    PaymentsModule,
    StudentsModule,
    UsersModule,
    BillingModule,
    GuestModule,
    HomeworkModule,
    RecordingsModule,
    JobsModule,
    ReportingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: MoneySerializationInterceptor },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
  ],
  // Re-exported so worker.module.ts can import AppModule wholesale
  // ("sharing the same modules" — doc 07 §5) and still inject
  // PaymentsService/BillingService and the BullMQ queue tokens into its
  // own @Processor providers.
  exports: [PaymentsModule, BillingModule, JobsModule, MailModule],
})
export class AppModule {}
