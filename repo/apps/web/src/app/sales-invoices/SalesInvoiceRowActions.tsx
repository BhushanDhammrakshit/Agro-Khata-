"use client";

import { useState } from "react";
import { SalesBillPrintModal } from "./[id]/SalesBillPrintModal";
import { shareInvoicePdf } from "@/lib/share-invoice-pdf";

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
  const [shareLabel, setShareLabel] = useState("Share PDF");
  const [isSharing, setIsSharing] = useState(false);

  async function handleShare() {
    try {
      setIsSharing(true);
      setShareLabel("Preparing...");
      const result = await shareInvoicePdf("sales", invoice.id);
      if (result === "shared") {
        setShareLabel("Shared");
      } else if (result === "downloaded") {
        setShareLabel("PDF downloaded");
      } else {
        setShareLabel("Share PDF");
      }
    } catch {
      setShareLabel("Share failed");
    } finally {
      setIsSharing(false);
      window.setTimeout(() => setShareLabel("Share PDF"), 2000);
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
          disabled={isSharing}
          aria-busy={isSharing}
          aria-label="Share invoice"
          title="Share"
          className={compact
            ? "flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            : "cursor-pointer rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"}
        >
          {compact ? (
            isSharing ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 animate-spin" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" opacity="0.25" />
                <path strokeLinecap="round" d="M21 12a9 9 0 0 0-9-9" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 9-18 9 4-9-4-9Zm0 9h9" />
              </svg>
            )
          ) : shareLabel}
        </button>
      </div>
      {showBill && <SalesBillPrintModal invoiceId={invoice.id} onClose={() => setShowBill(false)} />}
    </>
  );
}