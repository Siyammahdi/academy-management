import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../jobs/queues';
import { MAIL_PROVIDER } from './mail.provider';
import { ConsoleMailProvider } from './console.mail.provider';
import { ResendMailProvider } from './resend.mail.provider';
import { MailService } from './mail.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.emailDispatch })],
  providers: [
    {
      provide: MAIL_PROVIDER,
      useFactory: () => {
        const apiKey = process.env.RESEND_API_KEY;
        const from =
          process.env.MAIL_FROM ?? 'An Nahda Academy <onboarding@resend.dev>';
        if (apiKey && apiKey.length > 0) {
          return new ResendMailProvider(apiKey, from);
        }
        return new ConsoleMailProvider(from);
      },
    },
    MailService,
  ],
  exports: [MailService, MAIL_PROVIDER],
})
export class MailModule {}
