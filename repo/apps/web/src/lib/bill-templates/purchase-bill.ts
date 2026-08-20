import type { Invoice, Party, TenantSummary } from "@/lib/api";
import { amountInWords, dmy, esc, num } from "./common";

export const PURCHASE_BILL_CSS = `
.kag-purchase-bill { width: 100%; font-family: Arial, "Liberation Sans", "Helvetica Neue", Helvetica, sans-serif; font-size: 11.5px; line-height: 1.5; color: #1a1a1a; }
.kag-purchase-bill table { border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #b6c6d2; }
.kag-purchase-bill td, .kag-purchase-bill th { border: 1px solid #b6c6d2; padding: 6px 8px; vertical-align: top; overflow-wrap: break-word; }
.kag-purchase-bill .band { background: #0f3d5c; color: #ffffff; border-color: #0f3d5c; padding: 12px 14px; vertical-align: middle; }
.kag-purchase-bill .band-logo { overflow: hidden; }
.kag-purchase-bill .band-co { font-size: 16px; font-weight: bold; line-height: 1.3; }
.kag-purchase-bill .band-sub { font-size: 9.5px; color: #cfe3ef; line-height: 1.5; padding-top: 3px; }
.kag-purchase-bill .band-doc { font-size: 17px; font-weight: bold; letter-spacing: 2px; }
.kag-purchase-bill .band-no { font-size: 11.5px; color: #cfe3ef; padding-top: 3px; }
.kag-purchase-bill .strip td { background: #eef4f8; height: 32px; padding: 6px 8px 5px; }
.kag-purchase-bill .k { font-size: 8.5px; text-transform: uppercase; letter-spacing: .5px; color: #0f3d5c; font-weight: bold; }
.kag-purchase-bill .v { padding-top: 2px; }
.kag-purchase-bill .party td { height: 72px; }
.kag-purchase-bill .party .nm { font-weight: bold; font-size: 12.5px; padding-top: 3px; }
.kag-purchase-bill th.ih { background: #0f3d5c; color: #ffffff; border-color: #0f3d5c; font-size: 9.5px; text-transform: uppercase; letter-spacing: .4px; font-weight: bold; padding: 7px 8px; vertical-align: middle; }
.kag-purchase-bill .item td { height: 22px; padding: 6px 8px 5px; }
.kag-purchase-bill .alt td { background: #f3f7fa; }
.kag-purchase-bill .tot td { background: #dfeaf1; font-weight: bold; height: 22px; }
.kag-purchase-bill .sum td { height: 20px; padding: 5px 8px 4px; }
.kag-purchase-bill .grand td { background: #0f3d5c; color: #ffffff; border-color: #0f3d5c; font-weight: bold; font-size: 13px; padding: 7px 8px; }
.kag-purchase-bill .words td { background: #eef4f8; }
.kag-purchase-bill .sign td { height: 84px; }
.kag-purchase-bill .fine td { background: #eef4f8; text-align: center; font-size: 9px; color: #4b5f6d; padding: 5px 8px; }
.kag-purchase-bill .c { text-align: center; }
.kag-purchase-bill .r { text-align: right; }
.kag-purchase-bill .b { font-weight: bold; }
`;

