"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, Invoice, TenantSummary, Party } from "@/lib/api";
import { buildPurchaseBillHtml } from "@/lib/bill-templates/purchase-bill";

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

function printViaIframe(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  // Wait for images to load before printing
  const imgs = Array.from(doc.images);
  const ready = () => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); };
  if (imgs.length === 0) {
    setTimeout(ready, 100);
  } else {
    let loaded = 0;
    imgs.forEach((img) => { img.onload = img.onerror = () => { if (++loaded === imgs.length) setTimeout(ready, 100); }; });
    setTimeout(ready, 2000); // fallback
  }
  setTimeout(() => document.body.removeChild(iframe), 5000);
}

export function BillPrintModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [tenant, setTenant]   = useState<TenantSummary | null>(null);
  const [party, setParty]     = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getPurchaseInvoice(invoiceId), api.getMyTenant()])
      .then(([inv, ten]) => { setInvoice(inv); setTenant(ten); return api.getParty(inv.partyId); })
      .then(setParty)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [invoiceId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function handlePrint() {
    if (!invoice || !tenant || !party) return;
    printViaIframe(buildPurchaseBillHtml(invoice, tenant, party));
  }

  const totalQty   = invoice?.items?.reduce((s, i) => s + parseFloat(i.qty), 0) ?? 0;
  const totalValue = invoice ? parseFloat(invoice.totalAmount) : 0;
  const paidAmt    = invoice ? parseFloat(invoice.paidAmount) : 0;
  const balance    = invoice ? parseFloat(invoice.balanceAmount) : 0;
  const paymentMode = invoice?.payments?.[0]?.paymentMode
    ? invoice.payments[0].paymentMode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Credit";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">

        {/* Modal toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <span className="text-sm font-semibold text-slate-700">Bill Preview</span>
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

        {/* Bill preview */}
        <div className="overflow-auto p-4" style={{ maxHeight: "80vh" }}>
          {loading && <p className="py-10 text-center text-sm text-slate-400">Loading bill…</p>}

          {invoice && tenant && party && (() => {
            return (
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#000" }}>
                <style>{`
                  .bill-preview table { border-collapse: collapse; width: 100%; margin-bottom: 0; }
                  .bill-preview td, .bill-preview th { border: 1px solid #000; padding: 3px 6px; }
                `}</style>
                <div className="bill-preview">

                  <table><tbody><tr>
                    <td style={{ textAlign: "center", fontWeight: "bold", fontSize: 15, padding: "5px" }}>Bill</td>
                  </tr></tbody></table>

                  <table><tbody><tr>
                    <td style={{ width: "13%", borderTop: "none", textAlign: "center", verticalAlign: "middle", padding: 4 }}>
                      {tenant.logoUrl
                        ? <img src={tenant.logoUrl} alt="logo" style={{ maxHeight: 64, maxWidth: 84, objectFit: "contain" }} />
                        : <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#94a3b8" }}>Logo</div>}
                    </td>
                    <td style={{ borderTop: "none", borderLeft: "none", verticalAlign: "top", padding: "5px 8px" }}>
                      <div style={{ fontWeight: "bold", fontSize: 13 }}>{tenant.legalName || tenant.name}</div>
                      {tenant.address && <div>{tenant.address}</div>}
                      <div>
                        {tenant.contactPhone && <><strong>Phone:</strong> {tenant.contactPhone}&nbsp;&nbsp;</>}
                        {tenant.contactEmail && <><strong>Email:</strong> {tenant.contactEmail}</>}
                      </div>
                      {tenant.gstin && <div><strong>State:</strong> 27-Maharashtra</div>}
                    </td>
                    <td style={{ borderTop: "none", borderLeft: "none", verticalAlign: "top", width: "26%", padding: "5px 8px" }}>
                      <div><strong>Date: </strong><strong>{invoice.invoiceDate}</strong></div>
                      {invoice.placeOfSupply && <div><strong>Place of Supply: </strong><strong>{invoice.placeOfSupply}</strong></div>}
                    </td>
                  </tr></tbody></table>

                  <table><tbody><tr>
                    <td style={{ borderTop: "none", padding: "5px 8px" }}>
                      <div><strong>Bill From:</strong></div>
                      <div style={{ fontWeight: "bold", fontSize: 12 }}>{party.name}</div>
                      {party.address && <div>{party.address}</div>}
                      {party.gstin && <div><strong>GSTIN:</strong> {party.gstin}</div>}
                    </td>
                  </tr></tbody></table>

                  <table>
                    <thead><tr>
                      <th style={{ textAlign: "center", width: "5%" }}>#</th>
                      <th>Item name</th>
                      <th style={{ textAlign: "center", width: "12%" }}>HSN/ SAC</th>
                      <th style={{ textAlign: "right", width: "11%" }}>Quantity</th>
                      <th style={{ textAlign: "right", width: "15%" }}>Price/ Unit (₹)</th>
                      <th style={{ textAlign: "right", width: "14%" }}>Amount(₹)</th>
                    </tr></thead>
                    <tbody>
                      {invoice.items?.map((item, i) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: "center" }}>{i + 1}</td>
                          <td style={{ fontWeight: "bold" }}>{item.itemName}</td>
                          <td style={{ textAlign: "center" }}></td>
                          <td style={{ textAlign: "right" }}>{parseFloat(item.qty).toLocaleString("en-IN")}</td>
                          <td style={{ textAlign: "right" }}>₹ {parseFloat(item.rate).toFixed(2)}</td>
                          <td style={{ textAlign: "right" }}>₹ {parseFloat(item.lineTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ border: "none" }}></td><td style={{ border: "none" }}></td><td style={{ border: "none" }}></td>
                        <td style={{ textAlign: "right", fontWeight: "bold" }}>{totalQty.toLocaleString("en-IN")}</td>
                        <td style={{ border: "none" }}></td>
                        <td style={{ textAlign: "right", fontWeight: "bold" }}>₹ {totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table><tbody>
                    <tr>
                      <td style={{ borderTop: "none", width: "38%" }}><strong>Sub Total: {fmt(invoice.subTotal)}</strong></td>
                      <td style={{ borderTop: "none", borderLeft: "none" }}><strong>Total: {fmt(totalValue)}({toWords(totalValue)})</strong></td>
                    </tr>
                    <tr>
                      <td><strong>Paid: {fmt(paidAmt)}</strong></td>
                      <td style={{ borderLeft: "none" }}><strong>Balance: {fmt(balance)}</strong></td>
                    </tr>
                  </tbody></table>

                  <table><tbody><tr>
                    <td style={{ borderTop: "none" }}><strong>Payment Mode: {paymentMode}</strong></td>
                  </tr></tbody></table>

                  <table><tbody><tr>
                    <td style={{ borderTop: "none", width: "55%", verticalAlign: "top", padding: "6px 8px" }}>
                      <div style={{ fontWeight: "bold" }}>Terms And Conditions:</div>
                      <div style={{ marginTop: 4, fontSize: 10 }}>{tenant.termsConditions ?? ""}</div>
                    </td>
                    <td style={{ borderTop: "none", borderLeft: "none", textAlign: "center", verticalAlign: "bottom", padding: "6px 8px" }}>
                      <div style={{ fontWeight: "bold", marginBottom: 8 }}>For {tenant.legalName || tenant.name}:</div>
                      {tenant.signatureUrl
                        ? <img src={tenant.signatureUrl} alt="signature" style={{ maxHeight: 64, maxWidth: 160, objectFit: "contain", display: "block", margin: "0 auto 4px" }} />
                        : <div style={{ height: 52 }}></div>}
                      <div style={{ borderTop: "1px solid #000", paddingTop: 3, fontSize: 10 }}>Authorized Signatory</div>
                    </td>
                  </tr></tbody></table>

                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>,
    document.body,
  );
}
