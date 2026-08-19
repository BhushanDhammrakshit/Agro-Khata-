import type { Driver, Invoice, Party, TenantSummary } from "@/lib/api";

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** ISO date (yyyy-mm-dd) -> dd/mm/yyyy as printed on the bill. */
function dmy(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function num(v: string | number, dp = 2): string {
  return parseFloat(String(v)).toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export const SALES_BILL_CSS = `
.kag-bill { width: 100%; min-width: 920px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; }
.kag-bill table { border-collapse: collapse; width: 100%; table-layout: fixed; border: 2px solid #000; }
.kag-bill td, .kag-bill th { border: 1px solid #555; padding: 2px 4px; vertical-align: top; overflow-wrap: break-word; }
.kag-bill .tb { border-bottom: 2px solid #000; }
.kag-bill .tr { border-right: 2px solid #000; }
.kag-bill .nb { border: none; }
.kag-bill .c { text-align: center; }
.kag-bill .r { text-align: right; }
.kag-bill .b { font-weight: bold; }
.kag-bill .mid { vertical-align: middle; }
.kag-bill .title { font-size: 28px; font-weight: bold; text-align: center; padding: 4px; }
.kag-bill .vendor { text-align: center; font-size: 14px; line-height: 18px; }
.kag-bill .shipping { height: 126px; line-height: 18px; }
.kag-bill .meta { height: 22px; vertical-align: middle; }
.kag-bill .asn { height: 38px; }
.kag-bill .items td, .kag-bill .items th { height: 22px; padding: 2px 4px; vertical-align: middle; }
.kag-bill .dispatch td { height: 22px; vertical-align: middle; }
.kag-bill .signature { height: 60px; vertical-align: top; padding-top: 4px; }
.kag-bill .red { color: #ff0000; }
`;

export function buildSalesBillBody(invoice: Invoice, tenant: TenantSummary, party: Party, driver?: Driver): string {
  const items = invoice.items ?? [];
  const totalQty = items.reduce((s, i) => s + parseFloat(i.qty), 0);
  const totalValue = parseFloat(invoice.totalAmount);
  const vendorName = tenant.legalName || tenant.name;
  const titleSuffix = tenant.invoicePrefix
    ? tenant.invoicePrefix.replace(/[-_\s]+$/, "").toUpperCase()
    : invoice.placeOfSupply
      ? invoice.placeOfSupply.toUpperCase()
      : "";

  const itemRows = items
    .map(
      (item, i) => `
      <tr>
        <td class="c b">${i + 1}</td>
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

  const partyIds = [
    party.gstin ? `GSTIN / UIN : ${esc(party.gstin)}` : "",
    party.pan ? `/PAN :${esc(party.pan)}` : "",
    party.fssaiNo ? `&nbsp;&nbsp;&nbsp;&nbsp;FSSAI NO ${esc(party.fssaiNo)}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const footerLines = [
    { label: "Vehicle No.-", value: invoice.vehicleNo },
    { label: "Driver Name :", value: invoice.driverName },
    { label: "MOB NO.", value: driver?.phone },
    { label: "Bank Name:-", value: tenant.bankName },
    { label: "Account no :-", value: tenant.bankAccount },
    { label: "IFSC CODE:-", value: tenant.bankIfsc },
  ];

  const footerRows = footerLines
    .map((row, i) => {
      const last = i === footerLines.length - 1;
      const rightCell =
        i === 0
          ? `<td colspan="4" rowspan="${footerLines.length}" class="c tb" style="vertical-align:top;padding-top:5px;">For&nbsp; ${esc(vendorName)}</td>`
          : "";
      return `<tr class="dispatch"><td colspan="4" class="tr${last ? " tb" : ""}">${esc(row.label)} ${esc(row.value)}</td>${rightCell}</tr>`;
    })
    .join("");

  return `<div class="kag-bill"><table><colgroup>
    <col style="width:8%" /><col style="width:30%" /><col style="width:11%" />
    <col style="width:9%" /><col style="width:8%" /><col style="width:7%" />
    <col style="width:13%" /><col style="width:14%" />
  </colgroup><tbody>

    <tr><td colspan="8" class="title tb">Invoice${titleSuffix ? " : " + esc(titleSuffix) : ""}</td></tr>

    <tr><td colspan="8" class="vendor b" style="border-bottom:none;">Vendor Name : ${esc(vendorName)}</td></tr>
    <tr><td colspan="8" class="vendor b" style="border-top:none;border-bottom:none;">${
      tenant.address ? "Vendor Address :-" + esc(tenant.address) : ""
    }</td></tr>
    <tr>
      <!-- Split as two plain cells (not a nested table) — html2canvas can misplace borders on nested tables. -->
      <td colspan="5" class="vendor b tb" style="border-top:none;border-right:none;padding:1px 4px;">${tenant.contactPhone ? "Contact No. : " + esc(tenant.contactPhone) : ""}</td>
      <td colspan="3" class="vendor b tb red" style="border-top:none;border-left:none;padding:1px 4px;text-align:right;">${
        tenant.pan ? "PAN: " + esc(tenant.pan) : tenant.gstin ? "GSTIN: " + esc(tenant.gstin) : ""
      }</td>
    </tr>

    <tr>
      <td colspan="4" rowspan="5" class="shipping tr tb">
        <div class="b">Shipping Address :</div>
        <div class="b">${esc(party.name)}</div>
        ${party.shippingAddress || party.address ? `<div class="b">${esc(party.shippingAddress ?? party.address)}</div>` : ""}
        ${partyIds ? `<div class="b">${partyIds}</div>` : ""}
      </td>
      <td colspan="3" class="b meta">Invoice No</td>
      <td class="c b meta">${esc(invoice.invoiceNo)}</td>
    </tr>
    <tr><td colspan="3" class="b meta">Invoice Date</td><td class="c b meta">${dmy(invoice.invoiceDate)}</td></tr>
    <tr><td colspan="3" class="b meta">PO NO</td><td class="c b meta">${esc(invoice.poNo)}</td></tr>
    <tr><td colspan="3" class="b meta">PO Date</td><td class="c b meta">${dmy(invoice.poDate)}</td></tr>
    <tr><td colspan="3" class="b tb asn">ASN NO</td><td class="c b tb asn">${esc(invoice.asnNo)}</td></tr>

    <tr class="items">
      <th class="c">No.</th>
      <th class="c">Product Description</th>
      <th class="c">UOM</th>
      <th class="c">Indent Qty</th>
      <th class="c">Rec Qty</th>
      <th class="c">Rejection</th>
      <th class="c">Rate</th>
      <th class="c">Total Value</th>
    </tr>
    ${itemRows}
    <tr class="items">
      <td class="tb"></td><td class="tb"></td><td class="tb"></td>
      <td class="c b tb">${num(totalQty, 0)}</td>
      <td class="tb"></td><td class="tb"></td><td class="tb"></td>
      <td class="r b tb">${num(totalValue)}</td>
    </tr>

    ${footerRows}

    <tr><td colspan="8" class="c b signature">
      Receivers , Signature with Stamp<br />Subject to  Jurisdiction
    </td></tr>

  </tbody></table></div>`;
}

export function buildSalesBillHtml(invoice: Invoice, tenant: TenantSummary, party: Party, driver?: Driver): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${esc(invoice.invoiceNo)}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${SALES_BILL_CSS}
  </style>
</head>
<body>${buildSalesBillBody(invoice, tenant, party, driver)}</body>
</html>`;
}
