import type { Driver, Invoice, Party, TenantSummary } from "@/lib/api";
import { amountInWords, dmy, esc, num } from "./common";

export const SALES_BILL_CSS = `
.kag-bill { width: 100%; font-family: Arial, "Liberation Sans", "Helvetica Neue", Helvetica, sans-serif; font-size: 11.5px; line-height: 1.5; color: #1a1a1a; }
.kag-bill table { border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #b6c6d2; }
.kag-bill td, .kag-bill th { border: 1px solid #b6c6d2; padding: 6px 8px; vertical-align: top; overflow-wrap: break-word; }
.kag-bill .band { background: #0f3d5c; color: #ffffff; border-color: #0f3d5c; padding: 12px 14px; vertical-align: middle; }
.kag-bill .band-logo { overflow: hidden; }
.kag-bill .band-co { font-size: 16px; font-weight: bold; line-height: 1.3; }
.kag-bill .band-sub { font-size: 9.5px; color: #cfe3ef; line-height: 1.5; padding-top: 3px; }
.kag-bill .band-doc { font-size: 17px; font-weight: bold; letter-spacing: 2px; }
.kag-bill .band-no { font-size: 11.5px; color: #cfe3ef; padding-top: 3px; }
.kag-bill .strip td { background: #eef4f8; height: 32px; padding: 6px 8px 5px; }
.kag-bill .k { font-size: 8.5px; text-transform: uppercase; letter-spacing: .5px; color: #0f3d5c; font-weight: bold; }
.kag-bill .v { padding-top: 2px; }
.kag-bill .party td { height: 72px; }
.kag-bill .party .nm { font-weight: bold; font-size: 12.5px; padding-top: 3px; }
.kag-bill th.ih { background: #0f3d5c; color: #ffffff; border-color: #0f3d5c; font-size: 9px; text-transform: uppercase; font-weight: bold; padding: 7px 5px; vertical-align: middle; }
.kag-bill .item td { height: 22px; padding: 6px 8px 5px; }
.kag-bill .alt td { background: #f3f7fa; }
.kag-bill .tot td { background: #dfeaf1; font-weight: bold; height: 22px; }
.kag-bill .sum td { height: 20px; padding: 5px 8px 4px; }
.kag-bill .grand td { background: #0f3d5c; color: #ffffff; border-color: #0f3d5c; font-weight: bold; font-size: 13px; padding: 7px 8px; }
.kag-bill .words td { background: #eef4f8; }
.kag-bill .sign td { height: 78px; }
.kag-bill .fine td { background: #eef4f8; text-align: center; font-size: 9px; color: #4b5f6d; padding: 5px 8px; }
.kag-bill .c { text-align: center; }
.kag-bill .r { text-align: right; }
.kag-bill .b { font-weight: bold; }
`;

