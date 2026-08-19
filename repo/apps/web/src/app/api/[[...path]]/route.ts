import { NextRequest, NextResponse } from "next/server";

// Proxies /api/* to the NestJS backend at request time (reads process.env fresh
// on every call). Replaces next.config.ts `rewrites()`, which under
// `output: "standalone"` is resolved once at build time and baked into the
// deployed artifact — an env var changed later in Azure App Settings has no
// effect on it, since the standalone server.js never re-evaluates next.config.
const API_URL = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/api"
).replace(/\/$/, "");

export const dynamic = "force-dynamic";

async function proxy(req: NextRequest, path: string[] | undefined): Promise<NextResponse> {
  const target = `${API_URL}/${(path ?? []).join("/")}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target, init);

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (["content-encoding", "content-length", "transfer-encoding"].includes(key.toLowerCase())) return;
    if (key.toLowerCase() === "set-cookie") return;
    resHeaders.append(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) {
    resHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers: resHeaders });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, (await ctx.params).path);
}
