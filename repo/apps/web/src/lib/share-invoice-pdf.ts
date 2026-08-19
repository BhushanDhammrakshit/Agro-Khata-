"use client";

import { api, ApiError, Driver } from "@/lib/api";
import { buildSalesBillHtml } from "@/lib/bill-templates/sales-bill";
import { buildPurchaseBillHtml } from "@/lib/bill-templates/purchase-bill";

type InvoiceKind = "sales" | "purchase";

function sanitizeFileName(name: string) {
  return name.replace(/[<>:"/\\|?*]+/g, "-").replace(/\s+/g, " ").trim();
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
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

/** Rasterizes `html` (the exact same markup used for Print / Save PDF) into a PDF blob so the shared file matches the printed bill. */
async function renderHtmlToPdfBlob(html: string, orientation: "portrait" | "landscape"): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pageWidthPt = orientation === "landscape" ? 841.89 : 595.28;
  const pageHeightPt = orientation === "landscape" ? 595.28 : 841.89;
  // Both bill templates print with `@page { margin: 8mm; }` — mirror that margin here so the
  // downloaded PDF has the same page layout as the printed one, not edge-to-edge content.
  const marginPt = 22.68;
  const contentWidthPt = pageWidthPt - marginPt * 2;
  const contentHeightPt = pageHeightPt - marginPt * 2;
  // Render at the same width the browser would give the content inside that printable area
  // (96 CSS px per 72pt), so the capture isn't rescaled/distorted when embedded in the PDF.
  const contentWidth = Math.round((contentWidthPt * 96) / 72);

  const { iframe, body } = await renderHtmlInHiddenIframe(html, contentWidth);
  try {
    const canvas = await html2canvas(body, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });

    const pxPerPt = canvas.width / contentWidthPt;
    const contentHeightPx = contentHeightPt * pxPerPt;
    const totalPages = Math.max(1, Math.ceil(canvas.height / contentHeightPx));

    const pdf = new jsPDF({ unit: "pt", format: [pageWidthPt, pageHeightPt], orientation });

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage([pageWidthPt, pageHeightPt], orientation);
      const sliceHeightPx = Math.min(contentHeightPx, canvas.height - page * contentHeightPx);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, page * contentHeightPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      const imgData = sliceCanvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", marginPt, marginPt, contentWidthPt, sliceHeightPx / pxPerPt);
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(iframe);
  }
}

async function buildInvoicePdf(kind: InvoiceKind, invoiceId: string): Promise<{ blob: Blob; fileName: string; title: string; totalAmount: string }> {
  if (kind === "sales") {
    // Fetch everything that doesn't depend on the invoice in parallel to keep this as fast as
    // possible — Web Share's user-activation window can expire while this is in flight.
    const [invoice, tenant, drivers] = await Promise.all([
      api.getSalesInvoice(invoiceId),
      api.getMyTenant(),
      api.listDrivers().catch((): Driver[] => []),
    ]);
    const party = await api.getParty(invoice.partyId);
    const driver = drivers.find((d) => d.id === invoice.driverId);
    const html = buildSalesBillHtml(invoice, tenant, party, driver);
    const blob = await renderHtmlToPdfBlob(html, "landscape");
    return { blob, fileName: sanitizeFileName(`${invoice.invoiceNo}.pdf`), title: `Invoice ${invoice.invoiceNo}`, totalAmount: invoice.totalAmount };
  }

  const [invoice, tenant] = await Promise.all([api.getPurchaseInvoice(invoiceId), api.getMyTenant()]);
  const party = await api.getParty(invoice.partyId);
  const html = buildPurchaseBillHtml(invoice, tenant, party);
  const blob = await renderHtmlToPdfBlob(html, "portrait");
  return { blob, fileName: sanitizeFileName(`${invoice.invoiceNo}.pdf`), title: `Bill ${invoice.invoiceNo}`, totalAmount: invoice.totalAmount };
}

export async function shareInvoicePdf(kind: InvoiceKind, invoiceId: string): Promise<"shared" | "downloaded" | "cancelled"> {
  try {
    const { blob, fileName, title, totalAmount } = await buildInvoicePdf(kind, invoiceId);
    const text = `${title} - ₹${totalAmount}`;

    if (typeof navigator !== "undefined" && navigator.share && typeof File !== "undefined") {
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title, text, files: [file] });
          return "shared";
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") {
            return "cancelled";
          }
          // The share sheet can fail intermittently (e.g. user-activation expired while the
          // PDF was being generated) — fall back to a direct download so the user still gets the file.
        }
      }
    }

    downloadBlob(blob, fileName);
    return "downloaded";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    if (error instanceof ApiError) {
      throw new Error(error.message);
    }
    throw error;
  }
}
