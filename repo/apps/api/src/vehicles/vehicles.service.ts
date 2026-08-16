import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Vehicle } from '../entities/vehicle.entity';
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
}
