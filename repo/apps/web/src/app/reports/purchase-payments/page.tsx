"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Party, PurchasePaymentReportRow } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { tableWrapClass, thClass, tdClass } from "@/components/ui/styles";
import { CustomSelect } from "@/components/ui/CustomSelect";

function fmt(v: string) { return "₹" + parseFloat(v).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }
const firstOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

export default function PurchasePaymentsReportPage() {
  const [rows, setRows]       = useState<PurchasePaymentReportRow[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [from, setFrom]       = useState(firstOfMonth());
  const [to, setTo]           = useState(today());
  const [partyId, setPartyId] = useState("");

  useEffect(() => {
    api.listParties("supplier").then(setParties).catch(() => null);
  }, []);

  useEffect(() => {
    api.getPurchasePaymentsReport({ from, to, partyId: partyId || undefined }).then(setRows).catch(() => null);
  }, [from, to, partyId]);

  const total = rows.reduce((s, r) => s + parseFloat(r.amount), 0);

  return (
    <AppShell title="Purchase Payments Report">
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
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
          <button onClick={() => window.print()}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            🖨 Print
          </button>
        </div>
      </div>

      <div className="mb-4 hidden print:block">
        <h1 className="text-lg font-bold">Purchase Payments — {from} to {to}</h1>
        {partyId && <p className="text-sm">Supplier: {parties.find((p) => p.id === partyId)?.name}</p>}
      </div>

      <div className={tableWrapClass}>
        <table className="w-full text-sm">
          <thead><tr>
            {["Date", "Supplier", "Invoice No", "Amount", "Mode", "Reference", "Notes"].map((h) => <th key={h} className={thClass}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className={tdClass + " text-center text-slate-400"}>No payments in this period</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={tdClass}>{r.paid_date?.slice(0, 10)}</td>
                <td className={tdClass}>{r.party_name}</td>
                <td className={tdClass}><Link href={`/purchase-invoices/${r.invoice_id}`} className="text-emerald-700 hover:underline print:text-black print:no-underline">{r.invoice_no}</Link></td>
                <td className={tdClass}>{fmt(r.amount)}</td>
                <td className={tdClass}>{r.payment_mode.replace("_", " ")}</td>
                <td className={tdClass}>{r.reference_no ?? "—"}</td>
                <td className={tdClass}>{r.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr><td colSpan={3} className={tdClass + " text-right font-semibold"}>Total</td><td className={tdClass + " font-semibold"}>{fmt(String(total))}</td><td colSpan={3} className={tdClass}></td></tr>
            </tfoot>
          )}
        </table>
      </div>
    </AppShell>
  );
}
