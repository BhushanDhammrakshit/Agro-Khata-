"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ReportInvoiceRow } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/Badge";
import { tableWrapClass, thClass, tdClass } from "@/components/ui/styles";
import { INVOICE_STATUS_TONE, formatStatusLabel } from "@/lib/status";
import { formatCompactINR, formatINR } from "@/lib/currency";

function fmt(v: string) { return "₹" + parseFloat(v).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }

function OutstandingReport() {
  const sp = useSearchParams();
  const [type, setType] = useState<"receivable" | "payable">((sp.get("type") as "receivable" | "payable") ?? "receivable");
  const [rows, setRows] = useState<ReportInvoiceRow[]>([]);

  useEffect(() => {
    api.getOutstandingReport(type).then(setRows).catch(() => null);
  }, [type]);

  const total = rows.reduce((s, r) => s + parseFloat(r.balance_amount), 0);

  return (
    <AppShell title="Outstanding Report">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden text-sm">
          {(["receivable", "payable"] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`cursor-pointer px-3 py-2 font-medium capitalize transition-colors sm:px-4 ${type === t ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              <span className="hidden sm:inline">{t === "receivable" ? "Receivable (from customers)" : "Payable (to suppliers)"}</span>
              <span className="sm:hidden">{t === "receivable" ? "Receivable" : "Payable"}</span>
            </button>
          ))}
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Outstanding: <span className={type === "receivable" ? "text-blue-700" : "text-orange-700"} title={formatINR(total)}>{formatCompactINR(total)}</span>
        </p>
      </div>

      <div className={tableWrapClass}>
        <table className="w-full text-sm">
          <thead><tr>
            {["Invoice No", "Date", "Due Date", type === "receivable" ? "Customer" : "Supplier", "Total", "Paid", "Balance", "Status"].map(h =>
              <th key={h} className={thClass}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className={tdClass + " text-center text-slate-400"}>No outstanding {type}s</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className={`hover:bg-slate-50 ${r.is_overdue ? "bg-red-50 dark:bg-red-950/30" : ""}`}>
                <td className={tdClass}>
                  <Link href={`/${type === "receivable" ? "sales" : "purchase"}-invoices/${r.id}`} className="text-emerald-700 hover:underline">{r.invoice_no}</Link>
                </td>
                <td className={tdClass}>{r.invoice_date}</td>
                <td className={tdClass}>
                  {r.due_date ? <span className={r.is_overdue ? "text-red-600 font-medium" : ""}>{r.due_date}</span> : "—"}
                </td>
                <td className={tdClass}>{r.party_name}</td>
                <td className={tdClass}>{fmt(r.total_amount)}</td>
                <td className={tdClass}>{fmt(r.paid_amount)}</td>
                <td className={tdClass + " font-medium"}>{fmt(r.balance_amount)}</td>
                <td className={tdClass}><Badge tone={INVOICE_STATUS_TONE[r.status as keyof typeof INVOICE_STATUS_TONE] ?? "slate"}>{formatStatusLabel(r.status)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export default function OutstandingReportPage() {
  return (
    <Suspense>
      <OutstandingReport />
    </Suspense>
  );
}
