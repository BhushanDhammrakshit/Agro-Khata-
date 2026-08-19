"use client";

import { useRef, useState } from "react";
import { api, ApiError, Driver } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";
import { PhoneInput, withPrefix, stripPrefix } from "@/components/PhoneInput";

export function DriversClient({ initialDrivers }: { initialDrivers: Driver[] }) {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({ name: "", licenceNo: "", phone: "" });

  function load() {
    api.listDrivers().then(setDrivers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load drivers."));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.createDriver({
        name: form.name,
        licenceNo: form.licenceNo || undefined,
        phone: form.phone ? withPrefix(form.phone) : undefined,
      });
      setForm({ name: "", licenceNo: "", phone: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add driver.");
    } finally {
      setCreating(false);
    }
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <AppShell title="Drivers">
      <div className="flex flex-col gap-6">
        <Card>
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 sm:cursor-default"
          >
            <span>Add Driver</span>
            <svg className={`h-4 w-4 transition-transform sm:hidden ${formOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div ref={formRef} className={`${formOpen ? "" : "hidden"} sm:block`}>
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Driver Name *</label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Ramesh Kumar" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Driving Licence No.</label>
              <input value={form.licenceNo} onChange={(e) => set("licenceNo", e.target.value)}
                placeholder="MH12 20230012345" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Contact Number</label>
              <PhoneInput value={form.phone} onChange={(v) => set("phone", v)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? "Adding…" : "Add Driver"}
              </Button>
            </div>
          </form>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-3 sm:hidden">
          {drivers.map((driver) => (
            <article key={driver.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Driver</p>
                  <p className="mt-0.5 truncate text-lg font-semibold text-slate-900">{driver.name}</p>
                </div>
                <Badge tone={driver.isActive ? "green" : "slate"}>{driver.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Driving licence</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700">{driver.licenceNo ?? "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">Contact number</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700">{driver.phone ? stripPrefix(driver.phone) : "—"}</p>
                </div>
              </div>
            </article>
          ))}
          {drivers.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">No drivers added yet.</p>}
        </div>

        <div className={`${tableWrapClass} hidden sm:block`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Driver Name</th>
                <th className={thClass}>Driving Licence</th>
                <th className={thClass}>Contact Number</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 && (
                <tr><td colSpan={4} className={tdClass + " text-center text-slate-400"}>No drivers added yet.</td></tr>
              )}
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className={tdClass + " font-medium"}>{d.name}</td>
                  <td className={tdClass}>{d.licenceNo ?? "—"}</td>
                  <td className={tdClass}>{d.phone ? stripPrefix(d.phone) : "—"}</td>
                  <td className={tdClass}><Badge tone={d.isActive ? "green" : "slate"}>{d.isActive ? "Active" : "Inactive"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
