import { STACK_KEYS } from "./cost-stack";
import { costStack } from "@/lib/analytics/metrics";
import { inrCompact, monthShort, pct } from "@/lib/analytics/format";
import type { ChannelId, ChannelMetrics, MonthMetrics } from "@/lib/analytics/types";

/** One 100% bar per channel: where each ₹100 of list value ends up. */
export function ChannelStacks({ channels, selected, onSelect }: { channels: ChannelMetrics[]; selected?: ChannelId | null; onSelect?: (id: ChannelId) => void }) {
  const order = ["discount", "cogs", "shipping", "packaging", "fees", "profit"] as const;
  return (
    <div className="space-y-4">
      {channels.map((c) => {
        const s = costStack(c);
        const isSel = selected === c.channel.id;
        return (
          <button key={c.channel.id} type="button" onClick={() => onSelect?.(c.channel.id)} className={`block w-full text-left ${isSel ? "outline-2 outline-offset-4 outline-electric" : ""}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="display text-[24px]">
                {c.channel.name} <span className="meta align-middle text-ink-soft">{inrCompact(c.net)} · {c.orders} orders</span>
              </span>
              <span className={`display text-[26px] tnum ${s.profit < 0.18 ? "text-signal" : "text-electric"}`}>₹{(s.profit * 100).toFixed(1)}</span>
            </div>
            <div className="flex h-9 w-full border border-ink">
              {order.map((k) => {
                const def = STACK_KEYS.find((d) => d.key === k)!;
                const v = Math.max(0, s[k]);
                return (
                  <span
                    key={k}
                    className="flex items-center justify-center overflow-hidden border-r border-cream/50 font-mono text-[10px] font-bold last:border-r-0"
                    style={{ width: `${v * 100}%`, background: def.fill, color: def.text }}
                    title={`${def.label}: ₹${(v * 100).toFixed(1)} of every ₹100`}
                  >
                    {v > 0.045 ? `₹${(v * 100).toFixed(0)}` : ""}
                  </span>
                );
              })}
            </div>
          </button>
        );
      })}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
        {order.map((k) => {
          const d = STACK_KEYS.find((x) => x.key === k)!;
          return (
            <li key={k} className="meta flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 border border-ink" style={{ background: d.fill }} />
              {d.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Slope chart: share of revenue (left) vs share of profit (right). */
export function ShareSlope({ channels, selected, onSelect }: { channels: ChannelMetrics[]; selected?: ChannelId | null; onSelect?: (id: ChannelId) => void }) {
  const W = 360;
  const H = 300;
  const max = Math.max(0.1, ...channels.flatMap((c) => [c.revenueShare, c.profitShare])) * 1.08;
  const Y = (v: number) => H - 26 - (Math.max(0, v) / max) * (H - 52);
  const xa = 96;
  const xb = W - 96;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Share of revenue versus share of profit, by channel">
      <text x={xa} y={14} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase">Revenue share</text>
      <text x={xb} y={14} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase">Profit share</text>
      <line x1={xa} x2={xa} y1={22} y2={H - 20} stroke="#161616" strokeOpacity={0.3} />
      <line x1={xb} x2={xb} y1={22} y2={H - 20} stroke="#161616" strokeOpacity={0.3} />
      {channels.map((c) => {
        const worse = c.profitShare < c.revenueShare - 0.02;
        const isSel = selected === c.channel.id;
        const col = isSel ? "#244BFF" : worse ? "#E74732" : "#161616";
        return (
          <g key={c.channel.id} className="cursor-pointer" onClick={() => onSelect?.(c.channel.id)}>
            <line x1={xa} y1={Y(c.revenueShare)} x2={xb} y2={Y(c.profitShare)} stroke={col} strokeWidth={isSel ? 3 : 2} />
            <circle cx={xa} cy={Y(c.revenueShare)} r={4.5} fill={col} />
            <circle cx={xb} cy={Y(c.profitShare)} r={4.5} fill={col} />
            <text x={xa - 9} y={Y(c.revenueShare) + 3.5} textAnchor="end" fill={col} className="font-mono text-[10px] font-bold">
              {c.channel.short} {pct(c.revenueShare, 0)}
            </text>
            <text x={xb + 9} y={Y(c.profitShare) + 3.5} fill={col} className="font-mono text-[10px] font-bold">
              {pct(c.profitShare, 0)} {c.channel.short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Small multiples: monthly margin per channel against the business average. */
export function ChannelMultiples({ series, overall, selected, onSelect }: { series: { channel: ChannelMetrics["channel"]; months: MonthMetrics[] }[]; overall: MonthMetrics[]; selected?: ChannelId | null; onSelect?: (id: ChannelId) => void }) {
  const W = 200;
  const H = 90;
  const lo = -0.05;
  const hi = 0.55;
  const Y = (v: number) => H - 14 - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (H - 24);
  const X = (i: number, n: number) => 6 + (i / Math.max(1, n - 1)) * (W - 12);
  const line = (ms: MonthMetrics[]) =>
    ms
      .map((m, i) => (m.orders ? `${X(i, ms.length)},${Y(m.margin)}` : null))
      .filter(Boolean)
      .join(" ");
  return (
    <div className="grid grid-cols-2 gap-px border border-ink bg-ink">
      {series.map((s) => {
        const live = s.months.filter((m) => m.orders > 0);
        const lastM = live[live.length - 1];
        const isSel = selected === s.channel.id;
        return (
          <button key={s.channel.id} type="button" onClick={() => onSelect?.(s.channel.id)} className={`bg-cream p-2 text-left ${isSel ? "ring-2 ring-electric ring-inset" : "hover:bg-cream-deep"}`}>
            <div className="flex items-baseline justify-between">
              <span className="meta font-bold">{s.channel.name}</span>
              <span className={`font-mono text-[11px] font-bold tnum ${lastM && lastM.margin < 0.2 ? "text-signal" : ""}`}>{lastM ? pct(lastM.margin, 0) : "—"}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" aria-hidden>
              <line x1={0} x2={W} y1={Y(0)} y2={Y(0)} stroke="#E74732" strokeDasharray="2 3" strokeOpacity={0.6} />
              <polyline points={line(overall)} fill="none" stroke="#161616" strokeOpacity={0.25} strokeWidth={1.5} />
              <polyline points={line(s.months)} fill="none" stroke={isSel ? "#244BFF" : "#161616"} strokeWidth={2} />
              {s.months.map((m, i) => (m.orders ? <circle key={m.month} cx={X(i, s.months.length)} cy={Y(m.margin)} r={2} fill={m.margin < 0.15 ? "#E74732" : "#161616"} /> : null))}
              <text x={6} y={H - 2} className="fill-ink/60 font-mono text-[8px] uppercase">{monthShort(s.months[0].month)}</text>
              <text x={W - 6} y={H - 2} textAnchor="end" className="fill-ink/60 font-mono text-[8px] uppercase">{monthShort(s.months[s.months.length - 1].month)}</text>
            </svg>
          </button>
        );
      })}
    </div>
  );
}
