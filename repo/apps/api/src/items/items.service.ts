import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Item } from '../entities/item.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(): Promise<Item[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    return manager.getRepository(Item).find({ where: { tenantId }, order: { name: 'ASC' } });
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
}
