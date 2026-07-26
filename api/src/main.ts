import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  // doc 07 §2 — the browser (Next.js frontend) talks to this API directly,
  // cross-origin in development. Credentials aren't used (tokens travel in
  // the request body/headers, not cookies the API sets), so no origin list
  // is required for correctness, but we still scope it to the known dev
  // origin rather than leaving it wide open.
  app.enableCors({ origin: [process.env.WEB_URL ?? 'http://localhost:3001', 'https://annahdanet.vercel.app'] });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
