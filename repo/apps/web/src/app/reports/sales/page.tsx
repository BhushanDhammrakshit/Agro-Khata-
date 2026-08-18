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
import { downloadCsv } from "@/lib/download";

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

  function handleDownload() {
    const headers = ["Invoice No", "Date", "Customer", "Total (₹)", "Paid (₹)", "Balance (₹)", "Status"];
    const data = rows.map((r) => [
      r.invoice_no, r.invoice_date, r.party_name,
      parseFloat(r.total_amount).toFixed(2),
      parseFloat(r.paid_amount).toFixed(2),
      parseFloat(r.balance_amount).toFixed(2),
      formatStatusLabel(r.status),
    ]);
    downloadCsv(`sales-report-${from}-to-${to}.csv`, headers, data);
  }

  return (
    <AppShell title="Sales Report">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <CustomSelect
            value={partyId}
            onChange={setPartyId}
            options={[{ value: "", label: "All customers" }, ...parties.map((p) => ({ value: p.id, label: p.name }))]}
            className="w-48"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-slate-500">Total: <strong className="text-emerald-700">{fmt(String(total))}</strong></span>
            <span className="text-slate-500">Received: <strong className="text-blue-700">{fmt(String(received))}</strong></span>
            <span className="text-slate-500">Balance: <strong className="text-orange-700">{fmt(String(total - received))}</strong></span>
          </div>
          <button onClick={handleDownload}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            ⬇ Excel
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
