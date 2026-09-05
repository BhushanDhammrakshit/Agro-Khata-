"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Party, ReportInvoiceRow } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/Badge";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { tableWrapClass, thClass, tdClass } from "@/components/ui/styles";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { INVOICE_STATUS_TONE, formatStatusLabel } from "@/lib/status";
import { downloadStyledExcel } from "@/lib/download";
import { formatCompactINR, formatINR } from "@/lib/currency";

function fmt(v: string) { return "₹" + parseFloat(v).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }

const firstOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

export default function SalesReportPage() {
  const [rows, setRows] = useState<ReportInvoiceRow[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [from, setFrom]       = useState(firstOfMonth());
  const [to, setTo]           = useState(today());
  const [partyId, setPartyId] = useState("");

  useEffect(() => {
    api.listParties("customer").then(setParties).catch(() => null);
  }, []);

  useEffect(() => {
    api.getSalesReport({ from, to, partyId: partyId || undefined }).then(setRows).catch(() => null);
  }, [from, to, partyId]);

  const total    = rows.reduce((s, r) => s + parseFloat(r.total_amount), 0);
  const received = rows.reduce((s, r) => s + parseFloat(r.paid_amount), 0);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    try {
      setDownloading(true);
      await downloadStyledExcel({
      filename: `sales-report-${from}-to-${to}.xlsx`,
      sheetName: "Sales Report",
      title: "Sales Report",
      subtitle: `${from} to ${to}${partyId ? ` — ${parties.find((p) => p.id === partyId)?.name ?? ""}` : ""}`,
      columns: [
        { header: "Invoice No", key: "invoiceNo", width: 16, type: "text" },
        { header: "Date", key: "date", width: 14, type: "text" },
        { header: "Customer", key: "customer", width: 24, type: "text" },
        { header: "Total", key: "total", width: 16, type: "currency" },
        { header: "Paid", key: "paid", width: 16, type: "currency" },
        { header: "Balance", key: "balance", width: 16, type: "currency" },
        { header: "Status", key: "status", width: 14, type: "text" },
      ],
      rows: rows.map((r) => ({
        invoiceNo: r.invoice_no,
        date: r.invoice_date,
        customer: r.party_name,
        total: parseFloat(r.total_amount),
        paid: parseFloat(r.paid_amount),
        balance: parseFloat(r.balance_amount),
        status: formatStatusLabel(r.status),
      })),
      totals: { total, paid: received, balance: total - received },
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AppShell title="Sales Report">
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <div className="sm:w-48">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Customer</label>
            <CustomSelect
              value={partyId}
              onChange={setPartyId}
              options={[{ value: "", label: "All customers" }, ...parties.map((p) => ({ value: p.id, label: p.name }))]}
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-slate-500">Total <strong className="ml-1 text-emerald-700" title={formatINR(total)}>{formatCompactINR(total)}</strong></span>
            <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-slate-500">Received <strong className="ml-1 text-blue-700" title={formatINR(received)}>{formatCompactINR(received)}</strong></span>
            <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-slate-500">Balance <strong className="ml-1 text-orange-700" title={formatINR(total - received)}>{formatCompactINR(total - received)}</strong></span>
          </div>
          <button onClick={handleDownload} disabled={downloading} aria-busy={downloading}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            {downloading ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" opacity="0.25" />
                <path strokeLinecap="round" d="M21 12a9 9 0 0 0-9-9" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
            )}
            {downloading ? "Preparing..." : "Export Excel"}
          </button>
        </div>
      </div>

      <div className={tableWrapClass}>
        <table className="w-full text-sm">
          <thead><tr>
            {["Invoice No", "Date", "Customer", "Total", "Paid", "Balance", "Status"].map(h => <th key={h} className={thClass}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className={tdClass + " text-center text-slate-400"}>No sales in this period</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={tdClass}><Link href={`/sales-invoices/${r.id}`} className="text-emerald-700 hover:underline">{r.invoice_no}</Link></td>
                <td className={tdClass}>{r.invoice_date}</td>
                <td className={tdClass}>{r.party_name}</td>
                <td className={tdClass}>{fmt(r.total_amount)}</td>
                <td className={tdClass}>{fmt(r.paid_amount)}</td>
                <td className={tdClass}>{fmt(r.balance_amount)}</td>
                <td className={tdClass}><Badge tone={INVOICE_STATUS_TONE[r.status as keyof typeof INVOICE_STATUS_TONE] ?? "slate"}>{formatStatusLabel(r.status)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
