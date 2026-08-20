/** Helpers shared by the sales + purchase bill templates. */

export function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** ISO date (yyyy-mm-dd) -> dd/mm/yyyy as printed on the bill. */
export function dmy(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function num(v: string | number, dp = 2): string {
  const n = parseFloat(String(v));
  if (!isFinite(n)) return "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function amountInWords(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function cvt(v: number): string {
    if (v < 20) return ones[v];
    if (v < 100) return tens[Math.floor(v / 10)] + (v % 10 ? " " + ones[v % 10] : "");
    if (v < 1000) return ones[Math.floor(v / 100)] + " Hundred" + (v % 100 ? " and " + cvt(v % 100) : "");
    if (v < 100000) return cvt(Math.floor(v / 1000)) + " Thousand" + (v % 1000 ? " " + cvt(v % 1000) : "");
    if (v < 10000000) return cvt(Math.floor(v / 100000)) + " Lakh" + (v % 100000 ? " " + cvt(v % 100000) : "");
    return cvt(Math.floor(v / 10000000)) + " Crore" + (v % 10000000 ? " " + cvt(v % 10000000) : "");
  }

  const rupees = Math.floor(Math.abs(n));
  const paise = Math.round((Math.abs(n) - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";
  const head = rupees > 0 ? cvt(rupees) + " Rupees" : "";
  const tail = paise > 0 ? (head ? " and " : "") + cvt(paise) + " Paise" : "";
  return `${head}${tail} Only`;
}
