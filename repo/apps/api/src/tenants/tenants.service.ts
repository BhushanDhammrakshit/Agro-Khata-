import { ConflictException, Injectable } from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Tenant } from '../entities/tenant.entity';
import { User, UserRole } from '../entities/user.entity';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async register(dto: RegisterTenantDto): Promise<{ tenant: Tenant; owner: Partial<User> }> {
    const manager = this.tenantContext.getManager();

    const existing = await manager.getRepository(User).findOne({ where: { phone: dto.ownerPhone } });
    if (existing) {
      throw new ConflictException('This mobile number is already registered.');
    }

    const tenant = await manager.getRepository(Tenant).save(
      manager.getRepository(Tenant).create({
        name: dto.companyName,
        legalName: dto.legalName,
        address: dto.address,
        contactPhone: dto.ownerPhone,
        contactEmail: dto.contactEmail,
        pan: dto.pan,
      }),
    );

    // Bind this transaction to the tenant we just created so the owner user
    // insert below satisfies the `users` table's RLS WITH CHECK policy.
    await this.tenantContext.setTenantId(tenant.id);

    const owner = await manager.getRepository(User).save(
      manager.getRepository(User).create({
        tenantId: tenant.id,
        phone: dto.ownerPhone,
        name: dto.ownerName,
        email: dto.ownerEmail,
        role: UserRole.OWNER,
      }),
    );

    await this.auditLog.record({ action: 'tenant.created', entityType: 'tenant', entityId: tenant.id, after: tenant });
    await this.auditLog.record({ action: 'user.created', entityType: 'user', entityId: owner.id, after: { name: owner.name, phone: owner.phone, role: owner.role } });

    return {
      tenant,
      owner: { id: owner.id, name: owner.name, phone: owner.phone, role: owner.role },
    };
  }

  async getMyTenant(): Promise<Tenant> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    return manager.getRepository(Tenant).findOneByOrFail({ id: tenantId });
  }

  async updateMyTenant(dto: UpdateTenantDto): Promise<Tenant> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const before = await manager.getRepository(Tenant).findOneByOrFail({ id: tenantId });
    await manager.getRepository(Tenant).update(tenantId, dto);
    const after = await manager.getRepository(Tenant).findOneByOrFail({ id: tenantId });
    await this.auditLog.record({ action: 'tenant.updated', entityType: 'tenant', entityId: tenantId, before, after });
    return after;
  }
}
