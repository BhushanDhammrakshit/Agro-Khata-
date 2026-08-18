import { cookies } from "next/headers";
import type {
  AuthUser, TenantSummary, DashboardKpis, Invoice, Party, PartyType,
  Item, Expense, Driver, Vehicle,
} from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function serverGet<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: `access_token=${token}` } : {}),
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw Object.assign(new Error(body?.message ?? "Request failed"), { status: res.status });
  }
  return body as T;
}

export const serverApi = {
  getMe:             () => serverGet<AuthUser>("/auth/me"),
  getMyTenant:       () => serverGet<TenantSummary>("/tenants/me"),
  getDashboardKpis:  () => serverGet<DashboardKpis>("/reports/dashboard"),
  listSalesInvoices: () => serverGet<Invoice[]>("/sales-invoices"),
  listPurchaseInvoices: () => serverGet<Invoice[]>("/purchase-invoices"),
  listParties:       (partyType?: PartyType) => serverGet<Party[]>(`/parties${partyType ? `?partyType=${partyType}` : ""}`),
  listItems:         () => serverGet<Item[]>("/items"),
  listExpenses:      () => serverGet<Expense[]>("/expenses"),
  listDrivers:       () => serverGet<Driver[]>("/drivers"),
  listVehicles:      () => serverGet<Vehicle[]>("/vehicles"),
};
