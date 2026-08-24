import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  async list(): Promise<Vehicle[]> {
    const mgr = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    return mgr.getRepository(Vehicle).find({ where: { tenantId }, order: { vehicleNo: 'ASC' } });
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

  async remove(id: string): Promise<{ id: string }> {
    const mgr = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const vehicle = await mgr.getRepository(Vehicle).findOne({ where: { id, tenantId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    const [expenseCount, invoiceCount] = await Promise.all([
      mgr.getRepository(Expense).count({ where: { tenantId, vehicleId: id } }),
      mgr.getRepository(SalesInvoice).count({ where: { tenantId, vehicleId: id } }),
    ]);
    if (expenseCount > 0 || invoiceCount > 0) {
      throw new ConflictException(`Cannot delete: this vehicle is used on ${expenseCount} expense(s) and ${invoiceCount} invoice(s).`);
    }
    await mgr.getRepository(Vehicle).delete({ id, tenantId });
    await this.auditLog.record({ action: 'vehicle.deleted', entityType: 'vehicle', entityId: id, before: vehicle });
    return { id };
  }
}
