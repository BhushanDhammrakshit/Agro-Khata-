"use client";

import { useState } from "react";
import { BillPrintModal } from "./[id]/BillPrintModal";

interface PurchaseInvoiceRowActionsProps {
  invoice: {
    id: string;
    invoiceNo: string;
    totalAmount: string;
  };
  compact?: boolean;
}

export function PurchaseInvoiceRowActions({ invoice, compact = false }: PurchaseInvoiceRowActionsProps) {
  const [showBill, setShowBill] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");

  async function handleShare() {
    const url = `${window.location.origin}/purchase-invoices/${invoice.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Bill ${invoice.invoiceNo}`,
          text: `Bill ${invoice.invoiceNo} - ₹${invoice.totalAmount}`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareLabel("Link copied");
      window.setTimeout(() => setShareLabel("Share"), 2000);
    } catch {
      // The user cancelled sharing or clipboard access was unavailable.
    }
  }

  return (
    <>
      <div className="flex min-w-max items-center gap-2">
        <button
          type="button"
          onClick={() => setShowBill(true)}
          aria-label="Print or download invoice"
          title="Print or download"
          className={compact
            ? "flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            : "cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"}
        >
          {compact ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
            </svg>
          ) : "Print / Download"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share invoice"
          title="Share"
          className={compact
            ? "flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            : "cursor-pointer rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"}
        >
          {compact ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 9-18 9 4-9-4-9Zm0 9h9" />
            </svg>
          ) : shareLabel}
        </button>
      </div>
      {showBill && <BillPrintModal invoiceId={invoice.id} onClose={() => setShowBill(false)} />}
    </>
  );
}