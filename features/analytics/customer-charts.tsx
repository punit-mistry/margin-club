import { SEGMENT_LABEL, type AcquisitionSegment, type CohortRow, type RepeatStat } from "@/lib/analytics/customers";
import { monthShort, num, pct } from "@/lib/analytics/format";
import type { MonthKey } from "@/lib/analytics/types";

export const SEGMENT_FILL: Record<AcquisitionSegment, string> = {
  full: "#161616",
  welcome: "#3B3936",
  mid: "#C4BEB2",
  deep: "#E74732",
};

/** New customers per month, stacked by the discount on their first order. */
export function AcquisitionColumns({
  rows,
  selected,
  onSelect,
}: {
  rows: { month: MonthKey; counts: Record<AcquisitionSegment, number> }[];
  selected?: MonthKey | null;
  onSelect?: (m: MonthKey) => void;
}) {
  const segs: AcquisitionSegment[] = ["full", "welcome", "mid", "deep"];
  const max = Math.max(1, ...rows.map((r) => segs.reduce((s, k) => s + r.counts[k], 0)));
  return (
    <div>
      <div className="flex h-[240px] items-end gap-[3%] border-b border-ink">
        {rows.map((r) => {
          const total = segs.reduce((s, k) => s + r.counts[k], 0);
          const isSel = selected === r.month;
          return (
            <button
              key={r.month}
              type="button"
              onClick={() => onSelect?.(r.month)}
              className={`group relative flex h-full flex-1 flex-col justify-end ${isSel ? "outline-2 outline-offset-2 outline-electric" : ""}`}
              aria-label={`${monthShort(r.month)}: ${total} new customers, ${r.counts.deep} on 25%+ codes`}
            >
              <span className="meta mb-1 text-center tnum">{num(total)}</span>
              <span className="flex w-full flex-col-reverse" style={{ height: `${(total / max) * 82}%` }}>
                {segs.map((k) => (
                  <span key={k} style={{ height: `${total ? (r.counts[k] / total) * 100 : 0}%`, background: SEGMENT_FILL[k] }} className="block w-full border-t border-cream/60 transition-opacity group-hover:opacity-90" />
                ))}
              </span>
              <span className="meta absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9.5px] font-bold text-signal tnum">{pct(total ? r.counts.deep / total : 0, 0)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex gap-[3%]">
        {rows.map((r) => (
          <span key={r.month} className={`meta flex-1 text-center ${selected === r.month ? "text-electric" : ""}`}>
            {monthShort(r.month)}
          </span>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {segs.map((k) => (
          <li key={k} className="meta flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5" style={{ background: SEGMENT_FILL[k] }} />
            {SEGMENT_LABEL[k]}
          </li>
        ))}
        <li className="meta text-signal">red % = share acquired at 25%+ off</li>
      </ul>
    </div>
  );
}

/** 60-day repeat rate by first-order discount — the hangover. */
export function RepeatBars({ stats }: { stats: Record<AcquisitionSegment, RepeatStat> }) {
  const segs: AcquisitionSegment[] = ["full", "welcome", "mid", "deep"];
  const max = Math.max(0.2, ...segs.map((s) => stats[s].rate));
  return (
    <ul className="space-y-3">
      {segs.map((s) => {
        const st = stats[s];
        const enough = st.eligible >= 30;
        return (
          <li key={s}>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px]">{SEGMENT_LABEL[s]}</span>
              <span className="meta text-ink-soft tnum">
                {st.repeated}/{st.eligible} customers
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="relative h-7 flex-1 border border-ink bg-cream">
                <span className="absolute inset-y-0 left-0" style={{ width: `${enough ? (st.rate / max) * 100 : 0}%`, background: s === "deep" ? "#E74732" : s === "mid" ? "#C4BEB2" : "#161616" }} />
              </span>
              <span className={`display w-20 text-right text-[32px] tnum ${s === "deep" ? "text-signal" : ""}`}>{enough ? pct(st.rate) : "—"}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Cohort grid: share of each month's new customers who ordered again in month +k. */
export function CohortGrid({ rows, selected, onSelect }: { rows: CohortRow[]; selected?: MonthKey | null; onSelect?: (m: MonthKey) => void }) {
  const max = Math.max(0.05, ...rows.flatMap((r) => r.activity.filter((a): a is number => a !== null)));
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[460px] border-collapse font-mono text-[11px] tnum">
        <thead>
          <tr>
            <th className="meta py-1.5 text-left font-normal">Cohort</th>
            <th className="meta py-1.5 text-right font-normal">New</th>
            <th className="meta py-1.5 text-right font-normal">25%+ in</th>
            {[1, 2, 3, 4].map((k) => (
              <th key={k} className="meta py-1.5 font-normal">+{k} mo</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isSel = selected === r.month;
            return (
              <tr key={r.month} onClick={() => onSelect?.(r.month)} className={`cursor-pointer border-t border-ink/15 ${isSel ? "bg-electric/10" : "hover:bg-ink/5"}`}>
                <td className={`py-1.5 font-bold uppercase ${isSel ? "text-electric" : ""}`}>{monthShort(r.month)}</td>
                <td className="py-1.5 text-right">{num(r.size)}</td>
                <td className={`py-1.5 text-right ${r.deepShare > 0.4 ? "font-bold text-signal" : ""}`}>{pct(r.deepShare, 0)}</td>
                {r.activity.map((a, k) =>
                  a === null ? (
                    <td key={k} className="hatch-red p-0.5 text-center text-[9px] text-ink-soft opacity-50">—</td>
                  ) : (
                    <td key={k} className="p-0.5">
                      <span
                        className="flex h-8 items-center justify-center"
                        style={{ background: `rgba(36,75,255,${0.08 + (a / max) * 0.85})`, color: a / max > 0.5 ? "#F2EBDD" : "#161616" }}
                      >
                        {pct(a, 1)}
                      </span>
                    </td>
                  ),
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Returning-customer orders per month, split by whether they carried a code. */
export function ReturningSplit({ rows }: { rows: { month: MonthKey; orders: number; discounted: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.orders));
  return (
    <div>
      <div className="flex h-[170px] items-end gap-2 border-b border-ink">
        {rows.map((r) => (
          <div key={r.month} className="flex h-full flex-1 flex-col justify-end" title={`${monthShort(r.month)}: ${r.orders} returning orders, ${r.discounted} with a code`}>
            <span className="meta mb-1 text-center text-[9px] text-signal tnum">{pct(r.orders ? r.discounted / r.orders : 0, 0)}</span>
            <span className="flex w-full flex-col" style={{ height: `${(r.orders / max) * 85}%` }}>
              <span className="block w-full bg-ink" style={{ height: `${r.orders ? ((r.orders - r.discounted) / r.orders) * 100 : 0}%` }} />
              <span className="block w-full bg-signal" style={{ height: `${r.orders ? (r.discounted / r.orders) * 100 : 0}%` }} />
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {rows.map((r) => (
          <span key={r.month} className="meta flex-1 text-center">{monthShort(r.month)}</span>
        ))}
      </div>
      <ul className="mt-2 flex gap-4">
        <li className="meta flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 bg-ink" /> Full price</li>
        <li className="meta flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 bg-signal" /> With a code</li>
      </ul>
    </div>
  );
}
