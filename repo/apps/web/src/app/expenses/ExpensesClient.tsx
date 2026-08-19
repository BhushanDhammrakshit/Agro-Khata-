"use client";

import { useRef, useState } from "react";
import { api, ApiError, Expense, PaymentMode } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";
import { CustomSelect } from "@/components/ui/CustomSelect";

function formatAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "₹0.00";
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

export function ExpensesClient({ initialExpenses }: { initialExpenses: Expense[] }) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "", description: "", amount: "", expenseDate: "", paymentMode: "cash" as PaymentMode });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  function load() {
    api.listExpenses().then(setExpenses).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load expenses."));
  }

  function resetForm() {
    setForm({ category: "", description: "", amount: "", expenseDate: "", paymentMode: "cash" });
    setEditingId(null);
  }

  function beginEdit(expense: Expense) {
    setForm({
      category: expense.category,
      description: expense.description ?? "",
      amount: expense.amount,
      expenseDate: expense.expenseDate.slice(0, 10),
      paymentMode: expense.paymentMode,
    });
    setEditingId(expense.id);
    setFormOpen(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const dto = {
        category: form.category,
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        expenseDate: form.expenseDate,
        paymentMode: form.paymentMode,
      };
      if (editingId) await api.updateExpense(editingId, dto);
      else await api.createExpense(dto);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${editingId ? "update" : "create"} expense.`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell title="Expenses">
      <div className="flex flex-col gap-6">
        <Card>
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 sm:cursor-default"
          >
            <span>{editingId ? "Edit Expense" : "Add Expense"}</span>
            <svg className={`h-4 w-4 text-emerald-600 transition-transform sm:hidden ${formOpen ? "rotate-45" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
          </button>
          <div
            ref={formRef}
            className={`grid overflow-hidden transition-[grid-template-rows] duration-[375ms] ease-in-out sm:grid-rows-[1fr] ${formOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
          <div className="min-h-0">
          <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <input required placeholder="e.g. Transport" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Amount</label>
              <input required type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Date</label>
              <input required type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Payment mode</label>
              <CustomSelect
                value={form.paymentMode}
                onChange={(val) => setForm((f) => ({ ...f, paymentMode: val as PaymentMode }))}
                options={[
                  { value: "cash", label: "Cash" },
                  { value: "bank_transfer", label: "Bank transfer" },
                  { value: "upi", label: "UPI" },
                  { value: "cheque", label: "Cheque" },
                  { value: "other", label: "Other" },
                ]}
              />
            </div>
            <div className="col-span-full flex items-end justify-end gap-2">
              {editingId && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
              <Button type="submit" disabled={creating} className="whitespace-nowrap">{creating ? "Saving…" : editingId ? "Save expense" : "Add expense"}</Button>
            </div>
          </form>
          </div>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-3 sm:hidden">
          {expenses.map((expense) => (
            <article key={expense.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Category</p>
                  <p className="mt-0.5 truncate text-lg font-semibold text-slate-900">{expense.category}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm text-slate-400">{formatDate(expense.expenseDate)}</p>
                  <button type="button" onClick={() => beginEdit(expense)} className="text-xs font-medium text-emerald-700 hover:underline">Edit</button>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 min-h-5 text-sm text-slate-500">{expense.description ?? "No description"}</p>
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Amount</p>
                  <p className="mt-1 whitespace-nowrap text-base font-semibold text-slate-800">{formatAmount(expense.amount)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Payment mode</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700">{formatPaymentMode(expense.paymentMode)}</p>
                </div>
              </div>
            </article>
          ))}
          {expenses.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">No expenses yet.</p>}
        </div>

        <div className={`${tableWrapClass} hidden sm:block`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Date</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Description</th>
                <th className={thClass}>Amount</th>
                <th className={thClass}>Mode</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className={tdClass}>{e.expenseDate}</td>
                  <td className={tdClass}>{e.category}</td>
                  <td className={tdClass}>{e.description ?? "—"}</td>
                  <td className={tdClass}>₹{e.amount}</td>
                  <td className={tdClass}>{e.paymentMode}</td>
                  <td className={tdClass}><button type="button" onClick={() => beginEdit(e)} className="text-sm font-medium text-emerald-700 hover:underline">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && <p className="p-4 text-sm text-slate-500">No expenses yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
