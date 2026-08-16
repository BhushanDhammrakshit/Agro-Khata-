import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { EntityManager } from 'typeorm';

export interface TenantRequestContext {
  tenantId?: string;
  userId?: string;
  manager: EntityManager;
}

/**
 * Request-scoped tenant context backed by AsyncLocalStorage. Populated once
 * per HTTP request by TenantTransactionInterceptor. Services pull the
 * request's transactional EntityManager from here instead of injecting the
 * global DataSource, so every query runs inside the same DB transaction that
 * has `app.tenant_id` set for Postgres Row Level Security.
 */
@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantRequestContext>();

  run<T>(context: TenantRequestContext, fn: () => T): T {
    return this.als.run(context, fn);
  }

  private getContextOrThrow(): TenantRequestContext {
    const ctx = this.als.getStore();
    if (!ctx) {
      throw new Error(
        'TenantContextService used outside of an HTTP request. Is TenantTransactionInterceptor registered?',
      );
    }
    return ctx;
  }

  getManager(): EntityManager {
    return this.getContextOrThrow().manager;
  }

  getTenantId(): string | undefined {
    return this.als.getStore()?.tenantId;
  }

  getTenantIdOrThrow(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('No tenant context on this request.');
    }
    return tenantId;
  }

  getUserId(): string | undefined {
    return this.als.getStore()?.userId;
  }

  /** Binds the Postgres session (SET LOCAL equivalent) to a tenant for the rest of this transaction. */
  async setTenantId(tenantId: string): Promise<void> {
    const ctx = this.getContextOrThrow();
    ctx.tenantId = tenantId;
    await ctx.manager.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
  }
}
