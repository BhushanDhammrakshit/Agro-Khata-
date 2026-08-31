import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  list() { return this.vehiclesService.list(); }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF)
  create(@Body() dto: CreateVehicleDto) { return this.vehiclesService.create(dto); }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) { return this.vehiclesService.update(id, dto); }

  @Post(':id/reactivate')
  @Roles(UserRole.OWNER, UserRole.STAFF)
  reactivate(@Param('id') id: string) { return this.vehiclesService.reactivate(id); }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.STAFF)
  remove(@Param('id') id: string) { return this.vehiclesService.remove(id); }
}
