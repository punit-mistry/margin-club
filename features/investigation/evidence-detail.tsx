"use client";

import { ArrowLeft, MessageSquareText, Table2, X } from "lucide-react";
import type { ReactNode } from "react";
import { Stamp } from "@/components/brand";
import { repeatRate } from "@/lib/analytics/customers";
import { channelById, customerById, getDataset, productById, txById } from "@/lib/analytics/dataset";
import { change, dateLabel, inr, inrCompact, monthLong, monthShort, num, pct, pts } from "@/lib/analytics/format";
import { bandById, breakEvenDiscount, byMonth, byProduct, costStack, productMonthly, totals } from "@/lib/analytics/metrics";
import { prevMonth } from "@/lib/analytics/periods";
import { FLAGS, flagsFor } from "@/lib/analytics/suspicious";
import type { EvidenceRef, MonthKey, Totals, Transaction } from "@/lib/analytics/types";
import { CASE_001 } from "./case";
import { actions, useWorkspace } from "./store";
import { useScope, type Scope } from "./use-scope";

export function EvidenceDetail() {
  const ws = useWorkspace();
  const s = useScope(ws.range);
  const sel = ws.selection;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-ink px-4">
        <span className="meta flex items-center gap-2">
          <span className={`inline-block h-2 w-2 ${sel ? "bg-electric" : "bg-ink/30"}`} />
          {sel ? `Selected evidence · ${sel.kind}` : ws.compare ? "Comparison" : "Case brief"}
        </span>
        {(sel || ws.compare) && (
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 border border-ink px-2 font-mono text-[10px] uppercase hover:bg-ink hover:text-cream"
            onClick={() => {
              if (sel) actions.select(null);
              else actions.setCompare(null);
            }}
            aria-label="Clear selection"
          >
            <span className="xl:hidden"><ArrowLeft size={12} /></span>
            <span className="hidden xl:inline"><X size={12} /></span>
            <span>{sel ? "Clear" : "Clear compare"}</span>
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        {sel ? <Selected sel={sel} s={s} /> : ws.compare ? <CompareView pair={ws.compare} /> : <Brief s={s} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Selected({ sel, s }: { sel: EvidenceRef; s: Scope }) {
  switch (sel.kind) {
    case "month":
      return <MonthDetail m={sel.id} s={s} />;
    case "product":
      return <ProductDetail id={sel.id} s={s} />;
    case "channel":
      return <ChannelDetail id={sel.id} s={s} />;
    case "band":
      return <BandDetail id={sel.id} s={s} />;
    case "order":
      return <OrderDetail id={sel.id} />;
    case "cohort":
      return <CohortDetail m={sel.id} />;
  }
}

function Title({ kicker, children, stamp }: { kicker: string; children: ReactNode; stamp?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-2">
      <div>
        <span className="meta text-ink-soft">{kicker}</span>
        <h2 className="display mt-1 text-[38px] leading-[0.88]">{children}</h2>
      </div>
      {stamp}
    </div>
  );
}

function Facts({ rows }: { rows: [string, ReactNode, ("red" | "blue")?][] }) {
  return (
    <dl className="border-t border-ink font-mono text-[11.5px] tnum">
      {rows.map(([k, v, tone]) => (
        <div key={k} className="flex items-baseline justify-between gap-3 border-b border-ink/15 py-1.5">
          <dt className="text-ink-soft uppercase tracking-[0.06em]">{k}</dt>
          <dd className={`text-right font-bold ${tone === "red" ? "text-signal" : tone === "blue" ? "text-electric" : ""}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Buttons({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-col gap-2">{children}</div>;
}

function Action({ onClick, icon, children, tone = "ink" }: { onClick: () => void; icon: ReactNode; children: ReactNode; tone?: "ink" | "blue" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-3 border px-3 py-2.5 text-left font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${tone === "blue" ? "border-electric text-electric hover:bg-electric hover:text-cream" : "border-ink hover:bg-ink hover:text-cream"}`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
      <span aria-hidden>→</span>
    </button>
  );
}

function MiniStack({ t }: { t: Totals }) {
  const st = costStack(t);
  const parts = [
    { k: "Discount", v: st.discount, c: "#E74732" },
    { k: "COGS", v: st.cogs, c: "#161616" },
    { k: "Ship + pack", v: st.shipping + st.packaging, c: "#C4BEB2" },
    { k: "Fees", v: st.fees, c: "#3B3936" },
    { k: "Profit", v: Math.max(0, st.profit), c: "#244BFF" },
  ];
  return (
    <div className="mt-4">
      <span className="meta text-ink-soft">Every ₹100 of list value</span>
      <div className="mt-1 flex h-6 border border-ink">
        {parts.map((p) => (
          <span key={p.k} style={{ width: `${p.v * 100}%`, background: p.c }} title={`${p.k}: ₹${(p.v * 100).toFixed(1)}`} />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10px] tnum">
        {parts.map((p) => (
          <span key={p.k}>
            <span className="mr-1 inline-block h-2 w-2" style={{ background: p.c }} />
            {p.k} ₹{(p.v * 100).toFixed(0)}
          </span>
        ))}
      </div>
    </div>
  );
}

function openOrders(title: string, list: Transaction[], description: string, source: string) {
  actions.openDrawer({ title, description, orderIds: [...list].sort((a, b) => a.profit - b.profit).map((t) => t.id), source });
}

/* ------------------------------------------------------------------ */

function MonthDetail({ m, s }: { m: MonthKey; s: Scope }) {
  const all = getDataset().transactions;
  const p = prevMonth(m);
  const [cur, prev] = byMonth(all, p ? [m, p] : [m, m]);
  const list = all.filter((t) => t.month === m);
  const codes = getDataset().campaigns.filter((c) => !c.newOnly && c.from.slice(0, 7) <= m && c.to.slice(0, 7) >= m);
  const top = byProduct(list).sort((a, b) => b.net - a.net).slice(0, 3);
  return (
    <>
      <Title
        kicker={`Month · ${s.months.indexOf(m) >= 0 ? `#${String(s.months.indexOf(m) + 1).padStart(2, "0")} in range` : "outside range"}`}
        stamp={cur.lossOrders > 0 ? <Stamp rotate={6}>{cur.lossOrders} losses</Stamp> : undefined}
      >
        {monthLong(m)}
      </Title>
      <Facts
        rows={[
          ["Revenue", `${inrCompact(cur.net)}${p ? ` (${change(prev.net, cur.net, 0)})` : ""}`],
          ["Contribution profit", `${inrCompact(cur.profit)}${p ? ` (${change(prev.profit, cur.profit, 0)})` : ""}`, p && cur.profit < prev.profit ? "red" : undefined],
          ["Margin", `${pct(cur.margin)}${p ? ` (${pts(prev.margin, cur.margin)})` : ""}`, cur.margin < 0.3 ? "red" : undefined],
          ["Orders", num(cur.orders)],
          ["Discounted orders", pct(cur.discountedShare, 0), cur.discountedShare > 0.5 ? "red" : undefined],
          ["New customers", num(cur.newCustomers)],
          ["Loss-making orders", num(cur.lossOrders), cur.lossOrders ? "red" : undefined],
        ]}
      />
      <MiniStack t={cur} />
      <div className="mt-4">
        <span className="meta text-ink-soft">Codes live</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {codes.length ? codes.map((c, i) => <Stamp key={c.code} rotate={i % 2 ? 3 : -3}>{`${c.code} · ${c.pct}%`}</Stamp>) : <span className="meta">None besides WELCOME10</span>}
        </div>
      </div>
      <div className="mt-4">
        <span className="meta text-ink-soft">Best sellers</span>
        <ul className="mt-1 font-mono text-[11px] tnum">
          {top.map((x) => (
            <li key={x.product.id} className="flex justify-between border-b border-ink/10 py-1">
              <span className="truncate pr-2">{x.product.name}</span>
              <span className={x.margin < 0.2 ? "text-signal" : ""}>{pct(x.margin, 0)}</span>
            </li>
          ))}
        </ul>
      </div>
      <Buttons>
        <Action icon={<Table2 size={14} />} onClick={() => openOrders(`${monthLong(m)} orders`, list, "Every order in the month, worst profit first.", "Month detail")}>
          Open {num(list.length)} orders
        </Action>
        {p && (
          <Action icon={<span className="font-mono">⇆</span>} onClick={() => actions.setCompare([p, m])}>
            Compare with {monthShort(p)}
          </Action>
        )}
        <Action tone="blue" icon={<MessageSquareText size={14} />} onClick={() => actions.ask(`What happened in ${monthLong(m)}?`)}>
          Ask about {monthShort(m)}
        </Action>
      </Buttons>
    </>
  );
}

function ProductDetail({ id, s }: { id: string; s: Scope }) {
  const p = productById(id);
  const m = byProduct(s.txs).find((x) => x.product.id === id)!;
  const series = productMonthly(s.txs, s.months).get(id)!;
  const be = breakEvenDiscount(p, channelById("website"));
  const list = s.txs.filter((t) => t.lines.some((l) => l.productId === id));
  const maxUnits = Math.max(1, ...series.map((x) => x.units));
  return (
    <>
      <Title kicker={`Product · ${p.sku}`} stamp={m.margin < 0.2 ? <Stamp rotate={5}>Thin margin</Stamp> : undefined}>
        {p.name}
      </Title>
      <Facts
        rows={[
          ["List price", inr(p.price)],
          ["Landed cost", inr(p.unitCost)],
          ["List margin", pct((p.price - p.unitCost) / p.price)],
          ["Break-even discount", pct(be, 0), "red"],
          [`Units · ${s.label}`, num(m.units)],
          ["Revenue", `${inrCompact(m.net)} (${pct(m.revenueShare)} of total)`],
          ["Contribution margin", pct(m.margin), m.margin < 0.2 ? "red" : "blue"],
          ["Avg discount", pct(m.avgDiscount), m.avgDiscount > 0.2 ? "red" : undefined],
        ]}
      />
      <div className="mt-4">
        <span className="meta text-ink-soft">Units (bars) and margin (labels) by month</span>
        <div className="mt-2 flex h-28 items-end gap-1">
          {series.map((x) => (
            <div key={x.month} className="flex h-full flex-1 flex-col justify-end" title={`${monthShort(x.month)}: ${x.units} units, ${pct(x.margin)} margin`}>
              <span className={`text-center font-mono text-[8.5px] tnum ${x.margin < 0.15 ? "text-signal" : ""}`}>{x.units ? pct(x.margin, 0) : ""}</span>
              <span className={`block w-full ${x.margin < 0.15 ? "bg-signal" : "bg-ink"}`} style={{ height: `${(x.units / maxUnits) * 80}%` }} />
              <span className="mt-1 text-center font-mono text-[8.5px] uppercase">{monthShort(x.month).slice(0, 1)}</span>
            </div>
          ))}
        </div>
      </div>
      <Buttons>
        <Action icon={<Table2 size={14} />} onClick={() => openOrders(`Orders containing ${p.name}`, list, "Worst contribution profit first.", "Product detail")}>
          Open {num(list.length)} orders
        </Action>
        <Action tone="blue" icon={<MessageSquareText size={14} />} onClick={() => actions.ask(`Tell me about the ${p.name}.`)}>
          Ask about this product
        </Action>
      </Buttons>
    </>
  );
}

function ChannelDetail({ id, s }: { id: Transaction["channel"]; s: Scope }) {
  const ch = channelById(id);
  const list = s.txs.filter((t) => t.channel === id);
  const t = totals(list);
  return (
    <>
      <Title kicker={`Channel · ${ch.short}`} stamp={t.margin < s.all.margin * 0.75 ? <Stamp rotate={5}>Margin leak</Stamp> : undefined}>
        {ch.name}
      </Title>
      <Facts
        rows={[
          ["Orders", num(t.orders)],
          ["Revenue", `${inrCompact(t.net)} (${pct(s.all.net ? t.net / s.all.net : 0, 0)})`],
          ["Contribution profit", `${inrCompact(t.profit)} (${pct(s.all.profit ? t.profit / s.all.profit : 0, 0)})`],
          ["Margin", pct(t.margin), t.margin < s.all.margin ? "red" : "blue"],
          ["Fee rate", pct(ch.feeRate)],
          ["Discounted orders", pct(t.discountedShare, 0)],
          ["Loss-making orders", num(t.lossOrders), t.lossOrders ? "red" : undefined],
          ["Live since", dateLabel(ch.launched)],
        ]}
      />
      {t.orders > 0 && <MiniStack t={t} />}
      <Buttons>
        <Action icon={<Table2 size={14} />} onClick={() => openOrders(`${ch.name} orders`, list, "Worst contribution profit first.", "Channel detail")}>
          Open {num(list.length)} orders
        </Action>
        <Action tone="blue" icon={<MessageSquareText size={14} />} onClick={() => actions.ask(`What about ${ch.name}?`)}>
          Ask about {ch.name}
        </Action>
      </Buttons>
    </>
  );
}

function BandDetail({ id, s }: { id: Parameters<typeof bandById>[0]; s: Scope }) {
  const b = bandById(id);
  const list = s.txs.filter((t) => t.discountPct >= b.min && t.discountPct < b.max);
  const t = totals(list);
  const codes = [...new Set(list.map((x) => x.coupon ?? "—"))];
  return (
    <>
      <Title kicker="Discount band" stamp={t.lossOrders ? <Stamp rotate={5}>{t.lossOrders} losses</Stamp> : undefined}>
        {b.label}
      </Title>
      <Facts
        rows={[
          ["Orders", `${num(t.orders)} (${pct(s.all.orders ? t.orders / s.all.orders : 0, 0)})`],
          ["Revenue", `${inrCompact(t.net)} (${pct(s.all.net ? t.net / s.all.net : 0, 0)})`],
          ["Profit", `${inrCompact(t.profit)} (${pct(s.all.profit ? t.profit / s.all.profit : 0, 0)})`],
          ["Margin", pct(t.margin), t.margin < 0.2 ? "red" : "blue"],
          ["Profit per order", t.orders ? inr(Math.round(t.profit / t.orders)) : "—"],
          ["Loss-making", num(t.lossOrders), t.lossOrders ? "red" : undefined],
        ]}
      />
      <p className="meta mt-3 text-ink-soft">Codes: {codes.join(" · ")}</p>
      <Buttons>
        <Action icon={<Table2 size={14} />} onClick={() => openOrders(`${b.label} orders`, list, "Worst contribution profit first.", "Band detail")}>
          Open {num(list.length)} orders
        </Action>
        <Action tone="blue" icon={<MessageSquareText size={14} />} onClick={() => actions.ask("Are discounts helping revenue but hurting profitability?")}>
          Ask about discounts
        </Action>
      </Buttons>
    </>
  );
}

function OrderDetail({ id }: { id: string }) {
  const t = txById(id);
  if (!t) return <p className="meta">Order not found.</p>;
  const c = customerById(t.customerId);
  const flags = flagsFor(t);
  const steps: [string, number, string][] = [
    ["List value", t.gross, "#161616"],
    [`Discount${t.coupon ? ` · ${t.coupon}` : ""}`, -t.discount, "#E74732"],
    ["Product cost", -t.cogs, "#161616"],
    ["Shipping", -t.shipping, "#C4BEB2"],
    ["Packaging", -t.packaging, "#D7D2C8"],
    [`Fees · ${channelById(t.channel).short}`, -t.fees, "#3B3936"],
  ];
  const max = t.gross;
  let run = t.gross;
  const custOrders = getDataset().transactions.filter((x) => x.customerId === t.customerId);
  return (
    <>
      <Title kicker={`Order · ${dateLabel(t.date)} · ${t.time}`} stamp={t.profit < 0 ? <Stamp rotate={7} animate>Loss</Stamp> : <Stamp tone="blue" rotate={-4}>Profitable</Stamp>}>
        {t.id}
      </Title>
      <ul className="border-t border-ink font-mono text-[11.5px] tnum">
        {t.lines.map((l) => (
          <li key={l.productId} className="flex justify-between gap-2 border-b border-ink/15 py-1.5">
            <span className="truncate">
              {l.qty}× {productById(l.productId).name}
            </span>
            <span>{inr(l.unitPrice * l.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <span className="meta text-ink-soft">Rupee waterfall</span>
        <ul className="mt-2 space-y-1">
          {steps.map(([k, v, col], i) => {
            // Each deduction spans [after, before] on a shared 0 → list-value axis.
            const before = i === 0 ? v : run;
            if (i > 0) run += v;
            const left = i === 0 ? 0 : run;
            const w = i === 0 ? v : -v;
            return (
              <li key={k} className="grid grid-cols-[96px_1fr_64px] items-center gap-2 font-mono text-[10.5px] tnum">
                <span className="truncate text-ink-soft">{k}</span>
                <span className="relative h-3.5 bg-ink/5">
                  <span className="absolute inset-y-0" style={{ left: `${(left / max) * 100}%`, width: `${(w / max) * 100}%`, background: col }} />
                </span>
                <span className="text-right">{i === 0 ? inr(before) : `−${inr(-v)}`}</span>
              </li>
            );
          })}
          <li className="grid grid-cols-[96px_1fr_64px] items-center gap-2 border-t border-ink pt-1 font-mono text-[10.5px] font-bold tnum">
            <span>Profit</span>
            <span className="relative h-3.5 bg-ink/5">
              <span className="absolute inset-y-0 left-0" style={{ width: `${(Math.abs(t.profit) / max) * 100}%`, background: t.profit < 0 ? "#E74732" : "#244BFF" }} />
            </span>
            <span className={`text-right ${t.profit < 0 ? "text-signal" : "text-electric"}`}>{inr(t.profit)}</span>
          </li>
        </ul>
        <p className="meta mt-1 text-ink-soft">Margin {pct(t.net ? t.profit / t.net : 0)} on {inr(t.net)} collected</p>
      </div>
      {flags.length > 0 && (
        <div className="mt-4 space-y-2">
          <span className="meta text-ink-soft">Rules broken</span>
          {flags.map((f) => (
            <div key={f} className="border-l-2 border-signal pl-2">
              <span className="font-mono text-[10.5px] font-bold text-signal">{FLAGS[f].label}</span>
              <p className="text-[12.5px] leading-snug text-ink-soft">{FLAGS[f].description}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 border border-ink p-3">
        <span className="meta text-ink-soft">Customer</span>
        <p className="mt-1 text-[14px] font-semibold">
          {c.name} <span className="font-normal text-ink-soft">· {c.city}</span>
        </p>
        <p className="font-mono text-[10.5px] text-ink-soft">
          {c.id} · order #{t.customerOrderNo} · first bought {dateLabel(c.acquiredOn)}
          {c.acquisitionCoupon ? ` on ${c.acquisitionCoupon}` : " at full price"}
        </p>
      </div>
      <Buttons>
        <Action icon={<Table2 size={14} />} onClick={() => openOrders(`${c.name}'s orders`, custOrders, `${c.id} · every order in the books.`, "Order detail")}>
          Customer&apos;s {custOrders.length} orders
        </Action>
        {t.coupon && (
          <Action tone="blue" icon={<MessageSquareText size={14} />} onClick={() => actions.ask(`Tell me about ${t.coupon}.`)}>
            Ask about {t.coupon}
          </Action>
        )}
      </Buttons>
    </>
  );
}

function CohortDetail({ m }: { m: MonthKey }) {
  const all = getDataset().transactions;
  const firsts = all.filter((t) => t.month === m && t.customerOrderNo === 1);
  const r60 = repeatRate({ from: m, to: m }, 60);
  const deep = firsts.filter((t) => t.discountPct >= 25).length;
  const ids = new Set(firsts.map((t) => t.customerId));
  const later = all.filter((t) => ids.has(t.customerId) && t.customerOrderNo > 1);
  return (
    <>
      <Title kicker="Cohort · first purchase month">{monthLong(m)}</Title>
      <Facts
        rows={[
          ["New customers", num(firsts.length)],
          ["Acquired at 25%+ off", `${num(deep)} (${pct(firsts.length ? deep / firsts.length : 0, 0)})`, deep / (firsts.length || 1) > 0.4 ? "red" : undefined],
          ["60-day repeat", r60.eligible >= 40 ? `${pct(r60.rate)} (${r60.repeated}/${r60.eligible})` : "too early to tell"],
          ["Repeat orders so far", num(later.length)],
        ]}
      />
      <Buttons>
        <Action icon={<Table2 size={14} />} onClick={() => openOrders(`${monthShort(m)} cohort · first orders`, firsts, "First purchases of this cohort.", "Cohort detail")}>
          Open {num(firsts.length)} first orders
        </Action>
        <Action tone="blue" icon={<MessageSquareText size={14} />} onClick={() => actions.ask("Do discount customers come back?")}>
          Ask about retention
        </Action>
      </Buttons>
    </>
  );
}

function CompareView({ pair }: { pair: [MonthKey, MonthKey] }) {
  const [a, b] = pair;
  const [A, B] = byMonth(getDataset().transactions, [a, b]);
  const rows: [string, string, string, string, boolean | null][] = [
    ["Revenue", inrCompact(A.net), inrCompact(B.net), change(A.net, B.net, 0), B.net >= A.net],
    ["Profit", inrCompact(A.profit), inrCompact(B.profit), change(A.profit, B.profit, 0), B.profit >= A.profit],
    ["Margin", pct(A.margin, 0), pct(B.margin, 0), pts(A.margin, B.margin, 0), B.margin >= A.margin],
    ["Orders", num(A.orders), num(B.orders), change(A.orders, B.orders, 0), null],
    ["Discounted", pct(A.discountedShare, 0), pct(B.discountedShare, 0), pts(A.discountedShare, B.discountedShare, 0), B.discountedShare <= A.discountedShare],
    ["Losses", num(A.lossOrders), num(B.lossOrders), change(A.lossOrders, B.lossOrders, 0), B.lossOrders <= A.lossOrders],
  ];
  return (
    <>
      <Title kicker="Comparing two months">
        {monthShort(a)} <span className="text-electric">vs</span> {monthShort(b)}
      </Title>
      <table className="w-full font-mono text-[11.5px] tnum">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="meta py-1 font-normal" />
            <th className="meta py-1 text-right font-normal">{monthShort(a)}</th>
            <th className="meta py-1 text-right font-normal">{monthShort(b)}</th>
            <th className="meta py-1 text-right font-normal">Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, x, y, d, good]) => (
            <tr key={k} className="border-b border-ink/15">
              <td className="py-1.5 text-ink-soft uppercase">{k}</td>
              <td className="py-1.5 text-right">{x}</td>
              <td className="py-1.5 text-right">{y}</td>
              <td className={`py-1.5 text-right font-bold ${good === null ? "" : good ? "text-electric" : "text-signal"}`}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Buttons>
        <Action tone="blue" icon={<MessageSquareText size={14} />} onClick={() => actions.ask(`Compare ${monthLong(a)} and ${monthLong(b)}.`)}>
          Ask the investigator
        </Action>
      </Buttons>
    </>
  );
}

function Brief({ s }: { s: Scope }) {
  return (
    <>
      <Stamp rotate={-3} className="mb-4">Fictional case · demo data</Stamp>
      <h2 className="display text-[40px] leading-[0.88]">{CASE_001.code}</h2>
      <p className="serif-italic text-[22px]">{CASE_001.title}</p>
      <p className="mt-3 text-[14px] leading-snug">{CASE_001.brief}</p>
      <Facts
        rows={[
          ["Business", CASE_001.business],
          ["In range", s.label],
          ["Orders", num(s.txs.length)],
          ["Revenue", inrCompact(s.all.net)],
          ["Contribution profit", inrCompact(s.all.profit)],
          ["Margin", pct(s.all.margin)],
        ]}
      />
      <div className="mt-5 space-y-2 text-[13px] leading-snug">
        <p className="meta text-ink-soft">How to read the board</p>
        <p>
          <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-signal align-middle" />
          Red marks suspicious patterns and money lost.
        </p>
        <p>
          <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-electric align-middle" />
          Blue marks what you&apos;ve selected.
        </p>
        <p>Click any bar, dot, row or product to put it under the lens. Every number opens the orders behind it.</p>
      </div>
    </>
  );
}