export function buildSalesBillBody(invoice: Invoice, tenant: TenantSummary, party: Party, driver?: Driver): string {
  const items = invoice.items ?? [];
  const vendorName = tenant.legalName || tenant.name;
  const totalQty = items.reduce((s, i) => s + parseFloat(i.qty), 0);
  const subTotal = parseFloat(invoice.subTotal);
  const cgst = parseFloat(invoice.cgstAmount || "0");
  const sgst = parseFloat(invoice.sgstAmount || "0");
  const igst = parseFloat(invoice.igstAmount || "0");
  const total = parseFloat(invoice.totalAmount);

  const logoCell = tenant.logoUrl
    ? `<td class="band band-logo c"><img src="${esc(tenant.logoUrl)}" crossorigin="anonymous" style="max-height:38px;max-width:100%;width:auto;height:auto;object-fit:contain;display:block;margin:0 auto;" /></td>`
    : "";
  const coSpan = tenant.logoUrl ? 4 : 5;

  const itemRows = items
    .map(
      (item, i) => `
      <tr class="item${i % 2 === 1 ? " alt" : ""}">
        <td class="c">${i + 1}</td>
        <td>${esc(item.itemName)}</td>
        <td class="c">${esc(item.uom)}</td>
        <td class="c">${num(item.qty, 0)}</td>
        <td></td>
        <td></td>
        <td class="r">${num(item.rate)}</td>
        <td class="r">${num(item.lineTotal)}</td>
      </tr>`,
    )
    .join("");

  const summaryLines: Array<{ label: string; value: number }> = [{ label: "Taxable Value", value: subTotal }];
  if (cgst > 0) summaryLines.push({ label: "CGST", value: cgst });
  if (sgst > 0) summaryLines.push({ label: "SGST", value: sgst });
  if (igst > 0) summaryLines.push({ label: "IGST", value: igst });

  const bankLines = [
    tenant.bankName ? esc(tenant.bankName) : "",
    tenant.bankAccount ? `A/c No.: ${esc(tenant.bankAccount)}` : "",
    tenant.bankIfsc ? `IFSC: ${esc(tenant.bankIfsc)}` : "",
    tenant.bankUpi ? `UPI: ${esc(tenant.bankUpi)}` : "",
  ].filter(Boolean);

  const bankCell = `<td colspan="4" rowspan="${summaryLines.length + 1}">
        ${bankLines.length ? `<div class="k">Bank Details</div><div class="v">${bankLines.join("<br />")}</div>` : ""}
        ${tenant.termsConditions ? `<div class="k" style="padding-top:8px;">Terms &amp; Conditions</div><div class="v" style="font-size:10px;">${esc(tenant.termsConditions)}</div>` : ""}
      </td>`;

  const summaryRows = summaryLines
    .map(
      (line, i) => `
    <tr class="sum">
      ${i === 0 ? bankCell : ""}
      <td colspan="2" class="r">${esc(line.label)}</td>
      <td colspan="2" class="r">${num(line.value)}</td>
    </tr>`,
    )
    .join("");

  const partyIdLines = [
    party.gstin ? `GSTIN: ${esc(party.gstin)}` : "",
    party.pan ? `PAN: ${esc(party.pan)}` : "",
    party.fssaiNo ? `FSSAI: ${esc(party.fssaiNo)}` : "",
  ].filter(Boolean);

  const dispatchLines = [
    invoice.vehicleNo ? `Vehicle No.: ${esc(invoice.vehicleNo)}` : "",
    invoice.driverName ? `Driver: ${esc(invoice.driverName)}` : "",
    driver?.phone ? `Mobile: ${esc(driver.phone)}` : "",
    invoice.placeOfSupply ? `Place of Supply: ${esc(invoice.placeOfSupply)}` : "",
  ].filter(Boolean);

  const signatureImg = tenant.signatureUrl
    ? `<img src="${esc(tenant.signatureUrl)}" crossorigin="anonymous" style="max-height:44px;max-width:150px;object-fit:contain;display:block;margin:6px 0 4px auto;" />`
    : `<div style="height:44px;"></div>`;

  const bandSub = [
    tenant.address ? esc(tenant.address) : "",
    tenant.contactPhone ? "Ph: " + esc(tenant.contactPhone) : "",
    tenant.gstin ? "GSTIN: " + esc(tenant.gstin) : tenant.pan ? "PAN: " + esc(tenant.pan) : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;|&nbsp; ");

  return `<div class="kag-bill"><table><colgroup>
    <col style="width:9%" /><col style="width:23%" /><col style="width:8%" />
    <col style="width:10%" /><col style="width:9%" /><col style="width:10%" />
    <col style="width:15%" /><col style="width:16%" />
  </colgroup><tbody>

    <tr>
      ${logoCell}
      <td class="band" colspan="${coSpan}">
        <div class="band-co">${esc(vendorName)}</div>
        <div class="band-sub">${bandSub}</div>
      </td>
      <td class="band r" colspan="3">
        <div class="band-doc">${invoice.isGstInvoice ? "TAX INVOICE" : "INVOICE"}</div>
        <div class="band-no">${esc(invoice.invoiceNo)}</div>
      </td>
    </tr>

    <tr class="strip">
      <td colspan="2"><div class="k">Invoice Date</div><div class="v b">${dmy(invoice.invoiceDate)}</div></td>
      <td colspan="2"><div class="k">PO No. / Date</div><div class="v b">${[esc(invoice.poNo), dmy(invoice.poDate)].filter(Boolean).join(" &middot; ") || "&mdash;"}</div></td>
      <td colspan="2"><div class="k">ASN No.</div><div class="v b">${esc(invoice.asnNo) || "&mdash;"}</div></td>
      <td colspan="2"><div class="k">Vehicle No.</div><div class="v b">${esc(invoice.vehicleNo) || "&mdash;"}</div></td>
    </tr>

    <tr class="party">
      <td colspan="4">
        <div class="k">Bill To</div>
        <div class="nm">${esc(party.name)}</div>
        ${party.address ? `<div>${esc(party.address)}</div>` : ""}
        ${partyIdLines.length ? `<div>${partyIdLines.join(" &nbsp;|&nbsp; ")}</div>` : ""}
      </td>
      <td colspan="4">
        <div class="k">Ship To</div>
        <div class="nm">${esc(party.name)}</div>
        ${party.shippingAddress || party.address ? `<div>${esc(party.shippingAddress ?? party.address)}</div>` : ""}
        ${party.phone ? `<div>Ph: ${esc(party.phone)}</div>` : ""}
      </td>
    </tr>

    <tr>
      <th class="ih c">#</th>
      <th class="ih" style="text-align:left;">Product Description</th>
      <th class="ih c">UOM</th>
      <th class="ih c">Indent Qty</th>
      <th class="ih c">Rec Qty</th>
      <th class="ih c">Rejection</th>
      <th class="ih r">Rate</th>
      <th class="ih r">Amount</th>
    </tr>
    ${itemRows}

    <tr class="tot">
      <td colspan="3" class="r">Total</td>
      <td class="c">${num(totalQty, 0)}</td>
      <td></td>
      <td></td>
      <td></td>
      <td class="r">${num(subTotal)}</td>
    </tr>
    ${summaryRows}
    <tr class="grand">
      <td colspan="2" class="r">Grand Total</td>
      <td colspan="2" class="r">&#8377; ${num(total)}</td>
    </tr>

    <tr class="words">
      <td colspan="8"><span class="k">Amount in Words:</span> <span class="b">${esc(amountInWords(total))}</span></td>
    </tr>

    <tr class="sign">
      <td colspan="4">
        <div class="k">Dispatch Details</div>
        <div class="v">${dispatchLines.length ? dispatchLines.join("<br />") : "&mdash;"}</div>
      </td>
      <td colspan="4">
        <div class="b r">for ${esc(vendorName)}</div>
        ${signatureImg}
        <div style="display:table;width:100%;font-size:9.5px;">
          <div style="display:table-cell;text-align:left;">Receiver's Signature &amp; Stamp</div>
          <div style="display:table-cell;text-align:right;">Authorised Signatory</div>
        </div>
      </td>
    </tr>

    <tr class="fine"><td colspan="8">Subject to jurisdiction &middot; This is a computer generated invoice.</td></tr>

  </tbody></table></div>`;
}

export function buildSalesBillHtml(invoice: Invoice, tenant: TenantSummary, party: Party, driver?: Driver): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${esc(invoice.invoiceNo)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${SALES_BILL_CSS}
  </style>
</head>
<body>${buildSalesBillBody(invoice, tenant, party, driver)}</body>
</html>`;
}
