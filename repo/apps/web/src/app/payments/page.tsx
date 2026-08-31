"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError, Invoice, Party, PartyType, PaySupplierResult, PaymentMode } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DatePicker } from "@/components/ui/DatePicker";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";

function fmt(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? "₹0.00" : `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

type Direction = "customer" | "supplier";

export default function PaymentsPage() {
  const [direction, setDirection] = useState<Direction>("customer");
  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState("");
  const [outstanding, setOutstanding] = useState<Invoice[]>([]);
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("bank_transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaySupplierResult | null>(null);

  const partyTypeFilter: PartyType = direction === "customer" ? "customer" : "supplier";

  useEffect(() => {
    setPartyId(""); setOutstanding([]); setResult(null); setError(null);
    api.listParties(partyTypeFilter).then(setParties).catch(() => null);
  }, [partyTypeFilter]);

  async function loadOutstanding(id: string) {
    if (!id) { setOutstanding([]); return; }
    const invs = direction === "customer"
      ? await api.listSalesInvoices({ partyId: id })
      : await api.listPurchaseInvoices({ partyId: id });
    setOutstanding(
      invs
        .filter((i) => i.status !== "paid" && i.status !== "cancelled" && i.status !== "draft" && parseFloat(i.balanceAmount) > 0)
        .sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate)),
    );
  }

  useEffect(() => {
    loadOutstanding(partyId).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]);

  const totalOutstanding = useMemo(() => outstanding.reduce((s, i) => s + parseFloat(i.balanceAmount), 0), [outstanding]);
  const selectedParty = parties.find((p) => p.id === partyId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setResult(null);
    try {
      const dto = {
        partyId,
        amount: parseFloat(amount),
        paidDate,
        paymentMode,
        referenceNo: referenceNo || undefined,
        notes: notes || undefined,
      };
      const res = direction === "customer" ? await api.payCustomer(dto) : await api.paySupplier(dto);
      setResult(res);
      setAmount(""); setReferenceNo(""); setNotes("");
      await loadOutstanding(partyId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Payments">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden text-sm w-fit">
          {(["customer", "supplier"] as const).map((d) => (
            <button key={d} onClick={() => setDirection(d)}
              className={`px-5 py-2 font-medium capitalize transition-colors ${direction === d ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              {d === "customer" ? "Received from customer" : "Paid to supplier"}
            </button>
          ))}
        </div>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            {direction === "customer" ? "Record a payment received" : "Record a payment made"}
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Enter one lump-sum amount — it will be applied to this {direction}&apos;s oldest outstanding invoices first,
            in order, until it runs out. Record-only, no money is actually moved by the app.
          </p>
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{direction === "customer" ? "Customer" : "Supplier"}</label>
              <CustomSelect
                value={partyId}
                onChange={setPartyId}
                options={[{ value: "", label: `Select a ${direction}…` }, ...parties.map((p) => ({ value: p.id, label: p.name }))]}
                className="w-full"
              />
            </div>
            {partyId && (
              <div className={`sm:col-span-2 flex items-center justify-between rounded-lg border px-4 py-3 ${direction === "customer" ? "border-blue-200 bg-blue-50" : "border-orange-200 bg-orange-50"}`}>
                <span className={`text-sm font-medium ${direction === "customer" ? "text-blue-700" : "text-orange-700"}`}>
                  {direction === "customer" ? "Amount to receive from" : "Amount to pay to"} {selectedParty?.name}
                </span>
                <span className={`text-lg font-semibold ${direction === "customer" ? "text-blue-700" : "text-orange-700"}`}>{fmt(totalOutstanding)}</span>
              </div>
            )}
            <input required type="number" step="0.01" placeholder="Amount" value={amount}
              onChange={(e) => setAmount(e.target.value)} className={inputClass} />
            <DatePicker required value={paidDate} onChange={setPaidDate} />
            <CustomSelect
              value={paymentMode}
              onChange={(val) => setPaymentMode(val as PaymentMode)}
              options={[
                { value: "bank_transfer", label: "Bank transfer" },
                { value: "upi", label: "UPI" },
                { value: "cash", label: "Cash" },
                { value: "cheque", label: "Cheque" },
                { value: "adjustment", label: "Adjustment / deduction (TDS, commission, discount, etc.)" },
                { value: "other", label: "Other" },
              ]}
            />
            <input placeholder="Reference no (optional)" value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)} className={inputClass} />
            <input placeholder="Notes (optional)" value={notes}
              onChange={(e) => setNotes(e.target.value)} className={inputClass + " sm:col-span-2"} />
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={busy || !partyId} className="sm:col-span-2">
              {busy ? "Recording…" : "Record payment"}
            </Button>
          </form>
        </Card>

        {result && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Payment applied — {result.partyName}</h2>
            <p className="mb-3 text-sm text-slate-600">Total recorded: <strong>{fmt(result.totalAmount)}</strong></p>
            {result.applied.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm text-slate-600">
                {result.applied.map((a) => (
                  <li key={a.invoiceId}>
                    {fmt(a.amount)} applied to{" "}
                    <Link href={`/${direction === "customer" ? "sales" : "purchase"}-invoices/${a.invoiceId}`} className="text-emerald-700 hover:underline">
                      {a.invoiceNo}
                    </Link>
                    {" "}(now {a.newStatus.replace("_", " ")})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No outstanding invoices were paid.</p>
            )}
            {result.advanceAmount && (
              <p className="mt-3 text-sm text-amber-700">
                {fmt(result.advanceAmount)} left over after all outstanding invoices — recorded as an advance on the party ledger.
              </p>
            )}
          </Card>
        )}

        {partyId && (
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Outstanding invoices (oldest first)</h2>
              <span className="text-sm font-semibold text-slate-900">{fmt(totalOutstanding)}</span>
            </div>
            <div className={tableWrapClass}>
              <table className="w-full text-sm">
                <thead><tr>
                  {["Invoice No", "Date", "Total", "Paid", "Balance"].map((h) => <th key={h} className={thClass}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {outstanding.length === 0 && <tr><td colSpan={5} className={tdClass + " text-center text-slate-400"}>No outstanding invoices</td></tr>}
                  {outstanding.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className={tdClass}>
                        <Link href={`/${direction === "customer" ? "sales" : "purchase"}-invoices/${inv.id}`} className="text-emerald-700 hover:underline">{inv.invoiceNo}</Link>
                      </td>
                      <td className={tdClass}>{inv.invoiceDate}</td>
                      <td className={tdClass}>{fmt(inv.totalAmount)}</td>
                      <td className={tdClass}>{fmt(inv.paidAmount)}</td>
                      <td className={tdClass + " font-medium"}>{fmt(inv.balanceAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {outstanding.length > 0 && (
                  <tfoot>
                    <tr><td colSpan={4} className={tdClass + " text-right font-semibold"}>Total outstanding</td><td className={tdClass + " font-semibold"}>{fmt(totalOutstanding)}</td></tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
