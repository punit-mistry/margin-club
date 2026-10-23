"use client";

import { ArrowUp, ChevronDown, History, Plus, Settings2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getDataset } from "@/lib/analytics/dataset";
import { num } from "@/lib/analytics/format";
import { ResultView } from "./result-view";
import { actions, useWorkspace } from "./store";

const SUGGESTED = [
  { label: "Investigate declining margins", q: "Why is my profit declining?" },
  { label: "Find suspicious transactions", q: "Show me the most suspicious transactions." },
  { label: "Compare product profitability", q: "Which products are hurting my margins?" },
  { label: "Explain the revenue increase", q: "Explain the revenue increase." },
];

const MORE = [
  "Are discounts helping revenue but hurting profitability?",
  "Compare this month to last month.",
  "Give me three actions I should take.",
  "Do discount customers come back?",
  "Which channels are least profitable?",
];

export function Investigator({ onCollapse }: { onCollapse?: () => void }) {
  const ws = useWorkspace();
  const [view, setView] = useState<"thread" | "history">("thread");
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastRef = useRef<HTMLDivElement>(null);
  const thread = ws.threads.find((t) => t.id === ws.activeThreadId) ?? null;
  const entries = thread?.entries ?? [];
  const engineLabel = ws.settings.engine === "ollama" ? `Local engine + Ollama · ${ws.settings.ollama.model}` : "Local analysis engine";

  // Bring the newest question to the top of the panel when it arrives.
  const lastId = entries[entries.length - 1]?.id;
  useEffect(() => {
    lastRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [lastId]);

  // "/" focuses the question box (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (q: string) => {
    if (!q.trim()) return;
    setView("thread");
    actions.ask(q);
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-cream-deep">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 bg-ink px-3 text-cream">
        <span className="flex min-w-0 items-center gap-2">
          <span className={`inline-block h-2 w-2 shrink-0 ${ws.reveal || ws.narrating ? "animate-blink bg-signal" : "bg-electric"}`} />
          <span className="display text-[22px] leading-none">The Investigator</span>
        </span>
        <span className="flex items-center gap-1">
          <HeaderBtn label="New investigation" onClick={() => { actions.newThread(); setView("thread"); }}><Plus size={15} /></HeaderBtn>
          <HeaderBtn label="Investigation history" active={view === "history"} onClick={() => setView((v) => (v === "history" ? "thread" : "history"))}><History size={15} /></HeaderBtn>
          <HeaderBtn label="Engine settings" onClick={() => actions.openSettings(true)}><Settings2 size={15} /></HeaderBtn>
          {onCollapse && <HeaderBtn label="Collapse investigator" onClick={onCollapse}><ChevronDown size={16} /></HeaderBtn>}
        </span>
      </div>
      <button
        type="button"
        onClick={() => actions.openSettings(true)}
        className="flex h-7 shrink-0 items-center justify-between border-b border-ink px-3 text-left hover:bg-paper"
        title="Change engine"
      >
        <span className="meta truncate text-electric">● {engineLabel}</span>
        <span className="meta text-ink-soft">{thread ? `${entries.length} step${entries.length === 1 ? "" : "s"}` : "new case file"}</span>
      </button>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-5" aria-live="polite">
        {view === "history" ? (
          <HistoryList onOpen={() => setView("thread")} />
        ) : entries.length === 0 ? (
          <Intro onAsk={submit} />
        ) : (
          <div className="space-y-8">
            {entries.map((r, i) => (
              <div key={r.id} ref={i === entries.length - 1 ? lastRef : undefined} className="scroll-mt-4">
              <ResultView
                r={r}
                index={i}
                latest={i === entries.length - 1}
                revealing={ws.reveal?.id === r.id ? ws.reveal.n : null}
                narrating={ws.narrating === r.id}
              />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        className="shrink-0 border-t border-ink bg-cream p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
      >
        <div className="flex items-end gap-2 border border-ink bg-cream px-2 py-1.5 focus-within:border-electric focus-within:shadow-[3px_3px_0_#244BFF]">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(draft);
              }
            }}
            rows={2}
            placeholder={thread ? "Follow up — “why?”, “what about Instagram?”, “and August?”" : "Ask about profit, products, discounts, customers, channels…"}
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent text-[14px] leading-snug outline-none placeholder:text-ink-soft/70"
            aria-label="Ask the investigator"
          />
          <button type="submit" disabled={!draft.trim()} className="inline-flex h-9 w-9 shrink-0 items-center justify-center bg-ink text-cream transition-colors hover:bg-electric disabled:opacity-30" aria-label="Investigate">
            <ArrowUp size={16} />
          </button>
        </div>
        <p className="meta mt-1.5 flex justify-between text-ink-soft">
          <span>Enter to investigate · “/” to focus</span>
          <span>No LLM unless you connect Ollama</span>
        </p>
      </form>
    </div>
  );
}

function HeaderBtn({ label, onClick, children, active = false }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`inline-flex h-7 w-7 items-center justify-center border transition-colors ${active ? "border-cream bg-cream text-ink" : "border-cream/30 hover:border-cream hover:bg-cream hover:text-ink"}`}>
      {children}
    </button>
  );
}

