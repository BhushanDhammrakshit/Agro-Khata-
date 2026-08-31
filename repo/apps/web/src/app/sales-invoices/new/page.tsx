"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, Party, Item, Driver, Vehicle } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";
import { DatePicker } from "@/components/ui/DatePicker";
import { PartyCombobox } from "@/components/QuickAddParty";
import { ItemCombobox } from "@/components/ItemCombobox";
import { NameCombobox } from "@/components/NameCombobox";

interface LineItem {
  itemId?: string;
  itemName: string;
  uom: string;
  qty: string;
  rate: string;
  gstRate: string;
}

const emptyLine: LineItem = { itemName: "", uom: "", qty: "", rate: "", gstRate: "0" };

export default function NewSalesInvoicePage() {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [poNo, setPoNo] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [asnNo, setAsnNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [isGstInvoice, setIsGstInvoice] = useState(false);
  const [isInterState, setIsInterState] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ ...emptyLine }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listParties("customer").then(setParties).catch(() => setError("Failed to load parties."));
    api.listItems().then(setCatalog).catch(() => null);
    api.listDrivers().then(setDrivers).catch(() => null);
    api.listVehicles().then(setVehicles).catch(() => null);
  }, []);

  // Auto-fill invoice/PO numbers when party is selected
  async function handlePartyChange(id: string) {
    setPartyId(id);
    if (!id) return;
    try {
      const nums = await api.getPartyNextNumbers(id, "sales");
      setInvoiceNo(nums.invoiceNo);
      setPoNo(nums.poNo);
    } catch { /* ignore */ }
  }

  function updateLine(index: number, patch: Partial<LineItem>) {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partyId) { setError("Please select or create a customer."); return; }
    setError(null);
    setSaving(true);
    try {
      const invoice = await api.createSalesInvoice({
        partyId, invoiceNo, invoiceDate, dueDate: dueDate || undefined,
        isGstInvoice, isInterState,
        poNo: poNo || undefined, poDate: poDate || undefined,
        asnNo: asnNo || undefined,
        driverName: driverName || undefined, vehicleNo: vehicleNo || undefined,
        driverId: driverId || undefined,
        vehicleId: vehicleId || undefined,
        notes: notes || undefined,
        items: items.map((row) => ({
          itemId: row.itemId, itemName: row.itemName, uom: row.uom,
          qty: parseFloat(row.qty), rate: parseFloat(row.rate),
          gstRate: isGstInvoice ? parseFloat(row.gstRate || "0") : undefined,
        })),
      });
      router.push(`/sales-invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="New Sales Invoice">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Link href="/sales-invoices" className="text-sm font-medium text-slate-600 hover:text-slate-900">← Sales Invoices</Link>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <Card>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Customer & Invoice</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Customer</label>
                <PartyCombobox partyType="customer" parties={parties} value={partyId}
                  onChange={handlePartyChange}
                  onPartyCreated={(p) => { setParties((prev) => [...prev, p]); handlePartyChange(p.id); }} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Invoice No</label>
                <input required value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Invoice Date</label>
                <DatePicker required value={invoiceDate} onChange={setInvoiceDate} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Due Date</label>
                <DatePicker value={dueDate} onChange={setDueDate} />
              </div>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={isGstInvoice} onChange={(e) => setIsGstInvoice(e.target.checked)} />
                  GST Invoice
                </label>
                {isGstInvoice && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={isInterState} onChange={(e) => setIsInterState(e.target.checked)} />
                    Inter-state (IGST)
                  </label>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase Order</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">PO Number</label>
                <input value={poNo} onChange={(e) => setPoNo(e.target.value)} placeholder="e.g. PO-0001" className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">PO Date</label>
                <DatePicker value={poDate} onChange={setPoDate} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ASN No.</label>
                <input value={asnNo} onChange={(e) => setAsnNo(e.target.value)} placeholder="e.g. ASN-001" className={inputClass} />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Dispatch / Driver Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Driver</label>
                <NameCombobox
                  entities={drivers}
                  value={driverName}
                  getLabel={(d) => d.name}
                  getSubLabel={(d) => d.phone}
                  onTextChange={(name) => { setDriverName(name); setDriverId(""); }}
                  onSelect={(d) => { setDriverId(d.id); setDriverName(d.name); }}
                  onCreate={(name) => api.createDriver({ name })}
                  onCreated={(d) => setDrivers((prev) => [...prev, d])}
                  placeholder="Search or create driver…"
                  createLabel="driver"
                  className={inputClass}
                />
                <Link href="/drivers" className="mt-1 inline-block text-xs font-medium text-emerald-700 hover:underline">
                  + Manage drivers
                </Link>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Vehicle</label>
                <NameCombobox
                  entities={vehicles}
                  value={vehicleNo}
                  getLabel={(v) => v.vehicleNo}
                  getSubLabel={(v) => v.name}
                  onTextChange={(no) => { setVehicleNo(no); setVehicleId(""); }}
                  onSelect={(v) => { setVehicleId(v.id); setVehicleNo(v.vehicleNo); }}
                  onCreate={(vehicleNo) => api.createVehicle({ vehicleNo })}
                  onCreated={(v) => setVehicles((prev) => [...prev, v])}
                  placeholder="Search or create vehicle…"
                  createLabel="vehicle"
                  className={inputClass}
                />
                <Link href="/vehicles" className="mt-1 inline-block text-xs font-medium text-emerald-700 hover:underline">
                  + Manage vehicles
                </Link>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Line Items</h3>
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto">
              {items.map((row, i) => (
                <div key={i} className={`grid gap-2 mb-2 ${isGstInvoice ? "min-w-[540px] grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]" : "min-w-[440px] grid-cols-[2fr_1fr_1fr_1fr_auto]"}`}>
                  <ItemCombobox
                    items={catalog}
                    value={row.itemName}
                    uom={row.uom}
                    className={inputClass}
                    onTextChange={(name) => updateLine(i, { itemName: name, itemId: undefined })}
                    onSelect={(it) => updateLine(i, {
                      itemId: it.id,
                      itemName: it.name,
                      uom: it.uom,
                      rate: it.salePrice ?? it.defaultRate ?? "",
                      gstRate: it.gstRate ?? "0",
                    })}
                    onCreated={(it) => setCatalog((prev) => [...prev, it])}
                  />
                  <input required placeholder="UOM" value={row.uom} onChange={(e) => updateLine(i, { uom: e.target.value })} className={inputClass} />
                  <input required type="number" step="0.001" placeholder="Qty" value={row.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} className={inputClass} />
                  <input required type="number" step="0.01" placeholder="Rate" value={row.rate} onChange={(e) => updateLine(i, { rate: e.target.value })} className={inputClass} />
                  {isGstInvoice && <input type="number" step="0.01" placeholder="GST %" value={row.gstRate} onChange={(e) => updateLine(i, { gstRate: e.target.value })} className={inputClass} />}
                  <button type="button" onClick={() => setItems((r) => r.filter((_, j) => j !== i))} className="cursor-pointer rounded px-2 text-red-600 hover:bg-red-50">✕</button>
                </div>
              ))}
              </div>
              <Button type="button" variant="ghost" onClick={() => setItems((r) => [...r, { ...emptyLine }])} className="self-start">+ Add line</Button>
            </div>
          </Card>

          <Card>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, remarks…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none" />
          </Card>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={saving} className="self-start">
            {saving ? "Creating…" : "Create Invoice"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

