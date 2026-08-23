"use client";

import { useEffect, useState } from "react";
import { api, TransactionReportRow } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { inputClass, tableWrapClass, thClass, tdClass } from "@/components/ui/styles";
import { downloadStyledExcel } from "@/lib/download";
import { formatINR } from "@/lib/currency";

const firstOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

const PAYMENT_MODE_OPTIONS = [
  { value: "", label: "All modes" },
  { value: "online", label: "Online" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "adjustment", label: "Adjustment / deduction" },
  { value: "other", label: "Other" },
];

function formatPaymentMode(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).format(
    new Date(year, month - 1, day),
  );
}

export default function TransactionsReportPage() {
  const [rows, setRows] = useState<TransactionReportRow[]>([]);
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [payerName, setPayerName] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [bankName, setBankName] = useState("");
  const [paymentMode, setPaymentMode] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      api.getTransactionsReport({ from, to, payerName, payeeName, bankName, paymentMode })
        .then((d) => setRows(d.rows))
        .catch(() => setRows([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [from, to, payerName, payeeName, bankName, paymentMode]);

  const grandTotal = rows.reduce((s, r) => s + parseFloat(r.amount), 0);

  function handleDownload() {
    downloadStyledExcel({
      filename: `transactions-report-${from}-to-${to}.xlsx`,
      sheetName: "Transactions",
      title: "Transactions Report",
      subtitle: `${from} to ${to}`,
      columns: [
        { header: "Date", key: "date", width: 14, type: "text" },
        { header: "Name of Payer", key: "payer", width: 22, type: "text" },
        { header: "Bank Name", key: "bank", width: 18, type: "text" },
        { header: "Name of Payee", key: "payee", width: 22, type: "text" },
        { header: "Type of", key: "mode", width: 16, type: "text" },
        { header: "Amount", key: "amount", width: 16, type: "currency" },
        { header: "Remark", key: "remark", width: 24, type: "text" },
      ],
      rows: rows.map((r) => ({
        date: r.transaction_date,
        payer: r.payer_name,
        bank: r.bank_name ?? "",
        payee: r.payee_name,
        mode: formatPaymentMode(r.payment_mode),
        amount: parseFloat(r.amount),
        remark: r.remark ?? "",
      })),
      totals: { amount: grandTotal },
    });
  }

  return (
    <AppShell title="Transactions Report">
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <button onClick={handleDownload}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            Export Excel
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Name of payer</label>
            <input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Search payer" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Name of payee</label>
            <input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Search payee" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Bank name</label>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Search bank" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Type of payment</label>
            <CustomSelect value={paymentMode} onChange={setPaymentMode} options={PAYMENT_MODE_OPTIONS} />
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="text-slate-500">{rows.length} transaction{rows.length === 1 ? "" : "s"}</span>
        <span className="font-semibold text-slate-900">Total: {formatINR(grandTotal)}</span>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((r, index) => (
          <article key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">#{index + 1} · {formatDate(r.transaction_date)}</p>
                <p className="mt-0.5 truncate text-base font-semibold text-slate-900">{r.payer_name} → {r.payee_name}</p>
              </div>
              <p className="shrink-0 text-base font-semibold text-slate-800">{formatINR(r.amount)}</p>
            </div>
            <p className="mt-2 line-clamp-2 min-h-5 text-sm text-slate-500">{r.remark ?? "No remark"}</p>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <span className="text-slate-600">{r.bank_name ?? "—"}</span>
              <span className="font-medium text-slate-700">{formatPaymentMode(r.payment_mode)}</span>
            </div>
          </article>
        ))}
        {rows.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">No transactions found.</p>}
      </div>

      <div className={`${tableWrapClass} hidden sm:block`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={thClass}>Sr No</th>
              <th className={thClass}>Date</th>
              <th className={thClass}>Name of Payer</th>
              <th className={thClass}>Bank Name</th>
              <th className={thClass}>Name of Payee</th>
              <th className={thClass}>Type of</th>
              <th className={thClass}>Amount</th>
              <th className={thClass}>Remark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, index) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={tdClass}>{index + 1}</td>
                <td className={tdClass}>{formatDate(r.transaction_date)}</td>
                <td className={tdClass}>{r.payer_name}</td>
                <td className={tdClass}>{r.bank_name ?? "—"}</td>
                <td className={tdClass}>{r.payee_name}</td>
                <td className={tdClass}>{formatPaymentMode(r.payment_mode)}</td>
                <td className={tdClass}>{formatINR(r.amount)}</td>
                <td className={tdClass}>{r.remark ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-sm text-slate-500">No transactions found.</p>}
      </div>
    </AppShell>
  );
}
