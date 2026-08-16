"use client";

import { useEffect, useState } from "react";
import { api, ExpenseReportRow } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { tableWrapClass, thClass, tdClass } from "@/components/ui/styles";

function fmt(v: string) { return "₹" + parseFloat(v).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }
const firstOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

export default function ExpensesReportPage() {
  const [data, setData] = useState<{ rows: ExpenseReportRow[]; categoryTotals: { category: string; total: string }[] } | null>(null);
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo]     = useState(today());

  useEffect(() => {
    api.getExpensesReport({ from, to }).then(setData).catch(() => null);
  }, [from, to]);

  const grandTotal = data?.categoryTotals.reduce((s, c) => s + parseFloat(c.total), 0) ?? 0;

  return (
    <AppShell title="Expense Report">
      <div className="mb-6">
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>

      {data && (
        <div className="grid gap-6 lg:grid-cols-3">
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

          {/* Detailed list */}
          <div className="lg:col-span-2">
            <div className={tableWrapClass}>
              <table className="w-full text-sm">
                <thead><tr>
                  {["Date", "Category", "Description", "Mode", "Amount"].map(h => <th key={h} className={thClass}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.rows.length === 0 && <tr><td colSpan={5} className={tdClass + " text-center text-slate-400"}>No expenses</td></tr>}
                  {data.rows.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className={tdClass}>{r.expense_date}</td>
                      <td className={tdClass}>{r.category}</td>
                      <td className={tdClass}>{r.description ?? "—"}</td>
                      <td className={tdClass + " capitalize"}>{r.payment_mode.replace("_", " ")}</td>
                      <td className={tdClass + " font-medium text-right"}>{fmt(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
