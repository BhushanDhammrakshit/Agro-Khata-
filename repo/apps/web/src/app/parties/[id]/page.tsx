"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, AuthUser, Party, PartyLedger } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { inputClass, tableWrapClass, thClass, tdClass } from "@/components/ui/styles";

function fmt(v: string | number) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return "₹" + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

const TXN_LABEL: Record<string, string> = {
  sales_invoice: "Sales Invoice", sales_payment: "Payment Received",
  purchase_invoice: "Purchase Invoice", purchase_payment: "Payment Made",
};

const PARTY_FIELDS: { key: keyof Party; label: string; type?: string; section: string; placeholder?: string }[] = [
  { key: "name",            label: "Name *",             section: "Basic",    placeholder: "Zepto Mumbai" },
  { key: "phone",           label: "Phone",               section: "Basic",    placeholder: "9876543210" },
  { key: "email",           label: "Email",               section: "Basic",    type: "email" },
  { key: "address",         label: "Billing Address",     section: "Basic" },
  { key: "shippingAddress", label: "Shipping Address",    section: "Basic" },
  { key: "gstin",           label: "GSTIN / UIN",         section: "Basic",    placeholder: "27AAJCK4861F1ZC" },
  { key: "pan",             label: "PAN",                  section: "Basic",    placeholder: "AAJCK4861F" },
  { key: "fssaiNo",         label: "FSSAI No.",            section: "Basic",    placeholder: "21521179000840" },
  { key: "state",           label: "State",               section: "Basic" },
  // farmerCode is rendered separately with owner-only edit
  { key: "poPrefix",        label: "PO Prefix",           section: "Invoice",  placeholder: "PO-" },
  { key: "nextPoSeq",       label: "Next PO No.",         section: "Invoice",  type: "number", placeholder: "1" },
  { key: "bankName",        label: "Bank Name",           section: "Bank" },
  { key: "bankAccount",     label: "Account No.",         section: "Bank" },
  { key: "bankIfsc",        label: "IFSC Code",           section: "Bank" },
];

const SECTIONS = ["Basic", "Invoice", "Bank"];

