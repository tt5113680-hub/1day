import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import {
  addRequestId,
  DatabaseRateLimiter,
  getHttpSecurityConfiguration,
  routeRateLimit,
} from './http-security';
import { requireAuthTokenSecret } from './runtime-config';

async function bootstrap() {
  requireAuthTokenSecret();
  const security = getHttpSecurityConfiguration();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, trustProxy: security.trustProxy }),
  );
  if (security.corsOrigins.length)
    await app.enableCors({
      origin: security.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['authorization', 'content-type', 'idempotency-key', 'x-request-id'],
      exposedHeaders: ['x-request-id'],
      maxAge: 600,
    });
  const limiter = security.rateLimitEnabled ? new DatabaseRateLimiter() : undefined;
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', async (request, reply) => {
      addRequestId(request, reply);
      const pathname = request.url.split('?')[0] ?? request.url;
      const bucket = routeRateLimit(pathname, request.method);
      if (!bucket || !limiter) return;
      const allowed = await limiter.consume(
        `${security.rateLimitNamespace}:${bucket}`,
        request.ip,
        bucket === 'auth' ? security.authRateLimit : security.publicWriteRateLimit,
        security.rateLimitWindowMs,
      );
      if (!allowed)
        return reply.code(429).send({
          statusCode: 429,
          message: 'Too many requests. Please retry later.',
          error: 'Too Many Requests',
        });
    });
  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3001) });
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
