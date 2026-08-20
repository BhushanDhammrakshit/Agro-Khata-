import { NextRequest } from "next/server";
import type { Driver } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import { buildSalesBillHtml } from "@/lib/bill-templates/sales-bill";
import { buildPurchaseBillHtml } from "@/lib/bill-templates/purchase-bill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeFileName(name: string) {
  return name.replace(/[<>:"/\\|?*\r\n]+/g, "-").replace(/\s+/g, " ").trim();
}

/**
 * Renders the bill with headless Chrome's own print pipeline, so the downloaded PDF is produced by
 * the exact same engine (and the same `@page` rules) as the browser's Print / Save as PDF output.
 *
 * Plain Azure App Service Linux Node runtimes (no custom Dockerfile) are missing the system shared
 * libraries (libnss3, libatk-bridge2.0-0, libgbm1, etc.) the full `puppeteer` package's bundled
 * Chromium needs to launch — `browser.launch()` throws there, this whole route 503s, and the client
 * silently falls back to the much lower-quality/larger `html2canvas` raster PDF (see invoice-pdf.ts).
 * `@sparticuz/chromium` ships a statically-linked Chromium built specifically for restricted
 * serverless/PaaS Linux hosts, so it's used instead whenever running in production on Linux. Locally
 * (Windows/Mac dev) the full `puppeteer` package's own bundled Chromium is used, since
 * @sparticuz/chromium's binary is Linux-only and won't run there.
 */
async function renderPdf(html: string): Promise<Buffer> {
  const useServerlessChromium = process.env.NODE_ENV === "production" && process.platform === "linux";

  let browser;
  if (useServerlessChromium) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = (await import("puppeteer-core")).default;
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath()),
      headless: "shell",
    });
  } else {
    const puppeteer = (await import("puppeteer")).default;
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (kind !== "sales" && kind !== "purchase") {
    return new Response("Not found", { status: 404 });
  }

  let html: string;
  let invoiceNo: string;
  try {
    if (kind === "sales") {
      const [invoice, tenant, drivers] = await Promise.all([
        serverApi.getSalesInvoice(id),
        serverApi.getMyTenant(),
        serverApi.listDrivers().catch((): Driver[] => []),
      ]);
      const party = await serverApi.getParty(invoice.partyId);
      html = buildSalesBillHtml(invoice, tenant, party, drivers.find((d) => d.id === invoice.driverId));
      invoiceNo = invoice.invoiceNo;
    } else {
      const [invoice, tenant] = await Promise.all([
        serverApi.getPurchaseInvoice(id),
        serverApi.getMyTenant(),
      ]);
      const party = await serverApi.getParty(invoice.partyId);
      html = buildPurchaseBillHtml(invoice, tenant, party);
      invoiceNo = invoice.invoiceNo;
    }
  } catch (error) {
    const status = (error as { status?: number }).status ?? 502;
    return new Response("Unable to load invoice", { status: status === 401 || status === 403 ? status : 502 });
  }

  try {
    const pdf = await renderPdf(html);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizeFileName(`${invoiceNo}.pdf`)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // Chromium may be unavailable in this environment; the client falls back to rendering locally.
    return new Response("PDF renderer unavailable", { status: 503 });
  }
}
