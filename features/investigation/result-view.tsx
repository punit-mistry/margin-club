"use client";

import { ChevronDown, Crosshair, FileSearch, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { RichText } from "@/components/rich-text";
import { unverifiedNumbers } from "@/lib/ai/ollama";
import type { AnalysisResult } from "@/lib/ai/types";
import { rangeLabel } from "@/lib/analytics/format";
import { actions } from "./store";

/** One investigation step rendered as a memo: working → answer → evidence. */
export function ResultView({
  r,
  index,
  revealing,
  narrating,
  latest,
}: {
  r: AnalysisResult;
  index: number;
  revealing: number | null;
  narrating: boolean;
  latest: boolean;
}) {
  const [showWork, setShowWork] = useState(false);
  const inProgress = revealing !== null;
  const stepsVisible = inProgress ? revealing : showWork ? r.steps.length : 0;
  const unverified = r.narration ? unverifiedNumbers(r.narration, r) : [];

  return (
    <article className="relative">
      {/* Question */}
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10.5px] font-bold text-electric">Q.{String(index + 1).padStart(2, "0")}</span>
        <p className="text-[15px] leading-snug font-semibold">{r.question}</p>
      </div>
      {r.followUp && <span className="meta mt-1 ml-10 inline-block text-ink-soft">↳ follow-up</span>}

      {/* Working */}
      <div className="mt-3 ml-0 border-l-2 border-ink/20 pl-3">
        <button
          type="button"
          onClick={() => (inProgress ? actions.skipReveal() : setShowWork((v) => !v))}
          className="meta flex items-center gap-1.5 text-ink-soft hover:text-ink"
        >
          {inProgress ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} className={`transition-transform ${showWork ? "rotate-180" : ""}`} />}
          {inProgress ? `Investigating · step ${Math.min(revealing + 1, r.steps.length)}/${r.steps.length} (skip)` : `${r.steps.length} steps · ${showWork ? "hide" : "show"} working`}
        </button>
        {stepsVisible > 0 && (
          <ol className="mt-2 space-y-1">
            {r.steps.slice(0, stepsVisible).map((s, i) => (
              <li key={i} className="grid animate-rise grid-cols-[22px_1fr] gap-1 font-mono text-[10.5px] leading-snug [animation-duration:250ms]">
                <span className="text-electric">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-bold uppercase">{s.label}</span> <span className="text-ink-soft">— {s.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Answer */}
      {!inProgress && (
        <div className="mt-3 animate-rise border border-ink bg-cream p-4 shadow-[4px_4px_0_#161616]">
          <div className="flex items-start justify-between gap-2">
            <span className="meta text-signal">{r.caseTitle}</span>
            <span className="meta text-ink-soft">{rangeLabel(r.range.from, r.range.to)}</span>
          </div>
          <h3 className="display mt-1 text-[27px] leading-[0.95]">{r.headline}</h3>

          {r.engine.kind === "ollama" && r.engine.status === "ok" && r.narration && (
            <div className="mt-3 border-l-2 border-electric bg-electric/5 py-2 pr-2 pl-3">
              <span className="meta text-electric">Narrated by Ollama · {r.engine.model} · from the engine&apos;s figures</span>
              <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-line">{r.narration}</p>
              {unverified.length > 0 && (
                <p className="meta mt-2 text-signal normal-case tracking-normal">
                  ⚠ Not found in the engine&apos;s figures: {unverified.slice(0, 5).join(", ")} — trust the figures below.
                </p>
              )}
            </div>
          )}
          {narrating && (
            <p className="meta mt-3 flex items-center gap-2 text-electric">
              <Loader2 size={12} className="animate-spin" /> Ollama is narrating…
            </p>
          )}
          {r.engine.kind === "ollama" && r.engine.status === "failed" && (
            <div className="mt-3 border-l-2 border-signal py-1 pl-3">
              <p className="meta text-signal normal-case tracking-normal">Ollama narration failed: {r.engine.error}</p>
              <button type="button" onClick={() => actions.narrate(r.id)} className="meta mt-1 inline-flex items-center gap-1 underline">
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          <div className="mt-3 space-y-2.5 text-[14px] leading-relaxed">
            {r.explanation.map((p, i) => (
              <p key={i}>
                <RichText text={p} />
              </p>
            ))}
          </div>

          {r.findings.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-px border border-ink bg-ink [&>*:last-child:nth-child(odd)]:col-span-2">
              {r.findings.slice(0, 6).map((f) => (
                <div key={f.label} className="bg-cream px-2.5 py-2">
                  <dt className="meta truncate text-ink-soft" title={f.label}>{f.label}</dt>
                  <dd className={`display mt-0.5 text-[24px] tnum ${f.tone === "red" ? "text-signal" : f.tone === "blue" ? "text-electric" : ""}`}>{f.value}</dd>
                  {f.note && <dd className="font-mono text-[9.5px] text-ink-soft">{f.note}</dd>}
                </div>
              ))}
            </dl>
          )}

          {r.actions && r.actions.length > 0 && (
            <ol className="mt-4 space-y-3">
              {r.actions.map((a, i) => (
                <li key={a.title} className="grid grid-cols-[34px_1fr] gap-2">
                  <span className="display text-[40px] leading-[0.8] text-signal">{i + 1}</span>
                  <div>
                    <p className="text-[15px] font-semibold leading-snug">{a.title}</p>
                    <p className="mt-1 text-[13px] leading-snug text-ink-soft">{a.rationale}</p>
                    <p className="meta mt-1 text-electric">Watch: {a.watch}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {r.table && (
            <div className="mt-4 overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse font-mono text-[10.5px] tnum">
                <thead>
                  <tr className="border-b border-ink">
                    {r.table.columns.map((c, i) => (
                      <th key={c} className={`py-1 pr-2 font-normal uppercase text-ink-soft ${i ? "text-right" : "text-left"}`}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.table.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-ink/10">
                      {row.map((cell, ci) => {
                        const t = r.table!.tones?.[ri]?.[ci];
                        return (
                          <td key={ci} className={`py-1 pr-2 ${ci ? "text-right" : "max-w-[150px] truncate text-left"} ${t === "red" ? "font-bold text-signal" : t === "blue" ? "font-bold text-electric" : ""}`}>
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(r.evidence.length > 0 || r.focus) && (
            <div className="mt-4 flex flex-col gap-1.5">
              {r.evidence.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => actions.openDrawer({ title: e.title, description: e.description, orderIds: e.orderIds, source: `${e.id} · ${r.caseTitle}` })}
                  className="group flex items-center justify-between gap-2 border border-ink px-2.5 py-2 text-left transition-colors hover:bg-ink hover:text-cream"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileSearch size={13} className="shrink-0" />
                    <span className="font-mono text-[10px] font-bold whitespace-nowrap text-signal group-hover:text-cream">{e.id}</span>
                    <span className="truncate text-[12.5px]">Show evidence — {e.title}</span>
                  </span>
                  <span className="font-mono text-[10.5px] whitespace-nowrap tnum">{e.orderIds.length} →</span>
                </button>
              ))}
              {r.focus && (
                <button
                  type="button"
                  onClick={() => {
                    actions.setMode(r.focus!.mode);
                    if (r.focus!.ref) actions.select(r.focus!.ref, true);
                    if (r.focus!.compare) actions.setCompare(r.focus!.compare);
                    actions.setAiOpen(false);
                  }}
                  className="flex items-center gap-2 border border-electric px-2.5 py-2 text-left font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-electric hover:bg-electric hover:text-cream"
                >
                  <Crosshair size={13} /> Show on the evidence canvas
                </button>
              )}
            </div>
          )}

          {r.caveats.length > 0 && (
            <ul className="mt-3 space-y-1">
              {r.caveats.map((c) => (
                <li key={c} className="text-[11.5px] leading-snug text-ink-soft">
                  * {c}
                </li>
              ))}
            </ul>
          )}

          <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink/20 pt-2">
            <span className="meta text-electric">
              {r.engine.kind === "ollama" && r.engine.status === "ok" ? "Figures: local analysis engine · words: Ollama" : "Local analysis engine · rules + arithmetic"}
            </span>
            <span className="meta text-ink-soft" title={r.metrics.join(", ")}>{r.metrics.length} metrics</span>
          </footer>
        </div>
      )}

      {latest && !inProgress && r.nextQuestions.length > 0 && (
        <div className="mt-4">
          <span className="meta text-ink-soft">Next lines of inquiry</span>
          <div className="mt-2 flex flex-col gap-1.5">
            {r.nextQuestions.map((q) => (
              <button key={q} type="button" onClick={() => actions.ask(q)} className="group flex items-center justify-between gap-2 border-b border-ink/30 py-1.5 text-left text-[13.5px] hover:text-electric">
                <span>{q}</span>
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
