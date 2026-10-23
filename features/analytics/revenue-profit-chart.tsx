"use client";

import { useState, type KeyboardEvent } from "react";
import { linear } from "./scale";
import { useSize } from "./use-size";
import { change, inrCompact, pct } from "@/lib/analytics/format";
import type { MonthKey, MonthMetrics } from "@/lib/analytics/types";

/**
 * Exhibit A — revenue bars with the profit that stayed inside them.
 * Click selects a month; shift/⌘-click (or the compare toggle) picks a second month to compare.
 */
export function RevenueProfitChart({
  months,
  selected,
  compare,
  suspicious,
  onSelect,
  height = 330,
}: {
  months: MonthMetrics[];
  selected?: MonthKey | null;
  compare?: [MonthKey, MonthKey] | null;
  suspicious?: (m: MonthMetrics) => boolean;
  onSelect?: (m: MonthKey, extend: boolean) => void;
  height?: number;
}) {
  const [ref, { width, measured }] = useSize<HTMLDivElement>({ width: 820, height });
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 8, r: 8, t: 54, b: 46 };
  const n = months.length;
  const band = (width - pad.l - pad.r) / Math.max(1, n);
  const max = Math.max(1, ...months.map((m) => m.net)) * 1.08;
  const y = linear([0, max], [height - pad.b, pad.t]);
  const cx = (i: number) => pad.l + band * i + band / 2;
  const bw = Math.min(64, band * 0.58);
  const pw = bw * 0.52;
  const idx = (k: MonthKey | null | undefined) => (k ? months.findIndex((m) => m.month === k) : -1);
  const sel = idx(selected);
  const cmp = compare ? [idx(compare[0]), idx(compare[1])] : null;
  const first = months[0];
  const last = months[n - 1];
  const diverging = n > 1 && last.net > first.net && last.profit < first.profit;

  const onKey = (e: KeyboardEvent) => {
    if (!onSelect || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    const cur = sel < 0 ? n - 1 : sel;
    const next = Math.max(0, Math.min(n - 1, cur + (e.key === "ArrowRight" ? 1 : -1)));
    onSelect(months[next].month, e.shiftKey);
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="meta flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-3 border border-ink bg-cream-deep" /> Revenue
          </span>
          <span className="meta flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2 bg-signal" /> Profit kept
          </span>
          <span className="meta text-ink-soft">% under month = margin</span>
          {suspicious && (
            <span className="meta flex items-center gap-1.5 text-signal">
              <span className="hatch-red inline-block h-2.5 w-3 border border-signal" /> 25%+ codes on ¼ of orders
            </span>
          )}
        </div>
        {diverging && <span className="hand text-[22px] text-signal">revenue {change(first.net, last.net, 0)}, profit {change(first.profit, last.profit, 0)}</span>}
      </div>
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={onKey}
      className="relative outline-none focus-visible:ring-2 focus-visible:ring-electric"
      style={{ height }}
      role="group"
      aria-label="Revenue and contribution profit by month. Arrow keys move the selection; hold shift to compare."
    >
      {measured && (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <pattern id="ex-a-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#E74732" strokeWidth="1" opacity="0.35" />
          </pattern>
        </defs>

        {/* grid */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={width - pad.r} y1={y(max * f * 0.92)} y2={y(max * f * 0.92)} stroke="#161616" strokeOpacity={0.08} />
            <text x={width - pad.r} y={y(max * f * 0.92) - 3} textAnchor="end" className="fill-ink/50 font-mono text-[9px]">
              {inrCompact(max * f * 0.92, 0)}
            </text>
          </g>
        ))}

        {months.map((m, i) => {
          const sus = suspicious?.(m);
          const isSel = i === sel;
          const inCmp = cmp?.includes(i);
          const hovered = i === hover;
          return (
            <g
              key={m.month}
              className={onSelect ? "cursor-pointer" : ""}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onClick={(e) => onSelect?.(m.month, e.shiftKey || e.metaKey || e.ctrlKey)}
            >
              <rect x={cx(i) - band / 2} y={pad.t - 30} width={Math.max(0, band)} height={Math.max(0, height - pad.t + 26)} fill={sus ? "url(#ex-a-hatch)" : "transparent"} />
              {(isSel || inCmp || hovered) && (
                <rect
                  x={cx(i) - band / 2 + 2}
                  y={pad.t - 30}
                  width={Math.max(0, band - 4)}
                  height={height - pad.t + 26}
                  fill="none"
                  stroke={isSel || inCmp ? "#244BFF" : "#161616"}
                  strokeWidth={isSel || inCmp ? 1.6 : 0.8}
                  strokeDasharray={isSel || inCmp ? undefined : "3 3"}
                />
              )}
              {/* revenue */}
              <rect x={cx(i) - bw / 2} y={y(m.net)} width={bw} height={y(0) - y(m.net)} fill="#E9E0CF" stroke="#161616" strokeWidth={1.2} />
              {/* profit kept */}
              <rect x={cx(i) - pw / 2} y={y(Math.max(0, m.profit))} width={pw} height={y(0) - y(Math.max(0, m.profit))} fill="#E74732" />
              <text x={cx(i)} y={y(m.net) - 6} textAnchor="middle" className="fill-ink font-mono text-[10px] font-bold tnum">
                {inrCompact(m.net)}
              </text>
              <text x={cx(i)} y={y(Math.max(0, m.profit)) - 5} textAnchor="middle" className="fill-signal font-mono text-[9.5px] font-bold tnum" opacity={band > 60 ? 1 : 0}>
                {inrCompact(m.profit)}
              </text>
              <text x={cx(i)} y={height - pad.b + 16} textAnchor="middle" className={`font-mono text-[10.5px] uppercase tracking-[0.1em] ${isSel || inCmp ? "fill-electric font-bold" : "fill-ink"}`}>
                {m.label}
              </text>
              <text x={cx(i)} y={height - pad.b + 30} textAnchor="middle" className={`font-mono text-[9.5px] tnum ${m.margin < first.margin - 0.08 ? "fill-signal" : "fill-ink/60"}`}>
                {pct(m.margin, 0)}
              </text>
            </g>
          );
        })}


        {/* profit line */}
        <polyline
          points={months.map((m, i) => `${cx(i)},${y(Math.max(0, m.profit))}`).join(" ")}
          fill="none"
          stroke="#E74732"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          className="pointer-events-none"
        />

        {/* comparison bracket */}
        {cmp && cmp[0] >= 0 && cmp[1] >= 0 && (
          <g className="pointer-events-none">
            <path d={`M${cx(cmp[0])},${pad.t - 22} V${pad.t - 34} H${cx(cmp[1])} V${pad.t - 22}`} fill="none" stroke="#244BFF" strokeWidth={1.6} />
            <rect x={(cx(cmp[0]) + cx(cmp[1])) / 2 - 78} y={pad.t - 47} width={156} height={17} fill="#244BFF" />
            <text x={(cx(cmp[0]) + cx(cmp[1])) / 2} y={pad.t - 35} textAnchor="middle" className="fill-cream font-mono text-[10px] font-bold">
              REV {change(months[cmp[0]].net, months[cmp[1]].net, 0)} · PROFIT {change(months[cmp[0]].profit, months[cmp[1]].profit, 0)}
            </text>
          </g>
        )}
      </svg>
      )}

    </div>
    </div>
  );
}
