"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { superadminApi, ApiError, SuperadminTenant } from "@/lib/superadmin-api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { inputClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";import { PhoneInput, withPrefix } from "@/components/PhoneInput";
const initialForm = {
  companyName: "",
  legalName: "",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
};

export default function SuperadminDashboardPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<SuperadminTenant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [creating, setCreating] = useState(false);

  function load() {
    superadminApi
      .listTenants()
      .then(setTenants)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/superadmin/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Failed to load tenants.");
      });
  }

  useEffect(load, [router]);

  function update<K extends keyof typeof initialForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await superadminApi.createTenant({
        companyName: form.companyName,
        legalName: form.legalName,
        ownerName: form.ownerName,
        ownerPhone: withPrefix(form.ownerPhone),
        ownerEmail: form.ownerEmail || undefined,
      });
      setForm(initialForm);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create tenant.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(tenant: SuperadminTenant) {
    await superadminApi.updateTenantStatus(tenant.id, !tenant.isActive);
    load();
  }

  async function handleLogout() {
    await superadminApi.logout();
    router.push("/superadmin/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
        <h1 className="text-lg font-semibold text-white">AgroKhata — Tenant companies</h1>
        <Button variant="ghost" onClick={handleLogout} className="text-slate-300 hover:bg-slate-800 hover:text-white">Log out</Button>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Onboard a new company</h2>
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleCreate}>
            <input required placeholder="Company display name" value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)} className={inputClass} />
            <input required placeholder="Legal name" value={form.legalName}
              onChange={(e) => update("legalName", e.target.value)} className={inputClass} />
            <input required placeholder="Owner name" value={form.ownerName}
              onChange={(e) => update("ownerName", e.target.value)} className={inputClass} />
            <PhoneInput required value={form.ownerPhone} onChange={(v) => update("ownerPhone", v)} />
            <input placeholder="Owner email (optional)" type="email" value={form.ownerEmail}
              onChange={(e) => update("ownerEmail", e.target.value)} className={`${inputClass} sm:col-span-2`} />
            <Button type="submit" disabled={creating} className="sm:col-span-2">
              {creating ? "Creating…" : "Create tenant"}
            </Button>
          </form>
        </Card>

        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Company</th>
                <th className={thClass}>Users</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tenants?.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className={tdClass}>{t.name}</td>
                  <td className={tdClass}>{t.userCount}</td>
                  <td className={tdClass}>
                    <Badge tone={t.isActive ? "green" : "red"}>{t.isActive ? "Active" : "Suspended"}</Badge>
                  </td>
                  <td className={tdClass}>
                    <button onClick={() => toggleActive(t)} className="font-medium text-emerald-700 hover:underline">
                      {t.isActive ? "Suspend" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
