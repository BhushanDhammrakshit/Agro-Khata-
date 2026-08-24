import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Transaction } from '../entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(): Promise<Transaction[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    return manager.getRepository(Transaction).find({
      where: { tenantId },
      order: { transactionDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();

    const transaction = await manager.getRepository(Transaction).save(
      manager.getRepository(Transaction).create({
        tenantId,
        transactionDate: dto.transactionDate,
        payerName: dto.payerName,
        payeeName: dto.payeeName,
        bankName: dto.bankName,
        paymentMode: dto.paymentMode,
        amount: dto.amount.toString(),
        remark: dto.remark,
        createdBy: userId,
      }),
    );
    await this.auditLog.record({ action: 'transaction.created', entityType: 'transaction', entityId: transaction.id, after: transaction });
    return transaction;
  }

  async update(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const repository = manager.getRepository(Transaction);
    const before = await repository.findOne({ where: { id, tenantId } });
    if (!before) throw new NotFoundException('Transaction not found.');

    const changes = {
      ...dto,
      amount: dto.amount === undefined ? undefined : dto.amount.toString(),
    };
    await repository.update({ id, tenantId }, changes);
    const after = await repository.findOneOrFail({ where: { id, tenantId } });
    await this.auditLog.record({ action: 'transaction.updated', entityType: 'transaction', entityId: id, before, after });
    return after;
  }

  async remove(id: string): Promise<{ id: string }> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const repository = manager.getRepository(Transaction);
    const before = await repository.findOne({ where: { id, tenantId } });
    if (!before) throw new NotFoundException('Transaction not found.');
    await repository.delete({ id, tenantId });
    await this.auditLog.record({ action: 'transaction.deleted', entityType: 'transaction', entityId: id, before });
    return { id };
  }
}
