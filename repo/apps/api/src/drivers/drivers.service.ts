import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Driver } from '../entities/driver.entity';
import { SalesInvoice } from '../entities/sales-invoice.entity';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

@Injectable()
export class DriversService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  // Ids referenced by any sales invoice — these can only be deactivated, never hard-deleted.
  private async getUsedDriverIds(manager: EntityManager, tenantId: string): Promise<Set<string>> {
    const rows: { driver_id: string }[] = await manager.query(
      `SELECT driver_id FROM sales_invoices WHERE tenant_id=$1 AND driver_id IS NOT NULL`,
      [tenantId],
    );
    return new Set(rows.map((r) => r.driver_id));
  }

  async list(): Promise<(Driver & { canDelete: boolean })[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const [drivers, usedIds] = await Promise.all([
      manager.getRepository(Driver).find({ where: { tenantId }, order: { name: 'ASC' } }),
      this.getUsedDriverIds(manager, tenantId),
    ]);
    return drivers.map((driver) => ({ ...driver, canDelete: !usedIds.has(driver.id) }));
  }

  async findOneOrThrow(id: string): Promise<Driver> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const driver = await manager.getRepository(Driver).findOne({ where: { id, tenantId } });
    if (!driver) throw new NotFoundException('Driver not found.');
    return driver;
  }

  async create(dto: CreateDriverDto): Promise<Driver> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const repo = manager.getRepository(Driver);
    const driver = await repo.save(repo.create({ tenantId, ...dto }));
    await this.auditLog.record({ action: 'driver.created', entityType: 'driver', entityId: driver.id, after: driver });
    return driver;
  }

  async update(id: string, dto: UpdateDriverDto): Promise<Driver> {
    const before = await this.findOneOrThrow(id);
    const manager = this.tenantContext.getManager();
    await manager.getRepository(Driver).update(id, dto);
    const after = await manager.getRepository(Driver).findOneByOrFail({ id });
    await this.auditLog.record({ action: 'driver.updated', entityType: 'driver', entityId: id, before, after });
    return after;
  }

  // Hard-deletes only if never referenced elsewhere; otherwise deactivates so history stays intact.
  async remove(id: string): Promise<{ id: string } | Driver> {
    const driver = await this.findOneOrThrow(id);
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const usedOnInvoices = await manager.getRepository(SalesInvoice).count({ where: { tenantId, driverId: id } });
    if (usedOnInvoices > 0) {
      await manager.getRepository(Driver).update(id, { isActive: false });
      const after = await manager.getRepository(Driver).findOneByOrFail({ id });
      await this.auditLog.record({ action: 'driver.deactivated', entityType: 'driver', entityId: id, before: driver, after });
      return after;
    }
    await manager.getRepository(Driver).delete({ id, tenantId });
    await this.auditLog.record({ action: 'driver.deleted', entityType: 'driver', entityId: id, before: driver });
    return { id };
  }

  async reactivate(id: string): Promise<Driver> {
    const before = await this.findOneOrThrow(id);
    const manager = this.tenantContext.getManager();
    await manager.getRepository(Driver).update(id, { isActive: true });
    const after = await manager.getRepository(Driver).findOneByOrFail({ id });
    await this.auditLog.record({ action: 'driver.reactivated', entityType: 'driver', entityId: id, before, after });
    return after;
  }
}
