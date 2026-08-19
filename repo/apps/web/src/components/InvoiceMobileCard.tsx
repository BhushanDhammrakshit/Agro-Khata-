import Link from "next/link";
import type { ReactNode } from "react";
import type { Invoice } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { INVOICE_STATUS_TONE, formatStatusLabel } from "@/lib/status";

function formatAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "₹0.00";
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).format(
    new Date(year, month - 1, day),
  );
}

interface InvoiceMobileCardProps {
  invoice: Invoice;
  href: string;
  partyLabel: string;
  actions: ReactNode;
}

export function InvoiceMobileCard({ invoice, href, partyLabel, actions }: InvoiceMobileCardProps) {
  return (
    <article className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={href}
        aria-label={`Open invoice ${invoice.invoiceNo}`}
        className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{partyLabel}</p>
          <p className="mt-0.5 truncate text-lg font-semibold text-slate-900">
            {invoice.partyName || "Not specified"}
          </p>
          <div className="mt-2">
            <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{formatStatusLabel(invoice.status)}</Badge>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-emerald-700">{invoice.invoiceNo}</p>
          <p className="mt-1 text-sm text-slate-400">{formatDate(invoice.invoiceDate)}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 items-end gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">Total</p>
          <p className="mt-1 whitespace-nowrap text-base font-semibold text-slate-800 min-[400px]:text-lg">{formatAmount(invoice.totalAmount)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">Balance</p>
          <p className="mt-1 whitespace-nowrap text-base font-semibold text-slate-800 min-[400px]:text-lg">{formatAmount(invoice.balanceAmount)}</p>
        </div>
        <div className="relative z-20 col-span-2 justify-self-end min-[360px]:col-span-1">{actions}</div>
      </div>
    </article>
  );
}