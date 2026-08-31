import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Vehicle } from '../entities/vehicle.entity';
import { Expense } from '../entities/expense.entity';
import { SalesInvoice } from '../entities/sales-invoice.entity';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  // Ids referenced by any expense or sales invoice — these can only be deactivated, never hard-deleted.
  private async getUsedVehicleIds(manager: EntityManager, tenantId: string): Promise<Set<string>> {
    const rows: { vehicle_id: string }[] = await manager.query(
      `SELECT vehicle_id FROM expenses WHERE tenant_id=$1 AND vehicle_id IS NOT NULL
       UNION
       SELECT vehicle_id FROM sales_invoices WHERE tenant_id=$1 AND vehicle_id IS NOT NULL`,
      [tenantId],
    );
    return new Set(rows.map((r) => r.vehicle_id));
  }

  async list(): Promise<(Vehicle & { canDelete: boolean })[]> {
    const mgr = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const [vehicles, usedIds] = await Promise.all([
      mgr.getRepository(Vehicle).find({ where: { tenantId }, order: { vehicleNo: 'ASC' } }),
      this.getUsedVehicleIds(mgr, tenantId),
    ]);
    return vehicles.map((vehicle) => ({ ...vehicle, canDelete: !usedIds.has(vehicle.id) }));
  }

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const mgr = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const repo = mgr.getRepository(Vehicle);
    const existing = await repo.findOne({ where: { tenantId, vehicleNo: dto.vehicleNo } });
    if (existing) throw new ConflictException('Vehicle number already registered.');
    const v = await repo.save(repo.create({ tenantId, ...dto }));
    await this.auditLog.record({ action: 'vehicle.created', entityType: 'vehicle', entityId: v.id, after: v });
    return v;
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const mgr = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const repo = mgr.getRepository(Vehicle);
    const vehicle = await repo.findOne({ where: { id, tenantId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    await repo.update(id, dto);
    return repo.findOneByOrFail({ id });
  }

  // Hard-deletes only if never referenced elsewhere; otherwise deactivates so history stays intact.
  async remove(id: string): Promise<{ id: string } | Vehicle> {
    const mgr = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const vehicle = await mgr.getRepository(Vehicle).findOne({ where: { id, tenantId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    const [expenseCount, invoiceCount] = await Promise.all([
      mgr.getRepository(Expense).count({ where: { tenantId, vehicleId: id } }),
      mgr.getRepository(SalesInvoice).count({ where: { tenantId, vehicleId: id } }),
    ]);
    if (expenseCount > 0 || invoiceCount > 0) {
      await mgr.getRepository(Vehicle).update(id, { isActive: false });
      const after = await mgr.getRepository(Vehicle).findOneByOrFail({ id });
      await this.auditLog.record({ action: 'vehicle.deactivated', entityType: 'vehicle', entityId: id, before: vehicle, after });
      return after;
    }
    await mgr.getRepository(Vehicle).delete({ id, tenantId });
    await this.auditLog.record({ action: 'vehicle.deleted', entityType: 'vehicle', entityId: id, before: vehicle });
    return { id };
  }

  async reactivate(id: string): Promise<Vehicle> {
    const mgr = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const before = await mgr.getRepository(Vehicle).findOne({ where: { id, tenantId } });
    if (!before) throw new NotFoundException('Vehicle not found.');
    await mgr.getRepository(Vehicle).update(id, { isActive: true });
    const after = await mgr.getRepository(Vehicle).findOneByOrFail({ id });
    await this.auditLog.record({ action: 'vehicle.reactivated', entityType: 'vehicle', entityId: id, before, after });
    return after;
  }
}
