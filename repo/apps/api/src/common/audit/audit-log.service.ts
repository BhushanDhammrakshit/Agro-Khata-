import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { AuditLog } from '../../entities/audit-log.entity';

export interface RecordAuditLogInput {
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Tenant-scoped audit trail. Call `record()` from services after any
 * create/update/state-transition on data that matters for compliance —
 * currently wired into Tenants/Users/Vendors/Farmers/Items; extend the same
 * way for Vendor Bill / Farmer Entry create-edit-send actions once those
 * modules exist.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();

    await manager.getRepository(AuditLog).save(
      manager.getRepository(AuditLog).create({
        tenantId,
        userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeData: input.before,
        afterData: input.after,
      }),
    );
  }

  async list(): Promise<AuditLog[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    return manager.getRepository(AuditLog).find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }
}
