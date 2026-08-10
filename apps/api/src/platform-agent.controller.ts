import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PlatformAgentService } from './platform-agent.service';

@Controller('api/v1/platform/agents')
export class PlatformAgentController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly agents: PlatformAgentService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    await this.auth.requirePlatform(authorization);
    return {
      data: await this.agents.list(),
      meta: { requestId },
      error: null,
    };
  }

  @Post('regions')
  async createRegion(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.agents.createRegion(await this.auth.requirePlatform(authorization, 'platform.manage'), body),
      meta: { requestId },
      error: null,
    };
  }

  @Post()
  async createAgent(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.agents.createAgent(await this.auth.requirePlatform(authorization, 'platform.manage'), body),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/affiliate')
  async affiliate(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.agents.affiliate(await this.auth.requirePlatform(authorization, 'platform.manage'), id, body),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/quota')
  async setQuota(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.agents.setQuota(await this.auth.requirePlatform(authorization, 'platform.manage'), id, body),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/settlements')
  async createSettlement(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.agents.createSettlement(await this.auth.requirePlatform(authorization, 'platform.manage'), id, body),
      meta: { requestId },
      error: null,
    };
  }

  @Post('settlements/:settlementId/finalize')
  async finalizeSettlement(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('settlementId') settlementId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.agents.finalizeSettlement(await this.auth.requirePlatform(authorization, 'platform.manage'), settlementId, body),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/approvals')
  async requestApproval(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.agents.requestApproval(await this.auth.requirePlatform(authorization, 'platform.manage'), id, body),
      meta: { requestId },
      error: null,
    };
  }

  @Post('approvals/:approvalId/decide')
  async decideApproval(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('approvalId') approvalId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.agents.decideApproval(await this.auth.requirePlatform(authorization, 'platform.manage'), approvalId, body),
      meta: { requestId },
      error: null,
    };
  }
}
