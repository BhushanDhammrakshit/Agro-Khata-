"use client";

import { useState } from "react";
import { SalesBillPrintModal } from "./[id]/SalesBillPrintModal";

interface SalesInvoiceRowActionsProps {
  invoice: {
    id: string;
    invoiceNo: string;
    totalAmount: string;
  };
  compact?: boolean;
}

export function SalesInvoiceRowActions({ invoice, compact = false }: SalesInvoiceRowActionsProps) {
  const [showBill, setShowBill] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");

  async function handleShare() {
    const url = `${window.location.origin}/sales-invoices/${invoice.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNo}`,
          text: `Invoice ${invoice.invoiceNo} - ₹${invoice.totalAmount}`,
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
              <path strokeLinecap="round" strokeLinejoin="round" d="m15 8 4-4m0 0 4 4m-4-4v13M15 6H7a4 4 0 0 0-4 4v7a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4" />
            </svg>
          ) : shareLabel}
        </button>
      </div>
      {showBill && <SalesBillPrintModal invoiceId={invoice.id} onClose={() => setShowBill(false)} />}
    </>
  );
}