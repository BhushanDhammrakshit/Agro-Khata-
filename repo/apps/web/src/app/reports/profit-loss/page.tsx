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

function pct(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

const firstOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

const Icon = {
  Revenue: <path d="M12 8c-2.2 0-4 1.3-4 3s1.8 3 4 3 4 1.3 4 3-1.8 3-4 3m0-12V5m0 3v9m0 3v-3m0 0c-2.2 0-4-1.3-4-3" />,
  Cost:    <><path d="M20 7l-8-4-8 4m16 0v10l-8 4m0-14v14m-8-4l8 4m-8-14v10" /></>,
  Gross:   <path d="M4 15l4-4 3 3 6-7m0 0h-4m4 0v4" />,
  Expense: <><path d="M3 10h18M7 15h.01M11 15h2m-7 5h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2Z" /></>,
  Net:     <><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
};

function SvgIcon({ d }: { d: React.ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {d}
    </svg>
  );
}

function ProgressBar({ percent, tone }: { percent: number; tone: "emerald" | "rose" }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${tone === "emerald" ? "bg-emerald-500" : "bg-rose-500"}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export default function ProfitLossPage() {
  const [data, setData]   = useState<ProfitLoss | null>(null);
  const [from, setFrom]   = useState(firstOfMonth());
  const [to, setTo]       = useState(today());

  useEffect(() => {
    api.getProfitLoss({ from, to }).then(setData).catch(() => null);
  }, [from, to]);

  const rows = data ? [
    { label: "Revenue (Sales)",      value: data.revenue,      color: "text-emerald-700 dark:text-emerald-400", bold: false },
    { label: "Cost of Goods (Purchases)", value: -data.costOfGoods, color: "text-red-600 dark:text-red-400", bold: false },
    { label: "Gross Profit",         value: data.grossProfit,  color: data.grossProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400", bold: true },
    { label: "Operating Expenses",   value: -data.expenses,    color: "text-red-600 dark:text-red-400", bold: false },
    { label: "Net Profit",           value: data.netProfit,    color: data.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400", bold: true },
  ] : [];

  const kpiCards = data ? [
    { label: "Revenue",          value: data.revenue,      icon: Icon.Revenue, tone: "emerald" as const },
    { label: "Cost of Goods",    value: data.costOfGoods,  icon: Icon.Cost,    tone: "rose" as const },
    { label: "Gross Profit",     value: data.grossProfit,  icon: Icon.Gross,   tone: data.grossProfit >= 0 ? "emerald" as const : "rose" as const },
    { label: "Operating Expenses", value: data.expenses,   icon: Icon.Expense, tone: "rose" as const },
    { label: "Net Profit",       value: data.netProfit,    icon: Icon.Net,     tone: data.netProfit >= 0 ? "emerald" as const : "rose" as const },
  ] : [];

  const costPct = data ? pct(data.costOfGoods, data.revenue) : 0;
  const expensePct = data ? pct(data.expenses, data.revenue) : 0;
  const netPct = data ? Math.max(0, 100 - costPct - expensePct) : 0;

  return (
    <AppShell title="Profit & Loss">
      <div className="mb-6">
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>

      {data && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {kpiCards.map((c) => (
              <Card key={c.label} className={`border-l-4 ${c.tone === "emerald" ? "border-l-emerald-500" : "border-l-rose-500"}`}>
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.tone === "emerald" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"}`}>
                    <SvgIcon d={c.icon} />
                  </span>
                  <p className="text-xs font-medium text-slate-500">{c.label}</p>
                </div>
                <p className={`mt-2 break-words text-xl font-semibold ${c.tone === "emerald" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {fmt(c.value)}
                </p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue breakdown bar */}
            <Card>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Revenue Breakdown</h2>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-rose-400" style={{ width: `${costPct}%` }} title="Cost of Goods" />
                <div className="h-full bg-amber-400" style={{ width: `${expensePct}%` }} title="Operating Expenses" />
                <div className="h-full bg-emerald-500" style={{ width: `${netPct}%` }} title="Net Profit" />
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" />Cost of Goods</span>
                  <span className="font-medium text-slate-700">{costPct.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Operating Expenses</span>
                  <span className="font-medium text-slate-700">{expensePct.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Net Profit</span>
                  <span className="font-medium text-slate-700">{netPct.toFixed(1)}%</span>
                </div>
              </div>
            </Card>

            {/* Statement */}
            <Card>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">P&amp;L Statement</h2>
              <div className="divide-y divide-slate-100">
                {rows.map(r => (
                  <div key={r.label} className={`flex justify-between py-2.5 ${r.bold ? "font-semibold" : ""}`}>
                    <span className="text-slate-700">{r.label}</span>
                    <span className={r.color}>{fmt(r.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Margins */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <p className="text-xs font-medium text-slate-500">Gross Margin</p>
              <p className={`mt-1 text-2xl font-semibold ${data.revenue > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"}`}>
                {data.revenue > 0 ? pct(data.grossProfit, data.revenue).toFixed(1) + "%" : "—"}
              </p>
              {data.revenue > 0 && <ProgressBar percent={pct(data.grossProfit, data.revenue)} tone={data.grossProfit >= 0 ? "emerald" : "rose"} />}
            </Card>
            <Card>
              <p className="text-xs font-medium text-slate-500">Net Margin</p>
              <p className={`mt-1 text-2xl font-semibold ${data.revenue > 0 ? (data.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400") : "text-slate-400"}`}>
                {data.revenue > 0 ? pct(data.netProfit, data.revenue).toFixed(1) + "%" : "—"}
              </p>
              {data.revenue > 0 && <ProgressBar percent={pct(data.netProfit, data.revenue)} tone={data.netProfit >= 0 ? "emerald" : "rose"} />}
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
