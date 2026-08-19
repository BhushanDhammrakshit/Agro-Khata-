"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { api, ApiError, Party } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";

export function SuppliersClient({ initialParties }: { initialParties: Party[] }) {
  const [parties, setParties] = useState<Party[]>(initialParties);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    name: "", address: "",
    bankName: "", bankAccount: "", bankIfsc: "",
  });

  function load() {
    api.listParties("supplier").then(setParties)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load suppliers."));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.createParty({
        name: form.name,
        partyType: "supplier",
        address: form.address || undefined,
        bankName: form.bankName || undefined,
        bankAccount: form.bankAccount || undefined,
        bankIfsc: form.bankIfsc || undefined,
      });
      setForm({ name: "", address: "", bankName: "", bankAccount: "", bankIfsc: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create supplier.");
    } finally {
      setCreating(false);
    }
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <AppShell title="Suppliers / Farmers">
      <div className="flex flex-col gap-6">
        <Card>
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 sm:cursor-default"
          >
            <span>Add Supplier</span>
            <svg className={`h-4 w-4 text-emerald-600 transition-transform sm:hidden ${formOpen ? "rotate-45" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
          </button>
          <div ref={formRef} className={`${formOpen ? "" : "hidden"} sm:block`}>
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Name *</label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Ramesh Patil" className={inputClass} />
            </div>
            <div className="flex items-end">
              <p className="text-xs text-slate-400 italic">Farmer code is auto-assigned on save</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
              <input value={form.address} onChange={(e) => set("address", e.target.value)}
                placeholder="Village, Taluka, District" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Bank Name</label>
              <input value={form.bankName} onChange={(e) => set("bankName", e.target.value)}
                placeholder="State Bank of India" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Account Number</label>
              <input value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)}
                placeholder="1234567890" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">IFSC Code</label>
              <input value={form.bankIfsc} onChange={(e) => set("bankIfsc", e.target.value)}
                placeholder="SBIN0001234" className={inputClass} />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={creating}>
                {creating ? "Adding…" : "Add Supplier"}
              </Button>
            </div>
          </form>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Farmer Code</th>
                <th className={thClass}>Address</th>
                <th className={thClass}>Bank</th>
                <th className={thClass}>Account</th>
                <th className={thClass}>Status</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {parties.length === 0 && (
                <tr><td colSpan={7} className={tdClass + " text-center text-slate-400"}>No suppliers yet.</td></tr>
              )}
              {parties.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className={tdClass + " font-medium"}>{p.name}</td>
                  <td className={tdClass}>{p.farmerCode ?? "—"}</td>
                  <td className={tdClass}>{p.address ?? "—"}</td>
                  <td className={tdClass}>{p.bankName ?? "—"}</td>
                  <td className={tdClass}>{p.bankAccount ?? "—"}</td>
                  <td className={tdClass}><Badge tone={p.isActive ? "green" : "slate"}>{p.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className={tdClass}>
                    <Link href={`/parties/${p.id}`} className="text-emerald-700 hover:underline">Edit / Ledger</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
