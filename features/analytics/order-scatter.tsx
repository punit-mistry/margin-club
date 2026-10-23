"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { linear, hash01 } from "./scale";
import { useSize } from "./use-size";
import { inr, pct } from "@/lib/analytics/format";
import type { Transaction } from "@/lib/analytics/types";

/**
 * Every order as a dot: x = discount %, y = contribution margin %.
 * Canvas for the dots (thousands of them), SVG for axes and annotations.
 */

const Y_MIN = -45;
const Y_MAX = 65;
const X_MAX = 44;
const pad = { l: 44, r: 14, t: 16, b: 34 };

interface Props {
  orders: Transaction[];
  /** Orders with discount ≥ threshold are emphasised. */
  threshold?: number;
  /** Optional predicate to emphasise (overrides threshold). */
  emphasis?: (t: Transaction) => boolean;
  selectedId?: string | null;
  onSelect?: (t: Transaction) => void;
  className?: string;
  dark?: boolean;
}

export function OrderScatter({ orders, threshold = 0, emphasis, selectedId, onSelect, className = "", dark = false }: Props) {
  const [wrapRef, { width, height, measured }] = useSize<HTMLDivElement>({ width: 900, height: 420 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<Transaction | null>(null);

  const geo = useMemo(() => {
    const x = linear([-2, X_MAX], [pad.l, width - pad.r]);
    const y = linear([Y_MIN, Y_MAX], [height - pad.b, pad.t]);
    const pts = orders.map((t) => {
      const j = (hash01(t.id) - 0.5) * 3.4;
      const m = t.net ? (t.profit / t.net) * 100 : 0;
      return { t, px: x(t.discountPct + j), py: y(Math.max(Y_MIN, Math.min(Y_MAX, m))) };
    });
    return { x, y, pts };
  }, [orders, width, height]);

  const isOn = useMemo(() => emphasis ?? ((t: Transaction) => t.discountPct >= threshold), [emphasis, threshold]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !measured) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const base = dark ? "rgba(242,235,221,0.16)" : "rgba(22,22,22,0.14)";
    // Background dots first, emphasised dots on top.
    for (const p of geo.pts) {
      if (isOn(p.t)) continue;
      ctx.fillStyle = base;
      ctx.fillRect(p.px - 1.4, p.py - 1.4, 2.8, 2.8);
    }
    for (const p of geo.pts) {
      if (!isOn(p.t)) continue;
      ctx.fillStyle = p.t.profit < 0 ? "rgba(231,71,50,0.9)" : dark ? "rgba(242,235,221,0.75)" : "rgba(36,75,255,0.55)";
      ctx.beginPath();
      ctx.arc(p.px, p.py, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [geo, width, height, isOn, dark, measured]);

  const nearest = (mx: number, my: number) => {
    let best: (typeof geo.pts)[number] | null = null;
    let bd = 100;
    for (const p of geo.pts) {
      const d = (p.px - mx) ** 2 + (p.py - my) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  };

  const sel = selectedId ? geo.pts.find((p) => p.t.id === selectedId) : null;
  const hv = hover ? geo.pts.find((p) => p.t.id === hover.id) : null;
  const ink = dark ? "#F2EBDD" : "#161616";

  return (
    <div
      ref={wrapRef}
      className={`relative select-none ${onSelect ? "cursor-crosshair" : ""} ${className}`}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const n = nearest(e.clientX - r.left, e.clientY - r.top);
        setHover(n?.t ?? null);
      }}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => {
        if (!onSelect) return;
        const r = e.currentTarget.getBoundingClientRect();
        const n = nearest(e.clientX - r.left, e.clientY - r.top);
        if (n) onSelect(n.t);
      }}
      role="img"
      aria-label={`Scatter of ${orders.length} orders: discount percent against contribution margin.`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {measured && (
      <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden>
        {[-40, -20, 0, 20, 40, 60].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={width - pad.r} y1={geo.y(v)} y2={geo.y(v)} stroke={v === 0 ? "#E74732" : ink} strokeOpacity={v === 0 ? 0.9 : 0.12} strokeDasharray={v === 0 ? "5 4" : undefined} />
            <text x={pad.l - 8} y={geo.y(v) + 3} textAnchor="end" fill={v === 0 ? "#E74732" : ink} className="font-mono text-[9.5px]">
              {v}%
            </text>
          </g>
        ))}
        <text x={pad.l + 6} y={geo.y(0) + 14} fill="#E74732" className="font-mono text-[9.5px] tracking-[0.1em] uppercase">
          Break-even — below this line the order lost money
        </text>
        {[0, 10, 20, 30, 40].map((v) => (
          <text key={v} x={geo.x(v)} y={height - pad.b + 16} textAnchor="middle" fill={ink} className="font-mono text-[9.5px]">
            {v}% off
          </text>
        ))}
        <text x={pad.l} y={pad.t - 4} fill={ink} className="font-mono text-[9px] tracking-[0.1em] uppercase" opacity={0.7}>
          Contribution margin per order
        </text>
        {sel && (
          <g>
            <circle cx={sel.px} cy={sel.py} r={9} fill="none" stroke="#244BFF" strokeWidth={2} />
            <circle cx={sel.px} cy={sel.py} r={3.5} fill="#244BFF" />
          </g>
        )}
        {hv && <circle cx={hv.px} cy={hv.py} r={6} fill="none" stroke={ink} strokeWidth={1.5} />}
      </svg>
      )}
      {hover && hv && (
        <div
          className={`pointer-events-none absolute z-10 border px-2 py-1.5 font-mono text-[10.5px] whitespace-nowrap tnum ${dark ? "border-cream bg-ink text-cream" : "border-ink bg-cream text-ink"}`}
          style={{ left: Math.min(hv.px + 10, width - 190), top: Math.max(0, hv.py - 44) }}
        >
          <div className="font-bold">
            {hover.id} · {hover.coupon ?? "full price"}
          </div>
          <div>
            {inr(hover.net)} revenue · <span className={hover.profit < 0 ? "text-signal" : ""}>{inr(hover.profit)}</span> ({pct(hover.net ? hover.profit / hover.net : 0, 0)})
          </div>
        </div>
      )}
    </div>
  );
}
