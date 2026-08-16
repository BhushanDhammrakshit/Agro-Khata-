import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SuperadminAuthGuard } from '../auth/superadmin-auth.guard';
import { SuperadminTenantsService } from './superadmin-tenants.service';
import { SuperadminCreateTenantDto } from './dto/superadmin-create-tenant.dto';
import { SuperadminUpdateTenantStatusDto } from './dto/superadmin-update-tenant-status.dto';

@Controller('superadmin/tenants')
@UseGuards(SuperadminAuthGuard)
export class SuperadminTenantsController {
  constructor(private readonly superadminTenantsService: SuperadminTenantsService) {}

  @Get()
  list() {
    return this.superadminTenantsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.superadminTenantsService.findOneOrThrow(id);
  }

  @Post()
  create(@Body() dto: SuperadminCreateTenantDto) {
    return this.superadminTenantsService.create(dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: SuperadminUpdateTenantStatusDto) {
    return this.superadminTenantsService.updateStatus(id, dto.isActive);
  }
}
