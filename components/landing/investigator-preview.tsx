"use client";

import { useEffect, useRef, useState } from "react";
import { CTALink, Stamp } from "@/components/brand";
import { RichText } from "@/components/rich-text";
import { investigate } from "@/lib/ai/engine";
import type { AnalysisResult } from "@/lib/ai/types";
import { fullRange } from "@/lib/analytics/periods";
import { getDataset } from "@/lib/analytics/dataset";
import { num } from "@/lib/analytics/format";

const SUGGESTIONS = [
  { label: "Investigate declining margins", q: "Why is my profit declining?" },
  { label: "Find suspicious transactions", q: "Show me the most suspicious transactions." },
  { label: "Compare product profitability", q: "Which products are hurting my margins?" },
  { label: "Explain the revenue increase", q: "Explain the revenue increase." },
];

export function InvestigatorPreview() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const ask = (q: string) => {
    if (timer.current) clearInterval(timer.current);
    const r = investigate(q, { range: fullRange() }, `preview-${q}`, 0);
    setResult(r);
    setRevealed(0);
    let n = 0;
    timer.current = setInterval(() => {
      n++;
      setRevealed(n);
      if (n > r.steps.length && timer.current) clearInterval(timer.current);
    }, 220);
  };

  const done = result !== null && revealed > result.steps.length;

  return (
    <section id="investigator" className="scroll-mt-14 border-b border-ink bg-ink text-cream">
      <div className="flex items-center justify-between border-b border-cream/25 px-4 py-3 sm:px-8">
        <span className="meta">04 — The investigator</span>
        <span className="meta flex items-center gap-2 text-cream/70">
          <span className="inline-block h-2 w-2 animate-blink bg-signal" /> Local analysis engine · runs in your browser
        </span>
      </div>
      <div className="grid lg:grid-cols-12">
        <div className="border-cream/25 px-4 pt-8 pb-10 sm:px-8 lg:col-span-5 lg:border-r">
          <h2 className="display text-[18vw] text-cream lg:text-[7.8vw]">
            Something
            <br />
            doesn&apos;t
            <br />
            <span className="text-signal">add up.</span>
          </h2>
          <p className="mt-6 max-w-[42ch] text-[16px] leading-snug text-cream/80">
            Ask a question. The investigator decides which metrics it needs, computes them from the case data, and shows every step.
            It is a transparent rules-and-arithmetic engine — <em className="serif-italic text-[1.12em] text-cream">not</em> a language model, and it says so.
          </p>
          <ul className="mt-8 border-t border-cream/25">
            {SUGGESTIONS.map((s, i) => {
              const active = result?.question === s.q;
              return (
                <li key={s.q}>
                  <button
                    type="button"
                    onClick={() => ask(s.q)}
                    className={`group flex w-full items-baseline justify-between gap-4 border-b border-cream/25 py-4 text-left transition-colors ${active ? "text-signal" : "hover:text-signal"}`}
                  >
                    <span className="flex items-baseline gap-4">
                      <span className="meta text-cream/50">Q{i + 1}</span>
                      <span className="display text-[30px] sm:text-[38px]">{s.label}</span>
                    </span>
                    <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative px-4 py-8 sm:px-8 lg:col-span-7">
          <div className="min-h-[520px] border border-cream/40 bg-cream p-5 text-ink shadow-[8px_8px_0_#E74732] sm:p-7" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink pb-3">
              <span className="meta">Investigation console</span>
              <Stamp tone="blue" rotate={-2}>
                Local analysis engine
              </Stamp>
            </div>
            {!result && (
              <div className="flex min-h-[420px] flex-col items-start justify-center gap-4">
                <p className="display text-[56px] leading-[0.85] text-ink/20">Awaiting a question_</p>
                <p className="meta text-ink-soft">Pick a question on the left. Answers are computed live from {num(getDataset().transactions.length)} orders.</p>
              </div>
            )}
            {result && (
              <div className="pt-4">
                <p className="meta text-ink-soft">Q · {result.question}</p>
                <ol className="mt-4 space-y-1.5 font-mono text-[11.5px]">
                  {result.steps.map((s, i) => (
                    <li key={i} className={`flex gap-3 transition-opacity duration-200 ${i < revealed ? "opacity-100" : "opacity-0"}`}>
                      <span className="text-electric">{String(i + 1).padStart(2, "0")}</span>
                      <span className="w-48 shrink-0 font-bold uppercase">{s.label}</span>
                      <span className="hidden text-ink-soft sm:block">{s.detail}</span>
                    </li>
                  ))}
                </ol>
                {done && (
                  <div className="mt-6 animate-rise border-t border-ink pt-5">
                    <span className="meta text-signal">{result.caseTitle}</span>
                    <h3 className="display mt-1 text-[40px] leading-[0.9] sm:text-[48px]">{result.headline}</h3>
                    <div className="mt-4 space-y-3 text-[15px] leading-relaxed">
                      {result.explanation.slice(0, 2).map((p, i) => (
                        <p key={i}>
                          <RichText text={p} />
                        </p>
                      ))}
                    </div>
                    {result.findings.length > 0 && (
                      <dl className={`mt-5 grid grid-cols-2 gap-px border border-ink bg-ink [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1 ${result.findings.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                        {result.findings.slice(0, 4).map((f) => (
                          <div key={f.label} className="bg-cream p-3">
                            <dt className="meta truncate text-ink-soft">{f.label}</dt>
                            <dd className={`display mt-1 text-[28px] tnum ${f.tone === "red" ? "text-signal" : f.tone === "blue" ? "text-electric" : ""}`}>{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                      <span className="meta text-ink-soft">
                        {result.evidence.reduce((s, e) => s + e.orderIds.length, 0)} supporting records · {result.evidence.length} evidence sets
                      </span>
                      <CTALink href="/investigation">Continue the investigation</CTALink>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="meta mt-6 max-w-[60ch] text-cream/60">
            Optional: connect your own Ollama model in the workspace settings to narrate the findings. The numbers still come from the engine.
            No paid API, no keys.
          </p>
        </div>
      </div>
    </section>
  );
}
