"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, Party } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionsMenu, ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { EditIcon, DeleteIcon } from "@/components/ui/icons";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";
import { PhoneInput, withPrefix, stripPrefix } from "@/components/PhoneInput";

export function CustomersClient({ initialParties }: { initialParties: Party[] }) {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>(initialParties);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    name: "", phone: "", shippingAddress: "",
    gstin: "", pan: "", fssaiNo: "",
    poPrefix: "PO-", nextPoSeq: "1",
  });
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    api.listParties("customer").then(setParties)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load customers."));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.createParty({
        name: form.name,
        partyType: "customer",
        phone: form.phone ? withPrefix(form.phone) : undefined,
        shippingAddress: form.shippingAddress || undefined,
        gstin: form.gstin || undefined,
        pan: form.pan || undefined,
        fssaiNo: form.fssaiNo || undefined,
        poPrefix: form.poPrefix || undefined,
      });
      setForm({ name: "", phone: "", shippingAddress: "", gstin: "", pan: "", fssaiNo: "", poPrefix: "PO-", nextPoSeq: "1" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create customer.");
    } finally {
      setCreating(false);
    }
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteParty(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete customer.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function menuItems(party: Party): ActionsMenuItem[] {
    return [
      { key: "edit", label: "Edit / Ledger", icon: EditIcon, onClick: () => router.push(`/parties/${party.id}?from=customers`) },
      { key: "delete", label: "Delete", icon: DeleteIcon, tone: "danger", onClick: () => setDeleteTarget(party) },
    ];
  }

  return (
    <AppShell title="Customers">
      <div className="flex flex-col gap-6">
        <Card>
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 sm:cursor-default"
          >
            <span>Add Customer</span>
            <svg className={`h-4 w-4 text-emerald-600 transition-transform sm:hidden ${formOpen ? "rotate-45" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>
          </button>
          <div
            ref={formRef}
            className={`grid overflow-hidden transition-[grid-template-rows] duration-[375ms] ease-in-out sm:grid-rows-[1fr] ${formOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
          <div className="min-h-0">
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Name *</label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Zepto Mumbai" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Contact Number</label>
              <PhoneInput value={form.phone} onChange={(v) => set("phone", v)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Shipping Address</label>
              <input value={form.shippingAddress} onChange={(e) => set("shippingAddress", e.target.value)}
                placeholder="Warehouse address" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">GSTIN / UIN</label>
              <input value={form.gstin} onChange={(e) => set("gstin", e.target.value)}
                placeholder="27AAJCK4861F1ZC" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">PAN</label>
              <input value={form.pan} onChange={(e) => set("pan", e.target.value)}
                placeholder="AAJCK4861F" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">FSSAI No.</label>
              <input value={form.fssaiNo} onChange={(e) => set("fssaiNo", e.target.value)}
                placeholder="21521179000840" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">PO Prefix</label>
              <input value={form.poPrefix} onChange={(e) => set("poPrefix", e.target.value)}
                placeholder="PO-" className={inputClass} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? "Adding…" : "Add Customer"}
              </Button>
            </div>
          <p className="mt-3 text-xs text-slate-400">Invoice numbers continue automatically across all customers.</p>
          </form>
          </div>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Phone</th>
                <th className={thClass}>Shipping Address</th>
                <th className={thClass}>Next PO</th>
                <th className={thClass}>Status</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {parties.length === 0 && (
                <tr><td colSpan={6} className={tdClass + " text-center text-slate-400"}>No customers yet.</td></tr>
              )}
              {parties.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className={tdClass + " font-medium"}>{p.name}</td>
                  <td className={tdClass}>{p.phone ? stripPrefix(p.phone) : "—"}</td>
                  <td className={tdClass}>{p.shippingAddress ?? "—"}</td>
                  <td className={tdClass}>{(p.poPrefix ?? "") + (p.nextPoSeq ?? "")}</td>
                  <td className={tdClass}><Badge tone={p.isActive ? "green" : "slate"}>{p.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className={tdClass}>
                    <ActionsMenu items={menuItems(p)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete customer?"
        message={`This will permanently delete "${deleteTarget?.name}". This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
