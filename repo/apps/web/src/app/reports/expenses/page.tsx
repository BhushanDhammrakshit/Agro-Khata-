"use client";

import { useEffect, useState } from "react";
import { api, ExpenseReportRow } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { tableWrapClass, thClass, tdClass } from "@/components/ui/styles";
import { downloadStyledExcel } from "@/lib/download";

function fmt(v: string) { return "₹" + parseFloat(v).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }
const firstOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

export default function ExpensesReportPage() {
  const [data, setData] = useState<{ rows: ExpenseReportRow[]; categoryTotals: { category: string; total: string }[]; vehicleTotals: { vehicle_id: string; vehicle_no: string; total: string }[] } | null>(null);
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo]     = useState(today());

  useEffect(() => {
    api.getExpensesReport({ from, to }).then(setData).catch(() => null);
  }, [from, to]);

  const grandTotal = data?.categoryTotals.reduce((s, c) => s + parseFloat(c.total), 0) ?? 0;

  function handleDownload() {
    if (!data) return;
    downloadStyledExcel({
      filename: `expense-report-${from}-to-${to}.xlsx`,
      sheetName: "Expense Report",
      title: "Expense Report",
      subtitle: `${from} to ${to}`,
      columns: [
        { header: "Date", key: "date", width: 14, type: "text" },
        { header: "Category", key: "category", width: 18, type: "text" },
        { header: "Description", key: "description", width: 24, type: "text" },
        { header: "Vehicle", key: "vehicle", width: 16, type: "text" },
        { header: "Mode", key: "mode", width: 14, type: "text" },
        { header: "Amount", key: "amount", width: 16, type: "currency" },
      ],
      rows: data.rows.map((r) => ({
        date: r.expense_date,
        category: r.category,
        description: r.description ?? "",
        vehicle: r.vehicle_no ?? "",
        mode: r.payment_mode.replace("_", " "),
        amount: parseFloat(r.amount),
      })),
      totals: { amount: grandTotal },
    });
  }

  return (
    <AppShell title="Expense Report">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <button onClick={handleDownload}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
          Export Excel
        </button>
      </div>

      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Category breakdown */}
            <Card>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">By Category</h2>
              <div className="divide-y divide-slate-100">
                {data.categoryTotals.map(c => (
                  <div key={c.category} className="flex justify-between py-2 text-sm">
                    <span className="text-slate-700">{c.category}</span>
                    <span className="font-medium text-slate-900">{fmt(c.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 text-sm font-semibold">
                  <span>Total</span>
                  <span className="text-red-600">{fmt(String(grandTotal))}</span>
                </div>
              </div>
            </Card>

            {/* Vehicle breakdown */}
            {data.vehicleTotals.length > 0 && (
              <Card>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">By Vehicle</h2>
                <div className="divide-y divide-slate-100">
                  {data.vehicleTotals.map(v => (
                    <div key={v.vehicle_id} className="flex justify-between py-2 text-sm">
                      <span className="text-slate-700">{v.vehicle_no}</span>
                      <span className="font-medium text-slate-900">{fmt(v.total)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Detailed list */}
          <div className={tableWrapClass}>
            <table className="w-full text-sm">
              <thead><tr>
                {["Date", "Category", "Description", "Vehicle", "Mode", "Amount"].map(h => <th key={h} className={thClass}>{h}</th>)}
              </tr></thead>
              <tbody>
                {data.rows.length === 0 && <tr><td colSpan={6} className={tdClass + " text-center text-slate-400"}>No expenses</td></tr>}
                {data.rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className={tdClass}>{r.expense_date}</td>
                    <td className={tdClass}>{r.category}</td>
                    <td className={tdClass}>{r.description ?? "—"}</td>
                    <td className={tdClass}>{r.vehicle_no ?? "—"}</td>
                    <td className={tdClass + " capitalize"}>{r.payment_mode.replace("_", " ")}</td>
                    <td className={tdClass + " font-medium text-right"}>{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
