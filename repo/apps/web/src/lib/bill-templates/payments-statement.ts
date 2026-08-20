import type { PurchasePaymentInvoiceRow, TenantSummary } from "@/lib/api";
import { dmy, esc, num } from "./common";

export const PAYMENTS_STATEMENT_CSS = `
.kag-payments-stmt { width: 100%; font-family: Arial, "Liberation Sans", "Helvetica Neue", Helvetica, sans-serif; font-size: 11.5px; line-height: 1.5; color: #1a1a1a; }
.kag-payments-stmt table { border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #b6c6d2; }
.kag-payments-stmt td, .kag-payments-stmt th { border: 1px solid #b6c6d2; padding: 6px 8px; vertical-align: top; overflow-wrap: break-word; }
.kag-payments-stmt .band { background: #0f3d5c; color: #ffffff; border-color: #0f3d5c; padding: 12px 14px; vertical-align: middle; }
.kag-payments-stmt .band-co { font-size: 16px; font-weight: bold; line-height: 1.3; }
.kag-payments-stmt .band-sub { font-size: 9.5px; color: #cfe3ef; line-height: 1.5; padding-top: 3px; }
.kag-payments-stmt .band-doc { font-size: 17px; font-weight: bold; letter-spacing: 2px; }
.kag-payments-stmt .band-no { font-size: 11.5px; color: #cfe3ef; padding-top: 3px; }
.kag-payments-stmt .strip td { background: #eef4f8; height: 32px; padding: 6px 8px 5px; }
.kag-payments-stmt .k { font-size: 8.5px; text-transform: uppercase; letter-spacing: .5px; color: #0f3d5c; font-weight: bold; }
.kag-payments-stmt .v { padding-top: 2px; }
.kag-payments-stmt th.ih { background: #0f3d5c; color: #ffffff; border-color: #0f3d5c; font-size: 9.5px; text-transform: uppercase; letter-spacing: .4px; font-weight: bold; padding: 7px 8px; vertical-align: middle; }
.kag-payments-stmt .item td { height: 22px; padding: 6px 8px 5px; }
.kag-payments-stmt .alt td { background: #f3f7fa; }
.kag-payments-stmt .inv-hdr td { background: #dfeaf1; font-weight: bold; padding: 6px 8px; }
.kag-payments-stmt .pay-row td { padding: 4px 8px 4px 20px; font-size: 10.5px; color: #3a4a55; }
.kag-payments-stmt .sum td { height: 20px; padding: 5px 8px 4px; }
.kag-payments-stmt .grand td { background: #0f3d5c; color: #ffffff; border-color: #0f3d5c; font-weight: bold; font-size: 13px; padding: 7px 8px; }
.kag-payments-stmt .due td { background: #f7e6e2; color: #7a2c1c; font-weight: bold; font-size: 12.5px; padding: 7px 8px; }
.kag-payments-stmt .paid-badge { color: #1a7a3c; font-weight: bold; }
.kag-payments-stmt .balance-badge { color: #7a2c1c; font-weight: bold; }
.kag-payments-stmt .fine td { background: #eef4f8; text-align: center; font-size: 9px; color: #4b5f6d; padding: 5px 8px; }
.kag-payments-stmt .c { text-align: center; }
.kag-payments-stmt .r { text-align: right; }
.kag-payments-stmt .b { font-weight: bold; }
`;

function invoiceStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Every invoice in the date range, each with its own payment history — shows what's paid, what's not, and what remains. */
function buildInvoiceWiseRows(invoices: PurchasePaymentInvoiceRow[], showSupplier: boolean): { rowsHtml: string; totalInvoiced: number; totalPaid: number; totalBalance: number } {
  let totalInvoiced = 0, totalPaid = 0, totalBalance = 0;

  const rowsHtml = invoices
    .map((inv) => {
      const total = parseFloat(inv.total_amount);
      const paid = parseFloat(inv.paid_amount);
      const balance = parseFloat(inv.balance_amount);
      totalInvoiced += total;
      totalPaid += paid;
      totalBalance += balance;

      const paymentRows = (inv.payments ?? [])
        .map(
          (p) => `
        <tr class="pay-row">
          <td colspan="2">Paid ${dmy(p.paidDate)}</td>
          <td>${esc(p.paymentMode.replace(/_/g, " "))}</td>
          <td colspan="2">Ref: ${esc(p.referenceNo) || "&mdash;"}</td>
          <td colspan="2" class="r">${num(p.amount)}</td>
        </tr>`,
        )
        .join("");

      const supplierLabel = showSupplier ? ` &nbsp;<span style="font-weight:normal;">— ${esc(inv.party_name)}</span>` : "";

      return `
      <tr class="inv-hdr">
        <td colspan="2">${esc(inv.invoice_no)} &nbsp;<span style="font-weight:normal;">(${dmy(inv.invoice_date)})</span>${supplierLabel}</td>
        <td colspan="2">${esc(invoiceStatusLabel(inv.status))}</td>
        <td class="r">Total: ${num(total)}</td>
        <td class="r paid-badge">Paid: ${num(paid)}</td>
        <td class="r balance-badge">${balance > 0 ? `Balance: ${num(balance)}` : "Fully Paid"}</td>
      </tr>
      ${paymentRows || `<tr class="pay-row"><td colspan="7">No payments recorded yet</td></tr>`}`;
    })
    .join("");

  return { rowsHtml, totalInvoiced, totalPaid, totalBalance };
}

