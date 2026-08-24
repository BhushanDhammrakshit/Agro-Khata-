"use client";

import { useEffect, useState } from "react";
import { api, StockSummaryRow } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/Badge";
import { tableWrapClass, thClass, tdClass } from "@/components/ui/styles";

function fmtN(v: string | undefined) {
  if (!v) return "—";
  return parseFloat(v).toLocaleString("en-IN", { maximumFractionDigits: 3 });
}
function fmtC(v: string | undefined) {
  if (!v) return "—";
  return "₹" + parseFloat(v).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

export default function StockSummaryPage() {
  const [rows, setRows] = useState<StockSummaryRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { api.getStockSummary().then(setRows).catch(() => null); }, []);

  const filtered = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  const lowCount = rows.filter(r => r.is_low_stock).length;

  return (
    <AppShell title="Stock Summary">
      <div className="mb-4 flex items-center justify-between gap-4">
        <input placeholder="Search item..." value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 w-56" />
        {lowCount > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            {lowCount} item{lowCount > 1 ? "s" : ""} below reorder level
          </span>
        )}
      </div>

      <div className={tableWrapClass}>
        <table className="w-full text-sm">
          <thead><tr>
            {["Item", "UOM", "Opening Stock", "Current Stock", "Sale Price", "Purchase Rate", "Alert Qty", ""].map(h =>
              <th key={h} className={thClass}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} className={tdClass + " text-center text-slate-400"}>No items found</td></tr>}
            {filtered.map(r => (
              <tr key={r.id} className={`hover:bg-slate-50 ${r.is_low_stock ? "bg-red-50 dark:bg-red-950/30" : ""}`}>
                <td className={tdClass + " font-medium"}>{r.name}</td>
                <td className={tdClass}>{r.uom}</td>
                <td className={tdClass}>{fmtN(r.opening_stock)}</td>
                <td className={tdClass + " font-semibold"}>{fmtN(r.current_stock)}</td>
                <td className={tdClass}>{fmtC(r.sale_price)}</td>
                <td className={tdClass}>{fmtC(r.default_rate)}</td>
                <td className={tdClass}>{r.low_stock_alert_qty ? fmtN(r.low_stock_alert_qty) : "—"}</td>
                <td className={tdClass}>
                  {r.is_low_stock && <Badge tone="red">Low Stock</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
