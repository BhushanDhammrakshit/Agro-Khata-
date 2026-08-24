import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { PurchaseInvoice } from '../entities/purchase-invoice.entity';
import { PurchaseInvoiceItem } from '../entities/purchase-invoice-item.entity';
import { PurchaseInvoicePayment } from '../entities/purchase-invoice-payment.entity';
import { Party } from '../entities/party.entity';
import { PartyPayment, PartyPaymentDirection } from '../entities/party-payment.entity';
import { Item } from '../entities/item.entity';
import { StockLedger } from '../entities/stock-ledger.entity';
import { StockMovementType } from '../entities/stock-movement-type.enum';
import { InvoiceStatus } from '../entities/invoice-status.enum';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { CreatePaymentDto } from '../common/dto/create-payment.dto';
import { PaySupplierDto } from './dto/pay-supplier.dto';

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(partyId?: string, status?: InvoiceStatus): Promise<(PurchaseInvoice & { partyName: string })[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const query = manager
      .getRepository(PurchaseInvoice)
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
        // Purchase invoices go straight to "sent" — there's no separate draft-review step for them.
        status: InvoiceStatus.SENT,
      }),
    );
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new BadRequestException('An invoice with this number already exists.');
      }
      throw err;
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

  // Full replace of an invoice's header + line items — only allowed before any payment is
  // recorded against it, since editing totals afterward would invalidate existing payments.
  async update(id: string, dto: UpdatePurchaseInvoiceDto): Promise<PurchaseInvoice & { items: PurchaseInvoiceItem[] }> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();
    const invoice = await this.getOrThrow(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Fully paid invoices cannot be edited.');
    }
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cancelled invoices cannot be edited.');
    }

    const party = await manager.getRepository(Party).findOne({ where: { id: dto.partyId, tenantId } });
    if (!party) {
      throw new NotFoundException('Party not found.');
    }

    if (dto.invoiceNo !== invoice.invoiceNo) {
      const existing = await manager.getRepository(PurchaseInvoice).findOne({ where: { tenantId, invoiceNo: dto.invoiceNo } });
      if (existing && existing.id !== id) {
        throw new BadRequestException('An invoice with this number already exists.');
      }
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

    const paidAmount = parseFloat(invoice.paidAmount);
    if (paidAmount > 0 && totalAmount < paidAmount) {
      throw new BadRequestException(`Total amount cannot be less than the ₹${paidAmount.toFixed(2)} already paid on this invoice.`);
    }

    const itemRepo = manager.getRepository(PurchaseInvoiceItem);
    const stockRepo = manager.getRepository(StockLedger);
    const itemMasterRepo = manager.getRepository(Item);
    const oldItems = await itemRepo.find({ where: { purchaseInvoiceId: id, tenantId } });

    // Reverse the stock addition the old line items made, then re-apply for the new ones.
    for (const oldLine of oldItems) {
      if (!oldLine.itemId) continue;
      await stockRepo.save(
        stockRepo.create({
          tenantId,
          itemId: oldLine.itemId,
          movementType: StockMovementType.ADJUSTMENT,
          qtyChange: (-parseFloat(oldLine.qty)).toString(),
          referenceType: 'purchase_invoice',
          referenceId: id,
          notes: 'Invoice edited — reverting previous line item',
          createdBy: userId,
        }),
      );
      await itemMasterRepo.decrement({ id: oldLine.itemId, tenantId }, 'currentStock', parseFloat(oldLine.qty));
    }
    await itemRepo.delete({ purchaseInvoiceId: id, tenantId });

    await itemRepo.save(
      lines.map((line, index) =>
        itemRepo.create({
          tenantId,
          purchaseInvoiceId: id,
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

    for (const line of lines) {
      if (!line.itemId) continue;
      await stockRepo.save(
        stockRepo.create({
          tenantId,
          itemId: line.itemId,
          movementType: StockMovementType.ADJUSTMENT,
          qtyChange: line.qty.toString(),
          referenceType: 'purchase_invoice',
          referenceId: id,
          notes: 'Invoice edited — applying updated line item',
          createdBy: userId,
        }),
      );
      await itemMasterRepo.increment({ id: line.itemId, tenantId }, 'currentStock', line.qty);
    }

    await manager.getRepository(PurchaseInvoice).update(id, {
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
      ...(paidAmount > 0 ? { status: paidAmount >= totalAmount ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID } : {}),
    });

    const after = await manager.getRepository(PurchaseInvoice).findOneByOrFail({ id });
    const items = await itemRepo.find({ where: { purchaseInvoiceId: id }, order: { lineNo: 'ASC' } });
    await this.auditLog.record({ action: 'purchase_invoice.updated', entityType: 'purchase_invoice', entityId: id, before: invoice, after });
    return { ...after, items };
  }

  // Reverses stock effects and deletes the invoice — payments/items cascade via FK.
  // Only fully paid invoices are protected; deleting a partially paid one intentionally
  // discards its payment history along with it (cascade delete on purchase_invoice_payments).
  async remove(id: string): Promise<{ id: string }> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();
    const invoice = await this.getOrThrow(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Fully paid invoices cannot be deleted.');
    }

    const itemRepo = manager.getRepository(PurchaseInvoiceItem);
    const stockRepo = manager.getRepository(StockLedger);
    const itemMasterRepo = manager.getRepository(Item);
    const items = await itemRepo.find({ where: { purchaseInvoiceId: id, tenantId } });

    for (const line of items) {
      if (!line.itemId) continue;
      await stockRepo.save(
        stockRepo.create({
          tenantId,
          itemId: line.itemId,
          movementType: StockMovementType.ADJUSTMENT,
          qtyChange: (-parseFloat(line.qty)).toString(),
          referenceType: 'purchase_invoice',
          referenceId: id,
          notes: 'Invoice deleted — reverting stock',
          createdBy: userId,
        }),
      );
      await itemMasterRepo.decrement({ id: line.itemId, tenantId }, 'currentStock', parseFloat(line.qty));
    }

    await manager.getRepository(PurchaseInvoice).delete({ id, tenantId });
    await this.auditLog.record({ action: 'purchase_invoice.deleted', entityType: 'purchase_invoice', entityId: id, before: invoice });
    return { id };
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

  // Applies one lump-sum supplier payment across their outstanding invoices, oldest first;
  // any leftover past the last invoice is logged as a standalone advance (PartyPayment).
  async recordSupplierPayment(dto: PaySupplierDto) {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();

    const party = await manager.getRepository(Party).findOne({ where: { id: dto.partyId, tenantId } });
    if (!party) {
      throw new NotFoundException('Party not found.');
    }

    const outstanding = await manager.getRepository(PurchaseInvoice).find({
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

      await manager.getRepository(PurchaseInvoicePayment).save(
        manager.getRepository(PurchaseInvoicePayment).create({
          tenantId,
          purchaseInvoiceId: invoice.id,
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
      await manager.getRepository(PurchaseInvoice).update(invoice.id, { paidAmount: newPaid.toFixed(2), status: newStatus });

      applied.push({ invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, amount: allocated.toFixed(2), newStatus });
      remaining -= allocated;
    }

    let advance: PartyPayment | null = null;
    if (remaining > 0) {
      advance = await manager.getRepository(PartyPayment).save(
        manager.getRepository(PartyPayment).create({
          tenantId,
          partyId: dto.partyId,
          direction: PartyPaymentDirection.PAID,
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
      action: 'purchase_invoice.supplier_payment_recorded',
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
