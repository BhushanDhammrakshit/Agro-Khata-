const BRAND_COLOR = '#0f3d5c';
const ACCENT_COLOR = '#0d9488';

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatINR(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface MonthlyReportEmailParams {
  tenantName: string;
  periodLabel: string;
  sales: { total: string; count: number };
  purchases: { total: string; count: number };
  expenses: { total: string; count: number };
  transactions: { total: string; count: number };
  totalReceivable: string;
  totalPayable: string;
}

function row(label: string, amount: string, count?: number): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;">
        ${esc(label)}${count !== undefined ? ` <span style="color:#94a3b8;">(${count})</span>` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">
        ${esc(amount)}
      </td>
    </tr>`;
}

export function buildMonthlyReportEmailHtml(params: MonthlyReportEmailParams): string {
  const { tenantName, periodLabel, sales, purchases, expenses, transactions, totalReceivable, totalPayable } = params;
  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f3f7fa;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7fa;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(15,61,92,0.08);">
            <tr>
              <td style="background:${BRAND_COLOR};padding:28px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">VajaBaki</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 4px 0;font-size:20px;color:#0f172a;">Monthly Summary</h1>
                <p style="margin:0 0 24px 0;font-size:14px;color:#64748b;">
                  ${esc(tenantName)} &middot; ${esc(periodLabel)}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${row('Sales', formatINR(sales.total), sales.count)}
                  ${row('Purchases', formatINR(purchases.total), purchases.count)}
                  ${row('Expenses', formatINR(expenses.total), expenses.count)}
                  ${row('Transactions logged', formatINR(transactions.total), transactions.count)}
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#f3f7fa;border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:14px;color:#334155;">Outstanding receivable</td>
                    <td style="padding:14px 16px;font-size:14px;color:${ACCENT_COLOR};font-weight:700;text-align:right;">${formatINR(totalReceivable)}</td>
                  </tr>
                  <tr>
                    <td style="padding:0 16px 14px 16px;font-size:14px;color:#334155;">Outstanding payable</td>
                    <td style="padding:0 16px 14px 16px;font-size:14px;color:#b91c1c;font-weight:700;text-align:right;">${formatINR(totalPayable)}</td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:12px;color:#94a3b8;">
                  This is an automated monthly summary. Sign in to VajaBaki for the full breakdown.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
