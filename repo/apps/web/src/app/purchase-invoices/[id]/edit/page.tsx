"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, Party, Item, Invoice } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";
import { DatePicker } from "@/components/ui/DatePicker";
import { PartyCombobox } from "@/components/QuickAddParty";
import { ItemCombobox } from "@/components/ItemCombobox";

interface LineItem {
  itemId?: string;
  itemName: string;
  uom: string;
  qty: string;
  rate: string;
  gstRate: string;
}

const NOT_EDITABLE_STATUSES = ["paid", "cancelled"];

export default function EditPurchaseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [partyId, setPartyId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [isGstInvoice, setIsGstInvoice] = useState(false);
  const [isInterState, setIsInterState] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listParties("supplier").then(setParties).catch(() => null);
    api.listItems().then(setCatalog).catch(() => null);
  }, []);

  useEffect(() => {
    api.getPurchaseInvoice(id)
      .then((inv) => {
        setInvoice(inv);
        setPartyId(inv.partyId);
        setInvoiceNo(inv.invoiceNo);
        setInvoiceDate(inv.invoiceDate.slice(0, 10));
        setIsGstInvoice(inv.isGstInvoice);
        setIsInterState(parseFloat(inv.igstAmount) > 0);
        setItems(
          (inv.items ?? []).map((line) => ({
            itemId: line.itemId,
            itemName: line.itemName,
            uom: line.uom,
            qty: line.qty,
            rate: line.rate,
            gstRate: line.gstRate,
          })),
        );
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load invoice."))
      .finally(() => setLoading(false));
  }, [id]);

  function updateLine(index: number, patch: Partial<LineItem>) {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addLine() {
    setItems((rows) => [...rows, { itemName: "", uom: "", qty: "", rate: "", gstRate: "0" }]);
  }

  function removeLine(index: number) {
    setItems((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partyId) { setError("Please select a supplier."); return; }
    if (!invoiceDate) { setError("Please select an invoice date."); return; }
    setError(null);
    setSaving(true);
    try {
      await api.updatePurchaseInvoice(id, {
        partyId,
        invoiceNo,
        invoiceDate,
        isGstInvoice,
        isInterState,
        items: items.map((row) => ({
          itemId: row.itemId,
          itemName: row.itemName,
          uom: row.uom,
          qty: parseFloat(row.qty),
          rate: parseFloat(row.rate),
          gstRate: isGstInvoice ? parseFloat(row.gstRate || "0") : undefined,
        })),
      });
      router.push(`/purchase-invoices/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update invoice.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Edit Purchase Invoice">
        <p className="text-sm text-slate-500">Loading…</p>
      </AppShell>
    );
  }

  if (invoice && NOT_EDITABLE_STATUSES.includes(invoice.status)) {
    return (
      <AppShell title="Edit Purchase Invoice">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <Link href={`/purchase-invoices/${id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">← Back to invoice</Link>
          <Card>
            <p className="text-sm text-red-600">
              This invoice is {invoice.status === "cancelled" ? "cancelled" : "already paid"} and can no longer be edited.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit Purchase Invoice">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Link href={`/purchase-invoices/${id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">← Back to invoice</Link>

        <Card>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Supplier</label>
                <PartyCombobox
                  partyType="supplier"
                  parties={parties.filter((p) => p.isActive || p.id === partyId)}
                  value={partyId}
                  onChange={setPartyId}
                  onPartyCreated={(party) => setParties((previous) => [...previous, party])}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Invoice No</label>
                <input required value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Invoice date</label>
                <DatePicker required value={invoiceDate} onChange={setInvoiceDate} />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isGstInvoice} onChange={(e) => setIsGstInvoice(e.target.checked)} />
                GST invoice
              </label>
              {isGstInvoice && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={isInterState} onChange={(e) => setIsInterState(e.target.checked)} />
                  Inter-state (IGST)
                </label>
              )}
            </div>

            <fieldset className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-700">Line items</legend>
              <div>
              {items.map((row, i) => (
                <div key={i} className={`mb-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 sm:mb-2 sm:bg-transparent sm:p-0 ${isGstInvoice ? "sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]" : "sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"}`}>
                  <div className="col-span-2 sm:col-span-1">
                    <ItemCombobox
                      items={catalog.filter((it) => it.isActive || it.id === row.itemId)}
                      value={row.itemName}
                      uom={row.uom}
                      className={inputClass}
                      onTextChange={(name) => updateLine(i, { itemName: name, itemId: undefined })}
                      onSelect={(it) => updateLine(i, {
                        itemId: it.id,
                        itemName: it.name,
                        uom: it.uom,
                        rate: it.defaultRate ?? it.salePrice ?? "",
                        gstRate: it.gstRate ?? "0",
                      })}
                      onCreated={(it) => setCatalog((prev) => [...prev, it])}
                    />
                  </div>
                  <input required placeholder="UOM" value={row.uom} onChange={(e) => updateLine(i, { uom: e.target.value })} className={inputClass} />
                  <input required type="number" step="0.001" placeholder="Qty" value={row.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} className={inputClass} />
                  <input required type="number" step="0.01" placeholder="Rate" value={row.rate} onChange={(e) => updateLine(i, { rate: e.target.value })} className={inputClass} />
                  {isGstInvoice && (
                    <input type="number" step="0.01" placeholder="GST %" value={row.gstRate} onChange={(e) => updateLine(i, { gstRate: e.target.value })} className={inputClass} />
                  )}
                  <button type="button" aria-label={`Remove line ${i + 1}`} onClick={() => removeLine(i)} className="min-h-9 cursor-pointer rounded-lg px-2 text-sm text-red-600 hover:bg-red-50">✕</button>
                </div>
              ))}
              </div>
              <Button type="button" variant="ghost" onClick={addLine} className="self-start">+ Add line</Button>
            </fieldset>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={saving} className="self-start">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
