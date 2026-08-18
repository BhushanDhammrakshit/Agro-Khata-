"use client";

import { useEffect, useRef, useState } from "react";
import { api, TenantSummary } from "@/lib/api";
import { AppShell } from "@/components/AppShell";

const fields: { key: keyof TenantSummary; label: string; type?: string; placeholder?: string }[] = [
  { key: "name",            label: "Company Name",       placeholder: "Khushal Agro Mall" },
  { key: "legalName",       label: "Legal Company Name", placeholder: "Khushal Agro Mall" },
  { key: "address",         label: "Address",            placeholder: "Full address" },
  { key: "contactPhone",    label: "Contact Phone",      placeholder: "9876543210" },
  { key: "contactEmail",    label: "Email",              type: "email", placeholder: "info@company.com" },
  { key: "pan",             label: "PAN",                placeholder: "ABCDE1234F" },
  { key: "gstin",           label: "GSTIN",              placeholder: "27ABCDE1234F1Z5" },
  { key: "bankName",        label: "Bank Name",          placeholder: "State Bank of India" },
  { key: "bankAccount",     label: "Bank Account No.",   placeholder: "1234567890" },
  { key: "bankIfsc",        label: "Bank IFSC",          placeholder: "SBIN0001234" },
  { key: "bankUpi",         label: "UPI ID",             placeholder: "business@upi" },
  { key: "invoicePrefix",   label: "Invoice Prefix",     placeholder: "INV-" },
  { key: "termsConditions", label: "Terms & Conditions", placeholder: "e.g. Payment due within 30 days" },
];

function ImageUploadField({
  label, value, onChange,
}: { label: string; value?: string; onChange: (dataUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-3">
        {value && (
          <img src={value} alt={label} className="h-14 w-auto rounded border border-slate-200 object-contain" />
        )}
        <button type="button" onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          {value ? "Change image" : "Upload image"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")}
            className="cursor-pointer text-sm text-red-500 hover:underline">Remove</button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <p className="mt-1 text-xs text-slate-400">PNG, JPG or SVG · max 200 KB recommended</p>
    </div>
  );
}

export default function CompanySettingsPage() {
  const [form, setForm] = useState<Partial<TenantSummary>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    api.getMyTenant().then((t) => setForm(t));
  }, []);

  function set(key: keyof TenantSummary, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateMyTenant(form);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Company Settings">
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Business Details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ key, label, type, placeholder }) => (
              key === "termsConditions" ? (
                <div key={key} className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
                  <textarea rows={3} value={(form[key] as string) ?? ""} placeholder={placeholder}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none" />
                </div>
              ) : (
                <div key={key}>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
                  <input type={type ?? "text"} value={(form[key] as string) ?? ""} placeholder={placeholder}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                </div>
              )
            ))}
          </div>

          {/* Logo and signature uploads */}
          <div className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <ImageUploadField
              label="Company Logo (shown on bills)"
              value={form.logoUrl}
              onChange={(v) => { setForm((f) => ({ ...f, logoUrl: v })); setSaved(false); }}
            />
            <ImageUploadField
              label="Authorized Signature (shown on bills)"
              value={form.signatureUrl}
              onChange={(v) => { setForm((f) => ({ ...f, signatureUrl: v })); setSaved(false); }}
            />
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {saved && <p className="mt-4 text-sm text-emerald-600">Settings saved successfully.</p>}

          <button type="submit" disabled={saving}
            className="mt-6 w-full cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
