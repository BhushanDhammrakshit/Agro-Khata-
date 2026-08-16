"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, DashboardKpis, TenantSummary } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

function fmt(v: string | number) {
  return "₹" + parseFloat(String(v)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMyTenant()
      .then(setTenant)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
        setError(err instanceof ApiError ? err.message : "Failed to load.");
      });
    api.getDashboardKpis().then(setKpis).catch(() => null);
  }, [router]);

  const kpiCards = [
    { label: "Sales This Month",     value: kpis ? fmt(kpis.salesThisMonth)     : "—", color: "text-emerald-700" },
    { label: "Purchases This Month", value: kpis ? fmt(kpis.purchasesThisMonth) : "—", color: "text-slate-800"   },
    { label: "Total Receivable",     value: kpis ? fmt(kpis.totalReceivable)     : "—", color: "text-blue-700"   },
    { label: "Total Payable",        value: kpis ? fmt(kpis.totalPayable)        : "—", color: "text-orange-700" },
    { label: "Expenses This Month",  value: kpis ? fmt(kpis.expensesThisMonth)  : "—", color: "text-red-600"    },
    { label: "Low Stock Items",      value: kpis ? String(kpis.lowStockCount)   : "—", color: kpis?.lowStockCount ? "text-red-600" : "text-slate-800" },
  ];

  return (
    <AppShell title="Dashboard" tenantName={tenant?.name}>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {kpiCards.map((c) => (
          <Card key={c.label}>
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${c.color}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <a href="/sales-invoices/new" className="flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
          + New Sale Invoice
        </a>
        <a href="/purchase-invoices/new" className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          + New Purchase Invoice
        </a>
        <a href="/expenses" className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          + Record Expense
        </a>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a href="/reports/outstanding?type=receivable" className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4 hover:bg-blue-100">
          <div>
            <p className="text-sm font-medium text-blue-800">Outstanding Receivables</p>
            <p className="text-xs text-blue-600">Customers who owe you</p>
          </div>
          <span className="text-lg font-semibold text-blue-700">{kpis ? fmt(kpis.totalReceivable) : "—"}</span>
        </a>
        <a href="/reports/outstanding?type=payable" className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 p-4 hover:bg-orange-100">
          <div>
            <p className="text-sm font-medium text-orange-800">Outstanding Payables</p>
            <p className="text-xs text-orange-600">Suppliers you owe</p>
          </div>
          <span className="text-lg font-semibold text-orange-700">{kpis ? fmt(kpis.totalPayable) : "—"}</span>
        </a>
      </div>
    </AppShell>
  );
}

