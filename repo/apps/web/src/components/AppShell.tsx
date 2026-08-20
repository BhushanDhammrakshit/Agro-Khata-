"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AuthUser, CompanyChoice } from "@/lib/api";
import { useAppUser } from "@/lib/AppUserContext";

/* ─── icons ─────────────────────────────────────────────────────────────── */
const Icon = {
  Dashboard:  <path d="M2 10.5A8.5 8.5 0 1 1 10.5 19 8.51 8.51 0 0 1 2 10.5Zm8.5-6a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM9.25 8.5a1.25 1.25 0 1 1 2.5 0v2.75h2a1.25 1.25 0 1 1 0 2.5H10.5a1.25 1.25 0 0 1-1.25-1.25V8.5Z" />,
  Customers:  <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z" />,
  Suppliers:  <><path d="M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><rect width="6" height="4" x="7" y="2" rx="1" /><path d="M7 10h6M7 14h6" /></>,
  Drivers:    <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" />,
  Vehicles:   <><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" /><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" /><path d="M5 17H3v-4l2-5h9l2 5v1m0-1h2l1 2v2h-2" /></>,
  Items:      <><path d="M20 7l-8-4-8 4m16 0v10l-8 4m0-14v14m-8-4l8 4m-8-14v10" /></>,
  SalesInv:   <><path d="M9 12h6M9 16h6M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l5 5v11a2 2 0 0 1-2 2Z" /></>,
  PurchInv:   <><path d="M9 12h6M9 16h4m5-11v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7l4-4h9a2 2 0 0 1 2 2Z" /></>,
  Expenses:   <><path d="M3 10h18M7 15h.01M11 15h2m-7 5h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2Z" /></>,
  Payments:   <><path d="M12 8v8m-3-5h6m-6 2h6" /><rect width="18" height="14" x="3" y="5" rx="2" /></>,
  Reports:    <><path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2Zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z" /></>,
  Settings:   <><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M19.622 10.395l-1.097-2.65L20 6l-2-2-1.735 1.483-2.707-1.113L12.935 2h-1.954l-.632 2.401-2.645 1.115L6 4 4 6l1.453 1.789-1.08 2.657L2 11v2l2.401.656L5.516 16.3 4 18l2 2 1.791-1.46 2.606 1.072L11 22h2l.604-2.401 2.651-1.072L18 20l2-2-1.432-1.727 1.05-2.614L22 13v-2l-2.378-.605Z" /></>,
  Profile:    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12Zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8Z" />,
  Logout:     <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />,
  ChevronD:   <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />,
  ChevronL:   <path d="M15 18l-6-6 6-6" />,
  ChevronR:   <path d="M9 18l6-6-6-6" />,
  Plus:       <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />,
  Check:      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />,
  Close:      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />,
  Menu:       <><path d="M4 6h16M4 12h16M4 18h16" /></>,
};

function SvgIcon({ d, size = 18 }: { d: React.ReactNode; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      className="shrink-0">
      {d}
    </svg>
  );
}

