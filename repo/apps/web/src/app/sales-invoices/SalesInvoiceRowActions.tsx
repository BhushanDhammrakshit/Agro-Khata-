"use client";

import { useEffect, useRef, useState } from "react";
import { SalesBillPrintModal } from "./[id]/SalesBillPrintModal";
import { downloadInvoicePdf, prefetchInvoicePdf, shareInvoicePdf } from "@/lib/invoice-pdf";

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
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Warm the PDF cache once the row scrolls into view — gives mobile taps (which lack hover and
  // barely precede touchstart) a much bigger head start than touchstart alone, so navigator.share()
  // is more likely to run against an already-resolved PDF instead of racing the transient
  // user-activation window against a slow render. See kag-mall-web-notes.md.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        prefetchInvoicePdf("sales", invoice.id);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [invoice.id]);

  async function handleDownload() {
    try {
      setIsDownloading(true);
      await downloadInvoicePdf("sales", invoice.id);
    } catch {
      // Nothing actionable for the user here; the row stays interactive.
    } finally {
      setIsDownloading(false);
    }
  }

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
      <div ref={containerRef} className="flex min-w-max items-center gap-2">
        <button
          type="button"
          onClick={() => setShowBill(true)}
          aria-label="Preview and print invoice"
          title="Preview / print"
          className={compact
            ? "flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            : "cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"}
        >
          {compact ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
            </svg>
          ) : "Print"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          aria-busy={isDownloading}
          aria-label="Download invoice PDF"
          title="Download PDF"
          className={compact
            ? "flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            : "cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"}
        >
          {compact ? (
            isDownloading ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 animate-spin" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" opacity="0.25" />
                <path strokeLinecap="round" d="M21 12a9 9 0 0 0-9-9" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            )
          ) : isDownloading ? "Preparing..." : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          onMouseEnter={() => prefetchInvoicePdf("sales", invoice.id)}
          onFocus={() => prefetchInvoicePdf("sales", invoice.id)}
          onTouchStart={() => prefetchInvoicePdf("sales", invoice.id)}
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