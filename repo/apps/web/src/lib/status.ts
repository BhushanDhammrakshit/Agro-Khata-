import { BadgeTone } from "@/components/ui/Badge";
import { InvoiceStatus } from "./api";

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  draft: "slate",
  sent: "blue",
  partially_paid: "amber",
  paid: "green",
  overdue: "red",
  cancelled: "slate",
};

export function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
