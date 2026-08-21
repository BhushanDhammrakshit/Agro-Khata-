"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Party, PurchasePaymentInvoiceRow } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { tableWrapClass, thClass, tdClass } from "@/components/ui/styles";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Badge } from "@/components/ui/Badge";
import { INVOICE_STATUS_TONE, formatStatusLabel } from "@/lib/status";
import { buildPaymentsStatementHtml } from "@/lib/bill-templates/payments-statement";
import { downloadHtmlAsPdf } from "@/lib/invoice-pdf";

function fmt(v: string) { return "₹" + parseFloat(v).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }
const firstOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

export default function PurchasePaymentsReportPage() {
  const [invoices, setInvoices] = useState<PurchasePaymentInvoiceRow[]>([]);
  const [parties, setParties]   = useState<Party[]>([]);
  const [from, setFrom]         = useState(firstOfMonth());
  const [to, setTo]             = useState(today());
  const [partyId, setPartyId]   = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.listParties("supplier").then(setParties).catch(() => null);
  }, []);

  useEffect(() => {
    api.getPurchasePaymentsReport({ from, to, partyId: partyId || undefined })
      .then((res) => setInvoices(res.invoices))
      .catch(() => null);
  }, [from, to, partyId]);

  const partyName = partyId ? parties.find((p) => p.id === partyId)?.name : undefined;

  async function handleDownload() {
    const tenant = await api.getMyTenant().catch(() => null);
    if (!tenant) return;
    setDownloading(true);
    try {
      const html = buildPaymentsStatementHtml(invoices, tenant, partyName, from, to);
      const fileName = `Purchase Payments ${from} to ${to}${partyName ? ` - ${partyName}` : ""}.pdf`;
      await downloadHtmlAsPdf(html, fileName, "portrait", 10);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AppShell title="Purchase Payments Report">
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <div className="sm:w-56">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Supplier</label>
            <CustomSelect
              value={partyId}
              onChange={setPartyId}
              options={[{ value: "", label: "All suppliers" }, ...parties.map((p) => ({ value: p.id, label: p.name }))]}
              className="w-full"
            />
          </div>
          <button onClick={handleDownload} disabled={downloading}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5" />
              <path d="M4 14.5v1A1.5 1.5 0 005.5 17h9a1.5 1.5 0 001.5-1.5v-1" />
            </svg>
            {downloading ? "Preparing…" : "Download Report"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {invoices.map((inv) => (
          <article key={inv.invoice_id} className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <Link href={`/purchase-invoices/${inv.invoice_id}`} aria-label={`Open invoice ${inv.invoice_no}`}
              className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">Supplier</p>
                <p className="mt-0.5 truncate text-lg font-semibold text-slate-900">{inv.party_name || "Not specified"}</p>
                <div className="mt-2"><Badge tone={INVOICE_STATUS_TONE[inv.status as keyof typeof INVOICE_STATUS_TONE]}>{formatStatusLabel(inv.status)}</Badge></div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-emerald-700">{inv.invoice_no}</p>
                <p className="mt-1 text-sm text-slate-400">{inv.invoice_date?.slice(0, 10)}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 items-end gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">Total</p>
                <p className="mt-1 whitespace-nowrap text-base font-semibold text-slate-800">{fmt(inv.total_amount)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">Paid</p>
                <p className="mt-1 whitespace-nowrap text-base font-semibold text-slate-800">{fmt(inv.paid_amount)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">Balance</p>
                <p className="mt-1 whitespace-nowrap text-base font-semibold text-slate-800">{fmt(inv.balance_amount)}</p>
              </div>
            </div>
          </article>
        ))}
        {invoices.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">No invoices in this period.</p>}
      </div>

      <div className={`${tableWrapClass} hidden sm:block`}>
        <table className="w-full text-sm">
          <thead><tr>
            {(partyName ? ["Invoice No", "Invoice Date", "Status", "Total", "Paid", "Balance"] : ["Invoice No", "Supplier", "Invoice Date", "Status", "Total", "Paid", "Balance"])
              .map((h) => <th key={h} className={thClass}>{h}</th>)}
          </tr></thead>
          <tbody>
            {invoices.length === 0 && <tr><td colSpan={partyName ? 6 : 7} className={tdClass + " text-center text-slate-400"}>No invoices in this period</td></tr>}
            {invoices.map((inv) => (
              <tr key={inv.invoice_id} className="hover:bg-slate-50">
                <td className={tdClass}><Link href={`/purchase-invoices/${inv.invoice_id}`} className="text-emerald-700 hover:underline">{inv.invoice_no}</Link></td>
                {!partyName && <td className={tdClass}>{inv.party_name}</td>}
                <td className={tdClass}>{inv.invoice_date?.slice(0, 10)}</td>
                <td className={tdClass}>{inv.status.replace("_", " ")}</td>
                <td className={tdClass}>{fmt(inv.total_amount)}</td>
                <td className={tdClass}>{fmt(inv.paid_amount)}</td>
                <td className={tdClass}>{fmt(inv.balance_amount)}</td>
              </tr>
            ))}
          </tbody>
          {invoices.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={partyName ? 3 : 4} className={tdClass + " text-right font-semibold"}>Total</td>
                <td className={tdClass + " font-semibold"}>{fmt(String(invoices.reduce((s, i) => s + parseFloat(i.total_amount), 0)))}</td>
                <td className={tdClass + " font-semibold"}>{fmt(String(invoices.reduce((s, i) => s + parseFloat(i.paid_amount), 0)))}</td>
                <td className={tdClass + " font-semibold"}>{fmt(String(invoices.reduce((s, i) => s + parseFloat(i.balance_amount), 0)))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </AppShell>
  );
}
