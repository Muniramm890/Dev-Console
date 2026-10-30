// @ts-nocheck
// Indian short units for dashboard numbers: 1,25,000 -> 1.25 L, 3,40,00,000 -> 3.4 Cr. Under 1 lakh stays exact.
const trim = (n) => String(Math.round(n * 100) / 100);
export const shortNumber = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n);
  const a = Math.abs(v), sign = v < 0 ? "-" : "";
  if (a >= 1e7) return `${sign}${trim(a / 1e7)} Cr`;
  if (a >= 1e5) return `${sign}${trim(a / 1e5)} L`;
  return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};
// Accepts a number or a display string like "₹12,34,567" / "12,345" / "1,20,000.50". Anything else is returned unchanged.
export const shortenKpi = (value) => {
  if (typeof value === "number") return Math.abs(value) >= 1e5 ? shortNumber(value) : value;
  if (typeof value !== "string") return value;
  const m = value.trim().match(/^(-?)(₹|Rs\.?\s?)?\s?(-?[\d,]+(?:\.\d+)?)$/);
  if (!m) return value;
  const n = Number(m[3].replace(/,/g, ""));
  if (!Number.isFinite(n) || Math.abs(n) < 1e5) return value;
  return `${m[1]}${m[2] ? "₹" : ""}${shortNumber(n)}`;
};
