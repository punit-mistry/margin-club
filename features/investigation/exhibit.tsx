import type { ReactNode } from "react";

/** Editorial frame for one exhibit on the evidence canvas. */
export function Exhibit({
  letter,
  title,
  kicker,
  hint,
  actions,
  children,
  className = "",
  tone = "ink",
}: {
  letter: string;
  title: string;
  kicker?: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "ink" | "red" | "blue";
}) {
  const tag = tone === "red" ? "bg-signal" : tone === "blue" ? "bg-electric" : "bg-ink";
  return (
    <section className={`relative min-w-0 border-t border-ink pt-3 ${className}`} aria-label={`Exhibit ${letter}: ${title}`}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex items-start gap-3">
          <span className={`display flex h-11 w-11 shrink-0 items-center justify-center text-[30px] text-cream ${tag}`}>{letter}</span>
          <div>
            <span className="meta block text-ink-soft">Exhibit {letter}{kicker ? ` · ${kicker}` : ""}</span>
            <h3 className="display text-[28px] leading-[0.95] sm:text-[32px]">{title}</h3>
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
      {hint && <p className="meta mt-2 text-ink-soft normal-case tracking-[0.02em]">↳ {hint}</p>}
    </section>
  );
}

export function Chip({ active, onClick, children, tone = "blue" }: { active?: boolean; onClick?: () => void; children: ReactNode; tone?: "blue" | "red" }) {
  const on = tone === "red" ? "bg-signal border-signal text-cream" : "bg-electric border-electric text-cream";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors ${active ? on : "border-ink hover:bg-ink hover:text-cream"}`}
    >
      {children}
    </button>
  );
}
