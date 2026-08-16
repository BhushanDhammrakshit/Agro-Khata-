"use client";

import { useEffect, useState } from "react";
import { api, ApiError, Party, PartyType } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { inputClass, selectClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";
import { PhoneInput, withPrefix, stripPrefix } from "@/components/PhoneInput";

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", partyType: "customer" as PartyType, phone: "", gstin: "" });
  const [creating, setCreating] = useState(false);

  function load() {
    api.listParties().then(setParties).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load parties."));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.createParty({
        name: form.name,
        partyType: form.partyType,
        phone: form.phone ? withPrefix(form.phone) : undefined,
        gstin: form.gstin || undefined,
      });
      setForm({ name: "", partyType: "customer", phone: "", gstin: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create party.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell title="Parties">
      <div className="flex flex-col gap-6">
        <Card>
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleCreate}>
            <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input required placeholder="e.g. Zepto, Ramesh Patil" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex w-40 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Type</label>
              <select value={form.partyType} onChange={(e) => setForm((f) => ({ ...f, partyType: e.target.value as PartyType }))} className={selectClass}>
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="flex w-40 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <PhoneInput value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            </div>
            <div className="flex w-40 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">GSTIN (optional)</label>
              <input value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))} className={inputClass} />
            </div>
            <Button type="submit" disabled={creating}>{creating ? "Adding…" : "Add party"}</Button>
          </form>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Phone</th>
                <th className={thClass}>GSTIN</th>
                <th className={thClass}>Status</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {parties?.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className={tdClass}>{p.name}</td>
                  <td className={tdClass}>
                    <Badge tone={p.partyType === "customer" ? "blue" : p.partyType === "supplier" ? "purple" : "slate"}>
                      {p.partyType}
                    </Badge>
                  </td>
                  <td className={tdClass}>{p.phone ? stripPrefix(p.phone) : "—"}</td>
                  <td className={tdClass}>{p.gstin ?? "—"}</td>
                  <td className={tdClass}><Badge tone={p.isActive ? "green" : "slate"}>{p.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className={tdClass}>
                    <a href={`/parties/${p.id}`} className="text-sm text-emerald-700 hover:underline">View Ledger</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {parties?.length === 0 && <p className="p-4 text-sm text-slate-500">No parties yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
