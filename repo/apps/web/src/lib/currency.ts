/**
 * Indian-numbering-system currency helpers (₹ symbol, lakh/crore grouping).
 * `formatCompactINR` is meant for space-constrained summary/KPI displays where a long
 * digit string (e.g. ₹1,31,21,000.00) would overflow a small card on mobile — it
 * abbreviates to Lakh/Crore instead. Use `formatINR` wherever the exact figure matters
 * (invoice detail pages, bills, per-row report/table data).
 */

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : parseFloat(value);
}

export function formatINR(value: string | number): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "₹0.00";
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const LAKH = 1_00_000;
const CRORE = 1_00_00_000;

/** e.g. 13121000 -> "₹1.31 Cr", 130000 -> "₹1.30 L", 3500 -> "₹3,500.00" (unabbreviated below 1 lakh). */
export function formatCompactINR(value: string | number): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "₹0.00";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= CRORE) return `${sign}₹${(abs / CRORE).toFixed(2)} Cr`;
  if (abs >= LAKH) return `${sign}₹${(abs / LAKH).toFixed(2)} L`;
  return formatINR(n);
}
