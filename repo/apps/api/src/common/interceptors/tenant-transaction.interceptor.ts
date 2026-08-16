import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Observable, from } from 'rxjs';
import { TenantContextService } from '../tenant-context/tenant-context.service';

/**
 * Wraps every HTTP request in a single DB transaction (one pooled connection
 * per request). If the request is authenticated (JwtAuthGuard already ran and
 * populated req.user), binds Postgres session var `app.tenant_id` for that
 * transaction so Row Level Security scopes every query to the caller's tenant.
 * Commits on success, rolls back on any thrown error.
 */
@Injectable()
export class TenantTransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    return from(this.handle(req, next));
  }

  private async handle(req: any, next: CallHandler): Promise<unknown> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const tenantId: string | undefined = req.user?.tenantId;

    try {
      const result = await this.tenantContext.run(
        { tenantId, userId: req.user?.sub, manager: queryRunner.manager },
        async () => {
          if (tenantId) {
            await queryRunner.manager.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
          }
          return firstValueFromObservable(next.handle());
        },
      );
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

function firstValueFromObservable<T>(obs$: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs$.subscribe({ next: resolve, error: reject });
  });
}