export function buildPurchaseBillBody(invoice: Invoice, tenant: TenantSummary, party: Party): string {
  const items = invoice.items ?? [];
  const vendorName = tenant.legalName || tenant.name;
  const totalQty = items.reduce((s, i) => s + parseFloat(i.qty), 0);
  const subTotal = parseFloat(invoice.subTotal);
  const cgst = parseFloat(invoice.cgstAmount || "0");
  const sgst = parseFloat(invoice.sgstAmount || "0");
  const igst = parseFloat(invoice.igstAmount || "0");
  const total = parseFloat(invoice.totalAmount);
  const paidAmt = parseFloat(invoice.paidAmount);
  const balance = parseFloat(invoice.balanceAmount);
  const paymentMode = invoice.payments?.[0]?.paymentMode
    ? invoice.payments[0].paymentMode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Credit";

  const logoCell = tenant.logoUrl
    ? `<td class="band band-logo c"><img src="${esc(tenant.logoUrl)}" crossorigin="anonymous" style="max-height:38px;max-width:100%;width:auto;height:auto;object-fit:contain;display:block;margin:0 auto;" /></td>`
    : "";
  const coSpan = tenant.logoUrl ? 3 : 4;

  const itemRows = items
    .map(
      (item, i) => `
      <tr class="item${i % 2 === 1 ? " alt" : ""}">
        <td class="c">${i + 1}</td>
        <td>${esc(item.itemName)}</td>
        <td class="c">${esc(item.uom)}</td>
        <td class="c">${num(item.qty, 0)}</td>
        <td class="r">${num(item.rate)}</td>
        <td class="r">${num(item.lineTotal)}</td>
      </tr>`,
    )
    .join("");

  const summaryLines: Array<{ label: string; value: number }> = [{ label: "Taxable Value", value: subTotal }];
  if (cgst > 0) summaryLines.push({ label: "CGST", value: cgst });
  if (sgst > 0) summaryLines.push({ label: "SGST", value: sgst });
  if (igst > 0) summaryLines.push({ label: "IGST", value: igst });
  summaryLines.push({ label: "Paid", value: paidAmt }, { label: "Balance Due", value: balance });

  const bankLines = [
    tenant.bankName ? esc(tenant.bankName) : "",
    tenant.bankAccount ? `A/c No.: ${esc(tenant.bankAccount)}` : "",
    tenant.bankIfsc ? `IFSC: ${esc(tenant.bankIfsc)}` : "",
    tenant.bankUpi ? `UPI: ${esc(tenant.bankUpi)}` : "",
  ].filter(Boolean);

  const bankCell = `<td colspan="3" rowspan="${summaryLines.length + 1}">
        ${bankLines.length ? `<div class="k">Bank Details</div><div class="v">${bankLines.join("<br />")}</div>` : ""}
        ${tenant.termsConditions ? `<div class="k" style="padding-top:8px;">Terms &amp; Conditions</div><div class="v" style="font-size:10px;">${esc(tenant.termsConditions)}</div>` : ""}
      </td>`;

  const summaryRows = summaryLines
    .map(
      (line, i) => `
    <tr class="sum">
      ${i === 0 ? bankCell : ""}
      <td colspan="2" class="r">${esc(line.label)}</td>
      <td class="r">${num(line.value)}</td>
    </tr>`,
    )
    .join("");

  const partyIdLines = [
    party.gstin ? `GSTIN: ${esc(party.gstin)}` : "",
    party.pan ? `PAN: ${esc(party.pan)}` : "",
    party.phone ? `Ph: ${esc(party.phone)}` : "",
  ].filter(Boolean);

  const signatureImg = tenant.signatureUrl
    ? `<img src="${esc(tenant.signatureUrl)}" crossorigin="anonymous" style="max-height:44px;max-width:150px;object-fit:contain;display:block;margin:6px 0 4px auto;" />`
    : `<div style="height:44px;"></div>`;

  const bandSub = [
    tenant.address ? esc(tenant.address) : "",
    tenant.contactPhone ? "Ph: " + esc(tenant.contactPhone) : "",
    tenant.contactEmail ? esc(tenant.contactEmail) : "",
    tenant.gstin ? "GSTIN: " + esc(tenant.gstin) : tenant.pan ? "PAN: " + esc(tenant.pan) : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;|&nbsp; ");

  return `<div class="kag-purchase-bill"><table><colgroup>
    <col style="width:10%" /><col style="width:30%" /><col style="width:12%" />
    <col style="width:12%" /><col style="width:17%" /><col style="width:19%" />
  </colgroup><tbody>

    <tr>
      ${logoCell}
      <td class="band" colspan="${coSpan}">
        <div class="band-co">${esc(vendorName)}</div>
        <div class="band-sub">${bandSub}</div>
      </td>
      <td class="band r" colspan="2">
        <div class="band-doc">PURCHASE BILL</div>
        <div class="band-no">${esc(invoice.invoiceNo)}</div>
      </td>
    </tr>

    <tr class="strip">
      <td colspan="2"><div class="k">Bill Date</div><div class="v b">${dmy(invoice.invoiceDate)}</div></td>
      <td colspan="2"><div class="k">Due Date</div><div class="v b">${dmy(invoice.dueDate) || "&mdash;"}</div></td>
      <td colspan="2"><div class="k">Payment Mode</div><div class="v b">${esc(paymentMode)}</div></td>
    </tr>

    <tr class="party">
      <td colspan="3">
        <div class="k">Bill From (Supplier)</div>
        <div class="nm">${esc(party.name)}</div>
        ${party.address ? `<div>${esc(party.address)}</div>` : ""}
        ${partyIdLines.length ? `<div>${partyIdLines.join(" &nbsp;|&nbsp; ")}</div>` : ""}
      </td>
      <td colspan="3">
        <div class="k">Bill To</div>
        <div class="nm">${esc(vendorName)}</div>
        ${tenant.address ? `<div>${esc(tenant.address)}</div>` : ""}
        ${invoice.placeOfSupply ? `<div>Place of Supply: ${esc(invoice.placeOfSupply)}</div>` : ""}
      </td>
    </tr>

    <tr>
      <th class="ih c">#</th>
      <th class="ih" style="text-align:left;">Item Name</th>
      <th class="ih c">UOM</th>
      <th class="ih c">Quantity</th>
      <th class="ih r">Price / Unit</th>
      <th class="ih r">Amount</th>
    </tr>
    ${itemRows}

    <tr class="tot">
      <td colspan="3" class="r">Total</td>
      <td class="c">${num(totalQty, 0)}</td>
      <td></td>
      <td class="r">${num(subTotal)}</td>
    </tr>
    ${summaryRows}
    <tr class="grand">
      <td colspan="2" class="r">Grand Total</td>
      <td class="r">&#8377; ${num(total)}</td>
    </tr>

    <tr class="words">
      <td colspan="6"><span class="k">Amount in Words:</span> <span class="b">${esc(amountInWords(total))}</span></td>
    </tr>

    <tr class="sign">
      <td colspan="3">
        ${invoice.notes ? `<div class="k">Notes</div><div class="v">${esc(invoice.notes)}</div>` : ""}
      </td>
      <td colspan="3">
        <div class="b r">for ${esc(vendorName)}</div>
        ${signatureImg}
        <div class="r" style="font-size:9.5px;">Authorised Signatory</div>
      </td>
    </tr>

    <tr class="fine"><td colspan="6">This is a computer generated bill.</td></tr>

  </tbody></table></div>`;
}

export function buildPurchaseBillHtml(invoice: Invoice, tenant: TenantSummary, party: Party): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill - ${esc(invoice.invoiceNo)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${PURCHASE_BILL_CSS}
  </style>
</head>
<body>${buildPurchaseBillBody(invoice, tenant, party)}</body>
</html>`;
}
