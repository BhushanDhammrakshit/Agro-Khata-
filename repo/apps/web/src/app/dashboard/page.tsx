import { redirect } from "next/navigation";
import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import { AppShell } from "@/components/AppShell";

function fmt(v: string | number) {
  return "₹" + parseFloat(String(v)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function DashboardPage() {
  const [tenant, kpis] = await Promise.all([
    serverApi.getMyTenant().catch((err) => { if (err?.status === 401) redirect("/login"); return null; }),
    serverApi.getDashboardKpis().catch(() => null),
  ]);

  const kpiCards = [
    { label: "Sales This Month",     value: kpis ? fmt(kpis.salesThisMonth)     : "—", color: "text-emerald-700", href: "/sales-invoices"                        },
    { label: "Purchases This Month", value: kpis ? fmt(kpis.purchasesThisMonth) : "—", color: "text-slate-800",   href: "/purchase-invoices"                     },
    { label: "Total Receivable",     value: kpis ? fmt(kpis.totalReceivable)     : "—", color: "text-blue-700",   href: "/reports/outstanding?type=receivable"   },
    { label: "Total Payable",        value: kpis ? fmt(kpis.totalPayable)        : "—", color: "text-orange-700", href: "/reports/outstanding?type=payable"       },
    { label: "Expenses This Month",  value: kpis ? fmt(kpis.expensesThisMonth)  : "—", color: "text-red-600",    href: "/expenses"                               },
    { label: "Low Stock Items",      value: kpis ? String(kpis.lowStockCount)   : "—", color: kpis?.lowStockCount ? "text-red-600" : "text-slate-800", href: "/reports/stock-summary" },
  ];

  return (
    <AppShell title="Dashboard" tenantName={tenant?.name}>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {kpiCards.map((c) => (
          <Link key={c.label} href={c.href} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50 transition-colors">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${c.color}`}>{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link href="/sales-invoices/new" className="flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
          + New Sale Invoice
        </Link>
        <Link href="/purchase-invoices/new" className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          + New Purchase Invoice
        </Link>
        <Link href="/expenses" className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          + Record Expense
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/reports/outstanding?type=receivable" className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4 hover:bg-blue-100">
          <div>
            <p className="text-sm font-medium text-blue-800">Outstanding Receivables</p>
            <p className="text-xs text-blue-600">Customers who owe you</p>
          </div>
          <span className="text-lg font-semibold text-blue-700">{kpis ? fmt(kpis.totalReceivable) : "—"}</span>
        </Link>
        <Link href="/reports/outstanding?type=payable" className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 p-4 hover:bg-orange-100">
          <div>
            <p className="text-sm font-medium text-orange-800">Outstanding Payables</p>
            <p className="text-xs text-orange-600">Suppliers you owe</p>
          </div>
          <span className="text-lg font-semibold text-orange-700">{kpis ? fmt(kpis.totalPayable) : "—"}</span>
        </Link>
      </div>
    </AppShell>
  );
}

