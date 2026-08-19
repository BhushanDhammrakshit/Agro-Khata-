import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { Party, PartyType } from '../entities/party.entity';
import { PurchaseInvoice } from '../entities/purchase-invoice.entity';
import { SalesInvoice } from '../entities/sales-invoice.entity';
import { Tenant } from '../entities/tenant.entity';
import { User, UserRole } from '../entities/user.entity';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';

@Injectable()
export class PartiesService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(partyType?: PartyType): Promise<Party[]> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    return manager.getRepository(Party).find({
      where: { tenantId, ...(partyType ? { partyType } : {}) },
      order: { name: 'ASC' },
    });
  }

  async findOneOrThrow(partyId: string): Promise<Party> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const party = await manager.getRepository(Party).findOne({ where: { id: partyId, tenantId } });
    if (!party) {
      throw new NotFoundException('Party not found.');
    }
    return party;
  }

  async getNextNumbers(partyId: string, invoiceType?: 'sales' | 'purchase') {
    const party = await this.findOneOrThrow(partyId);
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const type = invoiceType ?? (party.partyType === PartyType.SUPPLIER ? 'purchase' : 'sales');
    const tenant = type === 'sales'
      ? await manager.getRepository(Tenant).findOne({ where: { id: tenantId }, select: { invoicePrefix: true } })
      : null;
    const prefix = type === 'purchase' ? 'PUR-' : (tenant?.invoicePrefix ?? 'INV-');
    const invoiceRepository = type === 'purchase'
      ? manager.getRepository(PurchaseInvoice)
      : manager.getRepository(SalesInvoice);
    const invoices = await invoiceRepository.find({ where: { tenantId }, select: { invoiceNo: true } });
    const seq = invoices.reduce((max, invoice) => {
      if (!invoice.invoiceNo.startsWith(prefix)) return max;
      const suffix = invoice.invoiceNo.slice(prefix.length);
      return /^\d+$/.test(suffix) ? Math.max(max, parseInt(suffix, 10)) : max;
    }, 0) + 1;
    const poPrefix = party.poPrefix ?? 'PO-';
    const poSeq = parseInt(party.nextPoSeq ?? '1', 10);
    return {
      invoiceNo: `${prefix}${String(seq).padStart(4, '0')}`,
      poNo: `${poPrefix}${String(poSeq).padStart(4, '0')}`,
    };
  }

  private async generateFarmerCode(manager: ReturnType<TenantContextService['getManager']>, tenantId: string): Promise<string> {
    // Find max existing farmer code number for this tenant to derive next sequence
    const rows = await manager.query(
      `SELECT farmer_code FROM parties WHERE tenant_id=$1 AND farmer_code IS NOT NULL`,
      [tenantId],
    );
    let maxNum = 0;
    for (const row of rows) {
      const match = row.farmer_code?.match(/(\d+)$/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
    return `F-${String(maxNum + 1).padStart(4, '0')}`;
  }

  async create(dto: CreatePartyDto): Promise<Party> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();

    const existing = await manager.getRepository(Party).findOne({ where: { tenantId, name: dto.name } });
    if (existing) {
      throw new ConflictException('A party with this name already exists.');
    }

    // Auto-generate farmer code for suppliers; strip any manually supplied value
    const { farmerCode: _ignored, ...rest } = dto;
    const autoFarmerCode = (dto.partyType === PartyType.SUPPLIER || dto.partyType === PartyType.BOTH)
      ? await this.generateFarmerCode(manager, tenantId)
      : undefined;
    const invoicePrefix = dto.invoicePrefix ?? (dto.partyType === PartyType.SUPPLIER ? 'PUR-' : 'INV-');

    const party = await manager.getRepository(Party).save(
      manager.getRepository(Party).create({
        tenantId,
        ...rest,
        invoicePrefix,
        ...(autoFarmerCode ? { farmerCode: autoFarmerCode } : {}),
      }),
    );
    await this.auditLog.record({ action: 'party.created', entityType: 'party', entityId: party.id, after: party });
    return party;
  }

  async update(partyId: string, dto: UpdatePartyDto): Promise<Party> {
    const before = await this.findOneOrThrow(partyId);
    const manager = this.tenantContext.getManager();
    // Strip farmerCode from general updates — use updateFarmerCode for that
    const { creditLimit, farmerCode: _ignored, ...rest } = dto;
    await manager.getRepository(Party).update(partyId, {
      ...rest,
      ...(creditLimit != null ? { creditLimit: creditLimit.toString() } : { creditLimit: undefined }),
    });
    const after = await manager.getRepository(Party).findOneByOrFail({ id: partyId });
    await this.auditLog.record({ action: 'party.updated', entityType: 'party', entityId: partyId, before, after });
    return after;
  }

  async updateFarmerCode(partyId: string, farmerCode: string): Promise<Party> {
    const manager = this.tenantContext.getManager();
    const tenantId = this.tenantContext.getTenantIdOrThrow();
    const userId = this.tenantContext.getUserId();
    // Verify caller is an owner
    if (userId) {
      const user = await manager.getRepository(User).findOne({ where: { id: userId, tenantId } });
      if (user && user.role !== UserRole.OWNER) {
        throw new ForbiddenException('Only owners can edit the farmer code.');
      }
    }
    const before = await this.findOneOrThrow(partyId);
    await manager.getRepository(Party).update(partyId, { farmerCode });
    const after = await manager.getRepository(Party).findOneByOrFail({ id: partyId });
    await this.auditLog.record({ action: 'party.farmer_code_updated', entityType: 'party', entityId: partyId, before: { farmerCode: before.farmerCode }, after: { farmerCode } });
    return after;
  }
}
