"use client";

import { useEffect, useState } from "react";
import { api, Invoice, TenantSummary, Party } from "@/lib/api";

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

const BILL_CSS = `
.kag-bill { width: 100%; font-family: "Times New Roman", Times, serif; font-size: 13px; color: #000; }
.kag-bill table { border-collapse: collapse; width: 100%; table-layout: fixed; border: 3px solid #000; }
.kag-bill td, .kag-bill th { border: 1px solid #000; padding: 2px 6px; vertical-align: top; overflow-wrap: break-word; }
.kag-bill .tb { border-bottom: 3px solid #000; }
.kag-bill .tr { border-right: 3px solid #000; }
.kag-bill .nb { border: none; }
.kag-bill .c { text-align: center; }
.kag-bill .r { text-align: right; }
.kag-bill .b { font-weight: bold; }
.kag-bill .mid { vertical-align: middle; }
.kag-bill .title { font-size: 24px; font-weight: bold; text-align: center; padding: 6px; }
.kag-bill .item { font-family: Arial, Helvetica, sans-serif; font-weight: bold; }
.kag-bill .red { color: #ff0000; }
`;

function buildBillBody(invoice: Invoice, tenant: TenantSummary, party: Party): string {
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
        <td class="item">${esc(item.itemName)}</td>
        <td class="c b">${esc(item.uom)}</td>
        <td class="c b">${num(item.qty, 0)}</td>
        <td></td>
        <td></td>
        <td class="r b">${num(item.rate)}</td>
        <td class="r b">${num(item.lineTotal)}</td>
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
    { label: "Bank Name:- ", value: tenant.bankName },
    { label: "Account  no :-", value: tenant.bankAccount },
    { label: "IFSC CODE:-", value: tenant.bankIfsc },
  ];

  const footerRows = footerLines
    .map((row, i) => {
      const last = i === footerLines.length - 1;
      const rightCell =
        i === 0
          ? `<td colspan="4" rowspan="${footerLines.length}" class="c b tb mid">For  ${esc(vendorName)}</td>`
          : "";
      return `<tr><td colspan="4" class="b tr${last ? " tb" : ""}">${esc(row.label)} ${esc(row.value)}</td>${rightCell}</tr>`;
    })
    .join("");

  return `<div class="kag-bill"><table><colgroup>
    <col style="width:6%" /><col style="width:25%" /><col style="width:12%" />
    <col style="width:11%" /><col style="width:11%" /><col style="width:11%" />
    <col style="width:9%" /><col style="width:15%" />
  </colgroup><tbody>

    <tr><td colspan="8" class="title tb">Invoice${titleSuffix ? " : " + esc(titleSuffix) : ""}</td></tr>

    <tr><td colspan="8" class="b" style="border-bottom:none;">Vendor Name : ${esc(vendorName)}</td></tr>
    <tr><td colspan="8" class="c b" style="border-top:none;border-bottom:none;">${
      tenant.address ? "Vendor Address :-" + esc(tenant.address) : ""
    }</td></tr>
    <tr><td colspan="8" class="tb" style="border-top:none;padding:0;">
      <table style="border:none;width:100%;table-layout:auto;"><tbody><tr>
        <td class="nb b" style="padding:2px 6px;">${tenant.contactPhone ? "Contact No. : " + esc(tenant.contactPhone) : ""}</td>
        <td class="nb b red r" style="padding:2px 6px;">${
          tenant.pan ? "PAN: " + esc(tenant.pan) : tenant.gstin ? "GSTIN: " + esc(tenant.gstin) : ""
        }</td>
      </tr></tbody></table>
    </td></tr>

    <tr>
      <td colspan="4" rowspan="6" class="tr tb">
        <div class="b">Shipping Address :</div>
        <div class="b">${esc(party.name)}</div>
        ${party.shippingAddress || party.address ? `<div class="b">${esc(party.shippingAddress ?? party.address)}</div>` : ""}
        ${partyIds ? `<div class="b">${partyIds}</div>` : ""}
      </td>
      <td colspan="3" class="b">Invioce Number</td>
      <td class="c">${esc(invoice.invoiceNo)}</td>
    </tr>
    <tr><td colspan="3" class="b">Invoice Date</td><td class="c">${dmy(invoice.invoiceDate)}</td></tr>
    <tr><td colspan="3" class="b">PO NO</td><td class="c">${esc(invoice.poNo)}</td></tr>
    <tr><td colspan="3" class="b">&nbsp;</td><td class="c">${dmy(invoice.poDate)}</td></tr>
    <tr><td colspan="3" class="b">PO Date</td><td class="c"></td></tr>
    <tr><td colspan="3" class="b tb">ASN NO</td><td class="c tb">${esc(invoice.asnNo)}</td></tr>

    <tr>
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
    <tr>
      <td class="tb"></td><td class="tb"></td><td class="tb"></td>
      <td class="c b tb">${num(totalQty, 0)}</td>
      <td class="tb"></td><td class="tb"></td><td class="tb"></td>
      <td class="r b tb">${num(totalValue)}</td>
    </tr>

    ${footerRows}

    <tr><td colspan="8" class="c b" style="padding:4px 6px;">
      Receivers , Signature with Stamp<br />Subject to  Jurisdiction
    </td></tr>

  </tbody></table></div>`;
}

function buildBillHtml(invoice: Invoice, tenant: TenantSummary, party: Party): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${esc(invoice.invoiceNo)}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${BILL_CSS}
  </style>
</head>
<body>${buildBillBody(invoice, tenant, party)}</body>
</html>`;
}

function printViaIframe(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  const imgs = Array.from(doc.images);
  const ready = () => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); };
  if (imgs.length === 0) {
    setTimeout(ready, 100);
  } else {
    let loaded = 0;
    imgs.forEach((img) => { img.onload = img.onerror = () => { if (++loaded === imgs.length) setTimeout(ready, 100); }; });
    setTimeout(ready, 2000);
  }
  setTimeout(() => document.body.removeChild(iframe), 5000);
}

export function SalesBillPrintModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [tenant, setTenant]   = useState<TenantSummary | null>(null);
  const [party, setParty]     = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getSalesInvoice(invoiceId), api.getMyTenant()])
      .then(([inv, ten]) => { setInvoice(inv); setTenant(ten); return api.getParty(inv.partyId); })
      .then(setParty)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [invoiceId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function handlePrint() {
    if (!invoice || !tenant || !party) return;
    printViaIframe(buildBillHtml(invoice, tenant, party));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-2xl">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <span className="text-sm font-semibold text-slate-700">Invoice Preview</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !invoice}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              🖨 Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Preview — renders exactly the same markup that gets printed */}
        <div className="overflow-auto p-4" style={{ maxHeight: "80vh" }}>
          {loading && <p className="py-10 text-center text-sm text-slate-400">Loading invoice…</p>}

          {invoice && tenant && party && (
            <>
              <style>{BILL_CSS}</style>
              <div dangerouslySetInnerHTML={{ __html: buildBillBody(invoice, tenant, party) }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
