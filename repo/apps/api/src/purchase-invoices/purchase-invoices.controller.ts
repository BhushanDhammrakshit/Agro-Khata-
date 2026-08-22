import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { InvoiceStatus } from '../entities/invoice-status.enum';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { CreatePaymentDto } from '../common/dto/create-payment.dto';
import { PaySupplierDto } from './dto/pay-supplier.dto';

const WRITE_ROLES = [UserRole.OWNER, UserRole.STAFF];

@Controller('purchase-invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseInvoicesController {
  constructor(private readonly purchaseInvoicesService: PurchaseInvoicesService) {}

  @Get()
  list(@Query('partyId') partyId?: string, @Query('status') status?: InvoiceStatus) {
    return this.purchaseInvoicesService.list(partyId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseInvoicesService.findOneOrThrow(id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreatePurchaseInvoiceDto) {
    return this.purchaseInvoicesService.create(dto);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseInvoiceDto) {
    return this.purchaseInvoicesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  remove(@Param('id') id: string) {
    return this.purchaseInvoicesService.remove(id);
  }

  @Post(':id/send')
  @Roles(...WRITE_ROLES)
  markSent(@Param('id') id: string) {
    return this.purchaseInvoicesService.markSent(id);
  }

  @Post(':id/payments')
  @Roles(...WRITE_ROLES)
  addPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.purchaseInvoicesService.addPayment(id, dto);
  }

  // Bulk supplier payment: allocates one lump sum across their outstanding invoices, oldest first.
  @Post('pay-supplier')
  @Roles(...WRITE_ROLES)
  paySupplier(@Body() dto: PaySupplierDto) {
    return this.purchaseInvoicesService.recordSupplierPayment(dto);
  }
}
