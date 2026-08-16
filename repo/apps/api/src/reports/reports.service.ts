import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';

@Injectable()
export class ReportsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async getDashboardKpis() {
    const mgr = this.tenantContext.getManager();
    const tid = this.tenantContext.getTenantIdOrThrow();

    const [receivable, payable, salesMonth, purchasesMonth, expensesMonth, lowStock] =
      await Promise.all([
        mgr.query(
          `SELECT COALESCE(SUM(balance_amount),0) AS total FROM sales_invoices
           WHERE tenant_id=$1 AND status NOT IN ('paid','cancelled')`, [tid]),
        mgr.query(
          `SELECT COALESCE(SUM(balance_amount),0) AS total FROM purchase_invoices
           WHERE tenant_id=$1 AND status NOT IN ('paid','cancelled')`, [tid]),
        mgr.query(
          `SELECT COALESCE(SUM(total_amount),0) AS total FROM sales_invoices
           WHERE tenant_id=$1 AND status!='cancelled'
           AND invoice_date>=date_trunc('month',CURRENT_DATE)`, [tid]),
        mgr.query(
          `SELECT COALESCE(SUM(total_amount),0) AS total FROM purchase_invoices
           WHERE tenant_id=$1 AND status!='cancelled'
           AND invoice_date>=date_trunc('month',CURRENT_DATE)`, [tid]),
        mgr.query(
          `SELECT COALESCE(SUM(amount),0) AS total FROM expenses
           WHERE tenant_id=$1
           AND expense_date>=date_trunc('month',CURRENT_DATE)`, [tid]),
        mgr.query(
          `SELECT COUNT(*) AS cnt FROM items
           WHERE tenant_id=$1 AND is_active=true
           AND low_stock_alert_qty IS NOT NULL
           AND current_stock<=low_stock_alert_qty`, [tid]),
      ]);

