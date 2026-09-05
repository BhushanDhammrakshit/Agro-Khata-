"use client";

import { api, ApiError, Driver } from "@/lib/api";
import { buildSalesBillHtml } from "@/lib/bill-templates/sales-bill";
import { buildPurchaseBillHtml } from "@/lib/bill-templates/purchase-bill";
import { deliverFile, isShareAbort, type FileDelivery, type FileDeliveryStatus } from "@/lib/file-delivery";

type InvoiceKind = "sales" | "purchase";

function sanitizeFileName(name: string) {
  return name.replace(/[<>:"/\\|?*]+/g, "-").replace(/\s+/g, " ").trim();
}

/**
 * Renders `html` off-screen in a real (not 0x0/visibility:hidden) iframe sized to match the
 * content, then resolves once its document (incl. images) is ready. html2canvas needs an
 * actually-painted layout at the intended width, otherwise it captures a collapsed/mis-scaled
 * render that ends up stretched and oversized once embedded in the PDF page.
 */
function renderHtmlInHiddenIframe(html: string, width: number): Promise<{ iframe: HTMLIFrameElement; body: HTMLElement }> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = `position:fixed;top:0;left:-10000px;width:${width}px;height:600px;border:none;`;
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();

    const finish = () => {
      // Grow the iframe to the full document height so nothing is clipped when captured.
      iframe.style.height = `${doc.documentElement.scrollHeight}px`;
      resolve({ iframe, body: doc.body });
    };
    const imgs = Array.from(doc.images);
    if (imgs.length === 0) {
      setTimeout(finish, 50);
    } else {
      let loaded = 0;
      imgs.forEach((img) => {
        img.onload = img.onerror = () => { if (++loaded === imgs.length) setTimeout(finish, 50); };
      });
      setTimeout(finish, 2000);
    }
  });
}

/** Y offsets (in canvas px) of every table row's bottom edge, used to avoid slicing a page mid-row. */
function getRowBoundaries(body: HTMLElement, scale: number): number[] {
  const bodyTop = body.getBoundingClientRect().top;
  return Array.from(body.querySelectorAll("tr"))
    .map((row) => (row.getBoundingClientRect().bottom - bodyTop) * scale)
    .filter((y) => y > 0)
    .sort((a, b) => a - b);
}

/** Rasterizes `html` (the exact same markup used for Print / Save PDF) into a PDF blob so the shared file matches the printed bill. */
async function renderHtmlToPdfBlob(html: string, orientation: "portrait" | "landscape", marginMm = 8): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pageWidthPt = orientation === "landscape" ? 841.89 : 595.28;
  const pageHeightPt = orientation === "landscape" ? 595.28 : 841.89;
  // Mirror the template's own `@page { margin }` so the downloaded PDF has the same page
  // layout as the printed one, not edge-to-edge content. 1mm = 2.8346pt.
  const marginPt = marginMm * 2.8346;
  const contentWidthPt = pageWidthPt - marginPt * 2;
  const contentHeightPt = pageHeightPt - marginPt * 2;
  // Render at the same width the browser would give the content inside that printable area
  // (96 CSS px per 72pt), so the capture isn't rescaled/distorted when embedded in the PDF.
  const contentWidth = Math.round((contentWidthPt * 96) / 72);
  const scale = 3;

  const { iframe, body } = await renderHtmlInHiddenIframe(html, contentWidth);
  try {
    const rowBoundaries = getRowBoundaries(body, scale);
    const canvas = await html2canvas(body, { scale, useCORS: true, backgroundColor: "#ffffff" });

    const pxPerPt = canvas.width / contentWidthPt;
    const contentHeightPx = contentHeightPt * pxPerPt;
    const pdf = new jsPDF({ unit: "pt", format: [pageWidthPt, pageHeightPt], orientation });

    let top = 0;
    let firstPage = true;
    while (top < canvas.height - 1) {
      const maxBottom = top + contentHeightPx;
      let bottom = Math.min(maxBottom, canvas.height);
      if (bottom < canvas.height) {
        // Break the page on the last row edge that fits, so rows aren't cut in half.
        const fits = rowBoundaries.filter((y) => y > top + 1 && y <= maxBottom);
        if (fits.length > 0) bottom = fits[fits.length - 1];
      }

      const sliceHeightPx = bottom - top;
      if (!firstPage) pdf.addPage([pageWidthPt, pageHeightPt], orientation);
      firstPage = false;

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, top, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", marginPt, marginPt, contentWidthPt, sliceHeightPx / pxPerPt);

      top = bottom;
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(iframe);
  }
}

