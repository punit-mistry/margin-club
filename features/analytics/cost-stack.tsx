import { costStack } from "@/lib/analytics/metrics";
import type { Totals } from "@/lib/analytics/types";

/**
 * "Where every ₹100 goes": two 100% columns of list value (period A → period B),
 * with ribbons joining each cost line so the shifts read at a glance.
 */

export const STACK_KEYS = [
  { key: "profit", label: "Profit kept", fill: "#244BFF", text: "#F2EBDD" },
  { key: "fees", label: "Channel fees", fill: "#3B3936", text: "#F2EBDD" },
  { key: "shipping", label: "Shipping", fill: "#C4BEB2", text: "#161616" },
  { key: "packaging", label: "Packaging", fill: "#D7D2C8", text: "#161616" },
  { key: "cogs", label: "Product cost", fill: "#161616", text: "#F2EBDD" },
  { key: "discount", label: "Discounts", fill: "#E74732", text: "#F2EBDD" },
] as const;

type Key = (typeof STACK_KEYS)[number]["key"];

export function CostStack({ a, b, aLabel, bLabel }: { a: Totals; b: Totals; aLabel: string; bLabel: string }) {
  const sa = costStack(a);
  const sb = costStack(b);
  const W = 320;
  const H = 360;
  const colW = 84;
  const top = 24;
  const h = H - top - 8;
  const xa = 0;
  const xb = W - colW;
  const segs = (s: Record<Key, number>) => {
    let acc = 0;
    return STACK_KEYS.map((k) => {
      const v = Math.max(0, s[k.key]);
      const y0 = top + acc * h;
      acc += v;
      return { ...k, v, y0, y1: top + acc * h };
    });
  };
  const A = segs(sa);
  const B = segs(sb);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Share of list value by cost line, ${aLabel} versus ${bLabel}`}>
      <text x={xa} y={14} className="fill-ink font-mono text-[10px] uppercase tracking-[0.08em]">{aLabel}</text>
      <text x={xb + colW} y={14} textAnchor="end" className="fill-ink font-mono text-[10px] uppercase tracking-[0.08em]">{bLabel}</text>
      {A.map((sa_, i) => {
        const sb_ = B[i];
        return (
          <path
            key={`r-${sa_.key}`}
            d={`M${xa + colW},${sa_.y0} C${W / 2},${sa_.y0} ${W / 2},${sb_.y0} ${xb},${sb_.y0} L${xb},${sb_.y1} C${W / 2},${sb_.y1} ${W / 2},${sa_.y1} ${xa + colW},${sa_.y1} Z`}
            fill={sa_.fill}
            opacity={sa_.key === "discount" ? 0.28 : 0.1}
          />
        );
      })}
      {[A, B].map((col, ci) =>
        col.map((s) => (
          <g key={`${ci}-${s.key}`}>
            <rect x={ci ? xb : xa} y={s.y0} width={colW} height={Math.max(0, s.y1 - s.y0)} fill={s.fill} stroke="#161616" strokeWidth={0.6} />
            {s.y1 - s.y0 > 13 && (
              <text x={(ci ? xb : xa) + colW / 2} y={(s.y0 + s.y1) / 2 + 3.5} textAnchor="middle" fill={s.text} className="font-mono text-[10.5px] font-bold tnum">
                ₹{(s.v * 100).toFixed(1)}
              </text>
            )}
          </g>
        )),
      )}
      {B.map((s, i) => {
        const d = (s.v - A[i].v) * 100;
        if (Math.abs(d) < 0.5 || s.y1 - s.y0 < 10) return null;
        const worse = s.key === "profit" ? d < 0 : d > 0;
        return (
          <text key={`d-${s.key}`} x={W / 2} y={(A[i].y0 + A[i].y1 + s.y0 + s.y1) / 4 + 4} textAnchor="middle" className={`font-mono text-[10px] font-bold ${worse ? "fill-signal" : "fill-electric"}`}>
            {d > 0 ? "+" : "−"}₹{Math.abs(d).toFixed(1)}
          </text>
        );
      })}
    </svg>
  );
}

export function StackLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {[...STACK_KEYS].reverse().map((k) => (
        <li key={k.key} className="meta flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 border border-ink" style={{ background: k.fill }} />
          {k.label}
        </li>
      ))}
    </ul>
  );
}
