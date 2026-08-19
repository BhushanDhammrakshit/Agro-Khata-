"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, Driver, Invoice, TenantSummary, Party } from "@/lib/api";
import { SALES_BILL_CSS, buildSalesBillBody, buildSalesBillHtml } from "@/lib/bill-templates/sales-bill";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";

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
  const [driver, setDriver]   = useState<Driver | undefined>();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([api.getSalesInvoice(invoiceId), api.getMyTenant()])
      .then(async ([inv, ten]) => {
        setInvoice(inv);
        setTenant(ten);
        const [invoiceParty, drivers] = await Promise.all([
          api.getParty(inv.partyId),
          api.listDrivers().catch(() => []),
        ]);
        setParty(invoiceParty);
        setDriver(drivers.find((item) => item.id === inv.driverId));
      })
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
    printViaIframe(buildSalesBillHtml(invoice, tenant, party, driver));
  }

  async function handleDownload() {
    try {
      setDownloading(true);
      await downloadInvoicePdf("sales", invoiceId);
    } catch {
      // Preview stays open so the user can retry or print instead.
    } finally {
      setDownloading(false);
    }
  }

  return createPortal(
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
              onClick={handleDownload}
              disabled={loading || !invoice || downloading}
              aria-busy={downloading}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" opacity="0.25" />
                  <path strokeLinecap="round" d="M21 12a9 9 0 0 0-9-9" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
              )}
              {downloading ? "Preparing..." : "Download PDF"}
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
              <style>{SALES_BILL_CSS}</style>
              <div dangerouslySetInnerHTML={{ __html: buildSalesBillBody(invoice, tenant, party, driver) }} />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
