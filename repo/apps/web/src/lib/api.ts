// Keep browser requests on the web origin. Next rewrites /api to the backend,
// allowing its httpOnly authentication cookie to belong to the web hostname.
const API_URL = "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include", // send/receive the httpOnly access_token cookie
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    // Only these two legitimately return 401 for a wrong password/OTP during login itself.
    const isLoginAttempt = path === "/auth/password/login" || path === "/auth/otp/verify";
    if (res.status === 401 && typeof window !== "undefined" && !isLoginAttempt) {
      // Stale/invalid session (e.g. token's user no longer exists) — force a clean re-login.
      clearCache();
      if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
    }
    throw new ApiError(body?.message ?? "Something went wrong.", res.status);
  }
  return body as T;
}

// Lightweight in-memory GET cache so reference data (parties, items, drivers,
// vehicles…) is fetched once on load and reused instantly across pages.
interface CacheEntry { value: unknown; expires: number; }
const getCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const REF_TTL     = 60_000;  // stable reference data: parties, items, etc.
const LIST_TTL    = 30_000;  // mutable lists: invoices, expenses, KPIs
const SESSION_TTL = 300_000; // session-scoped data: getMe, getMyTenant

function cachedRequest<T>(path: string, ttl = REF_TTL): Promise<T> {
  const now = Date.now();
  const hit = getCache.get(path);
  if (hit && hit.expires > now) return Promise.resolve(hit.value as T);

  const pending = inflight.get(path);
  if (pending) return pending as Promise<T>;

  const p = request<T>(path)
    .then((value) => {
      getCache.set(path, { value, expires: Date.now() + ttl });
      inflight.delete(path);
      return value;
    })
    .catch((err) => {
      // Evict so the next caller triggers a fresh fetch instead of reusing this rejection.
      inflight.delete(path);
      throw err;
    });
  inflight.set(path, p);
  return p;
}

// Drop cached entries whose path starts with any of the given prefixes.
function invalidate(...prefixes: string[]) {
  for (const key of getCache.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) getCache.delete(key);
  }
}

// Every cached response is scoped to whichever tenant was active when it was
// fetched — must be wiped in full on logout so switching companies/logging
// back in doesn't serve another tenant's stale parties/items/invoices/etc.
function clearCache() {
  getCache.clear();
  inflight.clear();
}

export interface TenantSummary {
  id: string;
  name: string;
  legalName: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  pan?: string;
  gstin?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  bankUpi?: string;
  invoicePrefix?: string;
  termsConditions?: string;
  logoUrl?: string;
  signatureUrl?: string;
  defaultLanguage: string;
}

export interface DashboardKpis {
  totalReceivable: string;
  totalPayable: string;
  salesThisMonth: string;
  purchasesThisMonth: string;
  expensesThisMonth: string;
  lowStockCount: number;
}

export interface ReportInvoiceRow {
  id: string;
  invoice_no: string;
  invoice_date: string;
  due_date?: string;
  status: string;
  party_name: string;
  total_amount: string;
  paid_amount: string;
  balance_amount: string;
  is_overdue?: boolean;
}

export interface StockSummaryRow {
  id: string;
  name: string;
  uom: string;
  current_stock: string;
  opening_stock: string;
  sale_price?: string;
  default_rate?: string;
  low_stock_alert_qty?: string;
  is_low_stock: boolean;
}

