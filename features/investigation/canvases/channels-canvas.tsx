"use client";

import { useMemo } from "react";
import { ChannelMultiples, ChannelStacks, ShareSlope } from "@/features/analytics/channel-charts";
import { pct } from "@/lib/analytics/format";
import { byChannel, byMonth } from "@/lib/analytics/metrics";
import { CASE_001 } from "../case";
import { CanvasHeader } from "../canvas-header";
import { Chip, Exhibit } from "../exhibit";
import { actions, useWorkspace } from "../store";
import { useScope } from "../use-scope";

export function ChannelsCanvas() {
  const ws = useWorkspace();
  const s = useScope(ws.range);
  const mode = CASE_001.modes[3];
  const selChannel = ws.selection?.kind === "channel" ? ws.selection.id : null;

  const data = useMemo(() => {
    const list = byChannel(s.txs).filter((c) => c.orders > 0);
    const series = list.map((c) => ({ channel: c.channel, months: byMonth(s.txs.filter((t) => t.channel === c.channel.id), s.months) }));
    const sorted = [...list].sort((a, b) => a.margin - b.margin);
    return { list, series, worst: sorted[0], best: sorted[sorted.length - 1] };
  }, [s]);

  const select = (id: (typeof data.list)[number]["channel"]["id"]) => actions.select({ kind: "channel", id });

  return (
    <div>
      <CanvasHeader mode={mode} meta={`${data.list.length} channels · ${s.label}`}>
        {data.worst && data.best && data.worst !== data.best ? (
          <p>
            Out of every ₹100 of list value, {data.best.channel.name} keeps{" "}
            <strong className="marker tnum">₹{((data.best.profit / data.best.gross) * 100).toFixed(1)}</strong>. {data.worst.channel.name} keeps{" "}
            <strong className="marker-red tnum text-signal">₹{((data.worst.profit / data.worst.gross) * 100).toFixed(1)}</strong> — fees alone take{" "}
            {pct(data.worst.fees / (data.worst.net || 1))} of its revenue.
          </p>
        ) : (
          <p>Only one channel has orders in this range.</p>
        )}
      </CanvasHeader>

      <div className="grid grid-cols-12 gap-x-3 gap-y-12 @2xl:gap-x-8">
        <Exhibit
          letter="A"
          title="Where ₹100 goes, by channel"
          kicker="share of list value"
          className="col-span-12 @4xl:col-span-8"
          tone="red"
          hint="Click a channel to inspect it."
          actions={
            selChannel ? (
              <Chip
                onClick={() =>
                  actions.openDrawer({
                    title: `${data.list.find((c) => c.channel.id === selChannel)?.channel.name} orders`,
                    description: "Sorted by contribution profit, worst first.",
                    orderIds: s.txs.filter((t) => t.channel === selChannel).sort((a, b) => a.profit - b.profit).map((t) => t.id),
                    source: "Exhibit A · Channels",
                  })
                }
              >
                Open orders →
              </Chip>
            ) : null
          }
        >
          <ChannelStacks channels={data.list} selected={selChannel} onSelect={select} />
        </Exhibit>

        <Exhibit letter="B" title="Revenue share vs profit share" kicker="slope" className="col-span-12 @xl:col-span-8 @xl:col-start-3 @4xl:col-span-4 @4xl:col-start-auto @4xl:mt-20" hint="A line that falls means the channel earns less profit than its sales suggest.">
          <div className="mx-auto max-w-[460px]">
            <ShareSlope channels={data.list} selected={selChannel} onSelect={select} />
          </div>
        </Exhibit>

        <Exhibit letter="C" title="Margin, month by month" kicker="vs business average (grey)" className="col-span-12 @4xl:col-span-8 @4xl:col-start-3">
          <ChannelMultiples series={data.series} overall={s.monthly} selected={selChannel} onSelect={select} />
        </Exhibit>
      </div>
    </div>
  );
}
