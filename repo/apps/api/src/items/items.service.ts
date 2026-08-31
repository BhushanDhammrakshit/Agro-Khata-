import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Item } from '../entities/item.entity';
import { SalesInvoiceItem } from '../entities/sales-invoice-item.entity';
import { PurchaseInvoiceItem } from '../entities/purchase-invoice-item.entity';
import { StockLedger } from '../entities/stock-ledger.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  // Ids referenced by any invoice line or stock movement — these can only be deactivated, never hard-deleted.
  private async getUsedItemIds(manager: EntityManager, tenantId: string): Promise<Set<string>> {
    const rows: { item_id: string }[] = await manager.query(
      `SELECT item_id FROM sales_invoice_items WHERE tenant_id=$1 AND item_id IS NOT NULL
       UNION
       SELECT item_id FROM purchase_invoice_items WHERE tenant_id=$1 AND item_id IS NOT NULL
       UNION
       SELECT item_id FROM stock_ledger WHERE tenant_id=$1`,
      [tenantId],
    );
    return new Set(rows.map((r) => r.item_id));
  }

  async list(): Promise<(Item & { canDelete: boolean })[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const [items, usedIds] = await Promise.all([
      manager.getRepository(Item).find({ where: { tenantId }, order: { name: 'ASC' } }),
      this.getUsedItemIds(manager, tenantId),
    ]);
    return items.map((item) => ({ ...item, canDelete: !usedIds.has(item.id) }));
  }

  async findOneOrThrow(itemId: string): Promise<Item> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const item = await manager.getRepository(Item).findOne({ where: { id: itemId, tenantId } });
    if (!item) {
      throw new NotFoundException('Item not found.');
    }
    return item;
  }

  async create(dto: CreateItemDto): Promise<Item> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();

    const existing = await manager.getRepository(Item).findOne({ where: { tenantId, name: dto.name } });
    if (existing) {
      throw new ConflictException('An item with this name already exists.');
    }

    const item = await manager.getRepository(Item).save(
      manager.getRepository(Item).create({
        tenantId,
        name: dto.name,
        uom: dto.uom,
        defaultRate: dto.defaultRate?.toString(),
        hsnCode: dto.hsnCode,
        gstRate: dto.gstRate?.toString() ?? '0',
        salePrice: dto.salePrice?.toString(),
        openingStock: dto.openingStock?.toString() ?? '0',
        currentStock: dto.openingStock?.toString() ?? '0',
        lowStockAlertQty: dto.lowStockAlertQty?.toString(),
      }),
    );
    await this.auditLog.record({ action: 'item.created', entityType: 'item', entityId: item.id, after: item });
    return item;
  }

  async update(itemId: string, dto: UpdateItemDto): Promise<Item> {
    const before = await this.findOneOrThrow(itemId);
    const manager = this.tenantContext.getManager();
    const { defaultRate, gstRate, salePrice, lowStockAlertQty, ...rest } = dto;
    await manager.getRepository(Item).update(itemId, {
      ...rest,
      ...(defaultRate !== undefined ? { defaultRate: defaultRate.toString() } : {}),
      ...(gstRate !== undefined ? { gstRate: gstRate.toString() } : {}),
      ...(salePrice !== undefined ? { salePrice: salePrice.toString() } : {}),
      ...(lowStockAlertQty !== undefined ? { lowStockAlertQty: lowStockAlertQty.toString() } : {}),
    });
    const after = await manager.getRepository(Item).findOneByOrFail({ id: itemId });
    await this.auditLog.record({ action: 'item.updated', entityType: 'item', entityId: itemId, before, after });
    return after;
  }

  // Hard-deletes only if never referenced elsewhere; otherwise deactivates so history stays intact.
  async remove(itemId: string): Promise<{ id: string } | Item> {
    const item = await this.findOneOrThrow(itemId);
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const [salesCount, purchaseCount, stockCount] = await Promise.all([
      manager.getRepository(SalesInvoiceItem).count({ where: { tenantId, itemId } }),
      manager.getRepository(PurchaseInvoiceItem).count({ where: { tenantId, itemId } }),
      manager.getRepository(StockLedger).count({ where: { tenantId, itemId } }),
    ]);
    if (salesCount > 0 || purchaseCount > 0 || stockCount > 0) {
      await manager.getRepository(Item).update(itemId, { isActive: false });
      const after = await manager.getRepository(Item).findOneByOrFail({ id: itemId });
      await this.auditLog.record({ action: 'item.deactivated', entityType: 'item', entityId: itemId, before: item, after });
      return after;
    }
    await manager.getRepository(Item).delete({ id: itemId, tenantId });
    await this.auditLog.record({ action: 'item.deleted', entityType: 'item', entityId: itemId, before: item });
    return { id: itemId };
  }

  async reactivate(itemId: string): Promise<Item> {
    const before = await this.findOneOrThrow(itemId);
    const manager = this.tenantContext.getManager();
    await manager.getRepository(Item).update(itemId, { isActive: true });
    const after = await manager.getRepository(Item).findOneByOrFail({ id: itemId });
    await this.auditLog.record({ action: 'item.reactivated', entityType: 'item', entityId: itemId, before, after });
    return after;
  }
}