    return {
      totalReceivable: receivable[0].total,
      totalPayable: payable[0].total,
      salesThisMonth: salesMonth[0].total,
      purchasesThisMonth: purchasesMonth[0].total,
      expensesThisMonth: expensesMonth[0].total,
      lowStockCount: parseInt(lowStock[0].cnt, 10),
    };
  }

  async getSalesReport(from?: string, to?: string, partyId?: string) {
    const mgr = this.tenantContext.getManager();
    const tid = this.tenantContext.getTenantIdOrThrow();
    const params: unknown[] = [tid];
    let where = 'si.tenant_id=$1 AND si.status!=\'cancelled\'';
    if (from) { params.push(from); where += ` AND si.invoice_date>=$${params.length}`; }
    if (to)   { params.push(to);   where += ` AND si.invoice_date<=$${params.length}`; }
    if (partyId) { params.push(partyId); where += ` AND si.party_id=$${params.length}`; }

    return mgr.query(
      `SELECT si.id, si.invoice_no, si.invoice_date, si.due_date, si.status,
              p.name AS party_name, si.total_amount, si.paid_amount, si.balance_amount,
              si.is_gst_invoice
       FROM sales_invoices si
       LEFT JOIN parties p ON p.id=si.party_id
       WHERE ${where}
       ORDER BY si.invoice_date DESC, si.invoice_no DESC`,
      params,
    );
  }

  async getPurchasesReport(from?: string, to?: string, partyId?: string) {
    const mgr = this.tenantContext.getManager();
    const tid = this.tenantContext.getTenantIdOrThrow();
    const params: unknown[] = [tid];
    let where = 'pi.tenant_id=$1 AND pi.status!=\'cancelled\'';
    if (from) { params.push(from); where += ` AND pi.invoice_date>=$${params.length}`; }
    if (to)   { params.push(to);   where += ` AND pi.invoice_date<=$${params.length}`; }
    if (partyId) { params.push(partyId); where += ` AND pi.party_id=$${params.length}`; }

    return mgr.query(
      `SELECT pi.id, pi.invoice_no, pi.invoice_date, pi.due_date, pi.status,
              p.name AS party_name, pi.total_amount, pi.paid_amount, pi.balance_amount,
              pi.is_gst_invoice
       FROM purchase_invoices pi
       LEFT JOIN parties p ON p.id=pi.party_id
       WHERE ${where}
       ORDER BY pi.invoice_date DESC, pi.invoice_no DESC`,
      params,
    );
  }

  async getStockSummary() {
    const mgr = this.tenantContext.getManager();
    const tid = this.tenantContext.getTenantIdOrThrow();
    return mgr.query(
      `SELECT id, name, uom, current_stock, opening_stock,
              sale_price, default_rate, low_stock_alert_qty,
              CASE WHEN low_stock_alert_qty IS NOT NULL AND current_stock<=low_stock_alert_qty
                   THEN true ELSE false END AS is_low_stock
       FROM items
       WHERE tenant_id=$1 AND is_active=true
       ORDER BY name ASC`,
      [tid],
    );
  }

  async getOutstandingReport(type: 'receivable' | 'payable') {
    const mgr = this.tenantContext.getManager();
    const tid = this.tenantContext.getTenantIdOrThrow();
    const table = type === 'receivable' ? 'sales_invoices' : 'purchase_invoices';
    return mgr.query(
      `SELECT i.id, i.invoice_no, i.invoice_date, i.due_date, i.status,
              p.name AS party_name, i.total_amount, i.paid_amount, i.balance_amount,
              CASE WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' THEN true ELSE false END AS is_overdue
       FROM ${table} i
       LEFT JOIN parties p ON p.id=i.party_id
       WHERE i.tenant_id=$1 AND i.status IN ('sent','partially_paid','overdue','draft')
       ORDER BY i.due_date ASC NULLS LAST, i.invoice_date DESC`,
      [tid],
    );
  }

  async getProfitLoss(from?: string, to?: string) {
    const mgr = this.tenantContext.getManager();
    const tid = this.tenantContext.getTenantIdOrThrow();
    const params: unknown[] = [tid];
    let salesWhere = 'tenant_id=$1 AND status!=\'cancelled\'';
    let purchasesWhere = 'tenant_id=$1 AND status!=\'cancelled\'';
    let expensesWhere = 'tenant_id=$1';
    if (from) {
      params.push(from);
      const n = params.length;
      salesWhere     += ` AND invoice_date>=$${n}`;
      purchasesWhere += ` AND invoice_date>=$${n}`;
      expensesWhere  += ` AND expense_date>=$${n}`;
    }
    if (to) {
      params.push(to);
      const n = params.length;
      salesWhere     += ` AND invoice_date<=$${n}`;
      purchasesWhere += ` AND invoice_date<=$${n}`;
      expensesWhere  += ` AND expense_date<=$${n}`;
    }
    const [sales, purchases, expenses] = await Promise.all([
      mgr.query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM sales_invoices WHERE ${salesWhere}`, params),
      mgr.query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM purchase_invoices WHERE ${purchasesWhere}`, params),
      mgr.query(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE ${expensesWhere}`, params),
    ]);
    const revenue   = parseFloat(sales[0].total);
    const cogs      = parseFloat(purchases[0].total);
    const expTotal  = parseFloat(expenses[0].total);
    return {
      revenue,
      costOfGoods: cogs,
      grossProfit: revenue - cogs,
      expenses: expTotal,
      netProfit: revenue - cogs - expTotal,
    };
  }

  async getExpensesReport(from?: string, to?: string) {
    const mgr = this.tenantContext.getManager();
    const tid = this.tenantContext.getTenantIdOrThrow();
    const params: unknown[] = [tid];
    let where = 'tenant_id=$1';
    if (from) { params.push(from); where += ` AND expense_date>=$${params.length}`; }
    if (to)   { params.push(to);   where += ` AND expense_date<=$${params.length}`; }

    const [rows, categoryTotals] = await Promise.all([
      mgr.query(
        `SELECT id, category, description, amount, expense_date, payment_mode, created_at
         FROM expenses WHERE ${where}
         ORDER BY expense_date DESC, created_at DESC`,
        params,
      ),
      mgr.query(
        `SELECT category, SUM(amount) AS total
         FROM expenses WHERE ${where}
         GROUP BY category ORDER BY total DESC`,
        params,
      ),
    ]);
    return { rows, categoryTotals };
  }

  async getPartyLedger(partyId: string) {
    const mgr = this.tenantContext.getManager();
    const tid = this.tenantContext.getTenantIdOrThrow();

    // Party must belong to this tenant
    const party = await mgr.query(
      `SELECT * FROM parties WHERE id=$1 AND tenant_id=$2`, [partyId, tid]);
    if (!party.length) return null;

    // Combine sales invoices, purchase invoices and their payments into a unified ledger
    const rows = await mgr.query(
      `WITH ledger AS (
        -- Sales invoices: debit to party (party owes us)
        SELECT id, invoice_no AS ref_no, invoice_date AS txn_date,
               'sales_invoice' AS txn_type, total_amount AS debit, 0 AS credit, status
        FROM sales_invoices
        WHERE tenant_id=$2 AND party_id=$1 AND status!='cancelled'

        UNION ALL
        -- Sales payments: credit (party paid us)
        SELECT sip.id, si.invoice_no AS ref_no, sip.paid_date AS txn_date,
               'sales_payment' AS txn_type, 0 AS debit, sip.amount AS credit, NULL
        FROM sales_invoice_payments sip
        JOIN sales_invoices si ON si.id=sip.sales_invoice_id
        WHERE si.tenant_id=$2 AND si.party_id=$1

        UNION ALL
        -- Purchase invoices: credit (we owe party)
        SELECT id, invoice_no AS ref_no, invoice_date AS txn_date,
               'purchase_invoice' AS txn_type, 0 AS debit, total_amount AS credit, status
        FROM purchase_invoices
        WHERE tenant_id=$2 AND party_id=$1 AND status!='cancelled'

        UNION ALL
        -- Purchase payments: debit (we paid party)
        SELECT pip.id, pi.invoice_no AS ref_no, pip.paid_date AS txn_date,
               'purchase_payment' AS txn_type, pip.amount AS debit, 0 AS credit, NULL
        FROM purchase_invoice_payments pip
        JOIN purchase_invoices pi ON pi.id=pip.purchase_invoice_id
        WHERE pi.tenant_id=$2 AND pi.party_id=$1
      )
      SELECT *, SUM(debit - credit) OVER (ORDER BY txn_date, txn_type) AS running_balance
      FROM ledger
      ORDER BY txn_date ASC, txn_type ASC`,
      [partyId, tid],
    );

    const closingBalance = rows.length
      ? parseFloat(rows[rows.length - 1].running_balance)
      : parseFloat(party[0].opening_balance ?? '0');

    return { party: party[0], transactions: rows, closingBalance };
  }
}
