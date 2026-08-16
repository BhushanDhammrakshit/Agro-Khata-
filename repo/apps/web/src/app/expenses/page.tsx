"use client";

import { useEffect, useState } from "react";
import { api, ApiError, Expense, PaymentMode } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass, selectClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "", description: "", amount: "", expenseDate: "", paymentMode: "cash" as PaymentMode });
  const [creating, setCreating] = useState(false);

  function load() {
    api.listExpenses().then(setExpenses).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load expenses."));
  }

  useEffect(load, []);

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
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleCreate}>
            <div className="flex w-40 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <input required placeholder="e.g. Transport" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex w-28 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Amount</label>
              <input required type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex w-40 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Date</label>
              <input required type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex w-40 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Payment mode</label>
              <select value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value as PaymentMode }))} className={selectClass}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Button type="submit" disabled={creating}>{creating ? "Adding…" : "Add expense"}</Button>
          </form>
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
              {expenses?.map((e) => (
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
          {expenses?.length === 0 && <p className="p-4 text-sm text-slate-500">No expenses yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
