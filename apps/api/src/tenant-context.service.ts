import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class TenantContextService {
  constructor(private readonly auth: AuthService) {}

  async fromAuthorization(authorization?: string, requestedTenant?: string) {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('AUTH_REQUIRED');
    const claims = await this.auth.claims(authorization.slice(7));
    if (requestedTenant && requestedTenant !== claims.tenantId)
      throw new ForbiddenException('FORBIDDEN');
    return { tenantId: claims.tenantId, userId: claims.sub, sessionId: claims.sessionId };
  }
}
