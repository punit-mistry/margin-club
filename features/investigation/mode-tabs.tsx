"use client";

import { monthShort } from "@/lib/analytics/format";
import { CASE_001 } from "./case";
import { actions, useWorkspace } from "./store";

export function ModeTabs() {
  const ws = useWorkspace();
  return (
    <nav className="flex h-10 shrink-0 items-end gap-1 overflow-x-auto border-b border-ink bg-paper px-3 no-scrollbar sm:px-4" aria-label="Investigation lenses">
      {CASE_001.modes.map((m) => {
        const active = ws.mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => actions.setMode(m.id)}
            aria-current={active ? "page" : undefined}
            className={`relative -mb-px flex h-8 shrink-0 items-center gap-2 border border-ink px-3 transition-colors ${active ? "z-10 border-b-cream bg-cream" : "bg-paper-deep/50 hover:bg-cream/70"}`}
          >
            <span className={`font-mono text-[10px] ${active ? "text-signal" : "text-ink-soft"}`}>{m.n}</span>
            <span className="display text-[19px] leading-none">
              <span className="sm:hidden">{m.short}</span>
              <span className="hidden sm:inline">{m.title}</span>
            </span>
          </button>
        );
      })}
      {ws.compare && (
        <button
          type="button"
          onClick={() => actions.setCompare(null)}
          className="mb-1 ml-auto hidden shrink-0 items-center gap-1.5 self-center border border-electric bg-electric px-2 py-0.5 font-mono text-[10px] uppercase text-cream md:flex"
          title="Clear comparison"
        >
          Comparing {monthShort(ws.compare[0])} ⇆ {monthShort(ws.compare[1])} ×
        </button>
      )}
    </nav>
  );
}
