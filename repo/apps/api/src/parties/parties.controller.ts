import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { PartyType } from '../entities/party.entity';
import { PartiesService } from './parties.service';
import { CreatePartyDto } from './dto/create-party.dto';
import { CreatePartyPaymentDto } from './dto/create-party-payment.dto';
import { UpdatePartyDto } from './dto/update-party.dto';

const WRITE_ROLES = [UserRole.OWNER, UserRole.STAFF];

@Controller('parties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Get()
  list(@Query('partyType') partyType?: PartyType) {
    return this.partiesService.list(partyType);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partiesService.findOneOrThrow(id);
  }

  @Get(':id/next-numbers')
  getNextNumbers(@Param('id') id: string, @Query('invoiceType') invoiceType?: 'sales' | 'purchase') {
    return this.partiesService.getNextNumbers(id, invoiceType);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreatePartyDto) {
    return this.partiesService.create(dto);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdatePartyDto) {
    return this.partiesService.update(id, dto);
  }

  @Post(':id/reactivate')
  @Roles(...WRITE_ROLES)
  reactivate(@Param('id') id: string) {
    return this.partiesService.reactivate(id);
  }

  @Patch(':id/farmer-code')
  @Roles(UserRole.OWNER)
  updateFarmerCode(@Param('id') id: string, @Body('farmerCode') farmerCode: string) {
    return this.partiesService.updateFarmerCode(id, farmerCode);
  }

  @Get(':id/payments')
  listPayments(@Param('id') id: string) {
    return this.partiesService.listPayments(id);
  }

  @Post(':id/payments')
  @Roles(...WRITE_ROLES)
  recordPayment(@Param('id') id: string, @Body() dto: CreatePartyPaymentDto) {
    return this.partiesService.recordPayment(id, dto);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  remove(@Param('id') id: string) {
    return this.partiesService.remove(id);
  }
}
