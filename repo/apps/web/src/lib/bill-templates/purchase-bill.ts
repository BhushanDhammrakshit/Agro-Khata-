import type { Invoice, Party, TenantSummary } from "@/lib/api";

function toWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function cvt(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " and " + cvt(num % 100) : "");
    if (num < 100000) return cvt(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + cvt(num % 1000) : "");
    if (num < 10000000) return cvt(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + cvt(num % 100000) : "");
    return cvt(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + cvt(num % 10000000) : "");
  }
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  return cvt(rupees) + " Rupees" + (paise > 0 ? " and " + cvt(paise) + " Paise" : "") + " only";
}

function fmt(v: string | number) {
  return "₹ " + parseFloat(String(v)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const PURCHASE_BILL_CSS = `
.kag-purchase-bill { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #000; max-width: 820px; margin: 0 auto; padding: 0 8px; }
.kag-purchase-bill table { border-collapse: collapse; width: 100%; table-layout: fixed; }
.kag-purchase-bill td, .kag-purchase-bill th { border: 1px solid #000; padding: 3px 6px; vertical-align: top; overflow-wrap: break-word; }
`;

export function buildPurchaseBillBody(invoice: Invoice, tenant: TenantSummary, party: Party): string {
  const totalQty   = invoice.items?.reduce((s, i) => s + parseFloat(i.qty), 0) ?? 0;
  const totalValue = parseFloat(invoice.totalAmount);
  const paidAmt    = parseFloat(invoice.paidAmount);
  const balance    = parseFloat(invoice.balanceAmount);
  const paymentMode = invoice.payments?.[0]?.paymentMode
    ? invoice.payments[0].paymentMode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Credit";

  const logoHtml = tenant.logoUrl
    ? `<img src="${tenant.logoUrl}" crossorigin="anonymous" style="max-height:64px;max-width:84px;object-fit:contain;" />`
    : `<div style="height:64px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;">Logo</div>`;

  const sigHtml = tenant.signatureUrl
    ? `<img src="${tenant.signatureUrl}" crossorigin="anonymous" style="max-height:64px;max-width:160px;object-fit:contain;display:block;margin:0 auto 4px;" />`
    : `<div style="height:52px;"></div>`;

  const itemRows = (invoice.items ?? []).map((item, i) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td style="font-weight:bold;">${item.itemName}</td>
      <td style="text-align:center;"></td>
      <td style="text-align:right;">${parseFloat(item.qty).toLocaleString("en-IN")}</td>
      <td style="text-align:right;">₹ ${parseFloat(item.rate).toFixed(2)}</td>
      <td style="text-align:right;">₹ ${parseFloat(item.lineTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
    </tr>`).join("");

  return `<div class="kag-purchase-bill">

    <!-- A single table (not several stacked <table> elements glued together with border-top:none)
         — html2canvas misaligns borders/text across separately-measured adjacent tables. -->
    <table><colgroup>
      <col style="width:13%" /><col style="width:32%" /><col style="width:11%" />
      <col style="width:10%" /><col style="width:17%" /><col style="width:17%" />
    </colgroup><tbody>

      <tr><td colspan="6" style="text-align:center;font-weight:bold;font-size:15px;padding:5px;">Bill</td></tr>

      <tr>
        <td style="text-align:center;vertical-align:middle;padding:4px;">${logoHtml}</td>
        <td colspan="3" style="padding:5px 8px;">
          <div style="font-weight:bold;font-size:13px;">${tenant.legalName || tenant.name}</div>
          ${tenant.address ? `<div>${tenant.address}</div>` : ""}
          <div>${tenant.contactPhone ? `<strong>Phone:</strong> ${tenant.contactPhone}&nbsp;&nbsp;` : ""}${tenant.contactEmail ? `<strong>Email:</strong> ${tenant.contactEmail}` : ""}</div>
          ${tenant.gstin ? `<div><strong>State:</strong> 27-Maharashtra</div>` : ""}
        </td>
        <td colspan="2" style="padding:5px 8px;">
          <div><strong>Date: </strong><strong>${invoice.invoiceDate}</strong></div>
          ${invoice.placeOfSupply ? `<div><strong>Place of Supply: </strong><strong>${invoice.placeOfSupply}</strong></div>` : ""}
        </td>
      </tr>

      <tr><td colspan="6" style="padding:5px 8px;">
        <div><strong>Bill From:</strong></div>
        <div style="font-weight:bold;font-size:12px;">${party.name}</div>
        ${party.address ? `<div>${party.address}</div>` : ""}
        ${party.gstin ? `<div><strong>GSTIN:</strong> ${party.gstin}</div>` : ""}
      </td></tr>

      <tr>
        <th style="text-align:center;">#</th>
        <th style="text-align:left;">Item name</th>
        <th style="text-align:center;">HSN/ SAC</th>
        <th style="text-align:right;">Quantity</th>
        <th style="text-align:right;">Price/ Unit (₹)</th>
        <th style="text-align:right;">Amount(₹)</th>
      </tr>
      ${itemRows}
      <tr>
        <td style="border:none;"></td><td style="border:none;"></td><td style="border:none;"></td>
        <td style="text-align:right;font-weight:bold;">${totalQty.toLocaleString("en-IN")}</td>
        <td style="border:none;"></td>
        <td style="text-align:right;font-weight:bold;">₹ ${totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>

      <tr>
        <td colspan="2"><strong>Sub Total: ${fmt(invoice.subTotal)}</strong></td>
        <td colspan="4"><strong>Total: ${fmt(totalValue)}(${toWords(totalValue)})</strong></td>
      </tr>
      <tr>
        <td colspan="2"><strong>Paid: ${fmt(paidAmt)}</strong></td>
        <td colspan="4"><strong>Balance: ${fmt(balance)}</strong></td>
      </tr>

      <tr><td colspan="6"><strong>Payment Mode: ${paymentMode}</strong></td></tr>

      <tr>
        <td colspan="3" style="padding:6px 8px;">
          <div style="font-weight:bold;">Terms And Conditions:</div>
          <div style="margin-top:4px;font-size:10px;">${tenant.termsConditions ?? ""}</div>
        </td>
        <td colspan="3" style="text-align:center;vertical-align:bottom;padding:6px 8px;">
          <div style="font-weight:bold;margin-bottom:8px;">For ${tenant.legalName || tenant.name}:</div>
          ${sigHtml}
          <div style="border-top:1px solid #000;padding-top:3px;font-size:10px;">Authorized Signatory</div>
        </td>
      </tr>

    </tbody></table>

  </div>`;
}

export function buildPurchaseBillHtml(invoice: Invoice, tenant: TenantSummary, party: Party): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill - ${invoice.invoiceNo}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${PURCHASE_BILL_CSS}
  </style>
</head>
<body>${buildPurchaseBillBody(invoice, tenant, party)}</body>
</html>`;
}
