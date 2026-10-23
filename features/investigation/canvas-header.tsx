import type { ReactNode } from "react";
import type { ModeDef } from "./types";

export function CanvasHeader({ mode, children, meta }: { mode: ModeDef; children?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="relative pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="meta text-ink-soft">
          Lens {mode.n} · Exhibits {mode.exhibits}
        </span>
        {meta && <span className="meta text-ink-soft">{meta}</span>}
      </div>
      <h1 className="display mt-2 text-[15vw] leading-[0.8] sm:text-[72px] xl:text-[92px]">{mode.title}</h1>
      <p className="serif-italic mt-2 text-[24px] leading-tight text-ink-soft sm:text-[28px]">{mode.question}</p>
      {children && <div className="mt-4 max-w-[70ch] text-[17px] leading-snug">{children}</div>}
    </header>
  );
}