function Intro({ onAsk }: { onAsk: (q: string) => void }) {
  return (
    <div>
      <h2 className="display text-[54px] leading-[0.84]">
        Something doesn&apos;t <span className="text-signal">add up.</span>
      </h2>
      <p className="mt-4 text-[14px] leading-relaxed">
        I&apos;m a local analysis engine. I read the {num(getDataset().transactions.length)} orders in this case, pick the metrics a question needs, do the
        arithmetic and show my working. I don&apos;t guess — and I&apos;m not a language model.
      </p>
      <div className="mt-6 space-y-2">
        <span className="meta text-ink-soft">Open a line of inquiry</span>
        {SUGGESTED.map((s, i) => (
          <button
            key={s.q}
            type="button"
            onClick={() => onAsk(s.q)}
            className="group flex w-full items-center justify-between gap-3 border border-ink bg-cream px-3 py-3 text-left transition-colors hover:bg-ink hover:text-cream"
          >
            <span className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] text-signal">0{i + 1}</span>
              <span className="display text-[22px] leading-none">{s.label}</span>
            </span>
            <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        <span className="meta text-ink-soft">Or ask</span>
        <ul className="mt-1">
          {MORE.map((q) => (
            <li key={q}>
              <button type="button" onClick={() => onAsk(q)} className="w-full border-b border-ink/25 py-2 text-left text-[13.5px] hover:text-electric">
                “{q}”
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HistoryList({ onOpen }: { onOpen: () => void }) {
  const ws = useWorkspace();
  const [confirm, setConfirm] = useState(false);
  if (!ws.threads.length) {
    return (
      <div>
        <h2 className="display text-[40px]">No history yet</h2>
        <p className="mt-2 text-[14px] text-ink-soft">Investigations you run are kept in this browser (local storage) so you can return to them.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="display text-[40px]">Case history</h2>
        {confirm ? (
          <span className="flex gap-1">
            <button type="button" onClick={() => { actions.clearHistory(); setConfirm(false); }} className="border border-signal bg-signal px-2 py-1 font-mono text-[10px] uppercase text-cream">Clear all</button>
            <button type="button" onClick={() => setConfirm(false)} className="border border-ink px-2 py-1 font-mono text-[10px] uppercase">Keep</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="meta underline hover:text-signal">Clear history</button>
        )}
      </div>
      <p className="meta mt-1 text-ink-soft">Stored in this browser only</p>
      <ul className="mt-4 border-t border-ink">
        {ws.threads.map((t) => {
          const d = new Date(t.createdAt);
          const when = `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          const active = t.id === ws.activeThreadId;
          return (
            <li key={t.id} className={`flex items-stretch border-b border-ink/30 ${active ? "bg-electric/10" : ""}`}>
              <button
                type="button"
                onClick={() => { actions.openThread(t.id); onOpen(); }}
                className="min-w-0 flex-1 py-3 pr-2 text-left hover:text-electric"
              >
                <span className="block truncate text-[14px] font-semibold">{t.title}</span>
                <span className="meta text-ink-soft">{when} · {t.entries.length} step{t.entries.length === 1 ? "" : "s"} · {t.entries[t.entries.length - 1]?.caseTitle}</span>
              </button>
              <button type="button" onClick={() => actions.deleteThread(t.id)} className="px-2 text-ink-soft hover:text-signal" aria-label={`Delete “${t.title}”`}>
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
