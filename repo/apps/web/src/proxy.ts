import { NextRequest, NextResponse } from "next/server";

// UX-level route guard only — actual authorization is enforced by NestJS
// JwtAuthGuard/RolesGuard on every API call. Cookie sharing between the web
// app and API here relies on both running on `localhost` in dev (browsers
// key cookies by domain, not port). In production, put both behind the same
// domain (e.g. via reverse proxy) or switch to a Next.js API route that
// proxies to the backend and sets its own cookie.
const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/parties", "/customers", "/suppliers", "/drivers", "/vehicles", "/items", "/sales-invoices", "/purchase-invoices", "/expenses", "/reports", "/profile"];
const SUPERADMIN_PROTECTED_PREFIXES = ["/superadmin/dashboard"];
// TEMP: route guard disabled for UI review without a running backend.
// Delete this line (and the check below) once the backend is up again.
const GUARD_DISABLED = true;

export function proxy(req: NextRequest) {
  if (GUARD_DISABLED) return NextResponse.next();

  if (SUPERADMIN_PROTECTED_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p))) {
    if (!req.cookies.has("superadmin_access_token")) {
      return NextResponse.redirect(new URL("/superadmin/login", req.url));
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const hasSession = req.cookies.has("access_token");
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/parties/:path*",
    "/customers/:path*",
    "/suppliers/:path*",
    "/drivers/:path*",
    "/vehicles/:path*",
    "/items/:path*",
    "/sales-invoices/:path*",
    "/purchase-invoices/:path*",
    "/expenses/:path*",
    "/reports/:path*",
    "/profile/:path*",
    "/superadmin/dashboard/:path*",
  ],
};