export interface ProfitLoss {
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

export interface ExpenseReportRow {
  id: string;
  category: string;
  description?: string;
  amount: string;
  expense_date: string;
  payment_mode: string;
  vehicle_id?: string;
  vehicle_no?: string;
}

export interface TransactionReportRow {
  id: string;
  transaction_date: string;
  payer_name: string;
  payee_name: string;
  bank_name?: string;
  payment_mode: string;
  amount: string;
  remark?: string;
}

export interface LedgerTransaction {
  id: string;
  ref_no: string;
  txn_date: string;
  txn_type: string;
  debit: string;
  credit: string;
  running_balance: string;
  status?: string;
}

export interface PartyLedger {
  party: Party;
  transactions: LedgerTransaction[];
  closingBalance: number;
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: "owner" | "staff" | "viewer";
  tenantId: string;
}

export interface CompanyChoice {
  tenantId: string;
  companyName: string;
  role: AuthUser["role"];
}

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: AuthUser["role"];
  isActive: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export type PartyType = "customer" | "supplier" | "both";

export interface Party {
  id: string;
  name: string;
  partyType: PartyType;
  phone?: string;
  email?: string;
  address?: string;
  shippingAddress?: string;
  gstin?: string;
  pan?: string;
  fssaiNo?: string;
  state?: string;
  openingBalance: string;
  creditLimit?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  invoicePrefix?: string;
  nextInvoiceSeq?: string;
  poPrefix?: string;
  nextPoSeq?: string;
  farmerCode?: string;
  isActive: boolean;
}

export interface Driver {
  id: string;
  name: string;
  licenceNo?: string;
  phone?: string;
  isActive: boolean;
}

export interface Vehicle {
  id: string;
  vehicleNo: string;
  name?: string;
  loadCapacity?: string;
  isActive: boolean;
}

export interface Item {
  id: string;
  name: string;
  uom: string;
  defaultRate?: string;
  hsnCode?: string;
  gstRate: string;
  salePrice?: string;
  openingStock: string;
  currentStock: string;
  lowStockAlertQty?: string;
  isActive: boolean;
}

export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type PaymentMode = "cash" | "bank_transfer" | "upi" | "cheque" | "adjustment" | "online" | "other";

export interface InvoiceLineItemInput {
  itemId?: string;
  itemName: string;
  uom: string;
  qty: number;
  rate: number;
  gstRate?: number;
}

export interface InvoiceItem {
  id: string;
  lineNo: number;
  itemId?: string;
  itemName: string;
  uom: string;
  qty: string;
  rate: string;
  gstRate: string;
  taxableValue: string;
  gstAmount: string;
  lineTotal: string;
}

export interface InvoicePayment {
  id: string;
  amount: string;
  paidDate: string;
  paymentMode: PaymentMode;
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  partyId: string;
  partyName?: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  isGstInvoice: boolean;
  placeOfSupply?: string;
  subTotal: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  status: InvoiceStatus;
  notes?: string;
  driverName?: string;
  driverId?: string;
  vehicleNo?: string;
  poNo?: string;
  poDate?: string;
  asnNo?: string;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
}

export interface CreateInvoiceDto {
  partyId: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  isGstInvoice?: boolean;
  isInterState?: boolean;
  placeOfSupply?: string;
  notes?: string;
  driverName?: string;
  driverId?: string;
  vehicleNo?: string;
  vehicleId?: string;
  poNo?: string;
  poDate?: string;
  asnNo?: string;
  items: InvoiceLineItemInput[];
}

export interface CreatePaymentDto {
  amount: number;
  paidDate: string;
  paymentMode: PaymentMode;
  referenceNo?: string;
  notes?: string;
}

export type PartyPaymentDirection = "paid" | "received";

export interface PartyPayment {
  id: string;
  partyId: string;
  direction: PartyPaymentDirection;
  amount: string;
  paidDate: string;
  paymentMode: PaymentMode;
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

export interface CreatePartyPaymentDto {
  direction: PartyPaymentDirection;
  amount: number;
  paidDate: string;
  paymentMode: PaymentMode;
  referenceNo?: string;
  notes?: string;
}

export interface PurchasePaymentInvoicePaymentEntry {
  paidDate: string;
  amount: string;
  paymentMode: PaymentMode;
  referenceNo?: string;
  notes?: string;
}

export interface PurchasePaymentInvoiceRow {
  invoice_id: string;
  invoice_no: string;
  invoice_date: string;
  status: string;
  party_id: string;
  party_name: string;
  total_amount: string;
  paid_amount: string;
  balance_amount: string;
  payments: PurchasePaymentInvoicePaymentEntry[];
}

export interface PurchasePaymentsReportResult {
  invoices: PurchasePaymentInvoiceRow[];
}

export interface PaySupplierDto {
  partyId: string;
  amount: number;
  paidDate: string;
  paymentMode: PaymentMode;
  referenceNo?: string;
  notes?: string;
}

export type PayCustomerDto = PaySupplierDto;

export interface PaySupplierResult {
  partyId: string;
  partyName: string;
  totalAmount: string;
  applied: { invoiceId: string; invoiceNo: string; amount: string; newStatus: InvoiceStatus }[];
  advanceAmount: string | null;
}

export interface Expense {
  id: string;
  category: string;
  description?: string;
  amount: string;
  expenseDate: string;
  paymentMode: PaymentMode;
  vehicleId?: string;
  createdAt: string;
}

// Standalone, freeform "log a payment to/from anyone" record — not tied to
// any Party/invoice; payer/payee are plain text.
export interface Transaction {
  id: string;
  transactionDate: string;
  payerName: string;
  payeeName: string;
  bankName?: string;
  paymentMode: PaymentMode;
  amount: string;
  remark?: string;
  createdAt: string;
}

export interface CreateTransactionDto {
  transactionDate: string;
  payerName: string;
  payeeName: string;
  bankName?: string;
  paymentMode: PaymentMode;
  amount: number;
  remark?: string;
}

export const api = {
  listCompanies: (phone: string) => request<CompanyChoice[]>("/auth/companies", {
    method: "POST",
    body: JSON.stringify({ phone }),
  }),

  passwordLogin: (phone: string, tenantId: string, password: string) =>
    request<{ user: AuthUser }>("/auth/password/login", {
      method: "POST",
      body: JSON.stringify({ phone, tenantId, password }),
    }),

  requestOtp: (phone: string, tenantId?: string) => request<{ message: string }>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ phone, tenantId }),
  }),

  verifyOtp: (phone: string, otp: string, tenantId?: string) => request<{ user: AuthUser }>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, otp, tenantId }),
  }),

  // Re-authenticates into another company the same phone already has an active
  // account in — no password/OTP re-entry needed while the current session is valid.
  switchCompany: (tenantId: string) =>
    request<{ user: AuthUser }>("/auth/switch-company", { method: "POST", body: JSON.stringify({ tenantId }) })
      .finally(clearCache),

  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }).finally(clearCache),
  getMe: () => cachedRequest<AuthUser>("/auth/me", SESSION_TTL),
  updateMe: (dto: { name?: string; email?: string }) =>
    request<AuthUser>("/auth/me", { method: "PATCH", body: JSON.stringify(dto) }).finally(() => invalidate("/auth/me")),
  setPassword: (password: string) =>
    request<{ message: string }>("/auth/password", { method: "PATCH", body: JSON.stringify({ password }) }),

  registerTenant: (dto: {
    companyName: string;
    legalName: string;
    address?: string;
    contactEmail?: string;
    pan?: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail?: string;
    password: string;
  }) => request<{ tenant: TenantSummary; owner: Partial<AuthUser> }>("/tenants/register", {
    method: "POST",
    body: JSON.stringify(dto),
  }),

  getMyTenant: () => cachedRequest<TenantSummary>("/tenants/me", SESSION_TTL),
  updateMyTenant: (dto: Partial<TenantSummary>) =>
    request<TenantSummary>("/tenants/me", { method: "PATCH", body: JSON.stringify(dto) }).finally(() => invalidate("/tenants/me")),

  getAuditLogs: () => request<AuditLogEntry[]>("/audit-logs"),

  // Parties (customers/suppliers)
  listParties: (partyType?: PartyType) => cachedRequest<Party[]>(`/parties${partyType ? `?partyType=${partyType}` : ""}`),
  getParty: (id: string) => request<Party>(`/parties/${id}`),
  getPartyNextNumbers: (id: string, invoiceType: "sales" | "purchase") =>
    request<{ invoiceNo: string; poNo: string }>(`/parties/${id}/next-numbers?invoiceType=${invoiceType}`),
  createParty: (dto: Partial<Party>) => request<Party>("/parties", { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/parties")),
  updateParty: (id: string, dto: Partial<Party>) => request<Party>(`/parties/${id}`, { method: "PATCH", body: JSON.stringify(dto) }).finally(() => invalidate("/parties")),
  updateFarmerCode: (id: string, farmerCode: string) =>
    request<Party>(`/parties/${id}/farmer-code`, { method: "PATCH", body: JSON.stringify({ farmerCode }) }).finally(() => invalidate("/parties")),
  listPartyPayments: (id: string) => cachedRequest<PartyPayment[]>(`/parties/${id}/payments`),
  recordPartyPayment: (id: string, dto: CreatePartyPaymentDto) =>
    request<PartyPayment>(`/parties/${id}/payments`, { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/parties", "/reports/party")),

  // Items
  listItems: () => cachedRequest<Item[]>("/items"),
  getItem: (id: string) => request<Item>(`/items/${id}`),
  createItem: (dto: {
    name: string;
    uom: string;
    defaultRate?: number;
    hsnCode?: string;
    gstRate?: number;
    salePrice?: number;
    openingStock?: number;
    lowStockAlertQty?: number;
  }) => request<Item>("/items", { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/items")),
  updateItem: (id: string, dto: Partial<{
    name: string; uom: string; defaultRate: number; hsnCode: string; gstRate: number;
    salePrice: number; lowStockAlertQty: number; isActive: boolean;
  }>) => request<Item>(`/items/${id}`, { method: "PATCH", body: JSON.stringify(dto) }).finally(() => invalidate("/items")),

  // Sales Invoices (to a customer)
  listSalesInvoices: (filters?: { partyId?: string; status?: InvoiceStatus }) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    return cachedRequest<Invoice[]>(`/sales-invoices${params ? `?${params}` : ""}`, LIST_TTL);
  },
  getSalesInvoice: (id: string) => request<Invoice>(`/sales-invoices/${id}`),
  createSalesInvoice: (dto: CreateInvoiceDto) =>
    request<Invoice>("/sales-invoices", { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/sales-invoices", "/reports/dashboard")),
  updateSalesInvoice: (id: string, dto: CreateInvoiceDto) =>
    request<Invoice>(`/sales-invoices/${id}`, { method: "PATCH", body: JSON.stringify(dto) }).finally(() => invalidate("/sales-invoices", "/reports/dashboard")),
  deleteSalesInvoice: (id: string) =>
    request<{ id: string }>(`/sales-invoices/${id}`, { method: "DELETE" }).finally(() => invalidate("/sales-invoices", "/reports/dashboard", "/items")),
  sendSalesInvoice: (id: string) =>
    request<Invoice>(`/sales-invoices/${id}/send`, { method: "POST" }).finally(() => invalidate("/sales-invoices")),
  addSalesInvoicePayment: (id: string, dto: CreatePaymentDto) =>
    request<Invoice>(`/sales-invoices/${id}/payments`, { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/sales-invoices", "/reports/dashboard")),
  payCustomer: (dto: PayCustomerDto) =>
    request<PaySupplierResult>("/sales-invoices/pay-customer", { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/sales-invoices", "/reports/dashboard", "/parties")),

  // Purchase Invoices (from a supplier)
  listPurchaseInvoices: (filters?: { partyId?: string; status?: InvoiceStatus }) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    return cachedRequest<Invoice[]>(`/purchase-invoices${params ? `?${params}` : ""}`, LIST_TTL);
  },
  getPurchaseInvoice: (id: string) => request<Invoice>(`/purchase-invoices/${id}`),
  createPurchaseInvoice: (dto: CreateInvoiceDto) =>
    request<Invoice>("/purchase-invoices", { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/purchase-invoices", "/reports/dashboard")),
  updatePurchaseInvoice: (id: string, dto: CreateInvoiceDto) =>
    request<Invoice>(`/purchase-invoices/${id}`, { method: "PATCH", body: JSON.stringify(dto) }).finally(() => invalidate("/purchase-invoices", "/reports/dashboard")),
  deletePurchaseInvoice: (id: string) =>
    request<{ id: string }>(`/purchase-invoices/${id}`, { method: "DELETE" }).finally(() => invalidate("/purchase-invoices", "/reports/dashboard", "/items")),
  sendPurchaseInvoice: (id: string) =>
    request<Invoice>(`/purchase-invoices/${id}/send`, { method: "POST" }).finally(() => invalidate("/purchase-invoices")),
  addPurchaseInvoicePayment: (id: string, dto: CreatePaymentDto) =>
    request<Invoice>(`/purchase-invoices/${id}/payments`, { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/purchase-invoices", "/reports/dashboard")),
  paySupplier: (dto: PaySupplierDto) =>
    request<PaySupplierResult>("/purchase-invoices/pay-supplier", { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/purchase-invoices", "/reports/dashboard", "/reports/purchase-payments", "/parties")),

  // Expenses
  listExpenses: (vehicleId?: string) => cachedRequest<Expense[]>(`/expenses${vehicleId ? `?vehicleId=${vehicleId}` : ""}`, LIST_TTL),
  createExpense: (dto: { category: string; description?: string; amount: number; expenseDate: string; paymentMode: PaymentMode; vehicleId?: string }) =>
    request<Expense>("/expenses", { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/expenses", "/reports/dashboard")),
  updateExpense: (id: string, dto: { category: string; description?: string; amount: number; expenseDate: string; paymentMode: PaymentMode; vehicleId?: string }) =>
    request<Expense>(`/expenses/${id}`, { method: "PATCH", body: JSON.stringify(dto) }).finally(() => invalidate("/expenses", "/reports/dashboard")),

  // Transactions (standalone, freeform payer/payee ledger)
  listTransactions: () => cachedRequest<Transaction[]>("/transactions", LIST_TTL),
  createTransaction: (dto: CreateTransactionDto) =>
    request<Transaction>("/transactions", { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/transactions")),
  updateTransaction: (id: string, dto: CreateTransactionDto) =>
    request<Transaction>(`/transactions/${id}`, { method: "PATCH", body: JSON.stringify(dto) }).finally(() => invalidate("/transactions")),

  // Drivers
  listDrivers: () => cachedRequest<Driver[]>("/drivers"),
  createDriver: (dto: { name: string; licenceNo?: string; phone?: string }) =>
    request<Driver>("/drivers", { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/drivers")),
  updateDriver: (id: string, dto: Partial<Driver>) =>
    request<Driver>(`/drivers/${id}`, { method: "PATCH", body: JSON.stringify(dto) }).finally(() => invalidate("/drivers")),

  listVehicles: () => cachedRequest<Vehicle[]>("/vehicles"),
  createVehicle: (dto: { vehicleNo: string; name?: string; loadCapacity?: string }) =>
    request<Vehicle>("/vehicles", { method: "POST", body: JSON.stringify(dto) }).finally(() => invalidate("/vehicles")),
  updateVehicle: (id: string, dto: Partial<Vehicle>) =>
    request<Vehicle>(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(dto) }).finally(() => invalidate("/vehicles")),

  // Warm the cache with reference + session data so it's ready across the app on load.
  prefetch: () => {
    const noop = () => undefined;
    cachedRequest<AuthUser>("/auth/me", SESSION_TTL).catch(noop);
    cachedRequest<TenantSummary>("/tenants/me", SESSION_TTL).catch(noop);
    cachedRequest<Party[]>("/parties").catch(noop);
    cachedRequest<Party[]>("/parties?partyType=customer").catch(noop);
    cachedRequest<Party[]>("/parties?partyType=supplier").catch(noop);
    cachedRequest<Item[]>("/items").catch(noop);
    cachedRequest<Driver[]>("/drivers").catch(noop);
    cachedRequest<Vehicle[]>("/vehicles").catch(noop);
    cachedRequest<Invoice[]>("/sales-invoices", LIST_TTL).catch(noop);
    cachedRequest<Invoice[]>("/purchase-invoices", LIST_TTL).catch(noop);
  },

  // Reports
  getDashboardKpis: () => cachedRequest<DashboardKpis>("/reports/dashboard", LIST_TTL),
  getSalesReport: (params?: { from?: string; to?: string; partyId?: string }) =>
    request<ReportInvoiceRow[]>(`/reports/sales${params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined)) as Record<string,string>).toString() : ""}`),
  getPurchasesReport: (params?: { from?: string; to?: string; partyId?: string }) =>
    request<ReportInvoiceRow[]>(`/reports/purchases${params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined)) as Record<string,string>).toString() : ""}`),
  getPurchasePaymentsReport: (params?: { from?: string; to?: string; partyId?: string }) =>
    request<PurchasePaymentsReportResult>(`/reports/purchase-payments${params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined)) as Record<string,string>).toString() : ""}`),
  getStockSummary: () => request<StockSummaryRow[]>("/reports/stock-summary"),
  getOutstandingReport: (type: "receivable" | "payable") =>
    request<ReportInvoiceRow[]>(`/reports/outstanding?type=${type}`),
  getProfitLoss: (params?: { from?: string; to?: string }) =>
    request<ProfitLoss>(`/reports/profit-loss${params ? "?" + new URLSearchParams(params as Record<string,string>).toString() : ""}`),
  getExpensesReport: (params?: { from?: string; to?: string; vehicleId?: string }) =>
    request<{ rows: ExpenseReportRow[]; categoryTotals: { category: string; total: string }[]; vehicleTotals: { vehicle_id: string; vehicle_no: string; total: string }[] }>(
      `/reports/expenses${params ? "?" + new URLSearchParams(params as Record<string,string>).toString() : ""}`,
    ),
  getTransactionsReport: (params?: { from?: string; to?: string; payerName?: string; payeeName?: string; bankName?: string; paymentMode?: string }) =>
    request<{ rows: TransactionReportRow[] }>(
      `/reports/transactions${params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString() : ""}`,
    ),
  getPartyLedger: (partyId: string) => request<PartyLedger>(`/reports/party/${partyId}/ledger`),

  // Team members
  listUsers: () => request<TeamMember[]>("/users"),
  inviteUser: (dto: { name: string; phone: string; email?: string; role: AuthUser["role"] }) =>
    request<TeamMember>("/users", { method: "POST", body: JSON.stringify(dto) }),
  updateUser: (id: string, dto: { role?: AuthUser["role"]; isActive?: boolean }) =>
    request<TeamMember>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(dto) }),
};
