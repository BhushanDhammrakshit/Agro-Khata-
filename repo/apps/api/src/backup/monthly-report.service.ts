import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MailService, MailAttachment } from '../common/mail/mail.service';
import { buildMonthlyReportEmailHtml } from '../common/mail/monthly-report-email.template';
import { buildExcelBuffer } from '../common/mail/excel-export.util';
import { SUPERADMIN_CONNECTION } from '../superadmin/superadmin-database.module';

interface TenantRow {
  id: string;
  name: string;
  contact_email: string | null;
}

/**
 * Monthly transactions/invoices summary emailed to each tenant's owner.
 * Uses the superadmin (BYPASSRLS) connection to query across tenants
 * outside of any HTTP request/tenant context, then reuses MailService.
 */
@Injectable()
export class MonthlyReportService {
  private readonly logger = new Logger(MonthlyReportService.name);

  constructor(
    @InjectDataSource(SUPERADMIN_CONNECTION) private readonly dataSource: DataSource,
    private readonly mail: MailService,
  ) {}

  // 1st of every month, 6:00 AM server time — reports on the PREVIOUS calendar month.
  @Cron('0 0 6 1 * *')
  async sendMonthlyReports(): Promise<void> {
    const tenants: TenantRow[] = await this.dataSource.query(
      `SELECT id, name, contact_email FROM tenants`,
    );
    const { from, to, label } = previousMonthRange();

    for (const tenant of tenants) {
      try {
        await this.sendReportForTenant(tenant, from, to, label);
      } catch (err) {
        this.logger.error(`Monthly report failed for tenant ${tenant.id}: ${(err as Error).message}`);
      }
    }
  }

