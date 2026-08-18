"use client";

import { useEffect, useState } from "react";
import { api, ProfitLoss } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { DateRangeFilter } from "@/components/DateRangeFilter";

function fmt(v: number) {
  const abs = Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  return (v < 0 ? "-₹" : "₹") + abs;
}

const firstOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

export default function ProfitLossPage() {
  const [data, setData]   = useState<ProfitLoss | null>(null);
  const [from, setFrom]   = useState(firstOfMonth());
  const [to, setTo]       = useState(today());

  useEffect(() => {
    api.getProfitLoss({ from, to }).then(setData).catch(() => null);
  }, [from, to]);

  const rows = data ? [
    { label: "Revenue (Sales)",      value: data.revenue,      color: "text-emerald-700", bold: false },
    { label: "Cost of Goods (Purchases)", value: -data.costOfGoods, color: "text-red-600", bold: false },
    { label: "Gross Profit",         value: data.grossProfit,  color: data.grossProfit >= 0 ? "text-emerald-700" : "text-red-600", bold: true },
    { label: "Operating Expenses",   value: -data.expenses,    color: "text-red-600", bold: false },
    { label: "Net Profit",           value: data.netProfit,    color: data.netProfit >= 0 ? "text-emerald-700" : "text-red-600", bold: true },
  ] : [];

  return (
    <AppShell title="Profit & Loss">
      <div className="mb-6">
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>

      {data && (
        <div className="mx-auto max-w-lg">
          <Card>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">P&amp;L Statement</h2>
            <div className="divide-y divide-slate-100">
              {rows.map(r => (
                <div key={r.label} className={`flex justify-between py-3 ${r.bold ? "font-semibold" : ""}`}>
                  <span className="text-slate-700">{r.label}</span>
                  <span className={r.color}>{fmt(r.value)}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <p className="text-xs text-slate-500">Gross Margin</p>
              <p className={`mt-1 text-2xl font-semibold ${data.revenue > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                {data.revenue > 0 ? ((data.grossProfit / data.revenue) * 100).toFixed(1) + "%" : "—"}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Net Margin</p>
              <p className={`mt-1 text-2xl font-semibold ${data.revenue > 0 ? (data.netProfit >= 0 ? "text-emerald-700" : "text-red-600") : "text-slate-400"}`}>
                {data.revenue > 0 ? ((data.netProfit / data.revenue) * 100).toFixed(1) + "%" : "—"}
              </p>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
