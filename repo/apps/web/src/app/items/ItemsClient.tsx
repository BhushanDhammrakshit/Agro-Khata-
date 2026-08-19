"use client";

import { useRef, useState } from "react";
import { api, ApiError, Item } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";

export function ItemsClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", uom: "", salePrice: "", gstRate: "", hsnCode: "", openingStock: "" });
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  function load() {
    api.listItems().then(setItems).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load items."));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.createItem({
        name: form.name,
        uom: form.uom,
        salePrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
        gstRate: form.gstRate ? parseFloat(form.gstRate) : undefined,
        hsnCode: form.hsnCode || undefined,
        openingStock: form.openingStock ? parseFloat(form.openingStock) : undefined,
      });
      setForm({ name: "", uom: "", salePrice: "", gstRate: "", hsnCode: "", openingStock: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create item.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell title="Items">
      <div className="flex flex-col gap-6">
        <Card>
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 sm:cursor-default"
          >
            <span>Add Item</span>
            <svg className={`h-4 w-4 text-emerald-600 transition-transform sm:hidden ${formOpen ? "rotate-45" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
          </button>
          <div
            ref={formRef}
            className={`grid overflow-hidden transition-[grid-template-rows] duration-[375ms] ease-in-out sm:grid-rows-[1fr] ${formOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
          <div className="min-h-0">
          <form className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" onSubmit={handleCreate}>
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <label className="text-sm font-medium text-slate-700">Item name</label>
              <input required placeholder="e.g. Tomato" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">UOM</label>
              <input required placeholder="KG" value={form.uom} onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Sale price</label>
              <input type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">GST %</label>
              <input type="number" step="0.01" value={form.gstRate} onChange={(e) => setForm((f) => ({ ...f, gstRate: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">HSN code</label>
              <input value={form.hsnCode} onChange={(e) => setForm((f) => ({ ...f, hsnCode: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Opening stock</label>
              <input type="number" step="0.001" value={form.openingStock} onChange={(e) => setForm((f) => ({ ...f, openingStock: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full">{creating ? "Adding…" : "Add item"}</Button>
            </div>
          </form>
          </div>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-3 sm:hidden">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Item</p>
                  <p className="mt-0.5 truncate text-lg font-semibold text-slate-900">{item.name}</p>
                </div>
                <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{item.uom}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Sale price</p>
                  <p className="mt-1 truncate text-base font-semibold text-slate-800">{item.salePrice ? `₹${item.salePrice}` : "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Current stock</p>
                  <p className="mt-1 truncate text-base font-semibold text-slate-800">{item.currentStock}</p>
                </div>
                <div className="min-w-0 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-400">GST</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{item.gstRate}%</p>
                </div>
                <div className="min-w-0 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-400">HSN</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700">{item.hsnCode ?? "—"}</p>
                </div>
              </div>
            </article>
          ))}
          {items.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">No items yet.</p>}
        </div>

        <div className={`${tableWrapClass} hidden sm:block`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>UOM</th>
                <th className={thClass}>Sale Price</th>
                <th className={thClass}>GST %</th>
                <th className={thClass}>HSN</th>
                <th className={thClass}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className={tdClass}>{i.name}</td>
                  <td className={tdClass}>{i.uom}</td>
                  <td className={tdClass}>{i.salePrice ? `₹${i.salePrice}` : "—"}</td>
                  <td className={tdClass}>{i.gstRate}%</td>
                  <td className={tdClass}>{i.hsnCode ?? "—"}</td>
                  <td className={tdClass}>{i.currentStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="p-4 text-sm text-slate-500">No items yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
