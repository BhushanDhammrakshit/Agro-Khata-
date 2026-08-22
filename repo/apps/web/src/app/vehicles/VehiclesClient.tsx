"use client";

import React, { useRef, useState } from "react";
import { api, ApiError, Expense, PaymentMode, Vehicle } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { AutocompleteInput } from "@/components/ui/AutocompleteInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";
import { formatINR } from "@/lib/currency";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyExpenseForm() {
  return { category: "", description: "", amount: "", expenseDate: todayIso(), paymentMode: "cash" as PaymentMode };
}

function VehicleExpensesPanel({ vehicleId }: { vehicleId: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyExpenseForm);
  const loaded = useRef(false);

  if (!loaded.current) {
    loaded.current = true;
    api.listExpenses(vehicleId).then(setExpenses).catch(() => setError("Failed to load expenses.")).finally(() => setLoading(false));
    api.listExpenses().then((all) => setCategories(Array.from(new Set(all.map((e) => e.category))).sort())).catch(() => null);
  }

  function reload() {
    api.listExpenses(vehicleId).then(setExpenses).catch(() => setError("Failed to load expenses."));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.createExpense({
        category: form.category,
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        expenseDate: form.expenseDate,
        paymentMode: form.paymentMode,
        vehicleId,
      });
      setForm(emptyExpenseForm());
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add Vehicle Expense</p>
      <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <AutocompleteInput required placeholder="Category (e.g. Fuel, Puncture)" value={form.category}
          suggestions={categories} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
        <input placeholder="Description" value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} />
        <input required type="number" step="0.01" placeholder="Amount" value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputClass} />
        <DatePicker required value={form.expenseDate} onChange={(v) => setForm((f) => ({ ...f, expenseDate: v }))} />
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
        <div className="col-span-full flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Expense"}</Button>
        </div>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto">
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
            {loading && <tr><td colSpan={5} className={tdClass + " text-center text-slate-400"}>Loading…</td></tr>}
            {!loading && expenses.length === 0 && (
              <tr><td colSpan={5} className={tdClass + " text-center text-slate-400"}>No expenses logged for this vehicle yet.</td></tr>
            )}
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-white">
                <td className={tdClass}>{e.expenseDate.slice(0, 10)}</td>
                <td className={tdClass}>{e.category}</td>
                <td className={tdClass}>{e.description ?? "—"}</td>
                <td className={tdClass}>{formatINR(e.amount)}</td>
                <td className={tdClass}>{e.paymentMode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function VehiclesClient({ initialVehicles }: { initialVehicles: Vehicle[] }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({ vehicleNo: "", name: "", loadCapacity: "" });
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);

  function toggleExpenses(vehicleId: string) {
    setExpandedVehicleId((current) => (current === vehicleId ? null : vehicleId));
  }

  function load() {
    api.listVehicles().then(setVehicles)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load vehicles."));
  }

  function resetForm() {
    setForm({ vehicleNo: "", name: "", loadCapacity: "" });
    setEditingId(null);
  }

  function beginEdit(vehicle: Vehicle) {
    setForm({ vehicleNo: vehicle.vehicleNo, name: vehicle.name ?? "", loadCapacity: vehicle.loadCapacity ?? "" });
    setEditingId(vehicle.id);
    setFormOpen(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const dto = {
        vehicleNo: form.vehicleNo,
        name: form.name || undefined,
        loadCapacity: form.loadCapacity || undefined,
      };
      if (editingId) await api.updateVehicle(editingId, dto);
      else await api.createVehicle(dto);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${editingId ? "update" : "add"} vehicle.`);
    } finally {
      setCreating(false);
    }
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <AppShell title="Vehicles">
      <div className="flex flex-col gap-6">
        <Card>
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 sm:cursor-default"
          >
            <span>{editingId ? "Edit Vehicle" : "Add Vehicle"}</span>
            <svg className={`h-4 w-4 text-emerald-600 transition-transform sm:hidden ${formOpen ? "rotate-45" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
          </button>
          <div
            ref={formRef}
            className={`grid overflow-hidden transition-[grid-template-rows] duration-[375ms] ease-in-out sm:grid-rows-[1fr] ${formOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
          <div className="min-h-0">
          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Vehicle Number *</label>
              <input required value={form.vehicleNo} onChange={(e) => set("vehicleNo", e.target.value)}
                placeholder="MH-12 AB 1234" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Vehicle Name / Type</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Tata 407, Tempo" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Load Capacity</label>
              <input value={form.loadCapacity} onChange={(e) => set("loadCapacity", e.target.value)}
                placeholder="e.g. 2 Ton, 1500 Kg" className={inputClass} />
            </div>
            <div className="flex items-end justify-end gap-2 sm:col-span-2 lg:col-span-1">
              {editingId && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
              <Button type="submit" disabled={creating} className="whitespace-nowrap">
                {creating ? "Saving…" : editingId ? "Save Vehicle" : "Add Vehicle"}
              </Button>
            </div>
          </form>
          </div>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-3 sm:hidden">
          {vehicles.map((vehicle) => (
            <article key={vehicle.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Vehicle number</p>
                  <p className="mt-0.5 truncate text-lg font-semibold text-slate-900">{vehicle.vehicleNo}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={vehicle.isActive ? "green" : "slate"}>{vehicle.isActive ? "Active" : "Inactive"}</Badge>
                  <button type="button" onClick={() => beginEdit(vehicle)} className="text-xs font-medium text-emerald-700 hover:underline">Edit</button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Name / type</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700">{vehicle.name ?? "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Load capacity</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700">{vehicle.loadCapacity ?? "—"}</p>
                </div>
              </div>
              <button type="button" onClick={() => toggleExpenses(vehicle.id)} className="mt-4 text-xs font-medium text-emerald-700 hover:underline">
                {expandedVehicleId === vehicle.id ? "Hide expenses" : "Expenses"}
              </button>
              {expandedVehicleId === vehicle.id && (
                <div className="mt-3">
                  <VehicleExpensesPanel vehicleId={vehicle.id} />
                </div>
              )}
            </article>
          ))}
          {vehicles.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">No vehicles added yet.</p>}
        </div>

        <div className={`${tableWrapClass} hidden sm:block`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Vehicle Number</th>
                <th className={thClass}>Name / Type</th>
                <th className={thClass}>Load Capacity</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 && (
                <tr><td colSpan={5} className={tdClass + " text-center text-slate-400"}>No vehicles added yet.</td></tr>
              )}
              {vehicles.map((v) => (
                <React.Fragment key={v.id}>
                  <tr className="hover:bg-slate-50">
                    <td className={tdClass + " font-medium"}>{v.vehicleNo}</td>
                    <td className={tdClass}>{v.name ?? "—"}</td>
                    <td className={tdClass}>{v.loadCapacity ?? "—"}</td>
                    <td className={tdClass}><Badge tone={v.isActive ? "green" : "slate"}>{v.isActive ? "Active" : "Inactive"}</Badge></td>
                    <td className={tdClass}>
                      <button type="button" onClick={() => beginEdit(v)} className="text-sm font-medium text-emerald-700 hover:underline">Edit</button>
                      <button type="button" onClick={() => toggleExpenses(v.id)} className="ml-3 text-sm font-medium text-emerald-700 hover:underline">
                        {expandedVehicleId === v.id ? "Hide expenses" : "Expenses"}
                      </button>
                    </td>
                  </tr>
                  {expandedVehicleId === v.id && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 p-4">
                        <VehicleExpensesPanel vehicleId={v.id} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
