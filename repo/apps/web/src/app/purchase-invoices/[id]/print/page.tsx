"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, Invoice, TenantSummary, Party } from "@/lib/api";

// Converts a number to Indian-style words (e.g. 2132 → "Two Thousand One Hundred and Thirty Two")
function toWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " and " + convert(num % 100) : "");
    if (num < 100000) return convert(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 10000000) return convert(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + convert(num % 100000) : "");
    return convert(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + convert(num % 10000000) : "");
  }

  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  let result = convert(rupees) + " Rupees";
  if (paise > 0) result += " and " + convert(paise) + " Paise";
  return result + " only";
}

function fmt(v: string | number) {
  const n = parseFloat(String(v));
  return "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PrintPurchaseBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const printedRef = useRef(false);

  useEffect(() => {
    Promise.all([
      api.getPurchaseInvoice(id),
      api.getMyTenant(),
    ]).then(([inv, ten]) => {
      setInvoice(inv);
      setTenant(ten);
      return api.getParty(inv.partyId);
    }).then(setParty).catch(() => null);
  }, [id]);

  useEffect(() => {
    if (invoice && tenant && party && !printedRef.current) {
      printedRef.current = true;
      setTimeout(() => window.print(), 300);
    }
  }, [invoice, tenant, party]);

  if (!invoice || !tenant || !party) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading bill…</div>;
  }

  const totalQty   = invoice.items?.reduce((s, i) => s + parseFloat(i.qty), 0) ?? 0;
  const totalValue = parseFloat(invoice.totalAmount);
  const paidAmt    = parseFloat(invoice.paidAmount);
  const balance    = parseFloat(invoice.balanceAmount);
  const paymentMode = invoice.payments?.[0]?.paymentMode
    ? invoice.payments[0].paymentMode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Credit";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #000; padding: 4px 6px; }
      `}</style>

      {/* Screen-only controls */}
      <div className="no-print mb-3 flex items-center gap-3 p-4">
        <Link href={`/purchase-invoices/${id}`} className="text-sm text-blue-600 hover:underline">← Back to Invoice</Link>
        <button onClick={() => window.print()}
          className="rounded border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium hover:bg-slate-50">
          🖨 Print
        </button>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 8px" }}>

        {/* Title */}
        <table style={{ marginBottom: 0 }}>
          <tbody>
            <tr>
              <td style={{ textAlign: "center", fontWeight: "bold", fontSize: 15, padding: "6px" }}>
                Bill
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Company header: logo | details | date ── */}
        <table style={{ marginBottom: 0 }}>
          <tbody>
            <tr>
              {/* Logo */}
              <td style={{ width: "13%", borderTop: "none", textAlign: "center", verticalAlign: "middle", padding: 4, border: "1px solid #000" }}>
                {tenant.logoUrl
                  ? <img src={tenant.logoUrl} alt="logo" style={{ maxHeight: 64, maxWidth: 84, objectFit: "contain" }} />
                  : <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#94a3b8" }}>Logo</div>}
              </td>
              {/* Company details */}
              <td style={{ borderTop: "none", borderLeft: "none", verticalAlign: "top", padding: "5px 8px", border: "1px solid #000" }}>
                <div style={{ fontWeight: "bold", fontSize: 13 }}>{tenant.legalName || tenant.name}</div>
                {tenant.address && <div>{tenant.address}</div>}
                <div>
                  {tenant.contactPhone && <><strong>Phone:</strong> {tenant.contactPhone}&nbsp;&nbsp;</>}
                  {tenant.contactEmail && <><strong>Email:</strong> {tenant.contactEmail}</>}
                </div>
                {tenant.gstin && <div><strong>State:</strong> 27-Maharashtra</div>}
              </td>
              {/* Date + place of supply */}
              <td style={{ borderTop: "none", borderLeft: "none", verticalAlign: "top", width: "26%", padding: "5px 8px", border: "1px solid #000" }}>
                <div><strong>Date: </strong><strong>{invoice.invoiceDate}</strong></div>
                {invoice.placeOfSupply && (
                  <div><strong>Place of Supply: </strong><strong>{invoice.placeOfSupply}</strong></div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bill From */}
        <table style={{ marginBottom: 0 }}>
          <tbody>
            <tr>
              <td style={{ borderTop: "none", padding: "5px 8px" }}>
                <span style={{ fontWeight: "bold" }}>Bill From:</span><br />
                <span style={{ fontWeight: "bold", fontSize: 12 }}>{party.name}</span>
                {party.address && <><br />{party.address}</>}
                {party.gstin && <><br /><strong>GSTIN:</strong> {party.gstin}</>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Line items */}
        <table style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: "5%" }}>#</th>
              <th>Item name</th>
              <th style={{ textAlign: "center", width: "12%" }}>HSN/ SAC</th>
              <th style={{ textAlign: "right", width: "12%" }}>Quantity</th>
              <th style={{ textAlign: "right", width: "14%" }}>Price/ Unit (₹)</th>
              <th style={{ textAlign: "right", width: "14%" }}>Amount(₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td style={{ fontWeight: "bold" }}>{item.itemName}</td>
                <td style={{ textAlign: "center" }}>{/* HSN/SAC not stored on line item */}</td>
                <td style={{ textAlign: "right" }}>{parseFloat(item.qty).toLocaleString("en-IN")}</td>
                <td style={{ textAlign: "right" }}>₹ {parseFloat(item.rate).toFixed(2)}</td>
                <td style={{ textAlign: "right" }}>₹ {parseFloat(item.lineTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {/* Total row */}
            <tr>
              <td colSpan={3} style={{ border: "none" }}></td>
              <td style={{ textAlign: "right", fontWeight: "bold" }}>{totalQty.toLocaleString("en-IN")}</td>
              <td style={{ border: "none" }}></td>
              <td style={{ textAlign: "right", fontWeight: "bold" }}>₹ {totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        {/* Sub total / Total in words */}
        <table style={{ marginBottom: 0 }}>
          <tbody>
            <tr>
              <td style={{ width: "40%", borderTop: "none", padding: "4px 8px" }}>
                <strong>Sub Total: {fmt(invoice.subTotal)}</strong>
              </td>
              <td style={{ borderTop: "none", borderLeft: "none", padding: "4px 8px" }}>
                <strong>Total: {fmt(totalValue)}({toWords(totalValue)})</strong>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "4px 8px" }}>
                <strong>Paid: {fmt(paidAmt)}</strong>
              </td>
              <td style={{ borderLeft: "none", padding: "4px 8px" }}>
                <strong>Balance: {fmt(balance)}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Payment mode ── */}
        <table style={{ marginBottom: 0 }}>
          <tbody>
            <tr>
              <td style={{ borderTop: "none", padding: "4px 8px" }}>
                <strong>Payment Mode: {paymentMode}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Terms & Conditions + Signature ── */}
        <table>
          <tbody>
            <tr>
              <td style={{ width: "55%", borderTop: "none", verticalAlign: "top", padding: "6px 8px" }}>
                <div style={{ fontWeight: "bold" }}>Terms And Conditions:</div>
                <div style={{ marginTop: 4, fontSize: 10 }}>
                  {tenant.termsConditions ?? ""}
                </div>
              </td>
              <td style={{ borderTop: "none", borderLeft: "none", textAlign: "center", verticalAlign: "bottom", padding: "6px 8px" }}>
                <div style={{ fontWeight: "bold", marginBottom: 8 }}>For {tenant.legalName || tenant.name}:</div>
                {tenant.signatureUrl
                  ? <img src={tenant.signatureUrl} alt="signature"
                      style={{ maxHeight: 64, maxWidth: 160, objectFit: "contain", display: "block", margin: "0 auto 4px" }} />
                  : <div style={{ height: 52 }}></div>}
                <div style={{ borderTop: "1px solid #000", paddingTop: 4, fontSize: 10 }}>Authorized Signatory</div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </>
  );
}
