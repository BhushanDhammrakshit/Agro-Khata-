import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  async list(): Promise<Driver[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    return manager.getRepository(Driver).find({ where: { tenantId }, order: { name: 'ASC' } });
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

  async remove(id: string): Promise<{ id: string }> {
    const driver = await this.findOneOrThrow(id);
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const usedOnInvoices = await manager.getRepository(SalesInvoice).count({ where: { tenantId, driverId: id } });
    if (usedOnInvoices > 0) {
      throw new ConflictException(`Cannot delete: this driver is used on ${usedOnInvoices} sales invoice(s).`);
    }
    await manager.getRepository(Driver).delete({ id, tenantId });
    await this.auditLog.record({ action: 'driver.deleted', entityType: 'driver', entityId: id, before: driver });
    return { id };
  }
}