/* ─── nav config ─────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { href: "/dashboard",         label: "Dashboard",         icon: Icon.Dashboard  },
  { href: "/customers",         label: "Customers",         icon: Icon.Customers  },
  { href: "/suppliers",         label: "Suppliers",         icon: Icon.Suppliers  },
  { href: "/drivers",           label: "Drivers",           icon: Icon.Drivers    },
  { href: "/vehicles",          label: "Vehicles",          icon: Icon.Vehicles   },
  { href: "/items",             label: "Items",             icon: Icon.Items      },
  { href: "/sales-invoices",    label: "Sales Invoices",    icon: Icon.SalesInv   },
  { href: "/purchase-invoices", label: "Purchase Invoices", icon: Icon.PurchInv   },
  { href: "/payments",          label: "Payments",          icon: Icon.Payments   },
  { href: "/expenses",          label: "Expenses",          icon: Icon.Expenses   },
];

const REPORT_ITEMS = [
  { href: "/reports/sales",        label: "Sales"       },
  { href: "/reports/purchases",    label: "Purchases"   },
  { href: "/reports/purchase-payments", label: "Purchase Payments" },
  { href: "/reports/outstanding",  label: "Outstanding" },
  { href: "/reports/stock-summary",label: "Stock Summary"},
  { href: "/reports/profit-loss",  label: "Profit & Loss"},
  { href: "/reports/expenses",     label: "Expenses"    },
];

const SETTINGS_ITEMS = [
  { href: "/settings/company",   label: "Company"   },
  { href: "/settings/team",      label: "Team"      },
  { href: "/settings/audit-log", label: "Audit Log" },
];

/* ─── company dropdown ───────────────────────────────────────────────────── */
function CompanyDropdown({
  me,
  companies,
  onSelect,
  collapsed,
}: {
  me: AuthUser;
  companies: CompanyChoice[];
  onSelect: (tenantId: string) => void;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentName = companies.find((c) => c.tenantId === me.tenantId)?.companyName ?? "Company";

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (collapsed) {
    return (
      <div ref={ref} className="relative flex justify-center">
        <button onClick={() => setOpen((o) => !o)}
          title={currentName}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-emerald-700 shadow-sm hover:border-emerald-400">
          {currentName.slice(0, 1).toUpperCase()}
        </button>
        {open && (
          <div className="absolute left-full top-0 z-50 ml-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {companies.map((c) => (
              <button key={c.tenantId} onClick={() => { setOpen(false); onSelect(c.tenantId); }}
                className={`flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${c.tenantId === me.tenantId ? "font-semibold text-emerald-700" : "text-slate-700"}`}>
                {c.tenantId === me.tenantId
                  ? <svg className="h-3.5 w-3.5 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">{Icon.Check}</svg>
                  : <span className="w-3.5 shrink-0" />}
                <span className="truncate">{c.companyName}</span>
              </button>
            ))}
            <div className="my-1 border-t border-slate-100" />
            <button onClick={() => { setOpen(false); onSelect("register"); }}
              className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-sm text-emerald-700 hover:bg-emerald-50">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">{Icon.Plus}</svg>
              Register another company
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-400 hover:text-emerald-700 focus:outline-none">
        <span className="truncate">{currentName}</span>
        <svg className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">{Icon.ChevronD}</svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {companies.map((c) => (
            <button key={c.tenantId} onClick={() => { setOpen(false); onSelect(c.tenantId); }}
              className={`flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${c.tenantId === me.tenantId ? "font-semibold text-emerald-700" : "text-slate-700"}`}>
              {c.tenantId === me.tenantId
                ? <svg className="h-3.5 w-3.5 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">{Icon.Check}</svg>
                : <span className="w-3.5 shrink-0" />}
              <span className="truncate">{c.companyName}</span>
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <button onClick={() => { setOpen(false); onSelect("register"); }}
            className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-sm text-emerald-700 hover:bg-emerald-50">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">{Icon.Plus}</svg>
            Register another company
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── sidebar nav ────────────────────────────────────────────────────────── */
function Sidebar({
  pathname,
  initials,
  me,
  companies,
  onCompanySelect,
  handleLogout,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: {
  pathname: string | null;
  initials: string;
  me: AuthUser | null;
  companies: CompanyChoice[];
  onCompanySelect: (id: string) => void;
  handleLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const [reportsOpen, setReportsOpen] = useState(false);
  // Mobile drawer always shows full labels, independent of the desktop icon-only preference.
  const effectiveCollapsed = collapsed && !mobileOpen;

  const label = (text: string) => <span className={effectiveCollapsed ? "hidden" : "truncate"}>{text}</span>;

  const navLink = (href: string, label: string, icon?: React.ReactNode) => {
    const active = href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
    return (
      <Link key={href} href={href} title={label}
        className={`group flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors
          ${active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"}`}>
        {icon && <span className="shrink-0"><SvgIcon d={icon} /></span>}
        <span className={effectiveCollapsed ? "hidden" : "truncate"}>{label}</span>
      </Link>
    );
  };

  return (
    <aside className={`flex ${collapsed ? "w-14" : "w-60"} shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-500 ease-in-out max-sm:w-64 max-sm:fixed max-sm:inset-y-0 max-sm:left-0 max-sm:z-40 max-sm:shadow-2xl max-sm:transition-transform max-sm:duration-500 max-sm:ease-in-out ${mobileOpen ? "max-sm:translate-x-0" : "max-sm:-translate-x-full"}`}>
      {/* Logo + collapse toggle — stacked instead of side-by-side when collapsed so the toggle never overflows off the narrow rail */}
      <div className={`flex items-center gap-2 border-b border-slate-200 px-2 py-4 lg:px-3 ${effectiveCollapsed ? "flex-col justify-center" : "justify-between"}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
            <Image src="/AgroKhata.jpeg" alt="AgroKhata" fill className="object-contain p-0.5" />
          </span>
          {!effectiveCollapsed && <p className="truncate text-lg font-semibold text-emerald-700">AgroKhata</p>}
        </div>
        <button onClick={onToggleCollapse} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 sm:flex">
          <SvgIcon d={collapsed ? Icon.ChevronR : Icon.ChevronL} size={16} />
        </button>
        <button onClick={onMobileClose} title="Close menu"
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 sm:hidden">
          <SvgIcon d={Icon.Close} size={18} />
        </button>
      </div>

      {/* Company switcher */}
      {me && companies.length > 0 && (
        <div className="border-b border-slate-100 p-2 lg:p-3">
          <CompanyDropdown me={me} companies={companies} onSelect={onCompanySelect} collapsed={effectiveCollapsed} />
        </div>
      )}

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 lg:p-3">
        {NAV_ITEMS.map((item) => navLink(item.href, item.label, item.icon))}

        {/* Reports section */}
        {!effectiveCollapsed && <p className="mt-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Reports</p>}
        <button onClick={() => setReportsOpen((o) => !o)} title="Reports"
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
          <SvgIcon d={Icon.Reports} />
          {label(`${reportsOpen ? "Hide" : "Show"} Reports`)}
          {!effectiveCollapsed && (
            <svg className={`ml-auto h-3.5 w-3.5 transition-transform ${reportsOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">{Icon.ChevronD}</svg>
          )}
        </button>
        {reportsOpen && REPORT_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} title={item.label}
            className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors
              ${pathname?.startsWith(item.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"}`}>
            {!effectiveCollapsed && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-current" />}
            {label(item.label)}
          </Link>
        ))}

        {/* Settings section */}
        {!effectiveCollapsed && <p className="mt-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Settings</p>}
        {SETTINGS_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} title={item.label}
            className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors
              ${pathname?.startsWith(item.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"}`}>
            <SvgIcon d={Icon.Settings} />
            {label(item.label)}
          </Link>
        ))}
      </nav>

      {/* Profile + logout */}
      <div className="border-t border-slate-200 p-2 space-y-0.5 lg:p-3">
        <Link href="/profile" title="My Profile"
          className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors
            ${pathname === "/profile" ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"}`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
            {initials}
          </span>
          {label(me?.name ?? "My Profile")}
        </Link>
        <button onClick={handleLogout} title="Log out"
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <SvgIcon d={Icon.Logout} />
          {label("Log out")}
        </button>
      </div>
    </aside>
  );
}

/* ─── shell ──────────────────────────────────────────────────────────────── */
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
  const { me, companies } = useAppUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("sidebar-collapsed") === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const initials = me?.name
    ? me.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  async function handleLogout() {
    await api.logout();
    router.push("/login");
  }

  async function handleCompanyChange(nextTenantId: string) {
    if (nextTenantId === "register") { router.push("/register"); return; }
    if (!me || nextTenantId === me.tenantId) return;
    await api.logout();
    const params = new URLSearchParams({ phone: me.phone, tenantId: nextTenantId });
    window.location.href = `/login?${params.toString()}`;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 sm:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <Sidebar
        pathname={pathname}
        initials={initials}
        me={me}
        companies={companies}
        onCompanySelect={handleCompanyChange}
        handleLogout={handleLogout}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <button onClick={() => setMobileOpen(true)} title="Open menu"
                className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 sm:hidden">
                <SvgIcon d={Icon.Menu} size={20} />
              </button>
              <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {actions}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
