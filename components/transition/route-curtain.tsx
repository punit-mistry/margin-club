"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand";
import { destinationFor, type Destination } from "./destinations";
import { Redaction, type RedactionState } from "./redaction";

type Phase = "idle" | "cover" | "reveal";

const BARS: Record<Phase, RedactionState> = { idle: "off", cover: "in", reveal: "out" };

/**
 * Page transitions: the page is redacted line by line, the destination is
 * stamped on top, the route changes underneath, then the bars retract.
 * Navigation starts as soon as the page is covered; the reveal waits until
 * the new route has rendered AND the stamp has landed, so nothing is cut off.
 *
 * In-app link clicks are intercepted in the capture phase (before Next's
 * <Link>, which skips navigation for cancelled clicks) and replayed with
 * router.push once the page is covered. Same-page hash links, new-tab clicks,
 * downloads and external links are left alone. Browser back/forward is not
 * intercepted.
 */
export function RouteCurtain() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [dest, setDest] = useState<Destination>(() => destinationFor(pathname));
  const [href, setHref] = useState<string | null>(null);
  const [arrived, setArrived] = useState(false);
  const [stamped, setStamped] = useState(false);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adjusting state during render on a prop change is React's recommended
  // pattern: note when the new route has rendered underneath the bars…
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    if (phase === "cover") setArrived(true);
  }
  // …and reveal once it has, and the stamp has landed.
  if (phase === "cover" && arrived && stamped) setPhase("reveal");

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // same page: let hash links scroll
      e.preventDefault();
      setHref(url.pathname + url.search + url.hash);
      setDest(destinationFor(url.pathname));
      setArrived(false);
      setStamped(false);
      setPhase("cover");
      // Never leave the page redacted, even if navigation fails.
      if (safety.current) clearTimeout(safety.current);
      safety.current = setTimeout(() => setPhase((p) => (p === "idle" ? p : "reveal")), 5000);
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => () => {
    if (safety.current) clearTimeout(safety.current);
  }, []);

  const onBars = (state: "in" | "out") => {
    if (state === "in" && phase === "cover" && href) router.push(href);
    if (state === "out" && phase === "reveal") {
      if (safety.current) clearTimeout(safety.current);
      setHref(null);
      setPhase("idle");
    }
  };

  return (
    <div className="route-curtain" data-phase={phase} aria-hidden={phase === "idle"} role={phase === "idle" ? undefined : "status"}>
      <Redaction state={BARS[phase]} onDone={onBars} outDelay={120} />
      <div className="curtain-content absolute inset-0 flex flex-col justify-between px-4 py-5 text-cream sm:px-8 sm:py-7">
        <div className="flex items-center justify-between text-[18px]">
          <Logo />
          <span className="meta text-cream/60">Redacting · {dest.file}</span>
        </div>

        <div className="relative">
          <span className="meta flex items-center gap-2 text-cream/70">
            <span className="inline-block h-2 w-2 animate-blink bg-signal" /> {dest.kicker}
          </span>
          <p className="display mt-3 text-[19vw] leading-[0.8] sm:text-[13vw]">
            {dest.title[0]}
            <br />
            <span className="text-signal">{dest.title[1]}</span>
          </p>
          <span className="curtain-stamp absolute top-0 right-0 sm:top-[10%] sm:right-[4%]" onAnimationEnd={() => setStamped(true)}>
            <span className="inline-block border-[3px] border-signal px-3 py-1 font-mono text-[15px] font-bold uppercase tracking-[0.2em] text-signal sm:text-[20px]">
              Filed
            </span>
          </span>
        </div>

        <div>
          <div className="h-[3px] w-full bg-cream/15">
            <div className="curtain-bar h-full bg-signal" />
          </div>
          <div className="meta mt-2 flex justify-between text-cream/60">
            <span>Pulling the file…</span>
            <span>{href?.split("#")[0] ?? ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
