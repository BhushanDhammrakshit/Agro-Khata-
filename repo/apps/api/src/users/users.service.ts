import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { User, UserRole } from '../entities/user.entity';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findById(id: string): Promise<User> {
    const manager = this.tenantContext.getManager();
    const user = await manager.getRepository(User).findOneBy({ id });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async updateSelf(id: string, dto: { name?: string; email?: string }): Promise<User> {
    const manager = this.tenantContext.getManager();
    await manager.getRepository(User).update(id, dto);
    return this.findById(id);
  }

  async list(): Promise<User[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    // RLS already scopes this to the tenant; the explicit filter is
    // defense-in-depth for environments (e.g. local dev superuser) where RLS
    // may not be enforced on the connecting DB role.
    return manager.getRepository(User).find({ where: { tenantId }, order: { createdAt: 'ASC' } });
  }

  async invite(dto: InviteUserDto): Promise<User> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();

    const existing = await manager.getRepository(User).findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('This email address is already registered.');
    }

    const user = await manager.getRepository(User).save(
      manager.getRepository(User).create({
        tenantId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
      }),
    );
    await this.auditLog.record({ action: 'user.invited', entityType: 'user', entityId: user.id, after: { name: user.name, email: user.email, role: user.role } });
    return user;
  }

  async update(userId: string, dto: UpdateUserDto): Promise<User> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const currentUserId = this.tenantContext.getUserId();

    const user = await manager.getRepository(User).findOne({ where: { id: userId, tenantId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const isSelf = userId === currentUserId;
    const isDemotingOrDeactivating =
      (dto.role !== undefined && dto.role !== UserRole.OWNER) || dto.isActive === false;
    if (isSelf && isDemotingOrDeactivating) {
      throw new BadRequestException('You cannot change your own role or deactivate your own account.');
    }

    if (user.role === UserRole.OWNER && isDemotingOrDeactivating) {
      const ownerCount = await manager
        .getRepository(User)
        .count({ where: { tenantId, role: UserRole.OWNER, isActive: true } });
      if (ownerCount <= 1) {
        throw new BadRequestException('A tenant must always have at least one active owner.');
      }
    }

    const before = { role: user.role, isActive: user.isActive };
    await manager.getRepository(User).update(userId, dto);
    const after = await manager.getRepository(User).findOneByOrFail({ id: userId });
    await this.auditLog.record({
      action: 'user.updated',
      entityType: 'user',
      entityId: userId,
      before,
      after: { role: after.role, isActive: after.isActive },
    });
    return after;
  }
}

