"use client";

import { useRef, useState } from "react";
import { api, ApiError, Vehicle } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";

export function VehiclesClient({ initialVehicles }: { initialVehicles: Vehicle[] }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({ vehicleNo: "", name: "", loadCapacity: "" });

  function load() {
    api.listVehicles().then(setVehicles)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load vehicles."));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.createVehicle({
        vehicleNo: form.vehicleNo,
        name: form.name || undefined,
        loadCapacity: form.loadCapacity || undefined,
      });
      setForm({ vehicleNo: "", name: "", loadCapacity: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add vehicle.");
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
            <span>Add Vehicle</span>
            <svg className={`h-4 w-4 transition-transform sm:hidden ${formOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div ref={formRef} className={`${formOpen ? "" : "hidden"} sm:block`}>
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? "Adding…" : "Add Vehicle"}
              </Button>
            </div>
          </form>
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
                <Badge tone={vehicle.isActive ? "green" : "slate"}>{vehicle.isActive ? "Active" : "Inactive"}</Badge>
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
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 && (
                <tr><td colSpan={4} className={tdClass + " text-center text-slate-400"}>No vehicles added yet.</td></tr>
              )}
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className={tdClass + " font-medium"}>{v.vehicleNo}</td>
                  <td className={tdClass}>{v.name ?? "—"}</td>
                  <td className={tdClass}>{v.loadCapacity ?? "—"}</td>
                  <td className={tdClass}><Badge tone={v.isActive ? "green" : "slate"}>{v.isActive ? "Active" : "Inactive"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
