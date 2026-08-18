import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { PurchaseInvoice } from '../entities/purchase-invoice.entity';
import { PurchaseInvoiceItem } from '../entities/purchase-invoice-item.entity';
import { PurchaseInvoicePayment } from '../entities/purchase-invoice-payment.entity';
import { Party } from '../entities/party.entity';
import { Item } from '../entities/item.entity';
import { StockLedger } from '../entities/stock-ledger.entity';
import { StockMovementType } from '../entities/stock-movement-type.enum';
import { InvoiceStatus } from '../entities/invoice-status.enum';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { CreatePaymentDto } from '../common/dto/create-payment.dto';

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(partyId?: string, status?: InvoiceStatus): Promise<PurchaseInvoice[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    return manager.getRepository(PurchaseInvoice).find({
      where: { tenantId, ...(partyId ? { partyId } : {}), ...(status ? { status } : {}) },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneOrThrow(id: string): Promise<PurchaseInvoice & { items: PurchaseInvoiceItem[]; payments: PurchaseInvoicePayment[] }> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const invoice = await manager.getRepository(PurchaseInvoice).findOne({ where: { id, tenantId } });
    if (!invoice) {
      throw new NotFoundException('Purchase invoice not found.');
    }
    const items = await manager.getRepository(PurchaseInvoiceItem).find({ where: { purchaseInvoiceId: id, tenantId }, order: { lineNo: 'ASC' } });
    const payments = await manager.getRepository(PurchaseInvoicePayment).find({ where: { purchaseInvoiceId: id, tenantId }, order: { createdAt: 'ASC' } });
    return { ...invoice, items, payments };
  }

  async create(dto: CreatePurchaseInvoiceDto): Promise<PurchaseInvoice & { items: PurchaseInvoiceItem[] }> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();

    const party = await manager.getRepository(Party).findOne({ where: { id: dto.partyId, tenantId } });
    if (!party) {
      throw new NotFoundException('Party not found.');
    }

    const existing = await manager.getRepository(PurchaseInvoice).findOne({ where: { tenantId, invoiceNo: dto.invoiceNo } });
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

    let invoice: PurchaseInvoice;
    try {
      invoice = await manager.getRepository(PurchaseInvoice).save(
        manager.getRepository(PurchaseInvoice).create({
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
        createdBy: userId,
      }),
    );
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new BadRequestException('An invoice with this number already exists.');
      }
      throw err;
    }

    // Carry this supplier's purchase invoice sequence forward after a successful save.
    if (party.nextInvoiceSeq) {
      await manager.getRepository(Party).increment({ id: party.id }, 'nextInvoiceSeq', 1);
    }

    const itemRepo = manager.getRepository(PurchaseInvoiceItem);
    await itemRepo.save(
      lines.map((line, index) =>
        itemRepo.create({
          tenantId,
          purchaseInvoiceId: invoice.id,
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

    // Add stock for lines linked to a known item.
    const stockRepo = manager.getRepository(StockLedger);
    const itemRepo2 = manager.getRepository(Item);
    for (const line of lines) {
      if (!line.itemId) continue;
      await stockRepo.save(
        stockRepo.create({
          tenantId,
          itemId: line.itemId,
          movementType: StockMovementType.PURCHASE,
          qtyChange: line.qty.toString(),
          referenceType: 'purchase_invoice',
          referenceId: invoice.id,
          createdBy: userId,
        }),
      );
      await itemRepo2.increment({ id: line.itemId, tenantId }, 'currentStock', line.qty);
    }

    const items = await itemRepo.find({ where: { purchaseInvoiceId: invoice.id }, order: { lineNo: 'ASC' } });
    await this.auditLog.record({ action: 'purchase_invoice.created', entityType: 'purchase_invoice', entityId: invoice.id, after: invoice });
    return { ...invoice, items };
  }

  async markSent(id: string): Promise<PurchaseInvoice> {
    const invoice = await this.getOrThrow(id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only a draft invoice can be marked as sent.');
    }
    const manager = this.tenantContext.getManager();
    await manager.getRepository(PurchaseInvoice).update(id, { status: InvoiceStatus.SENT });
    const after = await manager.getRepository(PurchaseInvoice).findOneByOrFail({ id });
    await this.auditLog.record({ action: 'purchase_invoice.sent', entityType: 'purchase_invoice', entityId: id, before: invoice, after });
    return after;
  }

  async addPayment(id: string, dto: CreatePaymentDto): Promise<PurchaseInvoice> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();
    const invoice = await this.getOrThrow(id);

    await manager.getRepository(PurchaseInvoicePayment).save(
      manager.getRepository(PurchaseInvoicePayment).create({
        tenantId,
        purchaseInvoiceId: id,
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
    await manager.getRepository(PurchaseInvoice).update(id, {
      paidAmount: newPaid.toFixed(2),
      status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
    });

    const after = await manager.getRepository(PurchaseInvoice).findOneByOrFail({ id });
    await this.auditLog.record({ action: 'purchase_invoice.payment_recorded', entityType: 'purchase_invoice', entityId: id, before: invoice, after });
    return after;
  }

  private async getOrThrow(id: string): Promise<PurchaseInvoice> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const invoice = await manager.getRepository(PurchaseInvoice).findOne({ where: { id, tenantId } });
    if (!invoice) {
      throw new NotFoundException('Purchase invoice not found.');
    }
    return invoice;
  }
}
