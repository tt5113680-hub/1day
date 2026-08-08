import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { type Pool, type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const EVIDENCE_TYPES = new Set(['screenshot', 'photo']);
const RESULT_STATUSES = new Set(['succeeded', 'failed', 'pending']);
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

function text(value: unknown, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
}

function uuid(value: unknown) {
  const result = text(value, 36);
  if (!UUID.test(result)) throw new BadRequestException('VALIDATION_ERROR');
  return result;
}

function date(value: unknown) {
  const result = text(value, 40);
  if (Number.isNaN(Date.parse(result))) throw new BadRequestException('VALIDATION_ERROR');
  return result;
}

function version(value: unknown) {
  if (!Number.isInteger(value) || (value as number) < 1)
    throw new BadRequestException('VALIDATION_ERROR');
  return value as number;
}

function correlation(requestId: string) {
  return UUID.test(requestId) ? requestId : randomUUID();
}

function payload(value: unknown) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('VALIDATION_ERROR');
  if (JSON.stringify(value).length > 10_000) throw new BadRequestException('VALIDATION_ERROR');
  return value;
}

function fileInput(body: Record<string, unknown>) {
  const evidenceType = text(body.evidenceType, 32),
    originalFilename = text(body.originalFilename, 180),
    mediaType = text(body.mediaType, 100).toLowerCase(),
    contentBase64 = text(body.contentBase64, 7_000_000);
  if (!EVIDENCE_TYPES.has(evidenceType) || !IMAGE_TYPES.has(mediaType))
    throw new BadRequestException('VALIDATION_ERROR');
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._ -]*$/.test(originalFilename) ||
    originalFilename.includes('..') ||
    originalFilename.includes('/') ||
    originalFilename.includes('\\')
  )
    throw new BadRequestException('VALIDATION_ERROR');
  if (!/^[a-zA-Z0-9+/]+={0,2}$/.test(contentBase64))
    throw new BadRequestException('VALIDATION_ERROR');
  const content = Buffer.from(contentBase64, 'base64');
  if (!content.length || content.length > MAX_EVIDENCE_BYTES)
    throw new BadRequestException('VALIDATION_ERROR');
  const isPng = content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = content.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const isWebp =
    content.subarray(0, 4).toString() === 'RIFF' && content.subarray(8, 12).toString() === 'WEBP';
  if (
    (mediaType === 'image/png' && !isPng) ||
    (mediaType === 'image/jpeg' && !isJpeg) ||
    (mediaType === 'image/webp' && !isWebp)
  )
    throw new BadRequestException('VALIDATION_ERROR');
  return { evidenceType, originalFilename, mediaType, content };
}

