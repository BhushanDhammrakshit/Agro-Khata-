const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

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
    throw new ApiError(body?.message ?? "Something went wrong.", res.status);
  }
  return body as T;
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
export type PaymentMode = "cash" | "bank_transfer" | "upi" | "cheque" | "other";

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

export interface Expense {
  id: string;
  category: string;
  description?: string;
  amount: string;
  expenseDate: string;
  paymentMode: PaymentMode;
  createdAt: string;
}

export const api = {
  requestOtp: (phone: string) => request<{ message: string }>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ phone }),
  }),

  verifyOtp: (phone: string, otp: string) => request<{ user: AuthUser }>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  }),

  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  getMe: () => request<AuthUser>("/auth/me"),
  updateMe: (dto: { name?: string; email?: string }) =>
    request<AuthUser>("/auth/me", { method: "PATCH", body: JSON.stringify(dto) }),

  registerTenant: (dto: {
    companyName: string;
    legalName: string;
    address?: string;
    contactEmail?: string;
    pan?: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail?: string;
  }) => request<{ tenant: TenantSummary; owner: Partial<AuthUser> }>("/tenants/register", {
    method: "POST",
    body: JSON.stringify(dto),
  }),

  getMyTenant: () => request<TenantSummary>("/tenants/me"),

  getAuditLogs: () => request<AuditLogEntry[]>("/audit-logs"),

  // Parties (customers/suppliers)
  listParties: (partyType?: PartyType) => request<Party[]>(`/parties${partyType ? `?partyType=${partyType}` : ""}`),
  getParty: (id: string) => request<Party>(`/parties/${id}`),
  getPartyNextNumbers: (id: string) => request<{ invoiceNo: string; poNo: string }>(`/parties/${id}/next-numbers`),
  createParty: (dto: Partial<Party>) => request<Party>("/parties", { method: "POST", body: JSON.stringify(dto) }),
  updateParty: (id: string, dto: Partial<Party>) => request<Party>(`/parties/${id}`, { method: "PATCH", body: JSON.stringify(dto) }),
  updateFarmerCode: (id: string, farmerCode: string) =>
    request<Party>(`/parties/${id}/farmer-code`, { method: "PATCH", body: JSON.stringify({ farmerCode }) }),

  // Items
  listItems: () => request<Item[]>("/items"),
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
  }) => request<Item>("/items", { method: "POST", body: JSON.stringify(dto) }),
  updateItem: (id: string, dto: Partial<{
    name: string; uom: string; defaultRate: number; hsnCode: string; gstRate: number;
    salePrice: number; lowStockAlertQty: number; isActive: boolean;
  }>) => request<Item>(`/items/${id}`, { method: "PATCH", body: JSON.stringify(dto) }),

  // Sales Invoices (to a customer)
  listSalesInvoices: (filters?: { partyId?: string; status?: InvoiceStatus }) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    return request<Invoice[]>(`/sales-invoices${params ? `?${params}` : ""}`);
  },
  getSalesInvoice: (id: string) => request<Invoice>(`/sales-invoices/${id}`),
  createSalesInvoice: (dto: CreateInvoiceDto) => request<Invoice>("/sales-invoices", { method: "POST", body: JSON.stringify(dto) }),
  sendSalesInvoice: (id: string) => request<Invoice>(`/sales-invoices/${id}/send`, { method: "POST" }),
  addSalesInvoicePayment: (id: string, dto: CreatePaymentDto) =>
    request<Invoice>(`/sales-invoices/${id}/payments`, { method: "POST", body: JSON.stringify(dto) }),

  // Purchase Invoices (from a supplier)
  listPurchaseInvoices: (filters?: { partyId?: string; status?: InvoiceStatus }) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    return request<Invoice[]>(`/purchase-invoices${params ? `?${params}` : ""}`);
  },
  getPurchaseInvoice: (id: string) => request<Invoice>(`/purchase-invoices/${id}`),
  createPurchaseInvoice: (dto: CreateInvoiceDto) => request<Invoice>("/purchase-invoices", { method: "POST", body: JSON.stringify(dto) }),
  sendPurchaseInvoice: (id: string) => request<Invoice>(`/purchase-invoices/${id}/send`, { method: "POST" }),
  addPurchaseInvoicePayment: (id: string, dto: CreatePaymentDto) =>
    request<Invoice>(`/purchase-invoices/${id}/payments`, { method: "POST", body: JSON.stringify(dto) }),

  // Expenses
  listExpenses: () => request<Expense[]>("/expenses"),
  createExpense: (dto: { category: string; description?: string; amount: number; expenseDate: string; paymentMode: PaymentMode }) =>
    request<Expense>("/expenses", { method: "POST", body: JSON.stringify(dto) }),

  // Drivers
  listDrivers: () => request<Driver[]>("/drivers"),
  createDriver: (dto: { name: string; licenceNo?: string; phone?: string }) =>
    request<Driver>("/drivers", { method: "POST", body: JSON.stringify(dto) }),
  updateDriver: (id: string, dto: Partial<Driver>) =>
    request<Driver>(`/drivers/${id}`, { method: "PATCH", body: JSON.stringify(dto) }),

  listVehicles: () => request<Vehicle[]>("/vehicles"),
  createVehicle: (dto: { vehicleNo: string; name?: string; loadCapacity?: string }) =>
    request<Vehicle>("/vehicles", { method: "POST", body: JSON.stringify(dto) }),
  updateVehicle: (id: string, dto: Partial<Vehicle>) =>
    request<Vehicle>(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(dto) }),

  // Reports
  getDashboardKpis: () => request<DashboardKpis>("/reports/dashboard"),
  getSalesReport: (params?: { from?: string; to?: string; partyId?: string }) =>
    request<ReportInvoiceRow[]>(`/reports/sales${params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined)) as Record<string,string>).toString() : ""}`),
  getPurchasesReport: (params?: { from?: string; to?: string; partyId?: string }) =>
    request<ReportInvoiceRow[]>(`/reports/purchases${params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined)) as Record<string,string>).toString() : ""}`),
  getStockSummary: () => request<StockSummaryRow[]>("/reports/stock-summary"),
  getOutstandingReport: (type: "receivable" | "payable") =>
    request<ReportInvoiceRow[]>(`/reports/outstanding?type=${type}`),
  getProfitLoss: (params?: { from?: string; to?: string }) =>
    request<ProfitLoss>(`/reports/profit-loss${params ? "?" + new URLSearchParams(params as Record<string,string>).toString() : ""}`),
  getExpensesReport: (params?: { from?: string; to?: string }) =>
    request<{ rows: ExpenseReportRow[]; categoryTotals: { category: string; total: string }[] }>(
      `/reports/expenses${params ? "?" + new URLSearchParams(params as Record<string,string>).toString() : ""}`,
    ),
  getPartyLedger: (partyId: string) => request<PartyLedger>(`/reports/party/${partyId}/ledger`),

  updateMyTenant: (dto: Partial<TenantSummary>) =>
    request<TenantSummary>("/tenants/me", { method: "PATCH", body: JSON.stringify(dto) }),
};
