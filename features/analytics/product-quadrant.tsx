"use client";

import { useState } from "react";
import { linear } from "./scale";
import { useSize } from "./use-size";
import { pct } from "@/lib/analytics/format";
import type { ProductMetrics } from "@/lib/analytics/types";

/**
 * Revenue share (x) against contribution margin (y). A faint trail shows
 * where each product sat in the opening window — the drift is the story.
 */
export function ProductQuadrant({
  before,
  after,
  blended,
  selected,
  onSelect,
  height = 420,
}: {
  before: ProductMetrics[] | null;
  after: ProductMetrics[];
  blended: number;
  selected?: string | null;
  onSelect?: (id: string) => void;
  height?: number;
}) {
  const [ref, { width, measured }] = useSize<HTMLDivElement>({ width: 760, height });
  const [hover, setHover] = useState<string | null>(null);
  const pad = { l: 40, r: 20, t: 20, b: 36 };
  const all = [...after, ...(before ?? [])];
  const xMax = Math.max(0.12, ...all.map((p) => p.revenueShare)) * 1.12;
  const yMin = Math.min(0, ...all.map((p) => p.margin)) - 0.03;
  const yMax = Math.max(...all.map((p) => p.margin)) + 0.05;
  const x = linear([0, xMax], [pad.l, width - pad.r]);
  const y = linear([yMin, yMax], [height - pad.b, pad.t]);
  const xMid = 1 / Math.max(1, after.length); // equal-share line
  const quad = [
    { label: "Hidden gems", sub: "small, profitable", x: pad.l + 8, y: pad.t + 14, anchor: "start" as const },
    { label: "Workhorses", sub: "big, profitable", x: width - pad.r - 8, y: pad.t + 14, anchor: "end" as const },
    { label: "Dead weight", sub: "small, thin", x: pad.l + 8, y: height - pad.b - 10, anchor: "start" as const },
    { label: "The trap", sub: "big sellers, thin margin", x: width - pad.r - 8, y: height - pad.b - 10, anchor: "end" as const },
  ];
  return (
    <div ref={ref} className="relative" style={{ height }}>
      {measured && (
      <svg width={width} height={height} className="overflow-visible" role="img" aria-label="Products by revenue share and margin">
        <rect x={x(xMid)} y={y(blended)} width={Math.max(0, width - pad.r - x(xMid))} height={Math.max(0, height - pad.b - y(blended))} className="fill-signal/[0.07]" />
        <line x1={x(xMid)} x2={x(xMid)} y1={pad.t} y2={height - pad.b} stroke="#161616" strokeDasharray="3 4" strokeOpacity={0.5} />
        <line x1={pad.l} x2={width - pad.r} y1={y(blended)} y2={y(blended)} stroke="#161616" strokeDasharray="3 4" strokeOpacity={0.5} />
        <text x={pad.l + 4} y={y(blended) - 5} className="fill-ink/60 font-mono text-[9px] uppercase">blended margin {pct(blended, 0)}</text>
        {[0, 0.2, 0.4, 0.6].filter((v) => v >= yMin && v <= yMax).map((v) => (
          <text key={v} x={pad.l - 6} y={y(v) + 3} textAnchor="end" className="fill-ink/60 font-mono text-[9px]">{pct(v, 0)}</text>
        ))}
        {[0, 0.1, 0.2, 0.3].filter((v) => v <= xMax).map((v) => (
          <text key={v} x={x(v)} y={height - pad.b + 14} textAnchor="middle" className="fill-ink/60 font-mono text-[9px]">{pct(v, 0)}</text>
        ))}
        <text x={width - pad.r} y={height - 4} textAnchor="end" className="fill-ink font-mono text-[9px] uppercase tracking-[0.08em]">share of revenue →</text>
        <text x={8} y={pad.t - 6} className="fill-ink font-mono text-[9px] uppercase tracking-[0.08em]">↑ contribution margin</text>
        {quad.map((q) => (
          <g key={q.label}>
            <text x={q.x} y={q.y} textAnchor={q.anchor} className={`display text-[20px] ${q.label === "The trap" ? "fill-signal" : "fill-ink/30"}`}>{q.label}</text>
            <text x={q.x} y={q.y + 12} textAnchor={q.anchor} className={`font-mono text-[8.5px] uppercase ${q.label === "The trap" ? "fill-signal" : "fill-ink/40"}`}>{q.sub}</text>
          </g>
        ))}
        {before &&
          after.map((a) => {
            const b = before.find((p) => p.product.id === a.product.id)!;
            const moved = Math.hypot(x(a.revenueShare) - x(b.revenueShare), y(a.margin) - y(b.margin)) > 8;
            return moved ? (
              <g key={`t-${a.product.id}`} className="pointer-events-none">
                <line x1={x(b.revenueShare)} y1={y(b.margin)} x2={x(a.revenueShare)} y2={y(a.margin)} stroke={a.margin < b.margin - 0.08 ? "#E74732" : "#161616"} strokeOpacity={0.55} strokeWidth={1.2} strokeDasharray="2 3" />
                <circle cx={x(b.revenueShare)} cy={y(b.margin)} r={3} fill="none" stroke="#161616" strokeOpacity={0.5} />
              </g>
            ) : null;
          })}
        {after.map((p) => {
          const isSel = selected === p.product.id;
          const trap = p.revenueShare > xMid && p.margin < blended;
          const r = 5 + Math.sqrt(p.units) * 0.45;
          return (
            <g key={p.product.id} className="cursor-pointer" onClick={() => onSelect?.(p.product.id)} onPointerEnter={() => setHover(p.product.id)} onPointerLeave={() => setHover(null)}>
              <title>{`${p.product.name}: ${pct(p.revenueShare)} of revenue, ${pct(p.margin)} margin`}</title>
              <circle cx={x(p.revenueShare)} cy={y(p.margin)} r={r} fill={isSel ? "#244BFF" : trap ? "#E74732" : "#161616"} fillOpacity={isSel ? 1 : 0.85} stroke="#F2EBDD" strokeWidth={1.5} />
              {isSel && <circle cx={x(p.revenueShare)} cy={y(p.margin)} r={r + 5} fill="none" stroke="#244BFF" strokeWidth={1.5} />}
              {(isSel || trap || hover === p.product.id) && (
                <text
                  x={x(p.revenueShare) > width * 0.68 ? x(p.revenueShare) - r - 5 : x(p.revenueShare) + r + 5}
                  y={y(p.margin) + 3.5}
                  textAnchor={x(p.revenueShare) > width * 0.68 ? "end" : "start"}
                  paintOrder="stroke"
                  stroke="#F2EBDD"
                  strokeWidth={3}
                  className={`font-mono text-[10.5px] font-bold ${isSel ? "fill-electric" : trap ? "fill-signal" : "fill-ink"}`}
                >
                  {p.product.name.split(",")[0]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      )}
    </div>
  );
}