function code(value: unknown) {
  const result = text(value, 64);
  if (!/^[A-Z0-9-]{6,64}$/i.test(result)) throw new BadRequestException('VALIDATION_ERROR');
  return result.toUpperCase();
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function maskCode(value: string) {
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(2, value.length - 4))}${value.slice(-2)}`;
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

@Injectable()
export class ResultEvidenceService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async getCustomerResults(context: OrganizationContext, customerId: string) {
    uuid(customerId);
    await this.requireCustomer(this.pool, context.tenantId, customerId);
    const orders = await this.pool.query(
      'select id,order_number,occurred_at,status,version from customer_orders where tenant_id=$1 and customer_id=$2 and deleted_at is null order by occurred_at desc',
      [context.tenantId, customerId],
    );
    return {
      customerId,
      orders: await Promise.all(
        orders.rows.map((order) => this.orderDetail(context.tenantId, order)),
      ),
    };
  }

  async createOrder(
    context: OrganizationContext,
    customerId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    uuid(customerId);
    this.key(key);
    const input = { orderNumber: text(body.orderNumber, 120), occurredAt: date(body.occurredAt) };
    return this.idempotent(context, 'customer_order', key, async (client) => {
      await this.requireCustomer(client, context.tenantId, customerId);
      const id = randomUUID();
      const row = (
        await client.query(
          'insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6) returning id,customer_id,order_number,occurred_at,status,version',
          [id, context.tenantId, customerId, input.orderNumber, input.occurredAt, context.userId],
        )
      ).rows[0];
      await this.audit(client, context, 'result.order_created', id, requestId, row);
      await this.event(client, context, 'customer.order.created.v1', id, requestId, row);
      return row;
    });
  }

  async addEvidenceFile(
    context: OrganizationContext,
    orderId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    uuid(orderId);
    this.key(key);
    const input = fileInput(body);
    return this.idempotent(context, 'evidence_file', key, async (client) => {
      await this.requireOrder(client, context.tenantId, orderId);
      const id = randomUUID(),
        contentSha256 = hash(input.content.toString('base64'));
      const row = (
        await client.query(
          'insert into evidence_files(id,tenant_id,order_id,evidence_type,original_filename,media_type,byte_size,content_sha256,content,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning id,order_id,evidence_type,original_filename,media_type,byte_size,content_sha256,status,version',
          [
            id,
            context.tenantId,
            orderId,
            input.evidenceType,
            input.originalFilename,
            input.mediaType,
            input.content.length,
            contentSha256,
            input.content,
            context.userId,
          ],
        )
      ).rows[0];
      await this.audit(client, context, 'result.evidence_file_added', id, requestId, row);
      await this.event(
        client,
        context,
        'customer.order.evidence_added.v1',
        orderId,
        requestId,
        row,
      );
      return row;
    });
  }

  async fileContent(context: OrganizationContext, fileId: string) {
    uuid(fileId);
    const row = (
      await this.pool.query(
        'select id,original_filename,media_type,content from evidence_files where id=$1 and tenant_id=$2 and status=$3 and deleted_at is null',
        [fileId, context.tenantId, 'active'],
      )
    ).rows[0];
    if (!row) throw new NotFoundException('NOT_FOUND');
    return row as { original_filename: string; media_type: string; content: Buffer };
  }

  async issueVerificationCode(
    context: OrganizationContext,
    orderId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    uuid(orderId);
    this.key(key);
    const input = { code: code(body.code), expiresAt: date(body.expiresAt) };
    if (Date.parse(input.expiresAt) <= Date.now())
      throw new BadRequestException('VALIDATION_ERROR');
    return this.idempotent(context, 'verification_code', key, async (client) => {
      await this.requireOrder(client, context.tenantId, orderId);
      const id = randomUUID();
      const row = (
        await client.query(
          'insert into verification_codes(id,tenant_id,order_id,code_hash,expires_at,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6) returning id,order_id,expires_at,status,version',
          [id, context.tenantId, orderId, hash(input.code), input.expiresAt, context.userId],
        )
      ).rows[0];
      const data = { ...row, maskedCode: maskCode(input.code) };
      await this.audit(client, context, 'result.verification_code_issued', id, requestId, data);
      await this.event(
        client,
        context,
        'customer.order.verification_code_issued.v1',
        orderId,
        requestId,
        data,
      );
      return data;
    });
  }

  async redeemVerificationCode(
    context: OrganizationContext,
    orderId: string,
    codeId: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    uuid(orderId);
    uuid(codeId);
    const input = { code: code(body.code), version: version(body.version) };
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const row = (
        await client.query(
          "select * from verification_codes where id=$1 and order_id=$2 and tenant_id=$3 and status='issued' and deleted_at is null for update",
          [codeId, orderId, context.tenantId],
        )
      ).rows[0];
      if (!row) throw new NotFoundException('NOT_FOUND');
      if (
        row.version !== input.version ||
        row.code_hash !== hash(input.code) ||
        new Date(row.expires_at) <= new Date()
      )
        throw new ConflictException('CONFLICT');
      const redeemed = (
        await client.query(
          "update verification_codes set status='redeemed',redeemed_at=now(),redeemed_by=$1,updated_at=now(),updated_by=$1,version=version+1 where id=$2 returning id,order_id,status,redeemed_at,version",
          [context.userId, codeId],
        )
      ).rows[0];
      await this.audit(
        client,
        context,
        'result.verification_code_redeemed',
        codeId,
        requestId,
        redeemed,
      );
      await this.event(
        client,
        context,
        'customer.order.verification_code_redeemed.v1',
        orderId,
        requestId,
        redeemed,
      );
      await client.query('commit');
      return redeemed;
    } catch (error) {
      await client.query('rollback');
      if (isUniqueViolation(error)) throw new ConflictException('CONFLICT');
      throw error;
    } finally {
      client.release();
    }
  }

  async recordConnectorResult(
    context: OrganizationContext,
    orderId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    uuid(orderId);
    this.key(key);
    const input = {
      connectorCode: text(body.connectorCode, 64),
      externalReference: text(body.externalReference, 160),
      resultStatus: text(body.resultStatus, 32),
      payload: payload(body.payload),
    };
    if (!RESULT_STATUSES.has(input.resultStatus)) throw new BadRequestException('VALIDATION_ERROR');
    return this.idempotent(context, 'connector_result', key, async (client) => {
      await this.requireOrder(client, context.tenantId, orderId);
      const id = randomUUID();
      const row = (
        await client.query(
          'insert into connector_results(id,tenant_id,order_id,connector_code,external_reference,result_status,payload,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$8) returning id,order_id,connector_code,external_reference,result_status,payload,received_at,status,version',
          [
            id,
            context.tenantId,
            orderId,
            input.connectorCode,
            input.externalReference,
            input.resultStatus,
            input.payload,
            context.userId,
          ],
        )
      ).rows[0];
      await this.audit(client, context, 'result.connector_received', id, requestId, row);
      await this.event(
        client,
        context,
        'customer.order.connector_result_received.v1',
        orderId,
        requestId,
        row,
      );
      return row;
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private async orderDetail(tenantId: string, order: Record<string, unknown>) {
    const [evidence, codes, connectorResults] = await Promise.all([
      this.pool.query(
        'select id,evidence_type,original_filename,media_type,byte_size,content_sha256,status,version from evidence_files where tenant_id=$1 and order_id=$2 and deleted_at is null order by created_at',
        [tenantId, order.id],
      ),
      this.pool.query(
        'select id,expires_at,redeemed_at,status,version from verification_codes where tenant_id=$1 and order_id=$2 and deleted_at is null order by created_at',
        [tenantId, order.id],
      ),
      this.pool.query(
        'select id,connector_code,external_reference,result_status,payload,received_at,status,version from connector_results where tenant_id=$1 and order_id=$2 and deleted_at is null order by received_at',
        [tenantId, order.id],
      ),
    ]);
    return {
      id: order.id,
      orderNumber: order.order_number,
      occurredAt: order.occurred_at,
      status: order.status,
      version: order.version,
      evidenceFiles: evidence.rows.map((file) => ({
        id: file.id,
        evidenceType: file.evidence_type,
        originalFilename: file.original_filename,
        mediaType: file.media_type,
        byteSize: file.byte_size,
        contentSha256: file.content_sha256,
        status: file.status,
        version: file.version,
      })),
      verificationCodes: codes.rows.map((code) => ({
        id: code.id,
        expiresAt: code.expires_at,
        redeemedAt: code.redeemed_at,
        status: code.status,
        version: code.version,
      })),
      connectorResults: connectorResults.rows.map((result) => ({
        id: result.id,
        connectorCode: result.connector_code,
        externalReference: result.external_reference,
        resultStatus: result.result_status,
        payload: result.payload,
        receivedAt: result.received_at,
        status: result.status,
        version: result.version,
      })),
    };
  }

  private async requireCustomer(client: Pool | PoolClient, tenantId: string, customerId: string) {
    const result = await client.query(
      "select id from customers where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
      [customerId, tenantId],
    );
    if (!result.rowCount) throw new NotFoundException('NOT_FOUND');
  }

  private async requireOrder(client: Pool | PoolClient, tenantId: string, orderId: string) {
    const result = await client.query(
      "select id from customer_orders where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
      [orderId, tenantId],
    );
    if (!result.rowCount) throw new NotFoundException('NOT_FOUND');
  }

  private key(key: string) {
    if (!key.trim() || key.length > 200) throw new BadRequestException('VALIDATION_ERROR');
  }

  private async idempotent(
    context: OrganizationContext,
    resourceType: string,
    key: string,
    action: (client: PoolClient) => Promise<Record<string, unknown>>,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3 and deleted_at is null',
        [context.tenantId, resourceType, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const data = await action(client);
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, resourceType, key, data, context.userId],
      );
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async audit(
    client: Pool | PoolClient,
    context: OrganizationContext,
    action: string,
    resourceId: string,
    requestId: string,
    details: unknown,
  ) {
    await client.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        context.tenantId,
        context.userId,
        action,
        'result_evidence',
        resourceId,
        correlation(requestId),
        'core-007',
        details,
      ],
    );
  }

  private async event(
    client: Pool | PoolClient,
    context: OrganizationContext,
    eventType: string,
    aggregateId: string,
    requestId: string,
    payload: unknown,
  ) {
    const correlationId = correlation(requestId);
    await client.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [
        randomUUID(),
        context.tenantId,
        eventType,
        'customer_order',
        aggregateId,
        { eventName: eventType, correlationId, traceId: 'core-007', payload },
        correlationId,
        'core-007',
        context.userId,
      ],
    );
  }
}
