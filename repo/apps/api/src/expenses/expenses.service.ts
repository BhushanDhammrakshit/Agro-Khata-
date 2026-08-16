import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Expense } from '../entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(): Promise<Expense[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    return manager.getRepository(Expense).find({ where: { tenantId }, order: { expenseDate: 'DESC' } });
  }

  async create(dto: CreateExpenseDto): Promise<Expense> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();

    const expense = await manager.getRepository(Expense).save(
      manager.getRepository(Expense).create({
        tenantId,
        category: dto.category,
        description: dto.description,
        amount: dto.amount.toString(),
        expenseDate: dto.expenseDate,
        paymentMode: dto.paymentMode,
        createdBy: userId,
      }),
    );
    await this.auditLog.record({ action: 'expense.created', entityType: 'expense', entityId: expense.id, after: expense });
    return expense;
  }
}
