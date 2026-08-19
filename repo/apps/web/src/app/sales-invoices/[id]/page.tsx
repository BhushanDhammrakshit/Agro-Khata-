"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, CreatePaymentDto, Invoice, PaymentMode } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { inputClass, tdClass, thClass } from "@/components/ui/styles";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { INVOICE_STATUS_TONE, formatStatusLabel } from "@/lib/status";
import { SalesBillPrintModal } from "./SalesBillPrintModal";
import { shareInvoicePdf } from "@/lib/share-invoice-pdf";

function inr(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(n) ? "₹0.00" : `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{title}</p>
      <dl className="flex flex-col gap-1.5">{children}</dl>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default function SalesInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [payment, setPayment] = useState({ amount: "", paidDate: "", paymentMode: "bank_transfer" as PaymentMode, referenceNo: "" });

  function load() {
    api.getSalesInvoice(id).then(setInvoice).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load invoice."));
  }

  useEffect(load, [id]);

  async function handleSend() {
    setBusy(true);
    setError(null);
    try {
      await api.sendSalesInvoice(id);
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
      await api.addSalesInvoicePayment(id, dto);
      setPayment({ amount: "", paidDate: "", paymentMode: "bank_transfer", referenceNo: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record payment.");
    } finally {
      setBusy(false);
    }
  }

  if (!invoice) {
    return (
      <AppShell title="Sales Invoice">
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
        <Link href="/sales-invoices" className="text-sm font-medium text-slate-600 hover:text-slate-900">← Sales Invoices</Link>

        <div className="flex justify-end gap-2 print:hidden">
          <button onClick={() => setShowBill(true)}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            🖨 Print Invoice
          </button>
          <button
            onClick={async () => {
              try {
                setSharing(true);
                await shareInvoicePdf("sales", invoice.id);
              } catch {
                // Ignore failures to preserve existing UX.
              } finally {
                setSharing(false);
              }
            }}
            disabled={sharing}
            aria-busy={sharing}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {sharing ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" opacity="0.25" />
                <path strokeLinecap="round" d="M21 12a9 9 0 0 0-9-9" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 9-18 9 4-9-4-9Zm0 9h9" />
              </svg>
            )}
            {sharing ? "Preparing PDF..." : "Share PDF"}
          </button>
        </div>

        {showBill && <SalesBillPrintModal invoiceId={invoice.id} onClose={() => setShowBill(false)} />}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Invoice document */}
        <Card className="overflow-hidden !p-0">
          {/* Header band */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-slate-50 px-6 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Tax Invoice</p>
              <h2 className="mt-0.5 text-2xl font-bold text-slate-900">{invoice.invoiceNo}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Dated {invoice.invoiceDate}
                {invoice.dueDate && <> · Due {invoice.dueDate}</>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Amount Due</p>
              <p className={`text-2xl font-bold ${parseFloat(invoice.balanceAmount) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {inr(invoice.balanceAmount)}
              </p>
              <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{formatStatusLabel(invoice.status)}</Badge>
            </div>
          </div>

          {/* Detail sections */}
          <div className="grid gap-6 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <DetailBlock title="Invoice">
              <DetailRow label="Invoice date" value={invoice.invoiceDate} />
              {invoice.dueDate && <DetailRow label="Due date" value={invoice.dueDate} />}
              <DetailRow label="GST invoice" value={invoice.isGstInvoice ? "Yes" : "No"} />
            </DetailBlock>

            {(invoice.poNo || invoice.poDate || invoice.asnNo) && (
              <DetailBlock title="Purchase order">
                {invoice.poNo && <DetailRow label="PO number" value={invoice.poNo} />}
                {invoice.poDate && <DetailRow label="PO date" value={invoice.poDate} />}
                {invoice.asnNo && <DetailRow label="ASN no." value={invoice.asnNo} />}
              </DetailBlock>
            )}

            {(invoice.driverName || invoice.vehicleNo) && (
              <DetailBlock title="Dispatch">
                {invoice.driverName && <DetailRow label="Driver" value={invoice.driverName} />}
                {invoice.vehicleNo && <DetailRow label="Vehicle no." value={invoice.vehicleNo} />}
              </DetailBlock>
            )}
          </div>

          {/* Line items */}
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={`${thClass} w-10 text-center`}>#</th>
                  <th className={thClass}>Item</th>
                  <th className={thClass}>UOM</th>
                  <th className={`${thClass} text-right`}>Qty</th>
                  <th className={`${thClass} text-right`}>Rate</th>
                  {invoice.isGstInvoice && <th className={`${thClass} text-right`}>GST %</th>}
                  <th className={`${thClass} text-right`}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, i) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className={`${tdClass} text-center text-slate-400`}>{i + 1}</td>
                    <td className={`${tdClass} font-medium text-slate-900`}>{item.itemName}</td>
                    <td className={tdClass}>{item.uom}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{item.qty}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{inr(item.rate)}</td>
                    {invoice.isGstInvoice && <td className={`${tdClass} text-right tabular-nums`}>{item.gstRate}%</td>}
                    <td className={`${tdClass} text-right font-medium tabular-nums text-slate-900`}>{inr(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals summary */}
          <div className="flex flex-col items-end gap-1.5 border-t border-slate-200 bg-slate-50 px-6 py-5 text-sm">
            <div className="flex w-full max-w-xs justify-between text-slate-600">
              <span>Sub total</span><span className="tabular-nums">{inr(invoice.subTotal)}</span>
            </div>
            {invoice.isGstInvoice && (
              <>
                {parseFloat(invoice.igstAmount) > 0 ? (
                  <div className="flex w-full max-w-xs justify-between text-slate-600">
                    <span>IGST</span><span className="tabular-nums">{inr(invoice.igstAmount)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex w-full max-w-xs justify-between text-slate-600">
                      <span>CGST</span><span className="tabular-nums">{inr(invoice.cgstAmount)}</span>
                    </div>
                    <div className="flex w-full max-w-xs justify-between text-slate-600">
                      <span>SGST</span><span className="tabular-nums">{inr(invoice.sgstAmount)}</span>
                    </div>
                  </>
                )}
              </>
            )}
            <div className="my-1 w-full max-w-xs border-t border-slate-200" />
            <div className="flex w-full max-w-xs justify-between text-base font-bold text-slate-900">
              <span>Total</span><span className="tabular-nums">{inr(invoice.totalAmount)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between text-emerald-700">
              <span>Paid</span><span className="tabular-nums">{inr(invoice.paidAmount)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between font-semibold text-rose-600">
              <span>Balance</span><span className="tabular-nums">{inr(invoice.balanceAmount)}</span>
            </div>
          </div>
        </Card>

        {invoice.status === "draft" && <Button onClick={handleSend} disabled={busy} className="self-start">Mark as Sent</Button>}

        {invoice.status !== "draft" && invoice.status !== "cancelled" && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Record payment</h2>
            <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handlePayment}>
              <input required type="number" step="0.01" placeholder="Amount" value={payment.amount}
                onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} className={inputClass} />
              <input required type="date" value={payment.paidDate}
                onChange={(e) => setPayment((p) => ({ ...p, paidDate: e.target.value }))} className={inputClass} />
              <CustomSelect
                value={payment.paymentMode}
                onChange={(val) => setPayment((p) => ({ ...p, paymentMode: val as PaymentMode }))}
                options={[
                  { value: "bank_transfer", label: "Bank transfer" },
                  { value: "upi", label: "UPI" },
                  { value: "cash", label: "Cash" },
                  { value: "cheque", label: "Cheque" },
                  { value: "other", label: "Other" },
                ]}
              />
              <input placeholder="Reference no (optional)" value={payment.referenceNo}
                onChange={(e) => setPayment((p) => ({ ...p, referenceNo: e.target.value }))} className={inputClass} />
              <Button type="submit" disabled={busy} className="sm:col-span-2">Record payment</Button>
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
