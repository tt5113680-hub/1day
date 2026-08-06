import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length)
    await app.enableCors({ origin: origins, methods: ['GET', 'POST', 'OPTIONS'] });
  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3001) });
}

void bootstrap();