export default function PartyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<"profile" | "ledger">("profile");
  const [party, setParty] = useState<Party | null>(null);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<Partial<Party>>({});
  const [ledger, setLedger] = useState<PartyLedger | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingFarmerCode, setEditingFarmerCode] = useState(false);
  const [farmerCodeDraft, setFarmerCodeDraft] = useState("");
  const [savingFarmerCode, setSavingFarmerCode] = useState(false);

  useEffect(() => {
    api.getParty(id).then((p) => { setParty(p); setForm(p); setFarmerCodeDraft(p.farmerCode ?? ""); }).catch((e) => setError(e?.message ?? "Failed to load."));
    api.getMe().then(setMe).catch(() => null);
  }, [id]);

  useEffect(() => {
    if (tab === "ledger") {
      api.getPartyLedger(id).then(setLedger).catch(() => null);
    }
  }, [tab, id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaved(false); setError(null);
    try {
      const updated = await api.updateParty(id, form as Partial<Party>);
      setParty(updated); setForm(updated); setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally { setSaving(false); }
  }

  async function handleSaveFarmerCode() {
    setSavingFarmerCode(true);
    try {
      const updated = await api.updateFarmerCode(id, farmerCodeDraft);
      setParty(updated); setForm(updated); setEditingFarmerCode(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update farmer code.");
    } finally { setSavingFarmerCode(false); }
  }

  const isOwner = me?.role === "owner";
  const isSupplier = party?.partyType === "supplier" || party?.partyType === "both";
  const balance = ledger?.closingBalance ?? 0;

  return (
    <AppShell title={party?.name ?? "Party Profile"}>
      <div className="mx-auto max-w-3xl">
        <Link href="/parties" className="mb-4 inline-block text-sm font-medium text-slate-600 hover:text-slate-900">← Parties</Link>

        {/* Tabs */}
        <div className="mb-5 flex rounded-lg border border-slate-200 bg-white overflow-hidden text-sm w-fit">
          {(["profile", "ledger"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 font-medium capitalize transition-colors ${tab === t ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              {t === "profile" ? "Profile" : "Account Ledger"}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            {SECTIONS.map((section) => {
              const fields = PARTY_FIELDS.filter((f) => f.section === section && (section !== "Basic" || f.key !== "farmerCode" || isSupplier));
              if (!fields.length) return null;
              return (
                <Card key={section}>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{section} Details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {fields.map(({ key, label, type, placeholder }) => (
                      <div key={key} className={key === "address" || key === "shippingAddress" ? "sm:col-span-2" : ""}>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
                        {key === "address" || key === "shippingAddress" ? (
                          <textarea rows={2} value={(form[key] as string) ?? ""} placeholder={placeholder}
                            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none" />
                        ) : (
                          <input type={type ?? "text"} value={(form[key] as string) ?? ""} placeholder={placeholder}
                            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                            className={inputClass} />
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Farmer code — auto-generated, owner-only edit — shown only in Basic section */}
                  {section === "Basic" && isSupplier && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Farmer Code
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-normal text-slate-500">auto-generated · owner only</span>
                      </label>
                      {editingFarmerCode && isOwner ? (
                        <div className="flex items-center gap-2">
                          <input value={farmerCodeDraft} onChange={(e) => setFarmerCodeDraft(e.target.value)}
                            className={inputClass + " max-w-[160px]"} />
                          <button type="button" onClick={handleSaveFarmerCode} disabled={savingFarmerCode}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                            {savingFarmerCode ? "Saving…" : "Save"}
                          </button>
                          <button type="button" onClick={() => { setEditingFarmerCode(false); setFarmerCodeDraft(party?.farmerCode ?? ""); }}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono font-semibold text-slate-800">
                            {party?.farmerCode ?? "—"}
                          </span>
                          {isOwner && (
                            <button type="button" onClick={() => setEditingFarmerCode(true)}
                              className="text-xs font-medium text-emerald-700 hover:underline">
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && <p className="text-sm text-emerald-600">Saved successfully.</p>}
            <button type="submit" disabled={saving}
              className="self-start rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </form>
        )}

        {tab === "ledger" && ledger && (
          <>
            <div className="mb-5 grid gap-4 sm:grid-cols-3">
              <Card><p className="text-xs text-slate-500">Party</p><p className="mt-1 font-semibold">{ledger.party.name}</p></Card>
              <Card>
                <p className="text-xs text-slate-500">{balance >= 0 ? "You will receive" : "You will pay"}</p>
                <p className={`mt-1 text-2xl font-semibold ${balance >= 0 ? "text-blue-700" : "text-orange-700"}`}>{fmt(balance)}</p>
              </Card>
              <Card><p className="text-xs text-slate-500">Transactions</p><p className="mt-1 text-2xl font-semibold">{ledger.transactions.length}</p></Card>
            </div>
            <div className={tableWrapClass}>
              <table className="w-full text-sm">
                <thead><tr>
                  {["Date", "Type", "Ref No", "Debit", "Credit", "Balance"].map(h => <th key={h} className={thClass}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {ledger.transactions.length === 0 && <tr><td colSpan={6} className={tdClass + " text-center text-slate-400"}>No transactions</td></tr>}
                  {ledger.transactions.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className={tdClass}>{t.txn_date?.slice(0, 10)}</td>
                      <td className={tdClass}>{TXN_LABEL[t.txn_type] ?? t.txn_type}</td>
                      <td className={tdClass}>{t.ref_no}</td>
                      <td className={tdClass + " text-right"}>{parseFloat(t.debit) > 0 ? fmt(t.debit) : "—"}</td>
                      <td className={tdClass + " text-right"}>{parseFloat(t.credit) > 0 ? fmt(t.credit) : "—"}</td>
                      <td className={tdClass + " text-right font-medium"}>{fmt(t.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

