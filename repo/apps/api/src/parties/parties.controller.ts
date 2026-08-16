import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { PartyType } from '../entities/party.entity';
import { PartiesService } from './parties.service';
import { CreatePartyDto } from './dto/create-party.dto';
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
  getNextNumbers(@Param('id') id: string) {
    return this.partiesService.getNextNumbers(id);
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

  @Patch(':id/farmer-code')
  @Roles(UserRole.OWNER)
  updateFarmerCode(@Param('id') id: string, @Body('farmerCode') farmerCode: string) {
    return this.partiesService.updateFarmerCode(id, farmerCode);
  }
}
