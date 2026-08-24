import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Expense } from '../entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(vehicleId?: string): Promise<Expense[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    return manager.getRepository(Expense).find({
      where: { tenantId, ...(vehicleId ? { vehicleId } : {}) },
      order: { expenseDate: 'DESC' },
    });
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
        vehicleId: dto.vehicleId,
        createdBy: userId,
      }),
    );
    await this.auditLog.record({ action: 'expense.created', entityType: 'expense', entityId: expense.id, after: expense });
    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const repository = manager.getRepository(Expense);
    const before = await repository.findOne({ where: { id, tenantId } });
    if (!before) throw new NotFoundException('Expense not found.');

    const changes = {
      ...dto,
      amount: dto.amount === undefined ? undefined : dto.amount.toString(),
    };
    await repository.update({ id, tenantId }, changes);
    const after = await repository.findOneOrFail({ where: { id, tenantId } });
    await this.auditLog.record({ action: 'expense.updated', entityType: 'expense', entityId: id, before, after });
    return after;
  }

  async remove(id: string): Promise<{ id: string }> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const repository = manager.getRepository(Expense);
    const before = await repository.findOne({ where: { id, tenantId } });
    if (!before) throw new NotFoundException('Expense not found.');
    await repository.delete({ id, tenantId });
    await this.auditLog.record({ action: 'expense.deleted', entityType: 'expense', entityId: id, before });
    return { id };
  }
}
