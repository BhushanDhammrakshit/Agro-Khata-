"use client";

import { useRef, useState } from "react";
import { api, ApiError, Expense, PaymentMode } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";
import { CustomSelect } from "@/components/ui/CustomSelect";

export function ExpensesClient({ initialExpenses }: { initialExpenses: Expense[] }) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "", description: "", amount: "", expenseDate: "", paymentMode: "cash" as PaymentMode });
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  function load() {
    api.listExpenses().then(setExpenses).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load expenses."));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.createExpense({
        category: form.category,
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        expenseDate: form.expenseDate,
        paymentMode: form.paymentMode,
      });
      setForm({ category: "", description: "", amount: "", expenseDate: "", paymentMode: "cash" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create expense.");
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
            <span>Add Expense</span>
            <svg className={`h-4 w-4 transition-transform sm:hidden ${formOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div ref={formRef} className={`${formOpen ? "" : "hidden"} sm:block`}>
          <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleCreate}>
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
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full">{creating ? "Adding…" : "Add expense"}</Button>
            </div>
          </form>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Date</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Description</th>
                <th className={thClass}>Amount</th>
                <th className={thClass}>Mode</th>
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