  private async sendReportForTenant(
    tenant: TenantRow,
    from: string,
    to: string,
    label: string,
  ): Promise<void> {
    const ownerEmail = tenant.contact_email ?? (await this.findOwnerEmail(tenant.id));
    if (!ownerEmail) {
      this.logger.warn(`No owner email for tenant ${tenant.id} (${tenant.name}) — skipping monthly report.`);
      return;
    }

    const [[sales], [purchases], [expenses], [transactions], [receivable], [payable]] = await Promise.all([
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS count FROM sales_invoices
         WHERE tenant_id=$1 AND status!='cancelled' AND invoice_date BETWEEN $2 AND $3`,
        [tenant.id, from, to],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS count FROM purchase_invoices
         WHERE tenant_id=$1 AND status!='cancelled' AND invoice_date BETWEEN $2 AND $3`,
        [tenant.id, from, to],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM expenses
         WHERE tenant_id=$1 AND expense_date BETWEEN $2 AND $3`,
        [tenant.id, from, to],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM transactions
         WHERE tenant_id=$1 AND transaction_date BETWEEN $2 AND $3`,
        [tenant.id, from, to],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(balance_amount),0) AS total FROM sales_invoices
         WHERE tenant_id=$1 AND status NOT IN ('paid','cancelled')`,
        [tenant.id],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(balance_amount),0) AS total FROM purchase_invoices
         WHERE tenant_id=$1 AND status NOT IN ('paid','cancelled')`,
        [tenant.id],
      ),
    ]);

    const html = buildMonthlyReportEmailHtml({
      tenantName: tenant.name,
      periodLabel: label,
      sales: { total: sales.total, count: Number(sales.count) },
      purchases: { total: purchases.total, count: Number(purchases.count) },
      expenses: { total: expenses.total, count: Number(expenses.count) },
      transactions: { total: transactions.total, count: Number(transactions.count) },
      totalReceivable: receivable.total,
      totalPayable: payable.total,
    });

    const attachments = await this.buildAttachments(tenant.id, from, to);

    await this.mail.send({
      to: ownerEmail,
      subject: `${tenant.name} — Monthly Summary (${label})`,
      html,
      text:
        `Monthly summary for ${label} — ${tenant.name}\n` +
        `Sales: ${sales.total} (${sales.count} invoices)\n` +
        `Purchases: ${purchases.total} (${purchases.count} invoices)\n` +
        `Expenses: ${expenses.total} (${expenses.count} entries)\n` +
        `Transactions: ${transactions.total} (${transactions.count} entries)\n` +
        `Outstanding receivable: ${receivable.total}\n` +
        `Outstanding payable: ${payable.total}`,
      attachments,
    });
  }

  // Detail-level Excel exports (one workbook per category) attached alongside the summary email.
  private async buildAttachments(tenantId: string, from: string, to: string): Promise<MailAttachment[]> {
    const [transactionRows, salesRows, purchaseRows, expenseRows] = await Promise.all([
      this.dataSource.query(
        `SELECT transaction_date, payer_name, payee_name, bank_name, payment_mode, amount, remark
         FROM transactions WHERE tenant_id=$1 AND transaction_date BETWEEN $2 AND $3
         ORDER BY transaction_date ASC`,
        [tenantId, from, to],
      ),
      this.dataSource.query(
        `SELECT si.invoice_no, si.invoice_date, p.name AS party_name, si.total_amount, si.paid_amount,
                si.balance_amount, si.status
         FROM sales_invoices si LEFT JOIN parties p ON p.id=si.party_id
         WHERE si.tenant_id=$1 AND si.invoice_date BETWEEN $2 AND $3
         ORDER BY si.invoice_date ASC`,
        [tenantId, from, to],
      ),
      this.dataSource.query(
        `SELECT pi.invoice_no, pi.invoice_date, p.name AS party_name, pi.total_amount, pi.paid_amount,
                pi.balance_amount, pi.status
         FROM purchase_invoices pi LEFT JOIN parties p ON p.id=pi.party_id
         WHERE pi.tenant_id=$1 AND pi.invoice_date BETWEEN $2 AND $3
         ORDER BY pi.invoice_date ASC`,
        [tenantId, from, to],
      ),
      this.dataSource.query(
        `SELECT e.expense_date, e.category, e.description, e.amount, e.payment_mode, v.vehicle_no
         FROM expenses e LEFT JOIN vehicles v ON v.id=e.vehicle_id
         WHERE e.tenant_id=$1 AND e.expense_date BETWEEN $2 AND $3
         ORDER BY e.expense_date ASC`,
        [tenantId, from, to],
      ),
    ]);

    const [transactionsXlsx, salesXlsx, purchasesXlsx, expensesXlsx] = await Promise.all([
      buildExcelBuffer(
        'Transactions',
        [
          { header: 'Date', key: 'transaction_date', width: 14 },
          { header: 'Payer', key: 'payer_name', width: 20 },
          { header: 'Payee', key: 'payee_name', width: 20 },
          { header: 'Bank', key: 'bank_name', width: 18 },
          { header: 'Mode', key: 'payment_mode', width: 12 },
          { header: 'Amount', key: 'amount', width: 14, currency: true },
          { header: 'Remark', key: 'remark', width: 24 },
        ],
        transactionRows,
      ),
      buildExcelBuffer(
        'Sales Invoices',
        [
          { header: 'Invoice No', key: 'invoice_no', width: 16 },
          { header: 'Date', key: 'invoice_date', width: 14 },
          { header: 'Party', key: 'party_name', width: 22 },
          { header: 'Total', key: 'total_amount', width: 14, currency: true },
          { header: 'Paid', key: 'paid_amount', width: 14, currency: true },
          { header: 'Balance', key: 'balance_amount', width: 14, currency: true },
          { header: 'Status', key: 'status', width: 14 },
        ],
        salesRows,
      ),
      buildExcelBuffer(
        'Purchase Invoices',
        [
          { header: 'Invoice No', key: 'invoice_no', width: 16 },
          { header: 'Date', key: 'invoice_date', width: 14 },
          { header: 'Party', key: 'party_name', width: 22 },
          { header: 'Total', key: 'total_amount', width: 14, currency: true },
          { header: 'Paid', key: 'paid_amount', width: 14, currency: true },
          { header: 'Balance', key: 'balance_amount', width: 14, currency: true },
          { header: 'Status', key: 'status', width: 14 },
        ],
        purchaseRows,
      ),
      buildExcelBuffer(
        'Expenses',
        [
          { header: 'Date', key: 'expense_date', width: 14 },
          { header: 'Category', key: 'category', width: 18 },
          { header: 'Description', key: 'description', width: 24 },
          { header: 'Amount', key: 'amount', width: 14, currency: true },
          { header: 'Mode', key: 'payment_mode', width: 12 },
          { header: 'Vehicle', key: 'vehicle_no', width: 14 },
        ],
        expenseRows,
      ),
    ]);

    return [
      { filename: `transactions-${from}-to-${to}.xlsx`, content: transactionsXlsx, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { filename: `sales-invoices-${from}-to-${to}.xlsx`, content: salesXlsx, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { filename: `purchase-invoices-${from}-to-${to}.xlsx`, content: purchasesXlsx, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { filename: `expenses-${from}-to-${to}.xlsx`, content: expensesXlsx, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    ];
  }

  private async findOwnerEmail(tenantId: string): Promise<string | undefined> {
    const rows: { email: string }[] = await this.dataSource.query(
      `SELECT email FROM users WHERE tenant_id=$1 AND role='owner' AND is_active=true
       ORDER BY created_at ASC LIMIT 1`,
      [tenantId],
    );
    return rows[0]?.email;
  }
}

function previousMonthRange(): { from: string; to: string; label: string } {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfPrevMonth = new Date(firstOfThisMonth.getFullYear(), firstOfThisMonth.getMonth() - 1, 1);
  const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const label = firstOfPrevMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return { from: iso(firstOfPrevMonth), to: iso(lastOfPrevMonth), label };
}
