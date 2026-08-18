import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Tenant } from '../entities/tenant.entity';
import { User, UserRole } from '../entities/user.entity';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AuditLog } from '../entities/audit-log.entity';
import { SUPERADMIN_CONNECTION } from '../superadmin/superadmin-database.module';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
    @InjectDataSource(SUPERADMIN_CONNECTION) private readonly registrationDataSource: DataSource,
  ) {}

  async register(dto: RegisterTenantDto): Promise<{ tenant: Tenant; owner: Partial<User> }> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.registrationDataSource.transaction(async (manager) => {
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

      const owner = await manager.getRepository(User).save(
        manager.getRepository(User).create({
          tenantId: tenant.id,
          phone: dto.ownerPhone,
          name: dto.ownerName,
          email: dto.ownerEmail,
          passwordHash,
          role: UserRole.OWNER,
        }),
      );

      const auditRepo = manager.getRepository(AuditLog);
      await auditRepo.save([
        auditRepo.create({
          tenantId: tenant.id,
          action: 'tenant.created',
          entityType: 'tenant',
          entityId: tenant.id,
          afterData: tenant,
        }),
        auditRepo.create({
          tenantId: tenant.id,
          action: 'user.created',
          entityType: 'user',
          entityId: owner.id,
          afterData: { name: owner.name, phone: owner.phone, role: owner.role },
        }),
      ]);

      return {
        tenant,
        owner: { id: owner.id, name: owner.name, phone: owner.phone, role: owner.role },
      };
    });
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
