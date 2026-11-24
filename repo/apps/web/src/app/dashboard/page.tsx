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
    { label: "Sales This Month",     value: kpis?.salesThisMonth,     color: "text-[var(--color-teal)]", href: "/sales-invoices" },
    { label: "Purchases This Month", value: kpis?.purchasesThisMonth, color: "text-[var(--color-ink)]", href: "/purchase-invoices" },
    { label: "Total Receivable",     value: kpis?.totalReceivable,    color: "text-[var(--color-info)]", href: "/reports/outstanding?type=receivable" },
    { label: "Total Payable",        value: kpis?.totalPayable,       color: "text-[var(--color-accent-dark)]", href: "/reports/outstanding?type=payable" },
    { label: "Expenses This Month",  value: kpis?.expensesThisMonth,  color: "text-[var(--color-overdue)]", href: "/expenses" },
  ];

  return (
    <AppShell title="Dashboard" tenantName={tenant?.name}>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {kpiCards.map((c) => (
          <Link key={c.label} href={c.href} className="block min-w-0 border-y border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-4 hover:bg-[var(--color-paper)] transition-colors">
            <p className="text-xs font-bold text-[var(--color-muted)]">{c.label}</p>
            <p className={`mt-1 break-words text-xl font-extrabold tabular-nums sm:text-2xl ${c.color}`} title={c.value !== undefined ? formatINR(c.value) : undefined}>
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
        <Link href="/sales-invoices/new" className="flex items-center justify-center border border-[var(--color-ink)] bg-[var(--color-ink)] p-5 text-sm font-bold text-[var(--color-paper-light)] hover:bg-[var(--color-ink-soft)] dark:border-[var(--color-accent-dark-theme)] dark:bg-[var(--color-accent-dark-theme)] dark:text-[#1E1F2B] dark:hover:bg-[var(--color-accent-strong-dark)]">
          + New Sale Invoice
        </Link>
        <Link href="/purchase-invoices/new" className="flex items-center justify-center border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 text-sm font-bold text-[var(--color-ink)] hover:bg-[var(--color-paper)]">
          + New Purchase Invoice
        </Link>
        <Link href="/expenses" className="flex items-center justify-center border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 text-sm font-bold text-[var(--color-ink)] hover:bg-[var(--color-paper)]">
          + Record Expense
        </Link>
        <Link href="/transactions" className="flex items-center justify-center border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 text-sm font-bold text-[var(--color-ink)] hover:bg-[var(--color-paper)]">
          + Log Transaction
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/reports/outstanding?type=receivable" className="flex items-center justify-between gap-3 border border-[#C6D5DF] bg-[#E7EDF1] p-4 hover:bg-[#D9E4EA] dark:border-[#536778] dark:bg-[#2E3B47] dark:hover:bg-[#374C5C]">
          <div className="min-w-0">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Outstanding Receivables</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Customers who owe you</p>
          </div>
          <span className="shrink-0 break-words text-right text-lg font-semibold text-blue-700 dark:text-blue-300" title={kpis ? formatINR(kpis.totalReceivable) : undefined}>
            {kpis ? formatCompactINR(kpis.totalReceivable) : "—"}
          </span>
        </Link>
        <Link href="/reports/outstanding?type=payable" className="flex items-center justify-between gap-3 border border-[#DFC29F] bg-[#F2DFC9] p-4 hover:bg-[#E8CBAA] dark:border-[#735E48] dark:bg-[#49372A] dark:hover:bg-[#59422F]">
          <div className="min-w-0">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Outstanding Payables</p>
            <p className="text-xs text-orange-600 dark:text-orange-400">Suppliers you owe</p>
          </div>
          <span className="shrink-0 break-words text-right text-lg font-semibold text-orange-700 dark:text-orange-300" title={kpis ? formatINR(kpis.totalPayable) : undefined}>
            {kpis ? formatCompactINR(kpis.totalPayable) : "—"}
          </span>
        </Link>
      </div>
    </AppShell>
  );
}

