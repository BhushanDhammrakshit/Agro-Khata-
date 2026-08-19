"use client";

import { api, ApiError, Invoice, Party, TenantSummary } from "@/lib/api";

type InvoiceKind = "sales" | "purchase";

function inr(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "INR 0.00";
  return `INR ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

async function loadInvoiceBundle(kind: InvoiceKind, invoiceId: string): Promise<{ tenant: TenantSummary; invoice: Invoice; party: Party }> {
  const invoiceLoader = kind === "sales" ? api.getSalesInvoice(invoiceId) : api.getPurchaseInvoice(invoiceId);
  const [tenant, invoice] = await Promise.all([api.getMyTenant(), invoiceLoader]);
  const party = await api.getParty(invoice.partyId);
  return { tenant, invoice, party };
}

async function buildPdfBlob(kind: InvoiceKind, invoice: Invoice, tenant: TenantSummary, party: Party) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const line = 16;
  const colItem = margin;
  const colQty = 300;
  const colRate = 380;
  const colTotal = 475;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(tenant.name || tenant.legalName || "Company", margin, y);
  y += line;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (tenant.address) {
    const addressLines = doc.splitTextToSize(tenant.address, 260);
    doc.text(addressLines, margin, y);
    y += addressLines.length * 12;
  }

  const title = kind === "sales" ? "Sales Invoice" : "Purchase Invoice";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 390, margin);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoice.invoiceNo}`, 390, margin + 18);
  doc.text(`Invoice Date: ${invoice.invoiceDate}`, 390, margin + 32);
  if (invoice.dueDate) {
    doc.text(`Due Date: ${invoice.dueDate}`, 390, margin + 46);
  }

  y = Math.max(y + 12, margin + 70);
  doc.setDrawColor(200, 208, 218);
  doc.line(margin, y, 555, y);
  y += line;

  doc.setFont("helvetica", "bold");
  doc.text("Bill To", margin, y);
  y += line;
  doc.setFont("helvetica", "normal");
  doc.text(party.name, margin, y);
  y += line;
  if (party.address) {
    const partyAddress = doc.splitTextToSize(party.address, 280);
    doc.text(partyAddress, margin, y);
    y += partyAddress.length * 12;
  }
  if (party.gstin) {
    doc.text(`GSTIN: ${party.gstin}`, margin, y);
    y += line;
  }

  y += 8;
  ensureSpace(60);

  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y - 12, 515, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Item", colItem, y);
  doc.text("Qty", colQty, y);
  doc.text("Rate", colRate, y);
  doc.text("Line Total", colTotal, y);
  y += line;

  doc.setFont("helvetica", "normal");
  const items = invoice.items ?? [];
  for (const item of items) {
    const itemText = doc.splitTextToSize(item.itemName, 240);
    const rowHeight = Math.max(itemText.length * 12, line);
    ensureSpace(rowHeight + 8);

    doc.text(itemText, colItem, y);
    doc.text(item.qty, colQty, y);
    doc.text(inr(item.rate), colRate, y);
    doc.text(inr(item.lineTotal), colTotal, y);
    y += rowHeight;
    doc.setDrawColor(236, 240, 244);
    doc.line(margin, y + 2, 555, y + 2);
    y += 10;
  }

  y += 6;
  ensureSpace(120);

  const totalsX = 350;
  doc.setFont("helvetica", "normal");
  doc.text("Sub Total", totalsX, y);
  doc.text(inr(invoice.subTotal), 555, y, { align: "right" });
  y += line;

  if (invoice.isGstInvoice) {
    if (parseFloat(invoice.igstAmount) > 0) {
      doc.text("IGST", totalsX, y);
      doc.text(inr(invoice.igstAmount), 555, y, { align: "right" });
      y += line;
    } else {
      doc.text("CGST", totalsX, y);
      doc.text(inr(invoice.cgstAmount), 555, y, { align: "right" });
      y += line;
      doc.text("SGST", totalsX, y);
      doc.text(inr(invoice.sgstAmount), 555, y, { align: "right" });
      y += line;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.text("Grand Total", totalsX, y);
  doc.text(inr(invoice.totalAmount), 555, y, { align: "right" });
  y += line;
  doc.setFont("helvetica", "normal");
  doc.text("Paid", totalsX, y);
  doc.text(inr(invoice.paidAmount), 555, y, { align: "right" });
  y += line;
  doc.setFont("helvetica", "bold");
  doc.text("Balance", totalsX, y);
  doc.text(inr(invoice.balanceAmount), 555, y, { align: "right" });

  const fileName = sanitizeFileName(`${invoice.invoiceNo}.pdf`);
  return { blob: doc.output("blob"), fileName };
}

export async function shareInvoicePdf(kind: InvoiceKind, invoiceId: string): Promise<"shared" | "downloaded" | "cancelled"> {
  try {
    const { tenant, invoice, party } = await loadInvoiceBundle(kind, invoiceId);
    const { blob, fileName } = await buildPdfBlob(kind, invoice, tenant, party);
    const title = kind === "sales" ? `Invoice ${invoice.invoiceNo}` : `Bill ${invoice.invoiceNo}`;
    const text = `${title} - ${inr(invoice.totalAmount)}`;

    if (typeof navigator !== "undefined" && navigator.share && typeof File !== "undefined") {
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ title, text, files: [file] });
        return "shared";
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
