import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { InvoiceStatus } from '../entities/invoice-status.enum';
import { SalesInvoicesService } from './sales-invoices.service';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { CreatePaymentDto } from '../common/dto/create-payment.dto';
import { PayCustomerDto } from './dto/pay-customer.dto';

const WRITE_ROLES = [UserRole.OWNER, UserRole.STAFF];

@Controller('sales-invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesInvoicesController {
  constructor(private readonly salesInvoicesService: SalesInvoicesService) {}

  @Get()
  list(@Query('partyId') partyId?: string, @Query('status') status?: InvoiceStatus) {
    return this.salesInvoicesService.list(partyId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesInvoicesService.findOneOrThrow(id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreateSalesInvoiceDto) {
    return this.salesInvoicesService.create(dto);
  }

  @Post(':id/send')
  @Roles(...WRITE_ROLES)
  markSent(@Param('id') id: string) {
    return this.salesInvoicesService.markSent(id);
  }

  @Post(':id/payments')
  @Roles(...WRITE_ROLES)
  addPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.salesInvoicesService.addPayment(id, dto);
  }

  // Bulk customer payment: allocates one lump sum across their outstanding invoices, oldest first.
  @Post('pay-customer')
  @Roles(...WRITE_ROLES)
  payCustomer(@Body() dto: PayCustomerDto) {
    return this.salesInvoicesService.recordCustomerPayment(dto);
  }
}
