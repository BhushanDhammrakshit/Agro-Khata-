"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, Invoice, TenantSummary, Party } from "@/lib/api";

export default function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const printedRef = useRef(false);

  useEffect(() => {
    Promise.all([
      api.getSalesInvoice(id),
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
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading invoice…</div>;
  }

  const totalQty = invoice.items?.reduce((s, i) => s + parseFloat(i.qty), 0) ?? 0;
  const totalValue = parseFloat(invoice.totalAmount);
  // "Invoice : <location>" — derive from invoice prefix or party name context
  const locationLabel = invoice.invoiceNo?.match(/^[A-Z]+/)?.[0] ?? "";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #000; padding: 3px 5px; }
        .no-border td, .no-border th { border: none; }
      `}</style>

      {/* Back button — hidden on print */}
      <div className="no-print mb-3 flex items-center gap-3 p-4">
        <Link href={`/sales-invoices/${id}`} className="text-sm text-blue-600 hover:underline">← Back to Invoice</Link>
        <button onClick={() => window.print()}
          className="rounded border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium hover:bg-slate-50">
          🖨 Print
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 10px" }}>

        {/* Title */}
        <table style={{ marginBottom: 0 }}>
          <tbody>
            <tr>
              <td colSpan={2} style={{ textAlign: "center", fontWeight: "bold", fontSize: 16, border: "2px solid #000", padding: "6px" }}>
                Invoice{locationLabel ? ` : ${locationLabel}` : ""}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Vendor header */}
        <table style={{ marginBottom: 0 }}>
          <tbody>
            <tr>
              <td style={{ textAlign: "center", border: "1px solid #000", borderTop: "none", padding: "4px" }}>
                <strong>Vendor Name : {tenant.legalName || tenant.name}</strong><br />
                Vendor Address :-{tenant.address}<br />
                Contact No. : {tenant.contactPhone}
                {tenant.pan && <>&nbsp;&nbsp;&nbsp;<strong style={{ color: "red" }}>PAN: {tenant.pan}</strong></>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Shipping + Invoice meta */}
        <table style={{ marginBottom: 0 }}>
          <tbody>
            <tr>
              <td style={{ width: "55%", verticalAlign: "top", border: "1px solid #000", borderTop: "none", padding: "4px" }}>
                <strong>Shipping Address :</strong><br />
                <strong>{party.name}</strong><br />
                {party.shippingAddress && <>{party.shippingAddress}<br /></>}
                {(party.gstin || party.pan || party.fssaiNo) && (
                  <span>
                    {party.gstin && <>GSTIN / UIN : {party.gstin}</>}
                    {party.pan && <> /PAN :{party.pan}</>}
                    {party.fssaiNo && <>&nbsp;&nbsp;&nbsp;FSSAI NO {party.fssaiNo}</>}
                  </span>
                )}
              </td>
              <td style={{ width: "45%", verticalAlign: "top", border: "1px solid #000", borderTop: "none", borderLeft: "none", padding: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000", borderTop: "none", borderLeft: "none", padding: "3px 5px", width: "55%" }}>Invioce Number</td>
                      <td style={{ border: "1px solid #000", borderTop: "none", padding: "3px 5px", fontWeight: "bold" }}>{invoice.invoiceNo}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", borderLeft: "none", padding: "3px 5px" }}>Invoice Date</td>
                      <td style={{ border: "1px solid #000", padding: "3px 5px" }}>{invoice.invoiceDate}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", borderLeft: "none", padding: "3px 5px" }}>PO NO</td>
                      <td style={{ border: "1px solid #000", padding: "3px 5px" }}>{invoice.poNo ?? ""}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", borderLeft: "none", padding: "3px 5px" }}>PO Date</td>
                      <td style={{ border: "1px solid #000", padding: "3px 5px" }}>{invoice.poDate ?? ""}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", borderLeft: "none", padding: "3px 5px" }}>ASN NO</td>
                      <td style={{ border: "1px solid #000", padding: "3px 5px" }}>{invoice.asnNo ?? ""}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Line items */}
        <table style={{ marginBottom: 0 }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={{ width: "4%", textAlign: "center" }}>No.</th>
              <th style={{ width: "30%" }}>Product Description</th>
              <th style={{ width: "10%", textAlign: "center" }}>UOM</th>
              <th style={{ width: "10%", textAlign: "center" }}>Indent Qty</th>
              <th style={{ width: "10%", textAlign: "center" }}>Rec Qty</th>
              <th style={{ width: "10%", textAlign: "center" }}>Rejection</th>
              <th style={{ width: "10%", textAlign: "right" }}>Rate</th>
              <th style={{ width: "10%", textAlign: "right" }}>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td style={{ fontWeight: "bold" }}>{item.itemName}</td>
                <td style={{ textAlign: "center" }}>{item.uom}</td>
                <td style={{ textAlign: "center" }}>{parseFloat(item.qty).toLocaleString("en-IN")}</td>
                <td></td>
                <td></td>
                <td style={{ textAlign: "right" }}>{parseFloat(item.rate).toFixed(2)}</td>
                <td style={{ textAlign: "right" }}>{parseFloat(item.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
            {/* Total row */}
            <tr>
              <td></td>
              <td></td>
              <td></td>
              <td style={{ textAlign: "center", fontWeight: "bold" }}>{totalQty.toLocaleString("en-IN")}</td>
              <td></td>
              <td></td>
              <td></td>
              <td style={{ textAlign: "right", fontWeight: "bold" }}>{totalValue.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer info row */}
        <table style={{ marginBottom: 0 }}>
          <tbody>
            <tr>
              <td style={{ width: "55%", verticalAlign: "top", border: "1px solid #000", borderTop: "none", padding: "4px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }} className="no-border">
                  <tbody>
                    <tr>
                      <td style={{ padding: "2px 0", border: "none" }}>
                        <strong>Vehicle No.-</strong> {invoice.vehicleNo ?? ""}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "2px 0", border: "none" }}>
                        <strong>Driver Name :</strong> {invoice.driverName ?? ""}
                      </td>
                    </tr>
                    {tenant.bankName && (
                      <tr><td style={{ padding: "2px 0", border: "none" }}><strong>Bank Name:-</strong>  {tenant.bankName}</td></tr>
                    )}
                    {tenant.bankAccount && (
                      <tr><td style={{ padding: "2px 0", border: "none" }}><strong>Account  no :-</strong> {tenant.bankAccount}</td></tr>
                    )}
                    {tenant.bankIfsc && (
                      <tr><td style={{ padding: "2px 0", border: "none" }}><strong>IFSC CODE:-</strong> {tenant.bankIfsc}</td></tr>
                    )}
                  </tbody>
                </table>
              </td>
              <td style={{ width: "45%", textAlign: "center", verticalAlign: "middle", border: "1px solid #000", borderTop: "none", borderLeft: "none", padding: "8px", fontWeight: "bold" }}>
                For  {tenant.legalName || tenant.name}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signature footer */}
        <table>
          <tbody>
            <tr>
              <td style={{ textAlign: "center", border: "1px solid #000", borderTop: "none", padding: "6px" }}>
                <strong>Receivers , Signature with Stamp</strong><br />
                Subject to  Jurisdiction
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </>
  );
}
