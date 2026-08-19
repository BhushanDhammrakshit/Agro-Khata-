import { redirect } from "next/navigation";
import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import { AppShell } from "@/components/AppShell";
import { InvoiceMobileCard } from "@/components/InvoiceMobileCard";
import { Badge } from "@/components/ui/Badge";
import { linkClass, tableWrapClass, tdClass, thClass } from "@/components/ui/styles";
import { INVOICE_STATUS_TONE, formatStatusLabel } from "@/lib/status";
import { PurchaseInvoiceRowActions } from "./PurchaseInvoiceRowActions";

export default async function PurchaseInvoicesPage() {
  const invoices = await serverApi.listPurchaseInvoices().catch((err) => {
    if (err?.status === 401) redirect("/login");
    return [];
  });

  return (
    <AppShell
      title="Purchase Invoices"
      actions={
        <Link href="/purchase-invoices/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
          + New invoice
        </Link>
      }
    >

      <div className="flex flex-col gap-3 sm:hidden">
        {invoices?.map((inv) => (
          <InvoiceMobileCard
            key={inv.id}
            invoice={inv}
            href={`/purchase-invoices/${inv.id}`}
            partyLabel="Supplier"
            actions={<PurchaseInvoiceRowActions invoice={inv} compact />}
          />
        ))}
        {invoices?.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">No purchase invoices yet.</p>}
      </div>

      <div className={`${tableWrapClass} hidden sm:block`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={thClass}>Invoice No</th>
              <th className={thClass}>Supplier</th>
              <th className={thClass}>Date</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Total</th>
              <th className={thClass}>Paid</th>
              <th className={thClass}>Balance</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices?.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className={tdClass}><Link href={`/purchase-invoices/${inv.id}`} className={linkClass}>{inv.invoiceNo}</Link></td>
                <td className={tdClass}>{inv.partyName}</td>
                <td className={tdClass}>{inv.invoiceDate}</td>
                <td className={tdClass}><Badge tone={INVOICE_STATUS_TONE[inv.status]}>{formatStatusLabel(inv.status)}</Badge></td>
                <td className={tdClass}>₹{inv.totalAmount}</td>
                <td className={tdClass}>₹{inv.paidAmount}</td>
                <td className={tdClass}>₹{inv.balanceAmount}</td>
                <td className={tdClass}><PurchaseInvoiceRowActions invoice={inv} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices?.length === 0 && <p className="p-4 text-sm text-slate-500">No purchase invoices yet.</p>}
      </div>
    </AppShell>
  );
}
