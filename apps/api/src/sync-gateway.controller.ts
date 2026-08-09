import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthorizationService } from './authorization.service';
import { SyncGatewayService } from './sync-gateway.service';

@Controller('api/v1')
export class SyncGatewayController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly sync: SyncGatewayService,
  ) {}

  @Get('sync/changes')
  async changes(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Query() query: Record<string, unknown>,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.require(authorization, 'task.read', tenant);
    const result = await this.sync.listChanges(context, query, ifNoneMatch);
    reply.header('ETag', result.etag);
    reply.header('Cache-Control', 'private, max-age=0, must-revalidate');
    if (result.notModified) {
      reply.code(304);
      return;
    }
    return {
      data: {
        cursor: result.cursor,
        pollAfterSeconds: result.pollAfterSeconds,
        topics: result.topics,
        changes: result.changes,
      },
      meta: { requestId, etag: result.etag },
      error: null,
    };
  }

  @Get('sync/stream')
  async stream(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('last-event-id') lastEventIdHeader: string | undefined,
    @Query() query: Record<string, unknown>,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.require(authorization, 'task.read', tenant);
    const topics = this.sync.parseTopics(query.topics);
    const lastEventId =
      (typeof query.lastEventId === 'string' && query.lastEventId) ||
      lastEventIdHeader ||
      undefined;
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Request-Id': requestId,
    });
    const write = (eventId: string, payload: unknown) => {
      reply.raw.write(`id: ${eventId}\n`);
      reply.raw.write(`event: sync\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      try {
        reply.raw.end();
      } catch {
        // stream already closed
      }
    };
    request.raw.on('close', close);
    const bootstrap = await this.sync.listSinceId(context, topics, lastEventId);
    for (const change of bootstrap) write(change.id, change);
    let cursor = bootstrap.at(-1)?.id ?? lastEventId;
    const timer = setInterval(() => {
      void (async () => {
        if (closed) return;
        try {
          const next = await this.sync.listSinceId(context, topics, cursor);
          for (const change of next) {
            if (change.id === cursor) continue;
            write(change.id, change);
            cursor = change.id;
          }
          reply.raw.write(`: keepalive ${Date.now()}\n\n`);
        } catch {
          close();
        }
      })();
    }, 1000);
  }

  @Get('public/sync/storefront')
  async publicStorefront(
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Query('tenant') tenant: string | undefined,
    @Query('storeId') storeId: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    if (!requestId?.trim() || !tenant?.trim() || !storeId?.trim())
      throw new BadRequestException('VALIDATION_ERROR');
    const result = await this.sync.publicStorefrontVersion(tenant, storeId);
    reply.header('ETag', result.etag);
    reply.header('Cache-Control', 'public, max-age=0, must-revalidate');
    if (ifNoneMatch && ifNoneMatch === result.etag) {
      reply.code(304);
      return;
    }
    return {
      data: result,
      meta: { requestId, etag: result.etag, pollAfterSeconds: result.pollAfterSeconds },
      error: null,
    };
  }

  @Get('platform/outbox/dead-letters')
  async deadLetters(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('limit') limit: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    await this.authorization.requirePlatform(authorization, 'platform.read');
    return {
      data: await this.sync.listDeadLetters(limit ? Number(limit) : 50),
      meta: { requestId },
      error: null,
    };
  }

  @Post('platform/outbox/:tenantId/:eventId/replay')
  async replay(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('tenantId') eventTenantId: string,
    @Param('eventId') eventId: string,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.requirePlatform(authorization, 'platform.manage');
    return {
      data: await this.sync.replayDeadLetter(context, eventId, eventTenantId),
      meta: { requestId },
      error: null,
    };
  }
}
