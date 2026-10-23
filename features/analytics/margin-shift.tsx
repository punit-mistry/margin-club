import { pct, pts } from "@/lib/analytics/format";
import type { ProductMetrics } from "@/lib/analytics/types";

/**
 * Dumbbell: each product's contribution margin in the opening window (hollow)
 * and the closing window (solid). Row thickness = closing revenue share.
 */
export function MarginShift({
  before,
  after,
  selected,
  onSelect,
}: {
  before: ProductMetrics[];
  after: ProductMetrics[];
  selected?: string | null;
  onSelect?: (productId: string) => void;
}) {
  const rows = after
    .map((a) => ({ a, b: before.find((x) => x.product.id === a.product.id)! }))
    .sort((x, y) => x.a.margin - y.a.margin);
  const lo = Math.min(0, ...rows.map((r) => Math.min(r.a.margin, r.b.margin))) - 0.02;
  const hi = Math.max(...rows.map((r) => Math.max(r.a.margin, r.b.margin))) + 0.04;
  const X = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const maxShare = Math.max(...rows.map((r) => r.a.revenueShare));
  return (
    <div role="list" className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-[38%] right-[64px]">
        {[0, 0.2, 0.4].filter((v) => v > lo && v < hi).map((v) => (
          <span key={v} className="absolute inset-y-0 border-l border-dashed border-ink/20" style={{ left: `${X(v)}%` }}>
            <span className="meta absolute -top-4 -translate-x-1/2 text-ink-soft">{pct(v, 0)}</span>
          </span>
        ))}
      </div>
      <div className="pt-4">
        {rows.map(({ a, b }) => {
          const down = a.margin < b.margin - 0.08;
          const isSel = selected === a.product.id;
          const thick = 2 + (a.revenueShare / maxShare) * 10;
          return (
            <button
              key={a.product.id}
              type="button"
              role="listitem"
              onClick={() => onSelect?.(a.product.id)}
              className={`group grid w-full grid-cols-[38%_1fr_64px] items-center gap-0 border-b border-ink/10 py-1.5 text-left transition-colors ${isSel ? "bg-electric/10" : "hover:bg-ink/5"}`}
            >
              <span className={`truncate pr-3 text-[13px] ${isSel ? "font-semibold text-electric" : ""}`}>{a.product.name}</span>
              <span className="relative h-5">
                <span
                  className={`absolute top-1/2 -translate-y-1/2 ${down ? "bg-signal" : "bg-ink"}`}
                  style={{ left: `${Math.min(X(a.margin), X(b.margin))}%`, width: `${Math.abs(X(a.margin) - X(b.margin))}%`, height: thick }}
                />
                <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-cream" style={{ left: `${X(b.margin)}%` }} />
                <span
                  className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${isSel ? "bg-electric" : down ? "bg-signal" : "bg-ink"}`}
                  style={{ left: `${X(a.margin)}%` }}
                />
              </span>
              <span className={`text-right font-mono text-[11px] tnum ${down ? "text-signal" : ""}`}>{pts(b.margin, a.margin).replace(" pts", "")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
