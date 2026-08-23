import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { MailService } from '../common/mail/mail.service';
import { buildInviteEmailHtml, buildInviteEmailText } from '../common/mail/invite-email.template';
import { User, UserRole } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
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
    await this.sendInviteEmail(manager, tenantId, user);
    return user;
  }

  private async sendInviteEmail(manager: ReturnType<TenantContextService['getManager']>, tenantId: string, invitee: User): Promise<void> {
    try {
      const tenant = await manager.getRepository(Tenant).findOneBy({ id: tenantId });
      const inviterId = this.tenantContext.getUserId();
      const inviter = inviterId ? await manager.getRepository(User).findOneBy({ id: inviterId }) : null;
      const webOrigin = this.config.get<string>('webOrigin') ?? 'http://localhost:3000';
      const params = {
        inviteeName: invitee.name,
        inviterName: inviter?.name ?? 'A teammate',
        tenantName: tenant?.name ?? 'your company',
        role: invitee.role,
        loginUrl: `${webOrigin}/login?email=${encodeURIComponent(invitee.email)}`,
      };
      await this.mail.send({
        to: invitee.email,
        subject: `You've been invited to ${tenant?.name ?? 'AgroKhata'}`,
        html: buildInviteEmailHtml(params),
        text: buildInviteEmailText(params),
      });
    } catch (err) {
      // Never fail the invite itself just because the notification email failed.
      this.logger.error(`Failed to send invite email to ${invitee.email}: ${(err as Error).message}`);
    }
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

