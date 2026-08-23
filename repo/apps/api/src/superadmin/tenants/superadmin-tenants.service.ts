import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from '../../entities/tenant.entity';
import { User, UserRole } from '../../entities/user.entity';
import { SUPERADMIN_CONNECTION } from '../superadmin-database.module';
import { SuperadminCreateTenantDto } from './dto/superadmin-create-tenant.dto';

export interface TenantWithUserCount extends Tenant {
  userCount: number;
}

@Injectable()
export class SuperadminTenantsService {
  constructor(
    @InjectRepository(Tenant, SUPERADMIN_CONNECTION) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(User, SUPERADMIN_CONNECTION) private readonly usersRepo: Repository<User>,
    @InjectDataSource(SUPERADMIN_CONNECTION) private readonly dataSource: DataSource,
  ) {}

  async list(): Promise<TenantWithUserCount[]> {
    const tenants = await this.tenantsRepo.find({ order: { createdAt: 'DESC' } });
    const counts = await this.usersRepo
      .createQueryBuilder('u')
      .select('u.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.tenantId')
      .getRawMany<{ tenantId: string; count: string }>();
    const countByTenant = new Map(counts.map((c) => [c.tenantId, parseInt(c.count, 10)]));
    return tenants.map((t) => ({ ...t, userCount: countByTenant.get(t.id) ?? 0 }));
  }

  async findOneOrThrow(tenantId: string): Promise<Tenant & { users: User[] }> {
    const tenant = await this.tenantsRepo.findOneBy({ id: tenantId });
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }
    const users = await this.usersRepo.find({ where: { tenantId }, order: { createdAt: 'ASC' } });
    return { ...tenant, users };
  }

  async create(dto: SuperadminCreateTenantDto): Promise<{ tenant: Tenant; owner: Partial<User> }> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.ownerEmail } });
    if (existing) {
      throw new ConflictException('This email address is already registered.');
    }

    return this.dataSource.transaction(async (manager) => {
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
          role: UserRole.OWNER,
        }),
      );

      return { tenant, owner: { id: owner.id, name: owner.name, email: owner.email, role: owner.role } };
    });
  }

  async updateStatus(tenantId: string, isActive: boolean): Promise<Tenant> {
    const tenant = await this.tenantsRepo.findOneBy({ id: tenantId });
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }
    await this.tenantsRepo.update(tenantId, { isActive });
    return this.tenantsRepo.findOneByOrFail({ id: tenantId });
  }
}
