"use client";

import { useEffect, useState } from "react";
import { api, ApiError, Party } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";
import { PhoneInput, withPrefix, stripPrefix } from "@/components/PhoneInput";

export default function CustomersPage() {
  const [parties, setParties] = useState<Party[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", shippingAddress: "",
    gstin: "", pan: "", fssaiNo: "",
    invoicePrefix: "INV-", nextInvoiceSeq: "1",
    poPrefix: "PO-", nextPoSeq: "1",
  });

  function load() {
    api.listParties("customer").then(setParties)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load customers."));
  }

  useEffect(load, []);

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
        invoicePrefix: form.invoicePrefix || undefined,
        poPrefix: form.poPrefix || undefined,
      });
      setForm({ name: "", phone: "", shippingAddress: "", gstin: "", pan: "", fssaiNo: "", invoicePrefix: "INV-", nextInvoiceSeq: "1", poPrefix: "PO-", nextPoSeq: "1" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create customer.");
    } finally {
      setCreating(false);
    }
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <AppShell title="Customers">
      <div className="flex flex-col gap-6">
        <Card>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Add Customer</h3>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Invoice Prefix</label>
              <input value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)}
                placeholder="INV-" className={inputClass} />
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
          </form>
          <p className="mt-3 text-xs text-slate-400">
            Invoice and PO numbers continue automatically from the last used number for each customer.
          </p>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Phone</th>
                <th className={thClass}>Shipping Address</th>
                <th className={thClass}>Next Invoice</th>
                <th className={thClass}>Next PO</th>
                <th className={thClass}>Status</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {parties?.length === 0 && (
                <tr><td colSpan={7} className={tdClass + " text-center text-slate-400"}>No customers yet.</td></tr>
              )}
              {parties?.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className={tdClass + " font-medium"}>{p.name}</td>
                  <td className={tdClass}>{p.phone ? stripPrefix(p.phone) : "—"}</td>
                  <td className={tdClass}>{p.shippingAddress ?? "—"}</td>
                  <td className={tdClass}>{(p.invoicePrefix ?? "") + (p.nextInvoiceSeq ?? "")}</td>
                  <td className={tdClass}>{(p.poPrefix ?? "") + (p.nextPoSeq ?? "")}</td>
                  <td className={tdClass}><Badge tone={p.isActive ? "green" : "slate"}>{p.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className={tdClass}>
                    <a href={`/parties/${p.id}`} className="text-emerald-700 hover:underline">Edit / Ledger</a>
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