export function buildPaymentsStatementBody(
  invoices: PurchasePaymentInvoiceRow[],
  tenant: TenantSummary,
  partyName: string | undefined,
  from: string,
  to: string,
): string {
  const vendorName = tenant.legalName || tenant.name;
  const perSupplier = !!partyName;

  const bandSub = [
    tenant.address ? esc(tenant.address) : "",
    tenant.contactPhone ? "Ph: " + esc(tenant.contactPhone) : "",
    tenant.contactEmail ? esc(tenant.contactEmail) : "",
    tenant.gstin ? "GSTIN: " + esc(tenant.gstin) : tenant.pan ? "PAN: " + esc(tenant.pan) : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;|&nbsp; ");

  const { rowsHtml, totalInvoiced, totalPaid, totalBalance } = buildInvoiceWiseRows(invoices, !perSupplier);
  const body = `
    <tr>
      <th class="ih" style="text-align:left;" colspan="2">Invoice</th>
      <th class="ih" colspan="2">Status</th>
      <th class="ih r">Total</th>
      <th class="ih r">Paid</th>
      <th class="ih r">Balance</th>
    </tr>
    ${rowsHtml || `<tr class="item"><td colspan="7" class="c">No invoices in this period</td></tr>`}`;
  const totalsHtml = `
    <tr class="sum">
      <td colspan="4" class="r b">Total Invoiced (this period)</td>
      <td colspan="3" class="r b">${num(totalInvoiced)}</td>
    </tr>
    <tr class="sum">
      <td colspan="4" class="r b">Total Paid</td>
      <td colspan="3" class="r b">${num(totalPaid)}</td>
    </tr>
    <tr class="due">
      <td colspan="4" class="r">Remaining / Outstanding Balance</td>
      <td colspan="3" class="r">&#8377; ${num(totalBalance)}</td>
    </tr>`;

  return `<div class="kag-payments-stmt"><table><colgroup>
    <col style="width:16%" /><col style="width:16%" /><col style="width:16%" /><col style="width:16%" /><col style="width:12%" /><col style="width:12%" /><col style="width:12%" />
  </colgroup><tbody>

    <tr>
      <td class="band" colspan="5">
        <div class="band-co">${esc(vendorName)}</div>
        <div class="band-sub">${bandSub}</div>
      </td>
      <td class="band r" colspan="2">
        <div class="band-doc">PAYMENT STATEMENT</div>
        <div class="band-no">Purchase Payments</div>
      </td>
    </tr>

    <tr class="strip">
      <td colspan="3"><div class="k">Period</div><div class="v b">${dmy(from)} to ${dmy(to)}</div></td>
      <td colspan="4"><div class="k">Supplier</div><div class="v b">${esc(partyName) || "All Suppliers"}</div></td>
    </tr>

    ${body}
    ${totalsHtml}

    <tr class="fine"><td colspan="7">This is a computer generated statement.</td></tr>

  </tbody></table></div>`;
}

export function buildPaymentsStatementHtml(
  invoices: PurchasePaymentInvoiceRow[],
  tenant: TenantSummary,
  partyName: string | undefined,
  from: string,
  to: string,
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payment Statement - ${dmy(from)} to ${dmy(to)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${PAYMENTS_STATEMENT_CSS}
  </style>
</head>
<body>${buildPaymentsStatementBody(invoices, tenant, partyName, from, to)}</body>
</html>`;
}
