import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Transaction } from '../entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const TRANSACTIONS_PAGE_SIZE = 50;
const TRANSACTION_SUGGESTION_LIMIT = 20;
const SUGGESTION_COLUMNS = new Map([
  ['payerName', 'payerName'],
  ['payeeName', 'payeeName'],
  ['bankName', 'bankName'],
  ['remark', 'remark'],
]);

@Injectable()
export class TransactionsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(page: number) {
    if (!Number.isSafeInteger(page) || page < 1) {
      throw new BadRequestException('Page must be a positive integer.');
    }
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const [rows, total] = await manager.getRepository(Transaction).findAndCount({
      where: { tenantId },
      order: { transactionDate: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * TRANSACTIONS_PAGE_SIZE,
      take: TRANSACTIONS_PAGE_SIZE,
    });
    return { rows, total, page, pageSize: TRANSACTIONS_PAGE_SIZE };
  }

  async suggestions(
    field: string,
    query?: string,
  ): Promise<{ name: string }[]> {
    const column = SUGGESTION_COLUMNS.get(field);
    if (!column) {
      throw new BadRequestException(
        'Unsupported transaction suggestion field.',
      );
    }

    const normalizedQuery = query?.trim() ?? '';
    if (normalizedQuery.length < 2) return [];
    if (normalizedQuery.length > 100) {
      throw new BadRequestException(
        'Suggestion query must be 100 characters or fewer.',
      );
    }

    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const escapedPrefix = `${normalizedQuery.replace(/[!%_]/g, '!$&')}%`;
    return this.tenantContext
      .getManager()
      .getRepository(Transaction)
      .createQueryBuilder('transaction')
      .select(`DISTINCT transaction.${column}`, 'name')
      .where('transaction.tenantId = :tenantId', { tenantId })
      .andWhere(`transaction.${column} IS NOT NULL`)
      .andWhere(`transaction.${column} <> ''`)
      .andWhere(`LOWER(transaction.${column}) LIKE LOWER(:query) ESCAPE '!'`, {
        query: escapedPrefix,
      })
      .orderBy('name', 'ASC')
      .limit(TRANSACTION_SUGGESTION_LIMIT)
      .getRawMany<{ name: string }>();
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
