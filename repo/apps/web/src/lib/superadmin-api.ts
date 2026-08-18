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
    credentials: "include", // send/receive the httpOnly superadmin_access_token cookie
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new ApiError(body?.message ?? "Something went wrong.", res.status);
  }
  return body as T;
}

export interface SuperadminTenant {
  id: string;
  name: string;
  legalName: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
}

export const superadminApi = {
  login: (email: string, password: string) => request<{ admin: { id: string; name: string; email: string } }>(
    "/superadmin/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  ),

  logout: () => request<{ message: string }>("/superadmin/auth/logout", { method: "POST" }),

  listTenants: () => request<SuperadminTenant[]>("/superadmin/tenants"),

  createTenant: (dto: {
    companyName: string;
    legalName: string;
    address?: string;
    contactEmail?: string;
    pan?: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail?: string;
  }) => request<{ tenant: SuperadminTenant }>("/superadmin/tenants", {
    method: "POST",
    body: JSON.stringify(dto),
  }),

  updateTenantStatus: (id: string, isActive: boolean) => request<SuperadminTenant>(`/superadmin/tenants/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  }),
};
