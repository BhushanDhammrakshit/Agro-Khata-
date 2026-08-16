"use client";

import { useEffect, useState } from "react";
import { api, ApiError, Item } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";

export default function ItemsPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", uom: "", salePrice: "", gstRate: "", hsnCode: "", openingStock: "" });
  const [creating, setCreating] = useState(false);

  function load() {
    api.listItems().then(setItems).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load items."));
  }

  useEffect(load, []);

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
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleCreate}>
            <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Item name</label>
              <input required placeholder="e.g. Tomato" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex w-24 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">UOM</label>
              <input required placeholder="KG" value={form.uom} onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex w-28 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Sale price</label>
              <input type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex w-24 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">GST %</label>
              <input type="number" step="0.01" value={form.gstRate} onChange={(e) => setForm((f) => ({ ...f, gstRate: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex w-28 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">HSN code</label>
              <input value={form.hsnCode} onChange={(e) => setForm((f) => ({ ...f, hsnCode: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex w-28 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Opening stock</label>
              <input type="number" step="0.001" value={form.openingStock} onChange={(e) => setForm((f) => ({ ...f, openingStock: e.target.value }))} className={inputClass} />
            </div>
            <Button type="submit" disabled={creating}>{creating ? "Adding…" : "Add item"}</Button>
          </form>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className={tableWrapClass}>
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
              {items?.map((i) => (
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
          {items?.length === 0 && <p className="p-4 text-sm text-slate-500">No items yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
