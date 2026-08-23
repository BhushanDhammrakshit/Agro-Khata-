import { redirect } from "next/navigation";
import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import { AppShell } from "@/components/AppShell";
import { formatCompactINR, formatINR } from "@/lib/currency";

export default async function DashboardPage() {
  const [tenant, kpis] = await Promise.all([
    serverApi.getMyTenant().catch((err) => { if (err?.status === 401) redirect("/login"); return null; }),
    serverApi.getDashboardKpis().catch(() => null),
  ]);

  const kpiCards = [
    { label: "Sales This Month",     value: kpis?.salesThisMonth,     color: "text-emerald-700", href: "/sales-invoices"                        },
    { label: "Purchases This Month", value: kpis?.purchasesThisMonth, color: "text-slate-800",   href: "/purchase-invoices"                     },
    { label: "Total Receivable",     value: kpis?.totalReceivable,    color: "text-blue-700",   href: "/reports/outstanding?type=receivable"   },
    { label: "Total Payable",        value: kpis?.totalPayable,       color: "text-orange-700", href: "/reports/outstanding?type=payable"       },
    { label: "Expenses This Month",  value: kpis?.expensesThisMonth,  color: "text-red-600",    href: "/expenses"                               },
  ];

  return (
    <AppShell title="Dashboard" tenantName={tenant?.name}>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {kpiCards.map((c) => (
          <Link key={c.label} href={c.href} className="block min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50 transition-colors">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`mt-1 break-words text-xl font-semibold sm:text-2xl ${c.color}`} title={c.value !== undefined ? formatINR(c.value) : undefined}>
              {c.value !== undefined ? formatCompactINR(c.value) : "—"}
            </p>
          </Link>
        ))}
        <Link href="/reports/stock-summary" className="block min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50 transition-colors">
          <p className="text-xs text-slate-500">Low Stock Items</p>
          <p className={`mt-1 break-words text-xl font-semibold sm:text-2xl ${kpis?.lowStockCount ? "text-red-600" : "text-slate-800"}`}>
            {kpis ? String(kpis.lowStockCount) : "—"}
          </p>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/sales-invoices/new" className="flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
          + New Sale Invoice
        </Link>
        <Link href="/purchase-invoices/new" className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          + New Purchase Invoice
        </Link>
        <Link href="/expenses" className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          + Record Expense
        </Link>
        <Link href="/transactions" className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          + Log Transaction
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/reports/outstanding?type=receivable" className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 hover:bg-blue-100">
          <div className="min-w-0">
            <p className="text-sm font-medium text-blue-800">Outstanding Receivables</p>
            <p className="text-xs text-blue-600">Customers who owe you</p>
          </div>
          <span className="shrink-0 break-words text-right text-lg font-semibold text-blue-700" title={kpis ? formatINR(kpis.totalReceivable) : undefined}>
            {kpis ? formatCompactINR(kpis.totalReceivable) : "—"}
          </span>
        </Link>
        <Link href="/reports/outstanding?type=payable" className="flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4 hover:bg-orange-100">
          <div className="min-w-0">
            <p className="text-sm font-medium text-orange-800">Outstanding Payables</p>
            <p className="text-xs text-orange-600">Suppliers you owe</p>
          </div>
          <span className="shrink-0 break-words text-right text-lg font-semibold text-orange-700" title={kpis ? formatINR(kpis.totalPayable) : undefined}>
            {kpis ? formatCompactINR(kpis.totalPayable) : "—"}
          </span>
        </Link>
      </div>
    </AppShell>
  );
}

