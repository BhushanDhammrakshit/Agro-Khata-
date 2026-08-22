"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SalesBillPrintModal } from "./[id]/SalesBillPrintModal";
import { downloadInvoicePdf, prefetchInvoicePdf, shareInvoicePdf } from "@/lib/invoice-pdf";
import { api, ApiError } from "@/lib/api";
import { ActionsMenu, ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface SalesInvoiceRowActionsProps {
  invoice: {
    id: string;
    invoiceNo: string;
    totalAmount: string;
    status: string;
  };
  compact?: boolean;
}

const PrintIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
  </svg>
);
const ShareIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 9-18 9 4-9-4-9Zm0 9h9" />
  </svg>
);
const EditIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5m-1.5-9.5a2.121 2.121 0 0 1 3 3L12 13l-4 1 1-4 8.5-8.5Z" />
  </svg>
);
const DeleteIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
  </svg>
);

export function SalesInvoiceRowActions({ invoice, compact = false }: SalesInvoiceRowActionsProps) {
  const router = useRouter();
  const [showBill, setShowBill] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share PDF");
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const canEdit = invoice.status !== "paid" && invoice.status !== "partially_paid" && invoice.status !== "cancelled";
  const canDelete = invoice.status !== "paid" && invoice.status !== "partially_paid";

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

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteSalesInvoice(invoice.id);
      setConfirmingDelete(false);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete invoice.");
    } finally {
      setDeleting(false);
    }
  }

  const menuItems: ActionsMenuItem[] = [
    { key: "print", label: "Print", icon: PrintIcon, onClick: () => setShowBill(true) },
    { key: "share", label: isSharing ? "Preparing…" : shareLabel, icon: ShareIcon, onClick: handleShare, disabled: isSharing },
    ...(canEdit ? [{ key: "edit", label: "Edit", icon: EditIcon, onClick: () => router.push(`/sales-invoices/${invoice.id}/edit`) }] : []),
    ...(canDelete ? [{ key: "delete", label: "Delete", icon: DeleteIcon, tone: "danger" as const, onClick: () => setConfirmingDelete(true) }] : []),
  ];

  return (
    <>
      <div ref={containerRef} className="flex min-w-max items-center gap-2">
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
        <ActionsMenu items={menuItems} />
      </div>
      {showBill && <SalesBillPrintModal invoiceId={invoice.id} onClose={() => setShowBill(false)} />}
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete invoice"
        message={deleteError ?? `Delete invoice ${invoice.invoiceNo}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setConfirmingDelete(false); setDeleteError(null); }}
      />
    </>
  );
}
