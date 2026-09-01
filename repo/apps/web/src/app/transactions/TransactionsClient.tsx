"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, Transaction, PaymentMode } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionsMenu, ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { EditIcon, DeleteIcon } from "@/components/ui/icons";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DatePicker } from "@/components/ui/DatePicker";
import { NameSuggestInput, NameSuggestion } from "@/components/NameSuggestInput";
import { formatCompactINR, formatINR } from "@/lib/currency";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).format(
    new Date(year, month - 1, day),
  );
}

function formatPaymentMode(value: PaymentMode) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

const PAYMENT_MODE_OPTIONS = [
  { value: "online", label: "Online" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "adjustment", label: "Adjustment / deduction" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  transactionDate: todayIso(),
  payerName: "",
  payeeName: "",
  bankName: "",
  paymentMode: "online" as PaymentMode,
  amount: "",
  remark: "",
};

const REMARK_STORAGE_KEY = "vajabaki:transaction-remarks";

function loadStoredRemarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REMARK_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function rememberRemark(remark: string) {
  if (typeof window === "undefined") return;
  const existing = loadStoredRemarks();
  const updated = [remark, ...existing.filter((r) => r !== remark)].slice(0, 50);
  window.localStorage.setItem(REMARK_STORAGE_KEY, JSON.stringify(updated));
}

export function TransactionsClient({ initialTransactions, payeeSuggestions, bankSuggestions }: { initialTransactions: Transaction[]; payeeSuggestions: NameSuggestion[]; bankSuggestions: string[] }) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Combines bank names already on file (parties) with ones typed into past
  // transactions, so anything the user has ever entered gets suggested back.
  const allBankSuggestions = useMemo(() => {
    const fromTransactions = transactions.map((t) => t.bankName).filter((b): b is string => !!b);
    return Array.from(new Set([...bankSuggestions, ...fromTransactions])).sort((a, b) => a.localeCompare(b));
  }, [bankSuggestions, transactions]);

  // Remarks have no server-side source (unlike parties/drivers), so past ones
  // are remembered in localStorage in addition to whatever's in loaded transactions.
  const [storedRemarks, setStoredRemarks] = useState<string[]>([]);
  useEffect(() => { setStoredRemarks(loadStoredRemarks()); }, []);
  const remarkSuggestions = useMemo(() => {
    const fromTransactions = transactions.map((t) => t.remark).filter((r): r is string => !!r);
    return Array.from(new Set([...storedRemarks, ...fromTransactions]));
  }, [storedRemarks, transactions]);

  // Names typed into past transactions' payee field, merged with the
  // customer/supplier/driver suggestions (tags from the latter take priority).
  function mergeNameSuggestions(items: NameSuggestion[]): NameSuggestion[] {
    const byName = new Map<string, NameSuggestion>();
    for (const item of items) {
      const key = item.name.toLowerCase();
      const existing = byName.get(key);
      if (!existing || (!existing.tag && item.tag)) byName.set(key, item);
    }
    return Array.from(byName.values());
  }
  // Payers are people logging cash/bank movements, not parties — suggestions
  // come only from previously logged transactions, never customers/suppliers.
  const allPayerSuggestions = useMemo(() => {
    const names = new Set(transactions.map((t) => t.payerName).filter((n): n is string => !!n));
    return Array.from(names, (name) => ({ name }));
  }, [transactions]);
  const allPayeeSuggestions = useMemo(() => {
    const fromTransactions = transactions.map((t) => ({ name: t.payeeName })).filter((s) => s.name);
    return mergeNameSuggestions([...payeeSuggestions, ...fromTransactions]);
  }, [transactions, payeeSuggestions]);

  function load() {
    api.listTransactions().then(setTransactions).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load transactions."));
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
  }

  function beginEdit(transaction: Transaction) {
    setForm({
      transactionDate: transaction.transactionDate.slice(0, 10),
      payerName: transaction.payerName,
      payeeName: transaction.payeeName,
      bankName: transaction.bankName ?? "",
      paymentMode: transaction.paymentMode,
      amount: transaction.amount,
      remark: transaction.remark ?? "",
    });
    setEditingId(transaction.id);
    setFormOpen(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const dto = {
        transactionDate: form.transactionDate,
        payerName: form.payerName,
        payeeName: form.payeeName,
        bankName: form.bankName || undefined,
        paymentMode: form.paymentMode,
        amount: parseFloat(form.amount),
        remark: form.remark || undefined,
      };
      if (editingId) await api.updateTransaction(editingId, dto);
      else await api.createTransaction(dto);
      if (dto.remark) rememberRemark(dto.remark);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${editingId ? "update" : "log"} transaction.`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteTransaction(deleteTarget.id);
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete transaction.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function menuItems(transaction: Transaction): ActionsMenuItem[] {
    return [
      { key: "edit", label: "Edit", icon: EditIcon, onClick: () => beginEdit(transaction) },
      { key: "delete", label: "Delete", icon: DeleteIcon, tone: "danger", onClick: () => setDeleteTarget(transaction) },
    ];
  }

  return (
    <AppShell title="Transactions">
      <div className="flex flex-col gap-6">
        <Card>
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 sm:cursor-default"
          >
            <span>{editingId ? "Edit Transaction" : "Log a Transaction"}</span>
            <svg className={`h-4 w-4 text-emerald-600 transition-transform sm:hidden ${formOpen ? "rotate-45" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
          </button>
          <div
            ref={formRef}
            className={`grid overflow-hidden transition-[grid-template-rows] duration-[375ms] ease-in-out sm:grid-rows-[1fr] ${formOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
          <div className="min-h-0">
          <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Date</label>
              <DatePicker required value={form.transactionDate} onChange={(v) => setForm((f) => ({ ...f, transactionDate: v }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Name of payer</label>
              <NameSuggestInput
                required
                placeholder="Who paid"
                value={form.payerName}
                onChange={(v) => setForm((f) => ({ ...f, payerName: v }))}
                suggestions={allPayerSuggestions}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Name of payee</label>
              <NameSuggestInput
                required
                placeholder="Who received"
                value={form.payeeName}
                onChange={(v) => setForm((f) => ({ ...f, payeeName: v }))}
                suggestions={allPayeeSuggestions}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Bank name</label>
              <NameSuggestInput
                placeholder="e.g. Kotak Bank"
                value={form.bankName}
                onChange={(v) => setForm((f) => ({ ...f, bankName: v }))}
                suggestions={allBankSuggestions}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Type of payment</label>
              <CustomSelect
                value={form.paymentMode}
                onChange={(val) => setForm((f) => ({ ...f, paymentMode: val as PaymentMode }))}
                options={PAYMENT_MODE_OPTIONS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Amount</label>
              <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
              <label className="text-sm font-medium text-slate-700">Remark</label>
              <NameSuggestInput
                placeholder="Reason / notes"
                value={form.remark}
                onChange={(v) => setForm((f) => ({ ...f, remark: v }))}
                suggestions={remarkSuggestions}
                className={inputClass}
              />
            </div>
            <div className="col-span-full flex items-end justify-end gap-2">
              {editingId && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
              <Button type="submit" disabled={saving} className="whitespace-nowrap">{saving ? "Saving…" : editingId ? "Save transaction" : "Log transaction"}</Button>
            </div>
          </form>
          </div>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-3 sm:hidden">
          {transactions.map((t, index) => (
            <article key={t.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">#{index + 1} · {formatDate(t.transactionDate)}</p>
                  <p className="mt-0.5 truncate text-base font-semibold text-slate-900">{t.payerName} → {t.payeeName}</p>
                </div>
                <ActionsMenu items={menuItems(t)} />
              </div>
              <p className="mt-2 line-clamp-2 min-h-5 text-sm text-slate-500">{t.remark ?? "No remark"}</p>
              <div className="mt-5 grid grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Amount</p>
                  <p className="mt-1 break-words text-base font-semibold text-slate-800" title={formatINR(t.amount)}>{formatCompactINR(t.amount)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Type</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700">{formatPaymentMode(t.paymentMode)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Bank</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700">{t.bankName ?? "—"}</p>
                </div>
              </div>
            </article>
          ))}
          {transactions.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">No transactions logged yet.</p>}
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
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, index) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className={tdClass}>{index + 1}</td>
                  <td className={tdClass}>{formatDate(t.transactionDate)}</td>
                  <td className={tdClass}>{t.payerName}</td>
                  <td className={tdClass}>{t.bankName ?? "—"}</td>
                  <td className={tdClass}>{t.payeeName}</td>
                  <td className={tdClass}>{formatPaymentMode(t.paymentMode)}</td>
                  <td className={tdClass}>{formatINR(t.amount)}</td>
                  <td className={tdClass}>{t.remark ?? "—"}</td>
                  <td className={tdClass}>
                    <ActionsMenu items={menuItems(t)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && <p className="p-4 text-sm text-slate-500">No transactions logged yet.</p>}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete transaction?"
        message={`This will permanently delete this transaction (${deleteTarget?.payerName} \u2192 ${deleteTarget?.payeeName}). This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
