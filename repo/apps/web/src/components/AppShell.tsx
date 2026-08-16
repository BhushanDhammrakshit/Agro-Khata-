"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, AuthUser } from "@/lib/api";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/drivers", label: "Drivers" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/items", label: "Items" },
  { href: "/sales-invoices", label: "Sales Invoices" },
  { href: "/purchase-invoices", label: "Purchase Invoices" },
  { href: "/expenses", label: "Expenses" },
];

const REPORT_ITEMS = [
  { href: "/reports/sales", label: "Sales" },
  { href: "/reports/purchases", label: "Purchases" },
  { href: "/reports/outstanding", label: "Outstanding" },
  { href: "/reports/stock-summary", label: "Stock Summary" },
  { href: "/reports/profit-loss", label: "Profit & Loss" },
  { href: "/reports/expenses", label: "Expenses" },
];

const SETTINGS_ITEMS = [
  { href: "/settings/company", label: "Company" },
  { href: "/settings/audit-log", label: "Audit Log" },
];

function NavContent({
  pathname,
  initials,
  me,
  onNavigate,
  handleLogout,
}: {
  pathname: string | null;
  initials: string;
  me: AuthUser | null;
  onNavigate?: () => void;
  handleLogout: () => void;
}) {
  const [reportsOpen, setReportsOpen] = useState(false);

  const link = (href: string, label: string) => {
    const active = href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
    return (
      <a key={href} href={href} onClick={onNavigate}
        className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"}`}>
        {label}
      </a>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => link(item.href, item.label))}
        <p className="mt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Reports</p>
        <button onClick={() => setReportsOpen(o => !o)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100">
          <span>{reportsOpen ? "Hide" : "Show"} Reports</span>
          <span className="text-xs">{reportsOpen ? "▲" : "▼"}</span>
        </button>
        {reportsOpen && REPORT_ITEMS.map((item) => link(item.href, item.label))}
        <p className="mt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Settings</p>
        {SETTINGS_ITEMS.map((item) => link(item.href, item.label))}
      </nav>
      <div className="border-t border-slate-200 p-3 space-y-1">
        <a href="/profile" onClick={onNavigate}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === "/profile" ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"}`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
            {initials}
          </span>
          <span className="truncate">{me?.name ?? "My Profile"}</span>
        </a>
        <button onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
          Log out
        </button>
      </div>
    </div>
  );
}

export function AppShell({
  title,
  tenantName,
  actions,
  children,
}: {
  title: string;
  tenantName?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    api.getMe().then(setMe).catch(() => null);
  }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const initials = me?.name
    ? me.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  async function handleLogout() {
    await api.logout();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white sm:flex">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-lg font-semibold text-emerald-700">AgroKhata</p>
          {tenantName && <p className="mt-0.5 truncate text-xs text-slate-500">{tenantName}</p>}
        </div>
        <NavContent pathname={pathname} initials={initials} me={me} handleLogout={handleLogout} />
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          {/* Drawer panel */}
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-lg font-semibold text-emerald-700">AgroKhata</p>
                {tenantName && <p className="mt-0.5 truncate text-xs text-slate-500">{tenantName}</p>}
              </div>
              <button onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <NavContent pathname={pathname} initials={initials} me={me}
              onNavigate={() => setDrawerOpen(false)} handleLogout={handleLogout} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 sm:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {actions}
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

