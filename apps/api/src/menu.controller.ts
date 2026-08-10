import { Controller, Get, Headers, Query } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('api/v1/me')
export class MenuController {
  constructor(private readonly menus: MenuService) {}

  @Get('menu')
  async menu(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Query('product') product?: string,
  ) {
    return {
      data: await this.menus.menuFor(authorization, tenantId, product),
    };
  }
}