/**
 * Asks the server to render the bill with headless Chrome's print pipeline, giving a PDF identical
 * to Print / Save as PDF. Returns null when that renderer isn't available so the caller can fall
 * back to rendering locally.
 */
async function serverRenderedPdf(kind: InvoiceKind, invoiceId: string): Promise<Blob | null> {
  try {
    const res = await fetch(`/invoice-pdf/${kind}/${encodeURIComponent(invoiceId)}`, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.type === "application/pdf" && blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

type InvoicePdfResult = { blob: Blob; fileName: string; title: string; totalAmount: string };

// Generating the PDF (server round-trip or client-side render) takes long enough that awaiting it
// before calling navigator.share() can burn through the browser's transient user-activation window,
// so share() ends up rejecting and silently falling back to a download. Callers can warm this cache
// (e.g. on hover/focus, before the click) so the click handler only awaits an already-in-flight promise.
const pdfCache = new Map<string, Promise<InvoicePdfResult>>();

function pdfCacheKey(kind: InvoiceKind, invoiceId: string) {
  return `${kind}:${invoiceId}`;
}

/** Kicks off PDF generation ahead of time so a later share/download click resolves near-instantly. */
export function prefetchInvoicePdf(kind: InvoiceKind, invoiceId: string): void {
  const key = pdfCacheKey(kind, invoiceId);
  if (pdfCache.has(key)) return;
  const promise = buildInvoicePdf(kind, invoiceId);
  pdfCache.set(key, promise);
  promise.catch(() => pdfCache.delete(key));
}

function takeCachedInvoicePdf(kind: InvoiceKind, invoiceId: string): Promise<InvoicePdfResult> {
  const key = pdfCacheKey(kind, invoiceId);
  const cached = pdfCache.get(key);
  if (!cached) return buildInvoicePdf(kind, invoiceId);
  pdfCache.delete(key); // one-shot: invoice data may have changed since it was warmed
  return cached;
}

async function buildInvoicePdf(kind: InvoiceKind, invoiceId: string): Promise<InvoicePdfResult> {
  const [serverBlob, invoice] = await Promise.all([
    serverRenderedPdf(kind, invoiceId),
    kind === "sales" ? api.getSalesInvoice(invoiceId) : api.getPurchaseInvoice(invoiceId),
  ]);

  const meta = {
    fileName: sanitizeFileName(`${invoice.invoiceNo}.pdf`),
    title: kind === "sales" ? `Invoice ${invoice.invoiceNo}` : `Bill ${invoice.invoiceNo}`,
    totalAmount: invoice.totalAmount,
  };
  if (serverBlob) return { blob: serverBlob, ...meta };

  const [tenant, party, drivers] = await Promise.all([
    api.getMyTenant(),
    api.getParty(invoice.partyId),
    kind === "sales" ? api.listDrivers().catch((): Driver[] => []) : Promise.resolve<Driver[]>([]),
  ]);

  const html = kind === "sales"
    ? buildSalesBillHtml(invoice, tenant, party, drivers.find((d) => d.id === invoice.driverId))
    : buildPurchaseBillHtml(invoice, tenant, party);
  const blob = await renderHtmlToPdfBlob(html, kind === "sales" ? "landscape" : "portrait");
  return { blob, ...meta };
}

export async function downloadInvoicePdf(kind: InvoiceKind, invoiceId: string): Promise<FileDelivery> {
  try {
    const { blob, fileName } = await takeCachedInvoicePdf(kind, invoiceId);
    return await deliverFile(blob, fileName);
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

/** Renders any standalone bill-template HTML document (e.g. a report statement) to a PDF and downloads it. */
export async function downloadHtmlAsPdf(
  html: string,
  fileName: string,
  orientation: "portrait" | "landscape" = "portrait",
  marginMm = 10,
): Promise<FileDelivery> {
  const blob = await renderHtmlToPdfBlob(html, orientation, marginMm);
  return deliverFile(blob, fileName);
}

export async function shareInvoicePdf(kind: InvoiceKind, invoiceId: string): Promise<FileDeliveryStatus> {
  try {
    const { blob, fileName, title, totalAmount } = await takeCachedInvoicePdf(kind, invoiceId);
    const { status } = await deliverFile(blob, fileName, { title, text: `${title} - ₹${totalAmount}` });
    return status;
  } catch (error) {
    if (isShareAbort(error)) {
      return "cancelled";
    }
    if (error instanceof ApiError) {
      throw new Error(error.message);
    }
    throw error;
  }
}
