import { Stamp } from "@/components/brand";
import { channelById, productById } from "@/lib/analytics/dataset";
import { dateShort, inr } from "@/lib/analytics/format";
import { FLAGS } from "@/lib/analytics/suspicious";
import type { FlaggedTransaction } from "@/lib/analytics/types";

/** Ledger of the highest-scoring flagged orders. */
export function SuspectLedger({
  items,
  selected,
  onSelect,
}: {
  items: FlaggedTransaction[];
  selected?: string | null;
  onSelect?: (orderId: string) => void;
}) {
  if (!items.length) return <p className="meta py-6 text-ink-soft">No order in this range breaks a rule.</p>;
  return (
    <ol className="font-mono text-[11.5px] tnum">
      {items.map((f, i) => {
        const t = f.tx;
        const isSel = selected === t.id;
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect?.(t.id)}
              className={`grid w-full grid-cols-[22px_1fr_auto] items-start gap-x-2 border-b border-dashed border-ink/30 py-2 text-left transition-colors ${isSel ? "bg-electric/10" : "hover:bg-ink/5"}`}
            >
              <span className="text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className={`font-bold ${isSel ? "text-electric" : ""}`}>{t.id}</span>
                <span className="text-ink-soft">
                  {" "}
                  · {dateShort(t.date)} · {channelById(t.channel).short} · {t.coupon ?? "full price"}
                </span>
                <span className="block truncate text-ink-soft">{t.lines.map((l) => `${l.qty}× ${productById(l.productId).name}`).join(" + ")}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {f.flags.slice(0, 3).map((id) => (
                    <span key={id} className="border border-signal px-1 text-[9px] uppercase text-signal">
                      {FLAGS[id].label}
                    </span>
                  ))}
                </span>
              </span>
              <span className={`text-right font-bold ${t.profit < 0 ? "text-signal" : ""}`}>
                {inr(t.profit)}
                {i === 0 && t.profit < 0 && (
                  <span className="mt-1 block">
                    <Stamp rotate={-8} className="text-[9px]">Worst</Stamp>
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
