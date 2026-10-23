"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand";
import { caseHeadline } from "@/features/analytics/series";
import { num } from "@/lib/analytics/format";
import { Redaction } from "./redaction";

/**
 * First-visit loader. Each line is a real step (fonts, ledger, suspects) and
 * ticks off when that work is actually done. Shown once per browser session;
 * the inline script in the root layout decides before first paint, so repeat
 * visits, reduced-motion users and no-JS visitors never see it.
 */

export const INTRO_KEY = "margin-club:intro";

/** Runs before first paint (inlined in <body>). Keep it tiny and dependency-free. */
export const INTRO_BOOT = `try{var d=document.documentElement;d.dataset.intro=(sessionStorage.getItem("${INTRO_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches)?"skip":"run"}catch(e){document.documentElement.dataset.intro="skip"}`;

type Step = { label: string; value: string | null };

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function IntroLoader() {
  const [steps, setSteps] = useState<Step[]>([
    { label: "Opening case file", value: null },
    { label: "Setting the type", value: null },
    { label: "Building the ledger", value: null },
    { label: "Flagging suspects", value: null },
  ]);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "run") return;
    let cancelled = false;
    const done = (i: number, value: string) => {
      if (cancelled) return;
      setSteps((s) => s.map((x, j) => (j === i ? { ...x, value } : x)));
      setProgress((i + 1) / 4);
    };
    (async () => {
      await frame();
      done(0, "CASE #001");
      await Promise.all([document.fonts?.ready, wait(260)]);
      done(1, "4 FACES");
      await wait(220);
      const head = caseHeadline(); // memoised: real work only if no page computed it yet
      done(2, `${num(head.orders)} ORDERS`);
      await wait(220);
      done(3, `${num(head.flagged)} FLAGGED`);
      await wait(380);
      if (!cancelled) exit();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The bars retract (same motion as a page transition), then the loader is gone.
  function exit() {
    document.documentElement.dataset.intro = "exit";
    setExiting(true);
  }

  const finish = () => {
    document.documentElement.dataset.intro = "done";
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // storage unavailable: the intro will simply play again next visit
    }
  };

  return (
    <div className="intro-loader" role="status" aria-label="Loading Margin Club">
      <Redaction state={exiting ? "out" : "on"} onDone={(st) => st === "out" && finish()} outDelay={180} />
      <div className="intro-content relative flex h-full w-full flex-col justify-between px-4 py-5 text-cream sm:px-8 sm:py-7">
        <div className="flex items-center justify-between text-[18px]">
          {/* Sits on the red top bar: invert the logo's red block to ink. */}
          <span className="[&_span[aria-hidden]]:bg-ink">
            <Logo />
          </span>
          <button type="button" onClick={exit} className="meta border border-cream/40 px-2 py-1 text-cream/70 hover:bg-cream hover:text-ink">
            Skip intro →
          </button>
        </div>

        <div className="grid items-end gap-8 lg:grid-cols-12">
          <p className="display text-[34vw] leading-[0.78] tnum lg:col-span-7 lg:text-[22vw]">
            {String(Math.round(progress * 100)).padStart(3, "0")}
            <span className="text-signal">%</span>
          </p>
          <ol className="font-mono text-[12px] uppercase tracking-[0.08em] lg:col-span-5 lg:pb-[2vw]">
            {steps.map((s, i) => (
              <li key={s.label} className={`flex items-baseline gap-3 border-b border-cream/15 py-2 transition-opacity duration-300 ${s.value ? "opacity-100" : "opacity-35"}`}>
                <span className="text-signal">0{i + 1}</span>
                <span>{s.label}</span>
                <span className="flex-1 overflow-hidden whitespace-nowrap text-cream/30">{"·".repeat(60)}</span>
                <span className={s.value ? "text-cream" : "text-cream/40"}>{s.value ?? "…"}</span>
                <span className="w-3 text-electric">{s.value ? "✓" : ""}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <div className="h-[3px] w-full bg-cream/15">
            <div className="h-full bg-signal transition-[width] duration-300 ease-out" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="meta mt-2 flex justify-between text-cream/60">
            <span>The Business Detective</span>
            <span>Fictional case · demo data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
