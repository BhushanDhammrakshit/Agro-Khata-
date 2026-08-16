"use client";

import { use, useEffect, useState } from "react";
import { api, ApiError, CreatePaymentDto, Invoice, PaymentMode } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { inputClass, selectClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";
import { INVOICE_STATUS_TONE, formatStatusLabel } from "@/lib/status";

export default function PurchaseInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState({ amount: "", paidDate: "", paymentMode: "cash" as PaymentMode, referenceNo: "" });

  function load() {
    api.getPurchaseInvoice(id).then(setInvoice).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load invoice."));
  }

  useEffect(load, [id]);

  async function handleSend() {
    setBusy(true);
    setError(null);
    try {
      await api.sendPurchaseInvoice(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to mark as sent.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const dto: CreatePaymentDto = {
        amount: parseFloat(payment.amount),
        paidDate: payment.paidDate,
        paymentMode: payment.paymentMode,
        referenceNo: payment.referenceNo || undefined,
      };
      await api.addPurchaseInvoicePayment(id, dto);
      setPayment({ amount: "", paidDate: "", paymentMode: "cash", referenceNo: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record payment.");
    } finally {
      setBusy(false);
    }
  }

  if (!invoice) {
    return (
      <AppShell title="Purchase Invoice">
        {error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-sm text-slate-500">Loading…</p>}
      </AppShell>
    );
  }

  return (
    <AppShell
      title={invoice.invoiceNo}
      actions={<Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{formatStatusLabel(invoice.status)}</Badge>}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <a href="/purchase-invoices" className="text-sm font-medium text-slate-600 hover:text-slate-900">← Purchase Invoices</a>

        <div className="flex justify-end">
          <button onClick={() => window.print()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 print:hidden">
            🖨 Print / Save PDF
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Card>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-slate-500">Invoice date</dt><dd className="font-medium text-slate-900">{invoice.invoiceDate}</dd></div>
            <div><dt className="text-slate-500">GST invoice</dt><dd className="font-medium text-slate-900">{invoice.isGstInvoice ? "Yes" : "No"}</dd></div>
            <div><dt className="text-slate-500">Sub total</dt><dd className="font-medium text-slate-900">₹{invoice.subTotal}</dd></div>
            {invoice.isGstInvoice && (
              <div><dt className="text-slate-500">GST (CGST/SGST/IGST)</dt><dd className="font-medium text-slate-900">₹{invoice.cgstAmount} / ₹{invoice.sgstAmount} / ₹{invoice.igstAmount}</dd></div>
            )}
            <div><dt className="text-slate-500">Total</dt><dd className="font-medium text-slate-900">₹{invoice.totalAmount}</dd></div>
            <div><dt className="text-slate-500">Paid</dt><dd className="font-medium text-slate-900">₹{invoice.paidAmount}</dd></div>
            <div><dt className="text-slate-500">Balance</dt><dd className="font-medium text-slate-900">₹{invoice.balanceAmount}</dd></div>
          </dl>
        </Card>

        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Item</th>
                <th className={thClass}>UOM</th>
                <th className={thClass}>Qty</th>
                <th className={thClass}>Rate</th>
                {invoice.isGstInvoice && <th className={thClass}>GST %</th>}
                <th className={thClass}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className={tdClass}>{item.itemName}</td>
                  <td className={tdClass}>{item.uom}</td>
                  <td className={tdClass}>{item.qty}</td>
                  <td className={tdClass}>₹{item.rate}</td>
                  {invoice.isGstInvoice && <td className={tdClass}>{item.gstRate}%</td>}
                  <td className={tdClass}>₹{item.lineTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {invoice.status === "draft" && <Button onClick={handleSend} disabled={busy} className="self-start">Mark as Sent</Button>}

        {invoice.status !== "draft" && invoice.status !== "cancelled" && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Record payment</h2>
            <form className="grid grid-cols-2 gap-3" onSubmit={handlePayment}>
              <input required type="number" step="0.01" placeholder="Amount" value={payment.amount}
                onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} className={inputClass} />
              <input required type="date" value={payment.paidDate}
                onChange={(e) => setPayment((p) => ({ ...p, paidDate: e.target.value }))} className={inputClass} />
              <select value={payment.paymentMode} onChange={(e) => setPayment((p) => ({ ...p, paymentMode: e.target.value as PaymentMode }))} className={selectClass}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
              <input placeholder="Reference no (optional)" value={payment.referenceNo}
                onChange={(e) => setPayment((p) => ({ ...p, referenceNo: e.target.value }))} className={inputClass} />
              <Button type="submit" disabled={busy} className="col-span-2">Record payment</Button>
            </form>

            {invoice.payments && invoice.payments.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1 border-t border-slate-100 pt-4 text-sm text-slate-600">
                {invoice.payments.map((p) => (
                  <li key={p.id}>₹{p.amount} on {p.paidDate} via {p.paymentMode}</li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
