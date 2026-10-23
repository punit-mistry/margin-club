/** Formatting helpers. Pure, locale-fixed so server and client render identically. */

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function groupIndian(n: number): string {
  const s = String(Math.abs(Math.round(n)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/** ₹4,82,310 */
export function inr(n: number): string {
  return `${n < 0 ? "−" : ""}₹${groupIndian(n)}`;
}

/** ₹16.3L / ₹82.4K / ₹940 — compact Indian notation. */
export function inrCompact(n: number, digits = 1): string {
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(digits)}Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(digits)}L`;
  if (a >= 1e3) return `${sign}₹${(a / 1e3).toFixed(digits)}K`;
  return `${sign}₹${Math.round(a)}`;
}

export function num(n: number): string {
  return `${n < 0 ? "−" : ""}${groupIndian(n)}`;
}

/** 0.4312 → "43.1%" */
export function pct(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return "—";
  const v = ratio * 100;
  return `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}%`;
}

/** Relative change a → b as signed percentage: "+48.1%" / "−32.0%". */
export function change(a: number, b: number, digits = 1): string {
  if (a === 0) return b === 0 ? "0%" : "new";
  const r = (b - a) / Math.abs(a);
  return signedPct(r, digits);
}

export function signedPct(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return "—";
  const v = ratio * 100;
  const s = Math.abs(v).toFixed(digits);
  if (Number(s) === 0) return `0%`;
  return `${v > 0 ? "+" : "−"}${s}%`;
}

/** Percentage-point difference: 0.434 → 0.199 gives "−23.5 pts". */
export function pts(a: number, b: number, digits = 1): string {
  const v = (b - a) * 100;
  const s = Math.abs(v).toFixed(digits);
  if (Number(s) === 0) return "0 pts";
  return `${v > 0 ? "+" : "−"}${s} pts`;
}

export function relChange(a: number, b: number): number {
  if (a === 0) return 0;
  return (b - a) / Math.abs(a);
}

export function monthShort(key: string): string {
  return MONTH_SHORT[Number(key.slice(5, 7)) - 1];
}

export function monthLong(key: string): string {
  return `${MONTH_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
}

export function monthYear(key: string): string {
  return `${MONTH_SHORT[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
}

/** "2026-08-14" → "14 Aug 2026" */
export function dateLabel(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTH_SHORT[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

export function dateShort(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTH_SHORT[Number(iso.slice(5, 7)) - 1]}`;
}

export function rangeLabel(from: string, to: string): string {
  if (from === to) return monthYear(from);
  if (from.slice(0, 4) === to.slice(0, 4)) return `${monthShort(from)}–${monthShort(to)} ${to.slice(0, 4)}`;
  return `${monthYear(from)} – ${monthYear(to)}`;
}
