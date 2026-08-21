import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { SalesInvoice } from '../entities/sales-invoice.entity';
import { SalesInvoiceItem } from '../entities/sales-invoice-item.entity';
import { SalesInvoicePayment } from '../entities/sales-invoice-payment.entity';
import { Party } from '../entities/party.entity';
import { PartyPayment, PartyPaymentDirection } from '../entities/party-payment.entity';
import { Item } from '../entities/item.entity';
import { StockLedger } from '../entities/stock-ledger.entity';
import { StockMovementType } from '../entities/stock-movement-type.enum';
import { InvoiceStatus } from '../entities/invoice-status.enum';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { CreatePaymentDto } from '../common/dto/create-payment.dto';
import { PayCustomerDto } from './dto/pay-customer.dto';

@Injectable()
export class SalesInvoicesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(partyId?: string, status?: InvoiceStatus): Promise<(SalesInvoice & { partyName: string })[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const query = manager
      .getRepository(SalesInvoice)
      .createQueryBuilder('invoice')
      .innerJoin(Party, 'party', 'party.id = invoice.partyId AND party.tenantId = invoice.tenantId')
      .addSelect('party.name', 'partyName')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .orderBy('invoice.createdAt', 'DESC');

    if (partyId) query.andWhere('invoice.partyId = :partyId', { partyId });
    if (status) query.andWhere('invoice.status = :status', { status });

    const { entities, raw } = await query.getRawAndEntities();
    return entities.map((invoice, index) => ({ ...invoice, partyName: raw[index].partyName as string }));
  }

  async findOneOrThrow(id: string): Promise<SalesInvoice & { items: SalesInvoiceItem[]; payments: SalesInvoicePayment[] }> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const invoice = await manager.getRepository(SalesInvoice).findOne({ where: { id, tenantId } });
    if (!invoice) {
      throw new NotFoundException('Sales invoice not found.');
    }
    const items = await manager.getRepository(SalesInvoiceItem).find({ where: { salesInvoiceId: id, tenantId }, order: { lineNo: 'ASC' } });
    const payments = await manager.getRepository(SalesInvoicePayment).find({ where: { salesInvoiceId: id, tenantId }, order: { createdAt: 'ASC' } });
    return { ...invoice, items, payments };
  }

  async create(dto: CreateSalesInvoiceDto): Promise<SalesInvoice & { items: SalesInvoiceItem[] }> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();

    const party = await manager.getRepository(Party).findOne({ where: { id: dto.partyId, tenantId } });
    if (!party) {
      throw new NotFoundException('Party not found.');
    }

    const existing = await manager.getRepository(SalesInvoice).findOne({ where: { tenantId, invoiceNo: dto.invoiceNo } });
    if (existing) {
      throw new BadRequestException('An invoice with this number already exists.');
    }

    const isGst = dto.isGstInvoice ?? false;
    let subTotal = 0;
    let totalGst = 0;
    const lines = dto.items.map((line) => {
      const gstRate = isGst ? (line.gstRate ?? 0) : 0;
      const taxable = line.qty * line.rate;
      const gstAmount = (taxable * gstRate) / 100;
      subTotal += taxable;
      totalGst += gstAmount;
      return { ...line, gstRate };
    });

    const cgstAmount = isGst && !dto.isInterState ? totalGst / 2 : 0;
    const sgstAmount = isGst && !dto.isInterState ? totalGst / 2 : 0;
    const igstAmount = isGst && dto.isInterState ? totalGst : 0;
    const totalAmount = subTotal + totalGst;

    const invoice = await manager.getRepository(SalesInvoice).save(
      manager.getRepository(SalesInvoice).create({
        tenantId,
        partyId: dto.partyId,
        invoiceNo: dto.invoiceNo,
        invoiceDate: dto.invoiceDate,
        dueDate: dto.dueDate,
        isGstInvoice: isGst,
        placeOfSupply: dto.placeOfSupply,
        subTotal: subTotal.toFixed(2),
        cgstAmount: cgstAmount.toFixed(2),
        sgstAmount: sgstAmount.toFixed(2),
        igstAmount: igstAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        notes: dto.notes,
        driverName: dto.driverName,
        driverId: dto.driverId,
        vehicleNo: dto.vehicleNo,
        vehicleId: dto.vehicleId,
        poNo: dto.poNo,
        poDate: dto.poDate,
        asnNo: dto.asnNo,
        status: InvoiceStatus.SENT,
        createdBy: userId,
      }),
    );

    const itemRepo = manager.getRepository(SalesInvoiceItem);
    await itemRepo.save(
      lines.map((line, index) =>
        itemRepo.create({
          tenantId,
          salesInvoiceId: invoice.id,
          lineNo: index + 1,
          itemId: line.itemId,
          itemName: line.itemName,
          uom: line.uom,
          qty: line.qty.toString(),
          rate: line.rate.toString(),
          gstRate: line.gstRate.toString(),
        }),
      ),
    );

    // Deduct stock for lines linked to a known item.
    const stockRepo = manager.getRepository(StockLedger);
    const itemRepo2 = manager.getRepository(Item);
    for (const line of lines) {
      if (!line.itemId) continue;
      await stockRepo.save(
        stockRepo.create({
          tenantId,
          itemId: line.itemId,
          movementType: StockMovementType.SALE,
          qtyChange: (-line.qty).toString(),
          referenceType: 'sales_invoice',
          referenceId: invoice.id,
          createdBy: userId,
        }),
      );
      await itemRepo2.decrement({ id: line.itemId, tenantId }, 'currentStock', line.qty);
    }

    const items = await itemRepo.find({ where: { salesInvoiceId: invoice.id }, order: { lineNo: 'ASC' } });
    await this.auditLog.record({ action: 'sales_invoice.created', entityType: 'sales_invoice', entityId: invoice.id, after: invoice });
    return { ...invoice, items };
  }

  async markSent(id: string): Promise<SalesInvoice> {
    const invoice = await this.getOrThrow(id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only a draft invoice can be marked as sent.');
    }
    const manager = this.tenantContext.getManager();
    await manager.getRepository(SalesInvoice).update(id, { status: InvoiceStatus.SENT });
    const after = await manager.getRepository(SalesInvoice).findOneByOrFail({ id });
    await this.auditLog.record({ action: 'sales_invoice.sent', entityType: 'sales_invoice', entityId: id, before: invoice, after });
    return after;
  }

  async addPayment(id: string, dto: CreatePaymentDto): Promise<SalesInvoice> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();
    const invoice = await this.getOrThrow(id);

    await manager.getRepository(SalesInvoicePayment).save(
      manager.getRepository(SalesInvoicePayment).create({
        tenantId,
        salesInvoiceId: id,
        amount: dto.amount.toString(),
        paidDate: dto.paidDate,
        paymentMode: dto.paymentMode,
        referenceNo: dto.referenceNo,
        notes: dto.notes,
        createdBy: userId,
      }),
    );

    const newPaid = parseFloat(invoice.paidAmount) + dto.amount;
    const isFullyPaid = newPaid >= parseFloat(invoice.totalAmount);
    await manager.getRepository(SalesInvoice).update(id, {
      paidAmount: newPaid.toFixed(2),
      status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
    });

    const after = await manager.getRepository(SalesInvoice).findOneByOrFail({ id });
    await this.auditLog.record({ action: 'sales_invoice.payment_recorded', entityType: 'sales_invoice', entityId: id, before: invoice, after });
    return after;
  }

  // Applies one lump-sum customer payment across their outstanding invoices, oldest first;
  // any leftover past the last invoice is logged as a standalone advance (PartyPayment).
  async recordCustomerPayment(dto: PayCustomerDto) {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();

    const party = await manager.getRepository(Party).findOne({ where: { id: dto.partyId, tenantId } });
    if (!party) {
      throw new NotFoundException('Party not found.');
    }

    const outstanding = await manager.getRepository(SalesInvoice).find({
      where: { tenantId, partyId: dto.partyId },
      order: { invoiceDate: 'ASC', createdAt: 'ASC' },
    });
    const unpaid = outstanding.filter(
      (inv) => inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.CANCELLED && inv.status !== InvoiceStatus.DRAFT,
    );

    let remaining = dto.amount;
    const applied: { invoiceId: string; invoiceNo: string; amount: string; newStatus: InvoiceStatus }[] = [];

    for (const invoice of unpaid) {
      if (remaining <= 0) break;
      const balance = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
      if (balance <= 0) continue;
      const allocated = Math.min(remaining, balance);

      await manager.getRepository(SalesInvoicePayment).save(
        manager.getRepository(SalesInvoicePayment).create({
          tenantId,
          salesInvoiceId: invoice.id,
          amount: allocated.toFixed(2),
          paidDate: dto.paidDate,
          paymentMode: dto.paymentMode,
          referenceNo: dto.referenceNo,
          notes: dto.notes,
          createdBy: userId,
        }),
      );

      const newPaid = parseFloat(invoice.paidAmount) + allocated;
      const isFullyPaid = newPaid >= parseFloat(invoice.totalAmount);
      const newStatus = isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
      await manager.getRepository(SalesInvoice).update(invoice.id, { paidAmount: newPaid.toFixed(2), status: newStatus });

      applied.push({ invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, amount: allocated.toFixed(2), newStatus });
      remaining -= allocated;
    }

    let advance: PartyPayment | null = null;
    if (remaining > 0) {
      advance = await manager.getRepository(PartyPayment).save(
        manager.getRepository(PartyPayment).create({
          tenantId,
          partyId: dto.partyId,
          direction: PartyPaymentDirection.RECEIVED,
          amount: remaining.toFixed(2),
          paidDate: dto.paidDate,
          paymentMode: dto.paymentMode,
          referenceNo: dto.referenceNo,
          notes: dto.notes ? `${dto.notes} (advance — no outstanding invoice left to apply to)` : 'Advance — no outstanding invoice left to apply to',
          createdBy: userId,
        }),
      );
    }

    await this.auditLog.record({
      action: 'sales_invoice.customer_payment_recorded',
      entityType: 'party',
      entityId: dto.partyId,
      after: { amount: dto.amount, applied, advanceAmount: advance?.amount ?? null },
    });

    return {
      partyId: dto.partyId,
      partyName: party.name,
      totalAmount: dto.amount.toFixed(2),
      applied,
      advanceAmount: advance?.amount ?? null,
    };
  }

  private async getOrThrow(id: string): Promise<SalesInvoice> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const invoice = await manager.getRepository(SalesInvoice).findOne({ where: { id, tenantId } });
    if (!invoice) {
      throw new NotFoundException('Sales invoice not found.');
    }
    return invoice;
  }
}
